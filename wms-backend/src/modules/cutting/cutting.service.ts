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

  private async resolveValidUserId(userId?: string): Promise<string> {
    const isUuid = (val?: string) =>
      Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(val));

    if (isUuid(userId)) {
      const user = await this.prisma.user.findUnique({ where: { id: userId } });
      if (user) return user.id;
    }

    if (userId) {
      const user = await this.prisma.user.findFirst({
        where: {
          OR: [
            { username: userId },
            { email: userId },
            { nombre: { contains: userId, mode: 'insensitive' } },
          ],
        },
      });
      if (user) return user.id;
    }

    const fallback = await this.prisma.user.findFirst({
      where: { activo: true },
      orderBy: { createdAt: 'asc' },
    });
    return fallback?.id || '00000000-0000-0000-0000-000000000000';
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
    bonificacionMetros?: number;
    motivoBonificacion?: string;
    orderLineId?: string;
    cortadoPor: string;
    notas?: string;
    mesaCorte?: string;
    carrito?: string;
  }) {
    const huOrigen = await this.prisma.handlingUnit.findUniqueOrThrow({
      where: { id: data.huOrigenId },
      include: { sku: true, ubicacion: true },
    });

    // Validaciones
    if (!['DISPONIBLE', 'RESERVADO', 'EN_CORTE', 'EN_PICKING'].includes(huOrigen.estadoHu)) {
      throw new BadRequestException(`HU ${huOrigen.codigo} no está disponible para corte (estado: ${huOrigen.estadoHu})`);
    }
    if (data.metrajeCortado <= 0 || isNaN(data.metrajeCortado) || !isFinite(data.metrajeCortado)) {
      throw new BadRequestException('Metraje a cortar debe ser un número válido mayor a 0');
    }
    
    const bonificacion = Number(data.bonificacionMetros) || 0;
    if (bonificacion < 0 || isNaN(bonificacion) || !isFinite(bonificacion)) {
      throw new BadRequestException('La bonificación no puede ser un valor negativo');
    }

    const totalDescontar = Math.round((data.metrajeCortado + bonificacion) * 100) / 100;
    if (totalDescontar > huOrigen.metrajeActual) {
      throw new BadRequestException(`Solo hay ${huOrigen.metrajeActual}m disponibles en ${huOrigen.codigo} (corte: ${data.metrajeCortado}m + bonificación: ${bonificacion}m)`);
    }

    const metrajeRestante = Math.round((huOrigen.metrajeActual - totalDescontar) * 100) / 100;
    const cutCode = await this.generateCode('COR', 'cutOperation');
    const validUserId = await this.resolveValidUserId(data.cortadoPor);

    return this.prisma.$transaction(async (tx: any) => {
      let huRetazoId: string | null = null;
      let retazoUbicacion: string | null = null;

      // Si queda metraje (> 0.5m) → crear HU retazo (hijo) con el saldo remanente físico
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
            metrajeAntes: 0,
            metrajeDespues: metrajeRestante,
            ubicacionDestino: retazoUbicacion,
            referencia: cutCode,
            notas: `Retazo de ${huOrigen.codigo} → ${metrajeRestante}m (gen ${huOrigen.generacion + 1})`,
            userId: validUserId,
          },
        });

        // Actualizar ubicación del retazo
        if (ubicacionRetazo) {
          await tx.location.update({ where: { id: ubicacionRetazo.id }, data: { estado: 'PARCIAL' } });
        }
      }

      // HU origen queda AGOTADO (metrajeActual: 0) porque sus metros se dividieron entre la pieza cortada y el retazo hijo generado.
      // Esto garantiza la conservación estricta de metros: 50m - 10m deja 40m en retazo, NUNCA 80m.
      await tx.handlingUnit.update({
        where: { id: huOrigen.id },
        data: {
          metrajeActual: 0,
          estadoHu: 'AGOTADO',
        },
      });

      // Registrar movimiento para HU origen
      await tx.inventoryMovement.create({
        data: {
          huId: huOrigen.id,
          tipo: 'CORTE',
          metrajeAntes: huOrigen.metrajeActual,
          metrajeDespues: 0,
          referencia: cutCode,
          notas: `Corte de ${data.metrajeCortado}m${bonificacion > 0 ? ` (+${bonificacion}m bonif)` : ''}${data.orderLineId ? ' para pedido' : ''}; remanente de ${metrajeRestante}m transferido a retazo`,
          userId: validUserId,
        },
      });

      // Si hay línea de pedido, validar SKU y acumular metraje surtido
      if (data.orderLineId) {
        const oLine = await tx.orderLine.findUniqueOrThrow({
          where: { id: data.orderLineId },
          include: { order: true },
        });

        // Validar correspondencia estricta de SKU
        if (oLine.skuId !== huOrigen.skuId) {
          throw new BadRequestException(`El SKU del rollo origen (${huOrigen.sku?.codigo || huOrigen.skuId}) no coincide con el SKU requerido por la línea del pedido (${oLine.skuId})`);
        }

        // Validar estado del pedido
        if (['CANCELADO', 'DEVUELTO'].includes(oLine.order.estado)) {
          throw new BadRequestException(`No se puede surtir corte para un pedido en estado ${oLine.order.estado}`);
        }

        const assignment = await tx.orderLineAssignment.findFirst({
          where: { orderLineId: data.orderLineId, huId: huOrigen.id },
        });
        if (assignment) {
          await tx.orderLineAssignment.update({
            where: { id: assignment.id },
            data: { cortado: true },
          });
        }

        // Acumular metraje surtido (cortes parciales acumulativos, e.g. 7 + 6 + 7 = 20)
        const surtidoPrevio = Number(oLine.metrajeSurtido || 0);
        const bonifPrevia = Number(oLine.bonificacionMetros || 0);
        const nuevoSurtido = Math.round((surtidoPrevio + data.metrajeCortado) * 100) / 100;
        const nuevoBonificacion = Math.round((bonifPrevia + bonificacion) * 100) / 100;
        const requerido = Number(oLine.metrajeRequerido || 0);
        const isSurtidaCompleta = nuevoSurtido >= requerido;

        await tx.orderLine.update({
          where: { id: data.orderLineId },
          data: {
            metrajeSurtido: nuevoSurtido,
            bonificacionMetros: nuevoBonificacion,
            motivoBonificacion: data.motivoBonificacion || oLine.motivoBonificacion,
            estado: isSurtidaCompleta ? 'SURTIDA' : 'PARCIAL',
          },
        });

        // Si hubo bonificación, reflejarla en el pedido a costo cero
        if (bonificacion > 0) {
          await tx.order.update({
            where: { id: oLine.orderId },
            data: {
              bonificacionCorteMetros: { increment: bonificacion },
              motivoBonificacion: data.motivoBonificacion || 'Bandera / Calidad en corte',
            },
          });
        }
      }

      const cutNotas = [
        data.notas,
        bonificacion > 0 ? `🎁 Bonificación calidad: +${bonificacion}m (${data.motivoBonificacion || 'Bandera'})` : null,
        data.mesaCorte ? `Mesa: ${data.mesaCorte}` : null,
        data.carrito ? `Carrito: ${data.carrito}` : null,
      ].filter(Boolean).join(' · ');

      // Crear registro de corte
      const cut = await tx.cutOperation.create({
        data: {
          codigo: cutCode,
          huOrigenId: huOrigen.id,
          orderLineId: data.orderLineId || null,
          metrajeAntes: huOrigen.metrajeActual,
          metrajeCortado: data.metrajeCortado,
          bonificacionMetros: bonificacion,
          motivoBonificacion: data.motivoBonificacion || null,
          metrajeRestante,
          huRetazoId,
          retazoUbicacion,
          cortadoPor: data.cortadoPor,
          notas: cutNotas || null,
        },
      });

      // Liberar ubicación del HU origen (ya agotado tras derivar su remanente al retazo)
      if (huOrigen.ubicacionId) {
        const remaining = await tx.handlingUnit.count({
          where: { ubicacionId: huOrigen.ubicacionId, estadoHu: { not: 'AGOTADO' }, id: { not: huOrigen.id } },
        });
        if (remaining === 0) {
          await tx.location.update({ where: { id: huOrigen.ubicacionId }, data: { estado: 'LIBRE' } });
        }
      }

      // === RE-CORTE CONTINUO EN MESA (CERO RETRABAJO) ===
      // Si el rollo aún tiene metraje restante (>= 1.0m), buscar otros pedidos pendientes del mismo SKU
      let sugerenciasReCorte: any[] = [];
      if (metrajeRestante >= 1.0) {
        const orderLineExcluida = data.orderLineId ? await tx.orderLine.findUnique({
          where: { id: data.orderLineId },
          select: { orderId: true },
        }) : null;

        const pendingLines = await tx.orderLine.findMany({
          where: {
            skuId: huOrigen.skuId,
            estado: { in: ['PENDIENTE', 'EN_PROCESO'] },
            order: {
              estado: { in: ['POR_SURTIR', 'EN_SURTIDO', 'EN_CORTE'] },
              ...(orderLineExcluida?.orderId ? { id: { not: orderLineExcluida.orderId } } : {}),
            },
          },
          include: {
            order: {
              select: {
                id: true,
                codigo: true,
                estado: true,
                carritoCorte: true,
                client: { select: { id: true, nombre: true } },
              },
            },
          },
          take: 5,
          orderBy: { createdAt: 'asc' },
        });

        sugerenciasReCorte = pendingLines.map((line: any) => {
          const pendiente = Math.round(Math.max(0, line.metrajeRequerido - (line.metrajeSurtido || 0)) * 100) / 100;
          return {
            orderLineId: line.id,
            orderId: line.order.id,
            orderCodigo: line.order.codigo,
            orderEstado: line.order.estado,
            carritoCorte: line.order.carritoCorte,
            clientNombre: line.order.client?.nombre || 'Cliente General',
            metrajeRequerido: line.metrajeRequerido,
            metrajeSurtido: line.metrajeSurtido,
            metrajePendiente: pendiente,
            metrajeSugerido: Math.min(metrajeRestante, pendiente),
            cubreTotal: metrajeRestante >= pendiente,
          };
        });
      }

      const cutDetail = await tx.cutOperation.findUnique({
        where: { id: cut.id },
        include: {
          huOrigen: { include: { sku: true } },
          huRetazo: { include: { ubicacion: true, sku: true } },
          orderLine: {
            include: {
              order: {
                select: {
                  id: true,
                  codigo: true,
                  client: { select: { id: true, nombre: true } },
                },
              },
            },
          },
        },
      });

      return {
        ...cutDetail,
        sugerenciasReCorte,
      };
    });
  }

  /**
   * Buscar cortes pendientes en cola para un SKU específico (para re-corte encadenado en mesa)
   */
  async getPendingCutsForSku(skuId: string, maxMetraje?: number) {
    const pendingLines = await this.prisma.orderLine.findMany({
      where: {
        skuId,
        estado: { in: ['PENDIENTE', 'EN_PROCESO'] },
        order: {
          estado: { in: ['POR_SURTIR', 'EN_SURTIDO', 'EN_CORTE'] },
        },
      },
      include: {
        order: {
          select: {
            id: true,
            codigo: true,
            estado: true,
            carritoCorte: true,
            client: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const sku = await this.prisma.skuMaster.findUnique({
      where: { id: skuId },
      select: { id: true, codigo: true, nombre: true, color: true },
    });

    const maxM = maxMetraje ? Number(maxMetraje) : undefined;

    return {
      sku,
      sugerencias: pendingLines.map((line: any) => {
        const pendiente = Math.round(Math.max(0, line.metrajeRequerido - (line.metrajeSurtido || 0)) * 100) / 100;
        return {
          orderLineId: line.id,
          orderId: line.order.id,
          orderCodigo: line.order.codigo,
          orderEstado: line.order.estado,
          carritoCorte: line.order.carritoCorte,
          clientNombre: line.order.client?.nombre || 'Cliente General',
          metrajeRequerido: line.metrajeRequerido,
          metrajeSurtido: line.metrajeSurtido,
          metrajePendiente: pendiente,
          metrajeSugerido: maxM ? Math.min(maxM, pendiente) : pendiente,
          cubreTotal: maxM ? maxM >= pendiente : true,
        };
      }),
    };
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
