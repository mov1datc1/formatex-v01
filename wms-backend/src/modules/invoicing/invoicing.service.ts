import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

// Facturapi SDK — handle both ESM and CJS imports
let Facturapi: any;
try {
  const mod = require('facturapi');
  Facturapi = mod.default || mod;
} catch {
  // Will throw at runtime if used without installing
}

// =========================================================================
// CATÁLOGOS SAT
// =========================================================================

/** Formas de pago SAT (c_FormaPago) */
export const FORMAS_PAGO_SAT: Record<string, string> = {
  '01': 'Efectivo',
  '02': 'Cheque nominativo',
  '03': 'Transferencia electrónica',
  '04': 'Tarjeta de crédito',
  '06': 'Dinero electrónico',
  '28': 'Tarjeta de débito',
  '99': 'Por definir',
};

/** Métodos de pago SAT (c_MetodoPago) */
export const METODOS_PAGO_SAT: Record<string, string> = {
  PUE: 'Pago en una sola exhibición',
  PPD: 'Pago en parcialidades o diferido',
};

/** Usos del CFDI SAT (c_UsoCFDI) */
export const USOS_CFDI_SAT: Record<string, string> = {
  G01: 'Adquisición de mercancías',
  G03: 'Gastos en general',
  P01: 'Por definir',
  S01: 'Sin efectos fiscales',
};

/** Regímenes fiscales SAT (c_RegimenFiscal) */
export const REGIMENES_FISCALES_SAT: Record<string, string> = {
  '601': 'General de Ley Personas Morales',
  '603': 'Personas Morales con Fines no Lucrativos',
  '605': 'Sueldos y Salarios',
  '606': 'Arrendamiento',
  '608': 'Demás ingresos',
  '610': 'Residentes en el Extranjero sin EP',
  '612': 'Personas Físicas con Actividades Empresariales y Profesionales',
  '614': 'Ingresos por Intereses',
  '616': 'Sin obligaciones fiscales',
  '620': 'Sociedades Cooperativas de Producción',
  '621': 'Incorporación Fiscal',
  '622': 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
  '623': 'Opcional para Grupos de Sociedades',
  '624': 'Coordinados',
  '625': 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
  '626': 'Régimen Simplificado de Confianza',
};

// =========================================================================
// SERVICIO DE FACTURACIÓN
// =========================================================================

@Injectable()
export class InvoicingService {
  private readonly logger = new Logger(InvoicingService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // Helper: obtener instancia Facturapi con la API Key guardada en config
  // -----------------------------------------------------------------------
  private async getFacturapiClient() {
    if (!Facturapi) {
      throw new BadRequestException(
        'El paquete "facturapi" no está instalado. Ejecuta: npm install facturapi',
      );
    }

    const setting = await this.prisma.systemSetting.findUnique({
      where: { clave: 'facturapi_api_key' },
    });

    if (!setting?.valor) {
      throw new BadRequestException(
        'No se ha configurado la API Key de Facturapi. Ve a Config → Integraciones → Facturapi.',
      );
    }

    return new Facturapi(setting.valor);
  }

  // -----------------------------------------------------------------------
  // Helper: obtener datos fiscales del emisor (empresa)
  // -----------------------------------------------------------------------
  private async getEmisorConfig() {
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        clave: {
          in: [
            'empresa_rfc',
            'empresa_nombre',
            'empresa_regimen_fiscal',
            'empresa_cp_fiscal',
          ],
        },
      },
    });
    const map: Record<string, string> = {};
    settings.forEach((s) => (map[s.clave] = s.valor));
    return map;
  }

  // -----------------------------------------------------------------------
  // Validar conexión con Facturapi
  // -----------------------------------------------------------------------
  async testConnection(): Promise<{ ok: boolean; organization?: any; error?: string }> {
    try {
      const facturapi = await this.getFacturapiClient();
      const org = await facturapi.organizations.list();
      return { ok: true, organization: org?.data?.[0] || null };
    } catch (err: any) {
      return { ok: false, error: err.message || 'Error de conexión' };
    }
  }

  // -----------------------------------------------------------------------
  // CREAR FACTURA (CFDI de Ingreso)
  // -----------------------------------------------------------------------
  async createInvoice(
    orderId: string,
    options?: {
      formaPago?: string;    // "01", "03", "99", etc.
      metodoPago?: string;   // "PUE" o "PPD"
      usoCfdi?: string;      // "G01", "G03", etc.
      condicionesPago?: string; // "Crédito 30 días", etc.
    },
  ) {
    // 1. Obtener pedido completo
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        lineas: {
          include: {
            assignments: {
              include: {
                hu: { include: { sku: true } },
              },
            },
          },
        },
      },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');

    // Validar estado
    if (order.estado !== 'EMPACADO') {
      throw new BadRequestException(
        `Solo se pueden facturar pedidos en estado EMPACADO. Estado actual: ${order.estado}`,
      );
    }

    // Validar que no esté ya facturado
    if (order.facturapiId) {
      throw new BadRequestException(
        `Este pedido ya tiene factura: ${order.uuidFiscal || order.facturapiId}`,
      );
    }

    // Validar datos fiscales del cliente
    const client = order.client as any;
    if (!client?.rfc) {
      throw new BadRequestException(
        `El cliente "${client?.nombre}" no tiene RFC registrado. Actualiza sus datos fiscales.`,
      );
    }
    if (!client?.cp) {
      throw new BadRequestException(
        `El cliente "${client?.nombre}" no tiene Código Postal registrado. Requerido para CFDI 4.0.`,
      );
    }

    // 2. Determinar método y forma de pago
    //    - Si el pedido ya fue pagado (PAGO_RECIBIDO/POR_SURTIR): PUE + forma de pago real
    //    - Si es crédito: PPD + forma "99 Por definir"
    const metodoPago = options?.metodoPago || 'PUE';
    let formaPago = options?.formaPago || '03'; // Default: transferencia

    if (metodoPago === 'PPD') {
      // Crédito → forma de pago siempre "99 Por definir"
      formaPago = '99';
    }

    const usoCfdi = options?.usoCfdi || client.usoCfdi || 'G03';

    // 3. Construir items de la factura
    const items = (order as any).lineas.map((linea: any) => {
      // Obtener nombre del SKU desde las asignaciones
      const skuName =
        linea.assignments?.[0]?.hu?.sku?.nombre || 'Tela';
      const skuColor =
        linea.assignments?.[0]?.hu?.sku?.color || '';

      const description = skuColor
        ? `${skuName} - ${skuColor}`
        : skuName;

      return {
        quantity: linea.metrajeRequerido,
        product: {
          description,
          product_key: '52121500', // Clave SAT: Telas, fibras textiles
          price: Number(linea.precioUnitario || 0),
          unit_key: 'MTR', // Metro
          unit_name: 'Metro',
          tax_included: false,
          taxes: [
            {
              type: 'IVA',
              rate: 0.16,
            },
          ],
        },
      };
    });

    // 4. Llamar a Facturapi
    try {
      const facturapi = await this.getFacturapiClient();

      const invoicePayload: any = {
        customer: {
          legal_name: client.nombre,
          tax_id: client.rfc,
          tax_system: client.regimenFiscal || '601',
          address: {
            zip: client.cp,
          },
        },
        items,
        payment_form: formaPago,
        payment_method: metodoPago,
        use: usoCfdi,
        folio_number: parseInt(order.codigo.replace(/\D/g, ''), 10) || undefined,
        series: 'WMS',
      };

      // Condiciones de pago (para crédito)
      if (metodoPago === 'PPD' && options?.condicionesPago) {
        invoicePayload.conditions = options.condicionesPago;
      }

      this.logger.log(`Creando factura para pedido ${order.codigo}...`);

      const invoice = await facturapi.invoices.create(invoicePayload);

      this.logger.log(
        `✅ Factura creada: UUID=${invoice.uuid} | ID=${invoice.id}`,
      );

      // 5. Actualizar orden en DB
      const updated = await this.prisma.order.update({
        where: { id: orderId },
        data: {
          estado: 'FACTURADO',
          facturaLista: true,
          facturapiId: invoice.id,
          uuidFiscal: invoice.uuid,
          facturaSerie: invoice.series || 'WMS',
          facturaFolio: String(invoice.folio_number || ''),
          facturaStatus: invoice.status || 'valid',
          facturadaAt: new Date(),
          // URLs de descarga (Facturapi genera automáticamente)
          facturaXmlUrl: `facturapi://${invoice.id}/xml`,
          facturaPdfUrl: `facturapi://${invoice.id}/pdf`,
        },
      });

      return {
        success: true,
        orderId: updated.id,
        orderCode: updated.codigo,
        invoiceId: invoice.id,
        uuid: invoice.uuid,
        series: invoice.series,
        folio: invoice.folio_number,
        status: invoice.status,
        total: invoice.total,
        metodoPago,
        formaPago: FORMAS_PAGO_SAT[formaPago] || formaPago,
      };
    } catch (err: any) {
      this.logger.error(`Error al crear factura: ${err.message}`, err.stack);

      // Facturapi devuelve errores descriptivos
      const detail =
        err?.response?.data?.message ||
        err?.message ||
        'Error desconocido al timbrar';

      throw new BadRequestException(`Error al timbrar CFDI: ${detail}`);
    }
  }

  // -----------------------------------------------------------------------
  // OBTENER FACTURA de un pedido
  // -----------------------------------------------------------------------
  async getInvoice(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { client: { select: { nombre: true, rfc: true } } },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');

    if (!order.facturapiId) {
      return { hasInvoice: false, order };
    }

    return {
      hasInvoice: true,
      invoiceId: order.facturapiId,
      uuid: order.uuidFiscal,
      serie: order.facturaSerie,
      folio: order.facturaFolio,
      status: order.facturaStatus,
      facturadaAt: order.facturadaAt,
      total: order.total,
      client: (order as any).client,
      orderCode: order.codigo,
    };
  }

  // -----------------------------------------------------------------------
  // DESCARGAR PDF
  // -----------------------------------------------------------------------
  async downloadPdf(orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order?.facturapiId) {
      throw new NotFoundException('Este pedido no tiene factura');
    }

    const facturapi = await this.getFacturapiClient();
    const stream = await facturapi.invoices.downloadPdf(order.facturapiId);

    // Convert stream to buffer
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // -----------------------------------------------------------------------
  // DESCARGAR XML
  // -----------------------------------------------------------------------
  async downloadXml(orderId: string): Promise<Buffer> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order?.facturapiId) {
      throw new NotFoundException('Este pedido no tiene factura');
    }

    const facturapi = await this.getFacturapiClient();
    const stream = await facturapi.invoices.downloadXml(order.facturapiId);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // -----------------------------------------------------------------------
  // ENVIAR POR EMAIL
  // -----------------------------------------------------------------------
  async sendByEmail(orderId: string, email: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order?.facturapiId) {
      throw new NotFoundException('Este pedido no tiene factura');
    }

    const facturapi = await this.getFacturapiClient();
    await facturapi.invoices.sendByEmail(order.facturapiId, { email });

    return { success: true, email, uuid: order.uuidFiscal };
  }

  // -----------------------------------------------------------------------
  // CANCELAR FACTURA
  // -----------------------------------------------------------------------
  async cancelInvoice(
    orderId: string,
    motive: '01' | '02' | '03' | '04',
    substitution?: string,
  ) {
    // Motivos SAT:
    // 01 = Comprobante emitido con errores con relación
    // 02 = Comprobante emitido con errores sin relación
    // 03 = No se llevó a cabo la operación
    // 04 = Operación nominativa relacionada con factura global

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order?.facturapiId) {
      throw new NotFoundException('Este pedido no tiene factura');
    }

    const facturapi = await this.getFacturapiClient();
    const result = await facturapi.invoices.cancel(order.facturapiId, {
      motive,
      substitution,
    });

    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        facturaStatus: 'canceled',
        // No cambiamos el estado del pedido — queda en FACTURADO pero con factura cancelada
        // El operador puede re-facturar
        facturapiId: null,
        uuidFiscal: null,
      },
    });

    return { success: true, cancelResult: result };
  }

  // -----------------------------------------------------------------------
  // HISTORIAL DE FACTURAS (todas las órdenes facturadas/canceladas)
  // -----------------------------------------------------------------------
  async getInvoiceHistory(params: {
    search?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      facturapiId: { not: null },
    };

    if (status === 'valid') {
      where.facturaStatus = 'valid';
    } else if (status === 'canceled') {
      where.facturaStatus = 'canceled';
    }

    if (search) {
      where.OR = [
        { uuidFiscal: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { facturaFolio: { contains: search, mode: 'insensitive' } },
        { client: { nombre: { contains: search, mode: 'insensitive' } } },
        { client: { rfc: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { facturadaAt: 'desc' },
        select: {
          id: true,
          codigo: true,
          facturapiId: true,
          uuidFiscal: true,
          facturaSerie: true,
          facturaFolio: true,
          facturaStatus: true,
          facturadaAt: true,
          total: true,
          subtotal: true,
          iva: true,
          metodoPago: true,
          estado: true,
          client: {
            select: { nombre: true, rfc: true, codigo: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // -----------------------------------------------------------------------
  // CATÁLOGOS SAT (para dropdowns del frontend)
  // -----------------------------------------------------------------------
  getCatalogos() {
    return {
      formasPago: FORMAS_PAGO_SAT,
      metodosPago: METODOS_PAGO_SAT,
      usosCfdi: USOS_CFDI_SAT,
      regimenesFiscales: REGIMENES_FISCALES_SAT,
    };
  }
}
