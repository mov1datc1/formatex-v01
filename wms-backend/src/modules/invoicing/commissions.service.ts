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
    soloFacturasPagadas?: boolean;
  }) {
    const { vendorId, desde, hasta, soloFacturasPagadas = true } = params;

    // Build filter
    const where: any = {
      facturapiId: { not: null },
      facturaStatus: 'valid',
      vendorId: { not: null },
    };

    if (vendorId) where.vendorId = vendorId;

    // Date range filter on facturadaAt
    if (desde || hasta) {
      where.facturadaAt = {};
      if (desde) where.facturadaAt.gte = new Date(desde);
      if (hasta) where.facturadaAt.lte = new Date(hasta);
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

      vendorMap[vid].totalFacturado += facturaTotal;
      vendorMap[vid].totalDescuentos += facturaDescuentos;
      vendorMap[vid].totalComision += facturaComision;

      vendorMap[vid].facturas.push({
        orderId: order.id,
        orderCode: order.codigo,
        clientName: order.client?.nombre || '—',
        clientCode: order.client?.codigo || '—',
        facturadaAt: order.facturadaAt,
        total: Number(order.total || 0),
        metodoPago: order.metodoPagoCfdi,
        estadoPago: order.estadoPago,
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
    }));

    return {
      data: result,
      totalVendedores: result.length,
      granTotalFacturado: result.reduce((s, v) => s + v.totalFacturado, 0),
      granTotalComision: result.reduce((s, v) => s + v.totalComision, 0),
    };
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
