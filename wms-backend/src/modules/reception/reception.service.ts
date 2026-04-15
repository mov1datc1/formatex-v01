import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReceptionService {
  constructor(private readonly prisma: PrismaService) {}

  // Generar código secuencial usando el tx context
  private async generateCode(
    prefix: string,
    model: 'purchaseReceipt' | 'handlingUnit',
    tx?: any,
  ): Promise<string> {
    const db = tx || this.prisma;
    const year = new Date().getFullYear();
    const count = await (db as any)[model].count();
    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}-${year}-${seq}`;
  }

  async findAllReceipts(params: { search?: string; estado?: string; page?: number; limit?: number }) {
    const { search, estado, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { ordenCompra: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.purchaseReceipt.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          lineas: {
            include: {
              handlingUnits: {
                select: { id: true, codigo: true, metrajeActual: true, etiquetaImpresa: true, ubicacion: { select: { codigo: true } } },
              },
            },
          },
        },
      }),
      this.prisma.purchaseReceipt.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findReceiptById(id: string) {
    return this.prisma.purchaseReceipt.findUniqueOrThrow({
      where: { id },
      include: {
        supplier: true,
        lineas: { include: { handlingUnits: { include: { sku: true, ubicacion: true } } } },
      },
    });
  }

  /**
   * Registrar recepción de pallet con:
   * 1. Creación automática de HUs (uno por rollo)
   * 2. Asignación inteligente de ubicación según disponibilidad de zonas ROLLOS_ENTEROS
   * 3. Actualización dinámica del estado de ubicaciones (LIBRE → PARCIAL → OCUPADA)
   * 4. Registro de movimiento de inventario ENTRADA por cada HU
   */
  async registerReception(data: {
    supplierId: string;
    ordenCompra?: string;
    transportista?: string;
    placas?: string;
    notas?: string;
    recibidoPor: string;
    lineas: Array<{
      skuId: string;
      cantidadRollos: number;
      metrajePorRollo: number;
      palletRef?: string;
    }>;
  }) {
    // Validar que el proveedor existe
    await this.prisma.supplier.findUniqueOrThrow({ where: { id: data.supplierId } });

    // Validar que todos los SKUs existen y obtener info
    const skuMap: Record<string, any> = {};
    for (const linea of data.lineas) {
      const sku = await this.prisma.skuMaster.findUniqueOrThrow({ where: { id: linea.skuId } });
      skuMap[linea.skuId] = sku;
    }

    // Pre-cargar ubicaciones disponibles en zonas de rollos enteros (ordenadas por disponibilidad)
    const enterosZones = await this.prisma.zone.findMany({
      where: { tipo: 'ROLLOS_ENTEROS', activo: true },
      select: { id: true, codigo: true },
    });
    const enterosZoneIds = enterosZones.map((z) => z.id);

    const availableLocations = await this.prisma.location.findMany({
      where: {
        zoneId: { in: enterosZoneIds },
        estado: { in: ['LIBRE', 'PARCIAL'] },
        activo: true,
      },
      orderBy: [{ estado: 'asc' }, { codigo: 'asc' }], // LIBRE primero, luego PARCIAL
      include: { _count: { select: { handlingUnits: true } } },
    });

    // Si no hay zonas de enteros, usar zona de RECIBO como staging
    if (availableLocations.length === 0) {
      const reciboZone = await this.prisma.zone.findFirst({ where: { tipo: 'RECIBO', activo: true } });
      if (reciboZone) {
        const reciboLocs = await this.prisma.location.findMany({
          where: { zoneId: reciboZone.id, estado: { in: ['LIBRE', 'PARCIAL'] }, activo: true },
          include: { _count: { select: { handlingUnits: true } } },
        });
        availableLocations.push(...reciboLocs);
      }
    }

    let totalRollos = 0;
    const palletRefs = new Set<string>();
    for (const linea of data.lineas) {
      totalRollos += linea.cantidadRollos;
      if (linea.palletRef) palletRefs.add(linea.palletRef);
    }
    const totalPallets = palletRefs.size || 1;

    // Ejecutar todo en una transacción
    const receipt = await this.prisma.$transaction(async (tx: any) => {
      const receiptCode = await this.generateCode('REC', 'purchaseReceipt', tx);

      // 1. Crear la recepción
      const rec = await tx.purchaseReceipt.create({
        data: {
          codigo: receiptCode,
          supplierId: data.supplierId,
          ordenCompra: data.ordenCompra,
          transportista: data.transportista,
          placas: data.placas,
          notas: data.notas,
          recibidoPor: data.recibidoPor,
          totalRollos,
          totalPallets,
          estado: 'EN_PROCESO',
        },
      });

      let locationIndex = 0;
      const locationsToUpdate = new Map<string, number>(); // locationId -> HU count

      // 2. Crear líneas y HUs
      for (const linea of data.lineas) {
        const metrajeTotalRecibido = linea.cantidadRollos * linea.metrajePorRollo;
        const sku = skuMap[linea.skuId];

        const receiptLine = await tx.purchaseReceiptLine.create({
          data: {
            receiptId: rec.id,
            skuId: linea.skuId,
            cantidadRollos: linea.cantidadRollos,
            metrajePorRollo: linea.metrajePorRollo,
            metrajeTotalRecibido,
            palletRef: linea.palletRef,
          },
        });

        // 3. Crear N HUs individuales
        for (let i = 0; i < linea.cantidadRollos; i++) {
          // Ubicación inteligente: asignar a la siguiente ubicación con capacidad
          let assignedLocation: any = null;
          while (locationIndex < availableLocations.length) {
            const candidate = availableLocations[locationIndex];
            const currentCount = locationsToUpdate.get(candidate.id) || candidate._count.handlingUnits;
            if (currentCount < (candidate.capacidad || 2)) {
              assignedLocation = candidate;
              locationsToUpdate.set(candidate.id, currentCount + 1);
              break;
            }
            locationIndex++;
          }

          const huCode = await this.generateCode('HU', 'handlingUnit', tx);
          const hu = await tx.handlingUnit.create({
            data: {
              codigo: huCode,
              skuId: linea.skuId,
              metrajeOriginal: linea.metrajePorRollo,
              metrajeActual: linea.metrajePorRollo,
              anchoMetros: sku.anchoMetros || 1.5,
              pesoKg: (sku.pesoKgPorMetro || 0.25) * linea.metrajePorRollo,
              tipoRollo: 'ENTERO',
              estadoHu: 'DISPONIBLE',
              ubicacionId: assignedLocation?.id || null,
              receiptLineId: receiptLine.id,
              palletId: linea.palletRef || null,
              generacion: 0,
              etiquetaImpresa: false, // Pendiente de etiquetar
            },
          });

          // 4. Registrar movimiento de ENTRADA
          await tx.inventoryMovement.create({
            data: {
              huId: hu.id,
              tipo: 'ENTRADA',
              metrajeDespues: linea.metrajePorRollo,
              ubicacionDestino: assignedLocation?.codigo || 'PENDIENTE',
              referencia: receiptCode,
              notas: `Recepción rollo ${i + 1}/${linea.cantidadRollos} — ${sku.nombre}`,
              userId: data.recibidoPor,
            },
          });
        }
      }

      // 5. Actualizar estado de ubicaciones afectadas
      for (const [locId, huCount] of locationsToUpdate.entries()) {
        const loc = availableLocations.find((l) => l.id === locId);
        const capacity = loc?.capacidad || 2;
        const newEstado = huCount >= capacity ? 'OCUPADA' : huCount > 0 ? 'PARCIAL' : 'LIBRE';
        await tx.location.update({ where: { id: locId }, data: { estado: newEstado } });
      }

      // 6. Marcar receipt como completada
      await tx.purchaseReceipt.update({ where: { id: rec.id }, data: { estado: 'COMPLETADA' } });

      return rec;
    }, {
      timeout: 60000, // 60 segundos para recepciones grandes
    });

    // Return receipt completo con HUs y ubicaciones
    return this.findReceiptById(receipt.id);
  }

  async getReceptionStats() {
    const [totalReceipts, totalHUs, latestReceipt] = await Promise.all([
      this.prisma.purchaseReceipt.count(),
      this.prisma.handlingUnit.count({ where: { generacion: 0 } }),
      this.prisma.purchaseReceipt.findFirst({ orderBy: { createdAt: 'desc' }, include: { supplier: true } }),
    ]);
    return { totalReceipts, totalHUs, latestReceipt };
  }
}
