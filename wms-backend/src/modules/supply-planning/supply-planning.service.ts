import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class SupplyPlanningService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== DASHBOARD KPIs & MOTOR RESURTIDO FORMATEX =====
  async getDashboard() {
    // Active SKUs (telas y muestrarios)
    const skus = await this.prisma.skuMaster.findMany({
      where: { activo: true },
      orderBy: [{ libroColeccion: 'asc' }, { nombre: 'asc' }],
    });
    const skuIds = skus.map(s => s.id);

    // Stock disponible (excluye rollos restringidos o con bloqueo de calidad)
    const stockBySku = await this.prisma.handlingUnit.groupBy({
      by: ['skuId'],
      where: {
        estadoHu: 'DISPONIBLE',
        calidadRestringida: false,
        gradoCalidad: { not: 'RESTRINGIDO' },
        metrajeActual: { gt: 0 },
      },
      _sum: { metrajeActual: true },
      _count: true,
    });

    // Stock en Calidades Especiales (Calidad A-D o Restringido - no disponible para venta regular)
    const stockRestringidoBySku = await this.prisma.handlingUnit.groupBy({
      by: ['skuId'],
      where: {
        OR: [
          { calidadRestringida: true },
          { gradoCalidad: { in: ['CALIDAD_A', 'CALIDAD_B', 'CALIDAD_C', 'CALIDAD_D', 'RESTRINGIDO'] } },
        ],
        metrajeActual: { gt: 0 },
      },
      _sum: { metrajeActual: true },
      _count: true,
    });

    // Tránsito por SKU (S+P+T componente Tránsito)
    const transitBySku = await this.prisma.incomingShipmentLine.groupBy({
      by: ['skuId'],
      where: { shipment: { estado: 'EN_TRANSITO' } },
      _sum: { metrajeTotal: true, metrajeReservado: true },
    });

    // Histórico de Ventas de los últimos 4 meses (Cargados por CFDI XML o WMS)
    const now = new Date();
    const curYear = now.getFullYear();
    const curMonth = now.getMonth() + 1;
    const targetMonths: Array<{ mes: number; anio: number }> = [];
    for (let i = 0; i < 4; i++) {
      let m = curMonth - i;
      let y = curYear;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      targetMonths.push({ mes: m, anio: y });
    }

    const salesHistory4M = await this.prisma.skuSalesHistory.findMany({
      where: {
        OR: targetMonths.map(tm => ({ mes: tm.mes, anio: tm.anio })),
      },
    });

    const sales4mBySku: Record<string, number> = {};
    for (const sh of salesHistory4M) {
      sales4mBySku[sh.skuId] = (sales4mBySku[sh.skuId] || 0) + sh.metrosVendidos;
    }

    // Consumo últimos 90 días (cortes realizados en piso) como fallback/complemento
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000);
    const cortesConSku = await this.prisma.cutOperation.findMany({
      where: { fechaCorte: { gte: ninetyDaysAgo } },
      select: { metrajeCortado: true, huOrigen: { select: { skuId: true } } },
    });

    const consumoPorSku: Record<string, number> = {};
    for (const c of cortesConSku) {
      const sid = c.huOrigen.skuId;
      consumoPorSku[sid] = (consumoPorSku[sid] || 0) + c.metrajeCortado;
    }

    // Pedidos / Backorder pendientes últimos 90 días
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

    // Build per-SKU analysis con fórmula exacta de Formatex Master
    const skuAnalysis = skus.map(sku => {
      const stock = stockBySku.find(s => s.skuId === sku.id);
      const stockRestr = stockRestringidoBySku.find(s => s.skuId === sku.id);
      const transit = transitBySku.find(t => t.skuId === sku.id);

      const stockActual = stock?._sum.metrajeActual || 0;
      const stockRestringido = stockRestr?._sum.metrajeActual || 0;
      const transitoActual = (transit?._sum.metrajeTotal || 0) - (transit?._sum.metrajeReservado || 0);
      const husCount = stock?._count || 0;

      // 1. 4M Prom Vta (m/mes)
      const hist4m = sales4mBySku[sku.id];
      const consumoInterno = consumoPorSku[sku.id] || 0;
      const demandaInterna = demandaPorSku[sku.id] || 0;
      const promedio4M = hist4m !== undefined
        ? Math.round((hist4m / 4) * 10) / 10
        : Math.round(((consumoInterno || demandaInterna) / 3) * 10) / 10;

      // 2. Proyección Formatex: 4M Prom Vta × 4.5
      const proyeccion4M5 = Math.round(promedio4M * 4.5 * 10) / 10;

      // 3. TENDREMOS = S+P+T (Stock disponible + Tránsito)
      const tendremos = Math.round((stockActual + transitoActual) * 10) / 10;

      // 4. NECESITAREMOS = Mayor entre Demanda Comprometida y Proyección
      const demandaMensual = Math.round((demandaInterna / 3) * 10) / 10;
      const necesitaremos = Math.round(Math.max(demandaMensual, proyeccion4M5) * 10) / 10;

      // 5. Diferencia = TENDREMOS − NECESITAREMOS
      const diferencia = Math.round((tendremos - necesitaremos) * 10) / 10;

      // 6. Status: "OK" si TENDREMOS >= NECESITAREMOS, de lo contrario "RESURTIR"
      const statusResurtido = diferencia >= 0 ? 'OK' : 'RESURTIR';

      // 7. Cantidad sugerida a pedir (en rollos estándar)
      const rolloStd = sku.metrajeEstandar || 50;
      const necesidadMetros = Math.max(0, -diferencia);
      const cantidadSugerida = statusResurtido === 'RESURTIR'
        ? Math.ceil(necesidadMetros / rolloStd) * rolloStd
        : 0;

      const reorder = reorderMap[sku.id];
      const stockMinimo = reorder?.stockMinimo || sku.minStock || 100;
      const diasCobertura = promedio4M > 0
        ? Math.round(((stockActual + transitoActual) / promedio4M) * 30)
        : stockActual > 0 ? 999 : 0;

      let prioridad = 'BAJA';
      if (statusResurtido === 'RESURTIR' || diasCobertura < 15) prioridad = 'CRITICA';
      else if (diasCobertura < 30) prioridad = 'ALTA';
      else if (diasCobertura < 60) prioridad = 'MEDIA';

      return {
        sku: {
          id: sku.id,
          codigo: sku.codigo,
          nombre: sku.nombre,
          color: sku.color,
          categoria: sku.categoria,
          libroColeccion: sku.libroColeccion,
          tipoArticulo: sku.tipoArticulo,
          metrajeEstandar: sku.metrajeEstandar,
        },
        // Disponibilidad y Calidad
        stockActual: Math.round(stockActual * 10) / 10,
        stockRestringido: Math.round(stockRestringido * 10) / 10,
        transitoActual: Math.round(transitoActual * 10) / 10,
        husCount,
        // Motor Formatex
        promedio4M,
        proyeccion4M5,
        tendremos,
        necesitaremos,
        diferencia,
        statusResurtido,
        cantidadSugerida,
        // Cobertura y finanzas
        diasCobertura,
        stockMinimo,
        prioridad,
        precioRef: sku.precioReferencia,
      };
    });

    // Ordenar: primero los que requieren RESURTIR / CRITICA
    const prioOrder: Record<string, number> = { CRITICA: 0, ALTA: 1, MEDIA: 2, BAJA: 3 };
    skuAnalysis.sort((a, b) => {
      if (a.statusResurtido !== b.statusResurtido) {
        return a.statusResurtido === 'RESURTIR' ? -1 : 1;
      }
      return (prioOrder[a.prioridad] || 3) - (prioOrder[b.prioridad] || 3);
    });

    // KPIs consolidados
    const totalStock = skuAnalysis.reduce((s, a) => s + a.stockActual, 0);
    const totalRestringido = skuAnalysis.reduce((s, a) => s + a.stockRestringido, 0);
    const totalTransito = skuAnalysis.reduce((s, a) => s + a.transitoActual, 0);
    const skusResurtir = skuAnalysis.filter(a => a.statusResurtido === 'RESURTIR').length;
    const skusOk = skuAnalysis.filter(a => a.statusResurtido === 'OK').length;
    const valorCompraEstimado = skuAnalysis.reduce((s, a) => {
      if (a.cantidadSugerida > 0 && a.precioRef) return s + a.cantidadSugerida * Number(a.precioRef);
      return s;
    }, 0);
    const embarquesTransito = await this.prisma.incomingShipment.count({ where: { estado: 'EN_TRANSITO' } });

    return {
      kpis: {
        totalStock: Math.round(totalStock),
        totalRestringido: Math.round(totalRestringido),
        totalTransito: Math.round(totalTransito),
        skusResurtir,
        skusOk,
        totalSkus: skus.length,
        embarquesTransito,
        valorCompraEstimado: Math.round(valorCompraEstimado),
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
      return {
        planId,
        skuId: a.sku.id,
        stockActual: a.stockActual,
        transitoActual: a.transitoActual,
        demandaProyectada: a.necesitaremos,
        consumoPromedio: a.promedio4M,
        promedio4M: a.promedio4M,
        proyeccion4M5: a.proyeccion4M5,
        decisionStatus: a.statusResurtido,
        stockMinimo: a.stockMinimo,
        diasCobertura: a.diasCobertura,
        necesidadNeta: a.diferencia < 0 ? Math.abs(a.diferencia) : 0,
        cantidadSugerida: a.cantidadSugerida,
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

  // ===== AJUSTE FINAL DIRECCIÓN (RICARDO) =====
  async updateLineAjuste(planId: string, lineId: string, ajusteDireccion: number) {
    return this.prisma.supplyPlanLine.update({
      where: { id: lineId },
      data: {
        ajusteDireccion,
        cantidadAprobada: ajusteDireccion > 0 ? ajusteDireccion : undefined,
      },
      include: {
        sku: { select: { id: true, codigo: true, nombre: true, color: true } },
      },
    });
  }

  // ===== INGESTA MASIVA DE FACTURAS XML (CFDI 3.3 / 4.0 - CONTPAQi) =====
  async ingestCfdiXmls(xmlFiles: Array<{ filename: string; content: string }>) {
    const allSkus = await this.prisma.skuMaster.findMany({
      where: { activo: true },
      select: { id: true, codigo: true, nombre: true },
    });

    // Mapeo rápido de normalización
    const skuCodeMap = new Map<string, string>();
    const skuNameMap = new Map<string, string>();
    for (const s of allSkus) {
      skuCodeMap.set(s.codigo.trim().toUpperCase(), s.id);
      skuNameMap.set(s.nombre.trim().toUpperCase(), s.id);
    }

    let processedInvoices = 0;
    let totalItems = 0;
    let matchedItems = 0;
    const errors: string[] = [];

    // Acumulador de consumo por (skuId + anio + mes)
    const aggregatedSales: Record<string, { skuId: string; anio: number; mes: number; metros: number; importe: number; facturasCount: number }> = {};

    for (const file of xmlFiles) {
      try {
        const xml = file.content;
        const fechaMatch = xml.match(/Fecha=["\']([^"\']+)["\']/i);
        const tipoMatch = xml.match(/TipoDeComprobante=["\']([^"\']+)["\']/i);

        if (!fechaMatch) {
          errors.push(`${file.filename}: No se encontró atributo Fecha`);
          continue;
        }

        const tipo = tipoMatch ? tipoMatch[1].toUpperCase() : 'I';
        if (tipo !== 'I') {
          // Omitir comprobantes que no sean facturas de ingreso
          continue;
        }

        const fecha = new Date(fechaMatch[1]);
        const anio = fecha.getFullYear();
        const mes = fecha.getMonth() + 1;

        if (isNaN(anio) || isNaN(mes)) {
          errors.push(`${file.filename}: Fecha no válida (${fechaMatch[1]})`);
          continue;
        }

        processedInvoices++;

        // Parse conceptos
        const conceptoRegex = /<cfdi:Concepto\b([^>]*?)(\/>|>[\s\S]*?<\/cfdi:Concepto>)/gi;
        let match;
        while ((match = conceptoRegex.exec(xml)) !== null) {
          totalItems++;
          const attrs = match[1];
          const noIdMatch = attrs.match(/NoIdentificacion=["\']([^"\']*)["\']/i);
          const descMatch = attrs.match(/Descripcion=["\']([^"\']*)["\']/i);
          const cantMatch = attrs.match(/Cantidad=["\']([^"\']*)["\']/i);
          const impMatch = attrs.match(/Importe=["\']([^"\']*)["\']/i);

          const rawCode = (noIdMatch ? noIdMatch[1] : '').trim().toUpperCase();
          const rawDesc = (descMatch ? descMatch[1] : '').trim().toUpperCase();
          const cantidad = cantMatch ? parseFloat(cantMatch[1]) : 0;
          const importe = impMatch ? parseFloat(impMatch[1]) : 0;

          if (cantidad <= 0) continue;

          // Buscar coincidencia con SKU
          let matchedSkuId: string | undefined = undefined;
          if (rawCode && skuCodeMap.has(rawCode)) {
            matchedSkuId = skuCodeMap.get(rawCode);
          } else if (rawDesc && skuNameMap.has(rawDesc)) {
            matchedSkuId = skuNameMap.get(rawDesc);
          } else {
            // Fuzzy search en códigos y nombres existentes
            for (const s of allSkus) {
              const cod = s.codigo.toUpperCase();
              const nom = s.nombre.toUpperCase();
              if ((rawCode && rawCode.includes(cod)) || (rawDesc && (rawDesc.includes(nom) || rawDesc.includes(cod)))) {
                matchedSkuId = s.id;
                break;
              }
            }
          }

          if (matchedSkuId) {
            matchedItems++;
            const aggKey = `${matchedSkuId}_${anio}_${mes}`;
            if (!aggregatedSales[aggKey]) {
              aggregatedSales[aggKey] = {
                skuId: matchedSkuId,
                anio,
                mes,
                metros: 0,
                importe: 0,
                facturasCount: 0,
              };
            }
            aggregatedSales[aggKey].metros += cantidad;
            aggregatedSales[aggKey].importe += importe;
            aggregatedSales[aggKey].facturasCount += 1;
          }
        }
      } catch (err: any) {
        errors.push(`${file.filename}: ${err.message}`);
      }
    }

    // Persistir agregados en SkuSalesHistory
    const upsertResults = [];
    for (const record of Object.values(aggregatedSales)) {
      const res = await this.prisma.skuSalesHistory.upsert({
        where: {
          skuId_mes_anio_origen: {
            skuId: record.skuId,
            mes: record.mes,
            anio: record.anio,
            origen: 'XML_CFDI',
          },
        },
        create: {
          skuId: record.skuId,
          mes: record.mes,
          anio: record.anio,
          metrosVendidos: Math.round(record.metros * 100) / 100,
          importeTotal: record.importe > 0 ? record.importe : null,
          numFacturas: record.facturasCount,
          origen: 'XML_CFDI',
        },
        update: {
          metrosVendidos: Math.round(record.metros * 100) / 100,
          importeTotal: record.importe > 0 ? record.importe : null,
          numFacturas: record.facturasCount,
        },
      });
      upsertResults.push(res);
    }

    return {
      success: true,
      totalXmlFiles: xmlFiles.length,
      processedInvoices,
      totalItems,
      matchedItems,
      unmatchedItems: totalItems - matchedItems,
      salesRecordsUpdated: upsertResults.length,
      errors: errors.slice(0, 20),
    };
  }

  // ===== MATRIZ HISTÓRICA DE VENTAS (13 MESES - FORMATEX HOJA 6) =====
  async getSalesHistoryMatrix(anio?: number) {
    const targetYear = anio || new Date().getFullYear();
    const skus = await this.prisma.skuMaster.findMany({
      where: { activo: true },
      select: { id: true, codigo: true, nombre: true, color: true, libroColeccion: true, categoria: true },
      orderBy: [{ libroColeccion: 'asc' }, { nombre: 'asc' }],
    });

    const records = await this.prisma.skuSalesHistory.findMany({
      where: { anio: targetYear },
    });

    const matrix = skus.map(sku => {
      const skuRecords = records.filter(r => r.skuId === sku.id);
      const monthsData: Record<number, number> = {};
      let total = 0;

      for (let m = 1; m <= 12; m++) {
        const found = skuRecords.find(r => r.mes === m);
        const metros = found ? found.metrosVendidos : 0;
        monthsData[m] = Math.round(metros * 10) / 10;
        total += metros;
      }

      // Promedio mensual 12 meses
      const promAnual = total > 0 ? Math.round((total / 12) * 10) / 10 : 0;

      // Promedio últimos 4 meses
      const now = new Date();
      const curM = now.getMonth() + 1;
      let sum4M = 0;
      for (let i = 0; i < 4; i++) {
        let m = curM - i;
        if (m >= 1 && m <= 12) {
          sum4M += monthsData[m] || 0;
        }
      }
      const promedio4M = Math.round((sum4M / 4) * 10) / 10;

      return {
        sku,
        meses: monthsData,
        total: Math.round(total * 10) / 10,
        promAnual,
        promedio4M,
        proyeccion4M5: Math.round(promedio4M * 4.5 * 10) / 10,
      };
    });

    return {
      anio: targetYear,
      matrix,
    };
  }

  // Carga manual de fila de histórico
  async upsertManualSalesHistory(skuId: string, mes: number, anio: number, metrosVendidos: number, almacenCodigo?: string) {
    return this.prisma.skuSalesHistory.upsert({
      where: {
        skuId_mes_anio_origen: {
          skuId,
          mes,
          anio,
          origen: 'MANUAL',
        },
      },
      create: {
        skuId,
        mes,
        anio,
        metrosVendidos,
        almacenCodigo,
        origen: 'MANUAL',
      },
      update: {
        metrosVendidos,
        almacenCodigo,
      },
    });
  }
}
