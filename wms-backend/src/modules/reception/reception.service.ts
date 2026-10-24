import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class ReceptionService {
  constructor(private readonly prisma: PrismaService) {}

  // Generar código secuencial usando el tx context
  private async generateCode(
    prefix: string,
    model: 'purchaseReceipt' | 'handlingUnit',
    tx?: any,
  ): Promise<string> {
    const db = tx || this.prisma;
    const year = new Date().getFullYear();
    const count = await (db as any)[model].count();
    const seq = String(count + 1).padStart(5, '0');
    return `${prefix}-${year}-${seq}`;
  }

  async findAllReceipts(params: { search?: string; estado?: string; page?: number; limit?: number }) {
    const { search, estado, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { ordenCompra: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.purchaseReceipt.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          supplier: true,
          lineas: {
            include: {
              handlingUnits: {
                select: { id: true, codigo: true, metrajeActual: true, etiquetaImpresa: true, ubicacion: { select: { codigo: true } } },
              },
            },
          },
        },
      }),
      this.prisma.purchaseReceipt.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findReceiptById(id: string) {
    return this.prisma.purchaseReceipt.findUniqueOrThrow({
      where: { id },
      include: {
        supplier: true,
        lineas: { include: { handlingUnits: { include: { sku: true, ubicacion: true } } } },
      },
    });
  }

  /**
   * Registrar recepción de pallet con:
   * 1. Creación automática de HUs (uno por rollo)
   * 2. Asignación inteligente de ubicación según disponibilidad de zonas ROLLOS_ENTEROS
   * 3. Actualización dinámica del estado de ubicaciones (LIBRE → PARCIAL → OCUPADA)
   * 4. Registro de movimiento de inventario ENTRADA por cada HU
   */
  async registerReception(data: {
    supplierId: string;
    ordenCompra?: string;
    transportista?: string;
    placas?: string;
    notas?: string;
    recibidoPor: string;
    lineas: Array<{
      skuId: string;
      cantidadRollos: number;
      metrajePorRollo: number;
      palletRef?: string;
    }>;
  }) {
    // Validar que el proveedor existe
    await this.prisma.supplier.findUniqueOrThrow({ where: { id: data.supplierId } });

    // Validar que todos los SKUs existen y obtener info
    const skuMap: Record<string, any> = {};
    for (const linea of data.lineas) {
      const sku = await this.prisma.skuMaster.findUniqueOrThrow({ where: { id: linea.skuId } });
      skuMap[linea.skuId] = sku;
    }

    // Pre-cargar ubicaciones disponibles en zonas de rollos enteros (ordenadas por disponibilidad)
    const enterosZones = await this.prisma.zone.findMany({
      where: { tipo: 'ROLLOS_ENTEROS', activo: true },
      select: { id: true, codigo: true },
    });
    const enterosZoneIds = enterosZones.map((z) => z.id);

    const availableLocations = await this.prisma.location.findMany({
      where: {
        zoneId: { in: enterosZoneIds },
        estado: { in: ['LIBRE', 'PARCIAL'] },
        activo: true,
      },
      orderBy: [{ estado: 'asc' }, { codigo: 'asc' }], // LIBRE primero, luego PARCIAL
      include: { _count: { select: { handlingUnits: true } } },
    });

    // Si no hay zonas de enteros, usar zona de RECIBO como staging
    if (availableLocations.length === 0) {
      const reciboZone = await this.prisma.zone.findFirst({ where: { tipo: 'RECIBO', activo: true } });
      if (reciboZone) {
        const reciboLocs = await this.prisma.location.findMany({
          where: { zoneId: reciboZone.id, estado: { in: ['LIBRE', 'PARCIAL'] }, activo: true },
          include: { _count: { select: { handlingUnits: true } } },
        });
        availableLocations.push(...reciboLocs);
      }
    }

    let totalRollos = 0;
    const palletRefs = new Set<string>();
    for (const linea of data.lineas) {
      totalRollos += linea.cantidadRollos;
      if (linea.palletRef) palletRefs.add(linea.palletRef);
    }
    const totalPallets = palletRefs.size || 1;

    // Ejecutar todo en una transacción
    const receipt = await this.prisma.$transaction(async (tx: any) => {
      const receiptCode = await this.generateCode('REC', 'purchaseReceipt', tx);

      // 1. Crear la recepción
      const rec = await tx.purchaseReceipt.create({
        data: {
          codigo: receiptCode,
          supplierId: data.supplierId,
          ordenCompra: data.ordenCompra,
          transportista: data.transportista,
          placas: data.placas,
          notas: data.notas,
          recibidoPor: data.recibidoPor,
          totalRollos,
          totalPallets,
          estado: 'EN_PROCESO',
        },
      });

      let locationIndex = 0;
      const locationsToUpdate = new Map<string, number>(); // locationId -> HU count

      // 2. Crear líneas y HUs
      for (const linea of data.lineas) {
        const metrajeTotalRecibido = linea.cantidadRollos * linea.metrajePorRollo;
        const sku = skuMap[linea.skuId];

        const receiptLine = await tx.purchaseReceiptLine.create({
          data: {
            receiptId: rec.id,
            skuId: linea.skuId,
            cantidadRollos: linea.cantidadRollos,
            metrajePorRollo: linea.metrajePorRollo,
            metrajeTotalRecibido,
            palletRef: linea.palletRef,
          },
        });

        // 3. Crear N HUs individuales
        for (let i = 0; i < linea.cantidadRollos; i++) {
          // Ubicación inteligente: asignar a la siguiente ubicación con capacidad
          let assignedLocation: any = null;
          while (locationIndex < availableLocations.length) {
            const candidate = availableLocations[locationIndex];
            const currentCount = locationsToUpdate.get(candidate.id) || candidate._count.handlingUnits;
            if (currentCount < (candidate.capacidad || 2)) {
              assignedLocation = candidate;
              locationsToUpdate.set(candidate.id, currentCount + 1);
              break;
            }
            locationIndex++;
          }

          const huCode = await this.generateCode('HU', 'handlingUnit', tx);
          const hu = await tx.handlingUnit.create({
            data: {
              codigo: huCode,
              skuId: linea.skuId,
              metrajeOriginal: linea.metrajePorRollo,
              metrajeActual: linea.metrajePorRollo,
              anchoMetros: sku.anchoMetros || 1.5,
              pesoKg: (sku.pesoKgPorMetro || 0.25) * linea.metrajePorRollo,
              tipoRollo: 'ENTERO',
              estadoHu: 'DISPONIBLE',
              ubicacionId: assignedLocation?.id || null,
              receiptLineId: receiptLine.id,
              palletId: linea.palletRef || null,
              generacion: 0,
              etiquetaImpresa: false, // Pendiente de etiquetar
            },
          });

          // 4. Registrar movimiento de ENTRADA
          await tx.inventoryMovement.create({
            data: {
              huId: hu.id,
              tipo: 'ENTRADA',
              metrajeDespues: linea.metrajePorRollo,
              ubicacionDestino: assignedLocation?.codigo || 'PENDIENTE',
              referencia: receiptCode,
              notas: `Recepción rollo ${i + 1}/${linea.cantidadRollos} — ${sku.nombre}`,
              userId: data.recibidoPor,
            },
          });
        }
      }

      // 5. Actualizar estado de ubicaciones afectadas
      for (const [locId, huCount] of locationsToUpdate.entries()) {
        const loc = availableLocations.find((l) => l.id === locId);
        const capacity = loc?.capacidad || 2;
        const newEstado = huCount >= capacity ? 'OCUPADA' : huCount > 0 ? 'PARCIAL' : 'LIBRE';
        await tx.location.update({ where: { id: locId }, data: { estado: newEstado } });
      }

      // 6. Marcar receipt como completada
      await tx.purchaseReceipt.update({ where: { id: rec.id }, data: { estado: 'COMPLETADA' } });

      return rec;
    }, {
      timeout: 60000, // 60 segundos para recepciones grandes
    });

    // Return receipt completo con HUs y ubicaciones
    return this.findReceiptById(receipt.id);
  }

  async getReceptionStats() {
    const [totalReceipts, totalHUs, latestReceipt] = await Promise.all([
      this.prisma.purchaseReceipt.count(),
      this.prisma.handlingUnit.count({ where: { generacion: 0 } }),
      this.prisma.purchaseReceipt.findFirst({ orderBy: { createdAt: 'desc' }, include: { supplier: true } }),
    ]);
    return { totalReceipts, totalHUs, latestReceipt };
  }

  /**
   * Suggest up to 3 smart location alternatives for incoming HUs.
   * Scoring algorithm:
   *   +40pts — Location has same SKU already (consolidation)
   *   +30pts — LIBRE status (vs PARCIAL)
   *   +20pts — Higher remaining capacity ratio
   *   +10pts — Lower level preferred (ground = easier access)
   *   -10pts — Already used in this batch (distribute load)
   */
  async suggestLocations(params: {
    skuId: string;
    tipoRollo: 'ENTERO' | 'RETAZO';
    metraje: number;
    cantidadRollos: number;
  }) {
    const { skuId, tipoRollo, metraje, cantidadRollos } = params;

    // 1. Determine target zone type
    let targetZoneType: string;
    let mermaZonaCodigo: string | null = null;

    if (tipoRollo === 'RETAZO') {
      const mermaConfig = await this.prisma.mermaRangeConfig.findFirst({
        where: { activo: true, minMetros: { lte: metraje }, maxMetros: { gte: metraje } },
        orderBy: { orden: 'asc' },
      });
      mermaZonaCodigo = mermaConfig?.zonaCodigo || null;
      targetZoneType = 'MERMA';
    } else {
      targetZoneType = 'ROLLOS_ENTEROS';
    }

    // 2. Get target zones
    const zoneWhere: any = { activo: true };
    if (mermaZonaCodigo) {
      zoneWhere.codigo = mermaZonaCodigo;
    } else {
      zoneWhere.tipo = targetZoneType;
    }
    const targetZones = await this.prisma.zone.findMany({ where: zoneWhere, select: { id: true, codigo: true, nombre: true } });
    const targetZoneIds = targetZones.map(z => z.id);

    // 3. Get all available locations with real-time HU count
    const locations = await this.prisma.location.findMany({
      where: {
        zoneId: { in: targetZoneIds },
        estado: { in: ['LIBRE', 'PARCIAL'] },
        activo: true,
      },
      include: {
        zone: { select: { id: true, nombre: true, tipo: true, codigo: true } },
        handlingUnits: {
          where: { estadoHu: { not: 'AGOTADO' } },
          select: {
            id: true,
            skuId: true,
            tipoRollo: true,
            metrajeActual: true,
            sku: { select: { nombre: true, codigo: true, color: true } },
          },
        },
        _count: { select: { handlingUnits: true } },
      },
    });

    // 4. Score each location
    const scored = locations.map(loc => {
      let score = 0;
      const currentHUs = loc.handlingUnits.filter(hu => hu.metrajeActual > 0);
      const capacity = loc.capacidad || 2;
      const occupied = currentHUs.length;
      const remaining = capacity - occupied;
      const hasSameSku = currentHUs.some(hu => hu.skuId === skuId);

      // Can it fit at least 1 rollo?
      if (remaining <= 0) return null;

      // Scoring
      if (hasSameSku) score += 40; // Consolidation bonus
      if (loc.estado === 'LIBRE') score += 30; // Empty preferred
      score += Math.round((remaining / capacity) * 20); // Capacity ratio

      // Level preference — extract level from codigo like "RE01-P01-R01-N1"
      const levelMatch = loc.codigo.match(/N(\d+)/i);
      const level = levelMatch ? parseInt(levelMatch[1]) : 1;
      score += Math.max(0, 10 - (level - 1) * 3); // Lower levels = higher score

      // Can fit all rollos?
      const canFitAll = remaining >= cantidadRollos;
      if (canFitAll) score += 5;

      return {
        id: loc.id,
        codigo: loc.codigo,
        zona: loc.zone,
        estado: loc.estado,
        capacidad: capacity,
        ocupados: occupied,
        disponibles: remaining,
        canFitAll,
        hasSameSku,
        husActuales: currentHUs.map(hu => ({
          codigo: hu.sku?.codigo || '',
          nombre: hu.sku?.nombre || '',
          color: hu.sku?.color || '',
          metraje: hu.metrajeActual,
          tipo: hu.tipoRollo,
        })),
        score,
        motivo: [
          hasSameSku ? 'Mismo SKU presente (consolidación)' : null,
          loc.estado === 'LIBRE' ? 'Ubicación completamente libre' : 'Ubicación parcialmente ocupada',
          remaining >= cantidadRollos ? `Capacidad suficiente (${remaining} espacios libres)` : `Capacidad parcial (${remaining}/${capacity})`,
          level === 1 ? 'Nivel bajo (fácil acceso)' : `Nivel ${level}`,
        ].filter(Boolean),
      };
    }).filter(Boolean);

    // 5. Sort by score descending and take top 3
    scored.sort((a: any, b: any) => b.score - a.score);
    const top3 = scored.slice(0, 3) as any[];

    // 6. Also get fallback to RECIBO zona if no space
    let fallback = null;
    if (top3.length === 0) {
      const reciboZone = await this.prisma.zone.findFirst({ where: { tipo: 'RECIBO', activo: true } });
      if (reciboZone) {
        const reciboLoc = await this.prisma.location.findFirst({
          where: { zoneId: reciboZone.id, estado: { in: ['LIBRE', 'PARCIAL'] }, activo: true },
          include: { zone: { select: { nombre: true, tipo: true, codigo: true } }, _count: { select: { handlingUnits: true } } },
        });
        if (reciboLoc) {
          fallback = {
            id: reciboLoc.id,
            codigo: reciboLoc.codigo,
            zona: reciboLoc.zone,
            estado: reciboLoc.estado,
            capacidad: reciboLoc.capacidad || 50,
            ocupados: reciboLoc._count.handlingUnits,
            disponibles: (reciboLoc.capacidad || 50) - reciboLoc._count.handlingUnits,
            score: 0,
            motivo: ['Zona de Recibo (staging temporal — no hay espacio en zonas principales)'],
          };
        }
      }
    }

    // 7. Zone summary for context
    const zoneSummary = await Promise.all(targetZones.map(async z => {
      const [total, libre, parcial, ocupada] = await Promise.all([
        this.prisma.location.count({ where: { zoneId: z.id, activo: true } }),
        this.prisma.location.count({ where: { zoneId: z.id, estado: 'LIBRE', activo: true } }),
        this.prisma.location.count({ where: { zoneId: z.id, estado: 'PARCIAL', activo: true } }),
        this.prisma.location.count({ where: { zoneId: z.id, estado: 'OCUPADA', activo: true } }),
      ]);
      return { zona: z.nombre, codigo: z.codigo, total, libre, parcial, ocupada, ocupacionPct: total > 0 ? Math.round(((parcial + ocupada) / total) * 100) : 0 };
    }));

    return {
      sugerencias: top3.length > 0 ? top3 : (fallback ? [fallback] : []),
      seleccionada: top3.length > 0 ? top3[0] : fallback,
      zoneSummary,
      tipoZona: targetZoneType,
    };
  }

  // ===== TRASPASOS & REQUISICIONES DE TELARES EN CAMINO =====
  async getIncomingTransfers() {
    const telaresSupplier = await this.prisma.supplier.findFirst({
      where: {
        OR: [
          { codigo: 'PROV-TNT' },
          { nombre: { contains: 'Telares', mode: 'insensitive' } },
        ],
      },
    });

    const whereReq: any = {
      estado: { in: ['CONFIRMADA', 'EN_TRANSITO', 'EN_RECEPCION', 'PARCIAL'] },
    };

    if (telaresSupplier) {
      whereReq.OR = [
        { supplierId: telaresSupplier.id },
        { notasInternas: { contains: 'REQUISICION_TELARES' } },
      ];
    } else {
      whereReq.notasInternas = { contains: 'REQUISICION_TELARES' };
    }

    const [requisiciones, transferencias] = await Promise.all([
      this.prisma.purchaseOrder.findMany({
        where: whereReq,
        orderBy: [{ prioridad: 'asc' }, { createdAt: 'desc' }],
        include: {
          supplier: { select: { id: true, nombre: true, codigo: true } },
          lineas: {
            include: {
              sku: {
                select: {
                  id: true,
                  codigo: true,
                  nombre: true,
                  color: true,
                  anchoMetros: true,
                  metrajeEstandar: true,
                },
              },
            },
          },
        },
      }),
      this.prisma.transfer.findMany({
        where: {
          estado: { in: ['PENDIENTE', 'EN_TRANSITO'] },
        },
        orderBy: { createdAt: 'desc' },
        include: {
          warehouseOrigen: { select: { id: true, nombre: true, codigo: true } },
          warehouseDestino: { select: { id: true, nombre: true, codigo: true } },
          lineas: {
            include: {
              hu: {
                include: {
                  sku: { select: { id: true, codigo: true, nombre: true, color: true } },
                },
              },
            },
          },
        },
      }) as unknown as Promise<any[]>,
    ]);

    const formattedReqs = requisiciones.map(order => {
      let meta: any = {};
      try {
        if (order.notasInternas && order.notasInternas.startsWith('{')) {
          meta = JSON.parse(order.notasInternas);
        }
      } catch {}

      const totalRollos = order.lineas.reduce((s, l) => s + (l.cantidadRollos || Math.round((Number(l.metrajeTotal) || 0) / 50)), 0);
      const totalMetros = order.lineas.reduce((s, l) => s + (Number(l.metrajeTotal) || 0), 0);
      const rollosRecibidos = order.lineas.reduce((s, l) => s + (l.rollosRecibidos || 0), 0);
      const metrosRecibidos = order.lineas.reduce((s, l) => s + (Number(l.metrajeRecibido) || 0), 0);

      return {
        id: order.id,
        codigo: order.codigo,
        tipo: 'REQUISICION_TELARES',
        origen: 'Bodega Río Tototlán (Telares y Tejidos)',
        destino: 'Nave Formatex Zapopan (Río La Barca)',
        estado: order.estado,
        prioridad: order.prioridad,
        solicitante: meta.solicitante || 'Israel (Jefe de Almacén)',
        ruta: meta.ruta || 'Camioneta Tototlán ➔ Zapopan',
        horaEstimada: meta.horaEstimada || 'Vuelta de la tarde',
        fechaEmision: order.fechaEmision,
        totalRollos,
        totalMetros,
        rollosRecibidos,
        metrosRecibidos,
        porcentajeRecibido: order.porcentajeRecibido || 0,
        notas: order.notas,
        supplier: order.supplier,
        lineas: order.lineas.map(l => ({
          id: l.id,
          skuId: l.skuId,
          sku: l.sku,
          cantidadRollos: l.cantidadRollos || Math.round((Number(l.metrajeTotal) || 0) / 50),
          metrajePorRollo: Number(l.metrajePorRollo) || 50,
          metrajeTotal: Number(l.metrajeTotal) || 0,
          rollosRecibidos: l.rollosRecibidos || 0,
          metrajeRecibido: Number(l.metrajeRecibido) || 0,
          pendienteRollos: Math.max(0, (l.cantidadRollos || Math.round((Number(l.metrajeTotal) || 0) / 50)) - (l.rollosRecibidos || 0)),
          pendienteMetros: Math.max(0, (Number(l.metrajeTotal) || 0) - (Number(l.metrajeRecibido) || 0)),
        })),
      };
    });

    const formattedTransfers = (transferencias as any[]).map((tr: any) => {
      const totalRollos = tr.lineas?.length || 0;
      const totalMetros = (tr.lineas || []).reduce((s: number, l: any) => s + (l.hu?.metrajeActual || 0), 0);
      return {
        id: tr.id,
        codigo: tr.codigo,
        tipo: 'TRANSFERENCIA_INTERNA',
        origen: tr.warehouseOrigen?.nombre || 'Bodega Origen',
        destino: tr.warehouseDestino?.nombre || 'Nave Formatex',
        estado: tr.estado,
        prioridad: 3,
        solicitante: 'Logística Inter-Bodegas',
        ruta: `${tr.warehouseOrigen?.nombre || 'TNT'} ➔ ${tr.warehouseDestino?.nombre || 'Formatex'}`,
        horaEstimada: 'En tránsito',
        fechaEmision: tr.createdAt,
        totalRollos,
        totalMetros,
        rollosRecibidos: tr.estado === 'COMPLETADA' ? totalRollos : 0,
        metrosRecibidos: tr.estado === 'COMPLETADA' ? totalMetros : 0,
        porcentajeRecibido: tr.estado === 'COMPLETADA' ? 100 : 0,
        notas: tr.motivo,
        lineas: (tr.lineas || []).map((l: any) => ({
          id: l.id,
          skuId: l.hu?.skuId,
          sku: l.hu?.sku,
          huCodigo: l.hu?.codigo,
          cantidadRollos: 1,
          metrajePorRollo: l.hu?.metrajeActual || 50,
          metrajeTotal: l.hu?.metrajeActual || 50,
          rollosRecibidos: tr.estado === 'COMPLETADA' ? 1 : 0,
          metrajeRecibido: tr.estado === 'COMPLETADA' ? (l.hu?.metrajeActual || 50) : 0,
          pendienteRollos: tr.estado === 'COMPLETADA' ? 0 : 1,
          pendienteMetros: tr.estado === 'COMPLETADA' ? 0 : (l.hu?.metrajeActual || 50),
        })),
      };
    });

    return [...formattedReqs, ...formattedTransfers];
  }

  // ===== PROCESAR CHECKLIST DE DESCARGA, GENERAR HUs Y LIBERAR TRANSPORTISTA =====
  async processIntake(data: {
    sourceType: 'REQUISICION_TELARES' | 'OC_PROVEEDOR' | 'TRANSFERENCIA_INTERNA' | 'MANUAL';
    sourceId?: string;
    supplierId?: string;
    ordenCompra?: string;
    transportista?: string;
    choferNombre?: string;
    placas?: string;
    horaLlegada?: string;
    horaLiberacion?: string;
    firmaAcuse?: string;
    notasDescarga?: string;
    totalPallets?: number;
    recibidoPor: string;
    lineas: Array<{
      skuId: string;
      cantidadRollos: number;
      metrajePorRollo: number;
      palletRef?: string;
      loteProveedor?: string;
      gradoCalidad?: string;
      conforme?: boolean;
      ubicacionId?: string;
    }>;
  }) {
    if (!data.lineas || data.lineas.length === 0) {
      throw new BadRequestException('Debes incluir al menos una línea de recepción');
    }

    // 1. Determinar proveedor
    let effectiveSupplierId = data.supplierId;
    if (!effectiveSupplierId) {
      const telaresSupplier = await this.prisma.supplier.findFirst({
        where: {
          OR: [
            { codigo: 'PROV-TNT' },
            { nombre: { contains: 'Telares', mode: 'insensitive' } },
          ],
        },
      });
      if (telaresSupplier) {
        effectiveSupplierId = telaresSupplier.id;
      } else {
        const anySupplier = await this.prisma.supplier.findFirst();
        if (!anySupplier) throw new BadRequestException('No existe proveedor configurado en el sistema');
        effectiveSupplierId = anySupplier.id;
      }
    }

    // 2. Pre-cargar SKUs
    const skuMap: Record<string, any> = {};
    for (const linea of data.lineas) {
      if (!skuMap[linea.skuId]) {
        const sku = await this.prisma.skuMaster.findUniqueOrThrow({ where: { id: linea.skuId } });
        skuMap[linea.skuId] = sku;
      }
    }

    // 3. Ubicación temporal de Staging / Recibo
    const reciboZone = await this.prisma.zone.findFirst({ where: { tipo: 'RECIBO', activo: true } });
    let defaultStagingLoc: any = null;
    if (reciboZone) {
      defaultStagingLoc = await this.prisma.location.findFirst({
        where: { zoneId: reciboZone.id, activo: true },
        orderBy: { codigo: 'asc' },
      });
    }

    let totalRollos = 0;
    let totalMetros = 0;
    const palletRefs = new Set<string>();
    for (const linea of data.lineas) {
      totalRollos += linea.cantidadRollos;
      totalMetros += linea.cantidadRollos * linea.metrajePorRollo;
      if (linea.palletRef) palletRefs.add(linea.palletRef);
    }
    const finalTotalPallets = data.totalPallets || (palletRefs.size || 1);

    // 4. Folio de liberación del transportista
    const paseSalidaFolio = `LIB-${new Date().getFullYear()}-${Date.now().toString().slice(-5)}`;
    const horaLlegada = data.horaLlegada || new Date(Date.now() - 30 * 60000).toISOString();
    const horaLiberacion = data.horaLiberacion || new Date().toISOString();
    const isConforme = data.lineas.every(l => l.conforme !== false);

    const releaseVoucher = {
      folioLiberacion: paseSalidaFolio,
      sourceType: data.sourceType,
      sourceId: data.sourceId || null,
      ordenCompra: data.ordenCompra || null,
      transportista: data.transportista || 'Camioneta Formatex / Chofer Telares',
      choferNombre: data.choferNombre || 'Israel (Logística Almacén)',
      placas: data.placas || 'JW-9281-A',
      horaLlegada,
      horaLiberacion,
      firmaAcuse: data.firmaAcuse || 'Conforme al Manifiesto de Descarga',
      estadoDescarga: isConforme ? 'CONFORME_100' : 'CON_INCIDENCIAS',
      totalPallets: finalTotalPallets,
      totalRollos,
      totalMetros,
      notas: data.notasDescarga || '',
    };

    // 5. Transacción de recepción
    const result = await this.prisma.$transaction(async (tx: any) => {
      const receiptCode = await this.generateCode('REC', 'purchaseReceipt', tx);

      const rec = await tx.purchaseReceipt.create({
        data: {
          codigo: receiptCode,
          supplierId: effectiveSupplierId,
          ordenCompra: data.ordenCompra || data.sourceId || null,
          transportista: data.transportista || releaseVoucher.transportista,
          placas: data.placas || releaseVoucher.placas,
          notas: JSON.stringify(releaseVoucher),
          recibidoPor: data.recibidoPor,
          totalRollos,
          totalPallets: finalTotalPallets,
          estado: 'COMPLETADA',
        },
      });

      const createdHUs: any[] = [];
      const locationsToUpdate = new Set<string>();

      for (const linea of data.lineas) {
        const sku = skuMap[linea.skuId];
        const metrajeTotalLinea = linea.cantidadRollos * linea.metrajePorRollo;

        const receiptLine = await tx.purchaseReceiptLine.create({
          data: {
            receiptId: rec.id,
            skuId: linea.skuId,
            cantidadRollos: linea.cantidadRollos,
            metrajePorRollo: linea.metrajePorRollo,
            metrajeTotalRecibido: metrajeTotalLinea,
            palletRef: linea.palletRef || null,
          },
        });

        // Crear HUs individuales para cada rollo
        for (let i = 0; i < linea.cantidadRollos; i++) {
          const huCode = await this.generateCode('HU', 'handlingUnit', tx);
          const targetLocationId = linea.ubicacionId || defaultStagingLoc?.id || null;
          if (targetLocationId) locationsToUpdate.add(targetLocationId);

          const hu = await tx.handlingUnit.create({
            data: {
              codigo: huCode,
              skuId: linea.skuId,
              metrajeOriginal: linea.metrajePorRollo,
              metrajeActual: linea.metrajePorRollo,
              anchoMetros: sku.anchoMetros || 1.5,
              pesoKg: (sku.pesoKgPorMetro || 0.25) * linea.metrajePorRollo,
              tipoRollo: 'ENTERO',
              estadoHu: 'DISPONIBLE',
              gradoCalidad: linea.gradoCalidad || 'PRIMERA',
              ubicacionId: targetLocationId,
              receiptLineId: receiptLine.id,
              palletId: linea.palletRef || (finalTotalPallets > 1 ? `PALLET-${String(i % finalTotalPallets + 1).padStart(2, '0')}` : 'PALLET-01'),
              loteProveedor: linea.loteProveedor || 'LOTE-TNT',
              generacion: 0,
              etiquetaImpresa: false, // Listo para la mesa de reetiquetado
            },
          });

          createdHUs.push(hu);

          // Movimiento de entrada
          await tx.inventoryMovement.create({
            data: {
              huId: hu.id,
              tipo: 'ENTRADA',
              metrajeDespues: linea.metrajePorRollo,
              ubicacionDestino: defaultStagingLoc?.codigo || 'REC-STAGING-01',
              referencia: `${receiptCode} / ${paseSalidaFolio}`,
              notas: `Recepción rollo ${i + 1}/${linea.cantidadRollos} — ${sku.nombre} (Calidad: ${linea.gradoCalidad || 'PRIMERA'})`,
              userId: data.recibidoPor,
            },
          });
        }
      }

      // Si viene de PurchaseOrder (Requisición Telares u OC), actualizar avance
      if (data.sourceId && (data.sourceType === 'REQUISICION_TELARES' || data.sourceType === 'OC_PROVEEDOR')) {
        const order = await tx.purchaseOrder.findUnique({
          where: { id: data.sourceId },
          include: { lineas: true },
        });

        if (order) {
          for (const linea of data.lineas) {
            const matchedLine = order.lineas.find((l: any) => l.skuId === linea.skuId);
            if (matchedLine) {
              const newRollos = (matchedLine.rollosRecibidos || 0) + linea.cantidadRollos;
              const newMetros = (Number(matchedLine.metrajeRecibido) || 0) + (linea.cantidadRollos * linea.metrajePorRollo);
              await tx.purchaseOrderLine.update({
                where: { id: matchedLine.id },
                data: {
                  rollosRecibidos: newRollos,
                  metrajeRecibido: newMetros,
                },
              });
            }
          }

          const updatedLines = await tx.purchaseOrderLine.findMany({ where: { purchaseOrderId: order.id } });
          const totalReqMetros = updatedLines.reduce((s: number, l: any) => s + (Number(l.metrajeTotal) || 0), 0);
          const totalRecMetros = updatedLines.reduce((s: number, l: any) => s + (Number(l.metrajeRecibido) || 0), 0);
          const pct = totalReqMetros > 0 ? Math.round((totalRecMetros / totalReqMetros) * 100) : 100;
          const isComplete = pct >= 100;

          await tx.purchaseOrder.update({
            where: { id: order.id },
            data: {
              porcentajeRecibido: Math.min(pct, 100),
              estado: isComplete ? 'COMPLETADA' : 'PARCIAL',
              fechaRealEntrega: new Date(),
            },
          });
        }
      }

      // Si viene de Transferencia interna, marcar completada
      if (data.sourceId && data.sourceType === 'TRANSFERENCIA_INTERNA') {
        await tx.transfer.update({
          where: { id: data.sourceId },
          data: { estado: 'COMPLETADA' },
        });
      }

      // Actualizar ocupación de ubicaciones afectadas
      for (const locId of locationsToUpdate) {
        const loc = await tx.location.findUnique({
          where: { id: locId },
          include: { _count: { select: { handlingUnits: true } } },
        });
        if (loc) {
          const count = loc._count.handlingUnits;
          const capacity = loc.capacidad || 2;
          const newEstado = count >= capacity ? 'OCUPADA' : count > 0 ? 'PARCIAL' : 'LIBRE';
          await tx.location.update({ where: { id: locId }, data: { estado: newEstado } });
        }
      }

      return { rec, husCount: createdHUs.length, releaseVoucher };
    }, { timeout: 60000 });

    const fullReceipt = await this.findReceiptById(result.rec.id);
    return {
      receipt: fullReceipt,
      husCount: result.husCount,
      releaseVoucher: result.releaseVoucher,
    };
  }

  // ===== MARCAR HUs COMO REETIQUETADOS (MARBETE FORMATEX 360°) =====
  async markHUsLabeled(receiptId: string, huIds?: string[]) {
    const where: any = {
      receiptLine: { receiptId },
    };
    if (huIds && huIds.length > 0) {
      where.id = { in: huIds };
    }

    await this.prisma.handlingUnit.updateMany({
      where,
      data: {
        etiquetaImpresa: true,
        fechaEtiquetado: new Date(),
      },
    });

    return this.findReceiptById(receiptId);
  }

  // ===== ASIGNAR UBICACIÓN FINAL EN RACKS (PUTAWAY) =====
  async executePutaway(assignments: Array<{ huId: string; ubicacionId: string }>, userId: string) {
    if (!assignments || assignments.length === 0) {
      throw new BadRequestException('Debes proporcionar al menos una asignación de ubicación');
    }

    const updatedHUs: any[] = [];
    await this.prisma.$transaction(async (tx: any) => {
      const locationsAffected = new Set<string>();

      for (const item of assignments) {
        const hu = await tx.handlingUnit.findUniqueOrThrow({
          where: { id: item.huId },
          include: { ubicacion: true, sku: true },
        });

        const targetLocation = await tx.location.findUniqueOrThrow({
          where: { id: item.ubicacionId },
        });

        if (hu.ubicacionId) locationsAffected.add(hu.ubicacionId);
        locationsAffected.add(targetLocation.id);

        const updated = await tx.handlingUnit.update({
          where: { id: item.huId },
          data: { ubicacionId: targetLocation.id },
        });

        await tx.inventoryMovement.create({
          data: {
            huId: item.huId,
            tipo: 'REUBICACION',
            metrajeAntes: hu.metrajeActual,
            metrajeDespues: hu.metrajeActual,
            ubicacionOrigen: hu.ubicacion?.codigo || 'REC-STAGING-01',
            ubicacionDestino: targetLocation.codigo,
            referencia: `PUTAWAY-${targetLocation.codigo}`,
            notas: `Putaway rollo ${hu.codigo} (${hu.sku?.nombre || 'SKU'}) a rack ${targetLocation.codigo}`,
            userId,
          },
        });

        updatedHUs.push(updated);
      }

      // Actualizar ocupación de ubicaciones
      for (const locId of locationsAffected) {
        const loc = await tx.location.findUnique({
          where: { id: locId },
          include: { _count: { select: { handlingUnits: true } } },
        });
        if (loc) {
          const count = loc._count.handlingUnits;
          const capacity = loc.capacidad || 2;
          const newEstado = count >= capacity ? 'OCUPADA' : count > 0 ? 'PARCIAL' : 'LIBRE';
          await tx.location.update({ where: { id: locId }, data: { estado: newEstado } });
        }
      }
    });

    return { success: true, count: updatedHUs.length };
  }
}

