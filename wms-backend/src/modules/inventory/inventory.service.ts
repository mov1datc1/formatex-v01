import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class InventoryService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== HANDLING UNITS =====
  async findAllHUs(params: { search?: string; tipoRollo?: string; estadoHu?: string; skuId?: string; page?: number; limit?: number }) {
    const { search, tipoRollo, estadoHu, skuId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (tipoRollo) where.tipoRollo = tipoRollo;
    if (estadoHu) where.estadoHu = estadoHu;
    if (skuId) where.skuId = skuId;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
        { loteProveedor: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.handlingUnit.findMany({
        where, skip, take: limit, orderBy: { fechaIngreso: 'asc' }, // FIFO
        include: { sku: { select: { id: true, codigo: true, nombre: true, color: true, categoria: true } }, ubicacion: { select: { id: true, codigo: true } }, parentHu: { select: { id: true, codigo: true } } },
      }),
      this.prisma.handlingUnit.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findHUById(id: string) {
    return this.prisma.handlingUnit.findUniqueOrThrow({
      where: { id },
      include: {
        sku: true, ubicacion: { include: { zone: true } },
        parentHu: { select: { id: true, codigo: true, metrajeOriginal: true } },
        childHus: { select: { id: true, codigo: true, metrajeActual: true, tipoRollo: true, estadoHu: true } },
        cortesOrigen: { orderBy: { fechaCorte: 'desc' } },
        movimientos: { orderBy: { createdAt: 'desc' }, take: 20, include: { user: { select: { nombre: true } } } },
        orderAssignments: { include: { orderLine: { include: { order: { select: { codigo: true } } } } } },
      },
    });
  }

  // Reubicar HU
  async relocateHU(huId: string, ubicacionId: string, userId: string) {
    const hu = await this.prisma.handlingUnit.findUniqueOrThrow({ where: { id: huId }, include: { ubicacion: true } });
    const newLocation = await this.prisma.location.findUniqueOrThrow({ where: { id: ubicacionId } });

    return this.prisma.$transaction(async (tx: any) => {
      // Actualizar HU
      await tx.handlingUnit.update({ where: { id: huId }, data: { ubicacionId } });

      // Registrar movimiento
      await tx.inventoryMovement.create({
        data: {
          huId, tipo: 'REUBICACION',
          metrajeAntes: hu.metrajeActual, metrajeDespues: hu.metrajeActual,
          ubicacionOrigen: hu.ubicacion?.codigo || null,
          ubicacionDestino: newLocation.codigo,
          userId,
        },
      });

      // Actualizar estado de ubicaciones
      if (hu.ubicacionId) {
        const remainingInOld = await tx.handlingUnit.count({ where: { ubicacionId: hu.ubicacionId, id: { not: huId } } });
        await tx.location.update({ where: { id: hu.ubicacionId }, data: { estado: remainingInOld === 0 ? 'LIBRE' : 'PARCIAL' } });
      }
      const countInNew = await tx.handlingUnit.count({ where: { ubicacionId } });
      const capacity = newLocation.capacidad || 1;
      await tx.location.update({ where: { id: ubicacionId }, data: { estado: countInNew >= capacity ? 'OCUPADA' : 'PARCIAL' } });

      return tx.handlingUnit.findUnique({ where: { id: huId }, include: { sku: true, ubicacion: true } });
    });
  }

  // Dashboard stats
  async getInventoryStats() {
    const [totalHUs, totalEnteros, totalRetazos, totalDisponibles, totalReservados] = await Promise.all([
      this.prisma.handlingUnit.count({ where: { estadoHu: { not: 'AGOTADO' } } }),
      this.prisma.handlingUnit.count({ where: { tipoRollo: 'ENTERO', estadoHu: 'DISPONIBLE' } }),
      this.prisma.handlingUnit.count({ where: { tipoRollo: 'RETAZO', estadoHu: 'DISPONIBLE' } }),
      this.prisma.handlingUnit.count({ where: { estadoHu: 'DISPONIBLE' } }),
      this.prisma.handlingUnit.count({ where: { estadoHu: 'RESERVADO' } }),
    ]);

    // Metraje total
    const metrajeResult = await this.prisma.handlingUnit.aggregate({
      _sum: { metrajeActual: true },
      where: { estadoHu: { in: ['DISPONIBLE', 'RESERVADO'] } },
    });

    return {
      totalHUs, totalEnteros, totalRetazos, totalDisponibles, totalReservados,
      metrajeTotal: metrajeResult._sum.metrajeActual || 0,
    };
  }

  // ===== LOCATIONS =====
  async findAllLocations(params: { zoneId?: string; estado?: string; page?: number; limit?: number }) {
    const { zoneId, estado, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (zoneId) where.zoneId = zoneId;
    if (estado) where.estado = estado;
    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where, skip, take: limit, orderBy: { codigo: 'asc' },
        include: { zone: { select: { nombre: true, tipo: true } }, handlingUnits: { where: { estadoHu: { not: 'AGOTADO' } }, select: { id: true, codigo: true, metrajeActual: true }, take: 5 }, _count: { select: { handlingUnits: true } } },
      }),
      this.prisma.location.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ===== ZONES =====
  async findAllZones() {
    return this.prisma.zone.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
      include: { _count: { select: { locations: true } } },
    });
  }

  // ===== MOVEMENTS =====
  async findAllMovements(params: { huId?: string; tipo?: string; page?: number; limit?: number }) {
    const { huId, tipo, page = 1, limit = 30 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (huId) where.huId = huId;
    if (tipo) where.tipo = tipo;
    const [data, total] = await Promise.all([
      this.prisma.inventoryMovement.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: { hu: { select: { codigo: true, sku: { select: { nombre: true } } } }, user: { select: { nombre: true } } },
      }),
      this.prisma.inventoryMovement.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // ===== INTELLIGENT HU SUGGESTION (Physical + Transit) =====
  /**
   * Suggests the best HUs for a given SKU + desired metraje.
   * Algorithm:
   *  1. Fetch all DISPONIBLE (not reserved) HUs for the SKU (excluding virtual warehouses)
   *  2. Fetch available transit inventory for the same SKU
   *  3. Split into "exact fits" (metraje >= requested) and "too small"
   *  4. Among fits, rank by LEAST WASTE (metraje - requested), ascending
   *  5. Remnants (RETAZO) get a bonus — pushed to the top when waste is similar
   *  6. Transit options ranked after all physical stock
   *  7. Returns top N suggestions with waste%, type label, recommendation tag, and source
   */
  async suggestHUs(skuId: string, metraje: number, limit: number = 10) {
    if (!skuId || !metraje || metraje <= 0) return { suggestions: [], totalAvailable: 0, transitAvailable: 0 };

    // === 1. PHYSICAL STOCK (exclude HUs in virtual warehouses) ===
    const allHUs = await this.prisma.handlingUnit.findMany({
      where: {
        skuId,
        estadoHu: 'DISPONIBLE',
        metrajeActual: { gt: 0 },
        // Exclude HUs in virtual warehouses (reserved for clients)
        OR: [
          { ubicacion: { warehouse: { tipo: 'FISICO' } } },
          { ubicacionId: null }, // HUs without location (just received)
        ],
      },
      orderBy: { metrajeActual: 'asc' },
      select: {
        id: true,
        codigo: true,
        metrajeOriginal: true,
        metrajeActual: true,
        tipoRollo: true,
        estadoHu: true,
        fechaIngreso: true,
        ubicacion: { select: { id: true, codigo: true } },
        sku: { select: { id: true, codigo: true, nombre: true, color: true } },
      },
    });

    // === 2. TRANSIT INVENTORY ===
    const transitLines = await this.prisma.incomingShipmentLine.findMany({
      where: {
        skuId,
        shipment: { estado: 'EN_TRANSITO' },
      },
      include: {
        shipment: {
          select: {
            id: true, codigo: true, fechaEstimada: true,
            transportista: true, supplier: { select: { nombre: true } },
          },
        },
        sku: { select: { id: true, codigo: true, nombre: true, color: true } },
      },
    });

    // === BUILD SUGGESTIONS ===
    const fits: any[] = [];
    const partials: any[] = [];

    // Process physical stock
    for (const hu of allHUs) {
      const waste = hu.metrajeActual - metraje;
      const wastePercent = hu.metrajeActual > 0 ? (waste / hu.metrajeActual) * 100 : 0;
      const isRemnant = hu.tipoRollo === 'RETAZO';

      const suggestion = {
        ...hu,
        source: 'FISICO' as string,
        waste: Math.abs(waste),
        wastePercent: Math.round(wastePercent * 10) / 10,
        fits: waste >= 0,
        isExact: waste === 0,
        tag: '' as string,
        score: 0,
        // Transit fields (null for physical)
        eta: null as Date | null,
        diasParaLlegar: null as number | null,
        embarqueCodigo: null as string | null,
        transportista: null as string | null,
        proveedor: null as string | null,
        shipmentLineId: null as string | null,
      };

      if (waste >= 0) {
        suggestion.score = waste + (isRemnant ? -1000 : 0);
        
        if (waste === 0) {
          suggestion.tag = '🎯 Coincidencia exacta';
        } else if (isRemnant && waste <= 3) {
          suggestion.tag = '✨ Retazo ideal — merma mínima';
        } else if (isRemnant && waste <= 10) {
          suggestion.tag = '👍 Buen retazo';
        } else if (isRemnant) {
          suggestion.tag = '📦 Retazo disponible';
        } else if (waste <= 5) {
          suggestion.tag = '🎯 Rollo entero (bajo desperdicio)';
        } else {
          suggestion.tag = '📦 Rollo entero';
        }
        fits.push(suggestion);
      } else {
        suggestion.tag = `⚠️ Insuficiente (faltan ${Math.abs(waste).toFixed(1)}m)`;
        suggestion.score = 10000 + Math.abs(waste);
        partials.push(suggestion);
      }
    }

    // Process transit lines
    const transitSuggestions: any[] = [];
    for (const line of transitLines) {
      const disponible = line.metrajeTotal - line.metrajeReservado;
      if (disponible <= 0) continue;

      const eta = new Date(line.shipment.fechaEstimada);
      const diasParaLlegar = Math.max(0, Math.ceil((eta.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
      const fitsMetraje = disponible >= metraje;
      const waste = disponible - metraje;

      // Each transit line can supply multiple rolls (cantidadRollos × metrajePorRollo)
      const suggestion = {
        id: line.id,
        codigo: `${line.shipment.codigo} (${line.cantidadRollos}×${line.metrajePorRollo}m)`,
        metrajeOriginal: line.metrajeTotal,
        metrajeActual: disponible,
        tipoRollo: 'ENTERO',
        estadoHu: 'EN_TRANSITO',
        fechaIngreso: null,
        ubicacion: null,
        sku: line.sku,
        source: 'TRANSITO',
        waste: Math.abs(waste),
        wastePercent: disponible > 0 ? Math.round((Math.abs(waste) / disponible) * 100 * 10) / 10 : 0,
        fits: fitsMetraje,
        isExact: waste === 0,
        tag: '',
        score: 0,
        // Transit-specific
        eta,
        diasParaLlegar,
        embarqueCodigo: line.shipment.codigo,
        transportista: line.shipment.transportista,
        proveedor: line.shipment.supplier?.nombre,
        shipmentLineId: line.id,
        cantidadRollos: line.cantidadRollos,
        metrajePorRollo: line.metrajePorRollo,
        metrajeReservado: line.metrajeReservado,
      };

      if (fitsMetraje) {
        // Score transit: base 5000 (after all physical fits) + days to arrive
        suggestion.score = 5000 + diasParaLlegar * 10 + waste;
        if (diasParaLlegar <= 1) {
          suggestion.tag = '🚛 Llega mañana';
        } else if (diasParaLlegar <= 3) {
          suggestion.tag = `🚛 Tránsito — llega en ${diasParaLlegar} días`;
        } else if (diasParaLlegar <= 7) {
          suggestion.tag = `🚛 Tránsito — llega en ${diasParaLlegar} días`;
        } else {
          suggestion.tag = `🚛 Tránsito — llega el ${eta.toLocaleDateString('es-MX')}`;
        }
        transitSuggestions.push(suggestion);
      } else {
        suggestion.tag = `🚛⚠️ Tránsito insuficiente (${disponible}m disp.)`;
        suggestion.score = 15000 + Math.abs(waste);
        transitSuggestions.push(suggestion);
      }
    }

    // ===== SORTING FOR INDIVIDUAL SUGGESTIONS =====
    fits.sort((a, b) => {
      if (a.isExact && !b.isExact) return -1;
      if (!a.isExact && b.isExact) return 1;
      const aIsIdealRemnant = a.tipoRollo === 'RETAZO' && a.waste <= 10;
      const bIsIdealRemnant = b.tipoRollo === 'RETAZO' && b.waste <= 10;
      if (aIsIdealRemnant && !bIsIdealRemnant) return -1;
      if (!aIsIdealRemnant && bIsIdealRemnant) return 1;
      return a.waste - b.waste;
    });

    transitSuggestions.sort((a, b) => {
      if (a.fits && !b.fits) return -1;
      if (!a.fits && b.fits) return 1;
      return (a.diasParaLlegar || 0) - (b.diasParaLlegar || 0);
    });

    partials.sort((a, b) => b.metrajeActual - a.metrajeActual);

    // ===== FULFILLMENT PLAN BUILDER (Combinatory) =====
    // Builds an optimal picking list combining multiple HUs + transit to cover demand
    const plan: any[] = [];
    let remaining = metraje;
    const usedHuIds = new Set<string>();

    // Step 1: Retazos first — use up small pieces before opening new rolls
    // Sort retazos by: closest to remaining need (minimize waste on last piece)
    const retazos = allHUs
      .filter(h => h.tipoRollo === 'RETAZO')
      .sort((a, b) => a.metrajeActual - b.metrajeActual); // smallest first

    for (const hu of retazos) {
      if (remaining <= 0) break;
      // If this retazo can finish the remaining need with minimal waste, prioritize it
      if (hu.metrajeActual <= remaining + 5) { // 5m tolerance for cutting
        plan.push({
          ...hu,
          source: 'FISICO',
          metrajeTomar: Math.min(hu.metrajeActual, remaining),
          requiereCorte: hu.metrajeActual > remaining,
          sobrante: Math.max(0, hu.metrajeActual - remaining),
          rol: plan.length === 0 ? 'PRIMERO' : 'COMPLEMENTO',
        });
        remaining -= hu.metrajeActual;
        usedHuIds.add(hu.id);
      }
    }

    // Step 2: Whole rolls (FIFO — oldest first)
    const enteros = allHUs
      .filter(h => h.tipoRollo === 'ENTERO' && !usedHuIds.has(h.id))
      .sort((a, b) => new Date(a.fechaIngreso || 0).getTime() - new Date(b.fechaIngreso || 0).getTime());

    for (const hu of enteros) {
      if (remaining <= 0) break;
      plan.push({
        ...hu,
        source: 'FISICO',
        metrajeTomar: Math.min(hu.metrajeActual, remaining),
        requiereCorte: hu.metrajeActual > remaining,
        sobrante: Math.max(0, hu.metrajeActual - remaining),
        rol: remaining >= hu.metrajeActual ? 'COMPLETO' : 'PARCIAL',
      });
      remaining -= hu.metrajeActual;
      usedHuIds.add(hu.id);
    }

    // Step 3: If there's a close retazo for the last piece, swap it in
    // (e.g., need 15m remaining → use 18m retazo instead of opening a 50m roll)
    if (remaining > 0) {
      const closeRetazo = allHUs
        .filter(h => h.tipoRollo === 'RETAZO' && !usedHuIds.has(h.id) && h.metrajeActual >= remaining)
        .sort((a, b) => a.metrajeActual - b.metrajeActual)[0]; // closest fit
      if (closeRetazo) {
        plan.push({
          ...closeRetazo,
          source: 'FISICO',
          metrajeTomar: remaining,
          requiereCorte: closeRetazo.metrajeActual > remaining,
          sobrante: closeRetazo.metrajeActual - remaining,
          rol: 'CIERRE',
        });
        remaining = 0;
        usedHuIds.add(closeRetazo.id);
      }
    }

    // Step 4: Transit inventory if physical stock isn't enough
    const transitPlan: any[] = [];
    if (remaining > 0) {
      const sortedTransit = transitSuggestions
        .filter(t => t.metrajeActual > 0)
        .sort((a, b) => (a.diasParaLlegar || 0) - (b.diasParaLlegar || 0));

      for (const t of sortedTransit) {
        if (remaining <= 0) break;
        const tomar = Math.min(t.metrajeActual, remaining);
        transitPlan.push({
          ...t,
          metrajeTomar: tomar,
          sobrante: t.metrajeActual - tomar,
          rol: 'TRANSITO',
        });
        remaining -= tomar;
      }
    }

    // Build fulfillment summary
    const totalFisicoEnPlan = plan.reduce((s, p) => s + Math.min(p.metrajeActual, p.metrajeTomar + (p.sobrante > 0 ? 0 : 0)), 0);
    const totalCubierto = plan.reduce((s, p) => s + p.metrajeTomar, 0) + transitPlan.reduce((s, p) => s + p.metrajeTomar, 0);
    const gap = Math.max(0, metraje - totalCubierto);

    const fulfillmentPlan = {
      items: [...plan, ...transitPlan],
      totalHUsFisicos: plan.length,
      totalHUsTransito: transitPlan.length,
      metrajeFisico: plan.reduce((s, p) => s + p.metrajeTomar, 0),
      metrajeTransito: transitPlan.reduce((s, p) => s + p.metrajeTomar, 0),
      totalCubierto,
      metrajeRequerido: metraje,
      gap,
      coberturaPct: Math.min(100, Math.round((totalCubierto / metraje) * 100)),
      status: gap === 0 ? 'COMPLETO' : totalCubierto > 0 ? 'PARCIAL' : 'SIN_STOCK',
    };

    // ===== INDIVIDUAL SUGGESTIONS (for reference) =====
    const suggestions = [
      ...fits,
      ...transitSuggestions.filter(s => s.fits),
      ...transitSuggestions.filter(s => !s.fits).slice(0, 2),
      ...partials.slice(0, 3),
    ].slice(0, limit);

    // Aggregates
    const totalMetraje = allHUs.reduce((sum, hu) => sum + hu.metrajeActual, 0);
    const transitMetraje = transitLines.reduce((sum, l) => sum + l.metrajeTotal - l.metrajeReservado, 0);

    return {
      suggestions,
      fulfillmentPlan,
      totalAvailable: allHUs.length,
      totalMetraje,
      transitAvailable: transitLines.length,
      transitMetraje,
      metrajeRequerido: metraje,
      fitsCount: fits.length,
      transitFitsCount: transitSuggestions.filter(s => s.fits).length,
    };
  }
}


