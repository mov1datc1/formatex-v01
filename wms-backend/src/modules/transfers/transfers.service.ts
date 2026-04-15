import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TransfersService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== LIST =====
  async findAll(params: { estado?: string; warehouseId?: string; page?: number; limit?: number }) {
    const { estado, warehouseId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (estado) where.estado = estado;
    if (warehouseId) {
      where.OR = [{ warehouseOrigenId: warehouseId }, { warehouseDestinoId: warehouseId }];
    }

    const [data, total] = await Promise.all([
      this.prisma.transfer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          warehouseOrigen: { select: { id: true, nombre: true, codigo: true, tipo: true } },
          warehouseDestino: { select: { id: true, nombre: true, codigo: true, tipo: true, clienteAsignado: true } },
          user: { select: { nombre: true } },
          _count: { select: { lineas: true } },
          lineas: {
            select: { metraje: true, tipoRollo: true },
          },
        },
      }),
      this.prisma.transfer.count({ where }),
    ]);

    // Enrich with totals
    const enriched = data.map(t => ({
      ...t,
      totalHUs: t._count.lineas,
      totalMetraje: t.lineas.reduce((sum, l) => sum + l.metraje, 0),
      totalEnteros: t.lineas.filter(l => l.tipoRollo === 'ENTERO').length,
      totalRetazos: t.lineas.filter(l => l.tipoRollo === 'RETAZO').length,
    }));

    return { data: enriched, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ===== DETAIL =====
  async findById(id: string) {
    return this.prisma.transfer.findUniqueOrThrow({
      where: { id },
      include: {
        warehouseOrigen: { select: { id: true, nombre: true, codigo: true, tipo: true } },
        warehouseDestino: { select: { id: true, nombre: true, codigo: true, tipo: true, clienteAsignado: true } },
        user: { select: { nombre: true } },
        lineas: {
          include: {
            hu: {
              select: {
                id: true, codigo: true, metrajeActual: true, metrajeOriginal: true,
                tipoRollo: true, estadoHu: true,
                sku: { select: { nombre: true, codigo: true, color: true } },
                ubicacion: { select: { codigo: true } },
              },
            },
          },
        },
      },
    });
  }

  // ===== CREATE =====
  async create(data: {
    warehouseOrigenId: string;
    warehouseDestinoId: string;
    motivo?: string;
    notas?: string;
    huIds: string[];
    creadoPor: string;
  }) {
    if (data.warehouseOrigenId === data.warehouseDestinoId) {
      throw new BadRequestException('Origen y destino no pueden ser el mismo almacén');
    }
    if (!data.huIds.length) {
      throw new BadRequestException('Debe seleccionar al menos un HU para transferir');
    }

    // Validate warehouses exist
    const [origen, destino] = await Promise.all([
      this.prisma.warehouse.findUniqueOrThrow({ where: { id: data.warehouseOrigenId } }),
      this.prisma.warehouse.findUniqueOrThrow({ where: { id: data.warehouseDestinoId } }),
    ]);

    // Validate HUs exist, are DISPONIBLE, and belong to the origin warehouse
    const hus = await this.prisma.handlingUnit.findMany({
      where: { id: { in: data.huIds } },
      include: {
        sku: { select: { nombre: true, codigo: true, color: true } },
        ubicacion: { select: { warehouseId: true, codigo: true } },
      },
    });

    if (hus.length !== data.huIds.length) {
      throw new BadRequestException(`Se encontraron ${hus.length} de ${data.huIds.length} HUs solicitados`);
    }

    for (const hu of hus) {
      if (hu.estadoHu !== 'DISPONIBLE') {
        throw new BadRequestException(`HU ${hu.codigo} no está disponible (estado: ${hu.estadoHu})`);
      }
      if (hu.ubicacion?.warehouseId && hu.ubicacion.warehouseId !== data.warehouseOrigenId) {
        throw new BadRequestException(`HU ${hu.codigo} no está en el almacén de origen (${origen.nombre})`);
      }
    }

    // Generate code
    const year = new Date().getFullYear();
    const count = await this.prisma.transfer.count();
    const codigo = `TRF-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.transfer.create({
      data: {
        codigo,
        warehouseOrigenId: data.warehouseOrigenId,
        warehouseDestinoId: data.warehouseDestinoId,
        motivo: data.motivo,
        notas: data.notas,
        creadoPor: data.creadoPor,
        lineas: {
          create: hus.map(hu => ({
            huId: hu.id,
            codigoHu: hu.codigo,
            skuNombre: hu.sku?.nombre ? `${hu.sku.nombre} — ${hu.sku.color}` : null,
            metraje: hu.metrajeActual,
            tipoRollo: hu.tipoRollo,
          })),
        },
      },
      include: {
        warehouseOrigen: { select: { nombre: true } },
        warehouseDestino: { select: { nombre: true } },
        lineas: true,
        _count: { select: { lineas: true } },
      },
    });
  }

  // ===== EXECUTE (move HUs) =====
  async execute(id: string, userId: string, userNivel: number) {
    // Only supervisors (nivel <= 2) can execute
    if (userNivel > 2) {
      throw new ForbiddenException('Solo supervisores pueden ejecutar transferencias');
    }

    const transfer = await this.prisma.transfer.findUniqueOrThrow({
      where: { id },
      include: {
        lineas: { include: { hu: { include: { ubicacion: true } } } },
        warehouseDestino: true,
      },
    });

    if (transfer.estado !== 'PENDIENTE') {
      throw new BadRequestException(`Transferencia no está pendiente (estado: ${transfer.estado})`);
    }

    return this.prisma.$transaction(async (tx: any) => {
      const isVirtualDestino = transfer.warehouseDestino.tipo === 'VIRTUAL';

      for (const linea of transfer.lineas) {
        const hu = linea.hu;
        const oldUbicacion = hu.ubicacion?.codigo || 'SIN_UBICACION';

        // Release old location count
        if (hu.ubicacionId) {
          const remainingInOld = await tx.handlingUnit.count({
            where: { ubicacionId: hu.ubicacionId, id: { not: hu.id } },
          });
          await tx.location.update({
            where: { id: hu.ubicacionId },
            data: { estado: remainingInOld === 0 ? 'LIBRE' : 'PARCIAL' },
          });
        }

        // Set HU ubicacion to null (in transit between warehouses) 
        // If virtual destination, mark as RESERVADO (reserved for client)
        await tx.handlingUnit.update({
          where: { id: hu.id },
          data: {
            ubicacionId: null,
            estadoHu: isVirtualDestino ? 'RESERVADO' : 'DISPONIBLE',
          },
        });

        // Record inventory movement  
        await tx.inventoryMovement.create({
          data: {
            huId: hu.id,
            tipo: 'TRANSFERENCIA',
            metrajeAntes: hu.metrajeActual,
            metrajeDespues: hu.metrajeActual,
            ubicacionOrigen: oldUbicacion,
            ubicacionDestino: `→ ${transfer.warehouseDestino.nombre}`,
            referencia: transfer.codigo,
            notas: transfer.motivo || `Transferencia a ${transfer.warehouseDestino.nombre}`,
            userId,
          },
        });
      }

      // Update transfer status
      return tx.transfer.update({
        where: { id },
        data: {
          estado: 'EN_TRANSITO',
          ejecutadoPor: userId,
          fechaEjecucion: new Date(),
        },
        include: {
          warehouseOrigen: { select: { nombre: true } },
          warehouseDestino: { select: { nombre: true } },
          _count: { select: { lineas: true } },
        },
      });
    });
  }

  // ===== RECEIVE (confirm arrival) =====
  async receive(id: string, userId: string) {
    const transfer = await this.prisma.transfer.findUniqueOrThrow({
      where: { id },
      include: { lineas: true, warehouseDestino: true },
    });

    if (transfer.estado !== 'EN_TRANSITO') {
      throw new BadRequestException('Solo transferencias en tránsito pueden confirmarse');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // Find or create a staging location in destination warehouse
      let destLocation = await tx.location.findFirst({
        where: { warehouseId: transfer.warehouseDestinoId, activo: true },
        orderBy: { codigo: 'asc' },
      });

      // If no location exists, this is a virtual warehouse — HUs stay without location
      for (const linea of transfer.lineas) {
        if (destLocation) {
          await tx.handlingUnit.update({
            where: { id: linea.huId },
            data: { ubicacionId: destLocation.id },
          });

          // Update location state
          const count = await tx.handlingUnit.count({ where: { ubicacionId: destLocation.id } });
          const cap = destLocation.capacidad || 1;
          await tx.location.update({
            where: { id: destLocation.id },
            data: { estado: count >= cap ? 'OCUPADA' : 'PARCIAL' },
          });
        }

        // Record arrival movement
        await tx.inventoryMovement.create({
          data: {
            huId: linea.huId,
            tipo: 'TRANSFERENCIA',
            metrajeAntes: linea.metraje,
            metrajeDespues: linea.metraje,
            ubicacionOrigen: `← Transferencia ${transfer.codigo}`,
            ubicacionDestino: destLocation?.codigo || transfer.warehouseDestino.nombre,
            referencia: transfer.codigo,
            notas: `Recepción en ${transfer.warehouseDestino.nombre}`,
            userId,
          },
        });
      }

      return tx.transfer.update({
        where: { id },
        data: { estado: 'COMPLETADA', fechaRecepcion: new Date() },
      });
    });
  }

  // ===== CANCEL =====
  async cancel(id: string, userId: string, userNivel: number) {
    if (userNivel > 2) {
      throw new ForbiddenException('Solo supervisores pueden cancelar transferencias');
    }

    const transfer = await this.prisma.transfer.findUniqueOrThrow({
      where: { id },
      include: { lineas: true },
    });

    if (!['PENDIENTE', 'EN_TRANSITO'].includes(transfer.estado)) {
      throw new BadRequestException('Solo transferencias pendientes o en tránsito pueden cancelarse');
    }

    return this.prisma.$transaction(async (tx: any) => {
      // If it was already in transit, revert HU status to DISPONIBLE  
      if (transfer.estado === 'EN_TRANSITO') {
        for (const linea of transfer.lineas) {
          await tx.handlingUnit.update({
            where: { id: linea.huId },
            data: { estadoHu: 'DISPONIBLE' },
          });
        }
      }

      return tx.transfer.update({
        where: { id },
        data: { estado: 'CANCELADA' },
      });
    });
  }

  // ===== STATS =====
  async getStats() {
    const [pendientes, enTransito, completadas, canceladas] = await Promise.all([
      this.prisma.transfer.count({ where: { estado: 'PENDIENTE' } }),
      this.prisma.transfer.count({ where: { estado: 'EN_TRANSITO' } }),
      this.prisma.transfer.count({ where: { estado: 'COMPLETADA' } }),
      this.prisma.transfer.count({ where: { estado: 'CANCELADA' } }),
    ]);

    // Recent transfers with metraje
    const recent = await this.prisma.transfer.findMany({
      where: { estado: { in: ['PENDIENTE', 'EN_TRANSITO'] } },
      include: {
        warehouseOrigen: { select: { nombre: true } },
        warehouseDestino: { select: { nombre: true } },
        lineas: { select: { metraje: true } },
        _count: { select: { lineas: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    return {
      pendientes, enTransito, completadas, canceladas,
      total: pendientes + enTransito + completadas + canceladas,
      recientes: recent.map(t => ({
        ...t,
        totalMetraje: t.lineas.reduce((sum, l) => sum + l.metraje, 0),
      })),
    };
  }
}
