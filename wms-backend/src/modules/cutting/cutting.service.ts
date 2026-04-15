import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CuttingService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateCode(prefix: string, model: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await (this.prisma as any)[model].count();
    return `${prefix}-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  /**
   * OPERACIÓN DE CORTE — Core del sistema
   * 
   * 1. Toma un HU origen (rollo)
   * 2. Corta X metros para un pedido
   * 3. Si queda metraje → crea HU retazo (hijo)
   * 4. Auto-ubica el retazo según MermaRangeConfig
   * 5. Actualiza genealogía (parentHuId, generacion)
   */
  async executeCut(data: {
    huOrigenId: string;
    metrajeCortado: number;
    orderLineId?: string;
    cortadoPor: string;
    notas?: string;
  }) {
    const huOrigen = await this.prisma.handlingUnit.findUniqueOrThrow({
      where: { id: data.huOrigenId },
      include: { sku: true, ubicacion: true },
    });

    // Validaciones
    if (!['DISPONIBLE', 'RESERVADO', 'EN_CORTE'].includes(huOrigen.estadoHu)) {
      throw new BadRequestException(`HU ${huOrigen.codigo} no está disponible para corte (estado: ${huOrigen.estadoHu})`);
    }
    if (data.metrajeCortado <= 0) throw new BadRequestException('Metraje a cortar debe ser mayor a 0');
    if (data.metrajeCortado > huOrigen.metrajeActual) {
      throw new BadRequestException(`Solo hay ${huOrigen.metrajeActual}m disponibles en ${huOrigen.codigo}`);
    }

    const metrajeRestante = Math.round((huOrigen.metrajeActual - data.metrajeCortado) * 100) / 100;
    const cutCode = await this.generateCode('COR', 'cutOperation');

    return this.prisma.$transaction(async (tx: any) => {
      let huRetazoId: string | null = null;
      let retazoUbicacion: string | null = null;

      // Si queda metraje → crear HU retazo (hijo)
      if (metrajeRestante > 0.5) { // Mínimo 0.5m para crear retazo
        const retazoCode = await this.generateCode('HU', 'handlingUnit');

        // Auto-ubicación: buscar zona de merma según rango
        const mermaConfig = await tx.mermaRangeConfig.findFirst({
          where: {
            activo: true,
            minMetros: { lte: metrajeRestante },
            maxMetros: { gte: metrajeRestante },
          },
          orderBy: { orden: 'asc' },
        });

        // Buscar ubicación disponible en la zona de merma
        let ubicacionRetazo = null;
        if (mermaConfig) {
          const zone = await tx.zone.findFirst({ where: { codigo: mermaConfig.zonaCodigo } });
          if (zone) {
            ubicacionRetazo = await tx.location.findFirst({
              where: { zoneId: zone.id, estado: { in: ['LIBRE', 'PARCIAL'] } },
              orderBy: { codigo: 'asc' },
            });
          }
        }

        const retazo = await tx.handlingUnit.create({
          data: {
            codigo: retazoCode,
            skuId: huOrigen.skuId,
            metrajeOriginal: metrajeRestante,
            metrajeActual: metrajeRestante,
            anchoMetros: huOrigen.anchoMetros,
            tipoRollo: 'RETAZO',
            estadoHu: 'DISPONIBLE',
            ubicacionId: ubicacionRetazo?.id || null,
            parentHuId: huOrigen.id,
            generacion: huOrigen.generacion + 1,
            palletId: huOrigen.palletId,
            loteProveedor: huOrigen.loteProveedor,
          },
        });

        huRetazoId = retazo.id;
        retazoUbicacion = ubicacionRetazo?.codigo || null;

        // Registrar movimiento para retazo
        await tx.inventoryMovement.create({
          data: {
            huId: retazo.id,
            tipo: 'CORTE',
            metrajeDespues: metrajeRestante,
            ubicacionDestino: retazoUbicacion,
            referencia: cutCode,
            notas: `Retazo de ${huOrigen.codigo} → ${metrajeRestante}m (gen ${huOrigen.generacion + 1})`,
            userId: data.cortadoPor,
          },
        });

        // Actualizar ubicación del retazo
        if (ubicacionRetazo) {
          await tx.location.update({ where: { id: ubicacionRetazo.id }, data: { estado: 'PARCIAL' } });
        }
      }

      // Actualizar HU origen: agotar o reducir metraje
      const nuevoEstado = metrajeRestante <= 0.5 ? 'AGOTADO' : 'DISPONIBLE';
      await tx.handlingUnit.update({
        where: { id: huOrigen.id },
        data: {
          metrajeActual: metrajeRestante <= 0.5 ? 0 : metrajeRestante,
          estadoHu: nuevoEstado,
        },
      });

      // Registrar movimiento para HU origen
      await tx.inventoryMovement.create({
        data: {
          huId: huOrigen.id,
          tipo: 'CORTE',
          metrajeAntes: huOrigen.metrajeActual,
          metrajeDespues: metrajeRestante <= 0.5 ? 0 : metrajeRestante,
          referencia: cutCode,
          notas: `Cortados ${data.metrajeCortado}m${data.orderLineId ? ' para pedido' : ''}`,
          userId: data.cortadoPor,
        },
      });

      // Si hay línea de pedido, actualizar asignación como cortada
      if (data.orderLineId) {
        const assignment = await tx.orderLineAssignment.findFirst({
          where: { orderLineId: data.orderLineId, huId: huOrigen.id },
        });
        if (assignment) {
          await tx.orderLineAssignment.update({
            where: { id: assignment.id },
            data: { cortado: true },
          });
        }
        // Actualizar línea
        await tx.orderLine.update({
          where: { id: data.orderLineId },
          data: { metrajeSurtido: data.metrajeCortado, estado: 'SURTIDA' },
        });
      }

      // Crear registro de corte
      const cut = await tx.cutOperation.create({
        data: {
          codigo: cutCode,
          huOrigenId: huOrigen.id,
          orderLineId: data.orderLineId || null,
          metrajeAntes: huOrigen.metrajeActual,
          metrajeCortado: data.metrajeCortado,
          metrajeRestante,
          huRetazoId,
          retazoUbicacion,
          cortadoPor: data.cortadoPor,
          notas: data.notas,
        },
      });

      // Liberar ubicación del HU origen si se agotó
      if (nuevoEstado === 'AGOTADO' && huOrigen.ubicacionId) {
        const remaining = await tx.handlingUnit.count({
          where: { ubicacionId: huOrigen.ubicacionId, estadoHu: { not: 'AGOTADO' }, id: { not: huOrigen.id } },
        });
        if (remaining === 0) {
          await tx.location.update({ where: { id: huOrigen.ubicacionId }, data: { estado: 'LIBRE' } });
        }
      }

      return tx.cutOperation.findUnique({
        where: { id: cut.id },
        include: {
          huOrigen: { include: { sku: true } },
          huRetazo: { include: { ubicacion: true } },
          orderLine: { include: { order: { select: { codigo: true } } } },
        },
      });
    });
  }

  async findAllCuts(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { huOrigen: { codigo: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.cutOperation.findMany({
        where, skip, take: limit, orderBy: { fechaCorte: 'desc' },
        include: {
          huOrigen: { select: { codigo: true, sku: { select: { nombre: true, color: true } } } },
          huRetazo: { select: { codigo: true, metrajeActual: true, ubicacion: { select: { codigo: true } } } },
          orderLine: { select: { order: { select: { codigo: true } } } },
        },
      }),
      this.prisma.cutOperation.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findCutById(id: string) {
    return this.prisma.cutOperation.findUniqueOrThrow({
      where: { id },
      include: {
        huOrigen: { include: { sku: true, childHus: { select: { id: true, codigo: true, metrajeActual: true, tipoRollo: true } } } },
        huRetazo: { include: { ubicacion: { include: { zone: true } } } },
        orderLine: { include: { order: { include: { client: true } } } },
      },
    });
  }

  async getCuttingStats() {
    const [totalCortes, retazosActivos, metrajePromedio] = await Promise.all([
      this.prisma.cutOperation.count(),
      this.prisma.handlingUnit.count({ where: { tipoRollo: 'RETAZO', estadoHu: 'DISPONIBLE' } }),
      this.prisma.cutOperation.aggregate({ _avg: { metrajeCortado: true } }),
    ]);
    return { totalCortes, retazosActivos, metrajePromedioCortado: metrajePromedio._avg.metrajeCortado || 0 };
  }
}
