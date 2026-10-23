import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
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
          client: { select: { nombre: true, codigo: true, rfc: true, cartaFletera: true } },
          deliveryAddress: true,
          vendor: { select: { nombre: true, codigo: true } },
          lineas: {
            include: {
              assignments: { include: { hu: { select: { codigo: true, metrajeActual: true, estadoHu: true } } } },
            },
          },
          reservations: { where: { estado: 'ACTIVA' }, select: { id: true, tipo: true, metrajeReservado: true } },
          _count: { select: { lineas: true } },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    // Enrich order lines with SKU details for list view (so lines without HUs show the fabric info)
    const allSkuIds = [...new Set(data.flatMap(o => o.lineas.map(l => l.skuId)).filter(Boolean))];
    const skus = allSkuIds.length > 0 ? await this.prisma.skuMaster.findMany({
      where: { id: { in: allSkuIds } },
      select: { id: true, codigo: true, nombre: true, color: true },
    }) : [];
    const skuMap = new Map(skus.map(s => [s.id, s]));
    const enrichedData = data.map(o => ({
      ...o,
      lineas: o.lineas.map(l => ({
        ...l,
        sku: skuMap.get(l.skuId) || null,
      })),
    }));

    return { data: enrichedData, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: {
        client: {
          include: {
            addresses: { where: { activo: true }, orderBy: { esPredeterminada: 'desc' } },
            specialPrices: { where: { activo: true } },
          },
        },
        deliveryAddress: true,
        vendor: true,
        lineas: {
          include: {
            assignments: { include: { hu: { include: { sku: true, ubicacion: true } } } },
            cutOperations: { orderBy: { fechaCorte: 'desc' } },
          },
        },
        reservations: { include: { hu: { select: { codigo: true, metrajeActual: true, estadoHu: true } } } },
        packingSlips: true,
        shipments: true,
      },
    });

    // Enrich order lines with full SKU details (crucial when lines have no HUs yet)
    const skuIds = [...new Set(order.lineas.map(l => l.skuId).filter(Boolean))];
    const skus = skuIds.length > 0 ? await this.prisma.skuMaster.findMany({
      where: { id: { in: skuIds } },
      select: { id: true, codigo: true, nombre: true, color: true, composicion: true, anchoMetros: true, precioReferencia: true },
    }) : [];
    const skuMap = new Map(skus.map(s => [s.id, s]));
    const enrichedLineas = order.lineas.map(l => ({
      ...l,
      sku: skuMap.get(l.skuId) || null,
    }));

    return { ...order, lineas: enrichedLineas };
  }

  /**
   * Calcula fecha de promesa de entrega en días hábiles (Lunes a Sábado, omitiendo Domingo)
   * Base levantamiento operativo Almacén Formatex (Israel)
   */
  private calculatePromisedDeliveryDate(slaHours: number, startDate: Date = new Date()): Date {
    const targetDate = new Date(startDate);
    let remainingHours = slaHours;
    while (remainingHours > 0) {
      targetDate.setHours(targetDate.getHours() + 1);
      // Omitir domingos (día 0)
      if (targetDate.getDay() !== 0) {
        remainingHours--;
      }
    }
    return targetDate;
  }

  // =========================================================================
  // CREAR COTIZACIÓN — Auto-amarra HUs si existen o permite cotizar en frío
  // =========================================================================
  async createOrder(data: {
    clientId: string;
    vendorId?: string;
    prioridad?: number;
    reservaHoras?: number;
    modoEntrega?: string;
    fechaRequerida?: string;
    notas?: string;
    deliveryAddressId?: string;
    deliveryContactName?: string;
    deliveryContactPhone?: string;
    deliverySchedule?: string;
    fletera?: string;
    envioAsegurado?: boolean;
    esBackorder?: boolean;
    condicionBackorder?: string;
    contenedorNumero?: string;
    fechaEstimadaArriboContenedor?: string;
    incomingShipmentId?: string;
    creadoPor: string;
    lineas: Array<{
      skuId: string;
      metrajeRequerido: number;
      precioUnitario?: number;
      listaPrecios?: string;
      descuentoPct?: number;
      notas?: string;
      selectedHUs?: Array<{ huId: string; metrajeTomar: number }>;
    }>;
  }) {
    const code = await this.generateCode('PED');
    // Apartado interno de almacén: 72 horas (3 días) por default (con 24h comunicadas comercialmente)
    const reservaHoras = data.reservaHoras || 72;
    const modoEntrega = data.modoEntrega || 'COMPLETA';

    // Auto-detect if any line uses a restricted price list (F3, F5, F7, F9) requiring approval
    const restrictedLists = ['F3', 'F5', 'F7', 'F9'];
    let requiresApproval = false;
    let approvalReason = '';
    for (const l of data.lineas) {
      if (l.listaPrecios && restrictedLists.includes(l.listaPrecios)) {
        requiresApproval = true;
        approvalReason = `Requiere autorización: Asignación de ${l.listaPrecios} en cotización`;
      }
    }

    // Calcular posición en cola de espera si es Backorder (FIFO)
    let posicionCola: number | null = null;
    let backorderStatus: string | null = null;
    if (data.esBackorder) {
      backorderStatus = 'EN_COLA';
      const existingQueueCount = await this.prisma.order.count({
        where: {
          esBackorder: true,
          estado: { notIn: ['CANCELADO'] },
          ...(data.incomingShipmentId ? { incomingShipmentId: data.incomingShipmentId } : {}),
          ...(data.contenedorNumero ? { contenedorNumero: data.contenedorNumero } : {}),
        },
      });
      posicionCola = existingQueueCount + 1;
    }

    // Calcular totales financieros considerando descuentos aplicados
    let subtotal = 0;
    let cortesActuales = 0;
    let rollosEnteros = 0;
    for (const l of data.lineas) {
      const desc = (Number(l.descuentoPct) || 0) / 100;
      const basePrice = Number(l.precioUnitario) || 0;
      const precioEfectivo = basePrice * (1 - desc);
      subtotal += l.metrajeRequerido * precioEfectivo;
      if (l.metrajeRequerido < 50) {
        cortesActuales++;
      } else {
        rollosEnteros += Math.max(1, Math.round(l.metrajeRequerido / 50));
      }
    }
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Regla Anti-Trampa (Levantamiento Israel / Almacén Oct 2026):
    // Clientes que dividen pedidos en el mismo día se consolidan para el SLA de entrega
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existingOrdersToday = await this.prisma.order.findMany({
      where: {
        clientId: data.clientId,
        fechaPedido: { gte: todayStart },
        estado: { notIn: ['CANCELADO'] },
      },
      include: { lineas: true },
    });

    let cortesAcumulados = cortesActuales;
    for (const ord of existingOrdersToday) {
      for (const lin of ord.lineas) {
        if (lin.metrajeRequerido < 50 || lin.requiereCorte) {
          cortesAcumulados++;
        }
      }
    }

    // Matriz de Promesa de Entrega Formatex (SLA en horas hábiles)
    let tiempoPromesaSlaHoras = 48; // Base rollo cerrado (<10 rollos): 24-48h
    if (cortesAcumulados >= 5) {
      tiempoPromesaSlaHoras = 96; // 5 a 9 cortes o consolidado anti-trampa: 96h
    } else if (cortesAcumulados >= 1) {
      tiempoPromesaSlaHoras = 72; // 1 a 4 cortes: 72h
    } else if (rollosEnteros >= 10) {
      tiempoPromesaSlaHoras = 96; // 10 o más rollos: 96h+
    }
    const fechaPromesaEntrega = this.calculatePromisedDeliveryDate(tiempoPromesaSlaHoras);

    // Protocolo de Validación Física en Almacén (<100m)
    let validacionFisicaRequerida = false;
    let validacionFisicaEstatus: string | null = null;
    for (const l of data.lineas) {
      const stockDisponible = await this.prisma.handlingUnit.aggregate({
        where: {
          skuId: l.skuId,
          estadoHu: 'DISPONIBLE',
          metrajeActual: { gt: 0 },
        },
        _sum: { metrajeActual: true },
      });
      const totalMetros = stockDisponible._sum.metrajeActual || 0;
      if (totalMetros < 100 || l.metrajeRequerido < 20) {
        validacionFisicaRequerida = true;
        validacionFisicaEstatus = 'PENDIENTE';
      }
    }

    // Expiration for soft reservations (Apartado: 72h almacén / 48h cliente)
    const expiresAt = new Date(Date.now() + reservaHoras * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          codigo: code,
          clientId: data.clientId,
          deliveryAddressId: data.deliveryAddressId || null,
          deliveryContactName: data.deliveryContactName || null,
          deliveryContactPhone: data.deliveryContactPhone || null,
          deliverySchedule: data.deliverySchedule || null,
          fletera: data.fletera || null,
          envioAsegurado: data.envioAsegurado ?? false,
          esBackorder: !!data.esBackorder,
          backorderStatus,
          condicionBackorder: data.condicionBackorder || (data.esBackorder ? 'CONTADO_ANTICIPO' : null),
          contenedorNumero: data.contenedorNumero || null,
          fechaEstimadaArriboContenedor: data.fechaEstimadaArriboContenedor ? new Date(data.fechaEstimadaArriboContenedor) : null,
          posicionCola,
          incomingShipmentId: data.incomingShipmentId || null,
          vendorId: data.vendorId || null,
          atcUserId: data.creadoPor,
          prioridad: data.prioridad || 3,
          reservaHoras,
          modoEntrega,
          tiempoPromesaSlaHoras,
          fechaPromesaEntrega,
          validacionFisicaRequerida,
          validacionFisicaEstatus,
          fechaRequerida: data.fechaRequerida ? new Date(data.fechaRequerida) : undefined,
          fechaCotizacion: new Date(),
          notas: data.notas,
          creadoPor: data.creadoPor,
          requiereCorte: cortesActuales > 0,
          estado: 'COTIZADO',
          approvalStatus: requiresApproval ? 'PENDIENTE' : 'NO_REQUIERE',
          approvalReason: requiresApproval ? approvalReason : null,
          subtotal,
          iva,
          total,
          lineas: {
            create: data.lineas.map((l) => {
              const desc = (Number(l.descuentoPct) || 0) / 100;
              const basePrice = Number(l.precioUnitario) || 0;
              const precioEfectivo = basePrice * (1 - desc);
              return {
                skuId: l.skuId,
                metrajeRequerido: l.metrajeRequerido,
                precioUnitario: precioEfectivo,
                precioLista: basePrice,
                listaPrecios: l.listaPrecios || null,
                descuentoPct: Number(l.descuentoPct) || 0,
                importe: l.metrajeRequerido * precioEfectivo,
                requiereCorte: l.metrajeRequerido < 50,
                notas: l.notas,
              };
            }),
          },
        },
        include: { client: true, deliveryAddress: true, incomingShipment: true, lineas: true },
      });

      // 2. For each line, auto-assign HUs and create reservations
      const assignedLots = new Set<string>();
      for (let i = 0; i < order.lineas.length; i++) {
        const orderLine = order.lineas[i];
        const lineData = data.lineas[i];
        let husToAssign = lineData.selectedHUs;

        // If ATC didn't select specific HUs, auto-calculate from fulfillment plan
        if (!husToAssign || husToAssign.length === 0) {
          husToAssign = await this.autoSelectHUs(tx, lineData.skuId, lineData.metrajeRequerido);
        }

        // Create assignments + reservations for each HU
        for (const huSelection of husToAssign) {
          // Validate HU exists and is available
          const hu = await tx.handlingUnit.findUnique({ where: { id: huSelection.huId } });
          if (!hu || !['DISPONIBLE'].includes(hu.estadoHu)) continue;

          if (hu.lote) assignedLots.add(hu.lote);

          const metrajeTomar = Math.min(huSelection.metrajeTomar, hu.metrajeActual);

          // Create assignment (pre-assigned, not yet picked)
          await tx.orderLineAssignment.create({
            data: {
              orderLineId: orderLine.id,
              huId: hu.id,
              metrajeTomado: metrajeTomar,
              requiereCorte: metrajeTomar < hu.metrajeActual,
              cortado: false,
            },
          });

          // Create soft reservation
          await tx.reservation.create({
            data: {
              orderId: order.id,
              orderLineId: orderLine.id,
              huId: hu.id,
              skuId: lineData.skuId,
              metrajeReservado: metrajeTomar,
              tipo: 'BLANDA',
              estado: 'ACTIVA',
              expiresAt,
              creadoPor: data.creadoPor,
            },
          });

          // Change HU state to RESERVADO_BLANDO
          await tx.handlingUnit.update({
            where: { id: hu.id },
            data: { estadoHu: 'RESERVADO_BLANDO' },
          });
        }
      }

      // Si se combinan lotes diferentes para el pedido, encender bandera de variación de tono
      if (assignedLots.size > 1) {
        await tx.order.update({
          where: { id: order.id },
          data: { alertaVariacionTono: true },
        });
      }

      return order;
    });
  }

  // =========================================================================
  // AUTO-SELECT HUs — Uses the fulfillment plan algorithm
  // =========================================================================
  private async autoSelectHUs(
    tx: any,
    skuId: string,
    metraje: number,
  ): Promise<Array<{ huId: string; metrajeTomar: number }>> {
    const result: Array<{ huId: string; metrajeTomar: number }> = [];
    let remaining = metraje;

    // Get available HUs for this SKU
    const allHUs = await tx.handlingUnit.findMany({
      where: {
        skuId,
        estadoHu: 'DISPONIBLE',
        metrajeActual: { gt: 0 },
        OR: [
          { ubicacion: { warehouse: { tipo: 'FISICO' } } },
          { ubicacionId: null },
        ],
      },
      orderBy: { metrajeActual: 'asc' },
    });

    // Step 1: Retazos first (use up small pieces)
    const retazos = allHUs.filter((h: any) => h.tipoRollo === 'RETAZO');
    for (const hu of retazos) {
      if (remaining <= 0) break;
      if (hu.metrajeActual <= remaining + 5) {
        const tomar = Math.min(hu.metrajeActual, remaining);
        result.push({ huId: hu.id, metrajeTomar: tomar });
        remaining -= hu.metrajeActual;
      }
    }

    // Step 2: Whole rolls (FIFO)
    const usedIds = new Set(result.map(r => r.huId));
    const enteros = allHUs
      .filter((h: any) => h.tipoRollo === 'ENTERO' && !usedIds.has(h.id))
      .sort((a: any, b: any) => new Date(a.fechaIngreso || 0).getTime() - new Date(b.fechaIngreso || 0).getTime());

    for (const hu of enteros) {
      if (remaining <= 0) break;
      const tomar = Math.min(hu.metrajeActual, remaining);
      result.push({ huId: hu.id, metrajeTomar: tomar });
      remaining -= hu.metrajeActual;
    }

    // Step 3: Close retazo for remaining
    if (remaining > 0) {
      const closeRetazo = allHUs
        .filter((h: any) => h.tipoRollo === 'RETAZO' && !new Set(result.map(r => r.huId)).has(h.id) && h.metrajeActual >= remaining)
        .sort((a: any, b: any) => a.metrajeActual - b.metrajeActual)[0];
      if (closeRetazo) {
        result.push({ huId: closeRetazo.id, metrajeTomar: remaining });
        remaining = 0;
      }
    }

    return result;
  }

  // =========================================================================
  // REASIGNAR HU — ATC cambia un HU por otro (daño, pérdida, etc.)
  // =========================================================================
  async reassignHU(orderId: string, assignmentId: string, newHuId: string, creadoPor: string) {
    const assignment = await this.prisma.orderLineAssignment.findUniqueOrThrow({
      where: { id: assignmentId },
      include: { orderLine: true, hu: true },
    });

    if (assignment.orderLine.orderId !== orderId) {
      throw new BadRequestException('La asignación no pertenece a esta orden');
    }

    const newHu = await this.prisma.handlingUnit.findUniqueOrThrow({ where: { id: newHuId } });
    if (newHu.estadoHu !== 'DISPONIBLE') {
      throw new BadRequestException(`El HU ${newHu.codigo} no está disponible (estado: ${newHu.estadoHu})`);
    }

    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const expiresAt = new Date(Date.now() + order.reservaHoras * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Free old HU
      await tx.handlingUnit.update({
        where: { id: assignment.huId },
        data: { estadoHu: 'DISPONIBLE' },
      });

      // 2. Cancel old reservation
      await tx.reservation.updateMany({
        where: { orderId, huId: assignment.huId, estado: 'ACTIVA' },
        data: { estado: 'CANCELADA', motivoCancelacion: 'Reasignación por ATC' },
      });

      // 3. Update assignment with new HU
      await tx.orderLineAssignment.update({
        where: { id: assignmentId },
        data: {
          huId: newHuId,
          metrajeTomado: Math.min(assignment.metrajeTomado, newHu.metrajeActual),
          requiereCorte: newHu.metrajeActual > assignment.metrajeTomado,
        },
      });

      // 4. Create new reservation
      await tx.reservation.create({
        data: {
          orderId,
          orderLineId: assignment.orderLineId,
          huId: newHuId,
          skuId: assignment.orderLine.skuId,
          metrajeReservado: Math.min(assignment.metrajeTomado, newHu.metrajeActual),
          tipo: order.estado === 'COTIZADO' ? 'BLANDA' : 'FIRME',
          estado: 'ACTIVA',
          expiresAt: order.estado === 'COTIZADO' ? expiresAt : null,
          creadoPor,
        },
      });

      // 5. Reserve new HU
      await tx.handlingUnit.update({
        where: { id: newHuId },
        data: { estadoHu: order.estado === 'COTIZADO' ? 'RESERVADO_BLANDO' : 'RESERVADO' },
      });

      return { success: true, oldHu: assignment.hu.codigo, newHu: newHu.codigo };
    });
  }

  // =========================================================================
  // PICKING LIST — Lo que ve el picker en la Zebra
  // =========================================================================
  async getPickingList(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: {
        client: { select: { nombre: true, codigo: true } },
        lineas: {
          include: {
            assignments: {
              include: {
                hu: {
                  include: {
                    sku: { select: { id: true, nombre: true, codigo: true, color: true } },
                    ubicacion: { include: { zone: { select: { nombre: true } } } },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Build flat picking list, sorted by warehouse zone/aisle for optimal route
    const items = (order as any).lineas.flatMap((line: any) =>
      line.assignments.map((a: any) => ({
        assignmentId: a.id,
        lineId: line.id,
        huId: a.hu.id,
        huCodigo: a.hu.codigo,
        skuNombre: a.hu.sku?.nombre || '',
        skuColor: a.hu.sku?.color || '',
        metrajeTomar: a.metrajeTomado,
        metrajeActual: a.hu.metrajeActual,
        requiereCorte: a.requiereCorte,
        picked: a.hu.estadoHu === 'EN_PICKING',
        cortado: a.cortado,
        ubicacion: a.hu.ubicacion ? {
          codigo: a.hu.ubicacion.codigo,
          pasillo: a.hu.ubicacion.pasillo,
          rack: a.hu.ubicacion.rack,
          nivel: a.hu.ubicacion.nivel,
          zona: a.hu.ubicacion.zone?.nombre || '',
        } : null,
      }))
    );

    // Sort by zone → aisle → level for walking efficiency
    items.sort((a: any, b: any) => {
      const zA = a.ubicacion?.zona || 'Z';
      const zB = b.ubicacion?.zona || 'Z';
      if (zA !== zB) return zA.localeCompare(zB);
      const pA = a.ubicacion?.pasillo || 'ZZZ';
      const pB = b.ubicacion?.pasillo || 'ZZZ';
      if (pA !== pB) return pA.localeCompare(pB);
      const nA = a.ubicacion?.nivel || 'ZZZ';
      const nB = b.ubicacion?.nivel || 'ZZZ';
      return nA.localeCompare(nB);
    });

    const o = order as any;

    return {
      orderId: order.id,
      codigo: order.codigo,
      estado: order.estado,
      cliente: o.client?.nombre,
      modoEntrega: order.modoEntrega,
      totalItems: items.length,
      pickedCount: items.filter((i: any) => i.picked).length,
      items,
    };
  }

  // =========================================================================
  // CAMBIAR ESTADO — Con lógica de reservas
  // =========================================================================
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

    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id },
      include: { lineas: { include: { assignments: true } } },
    });
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

    // PAGO_RECIBIDO → POR_SURTIR: Convert soft reservations to firm + capture cobranza data
    if (estado === 'POR_SURTIR') {
      updateData.fechaAprobCobranza = new Date();
      if (extraData?.cobradorNombre) updateData.cobradorNombre = extraData.cobradorNombre;
      if (extraData?.cobranzaNotas) updateData.cobranzaNotas = extraData.cobranzaNotas;
      if (extraData?.cobranzaEvidencia) updateData.cobranzaEvidencia = extraData.cobranzaEvidencia;

      // Upgrade all BLANDA → FIRME reservas
      await this.prisma.reservation.updateMany({
        where: { orderId: id, tipo: 'BLANDA', estado: 'ACTIVA' },
        data: { tipo: 'FIRME', expiresAt: null },
      });

      // Upgrade all RESERVADO_BLANDO → RESERVADO HUs
      const reservations = await this.prisma.reservation.findMany({
        where: { orderId: id, estado: 'ACTIVA' },
        select: { huId: true },
      });
      const huIds = reservations.map(r => r.huId).filter(Boolean) as string[];
      if (huIds.length > 0) {
        await this.prisma.handlingUnit.updateMany({
          where: { id: { in: huIds }, estadoHu: 'RESERVADO_BLANDO' },
          data: { estadoHu: 'RESERVADO' },
        });
      }
    }

    if (estado === 'FACTURADO') {
      updateData.facturaLista = true;
      if (extraData?.facturaRef) updateData.facturaRef = extraData.facturaRef;
      if (extraData?.folioContpaqi) updateData.folioContpaqi = extraData.folioContpaqi;
    }

    // CANCELADO: Free all reserved HUs
    if (estado === 'CANCELADO') {
      await this.prisma.reservation.updateMany({
        where: { orderId: id, estado: 'ACTIVA' },
        data: { estado: 'CANCELADA', motivoCancelacion: 'Pedido cancelado' },
      });
      const reservations = await this.prisma.reservation.findMany({
        where: { orderId: id },
        select: { huId: true },
      });
      const huIds = reservations.map(r => r.huId).filter(Boolean) as string[];
      if (huIds.length > 0) {
        await this.prisma.handlingUnit.updateMany({
          where: { id: { in: huIds }, estadoHu: { in: ['RESERVADO_BLANDO', 'RESERVADO'] } },
          data: { estadoHu: 'DISPONIBLE' },
        });
      }
    }

    return this.prisma.order.update({ where: { id }, data: updateData });
  }

  // =========================================================================
  // ASIGNAR HU (PICKING) — Validación reforzada
  // =========================================================================
  async assignHUToOrderLine(orderLineId: string, huId: string, metrajeTomado: number) {
    // Validate that this HU was pre-assigned to this line
    const preAssignment = await this.prisma.orderLineAssignment.findFirst({
      where: { orderLineId, huId },
    });
    if (!preAssignment) {
      throw new BadRequestException(
        'Este HU NO fue asignado a esta línea del pedido. Solo puedes tomar los HUs que aparecen en tu lista de picking. Contacta a ATC si necesitas cambiar.',
      );
    }

    const hu = await this.prisma.handlingUnit.findUniqueOrThrow({ where: { id: huId } });
    if (!['RESERVADO', 'RESERVADO_BLANDO', 'DISPONIBLE'].includes(hu.estadoHu)) {
      throw new BadRequestException(`HU no disponible para picking (estado: ${hu.estadoHu})`);
    }
    if (hu.metrajeActual < metrajeTomado) {
      throw new BadRequestException(`HU solo tiene ${hu.metrajeActual}m disponibles`);
    }

    const needsCut = metrajeTomado < hu.metrajeActual;

    return this.prisma.$transaction(async (tx: any) => {
      // Mark as picked (update existing assignment)
      await tx.orderLineAssignment.update({
        where: { id: preAssignment.id },
        data: { metrajeTomado },
      });

      await tx.handlingUnit.update({ where: { id: huId }, data: { estadoHu: 'EN_PICKING' } });

      const line = await tx.orderLine.findUnique({ where: { id: orderLineId } });
      await tx.orderLine.update({
        where: { id: orderLineId },
        data: { metrajeSurtido: (line?.metrajeSurtido || 0) + metrajeTomado, estado: 'EN_PROCESO' },
      });

      return preAssignment;
    });
  }

  // =========================================================================
  // VALIDATE SCAN — Quick check if a scanned HU belongs to an order
  // =========================================================================
  async validateScan(orderId: string, huCodigo: string) {
    const hu = await this.prisma.handlingUnit.findFirst({
      where: { codigo: huCodigo },
      select: { id: true, codigo: true, metrajeActual: true, estadoHu: true,
        sku: { select: { nombre: true, color: true } },
        ubicacion: { select: { codigo: true } },
      },
    });
    if (!hu) {
      return { valid: false, error: `HU "${huCodigo}" no encontrado en el sistema`, hu: null };
    }

    const assignment = await this.prisma.orderLineAssignment.findFirst({
      where: {
        huId: hu.id,
        orderLine: { orderId },
      },
      include: { orderLine: true },
    });

    if (!assignment) {
      return {
        valid: false,
        error: `HU ${hu.codigo} NO pertenece a este pedido. No puedes tomarlo.`,
        hu,
      };
    }

    const alreadyPicked = hu.estadoHu === 'EN_PICKING';

    return {
      valid: true,
      alreadyPicked,
      hu,
      assignment: {
        id: assignment.id,
        lineId: assignment.orderLineId,
        metrajeTomar: assignment.metrajeTomado,
        requiereCorte: assignment.requiereCorte,
      },
    };
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

  // =========================================================================
  // GESTIÓN DE TAREAS DE ENTREGA (Notificaciones para ATC y Supervisora Alma)
  // =========================================================================
  async getPendingDeliveryConfirmations(userId?: string, isSupervisor?: boolean) {
    const where: any = {
      deliveryConfirmed: false,
      estado: { in: ['POR_SURTIR', 'EN_SURTIDO', 'EN_CORTE'] },
    };
    // Si no es supervisora ni admin, solo ve los pedidos que ella misma levantó (atcUserId)
    if (!isSupervisor && userId) {
      where.atcUserId = userId;
    }

    return this.prisma.order.findMany({
      where,
      orderBy: { fechaPedido: 'desc' },
      include: {
        client: {
          select: {
            id: true,
            nombre: true,
            codigo: true,
            telefono: true,
            cartaFletera: true,
            seguroEnvioDefault: true,
            addresses: { where: { activo: true }, orderBy: { esPredeterminada: 'desc' } },
          },
        },
        deliveryAddress: true,
        _count: { select: { lineas: true } },
      },
    });
  }

  async confirmDelivery(orderId: string, data: {
    deliveryAddressId?: string;
    deliveryContactName?: string;
    deliveryContactPhone?: string;
    deliverySchedule?: string;
    fletera?: string;
    envioAsegurado?: boolean;
    confirmedBy: string;
  }) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        deliveryAddressId: data.deliveryAddressId || null,
        deliveryContactName: data.deliveryContactName || null,
        deliveryContactPhone: data.deliveryContactPhone || null,
        deliverySchedule: data.deliverySchedule || null,
        fletera: data.fletera || null,
        envioAsegurado: data.envioAsegurado ?? false,
        deliveryConfirmed: true,
        deliveryConfirmedAt: new Date(),
        deliveryConfirmedBy: data.confirmedBy,
      },
      include: { client: true, deliveryAddress: true },
    });
  }

  async approveOrder(orderId: string, approvedBy: string, aprobado: boolean, reason?: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        approvalStatus: aprobado ? 'APROBADO' : 'RECHAZADO',
        approvalReason: reason || (aprobado ? 'Aprobado por Gerencia' : 'Rechazado por Gerencia'),
        approvedBy,
        approvedAt: new Date(),
      },
    });
  }

  // =========================================================================
  // GESTIÓN DE BACKORDERS & CONTENEDORES ⭐ (Cola FIFO, Arribos y Alertas)
  // =========================================================================

  async getActiveContainersInTransit() {
    return this.prisma.incomingShipment.findMany({
      where: { estado: 'EN_TRANSITO' },
      orderBy: { fechaEstimada: 'asc' },
      include: {
        supplier: { select: { id: true, nombre: true, codigo: true } },
        lineas: {
          include: {
            sku: { select: { id: true, codigo: true, nombre: true, color: true, composicion: true } },
          },
        },
        orders: {
          where: { esBackorder: true, estado: { notIn: ['CANCELADO'] } },
          select: { id: true, codigo: true, posicionCola: true },
        },
      },
    });
  }

  async getBackorderQueue(
    userId?: string,
    isSupervisor: boolean = false,
    filters?: { contenedorNumero?: string; incomingShipmentId?: string; skuId?: string },
  ) {
    const whereClause: any = {
      esBackorder: true,
      estado: { notIn: ['CANCELADO'] },
    };

    if (!isSupervisor && userId) {
      whereClause.atcUserId = userId;
    }

    if (filters?.contenedorNumero) {
      whereClause.contenedorNumero = filters.contenedorNumero;
    }

    if (filters?.incomingShipmentId) {
      whereClause.incomingShipmentId = filters.incomingShipmentId;
    }

    const orders = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: [
        { fechaEstimadaArriboContenedor: 'asc' },
        { posicionCola: 'asc' },
        { createdAt: 'asc' },
      ],
      include: {
        client: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            telefono: true,
            email: true,
            listaPrecioDefault: true,
          },
        },
        deliveryAddress: true,
        lineas: true,
        incomingShipment: {
          select: {
            id: true,
            codigo: true,
            numeroContenedor: true,
            fechaEstimada: true,
            supplier: { select: { nombre: true } },
          },
        },
      },
    });

    const allSkuIds = [...new Set(orders.flatMap((o) => o.lineas.map((l: any) => l.skuId)).filter(Boolean))];
    const skus = allSkuIds.length > 0 ? await this.prisma.skuMaster.findMany({
      where: { id: { in: allSkuIds } },
      select: { id: true, codigo: true, nombre: true, color: true, precioReferencia: true },
    }) : [];
    const skuMap = new Map(skus.map((s) => [s.id, s]));

    const now = new Date();

    return orders.map((o) => {
      const eta = o.fechaEstimadaArriboContenedor || o.incomingShipment?.fechaEstimada;
      let diasParaArribo: number | null = null;
      let semaforoAlerta: 'VERDE' | 'AMBAR_15D' | 'ROJO_5D' | 'VENCIDO' = 'VERDE';

      if (eta) {
        const diffMs = new Date(eta).getTime() - now.getTime();
        diasParaArribo = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diasParaArribo < 0) {
          semaforoAlerta = 'VENCIDO';
        } else if (diasParaArribo <= 5) {
          semaforoAlerta = 'ROJO_5D';
        } else if (diasParaArribo <= 15) {
          semaforoAlerta = 'AMBAR_15D';
        } else {
          semaforoAlerta = 'VERDE';
        }
      }

      return {
        ...o,
        lineas: o.lineas.map((l: any) => ({
          ...l,
          sku: skuMap.get(l.skuId) || null,
        })),
        diasParaArribo,
        semaforoAlerta,
        requiereNotificarVigencia:
          (semaforoAlerta === 'AMBAR_15D' || semaforoAlerta === 'ROJO_5D') && !o.vigenciaConfirmadaAt,
      };
    });
  }

  async confirmBackorderVigencia(
    orderId: string,
    confirmedBy: string,
    vigente: boolean,
    notas?: string,
  ) {
    if (!vigente) {
      return this.cancelAndReassignBackorder(orderId, confirmedBy, notas || 'Cliente no revalidó orden de compra');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        vigenciaConfirmadaAt: new Date(),
        vigenciaConfirmadaPor: confirmedBy,
        backorderStatus: 'CONFIRMADO',
        notas: notas ? `[Vigencia Confirmada ${new Date().toLocaleDateString('es-MX')}]: ${notas}` : undefined,
      },
      include: { client: true, incomingShipment: true },
    });
  }

  async cancelAndReassignBackorder(orderId: string, cancelledBy: string, motivo?: string) {
    return this.prisma.$transaction(async (tx: any) => {
      // 1. Obtener la orden a cancelar
      const order = await tx.order.findUnique({
        where: { id: orderId },
        include: { lineas: true },
      });
      if (!order) throw new Error('Pedido no encontrado');

      const cancelledPos = order.posicionCola || 1;
      const contenedor = order.contenedorNumero;
      const shipmentId = order.incomingShipmentId;

      // 2. Marcar como cancelado
      const updatedCancelled = await tx.order.update({
        where: { id: orderId },
        data: {
          estado: 'CANCELADO',
          backorderStatus: 'CANCELADO',
          notas: `[Cancelado ${new Date().toLocaleDateString('es-MX')} por ${cancelledBy}]: ${motivo || 'Cancelación de Backorder'}`,
        },
      });

      // 3. Recorrer la cola en cascada para las órdenes activas del mismo contenedor / embarque
      const remainingOrders = await tx.order.findMany({
        where: {
          esBackorder: true,
          estado: { notIn: ['CANCELADO'] },
          ...(shipmentId ? { incomingShipmentId: shipmentId } : {}),
          ...(contenedor ? { contenedorNumero: contenedor } : {}),
          posicionCola: { gt: cancelledPos },
        },
        orderBy: { posicionCola: 'asc' },
      });

      for (const rem of remainingOrders) {
        if (rem.posicionCola && rem.posicionCola > 1) {
          await tx.order.update({
            where: { id: rem.id },
            data: {
              posicionCola: rem.posicionCola - 1,
              backorderStatus: rem.posicionCola - 1 === 1 ? 'EN_COLA_PROXIMO' : rem.backorderStatus,
            },
          });
        }
      }

      // 4. Buscar si hay clientes esperando en un contenedor futuro para este mismo SKU y adelantarlos
      const skuIds = order.lineas.map((l: any) => l.skuId);
      const promotedOrders = await tx.order.findMany({
        where: {
          esBackorder: true,
          estado: { notIn: ['CANCELADO'] },
          incomingShipmentId: { not: shipmentId },
          lineas: { some: { skuId: { in: skuIds } } },
        },
        orderBy: [{ fechaEstimadaArriboContenedor: 'asc' }, { posicionCola: 'asc' }],
        take: 1,
      });

      let promotedOrder: any = null;
      if (promotedOrders.length > 0) {
        promotedOrder = promotedOrders[0];
      }

      return {
        cancelledOrder: updatedCancelled,
        ordersReorderedCount: remainingOrders.length,
        promotedCandidate: promotedOrder,
      };
    });
  }

  // =========================================================================
  // MÓDULO ALMACÉN & SURTIDO (Israel / Oct 2026)
  // =========================================================================

  /**
   * Almacén confirma metraje físico en rack o mesa para pedidos con stock <100m
   */
  async confirmarValidacionFisica(
    orderId: string,
    data: { estatus: 'CONFIRMADO_VISUAL' | 'CONFIRMADO_MESA' | 'RECHAZADO'; metrajeConfirmado?: number; notas?: string },
    userId: string,
  ) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        validacionFisicaEstatus: data.estatus,
        metrajeConfirmadoFisico: data.metrajeConfirmado || null,
        validacionFisicaNotas: data.notas ? `${data.notas} (Validado por user: ${userId})` : `Validado por user: ${userId}`,
      },
      include: { client: true, lineas: true },
    });
  }

  /**
   * ATC registra autorización del cliente para mezclar lotes de tela diferentes
   */
  async aceptarVariacionTono(orderId: string, data: { aceptadoPor: string; notas?: string }) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: {
        variacionTonoAceptada: true,
        variacionTonoAceptadaPor: data.aceptadoPor,
        notas: data.notas ? `${data.notas} [Variación de tono autorizada por cliente]` : undefined,
      },
      include: { client: true, lineas: true },
    });
  }

  /**
   * Almacén asigna Carrito de Corte y Nivel (A1, A2, A3)
   */
  async asignarCarritoCorte(orderId: string, carritoCorte: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { carritoCorte },
      include: { client: true, lineas: true },
    });
  }

  /**
   * Asignar Tipo de Etiqueta Oficial de Embarque
   */
  async asignarTipoEtiqueta(orderId: string, tipoEtiqueta: string) {
    return this.prisma.order.update({
      where: { id: orderId },
      data: { tipoEtiquetaEmbarque: tipoEtiqueta },
      include: { client: true, lineas: true },
    });
  }
}

