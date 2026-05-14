import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class PurchasingService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== CÓDIGO SECUENCIAL =====
  private async generateCode(prefix: string, model: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await (this.prisma as any)[model].count();
    const seq = String(count + 1).padStart(4, '0');
    return `${prefix}-${year}-${seq}`;
  }

  // ===== LISTADO DE ÓRDENES DE COMPRA =====
  async findAllOrders(params: {
    search?: string;
    estado?: string;
    supplierId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, estado, supplierId, fechaDesde, fechaHasta, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (estado) where.estado = estado;
    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { supplier: { nombre: { contains: search, mode: 'insensitive' } } },
        { notas: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (fechaDesde || fechaHasta) {
      where.fechaEmision = {};
      if (fechaDesde) where.fechaEmision.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaEmision.lte = new Date(fechaHasta);
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          supplier: { select: { id: true, nombre: true, codigo: true, email: true } },
          lineas: {
            include: {
              sku: { select: { id: true, codigo: true, nombre: true, color: true } },
            },
          },
          receipts: true,
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ===== DETALLE OC =====
  async findOrderById(id: string) {
    const order = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        lineas: {
          include: {
            sku: { select: { id: true, codigo: true, nombre: true, color: true, categoria: true, metrajeEstandar: true } },
          },
        },
        receipts: {
          orderBy: { fechaRecepcion: 'desc' },
        },
      },
    });
    if (!order) throw new NotFoundException('Orden de compra no encontrada');
    return order;
  }

  // ===== CREAR OC =====
  async createOrder(data: {
    supplierId: string;
    prioridad?: number;
    fechaEstimadaEntrega?: string;
    condicionesPago?: string;
    transportista?: string;
    notas?: string;
    notasInternas?: string;
    creadoPor: string;
    lineas: Array<{
      skuId: string;
      cantidadRollos?: number;
      metrajePorRollo?: number;
      metrajeTotal: number;
      precioUnitario: number;
      precioFuente?: string;
      notas?: string;
    }>;
  }) {
    // Validar proveedor
    await this.prisma.supplier.findUniqueOrThrow({ where: { id: data.supplierId } });

    // Validar SKUs
    for (const linea of data.lineas) {
      await this.prisma.skuMaster.findUniqueOrThrow({ where: { id: linea.skuId } });
    }

    const codigo = await this.generateCode('OC', 'purchaseOrder');

    // Calcular totales
    const lineasConImporte = data.lineas.map(l => ({
      ...l,
      importe: l.metrajeTotal * l.precioUnitario,
    }));
    const subtotal = lineasConImporte.reduce((s, l) => s + l.importe, 0);
    const iva = subtotal * 0.16;
    const total = subtotal + iva;

    return this.prisma.purchaseOrder.create({
      data: {
        codigo,
        supplierId: data.supplierId,
        prioridad: data.prioridad || 3,
        fechaEstimadaEntrega: data.fechaEstimadaEntrega ? new Date(data.fechaEstimadaEntrega) : null,
        condicionesPago: data.condicionesPago,
        transportista: data.transportista,
        notas: data.notas,
        notasInternas: data.notasInternas,
        creadoPor: data.creadoPor,
        subtotal,
        iva,
        total,
        lineas: {
          create: lineasConImporte.map(l => ({
            skuId: l.skuId,
            cantidadRollos: l.cantidadRollos || null,
            metrajePorRollo: l.metrajePorRollo || 50,
            metrajeTotal: l.metrajeTotal,
            precioUnitario: l.precioUnitario,
            importe: l.importe,
            precioFuente: l.precioFuente || 'MANUAL',
            notas: l.notas,
          })),
        },
      },
      include: {
        supplier: { select: { id: true, nombre: true, codigo: true } },
        lineas: {
          include: {
            sku: { select: { id: true, codigo: true, nombre: true, color: true } },
          },
        },
      },
    });
  }

  // ===== EDITAR OC (solo en BORRADOR) =====
  async updateOrder(id: string, data: {
    prioridad?: number;
    fechaEstimadaEntrega?: string;
    condicionesPago?: string;
    transportista?: string;
    notas?: string;
    notasInternas?: string;
    supplierId?: string;
    lineas?: Array<{
      skuId: string;
      cantidadRollos?: number;
      metrajePorRollo?: number;
      metrajeTotal: number;
      precioUnitario: number;
      precioFuente?: string;
      notas?: string;
    }>;
  }) {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
    if (order.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden editar OC en estado BORRADOR');
    }

    const updateData: any = {};
    if (data.prioridad !== undefined) updateData.prioridad = data.prioridad;
    if (data.fechaEstimadaEntrega) updateData.fechaEstimadaEntrega = new Date(data.fechaEstimadaEntrega);
    if (data.condicionesPago !== undefined) updateData.condicionesPago = data.condicionesPago;
    if (data.transportista !== undefined) updateData.transportista = data.transportista;
    if (data.notas !== undefined) updateData.notas = data.notas;
    if (data.notasInternas !== undefined) updateData.notasInternas = data.notasInternas;
    if (data.supplierId) updateData.supplierId = data.supplierId;

    // Si vienen líneas nuevas, reemplazar
    if (data.lineas && data.lineas.length > 0) {
      await this.prisma.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });

      const lineasConImporte = data.lineas.map(l => ({
        ...l,
        importe: l.metrajeTotal * l.precioUnitario,
      }));
      const subtotal = lineasConImporte.reduce((s, l) => s + l.importe, 0);
      const iva = subtotal * 0.16;
      const total = subtotal + iva;

      updateData.subtotal = subtotal;
      updateData.iva = iva;
      updateData.total = total;

      await this.prisma.purchaseOrder.update({ where: { id }, data: updateData });
      for (const l of lineasConImporte) {
        await this.prisma.purchaseOrderLine.create({
          data: {
            purchaseOrderId: id,
            skuId: l.skuId,
            cantidadRollos: l.cantidadRollos || null,
            metrajePorRollo: l.metrajePorRollo || 50,
            metrajeTotal: l.metrajeTotal,
            precioUnitario: l.precioUnitario,
            importe: l.importe,
            precioFuente: l.precioFuente || 'MANUAL',
            notas: l.notas,
          },
        });
      }
    } else {
      await this.prisma.purchaseOrder.update({ where: { id }, data: updateData });
    }

    return this.findOrderById(id);
  }

  // ===== CONFIRMAR OC =====
  async confirmOrder(id: string, userId: string) {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
    if (order.estado !== 'BORRADOR') {
      throw new BadRequestException('Solo se pueden confirmar OC en estado BORRADOR');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        estado: 'CONFIRMADA',
        confirmadoPor: userId,
        fechaConfirmacion: new Date(),
      },
      include: { supplier: true, lineas: { include: { sku: true } } },
    });
  }

  // ===== ENVIAR A RECEPCIÓN → Crea IncomingShipment =====
  async sendToReception(id: string, userId: string) {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { lineas: { include: { sku: true } }, supplier: true },
    });

    if (!['CONFIRMADA', 'EN_TRANSITO'].includes(order.estado)) {
      throw new BadRequestException('Solo OC confirmadas o en tránsito pueden enviarse a recepción');
    }

    // Crear IncomingShipment vinculado
    const shipmentCode = await this.generateCode('EMB', 'incomingShipment');
    const shipment = await this.prisma.incomingShipment.create({
      data: {
        codigo: shipmentCode,
        supplierId: order.supplierId,
        ordenCompra: order.codigo,
        estado: 'EN_TRANSITO',
        fechaEstimada: order.fechaEstimadaEntrega || new Date(Date.now() + 7 * 86400000),
        transportista: order.transportista,
        notas: `Generado desde OC ${order.codigo}`,
        creadoPor: userId,
        lineas: {
          create: order.lineas.map(l => ({
            skuId: l.skuId,
            cantidadRollos: l.cantidadRollos || Math.ceil(l.metrajeTotal / (l.metrajePorRollo || 50)),
            metrajePorRollo: l.metrajePorRollo || l.sku.metrajeEstandar,
            metrajeTotal: l.metrajeTotal,
          })),
        },
      },
    });

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        estado: 'EN_RECEPCION',
        enviadaARecepcion: true,
        fechaEnvioRecepcion: new Date(),
        transitShipmentId: shipment.id,
      },
      include: { supplier: true, lineas: { include: { sku: true } } },
    });
  }

  // ===== REGISTRAR RECEPCIÓN PARCIAL =====
  async registerPartialReceipt(id: string, data: {
    lineas: Array<{ skuId: string; metrajeRecibido: number; rollosRecibidos: number; ubicacionId?: string }>;
    notas?: string;
    recibidoPor: string;
  }) {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: { lineas: { include: { sku: true } }, supplier: true },
    });

    if (!['EN_RECEPCION', 'PARCIAL'].includes(order.estado)) {
      throw new BadRequestException('Solo OC en recepción pueden registrar recepciones parciales');
    }

    // Pre-cargar ubicaciones disponibles en zonas de rollos enteros
    const enterosZones = await this.prisma.zone.findMany({
      where: { tipo: 'ROLLOS_ENTEROS', activo: true },
      select: { id: true },
    });
    const enterosZoneIds = enterosZones.map(z => z.id);

    let availableLocations = await this.prisma.location.findMany({
      where: {
        zoneId: { in: enterosZoneIds },
        estado: { in: ['LIBRE', 'PARCIAL'] },
        activo: true,
      },
      orderBy: [{ estado: 'asc' }, { codigo: 'asc' }],
      include: { _count: { select: { handlingUnits: true } } },
    });

    // Fallback: zona RECIBO como staging
    if (availableLocations.length === 0) {
      const reciboZone = await this.prisma.zone.findFirst({ where: { tipo: 'RECIBO', activo: true } });
      if (reciboZone) {
        const reciboLocs = await this.prisma.location.findMany({
          where: { zoneId: reciboZone.id, estado: { in: ['LIBRE', 'PARCIAL'] }, activo: true },
          include: { _count: { select: { handlingUnits: true } } },
        });
        availableLocations = reciboLocs;
      }
    }

    return this.prisma.$transaction(async (tx: any) => {
      const totalRollos = data.lineas.reduce((s, l) => s + l.rollosRecibidos, 0);
      const totalMetraje = data.lineas.reduce((s, l) => s + l.metrajeRecibido, 0);

      // 1. Registrar PurchaseOrderReceipt (histórico OC)
      await tx.purchaseOrderReceipt.create({
        data: {
          purchaseOrderId: id,
          metrajeRecibido: totalMetraje,
          rollosRecibidos: totalRollos,
          notas: data.notas,
          recibidoPor: data.recibidoPor,
        },
      });

      // 2. Crear PurchaseReceipt (recepción física con HUs)
      const receiptCount = await tx.purchaseReceipt.count();
      const receiptCode = `REC-${new Date().getFullYear()}-${String(receiptCount + 1).padStart(5, '0')}`;

      const receipt = await tx.purchaseReceipt.create({
        data: {
          codigo: receiptCode,
          supplierId: order.supplierId,
          ordenCompra: order.codigo,
          transportista: order.transportista,
          recibidoPor: data.recibidoPor,
          totalRollos,
          totalPallets: 1,
          estado: 'COMPLETADA',
          notas: data.notas,
        },
      });

      let locationIndex = 0;
      const locationsToUpdate = new Map<string, number>();
      const createdHUs: string[] = [];

      // 3. Crear líneas de recepción + HUs individuales
      for (const lineaRecibida of data.lineas) {
        if (lineaRecibida.rollosRecibidos <= 0) continue;
        const lineaOC = order.lineas.find(l => l.skuId === lineaRecibida.skuId);
        if (!lineaOC) continue;

        const metrajePorRollo = lineaOC.metrajePorRollo || 50;

        // Actualizar línea de OC
        await tx.purchaseOrderLine.update({
          where: { id: lineaOC.id },
          data: {
            metrajeRecibido: { increment: lineaRecibida.metrajeRecibido },
            rollosRecibidos: { increment: lineaRecibida.rollosRecibidos },
          },
        });

        // Crear línea de recepción física
        const receiptLine = await tx.purchaseReceiptLine.create({
          data: {
            receiptId: receipt.id,
            skuId: lineaRecibida.skuId,
            cantidadRollos: lineaRecibida.rollosRecibidos,
            metrajePorRollo,
            metrajeTotalRecibido: lineaRecibida.metrajeRecibido,
          },
        });

        // Crear N HUs individuales
        for (let i = 0; i < lineaRecibida.rollosRecibidos; i++) {
          // Asignación de ubicación: manual (si viene) o automática
          let assignedLocationId = lineaRecibida.ubicacionId || null;

          if (!assignedLocationId) {
            // Ubicación inteligente automática
            while (locationIndex < availableLocations.length) {
              const candidate = availableLocations[locationIndex];
              const currentCount = locationsToUpdate.get(candidate.id) ?? candidate._count.handlingUnits;
              if (currentCount < (candidate.capacidad || 10)) {
                assignedLocationId = candidate.id;
                locationsToUpdate.set(candidate.id, currentCount + 1);
                break;
              }
              locationIndex++;
            }
          } else {
            // Manual: trackear el count
            const currentCount = locationsToUpdate.get(assignedLocationId) ?? 0;
            locationsToUpdate.set(assignedLocationId, currentCount + 1);
          }

          const huCount = await tx.handlingUnit.count();
          const huCode = `HU-${new Date().getFullYear()}-${String(huCount + 1).padStart(5, '0')}`;

          const hu = await tx.handlingUnit.create({
            data: {
              codigo: huCode,
              skuId: lineaRecibida.skuId,
              metrajeOriginal: metrajePorRollo,
              metrajeActual: metrajePorRollo,
              anchoMetros: lineaOC.sku?.anchoMetros || 1.5,
              tipoRollo: 'ENTERO',
              estadoHu: 'DISPONIBLE',
              ubicacionId: assignedLocationId,
              receiptLineId: receiptLine.id,
              generacion: 0,
              etiquetaImpresa: false,
            },
          });

          createdHUs.push(hu.id);

          // Registrar movimiento de ENTRADA
          const locCode = assignedLocationId
            ? (availableLocations.find(l => l.id === assignedLocationId) as any)?.codigo || 'ASIGNADA'
            : 'PENDIENTE';

          await tx.inventoryMovement.create({
            data: {
              huId: hu.id,
              tipo: 'ENTRADA',
              metrajeDespues: metrajePorRollo,
              ubicacionDestino: locCode,
              referencia: `${order.codigo} → ${receiptCode}`,
              notas: `Rollo ${i + 1}/${lineaRecibida.rollosRecibidos} — ${lineaOC.sku?.nombre || 'SKU'}`,
              userId: data.recibidoPor,
            },
          });
        }
      }

      // 4. Actualizar estado de ubicaciones afectadas
      for (const [locId, huCount] of locationsToUpdate.entries()) {
        const loc = availableLocations.find(l => l.id === locId);
        const capacity = loc?.capacidad || 10;
        const newEstado = huCount >= capacity ? 'OCUPADA' : huCount > 0 ? 'PARCIAL' : 'LIBRE';
        await tx.location.update({ where: { id: locId }, data: { estado: newEstado } });
      }

      // 5. Recalcular porcentaje OC
      const updatedLines = await tx.purchaseOrderLine.findMany({
        where: { purchaseOrderId: id },
      });
      const totalSolicitado = updatedLines.reduce((s: number, l: any) => s + l.metrajeTotal, 0);
      const totalRecibidoOC = updatedLines.reduce((s: number, l: any) => s + l.metrajeRecibido, 0);
      const porcentaje = totalSolicitado > 0 ? Math.round((totalRecibidoOC / totalSolicitado) * 100) : 0;
      const isComplete = porcentaje >= 100;

      await tx.purchaseOrder.update({
        where: { id },
        data: {
          porcentajeRecibido: Math.min(porcentaje, 100),
          estado: isComplete ? 'COMPLETADA' : 'PARCIAL',
          fechaRealEntrega: isComplete ? new Date() : undefined,
        },
      });

      return { order: await this.findOrderById(id), receiptCode, husCreados: createdHUs.length };
    }, { timeout: 60000 });
  }

  // ===== COMPLETAR OC (forzar) =====
  async completeOrder(id: string) {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
    if (!['EN_RECEPCION', 'PARCIAL'].includes(order.estado)) {
      throw new BadRequestException('Solo OC en recepción o parcial pueden completarse');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        estado: 'COMPLETADA',
        porcentajeRecibido: 100,
        fechaRealEntrega: new Date(),
      },
    });
  }

  // ===== CANCELAR OC =====
  async cancelOrder(id: string, motivo?: string) {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({ where: { id } });
    if (['COMPLETADA', 'CANCELADA'].includes(order.estado)) {
      throw new BadRequestException('OC completadas o canceladas no pueden cancelarse');
    }
    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        estado: 'CANCELADA',
        notasInternas: motivo
          ? `${order.notasInternas || ''}\n[CANCELACIÓN] ${motivo}`.trim()
          : order.notasInternas,
      },
    });
  }

  // ===== COLA DE RECEPCIÓN =====
  async getReceptionQueue() {
    return this.prisma.purchaseOrder.findMany({
      where: {
        estado: { in: ['EN_RECEPCION', 'PARCIAL'] },
        enviadaARecepcion: true,
      },
      orderBy: [
        { prioridad: 'asc' },            // Urgentes primero
        { fechaEstimadaEntrega: 'asc' },  // ETA más cercana primero
        { fechaEnvioRecepcion: 'asc' },   // Más antigua primero
      ],
      include: {
        supplier: { select: { id: true, nombre: true, codigo: true } },
        lineas: {
          include: {
            sku: { select: { id: true, codigo: true, nombre: true, color: true } },
          },
        },
        receipts: true,
      },
    });
  }

  // ===== HISTORIAL (COMPLETADAS + CANCELADAS) =====
  async getCompletedHistory(params: {
    search?: string;
    supplierId?: string;
    fechaDesde?: string;
    fechaHasta?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, supplierId, fechaDesde, fechaHasta, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {
      estado: { in: ['COMPLETADA', 'CANCELADA'] },
    };

    if (supplierId) where.supplierId = supplierId;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { supplier: { nombre: { contains: search, mode: 'insensitive' } } },
      ];
    }
    if (fechaDesde || fechaHasta) {
      where.fechaEmision = {};
      if (fechaDesde) where.fechaEmision.gte = new Date(fechaDesde);
      if (fechaHasta) where.fechaEmision.lte = new Date(fechaHasta);
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          supplier: { select: { id: true, nombre: true, codigo: true } },
          lineas: {
            include: {
              sku: { select: { id: true, codigo: true, nombre: true, color: true } },
            },
          },
          receipts: { orderBy: { fechaRecepcion: 'desc' }, take: 5 },
        },
      }),
      this.prisma.purchaseOrder.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ===== AUTO-FILL PRECIO INTELIGENTE =====
  async resolvePrice(supplierId: string, skuId: string) {
    // 1. Precio negociado vigente (SupplierPrice)
    const supplierPrice = await this.prisma.supplierPrice.findUnique({
      where: { supplierId_skuId: { supplierId, skuId } },
    });
    if (supplierPrice?.activo) {
      return {
        precio: Number(supplierPrice.precioUnitario),
        fuente: 'PRECIO_PROVEEDOR',
        vigenciaDesde: supplierPrice.vigenciaDesde,
        vigenciaHasta: supplierPrice.vigenciaHasta,
        notas: supplierPrice.notas,
      };
    }

    // 2. Último precio de OC anterior con este proveedor+SKU
    const lastOCLine = await this.prisma.purchaseOrderLine.findFirst({
      where: {
        purchaseOrder: { supplierId, estado: { not: 'CANCELADA' } },
        skuId,
      },
      orderBy: { createdAt: 'desc' },
      include: { purchaseOrder: { select: { codigo: true, fechaEmision: true } } },
    });
    if (lastOCLine) {
      return {
        precio: Number(lastOCLine.precioUnitario),
        fuente: 'ULTIMA_COMPRA',
        referencia: lastOCLine.purchaseOrder.codigo,
        fecha: lastOCLine.purchaseOrder.fechaEmision,
      };
    }

    // 3. Precio referencia del SKU
    const sku = await this.prisma.skuMaster.findUnique({ where: { id: skuId } });
    return {
      precio: sku?.precioReferencia ? Number(sku.precioReferencia) : 0,
      fuente: 'PRECIO_REFERENCIA',
    };
  }

  // ===== SUPPLIER PRICES (CRUD) =====
  async getSupplierPrices(supplierId?: string) {
    const where: any = { activo: true };
    if (supplierId) where.supplierId = supplierId;
    return this.prisma.supplierPrice.findMany({
      where,
      include: {
        supplier: { select: { id: true, nombre: true, codigo: true } },
        sku: { select: { id: true, codigo: true, nombre: true, color: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async upsertSupplierPrice(data: {
    supplierId: string;
    skuId: string;
    precioUnitario: number;
    notas?: string;
  }) {
    return this.prisma.supplierPrice.upsert({
      where: { supplierId_skuId: { supplierId: data.supplierId, skuId: data.skuId } },
      create: {
        supplierId: data.supplierId,
        skuId: data.skuId,
        precioUnitario: data.precioUnitario,
        notas: data.notas,
      },
      update: {
        precioUnitario: data.precioUnitario,
        notas: data.notas,
        vigenciaDesde: new Date(),
      },
      include: {
        supplier: { select: { id: true, nombre: true } },
        sku: { select: { id: true, codigo: true, nombre: true } },
      },
    });
  }

  // ===== STATS =====
  async getStats() {
    const [totalOC, borradores, confirmadas, enRecepcion, parciales, completadas, canceladas] = await Promise.all([
      this.prisma.purchaseOrder.count(),
      this.prisma.purchaseOrder.count({ where: { estado: 'BORRADOR' } }),
      this.prisma.purchaseOrder.count({ where: { estado: 'CONFIRMADA' } }),
      this.prisma.purchaseOrder.count({ where: { estado: 'EN_RECEPCION' } }),
      this.prisma.purchaseOrder.count({ where: { estado: 'PARCIAL' } }),
      this.prisma.purchaseOrder.count({ where: { estado: 'COMPLETADA' } }),
      this.prisma.purchaseOrder.count({ where: { estado: 'CANCELADA' } }),
    ]);

    // Monto total de OC activas
    const activeOrders = await this.prisma.purchaseOrder.findMany({
      where: { estado: { notIn: ['CANCELADA', 'COMPLETADA'] } },
      select: { total: true },
    });
    const montoActivo = activeOrders.reduce((s, o) => s + Number(o.total || 0), 0);

    // Cola de recepción
    const colaRecepcion = await this.prisma.purchaseOrder.count({
      where: { estado: { in: ['EN_RECEPCION', 'PARCIAL'] } },
    });

    return {
      totalOC,
      borradores,
      confirmadas,
      enRecepcion,
      parciales,
      completadas,
      canceladas,
      montoActivo: Math.round(montoActivo * 100) / 100,
      colaRecepcion,
    };
  }

  // ===== GENERAR PDF (datos para el frontend) =====
  async getOrderPDFData(id: string) {
    const order = await this.prisma.purchaseOrder.findUniqueOrThrow({
      where: { id },
      include: {
        supplier: true,
        lineas: {
          include: {
            sku: { select: { codigo: true, nombre: true, color: true, categoria: true } },
          },
        },
      },
    });

    // Obtener datos de la empresa
    const settings = await this.prisma.systemSetting.findMany({
      where: { clave: { in: ['empresa_nombre', 'empresa_rfc', 'empresa_direccion', 'empresa_telefono', 'empresa_email_cobranza'] } },
    });
    const empresa: Record<string, string> = {};
    for (const s of settings) empresa[s.clave] = s.valor;

    // Obtener nombre del usuario creador
    let creadoPorNombre = 'Sistema';
    if (order.creadoPor) {
      const user = await this.prisma.user.findUnique({ where: { id: order.creadoPor }, select: { nombre: true } });
      if (user) creadoPorNombre = user.nombre;
    }
    let confirmadoPorNombre: string | null = null;
    if (order.confirmadoPor) {
      const user = await this.prisma.user.findUnique({ where: { id: order.confirmadoPor }, select: { nombre: true } });
      if (user) confirmadoPorNombre = user.nombre;
    }

    return {
      order: {
        ...order,
        creadoPorNombre,
        confirmadoPorNombre,
      },
      empresa,
    };
  }
}
