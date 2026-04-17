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
          client: { select: { nombre: true, codigo: true, rfc: true } },
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
        reservations: { include: { hu: { select: { codigo: true, metrajeActual: true, estadoHu: true } } } },
        packingSlips: true,
        shipments: true,
      },
    });
  }

  // =========================================================================
  // CREAR COTIZACIÓN — Auto-amarra HUs + crea reservas blandas
  // =========================================================================
  async createOrder(data: {
    clientId: string;
    vendorId?: string;
    prioridad?: number;
    reservaHoras?: number;
    modoEntrega?: string;
    fechaRequerida?: string;
    notas?: string;
    creadoPor: string;
    lineas: Array<{
      skuId: string;
      metrajeRequerido: number;
      precioUnitario?: number;
      notas?: string;
      selectedHUs?: Array<{ huId: string; metrajeTomar: number }>;
    }>;
  }) {
    const code = await this.generateCode('PED');
    const reservaHoras = data.reservaHoras || 168; // 7 días default
    const modoEntrega = data.modoEntrega || 'COMPLETA';

    // Calcular totales financieros
    let subtotal = 0;
    for (const l of data.lineas) {
      subtotal += l.metrajeRequerido * (l.precioUnitario || 0);
    }
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    // Expiration for soft reservations
    const expiresAt = new Date(Date.now() + reservaHoras * 60 * 60 * 1000);

    return this.prisma.$transaction(async (tx: any) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          codigo: code,
          clientId: data.clientId,
          vendorId: data.vendorId,
          atcUserId: data.creadoPor,
          prioridad: data.prioridad || 3,
          reservaHoras,
          modoEntrega,
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

      // 2. For each line, auto-assign HUs and create reservations
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

    // PAGO_RECIBIDO → POR_SURTIR: Convert soft reservations to firm
    if (estado === 'POR_SURTIR') {
      updateData.fechaAprobCobranza = new Date();

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
}
