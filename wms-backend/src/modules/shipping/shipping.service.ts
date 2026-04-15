import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ShippingService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.shipment.count();
    return `ENV-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Listar pedidos FACTURADOS listos para despacho
   */
  async findOrdersForShipping(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = { estado: 'FACTURADO' };
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { client: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          client: { select: { nombre: true, codigo: true, rfc: true, direccion: true, poblacion: true, estado: true, cp: true } },
          lineas: {
            include: {
              assignments: { include: { hu: { select: { codigo: true, metrajeActual: true } } } },
            },
          },
          packingSlips: { select: { codigo: true, bultos: true, pesoTotalKg: true } },
          _count: { select: { lineas: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Crear registro de envío (shipment)
   */
  async createShipment(data: {
    orderId: string;
    transportista: string;
    guiaEnvio?: string;
    placas?: string;
    chofer?: string;
    notas?: string;
    enviadoPor: string;
  }) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: data.orderId },
    });

    if (order.estado !== 'FACTURADO') {
      throw new BadRequestException(`El pedido está en estado ${order.estado}, debe estar FACTURADO`);
    }

    // Verificar que no exista ya un envío activo
    const existing = await this.prisma.shipment.findFirst({
      where: { orderId: data.orderId, estado: { not: 'DEVUELTO' } },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un envío: ${existing.codigo}`);
    }

    const codigo = await this.generateCode();

    return this.prisma.$transaction(async (tx: any) => {
      // Crear el shipment
      const shipment = await tx.shipment.create({
        data: {
          codigo,
          orderId: data.orderId,
          transportista: data.transportista,
          guiaEnvio: data.guiaEnvio,
          placas: data.placas,
          chofer: data.chofer,
          estado: 'EN_TRANSITO',
          fechaEnvio: new Date(),
          enviadoPor: data.enviadoPor,
          notas: data.notas,
        },
        include: {
          order: {
            include: {
              client: { select: { nombre: true, codigo: true } },
            },
          },
        },
      });

      // Actualizar orden a DESPACHADO
      await tx.order.update({
        where: { id: data.orderId },
        data: {
          estado: 'DESPACHADO',
          transportista: data.transportista,
          guiaEnvio: data.guiaEnvio,
        },
      });

      // Actualizar HUs asignados al pedido a DESPACHADO
      const orderLines = await tx.orderLine.findMany({
        where: { orderId: data.orderId },
        include: { assignments: true },
      });

      const huIds = orderLines.flatMap((l: any) => l.assignments.map((a: any) => a.huId));
      if (huIds.length > 0) {
        await tx.handlingUnit.updateMany({
          where: { id: { in: huIds } },
          data: { estadoHu: 'DESPACHADO' },
        });
      }

      // Liberar ubicaciones de los HUs despachados
      const hus = await tx.handlingUnit.findMany({
        where: { id: { in: huIds } },
        select: { ubicacionId: true },
      });
      const locationIds = [...new Set(hus.map((h: any) => h.ubicacionId).filter(Boolean))];
      for (const locId of locationIds) {
        const remaining = await tx.handlingUnit.count({
          where: { ubicacionId: locId as string, estadoHu: { notIn: ['AGOTADO', 'DESPACHADO'] } },
        });
        await tx.location.update({
          where: { id: locId as string },
          data: { estado: remaining === 0 ? 'LIBRE' : 'PARCIAL' },
        });
      }

      // Marcar reservas como SURTIDA
      await tx.reservation.updateMany({
        where: { orderId: data.orderId, estado: 'ACTIVA' },
        data: { estado: 'SURTIDA' },
      });

      return shipment;
    });
  }

  /**
   * Listar todos los envíos
   */
  async findAll(params: { orderId?: string; estado?: string; page?: number; limit?: number }) {
    const { orderId, estado, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (orderId) where.orderId = orderId;
    if (estado) where.estado = estado;

    const [data, total] = await Promise.all([
      this.prisma.shipment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          order: {
            include: {
              client: { select: { nombre: true, codigo: true, direccion: true } },
              _count: { select: { lineas: true } },
            },
          },
        },
      }),
      this.prisma.shipment.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Detalle de envío
   */
  async findById(id: string) {
    return this.prisma.shipment.findUniqueOrThrow({
      where: { id },
      include: {
        order: {
          include: {
            client: true,
            lineas: {
              include: {
                assignments: {
                  include: { hu: { include: { sku: true } } },
                },
              },
            },
            packingSlips: true,
          },
        },
      },
    });
  }

  /**
   * Confirmar entrega
   */
  async confirmDelivery(shipmentId: string) {
    return this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        estado: 'ENTREGADO',
        fechaEntrega: new Date(),
      },
    });
  }

  /**
   * Stats de envío
   */
  async getShippingStats() {
    const [totalShipments, pendientesDespacho, enviadosHoy, entregados] = await Promise.all([
      this.prisma.shipment.count(),
      this.prisma.order.count({ where: { estado: 'FACTURADO' } }),
      this.prisma.shipment.count({
        where: {
          fechaEnvio: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
      this.prisma.shipment.count({ where: { estado: 'ENTREGADO' } }),
    ]);
    return { totalShipments, pendientesDespacho, enviadosHoy, entregados };
  }
}
