import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PackingService {
  constructor(private readonly prisma: PrismaService) {}

  private async generateCode(): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.packingSlip.count();
    return `PAK-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  /**
   * Listar pedidos en estado EMPACADO (listos para empacar)
   */
  async findOrdersForPacking(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = { estado: 'EMPACADO' };
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
          client: { select: { nombre: true, codigo: true, rfc: true, direccion: true } },
          lineas: {
            include: {
              assignments: { include: { hu: { select: { codigo: true, metrajeActual: true } } } },
            },
          },
          _count: { select: { lineas: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Crear packing slip (nota de empaque)
   */
  async createPackingSlip(data: {
    orderId: string;
    bultos: number;
    pesoTotalKg?: number;
    dimensiones?: { largo: number; ancho: number; alto: number };
    notas?: string;
    empacadoPor: string;
  }) {
    // Verificar que el pedido existe y está en estado EMPACADO
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: data.orderId },
    });

    if (order.estado !== 'EMPACADO') {
      throw new BadRequestException(`El pedido está en estado ${order.estado}, debe estar EMPACADO`);
    }

    // Verificar que no exista ya un packing slip para este pedido
    const existing = await this.prisma.packingSlip.findFirst({
      where: { orderId: data.orderId },
    });
    if (existing) {
      throw new BadRequestException(`Ya existe un packing slip: ${existing.codigo}`);
    }

    const codigo = await this.generateCode();

    return this.prisma.packingSlip.create({
      data: {
        codigo,
        orderId: data.orderId,
        bultos: data.bultos || 1,
        pesoTotalKg: data.pesoTotalKg,
        empacadoPor: data.empacadoPor,
        notas: data.notas,
      },
      include: {
        order: {
          include: {
            client: { select: { nombre: true, codigo: true } },
            lineas: true,
          },
        },
      },
    });
  }

  /**
   * Listar todos los packing slips
   */
  async findAll(params: { orderId?: string; page?: number; limit?: number }) {
    const { orderId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (orderId) where.orderId = orderId;

    const [data, total] = await Promise.all([
      this.prisma.packingSlip.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaEmpaque: 'desc' },
        include: {
          order: {
            include: {
              client: { select: { nombre: true, codigo: true } },
              _count: { select: { lineas: true } },
            },
          },
        },
      }),
      this.prisma.packingSlip.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  /**
   * Detalle de un packing slip
   */
  async findById(id: string) {
    return this.prisma.packingSlip.findUniqueOrThrow({
      where: { id },
      include: {
        order: {
          include: {
            client: true,
            lineas: {
              include: {
                assignments: {
                  include: {
                    hu: { include: { sku: true } },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  /**
   * Aprobar empaque y marcar como FACTURADO
   */
  async approveAndInvoice(orderId: string, facturaRef?: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
    });

    if (order.estado !== 'EMPACADO') {
      throw new BadRequestException(`El pedido está en estado ${order.estado}, debe estar EMPACADO`);
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        estado: 'FACTURADO',
        facturaLista: true,
        facturaRef: facturaRef || null,
      },
      include: {
        client: { select: { nombre: true, codigo: true } },
        lineas: true,
      },
    });
  }

  /**
   * Stats de empaque
   */
  async getPackingStats() {
    const [totalSlips, pendientesEmpaque, empacadosHoy] = await Promise.all([
      this.prisma.packingSlip.count(),
      this.prisma.order.count({ where: { estado: 'EMPACADO' } }),
      this.prisma.packingSlip.count({
        where: {
          fechaEmpaque: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ]);
    return { totalSlips, pendientesEmpaque, empacadosHoy };
  }
}
