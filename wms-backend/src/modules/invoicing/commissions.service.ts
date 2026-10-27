import {
  Injectable,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CommissionsService {
  private readonly logger = new Logger(CommissionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // REPORTE DE COMISIONES POR VENDEDOR
  // -----------------------------------------------------------------------
  async getVendorCommissionReport(params: {
    vendorId?: string;
    desde?: string;
    hasta?: string;
    anio?: string;
    mes?: string;
    soloFacturasPagadas?: boolean;
    user?: any;
  }) {
    const { desde, hasta, anio, mes, soloFacturasPagadas = true, user } = params;

    // RBAC: Determinar si es perfil supervisor/gerencial o agente individual
    const userRole = (user?.role || '').toUpperCase();
    const userNivel = user?.nivel;
    const isManager = (userNivel != null && userNivel <= 2) ||
      ['ADMIN', 'DIRECTOR_OPERACIONES', 'DIRECTOR_COMPRAS', 'GERENCIA', 'JEFE_ATC', 'COBRANZA', 'FACTURACION'].includes(userRole);

    let effectiveVendorId = params.vendorId;

    if (!isManager && user) {
      // Agente ATC / Vendedor individual: Solo puede consultar SUS comisiones
      const matchedVendor = await this.prisma.vendor.findFirst({
        where: {
          OR: [
            ...(user.email ? [{ email: { equals: user.email, mode: 'insensitive' as const } }] : []),
            ...(user.username ? [{ nombre: { contains: user.username, mode: 'insensitive' as const } }] : []),
            ...(user.nombre ? [{ nombre: { contains: user.nombre.split(' ')[0], mode: 'insensitive' as const } }] : []),
          ],
        },
      });

      if (matchedVendor) {
        effectiveVendorId = matchedVendor.id;
      } else {
        // Si no está dado de alta en tabla Vendor, buscar vendedor por primer nombre o forzar no match seguro
        effectiveVendorId = '00000000-0000-0000-0000-000000000000';
      }
    }

    // Build filter
    const where: any = {
      facturapiId: { not: null },
      facturaStatus: 'valid',
      vendorId: { not: null },
    };

    if (effectiveVendorId) {
      where.vendorId = effectiveVendorId;
    }

    // Filtro por año / mes o fechas directas
    let desdeDate: Date | undefined = undefined;
    let hastaDate: Date | undefined = undefined;

    if (anio) {
      const y = parseInt(anio, 10);
      if (mes && mes !== 'all') {
        const m = parseInt(mes, 10);
        desdeDate = new Date(y, m - 1, 1, 0, 0, 0, 0);
        hastaDate = new Date(y, m, 0, 23, 59, 59, 999);
      } else {
        desdeDate = new Date(y, 0, 1, 0, 0, 0, 0);
        hastaDate = new Date(y, 11, 31, 23, 59, 59, 999);
      }
    } else {
      if (desde) desdeDate = new Date(desde);
      if (hasta) hastaDate = new Date(hasta);
    }

    if (desdeDate || hastaDate) {
      where.facturadaAt = {};
      if (desdeDate) where.facturadaAt.gte = desdeDate;
      if (hastaDate) where.facturadaAt.lte = hastaDate;
    }

    // Only fully paid invoices generate commissions
    if (soloFacturasPagadas) {
      where.OR = [
        { metodoPagoCfdi: 'PUE' }, // PUE = pagada al momento
        { estadoPago: 'PAGADA' },  // PPD = pagada 100%
      ];
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        client: { select: { nombre: true, codigo: true } },
        vendor: { select: { id: true, nombre: true, codigo: true, comision: true } },
        lineas: {
          select: {
            id: true,
            metrajeRequerido: true,
            precioUnitario: true,
            importe: true,
            listaPrecios: true,
            descuentoPct: true,
            comisionPct: true,
          },
        },
      },
      orderBy: { facturadaAt: 'desc' },
    });

    // Group by vendor
    const vendorMap: Record<string, {
      vendorId: string;
      vendorNombre: string;
      vendorCodigo: string;
      comisionBaseVendor: number;
      totalFacturado: number;
      totalDescuentos: number;
      totalComision: number;
      comisionAprobada: number;
      comisionPendienteCobro: number;
      totalFacturasLiquidadas: number;
      totalFacturasPendientes: number;
      facturas: any[];
    }> = {};

    for (const order of orders) {
      if (!order.vendor) continue;
      const vid = order.vendor.id;

      if (!vendorMap[vid]) {
        vendorMap[vid] = {
          vendorId: vid,
          vendorNombre: order.vendor.nombre,
          vendorCodigo: order.vendor.codigo,
          comisionBaseVendor: Number(order.vendor.comision || 0),
          totalFacturado: 0,
          totalDescuentos: 0,
          totalComision: 0,
          comisionAprobada: 0,
          comisionPendienteCobro: 0,
          totalFacturasLiquidadas: 0,
          totalFacturasPendientes: 0,
          facturas: [],
        };
      }

      let facturaComision = 0;
      let facturaTotal = 0;
      let facturaDescuentos = 0;
      const lineasDetalle: any[] = [];

      for (const linea of order.lineas) {
        const importe = Number(linea.importe || 0);
        const comisionPct = Number(linea.comisionPct || 0);
        const descuentoPct = Number(linea.descuentoPct || 0);
        const comisionLinea = importe * (comisionPct / 100);

        facturaTotal += importe;
        facturaComision += comisionLinea;

        if (descuentoPct > 0 && linea.precioUnitario) {
          const precioOriginal = Number(linea.precioUnitario) / (1 - descuentoPct / 100);
          const descuentoMonto = (precioOriginal - Number(linea.precioUnitario)) * linea.metrajeRequerido;
          facturaDescuentos += descuentoMonto;
        }

        lineasDetalle.push({
          metraje: linea.metrajeRequerido,
          precioUnitario: Number(linea.precioUnitario || 0),
          importe,
          lista: linea.listaPrecios || '—',
          comisionPct,
          comision: Math.round(comisionLinea * 100) / 100,
        });
      }

      const isPagada = order.metodoPagoCfdi === 'PUE' || order.estadoPago === 'PAGADA';

      vendorMap[vid].totalFacturado += facturaTotal;
      vendorMap[vid].totalDescuentos += facturaDescuentos;
      vendorMap[vid].totalComision += facturaComision;

      if (isPagada) {
        vendorMap[vid].comisionAprobada += facturaComision;
        vendorMap[vid].totalFacturasLiquidadas += 1;
      } else {
        vendorMap[vid].comisionPendienteCobro += facturaComision;
        vendorMap[vid].totalFacturasPendientes += 1;
      }

      vendorMap[vid].facturas.push({
        orderId: order.id,
        orderCode: order.codigo,
        clientName: order.client?.nombre || '—',
        clientCode: order.client?.codigo || '—',
        facturadaAt: order.facturadaAt,
        fechaPago: order.fechaPago,
        total: Number(order.total || 0),
        metodoPago: order.metodoPagoCfdi,
        estadoPago: order.estadoPago,
        isLiquidada: isPagada,
        comisionStatus: isPagada ? 'APROBADA' : 'PENDIENTE_PAGO',
        comisionFactura: Math.round(facturaComision * 100) / 100,
        lineas: lineasDetalle,
      });
    }

    // Convert to array and round
    const result = Object.values(vendorMap).map(v => ({
      ...v,
      totalFacturado: Math.round(v.totalFacturado * 100) / 100,
      totalDescuentos: Math.round(v.totalDescuentos * 100) / 100,
      totalComision: Math.round(v.totalComision * 100) / 100,
      comisionAprobada: Math.round(v.comisionAprobada * 100) / 100,
      comisionPendienteCobro: Math.round(v.comisionPendienteCobro * 100) / 100,
      requiereFacturaFiscal: true,
      fechaLimiteFactura: 'Día 5 del mes',
      fechaPagoComision: 'Día 10 del mes',
      politicaCobro: 'Mes trabajado = Mes cobrado (Facturas 100% liquidadas)',
    }));

    const granTotalFacturado = result.reduce((s, v) => s + v.totalFacturado, 0);
    const granTotalComisionDirecta = result.reduce((s, v) => s + v.totalComision, 0);
    const granTotalComisionAprobada = result.reduce((s, v) => s + v.comisionAprobada, 0);

    // Lista de vendedores disponibles para selector
    let vendedoresDisponibles: any[] = [];
    if (isManager) {
      vendedoresDisponibles = await this.prisma.vendor.findMany({
        where: { activo: true },
        select: { id: true, nombre: true, codigo: true, comision: true },
        orderBy: { nombre: 'asc' },
      });
    } else {
      vendedoresDisponibles = result.map(v => ({
        id: v.vendorId,
        nombre: v.vendorNombre,
        codigo: v.vendorCodigo,
        comision: v.comisionBaseVendor,
      }));
    }

    const response: any = {
      isManagerView: isManager,
      vendedoresDisponibles,
      data: result,
      totalVendedores: result.length,
      granTotalFacturado: Math.round(granTotalFacturado * 100) / 100,
      granTotalComision: Math.round(granTotalComisionDirecta * 100) / 100,
      granTotalComisionDirecta: Math.round(granTotalComisionDirecta * 100) / 100,
      granTotalComisionAprobada: Math.round(granTotalComisionAprobada * 100) / 100,
      politicaPago: {
        cortePeriodo: 'Último día del mes calendario',
        entregaFacturaFiscal: 'Día 5 del mes siguiente (CFDI de honorarios / comisiones)',
        pagoDispersado: 'Día 10 del mes siguiente',
        reglaMadre: 'Mes trabajado = Mes cobrado (exclusivamente facturas liquidadas al 100%)',
      },
    };

    // Jerarquía ejecutiva sólo visible para Dirección General y Gerencia Alta (nivel <= 1)
    if (isManager && ((userNivel != null && userNivel <= 1) || ['ADMIN', 'DIRECTOR_OPERACIONES', 'GERENCIA'].includes(userRole))) {
      const gerenciaOverridePct = 1.0;
      const gerenciaComision = Math.round(granTotalFacturado * (gerenciaOverridePct / 100) * 100) / 100;
      const direccionOverridePct = 0.5;
      const direccionComision = Math.round(granTotalFacturado * (direccionOverridePct / 100) * 100) / 100;

      response.jerarquia = {
        gerenciaVentas: {
          responsable: 'Santiago (Gerente Comercial)',
          porcentajeOverride: gerenciaOverridePct,
          baseCobrada: Math.round(granTotalFacturado * 100) / 100,
          comisionCalculada: gerenciaComision,
        },
        direccionComercial: {
          responsable: 'Mayra García (Dirección)',
          porcentajeOverride: direccionOverridePct,
          baseCobrada: Math.round(granTotalFacturado * 100) / 100,
          comisionCalculada: direccionComision,
        },
      };
    }

    return response;
  }

  // -----------------------------------------------------------------------
  // CRUD PERIODOS DE COMISIONES
  // -----------------------------------------------------------------------
  async listPeriods() {
    return this.prisma.commissionPeriod.findMany({
      orderBy: { fechaInicio: 'desc' },
    });
  }

  async createPeriod(data: {
    fechaInicio: string;
    fechaFin: string;
    creadoPor: string;
  }) {
    const codigo = this.generatePeriodCode(new Date(data.fechaInicio));
    return this.prisma.commissionPeriod.create({
      data: {
        codigo,
        fechaInicio: new Date(data.fechaInicio),
        fechaFin: new Date(data.fechaFin),
        creadoPor: data.creadoPor,
      },
    });
  }

  async closePeriod(periodId: string) {
    return this.prisma.commissionPeriod.update({
      where: { id: periodId },
      data: { estado: 'CERRADO', cerradoAt: new Date() },
    });
  }

  private generatePeriodCode(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const q = date.getDate() <= 15 ? 'Q1' : 'Q2';
    return `COM-${y}-${m}-${q}`;
  }
}
