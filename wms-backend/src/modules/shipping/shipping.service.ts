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
          deliveryAddress: true,
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
   * Candado de Embarque por Escaneo (Handheld Zebra TC22 / Consola de Envío)
   * Valida si un código escaneado (Pedido, Packing Slip o Rollo HU):
   * 1. Existe y a qué pedido pertenece
   * 2. Está realmente LISTO PARA EMBARQUE (estado FACTURADO / EMPACADO)
   * 3. Corresponde a la FECHA DE ENVÍO DE HOY (no adelantado por error)
   * 4. Corresponde a la RUTA / DESTINO de la camioneta actual (opcional)
   */
  async validateTruckLoadingScan(params: { code: string; targetRoute?: string; targetDate?: string }) {
    const rawCode = (params.code || '').trim();
    if (!rawCode) {
      throw new BadRequestException('Escanea o ingresa un código de Pedido, Packing List o Rollo (HU)');
    }

    let order: any = null;
    let matchedBy: 'ORDER' | 'PACKING_SLIP' | 'HU' = 'ORDER';
    let scannedHuCode: string | null = null;
    let scannedPackingCode: string | null = null;

    const orderInclude = {
      client: {
        select: {
          id: true,
          nombre: true,
          codigo: true,
          rfc: true,
          direccion: true,
          colonia: true,
          poblacion: true,
          estado: true,
          cp: true,
          telefono: true,
          cartaFletera: true,
        },
      },
      deliveryAddress: true,
      lineas: {
        include: {
          assignments: {
            include: {
              hu: { select: { id: true, codigo: true, metrajeActual: true, estadoHu: true } },
            },
          },
        },
      },
      packingSlips: { select: { id: true, codigo: true, bultos: true, pesoTotalKg: true } },
    };

    // 1. Buscar por código de Pedido o Folio CONTPAQi
    order = await this.prisma.order.findFirst({
      where: {
        OR: [
          { codigo: { equals: rawCode, mode: 'insensitive' } },
          { folioContpaqi: { equals: rawCode, mode: 'insensitive' } },
          { codigo: { contains: rawCode, mode: 'insensitive' } },
        ],
      },
      include: orderInclude,
    });

    // 2. Si no se encontró por pedido, buscar por Packing Slip (PKL-...)
    if (!order) {
      const pkl = await this.prisma.packingSlip.findFirst({
        where: { codigo: { equals: rawCode, mode: 'insensitive' } },
        select: { codigo: true, orderId: true },
      });
      if (pkl) {
        matchedBy = 'PACKING_SLIP';
        scannedPackingCode = pkl.codigo;
        order = await this.prisma.order.findUnique({
          where: { id: pkl.orderId },
          include: orderInclude,
        });
      }
    }

    // 3. Si no se encontró, buscar por Rollo / Handling Unit (HU-...)
    if (!order) {
      const assignment = await this.prisma.orderLineAssignment.findFirst({
        where: { hu: { codigo: { equals: rawCode, mode: 'insensitive' } } },
        include: {
          hu: { select: { codigo: true } },
          orderLine: { select: { orderId: true } },
        },
        orderBy: { createdAt: 'desc' },
      });
      if (assignment?.orderLine?.orderId) {
        matchedBy = 'HU';
        scannedHuCode = assignment.hu?.codigo || rawCode;
        order = await this.prisma.order.findUnique({
          where: { id: assignment.orderLine.orderId },
          include: orderInclude,
        });
      }
    }

    if (!order) {
      return {
        found: false,
        allowed: false,
        code: rawCode,
        scannedCode: rawCode,
        reasonCode: 'NOT_FOUND',
        title: '⛔ CÓDIGO NO RECONOCIDO EN EMBARQUES',
        subtitle: `El código "${rawCode}" no corresponde a ningún pedido, packing list ni rollo asignado. NO SUBIR A LA CAMIONETA.`,
        message: `El código "${rawCode}" no corresponde a ningún pedido, packing list ni rollo asignado.`,
        checks: {
          statusReady: false,
          dateMatchesToday: false,
          routeMatches: false,
        },
        order: null,
      };
    }

    // Enriquecer SKUs de las líneas
    const skuIds = [...new Set(order.lineas.map((l: any) => l.skuId).filter(Boolean))] as string[];
    const skus = skuIds.length
      ? await this.prisma.skuMaster.findMany({
          where: { id: { in: skuIds } },
          select: { id: true, codigo: true, nombre: true, color: true },
        })
      : [];
    const skuMap = new Map(skus.map((s) => [s.id, s]));
    order.lineas = order.lineas.map((l: any) => ({
      ...l,
      sku: skuMap.get(l.skuId) || null,
    }));

    // Validar Regla 1: Estatus listo para embarque (FACTURADO o EMPACADO)
    const isAlreadyDispatched = order.estado === 'DESPACHADO';
    const statusReady = ['FACTURADO', 'EMPACADO'].includes(order.estado);

    // Validar Regla 2: Fecha programada de envío === HOY (o ya vencida para salir hoy, pero NUNCA futura)
    const refToday = params.targetDate ? new Date(`${params.targetDate}T12:00:00`) : new Date();
    const todayStr = `${refToday.getFullYear()}-${String(refToday.getMonth() + 1).padStart(2, '0')}-${String(refToday.getDate()).padStart(2, '0')}`;

    const schedDateObj = order.fechaPromesaEntrega ? new Date(order.fechaPromesaEntrega) : refToday;
    const schedStr = `${schedDateObj.getFullYear()}-${String(schedDateObj.getMonth() + 1).padStart(2, '0')}-${String(schedDateObj.getDate()).padStart(2, '0')}`;

    // Si la fecha programada es posterior a hoy (schedStr > todayStr), NO es para embarcar hoy
    const isFutureOrder = schedStr > todayStr;
    const isPastDueOrder = schedStr < todayStr;
    const dateMatchesToday = !isFutureOrder;

    // Validar Regla 3: Ruta / Etiqueta de Embarque
    const orderRoute =
      order.tipoEtiquetaEmbarque ||
      (order.fletera?.toLowerCase().includes('paquetexpress') || order.fletera?.toLowerCase().includes('travisa')
        ? 'PAQUETERIA'
        : order.client?.poblacion?.toLowerCase().includes('ocotlan')
          ? 'OCOTLAN'
          : 'LOCAL_INFERIOR');

    const routeMatches =
      !params.targetRoute ||
      params.targetRoute === 'ALL' ||
      params.targetRoute === 'TODAS' ||
      params.targetRoute === orderRoute;

    const ROUTE_NAMES: Record<string, string> = {
      LOCAL_INFERIOR: '1. Local ZMG (Camioneta Formatex)',
      FORANEO_SUPERIOR: '2. Foránea Consolidada',
      OCOTLAN: '3. Ruta Ocotlán (Fija)',
      PAQUETERIA: '4. Paqueterías (Paquetexpress/Travisa)',
    };

    const reasons: string[] = [];
    let reasonCode = 'OK';
    let title = '✅ SÍ CORRESPONDE — AUTORIZADO PARA SUBIR A CAMIONETA';

    if (isAlreadyDispatched) {
      reasonCode = 'ALREADY_DISPATCHED';
      title = '⛔ ¡NO SUBIR! PEDIDO YA DESPACHADO ANTERIORMENTE';
      reasons.push(`El pedido ${order.codigo} ya fue registrado como DESPACHADO.`);
    } else if (!statusReady) {
      reasonCode = 'NOT_READY_STATUS';
      title = '⛔ ¡NO SUBIR A CAMIONETA! PEDIDO AÚN NO LISTO PARA EMBARQUE';
      reasons.push(
        `El pedido ${order.codigo} se encuentra en estado "${order.estado}" (debe estar FACTURADO / EMPACADO antes de subir a camioneta).`,
      );
    }

    if (isFutureOrder) {
      if (reasonCode === 'OK') {
        reasonCode = 'WRONG_DATE_FUTURE';
        title = '⛔ ¡ALTO! NO SUBIR A CAMIONETA — NO ES ENVÍO DE HOY';
      }
      const formattedSched = schedDateObj.toLocaleDateString('es-MX', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
      reasons.push(
        `Este pedido está programado para enviarse el ${formattedSched} (${schedStr}), NO hoy (${todayStr}). Evita enviarlo antes de tiempo.`,
      );
    }

    if (!routeMatches) {
      if (reasonCode === 'OK') {
        reasonCode = 'WRONG_ROUTE';
        title = '⛔ ¡DESTINO / RUTA INCORRECTA! NO SUBIR A ESTA UNIDAD';
      }
      reasons.push(
        `El pedido pertenece a la ruta/etiqueta "${orderRoute}" (${order.fletera || 'Camioneta Formatex'} — ${order.client?.poblacion || 'GDL'}), que no coincide con la unidad seleccionada (${params.targetRoute}).`,
      );
    }

    const allowed = statusReady && !isAlreadyDispatched && dateMatchesToday && routeMatches;

    if (allowed) {
      reasons.push(
        `Pedido ${order.codigo} verificado: Listo para embarque (${order.estado}), programado para salida HOY (${schedStr}) hacia ${order.deliveryAddress?.municipio || order.client?.poblacion || 'Guadalajara'}.`,
      );
    }

    const totalMeters = (order.lineas || []).reduce(
      (sum: number, l: any) => sum + Number(l.metrajeSurtido || l.metrajeRequerido || 0),
      0,
    );

    const scheduledDateFormatted = order.fechaPromesaEntrega
      ? schedDateObj.toLocaleDateString('es-MX', {
          weekday: 'short',
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        })
      : 'Hoy (Entrega inmediata)';

    return {
      found: true,
      allowed,
      code: rawCode,
      scannedCode: rawCode,
      matchedBy,
      scannedHuCode,
      scannedPackingCode,
      reasonCode,
      blockReason: allowed ? null : reasonCode,
      title,
      subtitle: reasons.join(' '),
      message: reasons.join(' '),
      reasons,
      scheduledDate: schedStr,
      todayDate: todayStr,
      isFutureOrder,
      isPastDueOrder,
      orderRoute,
      checks: {
        statusReady: statusReady && !isAlreadyDispatched,
        alreadyDispatched: isAlreadyDispatched,
        dateMatchesToday,
        isFutureOrder,
        routeMatches,
      },
      order: {
        ...order,
        scheduledDateStr: schedStr,
        scheduledDateFormatted,
        routeCode: orderRoute,
        routeLabel: ROUTE_NAMES[orderRoute] || orderRoute,
        totalMeters,
      },
    };
  }

  /**
   * Actualizar fecha programada de embarque de un pedido (para pruebas y reprogramación de rampa)
   */
  async updateScheduledShippingDate(orderId: string, fechaPromesaEntrega: string, tipoEtiquetaEmbarque?: string) {
    const parsedDate = new Date(`${fechaPromesaEntrega}T12:00:00`);
    if (isNaN(parsedDate.getTime())) {
      throw new BadRequestException('Fecha programada inválida');
    }
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        fechaPromesaEntrega: parsedDate,
        ...(tipoEtiquetaEmbarque ? { tipoEtiquetaEmbarque } : {}),
      },
      include: {
        client: { select: { nombre: true, codigo: true, poblacion: true } },
      },
    });
  }

  /**
   * Crear registro de envío (shipment) con soporte para 4 etiquetas oficiales y evidencia
   */
  async createShipment(data: {
    orderId: string;
    transportista: string;
    guiaEnvio?: string;
    placas?: string;
    chofer?: string;
    notas?: string;
    enviadoPor: string;
    labelType?: string; // "LOCAL_INFERIOR" | "FORANEO_SUPERIOR" | "OCOTLAN" | "PAQUETERIA"
    evidenciaFotoUrl?: string;
    pesoKg?: number;
    largoCm?: number;
    anchoCm?: number;
    altoCm?: number;
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
          labelType: data.labelType || null,
          evidenciaFotoUrl: data.evidenciaFotoUrl || null,
          pesoKg: data.pesoKg != null ? Number(data.pesoKg) : null,
          largoCm: data.largoCm != null ? Number(data.largoCm) : null,
          anchoCm: data.anchoCm != null ? Number(data.anchoCm) : null,
          altoCm: data.altoCm != null ? Number(data.altoCm) : null,
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

      // Actualizar orden a DESPACHADO y registrar etiqueta
      await tx.order.update({
        where: { id: data.orderId },
        data: {
          estado: 'DESPACHADO',
          transportista: data.transportista,
          guiaEnvio: data.guiaEnvio,
          tipoEtiquetaEmbarque: data.labelType || undefined,
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
   * Subir fotografía del acuse de recibo / guía sellada por la fletera
   */
  async uploadShippingEvidence(
    shipmentId: string,
    data: { evidenciaFotoUrl: string; guiaEnvio?: string; transportista?: string },
  ) {
    const shipment = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        evidenciaFotoUrl: data.evidenciaFotoUrl,
        ...(data.guiaEnvio ? { guiaEnvio: data.guiaEnvio } : {}),
        ...(data.transportista ? { transportista: data.transportista } : {}),
        estado: 'EN_TRANSITO',
      },
      include: {
        order: {
          include: {
            client: { select: { nombre: true, codigo: true } },
          },
        },
      },
    });

    if (data.guiaEnvio || data.transportista) {
      await this.prisma.order.update({
        where: { id: shipment.orderId },
        data: {
          ...(data.guiaEnvio ? { guiaEnvio: data.guiaEnvio } : {}),
          ...(data.transportista ? { transportista: data.transportista } : {}),
        },
      });
    }

    return shipment;
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
