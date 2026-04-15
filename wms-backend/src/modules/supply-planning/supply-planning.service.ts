import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SupplyPlanningService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== DASHBOARD KPIs =====
  async getDashboard() {
    // Active SKUs
    const skus = await this.prisma.skuMaster.findMany({ where: { activo: true } });
    const skuIds = skus.map(s => s.id);

    // Stock actual por SKU
    const stockBySku = await this.prisma.handlingUnit.groupBy({
      by: ['skuId'],
      where: { estadoHu: 'DISPONIBLE', metrajeActual: { gt: 0 } },
      _sum: { metrajeActual: true },
      _count: true,
    });

    // Tránsito por SKU
    const transitBySku = await this.prisma.incomingShipmentLine.groupBy({
      by: ['skuId'],
      where: { shipment: { estado: 'EN_TRANSITO' } },
      _sum: { metrajeTotal: true, metrajeReservado: true },
    });

    // Consumo últimos 90 días (cortes realizados)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const consumo90d = await this.prisma.cutOperation.groupBy({
      by: ['huOrigenId'],
      where: { fechaCorte: { gte: ninetyDaysAgo } },
      _sum: { metrajeCortado: true },
    });

    // Get SKU for each cut
    const cortesConSku = await this.prisma.cutOperation.findMany({
      where: { fechaCorte: { gte: ninetyDaysAgo } },
      select: { metrajeCortado: true, huOrigen: { select: { skuId: true } } },
    });

    const consumoPorSku: Record<string, number> = {};
    for (const c of cortesConSku) {
      const sid = c.huOrigen.skuId;
      consumoPorSku[sid] = (consumoPorSku[sid] || 0) + c.metrajeCortado;
    }

    // Pedidos últimos 90 días (metraje requerido)
    const pedidos90d = await this.prisma.orderLine.findMany({
      where: { order: { createdAt: { gte: ninetyDaysAgo } } },
      select: { skuId: true, metrajeRequerido: true },
    });

    const demandaPorSku: Record<string, number> = {};
    for (const p of pedidos90d) {
      demandaPorSku[p.skuId] = (demandaPorSku[p.skuId] || 0) + p.metrajeRequerido;
    }

    // Reorder configs
    const reorderConfigs = await this.prisma.reorderConfig.findMany({ where: { activo: true } });
    const reorderMap: Record<string, any> = {};
    for (const rc of reorderConfigs) reorderMap[rc.skuId] = rc;

    // Build per-SKU analysis
    const skuAnalysis = skus.map(sku => {
      const stock = stockBySku.find(s => s.skuId === sku.id);
      const transit = transitBySku.find(t => t.skuId === sku.id);
      const stockActual = stock?._sum.metrajeActual || 0;
      const transitoActual = (transit?._sum.metrajeTotal || 0) - (transit?._sum.metrajeReservado || 0);
      const husCount = stock?._count || 0;

      const consumo = consumoPorSku[sku.id] || 0;
      const demanda = demandaPorSku[sku.id] || 0;
      const consumoMensual = consumo / 3; // avg last 3 months
      const demandaMensual = demanda / 3;

      const reorder = reorderMap[sku.id];
      const stockMinimo = reorder?.stockMinimo || sku.minStock || 100;
      const diasCobertura = consumoMensual > 0
        ? ((stockActual + transitoActual) / consumoMensual) * 30
        : stockActual > 0 ? 999 : 0;
      const necesidadNeta = Math.max(0, demandaMensual - stockActual - transitoActual);

      let prioridad = 'BAJA';
      if (diasCobertura < 15) prioridad = 'CRITICA';
      else if (diasCobertura < 30) prioridad = 'ALTA';
      else if (diasCobertura < 60) prioridad = 'MEDIA';

      return {
        sku: { id: sku.id, codigo: sku.codigo, nombre: sku.nombre, color: sku.color, categoria: sku.categoria },
        stockActual,
        husCount,
        transitoActual,
        consumoMensual: Math.round(consumoMensual * 10) / 10,
        demandaMensual: Math.round(demandaMensual * 10) / 10,
        diasCobertura: Math.round(diasCobertura),
        necesidadNeta: Math.round(necesidadNeta * 10) / 10,
        stockMinimo,
        prioridad,
        precioRef: sku.precioReferencia,
      };
    });

    // Sort by priority
    const prioOrder: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
    skuAnalysis.sort((a, b) => (prioOrder[a.prioridad] || 3) - (prioOrder[b.prioridad] || 3));

    // KPIs
    const totalStock = skuAnalysis.reduce((s, a) => s + a.stockActual, 0);
    const totalTransito = skuAnalysis.reduce((s, a) => s + a.transitoActual, 0);
    const skusCriticos = skuAnalysis.filter(a => a.prioridad === 'CRITICA').length;
    const skusAlerta = skuAnalysis.filter(a => a.prioridad === 'ALTA').length;
    const coberturaPromedio = skuAnalysis.length > 0
      ? Math.round(skuAnalysis.reduce((s, a) => s + Math.min(a.diasCobertura, 365), 0) / skuAnalysis.length)
      : 0;
    const valorCompraEstimado = skuAnalysis.reduce((s, a) => {
      if (a.necesidadNeta > 0 && a.precioRef) return s + a.necesidadNeta * Number(a.precioRef);
      return s;
    }, 0);

    // Embarques en tránsito
    const embarquesTransito = await this.prisma.incomingShipment.count({ where: { estado: 'EN_TRANSITO' } });

    return {
      kpis: {
        totalStock: Math.round(totalStock),
        totalTransito: Math.round(totalTransito),
        coberturaPromedio,
        skusCriticos,
        skusAlerta,
        valorCompraEstimado: Math.round(valorCompraEstimado),
        embarquesTransito,
        totalSkus: skus.length,
      },
      skuAnalysis,
    };
  }

  // ===== PLANS =====
  async findAllPlans(anio?: number) {
    const where: any = {};
    if (anio) where.anio = anio;
    return this.prisma.supplyPlan.findMany({
      where,
      orderBy: [{ anio: 'desc' }, { mes: 'desc' }],
      include: {
        _count: { select: { lineas: true } },
        user: { select: { nombre: true } },
      },
    });
  }

  async findPlanById(id: string) {
    return this.prisma.supplyPlan.findUniqueOrThrow({
      where: { id },
      include: {
        lineas: {
          include: {
            sku: { select: { id: true, codigo: true, nombre: true, color: true, categoria: true, precioReferencia: true } },
            supplier: { select: { id: true, nombre: true, codigo: true } },
          },
          orderBy: [{ prioridad: 'asc' }, { necesidadNeta: 'desc' }],
        },
        user: { select: { nombre: true } },
      },
    });
  }

  // ===== GENERATE PLAN =====
  async generatePlan(mes: number, anio: number, userId: string) {
    // Check if plan already exists
    const existing = await this.prisma.supplyPlan.findUnique({ where: { mes_anio: { mes, anio } } });
    if (existing) {
      // Delete old lines and regenerate
      await this.prisma.supplyPlanLine.deleteMany({ where: { planId: existing.id } });
      return this._buildPlanLines(existing.id, userId);
    }

    const plan = await this.prisma.supplyPlan.create({
      data: { mes, anio, creadoPor: userId },
    });
    return this._buildPlanLines(plan.id, userId);
  }

  private async _buildPlanLines(planId: string, userId: string) {
    const { skuAnalysis } = await this.getDashboard();
    const suppliers = await this.prisma.supplier.findMany({ where: { activo: true } });

    const lines = skuAnalysis.map(a => {
      const reorderQty = Math.max(a.necesidadNeta, a.stockMinimo - a.stockActual - a.transitoActual);
      const cantidadSugerida = Math.max(0, Math.ceil(reorderQty / 50) * 50); // Round up to 50m rolls

      return {
        planId,
        skuId: a.sku.id,
        stockActual: a.stockActual,
        transitoActual: a.transitoActual,
        demandaProyectada: a.demandaMensual,
        consumoPromedio: a.consumoMensual,
        stockMinimo: a.stockMinimo,
        diasCobertura: a.diasCobertura,
        necesidadNeta: a.necesidadNeta,
        cantidadSugerida,
        prioridad: a.prioridad,
        precioEstimado: a.precioRef || null,
      };
    });

    await this.prisma.supplyPlanLine.createMany({ data: lines as any });

    // Update total
    const totalEstimado = lines.reduce((s, l) => {
      if (l.cantidadSugerida > 0 && l.precioEstimado) return s + l.cantidadSugerida * Number(l.precioEstimado);
      return s;
    }, 0);

    return this.prisma.supplyPlan.update({
      where: { id: planId },
      data: { totalEstimado },
      include: {
        lineas: {
          include: {
            sku: { select: { id: true, codigo: true, nombre: true, color: true, categoria: true } },
          },
          orderBy: [{ prioridad: 'asc' }, { necesidadNeta: 'desc' }],
        },
      },
    });
  }

  // ===== APPROVE PLAN =====
  async approvePlan(id: string, userId: string) {
    return this.prisma.supplyPlan.update({
      where: { id },
      data: { estado: 'APROBADO', aprobadoPor: userId, fechaAprobacion: new Date() },
    });
  }

  // ===== UPDATE LINE =====
  async updateLine(planId: string, lineId: string, data: { cantidadAprobada?: number; supplierId?: string; status?: string; notas?: string }) {
    return this.prisma.supplyPlanLine.update({
      where: { id: lineId },
      data,
      include: {
        sku: { select: { id: true, codigo: true, nombre: true, color: true } },
        supplier: { select: { id: true, nombre: true } },
      },
    });
  }

  // ===== CREATE SHIPMENT FROM PLAN LINE =====
  async createShipmentFromLine(lineId: string, userId: string) {
    const line = await this.prisma.supplyPlanLine.findUniqueOrThrow({
      where: { id: lineId },
      include: {
        sku: true,
        supplier: true,
        plan: true,
      },
    });

    if (!line.supplierId) throw new Error('Debe seleccionar un proveedor');
    const cantidad = line.cantidadAprobada || line.cantidadSugerida;
    if (cantidad <= 0) throw new Error('Cantidad debe ser mayor a 0');

    const rollos = Math.ceil(cantidad / line.sku.metrajeEstandar);
    const leadTime = 30; // default

    // Create IncomingShipment
    const shipment = await this.prisma.incomingShipment.create({
      data: {
        codigo: `EMB-${line.plan.anio}-${String(line.plan.mes).padStart(2, '0')}-${line.sku.codigo}`,
        supplierId: line.supplierId,
        ordenCompra: `OC-PLAN-${line.plan.anio}${String(line.plan.mes).padStart(2, '0')}-${line.sku.codigo}`,
        estado: 'EN_TRANSITO',
        fechaEstimada: new Date(Date.now() + leadTime * 86400000),
        notas: `Generado desde Plan ${line.plan.mes}/${line.plan.anio}`,
        creadoPor: userId,
      },
    });

    await this.prisma.incomingShipmentLine.create({
      data: {
        shipmentId: shipment.id,
        skuId: line.skuId,
        cantidadRollos: rollos,
        metrajePorRollo: line.sku.metrajeEstandar,
        metrajeTotal: rollos * line.sku.metrajeEstandar,
      },
    });

    // Update line status
    await this.prisma.supplyPlanLine.update({
      where: { id: lineId },
      data: { status: 'ORDENADO', shipmentId: shipment.id },
    });

    return shipment;
  }

  // ===== PROJECTIONS (12 months) =====
  async getProjections(skuId?: string) {
    const skus = skuId
      ? await this.prisma.skuMaster.findMany({ where: { id: skuId, activo: true } })
      : await this.prisma.skuMaster.findMany({ where: { activo: true }, take: 8 });

    const now = new Date();
    const months: string[] = [];
    for (let i = 0; i < 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
    }

    // Historical order data per SKU per month (last 6 months)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1);
    const historicalOrders = await this.prisma.orderLine.findMany({
      where: {
        skuId: { in: skus.map(s => s.id) },
        order: { createdAt: { gte: sixMonthsAgo } },
      },
      select: { skuId: true, metrajeRequerido: true, order: { select: { createdAt: true } } },
    });

    const histBySkuMonth: Record<string, Record<string, number>> = {};
    for (const o of historicalOrders) {
      const key = o.skuId;
      const month = `${o.order.createdAt.getFullYear()}-${String(o.order.createdAt.getMonth() + 1).padStart(2, '0')}`;
      if (!histBySkuMonth[key]) histBySkuMonth[key] = {};
      histBySkuMonth[key][month] = (histBySkuMonth[key][month] || 0) + o.metrajeRequerido;
    }

    const projections = skus.map(sku => {
      const hist = histBySkuMonth[sku.id] || {};
      const histValues = Object.values(hist);
      const avgMonthly = histValues.length > 0 ? histValues.reduce((a, b) => a + b, 0) / histValues.length : 0;

      // Simple linear projection with seasonal factor
      const monthlyProjection = months.map((m, idx) => {
        const seasonal = 1 + (Math.sin((idx / 12) * Math.PI * 2 - Math.PI / 2) * 0.15); // ±15% seasonal
        return {
          month: m,
          projected: Math.round(avgMonthly * seasonal),
          historical: hist[m] || 0,
        };
      });

      return {
        sku: { id: sku.id, codigo: sku.codigo, nombre: sku.nombre, color: sku.color },
        avgMonthly: Math.round(avgMonthly),
        months: monthlyProjection,
      };
    });

    return { months, projections };
  }

  // ===== ALERTS =====
  async getAlerts() {
    const { skuAnalysis } = await this.getDashboard();
    return skuAnalysis
      .filter(a => a.prioridad === 'CRITICA' || a.prioridad === 'ALTA')
      .map(a => ({
        ...a,
        tipo: a.diasCobertura < 15 ? 'STOCK_CRITICO' : 'STOCK_BAJO',
        mensaje: a.diasCobertura < 15
          ? `${a.sku.nombre} — solo ${a.diasCobertura} días de cobertura (${a.stockActual}m disponibles)`
          : `${a.sku.nombre} — cobertura ${a.diasCobertura} días, considerar reorden`,
      }));
  }

  // ===== REORDER CONFIG =====
  async getReorderConfigs() {
    return this.prisma.reorderConfig.findMany({
      where: { activo: true },
      include: { sku: { select: { id: true, codigo: true, nombre: true, color: true } } },
      orderBy: { sku: { nombre: 'asc' } },
    });
  }

  async upsertReorderConfig(skuId: string, data: { stockMinimo: number; stockSeguridad?: number; puntoReorden: number; cantidadReorden: number; leadTimeDias?: number }) {
    return this.prisma.reorderConfig.upsert({
      where: { skuId },
      create: { skuId, ...data },
      update: data,
      include: { sku: { select: { id: true, codigo: true, nombre: true } } },
    });
  }
}
