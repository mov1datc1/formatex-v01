import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TransitService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { estado?: string; supplierId?: string }) {
    const where: any = {};
    if (params.estado) where.estado = params.estado;
    if (params.supplierId) where.supplierId = params.supplierId;

    const shipments = await this.prisma.incomingShipment.findMany({
      where,
      include: {
        supplier: { select: { nombre: true, codigo: true } },
        lineas: {
          include: {
            sku: { select: { nombre: true, codigo: true, color: true } },
            reservations: { where: { estado: 'ACTIVA' }, select: { id: true, metrajeReservado: true, tipo: true } },
          },
        },
      },
      orderBy: { fechaEstimada: 'asc' },
    });

    return shipments.map(s => ({
      ...s,
      metrajeTotal: s.lineas.reduce((a, l) => a + l.metrajeTotal, 0),
      metrajeReservado: s.lineas.reduce((a, l) => a + l.metrajeReservado, 0),
      metrajeDisponible: s.lineas.reduce((a, l) => a + l.metrajeTotal - l.metrajeReservado, 0),
      diasParaLlegar: Math.ceil((new Date(s.fechaEstimada).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));
  }

  async findById(id: string) {
    return this.prisma.incomingShipment.findUniqueOrThrow({
      where: { id },
      include: {
        supplier: true,
        lineas: {
          include: {
            sku: true,
            reservations: { include: { order: { select: { codigo: true, client: { select: { nombre: true } } } } } },
          },
        },
      },
    });
  }

  async create(data: {
    supplierId: string;
    ordenCompra?: string;
    fechaEstimada: string;
    transportista?: string;
    notas?: string;
    creadoPor: string;
    lineas: Array<{ skuId: string; cantidadRollos: number; metrajePorRollo?: number }>;
  }) {
    const year = new Date().getFullYear();
    const count = await this.prisma.incomingShipment.count();
    const codigo = `EMB-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.incomingShipment.create({
      data: {
        codigo,
        supplierId: data.supplierId,
        ordenCompra: data.ordenCompra,
        fechaEstimada: new Date(data.fechaEstimada),
        transportista: data.transportista,
        notas: data.notas,
        creadoPor: data.creadoPor,
        lineas: {
          create: data.lineas.map(l => ({
            skuId: l.skuId,
            cantidadRollos: l.cantidadRollos,
            metrajePorRollo: l.metrajePorRollo || 50,
            metrajeTotal: l.cantidadRollos * (l.metrajePorRollo || 50),
          })),
        },
      },
      include: { lineas: true },
    });
  }

  /**
   * Marcar embarque como recibido — conecta con recepción
   */
  async markReceived(id: string) {
    const shipment = await this.prisma.incomingShipment.findUniqueOrThrow({ where: { id } });
    if (shipment.estado !== 'EN_TRANSITO') {
      throw new BadRequestException('Solo embarques en tránsito se pueden marcar como recibidos');
    }
    return this.prisma.incomingShipment.update({
      where: { id },
      data: { estado: 'RECIBIDO', fechaReal: new Date() },
    });
  }

  async getStats() {
    const shipments = await this.prisma.incomingShipment.findMany({
      where: { estado: 'EN_TRANSITO' },
      include: { lineas: true },
    });

    const totalEmbarques = shipments.length;
    const metrajeEsperado = shipments.reduce((a, s) => a + s.lineas.reduce((b, l) => b + l.metrajeTotal, 0), 0);
    const metrajeReservado = shipments.reduce((a, s) => a + s.lineas.reduce((b, l) => b + l.metrajeReservado, 0), 0);
    const proximoEmbarque = shipments.sort((a, b) => new Date(a.fechaEstimada).getTime() - new Date(b.fechaEstimada).getTime())[0];

    return {
      totalEmbarques,
      metrajeEsperado,
      metrajeReservado,
      metrajeDisponible: metrajeEsperado - metrajeReservado,
      proximoEmbarque: proximoEmbarque ? {
        codigo: proximoEmbarque.codigo,
        eta: proximoEmbarque.fechaEstimada,
        diasParaLlegar: Math.ceil((new Date(proximoEmbarque.fechaEstimada).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      } : null,
    };
  }
}
