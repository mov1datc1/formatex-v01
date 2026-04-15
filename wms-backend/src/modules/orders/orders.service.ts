import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateCode(prefix: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.order.count();
    return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async findAll(params: { search?: string; estado?: string; clientId?: string; page?: number; limit?: number }) {
    const { search, estado, clientId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (estado) where.estado = estado;
    if (clientId) where.clientId = clientId;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { folioContpaqi: { contains: search, mode: 'insensitive' } },
        { facturaRef: { contains: search, mode: 'insensitive' } },
        { client: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { nombre: true, codigo: true, rfc: true } },
          vendor: { select: { nombre: true, codigo: true } },
          lineas: {
            include: {
              assignments: { include: { hu: { select: { codigo: true, metrajeActual: true } } } },
            },
          },
          reservations: { where: { estado: 'ACTIVA' }, select: { id: true, tipo: true, metrajeReservado: true } },
          _count: { select: { lineas: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    return this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        client: true,
        vendor: true,
        lineas: {
          include: {
            assignments: { include: { hu: { include: { sku: true, ubicacion: true } } } },
            cutOperations: { orderBy: { fechaCorte: 'desc' } },
          },
        },
        reservations: { include: { hu: { select: { codigo: true, metrajeActual: true } } } },
        packingSlips: true,
        shipments: true,
      },
    });
  }

  /**
   * Flujo ATC: Crear cotización/pedido
   * Estado inicial: COTIZADO (con reserva blanda 24h)
   */
  async createOrder(data: {
    clientId: string;
    vendorId?: string;
    prioridad?: number;
    fechaRequerida?: string;
    notas?: string;
    creadoPor: string;
    lineas: Array<{ skuId: string; metrajeRequerido: number; precioUnitario?: number; notas?: string }>;
  }) {
    const code = await this.generateCode('PED');

    // Calcular totales financieros
    let subtotal = 0;
    for (const l of data.lineas) {
      subtotal += l.metrajeRequerido * (l.precioUnitario || 0);
    }
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return this.prisma.order.create({
      data: {
        codigo: code,
        clientId: data.clientId,
        vendorId: data.vendorId,
        atcUserId: data.creadoPor,
        prioridad: data.prioridad || 3,
        fechaRequerida: data.fechaRequerida ? new Date(data.fechaRequerida) : undefined,
        fechaCotizacion: new Date(),
        notas: data.notas,
        creadoPor: data.creadoPor,
        requiereCorte: true,
        estado: 'COTIZADO',
        subtotal,
        iva,
        total,
        lineas: {
          create: data.lineas.map((l) => ({
            skuId: l.skuId,
            metrajeRequerido: l.metrajeRequerido,
            precioUnitario: l.precioUnitario,
            importe: l.metrajeRequerido * (l.precioUnitario || 0),
            requiereCorte: true,
            notas: l.notas,
          })),
        },
      },
      include: { client: true, lineas: true },
    });
  }

  /**
   * Cambiar estado del pedido con validación del flujo
   */
  async updateStatus(id: string, estado: string, extraData?: any) {
    const validTransitions: Record<string, string[]> = {
      'COTIZADO': ['POR_PAGAR', 'CANCELADO'],
      'POR_PAGAR': ['PAGO_RECIBIDO', 'CANCELADO'],
      'PAGO_RECIBIDO': ['POR_SURTIR', 'CANCELADO'],
      'POR_SURTIR': ['EN_SURTIDO'],
      'EN_SURTIDO': ['EN_CORTE'],
      'EN_CORTE': ['EMPACADO'],
      'EMPACADO': ['FACTURADO'],
      'FACTURADO': ['DESPACHADO'],
    };

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id } });
    const allowed = validTransitions[order.estado] || [];
    if (!allowed.includes(estado)) {
      throw new BadRequestException(`No se puede cambiar de ${order.estado} a ${estado}. Transiciones válidas: ${allowed.join(', ')}`);
    }

    const updateData: any = { estado };

    // Datos adicionales según la transición
    if (estado === 'PAGO_RECIBIDO') {
      updateData.fechaPago = new Date();
      if (extraData?.referenciaPago) updateData.referenciaPago = extraData.referenciaPago;
      if (extraData?.comprobantePago) updateData.comprobantePago = extraData.comprobantePago;
      if (extraData?.metodoPago) updateData.metodoPago = extraData.metodoPago;
    }
    if (estado === 'POR_SURTIR') {
      updateData.fechaAprobCobranza = new Date();
    }
    if (estado === 'FACTURADO') {
      updateData.facturaLista = true;
      if (extraData?.facturaRef) updateData.facturaRef = extraData.facturaRef;
      if (extraData?.folioContpaqi) updateData.folioContpaqi = extraData.folioContpaqi;
    }

    return this.prisma.order.update({ where: { id }, data: updateData });
  }

  // Asignar HUs a líneas del pedido (picking)
  async assignHUToOrderLine(orderLineId: string, huId: string, metrajeTomado: number) {
    const hu = await this.prisma.handlingUnit.findUniqueOrThrow({ where: { id: huId } });
    if (!['DISPONIBLE', 'RESERVADO', 'RESERVADO_BLANDO'].includes(hu.estadoHu)) {
      throw new BadRequestException('HU no disponible para asignación');
    }
    if (hu.metrajeActual < metrajeTomado) throw new BadRequestException(`HU solo tiene ${hu.metrajeActual}m disponibles`);

    const needsCut = metrajeTomado < hu.metrajeActual;

    return this.prisma.$transaction(async (tx: any) => {
      const assignment = await tx.orderLineAssignment.create({
        data: { orderLineId, huId, metrajeTomado, requiereCorte: needsCut },
      });

      await tx.handlingUnit.update({ where: { id: huId }, data: { estadoHu: 'EN_PICKING' } });

      const line = await tx.orderLine.findUnique({ where: { id: orderLineId } });
      await tx.orderLine.update({
        where: { id: orderLineId },
        data: { metrajeSurtido: (line?.metrajeSurtido || 0) + metrajeTomado, estado: 'EN_PROCESO' },
      });

      return assignment;
    });
  }

  async getOrderStats() {
    const [total, cotizados, porPagar, porSurtir, enProceso, empacados, facturados, despachados] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { estado: 'COTIZADO' } }),
      this.prisma.order.count({ where: { estado: 'POR_PAGAR' } }),
      this.prisma.order.count({ where: { estado: { in: ['PAGO_RECIBIDO', 'POR_SURTIR'] } } }),
      this.prisma.order.count({ where: { estado: { in: ['EN_SURTIDO', 'EN_CORTE'] } } }),
      this.prisma.order.count({ where: { estado: 'EMPACADO' } }),
      this.prisma.order.count({ where: { estado: 'FACTURADO' } }),
      this.prisma.order.count({ where: { estado: 'DESPACHADO' } }),
    ]);
    return { total, cotizados, porPagar, porSurtir, enProceso, empacados, facturados, despachados };
  }
}
