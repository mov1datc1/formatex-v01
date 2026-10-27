import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class ReservationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async resolveValidUserId(userId?: string): Promise<string> {
    if (userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true },
      });
      if (user) return user.id;
    }
    const admin = await this.prisma.user.findFirst({
      where: { role: { nivel: 1 } },
      select: { id: true },
    });
    return admin?.id || '00000000-0000-0000-0000-000000000000';
  }

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
   * Disponibilidad unificada de un SKU (stock + tránsito + reservas VIP)
   */
  async getAvailability(skuId: string) {
    const sku = await this.prisma.skuMaster.findUnique({
      where: { id: skuId },
      include: {
        priceLists: { orderBy: { listaCodigo: 'asc' } },
        supplier: true,
      },
    });

    // Stock físico disponible (incluyendo reservas blandas, firmes y VIP)
    const hus = await this.prisma.handlingUnit.findMany({
      where: { skuId, estadoHu: { in: ['DISPONIBLE', 'RESERVADO_BLANDO', 'RESERVADO', 'RESERVADO_VIP'] }, metrajeActual: { gt: 0 } },
      include: { ubicacion: { select: { codigo: true, tipo: true } } },
      orderBy: { fechaIngreso: 'asc' }, // FIFO
    });

    const stockDisponible = hus.filter(h => h.estadoHu === 'DISPONIBLE').reduce((a, h) => a + h.metrajeActual, 0);
    const stockReservadoBlando = hus.filter(h => h.estadoHu === 'RESERVADO_BLANDO').reduce((a, h) => a + h.metrajeActual, 0);
    const stockReservadoFirme = hus.filter(h => h.estadoHu === 'RESERVADO').reduce((a, h) => a + h.metrajeActual, 0);
    const stockReservadoVip = hus.filter(h => h.estadoHu === 'RESERVADO_VIP').reduce((a, h) => a + h.metrajeActual, 0);

    // Stock en tránsito
    const transitLines = await this.prisma.incomingShipmentLine.findMany({
      where: { skuId, shipment: { estado: 'EN_TRANSITO' } },
      include: {
        shipment: {
          select: {
            id: true,
            codigo: true,
            numeroContenedor: true,
            numeroPedimento: true,
            ordenCompra: true,
            fechaEstimada: true,
            transportista: true,
          },
        },
      },
    });

    const transitTotal = transitLines.reduce((a, l) => a + l.metrajeTotal, 0);
    const transitReservado = transitLines.reduce((a, l) => a + l.metrajeReservado, 0);
    const transitDisponible = Math.max(0, transitTotal - transitReservado);

    return {
      skuId,
      sku,
      fisico: {
        disponible: stockDisponible,
        reservadoBlando: stockReservadoBlando,
        reservadoFirme: stockReservadoFirme,
        reservadoVip: stockReservadoVip,
        total: stockDisponible + stockReservadoBlando + stockReservadoFirme + stockReservadoVip,
        rollos: hus.length,
        detalle: hus.map(h => ({
          id: h.id,
          codigo: h.codigo,
          metraje: h.metrajeActual,
          estado: h.estadoHu,
          ubicacion: h.ubicacion?.codigo,
          tipoUbicacion: h.ubicacion?.tipo,
          gradoCalidad: h.gradoCalidad || 'PRIMERA',
          calidadRestringida: h.calidadRestringida || false,
          loteProveedor: h.loteProveedor,
          fechaIngreso: h.fechaIngreso,
          reservaVipClienteId: h.reservaVipClienteId,
          reservaVipNombre: h.reservaVipNombre,
          reservaVipHasta: h.reservaVipHasta,
        })),
      },
      transito: {
        total: transitTotal,
        reservado: transitReservado,
        disponible: transitDisponible,
        embarques: transitLines.map(l => ({
          id: l.id,
          shipmentId: l.shipment.id,
          embarque: l.shipment.codigo,
          numeroContenedor: l.shipment.numeroContenedor,
          numeroPedimento: l.shipment.numeroPedimento,
          ordenCompra: l.shipment.ordenCompra,
          eta: l.shipment.fechaEstimada,
          transportista: l.shipment.transportista,
          rollos: l.cantidadRollos,
          metrajeTotal: l.metrajeTotal,
          metrajeReservado: l.metrajeReservado,
          metrajeDisponible: Math.max(0, l.metrajeTotal - l.metrajeReservado),
        })),
      },
      totalGlobal: stockDisponible + transitDisponible,
    };
  }

  /**
   * Crear o asignar sub-almacén virtual VIP y apartar rollos (Caso "Seth" / 500m - 1,000m+)
   * Protegido contra auto-expiración de 24h — Administrado con semáforo preventivo
   */
  async createVipReservation(data: {
    clientId: string;
    huIds: string[];
    diasVigencia?: number;
    anticipoPorcentaje?: number;
    anticipoMonto?: number;
    notas?: string;
    autorizadoPor: string;
    actorId?: string;
    userId?: string;
  }) {
    if (!data.huIds || data.huIds.length === 0) {
      throw new BadRequestException('Debes seleccionar al menos un rollo (HU) para la reserva VIP');
    }

    const client = await this.prisma.client.findUniqueOrThrow({
      where: { id: data.clientId },
    });

    // 1. Obtener o crear el Almacén Virtual para este cliente VIP
    let virtualWhId = client.almacenVirtualId;
    let virtualWh = virtualWhId ? await this.prisma.warehouse.findUnique({ where: { id: virtualWhId } }) : null;

    if (!virtualWh) {
      const whCode = `VIP-${client.codigo || client.id.slice(0, 6).toUpperCase()}`;
      virtualWh = await this.prisma.warehouse.findFirst({
        where: { OR: [{ codigo: whCode }, { clienteAsignado: client.nombre, tipo: 'VIRTUAL' }] },
      });

      if (!virtualWh) {
        virtualWh = await this.prisma.warehouse.create({
          data: {
            nombre: `Sub-Almacén Virtual — ${client.nombre}`,
            codigo: whCode,
            tipo: 'VIRTUAL',
            clienteAsignado: client.nombre,
            descripcion: `Almacén virtual exclusivo para apartados extendidos de ${client.nombre}`,
          },
        });
      }

      await this.prisma.client.update({
        where: { id: client.id },
        data: { esVip: true, almacenVirtualId: virtualWh.id, notasVip: data.notas },
      });
    }

    const dias = data.diasVigencia && data.diasVigencia > 0 ? Number(data.diasVigencia) : 15;
    const expiresAt = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);

    // 2. Validar que todos los HUs existan y estén disponibles
    const hus = await this.prisma.handlingUnit.findMany({
      where: { id: { in: data.huIds } },
      include: { sku: true },
    });

    if (hus.length !== data.huIds.length) {
      throw new BadRequestException('Uno o más rollos no existen en el sistema');
    }

    for (const hu of hus) {
      if (!['DISPONIBLE', 'RESERVADO_BLANDO'].includes(hu.estadoHu)) {
        throw new BadRequestException(`El rollo ${hu.codigo} no está disponible (estado actual: ${hu.estadoHu})`);
      }
    }

    // 3. Ejecutar transacción atómica de reserva VIP
    return this.prisma.$transaction(async (tx: any) => {
      const createdReservations: any[] = [];

      for (const hu of hus) {
        // Actualizar HU a RESERVADO_VIP
        await tx.handlingUnit.update({
          where: { id: hu.id },
          data: {
            estadoHu: 'RESERVADO_VIP',
            reservaVipClienteId: client.id,
            reservaVipNombre: client.nombre,
            reservaVipHasta: expiresAt,
          },
        });

        // Crear registro en Reservation
        const res = await tx.reservation.create({
          data: {
            huId: hu.id,
            skuId: hu.skuId,
            metrajeReservado: hu.metrajeActual,
            tipo: 'VIP',
            estado: 'ACTIVA',
            clienteId: client.id,
            clienteNombre: client.nombre,
            virtualWarehouseId: virtualWh!.id,
            diasVigenciaVip: dias,
            anticipoPorcentaje: data.anticipoPorcentaje ? Number(data.anticipoPorcentaje) : null,
            anticipoMonto: data.anticipoMonto ? Number(data.anticipoMonto) : null,
            autorizadoPor: data.autorizadoPor,
            autorizadoAt: new Date(),
            notasVip: data.notas || null,
            expiresAt,
            creadoPor: data.autorizadoPor,
          },
        });
        createdReservations.push(res);

        const validUserId = await this.resolveValidUserId(data.actorId || data.userId);

        // Registrar trazabilidad en InventoryMovement
        await tx.inventoryMovement.create({
          data: {
            huId: hu.id,
            tipo: 'RESERVA_VIP',
            metrajeAntes: hu.metrajeActual,
            metrajeDespues: hu.metrajeActual,
            referencia: `VIP-${virtualWh!.codigo}`,
            notas: `Apartado especial VIP (${dias} días) para ${client.nombre}. Autorizado por ${data.autorizadoPor || 'Gerencia'}. Anticipo: ${data.anticipoPorcentaje || 0}% ($${data.anticipoMonto || 0})`,
            userId: validUserId,
          },
        });
      }

      return {
        success: true,
        virtualWarehouse: virtualWh,
        cliente: client.nombre,
        diasVigencia: dias,
        expiresAt,
        totalRollos: hus.length,
        totalMetraje: hus.reduce((acc: number, h: any) => acc + h.metrajeActual, 0),
        reservations: createdReservations,
      };
    });
  }

  /**
   * Listar reservas VIP activas con cálculo de semáforo preventivo (7d / 15d)
   */
  async listVipReservations() {
    const reservations = await this.prisma.reservation.findMany({
      where: { tipo: 'VIP', estado: 'ACTIVA' },
      include: {
        hu: {
          include: {
            sku: { select: { id: true, codigo: true, nombre: true, color: true, precioReferencia: true } },
            ubicacion: { select: { codigo: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const now = new Date();

    const mapped = reservations.map((r: any) => {
      const created = new Date(r.createdAt);
      const expires = r.expiresAt ? new Date(r.expiresAt) : new Date(created.getTime() + (r.diasVigenciaVip || 15) * 86400000);
      const msElapsed = now.getTime() - created.getTime();
      const diasTranscurridos = Math.max(0, Math.floor(msElapsed / (1000 * 60 * 60 * 24)));
      const msRemaining = expires.getTime() - now.getTime();
      const diasRestantes = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));

      let semaforo: 'VERDE' | 'AMARILLO' | 'ROJO' = 'VERDE';
      let semaforoLabel = 'Normal (En plazo)';

      if (diasTranscurridos >= 15 || diasRestantes <= 0) {
        semaforo = 'ROJO';
        semaforoLabel = 'Crítico: 15+ días sin pago / Expirado';
      } else if (diasTranscurridos >= 7) {
        semaforo = 'AMARILLO';
        semaforoLabel = 'Alerta preventiva: 7+ días sin pago';
      }

      const valorEstimado = (r.metrajeReservado || 0) * Number(r.hu?.sku?.precioReferencia || 0);

      return {
        id: r.id,
        clienteId: r.clienteId,
        clienteNombre: r.clienteNombre || 'Cliente VIP',
        virtualWarehouseId: r.virtualWarehouseId,
        huId: r.huId,
        huCodigo: r.hu?.codigo,
        skuId: r.skuId,
        skuCodigo: r.hu?.sku?.codigo,
        skuNombre: r.hu?.sku?.nombre,
        color: r.hu?.sku?.color,
        metraje: r.metrajeReservado,
        ubicacion: r.hu?.ubicacion?.codigo || 'En Almacén',
        anticipoPorcentaje: r.anticipoPorcentaje ? Number(r.anticipoPorcentaje) : 0,
        anticipoMonto: r.anticipoMonto ? Number(r.anticipoMonto) : 0,
        autorizadoPor: r.autorizadoPor,
        autorizadoAt: r.autorizadoAt,
        notasVip: r.notasVip,
        createdAt: r.createdAt,
        expiresAt: r.expiresAt,
        diasVigenciaVip: r.diasVigenciaVip || 15,
        diasTranscurridos,
        diasRestantes,
        semaforo,
        semaforoLabel,
        valorEstimado,
      };
    });

    // Agrupación por cliente
    const clientesMap = new Map<string, any>();
    for (const item of mapped) {
      const key = item.clienteId || item.clienteNombre;
      if (!clientesMap.has(key)) {
        clientesMap.set(key, {
          clienteId: item.clienteId,
          clienteNombre: item.clienteNombre,
          virtualWarehouseId: item.virtualWarehouseId,
          totalMetros: 0,
          totalRollos: 0,
          valorTotal: 0,
          maxDiasTranscurridos: 0,
          peorSemaforo: 'VERDE',
          reservas: [],
        });
      }
      const grp = clientesMap.get(key);
      grp.totalMetros += item.metraje;
      grp.totalRollos += 1;
      grp.valorTotal += item.valorEstimado;
      grp.maxDiasTranscurridos = Math.max(grp.maxDiasTranscurridos, item.diasTranscurridos);
      if (item.semaforo === 'ROJO' || grp.peorSemaforo === 'ROJO') {
        grp.peorSemaforo = 'ROJO';
      } else if (item.semaforo === 'AMARILLO' && grp.peorSemaforo !== 'ROJO') {
        grp.peorSemaforo = 'AMARILLO';
      }
      grp.reservas.push(item);
    }

    const totalMetrosGlobal = mapped.reduce((a, b) => a + b.metraje, 0);
    const totalRollosGlobal = mapped.length;
    const totalValorGlobal = mapped.reduce((a, b) => a + b.valorEstimado, 0);

    return {
      totalMetrosGlobal,
      totalRollosGlobal,
      totalValorGlobal,
      porCliente: Array.from(clientesMap.values()),
      detalle: mapped,
    };
  }

  /**
   * Liberar / Descongelar Reserva VIP (1-Click) para volver a disponibilidad general
   */
  async releaseVipReservation(params: {
    reservationId?: string;
    virtualWarehouseId?: string;
    clienteId?: string;
    huId?: string;
    liberadoPor: string;
    motivo?: string;
    actorId?: string;
    userId?: string;
  }) {
    // Validar que se proporcione al menos un identificador explícito
    // Protege contra cancelaciones masivas accidentales o no intencionadas de todos los clientes VIP
    if (!params.reservationId && !params.virtualWarehouseId && !params.clienteId && !params.huId) {
      throw new BadRequestException(
        'Acción denegada: Se requiere especificar un alcance explícito (reservationId, virtualWarehouseId, clienteId o huId) para liberar reservas VIP. No se permite la liberación masiva sin identificador.'
      );
    }

    const where: any = { tipo: 'VIP', estado: 'ACTIVA' };
    if (params.reservationId) where.id = params.reservationId;
    if (params.virtualWarehouseId) where.virtualWarehouseId = params.virtualWarehouseId;
    if (params.clienteId) where.clienteId = params.clienteId;
    if (params.huId) where.huId = params.huId;

    const toRelease = await this.prisma.reservation.findMany({
      where,
      include: { hu: true },
    });

    if (toRelease.length === 0) {
      throw new BadRequestException('No se encontraron reservas VIP activas con los criterios especificados');
    }

    return this.prisma.$transaction(async (tx: any) => {
      let releasedMeters = 0;

      const validUserId = await this.resolveValidUserId(params.actorId || params.userId);

      for (const res of toRelease) {
        if (res.huId) {
          await tx.handlingUnit.update({
            where: { id: res.huId },
            data: {
              estadoHu: 'DISPONIBLE',
              reservaVipClienteId: null,
              reservaVipNombre: null,
              reservaVipHasta: null,
            },
          });

          await tx.inventoryMovement.create({
            data: {
              huId: res.huId,
              tipo: 'LIBERACION_VIP',
              metrajeAntes: res.hu?.metrajeActual || res.metrajeReservado,
              metrajeDespues: res.hu?.metrajeActual || res.metrajeReservado,
              referencia: `LIB-VIP-${res.clienteNombre || 'CLIENTE'}`,
              notas: `Descongelado de sub-almacén VIP a venta general. Motivo: ${params.motivo || 'Plazo vencido sin pago / Cancelación comercial'}. Liberado por: ${params.liberadoPor || 'Gerencia'}`,
              userId: validUserId,
            },
          });
        }

        await tx.reservation.update({
          where: { id: res.id },
          data: {
            estado: 'CANCELADA',
            liberadoPor: params.liberadoPor,
            liberadoAt: new Date(),
            motivoLiberacion: params.motivo || 'Liberado a venta general',
          },
        });

        releasedMeters += res.metrajeReservado;
      }

      return {
        success: true,
        rollosLiberados: toRelease.length,
        metrajeLiberado: releasedMeters,
        mensaje: `Se liberaron exitosamente ${toRelease.length} rollos (${releasedMeters.toFixed(1)}m) a venta general.`,
      };
    });
  }

  /**
   * Cronjob: Expirar reservas blandas después de 24h (las VIP están protegidas)
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
