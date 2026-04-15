import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Crear reserva blanda (24h) — ATC cotiza con el cliente
   */
  async createSoftReservation(data: {
    orderId?: string;
    huId?: string;
    shipmentLineId?: string;
    skuId: string;
    metrajeReservado: number;
    creadoPor: string;
  }) {
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Validar HU si es stock físico
    if (data.huId) {
      const hu = await this.prisma.handlingUnit.findUniqueOrThrow({ where: { id: data.huId } });
      if (!['DISPONIBLE'].includes(hu.estadoHu)) {
        throw new BadRequestException(`HU ${hu.codigo} no está disponible (${hu.estadoHu})`);
      }
      if (hu.metrajeActual < data.metrajeReservado) {
        throw new BadRequestException(`HU solo tiene ${hu.metrajeActual}m disponibles`);
      }
      // Marcar HU como reservado blando
      await this.prisma.handlingUnit.update({ where: { id: data.huId }, data: { estadoHu: 'RESERVADO_BLANDO' } });
    }

    // Validar embarque si es tránsito
    if (data.shipmentLineId) {
      const line = await this.prisma.incomingShipmentLine.findUniqueOrThrow({ where: { id: data.shipmentLineId } });
      const disponible = line.metrajeTotal - line.metrajeReservado;
      if (disponible < data.metrajeReservado) {
        throw new BadRequestException(`Solo hay ${disponible}m disponibles en tránsito`);
      }
      await this.prisma.incomingShipmentLine.update({
        where: { id: data.shipmentLineId },
        data: { metrajeReservado: { increment: data.metrajeReservado } },
      });
    }

    return this.prisma.reservation.create({
      data: {
        orderId: data.orderId,
        huId: data.huId,
        shipmentLineId: data.shipmentLineId,
        skuId: data.skuId,
        metrajeReservado: data.metrajeReservado,
        tipo: 'BLANDA',
        expiresAt,
        creadoPor: data.creadoPor,
      },
      include: { hu: { select: { codigo: true } } },
    });
  }

  /**
   * Convertir reserva blanda → firme (cliente aprobó)
   */
  async confirmReservation(reservationId: string) {
    const reservation = await this.prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });
    if (reservation.estado !== 'ACTIVA' || reservation.tipo !== 'BLANDA') {
      throw new BadRequestException('Solo se pueden confirmar reservas blandas activas');
    }

    const updated = await this.prisma.reservation.update({
      where: { id: reservationId },
      data: { tipo: 'FIRME', estado: 'CONVERTIDA', expiresAt: null },
    });

    // Crear nueva reserva firme
    const firme = await this.prisma.reservation.create({
      data: {
        orderId: reservation.orderId,
        huId: reservation.huId,
        shipmentLineId: reservation.shipmentLineId,
        skuId: reservation.skuId,
        metrajeReservado: reservation.metrajeReservado,
        tipo: 'FIRME',
        creadoPor: reservation.creadoPor,
      },
    });

    // Actualizar HU a RESERVADO firme
    if (reservation.huId) {
      await this.prisma.handlingUnit.update({ where: { id: reservation.huId }, data: { estadoHu: 'RESERVADO' } });
    }

    return firme;
  }

  /**
   * Cancelar reserva
   */
  async cancelReservation(reservationId: string, motivo?: string) {
    const reservation = await this.prisma.reservation.findUniqueOrThrow({ where: { id: reservationId } });

    // Liberar HU
    if (reservation.huId) {
      await this.prisma.handlingUnit.update({ where: { id: reservation.huId }, data: { estadoHu: 'DISPONIBLE' } });
    }

    // Liberar metraje en tránsito
    if (reservation.shipmentLineId) {
      await this.prisma.incomingShipmentLine.update({
        where: { id: reservation.shipmentLineId },
        data: { metrajeReservado: { decrement: reservation.metrajeReservado } },
      });
    }

    return this.prisma.reservation.update({
      where: { id: reservationId },
      data: { estado: 'CANCELADA', motivoCancelacion: motivo },
    });
  }

  /**
   * Listar reservas
   */
  async findAll(params: { orderId?: string; skuId?: string; estado?: string; tipo?: string }) {
    const where: any = {};
    if (params.orderId) where.orderId = params.orderId;
    if (params.skuId) where.skuId = params.skuId;
    if (params.estado) where.estado = params.estado;
    if (params.tipo) where.tipo = params.tipo;

    return this.prisma.reservation.findMany({
      where,
      include: {
        hu: { select: { codigo: true, metrajeActual: true, ubicacion: { select: { codigo: true } } } },
        order: { select: { codigo: true, client: { select: { nombre: true } } } },
        shipmentLine: { select: { shipment: { select: { codigo: true, fechaEstimada: true } }, sku: { select: { nombre: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Disponibilidad unificada de un SKU (stock + tránsito)
   */
  async getAvailability(skuId: string) {
    // Stock físico disponible
    const hus = await this.prisma.handlingUnit.findMany({
      where: { skuId, estadoHu: { in: ['DISPONIBLE', 'RESERVADO_BLANDO', 'RESERVADO'] }, metrajeActual: { gt: 0 } },
      include: { ubicacion: { select: { codigo: true } } },
      orderBy: { fechaIngreso: 'asc' }, // FIFO
    });

    const stockDisponible = hus.filter(h => h.estadoHu === 'DISPONIBLE').reduce((a, h) => a + h.metrajeActual, 0);
    const stockReservadoBlando = hus.filter(h => h.estadoHu === 'RESERVADO_BLANDO').reduce((a, h) => a + h.metrajeActual, 0);
    const stockReservadoFirme = hus.filter(h => h.estadoHu === 'RESERVADO').reduce((a, h) => a + h.metrajeActual, 0);

    // Stock en tránsito
    const transitLines = await this.prisma.incomingShipmentLine.findMany({
      where: { skuId, shipment: { estado: 'EN_TRANSITO' } },
      include: { shipment: { select: { codigo: true, fechaEstimada: true, transportista: true } } },
    });

    const transitTotal = transitLines.reduce((a, l) => a + l.metrajeTotal, 0);
    const transitReservado = transitLines.reduce((a, l) => a + l.metrajeReservado, 0);
    const transitDisponible = transitTotal - transitReservado;

    return {
      skuId,
      fisico: {
        disponible: stockDisponible,
        reservadoBlando: stockReservadoBlando,
        reservadoFirme: stockReservadoFirme,
        total: stockDisponible + stockReservadoBlando + stockReservadoFirme,
        rollos: hus.length,
        detalle: hus.map(h => ({ id: h.id, codigo: h.codigo, metraje: h.metrajeActual, estado: h.estadoHu, ubicacion: h.ubicacion?.codigo })),
      },
      transito: {
        total: transitTotal,
        reservado: transitReservado,
        disponible: transitDisponible,
        embarques: transitLines.map(l => ({
          embarque: l.shipment.codigo,
          eta: l.shipment.fechaEstimada,
          transportista: l.shipment.transportista,
          rollos: l.cantidadRollos,
          metrajeTotal: l.metrajeTotal,
          metrajeDisponible: l.metrajeTotal - l.metrajeReservado,
        })),
      },
      totalGlobal: stockDisponible + transitDisponible,
    };
  }

  /**
   * Cronjob: Expirar reservas blandas después de 24h
   */
  @Cron(CronExpression.EVERY_HOUR)
  async expireSoftReservations() {
    const expired = await this.prisma.reservation.findMany({
      where: { tipo: 'BLANDA', estado: 'ACTIVA', expiresAt: { lt: new Date() } },
    });

    for (const r of expired) {
      if (r.huId) {
        await this.prisma.handlingUnit.update({ where: { id: r.huId }, data: { estadoHu: 'DISPONIBLE' } });
      }
      if (r.shipmentLineId) {
        await this.prisma.incomingShipmentLine.update({
          where: { id: r.shipmentLineId },
          data: { metrajeReservado: { decrement: r.metrajeReservado } },
        });
      }
      await this.prisma.reservation.update({ where: { id: r.id }, data: { estado: 'EXPIRADA' } });
    }

    if (expired.length > 0) {
      console.log(`⏰ ${expired.length} reservas blandas expiradas automáticamente`);
    }
  }
}
