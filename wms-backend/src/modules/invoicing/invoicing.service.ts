import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as nodemailer from 'nodemailer';

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
      // Use invoices.list (works with org keys) instead of organizations.list (requires user key)
      const result = await facturapi.invoices.list({ limit: 1 });
      return {
        ok: true,
        organization: {
          name: `Conexión OK — ${result.total_results ?? 0} facturas en la cuenta`,
        },
      };
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

      // 5. Actualizar orden en DB — incluir campos PPD si aplica
      const isPPD = metodoPago === 'PPD';
      const orderTotal = Number(order.total || 0);

      // Calcular plazo y fecha de vencimiento para PPD
      let plazoDias: number | null = null;
      let fechaVencimiento: Date | null = null;
      if (isPPD) {
        // Extraer plazo de condiciones de pago (e.g. "Crédito 30 días" → 30)
        const plazoMatch = options?.condicionesPago?.match(/(\d+)/);
        plazoDias = plazoMatch ? parseInt(plazoMatch[1], 10) : 30;
        fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + plazoDias);
      }

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
          // URLs de descarga
          facturaXmlUrl: `facturapi://${invoice.id}/xml`,
          facturaPdfUrl: `facturapi://${invoice.id}/pdf`,
          // PPD fields
          metodoPagoCfdi: metodoPago,
          saldoPendiente: isPPD ? orderTotal : 0,
          estadoPago: isPPD ? 'PENDIENTE' : 'NA',
          plazoDias,
          fechaVencimiento,
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
  // DESCARGAR COMPLEMENTO PDF/XML (por Facturapi ID del complemento)
  // -----------------------------------------------------------------------
  async downloadComplementFile(complementFacturapiId: string, type: 'pdf' | 'xml'): Promise<Buffer> {
    const facturapi = await this.getFacturapiClient();
    const stream = type === 'pdf'
      ? await facturapi.invoices.downloadPdf(complementFacturapiId)
      : await facturapi.invoices.downloadXml(complementFacturapiId);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }

  // -----------------------------------------------------------------------
  // LISTAR COMPLEMENTOS EMITIDOS
  // -----------------------------------------------------------------------
  async listComplements(search?: string, clientId?: string) {
    const where: any = {
      complementoFacturapiId: { not: null },
    };
    if (clientId) {
      where.order = { clientId };
    }
    if (search) {
      where.OR = [
        { complementoUuid: { contains: search, mode: 'insensitive' } },
        { order: { codigo: { contains: search, mode: 'insensitive' } } },
        { order: { client: { nombre: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    const payments = await this.prisma.invoicePayment.findMany({
      where,
      orderBy: { complementoEmitidoAt: 'desc' },
      include: {
        order: {
          include: {
            client: { select: { nombre: true, rfc: true, codigo: true } },
          },
        },
      },
    });

    return payments.map(p => ({
      id: p.id,
      orderId: p.orderId,
      orderCode: p.order.codigo,
      clientName: p.order.client?.nombre || '—',
      clientRfc: p.order.client?.rfc || '—',
      facturaUuid: p.order.uuidFiscal,
      complementoFacturapiId: p.complementoFacturapiId,
      complementoUuid: p.complementoUuid,
      complementoStatus: p.complementoStatus,
      complementoEmitidoAt: p.complementoEmitidoAt,
      monto: p.monto,
      montoAplicado: p.montoAplicado,
      formaPago: p.formaPago,
    }));
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
    metodoPago?: string;
    clientId?: string;
    page?: number;
    limit?: number;
  }) {
    const { search, status, metodoPago, clientId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;

    const where: any = {
      facturapiId: { not: null },
    };

    if (clientId) {
      where.clientId = clientId;
    }

    if (status === 'valid') {
      where.facturaStatus = 'valid';
    } else if (status === 'canceled') {
      where.facturaStatus = 'canceled';
    }

    if (metodoPago) {
      where.metodoPagoCfdi = metodoPago;
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
          metodoPagoCfdi: true,
          estadoPago: true,
          saldoPendiente: true,
          plazoDias: true,
          fechaVencimiento: true,
          estado: true,
          client: {
            select: { nombre: true, rfc: true, codigo: true },
          },
          vendor: {
            select: { nombre: true, codigo: true },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  // -----------------------------------------------------------------------
  // REGISTRAR PAGO (1 o múltiples facturas PPD)
  // -----------------------------------------------------------------------
  async registerPayment(data: {
    orderIds: string[];
    monto: number;
    formaPago: string;
    fechaPago?: string;
    referencia?: string;
    evidenciaUrl?: string;
    registradoPor: string;
    notas?: string;
    emitirComplemento?: boolean;
  }) {
    const { orderIds, monto, formaPago, fechaPago, referencia, evidenciaUrl, registradoPor, notas } = data;
    const paymentDate = fechaPago ? new Date(fechaPago) : new Date();

    // Validate orders exist and are PPD
    const orders = await this.prisma.order.findMany({
      where: { id: { in: orderIds }, facturapiId: { not: null } },
      include: { client: { select: { nombre: true, rfc: true } } },
    });

    if (orders.length === 0) {
      throw new BadRequestException('No se encontraron facturas válidas');
    }

    // Calculate how to distribute payment across invoices (FIFO - oldest first)
    const sortedOrders = orders.sort((a, b) =>
      (a.facturadaAt?.getTime() || 0) - (b.facturadaAt?.getTime() || 0),
    );

    let remaining = monto;
    const pagoGrupoId = crypto.randomUUID();
    const payments: any[] = [];

    for (const order of sortedOrders) {
      if (remaining <= 0) break;

      const saldo = Number(order.saldoPendiente || order.total || 0);
      if (saldo <= 0) continue;

      const aplicado = Math.min(remaining, saldo);
      remaining -= aplicado;

      // Create payment record
      const payment = await this.prisma.invoicePayment.create({
        data: {
          orderId: order.id,
          monto,
          montoAplicado: aplicado,
          formaPago,
          referenciaPago: referencia,
          fechaPago: paymentDate,
          pagoGrupoId,
          registradoPor,
          notas,
          evidenciaUrl,
        },
      });

      // Update order balance con regla César de absorción/redondeo (±$10.00 MXN)
      let remanente = Math.max(0, saldo - aplicado);
      if (remanente > 0 && remanente <= 10.00) {
        this.logger.log(`⚙️ Tolerancia de redondeo aplicada (César): Remanente residual de $${remanente.toFixed(2)} MXN absorbido. Factura liquidada.`);
        remanente = 0;
      }
      const nuevoSaldo = remanente;
      const nuevoEstado = nuevoSaldo <= 0 ? 'PAGADA' : 'PARCIAL';

      await this.prisma.order.update({
        where: { id: order.id },
        data: {
          saldoPendiente: nuevoSaldo,
          estadoPago: nuevoEstado,
        },
      });

      payments.push({
        paymentId: payment.id,
        orderId: order.id,
        orderCode: order.codigo,
        montoAplicado: aplicado,
        saldoAnterior: saldo,
        saldoNuevo: nuevoSaldo,
        estadoPago: nuevoEstado,
      });

      this.logger.log(`💰 Pago registrado: ${order.codigo} — $${aplicado} aplicado, saldo: $${nuevoSaldo} (${nuevoEstado})`);
    }

    return {
      success: true,
      pagoGrupoId,
      montoTotal: monto,
      montoAplicado: monto - remaining,
      montoSobrante: remaining,
      payments,
    };
  }

  // -----------------------------------------------------------------------
  // EMITIR COMPLEMENTO DE PAGO CFDI (tipo P) via Facturapi
  // -----------------------------------------------------------------------
  async emitPaymentComplement(pagoGrupoId: string) {
    const payments = await this.prisma.invoicePayment.findMany({
      where: { pagoGrupoId, complementoFacturapiId: null },
      include: {
        order: {
          include: { client: true },
        },
      },
    });

    if (payments.length === 0) {
      throw new BadRequestException('No hay pagos pendientes de complemento para este grupo');
    }

    // Regla Fiscal SAT Anexo 20 (César): Las facturas PUE están pagadas por definición y NO llevan REP
    const puePayments = payments.filter((p) => p.order.metodoPagoCfdi === 'PUE');
    if (puePayments.length > 0) {
      throw new BadRequestException(
        `Regla Fiscal SAT: Las facturas PUE (${puePayments.map((p) => p.order.codigo).join(', ')}) no deben llevar Complemento de Pago (REP). Los pagos en PUE son registros internos.`
      );
    }

    const missingUuid = payments.filter((p) => !p.order.uuidFiscal);
    if (missingUuid.length > 0) {
      throw new BadRequestException(
        `Las facturas (${missingUuid.map((p) => p.order.codigo).join(', ')}) no cuentan con UUID Fiscal timbrado aún.`
      );
    }

    const facturapi = await this.getFacturapiClient();
    const client = payments[0].order.client as any;

    // Build related documents
    const relatedDocs = payments.map((p, idx) => ({
      uuid: p.order.uuidFiscal!,
      amount: Number(p.montoAplicado),
      installment: idx + 1,
      last_balance: Number(p.order.saldoPendiente || 0) + Number(p.montoAplicado),
      taxes: [{ type: 'IVA', rate: 0.16, base: Math.round(Number(p.montoAplicado) / 1.16 * 100) / 100 }],
    }));

    try {
      const complementPayload = {
        type: 'P',
        customer: {
          legal_name: client.nombre,
          tax_id: client.rfc,
          tax_system: client.regimenFiscal || '601',
          address: { zip: client.cp || '44870' },
        },
        complements: [{
          type: 'pago',
          data: [{
            payment_form: payments[0].formaPago,
            related_documents: relatedDocs,
          }],
        }],
      };

      const complement = await facturapi.invoices.create(complementPayload);

      this.logger.log(`✅ Complemento de pago emitido: UUID=${complement.uuid}`);

      // Update all payments with complement info
      await this.prisma.invoicePayment.updateMany({
        where: { pagoGrupoId },
        data: {
          complementoFacturapiId: complement.id,
          complementoUuid: complement.uuid,
          complementoStatus: complement.status || 'valid',
          complementoEmitidoAt: new Date(),
        },
      });

      return {
        success: true,
        complementId: complement.id,
        uuid: complement.uuid,
        status: complement.status,
        documentsRelated: payments.length,
      };
    } catch (err: any) {
      this.logger.error(`Error al emitir complemento: ${err.message}`, err.stack);
      throw new BadRequestException(`Error al emitir complemento de pago: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // EMITIR COMPLEMENTO POR ORDER ID (busca pagos de esa orden)
  // -----------------------------------------------------------------------
  async emitComplementByOrder(orderId: string) {
    // Find any payments for this order that don't have a complement yet
    const payments = await this.prisma.invoicePayment.findMany({
      where: { orderId, complementoFacturapiId: null },
    });

    if (payments.length > 0) {
      // Use the first payment's groupId to emit complement
      return this.emitPaymentComplement(payments[0].pagoGrupoId!);
    }

    // No InvoicePayment records — the order was paid via the "Registrar Pago" 
    // flow in Cobranza which updated saldoPendiente directly.
    // We need to create an InvoicePayment record first, then emit the complement.
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { client: true },
    });

    if (!order) throw new NotFoundException('Pedido no encontrado');
    if (!order.uuidFiscal) throw new BadRequestException('Este pedido no tiene factura emitida');
    if (order.metodoPagoCfdi === 'PUE') {
      throw new BadRequestException('Regla Fiscal SAT: Las facturas PUE amparan operaciones de contado y no deben llevar Complemento de Pago (REP).');
    }
    if (order.estadoPago !== 'PAGADA') throw new BadRequestException('La factura no está completamente pagada aún');

    const client = order.client as any;
    if (!client?.rfc) throw new BadRequestException('El cliente no tiene RFC registrado');

    // Emit complement directly via Facturapi
    const facturapi = await this.getFacturapiClient();
    const totalPagado = Number(order.total || 0);

    try {
      const complementPayload = {
        type: 'P',
        customer: {
          legal_name: client.nombre,
          tax_id: client.rfc,
          tax_system: client.regimenFiscal || '601',
          address: { zip: client.cp || '44870' },
        },
        complements: [{
          type: 'pago',
          data: [{
            payment_form: '03',
            date: new Date().toISOString(),
            related_documents: [{
              uuid: order.uuidFiscal,
              amount: totalPagado,
              installment: 1,
              last_balance: totalPagado,
              taxes: [{
                type: 'IVA',
                rate: 0.16,
                base: Math.round((totalPagado / 1.16) * 100) / 100,
              }],
            }],
          }],
        }],
      };

      const complement = await facturapi.invoices.create(complementPayload);
      this.logger.log(`✅ Complemento emitido para orden ${order.codigo}: UUID=${complement.uuid}`);

      // Create the InvoicePayment record
      const grupoId = `CPL-${Date.now()}`;
      await this.prisma.invoicePayment.create({
        data: {
          orderId,
          pagoGrupoId: grupoId,
          monto: totalPagado,
          montoAplicado: totalPagado,
          formaPago: '03',
          fechaPago: new Date(),
          registradoPor: 'system',
          complementoFacturapiId: complement.id,
          complementoUuid: complement.uuid,
          complementoStatus: complement.status || 'valid',
          complementoEmitidoAt: new Date(),
        },
      });

      return {
        success: true,
        complementId: complement.id,
        complementUuid: complement.uuid,
        status: complement.status,
        total: totalPagado,
      };
    } catch (err: any) {
      this.logger.error(`Error al emitir complemento: ${err.message}`, err.stack);
      throw new BadRequestException(`Error al emitir complemento: ${err.message}`);
    }
  }

  // -----------------------------------------------------------------------
  // ESTADO DE CUENTA DEL CLIENTE
  // -----------------------------------------------------------------------
  async getClientStatement(clientId: string, params?: { desde?: string; hasta?: string }) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { creditConfig: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const where: any = { clientId, facturapiId: { not: null } };
    if (params?.desde || params?.hasta) {
      where.facturadaAt = {};
      if (params?.desde) where.facturadaAt.gte = new Date(params.desde);
      if (params?.hasta) where.facturadaAt.lte = new Date(params.hasta);
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        payments: { orderBy: { fechaPago: 'desc' } },
        vendor: { select: { nombre: true } },
      },
      orderBy: { facturadaAt: 'desc' },
    });

    const totalFacturado = orders.reduce((s, o) => s + Number(o.total || 0), 0);
    const totalPendiente = orders
      .filter(o => o.estadoPago === 'PENDIENTE' || o.estadoPago === 'PARCIAL')
      .reduce((s, o) => s + Number(o.saldoPendiente || 0), 0);
    const totalPagado = totalFacturado - totalPendiente;

    const vencidas = orders.filter(o =>
      (o.estadoPago === 'PENDIENTE' || o.estadoPago === 'PARCIAL') &&
      o.fechaVencimiento && o.fechaVencimiento < new Date()
    );

    return {
      client: {
        id: client.id,
        nombre: client.nombre,
        codigo: client.codigo,
        rfc: client.rfc,
      },
      creditConfig: client.creditConfig,
      resumen: {
        totalFacturado: Math.round(totalFacturado * 100) / 100,
        totalPagado: Math.round(totalPagado * 100) / 100,
        totalPendiente: Math.round(totalPendiente * 100) / 100,
        facturasTotal: orders.length,
        facturasPendientes: orders.filter(o => o.estadoPago === 'PENDIENTE' || o.estadoPago === 'PARCIAL').length,
        facturasVencidas: vencidas.length,
      },
      facturas: orders.map(o => ({
        id: o.id,
        codigo: o.codigo,
        uuid: o.uuidFiscal,
        facturadaAt: o.facturadaAt,
        total: Number(o.total || 0),
        saldoPendiente: Number(o.saldoPendiente || 0),
        metodoPago: o.metodoPagoCfdi,
        estadoPago: o.estadoPago,
        plazoDias: o.plazoDias,
        fechaVencimiento: o.fechaVencimiento,
        vencida: o.fechaVencimiento ? o.fechaVencimiento < new Date() : false,
        vendedor: o.vendor?.nombre || '—',
        pagos: o.payments.map(p => ({
          id: p.id,
          monto: Number(p.montoAplicado),
          formaPago: p.formaPago,
          referencia: p.referenciaPago,
          fecha: p.fechaPago,
          complementoUuid: p.complementoUuid,
        })),
      })),
    };
  }

  // -----------------------------------------------------------------------
  // FACTURAS PENDIENTES DE UN CLIENTE
  // -----------------------------------------------------------------------
  async getClientPendingInvoices(clientId: string) {
    return this.prisma.order.findMany({
      where: {
        clientId,
        facturapiId: { not: null },
        estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
      },
      select: {
        id: true,
        codigo: true,
        uuidFiscal: true,
        total: true,
        saldoPendiente: true,
        estadoPago: true,
        plazoDias: true,
        fechaVencimiento: true,
        facturadaAt: true,
      },
      orderBy: { facturadaAt: 'asc' }, // FIFO
    });
  }

  // -----------------------------------------------------------------------
  // DASHBOARD PPD — Vista general de cobranza
  // -----------------------------------------------------------------------
  async getPPDDashboard() {
    const now = new Date();
    const endOfWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [pendientes, parciales, porVencer, vencidas, cobradoMes] = await Promise.all([
      // Total pendientes
      this.prisma.order.aggregate({
        where: { estadoPago: 'PENDIENTE', facturapiId: { not: null } },
        _sum: { saldoPendiente: true },
        _count: true,
      }),
      // Parcialmente pagadas
      this.prisma.order.aggregate({
        where: { estadoPago: 'PARCIAL', facturapiId: { not: null } },
        _sum: { saldoPendiente: true },
        _count: true,
      }),
      // Por vencer esta semana
      this.prisma.order.aggregate({
        where: {
          estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
          fechaVencimiento: { gte: now, lte: endOfWeek },
        },
        _sum: { saldoPendiente: true },
        _count: true,
      }),
      // Vencidas
      this.prisma.order.aggregate({
        where: {
          estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
          fechaVencimiento: { lt: now },
        },
        _sum: { saldoPendiente: true },
        _count: true,
      }),
      // Cobrado este mes
      this.prisma.invoicePayment.aggregate({
        where: {
          fechaPago: {
            gte: new Date(now.getFullYear(), now.getMonth(), 1),
          },
        },
        _sum: { montoAplicado: true },
        _count: true,
      }),
    ]);

    return {
      pendientes: {
        count: pendientes._count,
        monto: Number(pendientes._sum.saldoPendiente || 0),
      },
      parciales: {
        count: parciales._count,
        monto: Number(parciales._sum.saldoPendiente || 0),
      },
      porVencerSemana: {
        count: porVencer._count,
        monto: Number(porVencer._sum.saldoPendiente || 0),
      },
      vencidas: {
        count: vencidas._count,
        monto: Number(vencidas._sum.saldoPendiente || 0),
      },
      cobradoMes: {
        count: cobradoMes._count,
        monto: Number(cobradoMes._sum.montoAplicado || 0),
      },
    };
  }

  // -----------------------------------------------------------------------
  // CARTERA DE CLIENTES DISGREGADA (Agrupación de saldos por cliente)
  // -----------------------------------------------------------------------
  async getCarteraPorCliente() {
    const orders = await this.prisma.order.findMany({
      where: {
        facturapiId: { not: null },
        estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
      },
      include: {
        client: {
          select: {
            id: true,
            codigo: true,
            nombre: true,
            rfc: true,
            telefono: true,
            creditConfig: true,
          },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    const clientMap = new Map<string, any>();
    const now = new Date();

    for (const o of orders) {
      if (!o.client) continue;
      const cId = o.clientId!;
      if (!clientMap.has(cId)) {
        clientMap.set(cId, {
          client: o.client,
          totalPendiente: 0,
          facturasCount: 0,
          vencidasCount: 0,
          montoVencido: 0,
          facturas: [],
        });
      }
      const entry = clientMap.get(cId);
      const saldo = Number(o.saldoPendiente || 0);
      const isVencida = o.fechaVencimiento ? new Date(o.fechaVencimiento) < now : false;

      entry.totalPendiente += saldo;
      entry.facturasCount += 1;
      if (isVencida) {
        entry.vencidasCount += 1;
        entry.montoVencido += saldo;
      }
      entry.facturas.push({
        id: o.id,
        codigo: o.codigo,
        total: Number(o.total || 0),
        saldoPendiente: saldo,
        fechaVencimiento: o.fechaVencimiento,
        facturadaAt: o.facturadaAt,
        isVencida,
      });
    }

    return Array.from(clientMap.values()).sort((a, b) => b.totalPendiente - a.totalPendiente);
  }

  // -----------------------------------------------------------------------
  // COBRANZA PREVENTIVA: ALERTA DE VENCIMIENTO A 5 DÍAS (César / Andrea)
  // -----------------------------------------------------------------------
  async getPreventiveAlerts() {
    const now = new Date();
    // Vencimiento dentro de los próximos 5 días naturales (y facturas por vencer o recién vencidas)
    const in5Days = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);

    const orders = await this.prisma.order.findMany({
      where: {
        metodoPagoCfdi: 'PPD',
        estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
        saldoPendiente: { gt: 0 },
        fechaVencimiento: {
          lte: in5Days,
        },
        estado: { notIn: ['CANCELADO'] },
      },
      include: {
        client: {
          select: {
            id: true,
            nombre: true,
            rfc: true,
            email: true,
            telefono: true,
            contacto: true,
          },
        },
        vendor: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
          },
        },
      },
      orderBy: { fechaVencimiento: 'asc' },
    });

    return orders.map((o) => {
      const vDate = o.fechaVencimiento ? new Date(o.fechaVencimiento) : null;
      const diffDays = vDate
        ? Math.ceil((vDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      return {
        id: o.id,
        codigo: o.codigo,
        folioContpaqi: o.folioContpaqi,
        facturaRef: o.facturaRef,
        uuidFiscal: o.uuidFiscal,
        cliente: o.client,
        vendedor: o.vendor,
        totalFactura: Number(o.total || 0),
        saldoPendiente: Number(o.saldoPendiente || 0),
        fechaVencimiento: o.fechaVencimiento,
        diasParaVencer: diffDays,
        esVencida: diffDays < 0,
        alerta5DiasEnviada: o.alerta5DiasEnviada,
        alerta5DiasAt: o.alerta5DiasAt,
      };
    });
  }

  private async buildPreventiveEmailData(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        client: true,
        vendor: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Pedido ${orderId} no encontrado`);
    }

    if (order.metodoPagoCfdi !== 'PPD') {
      throw new BadRequestException('Solo se pueden enviar recordatorios preventivos a facturas PPD a crédito');
    }

    const destinatarioEmail = order.client?.email?.trim();
    if (!destinatarioEmail) {
      throw new BadRequestException(
        `El cliente '${order.client?.nombre || 'Desconocido'}' no cuenta con un correo electrónico registrado en su ficha comercial.`
      );
    }

    const now = new Date();
    const vDate = order.fechaVencimiento ? new Date(order.fechaVencimiento) : new Date();
    const diffDays = Math.max(0, Math.ceil((vDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
    const folioFactura = order.facturaRef || order.folioContpaqi || order.codigo;
    const montoInsoluto = `$${Number(order.saldoPendiente || order.total || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
    const fechaVencimientoFormatted = vDate.toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    const nombreCliente = order.client?.nombre || 'Estimado Cliente';
    const agenteVentas = order.vendor?.nombre || 'tu asesor comercial';

    // Obtener datos bancarios oficiales y correo de cobranza de SystemSetting
    const settings = await this.prisma.systemSetting.findMany({
      where: {
        clave: {
          in: [
            'banco_beneficiario',
            'banco_nombre',
            'banco_cuenta',
            'banco_clabe',
            'empresa_email_cobranza',
            'cotizacion_email_comprobantes',
          ],
        },
      },
    });
    const settingsMap = Object.fromEntries(settings.map((s) => [s.clave, s.valor]));
    const beneficiario = settingsMap['banco_beneficiario'] || 'FORMA TEXTIL S. DE R.L. DE C.V.';
    const bancoNombre = settingsMap['banco_nombre'] || 'BBVA México';
    const bancoCuenta = settingsMap['banco_cuenta'] || '0114 8592 31';
    const bancoClabe = settingsMap['banco_clabe'] || '0123 2000 1148 5923 18';
    const emailCobranza =
      settingsMap['empresa_email_cobranza'] || settingsMap['cotizacion_email_comprobantes'] || 'cobranza@formatex.mx';

    const subject = `Recordatorio Preventivo: Tu Factura ${folioFactura} está próxima a vencer - Formatex`;
    const emailBody = `Estimado(a) ${nombreCliente},

Esperamos que te encuentres excelente. En Formatex valoramos enormemente tu preferencia y queremos apoyarte para mantener tu cuenta al corriente y asegurar que tus pedidos futuros y disponibilidad de telas se procesen con la máxima agilidad.

Te recordamos que tu factura ${folioFactura}, con un saldo pendiente de ${montoInsoluto} MXN, tiene fecha límite de vencimiento el próximo ${fechaVencimientoFormatted} (quedan ${diffDays} días naturales).

DATOS DE PAGO:
• Beneficiario: ${beneficiario}
• Banco: ${bancoNombre} | Cuenta: ${bancoCuenta} | CLABE: ${bancoClabe}
• Referencia: ${order.codigo} / ${folioFactura}

Una vez realizado tu depósito o transferencia, te agradeceremos compartir el comprobante al correo ${emailCobranza} o a través de tu asesor comercial ${agenteVentas} para aplicar tu pago de inmediato y emitir tu Complemento de Pago (REP).

Agradecemos de antemano tu puntualidad y quedamos a tus órdenes.

Atentamente,
Departamento de Crédito y Cobranza
Forma Textil S. de R.L. de C.V. | Guadalajara, Jalisco`;

    const emailHtml = `
<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 620px; margin: 0 auto; padding: 24px; color: #1e293b; background-color: #f8fafc; border-radius: 12px;">
  <div style="background: linear-gradient(135deg, #1e3a8a, #3b82f6); padding: 24px; border-radius: 10px; color: #ffffff; text-align: center;">
    <h1 style="margin: 0; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">FORMA TEXTIL</h1>
    <p style="margin: 6px 0 0 0; font-size: 13px; opacity: 0.9;">Departamento de Crédito y Cobranza</p>
  </div>
  
  <div style="background-color: #ffffff; padding: 28px; border-radius: 10px; margin-top: 18px; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
    <h2 style="font-size: 18px; color: #0f172a; margin-top: 0;">Recordatorio Preventivo de Vencimiento</h2>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">Estimado(a) <strong>${nombreCliente}</strong>,</p>
    <p style="font-size: 14px; line-height: 1.6; color: #334155;">Esperamos que te encuentres excelente. En Formatex valoramos enormemente tu preferencia y queremos apoyarte para mantener tu cuenta al corriente y asegurar que tus pedidos futuros y disponibilidad de telas se procesen con la máxima agilidad.</p>
    
    <div style="background-color: #eff6ff; border-left: 4px solid #3b82f6; padding: 14px 18px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0; font-size: 14px; color: #1e40af; line-height: 1.6;">
        Factura <strong>${folioFactura}</strong> (Pedido <strong>${order.codigo}</strong>)<br/>
        Saldo pendiente: <strong style="font-size: 16px; color: #1e3a8a;">${montoInsoluto} MXN</strong><br/>
        Fecha límite de vencimiento: <strong>${fechaVencimientoFormatted}</strong> (${diffDays} días naturales restantes)
      </p>
    </div>
    
    <h3 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: #64748b; margin-top: 24px; margin-bottom: 10px;">Datos Bancarios Oficiales</h3>
    <table style="width: 100%; font-size: 13px; border-collapse: collapse; background-color: #f1f5f9; border-radius: 8px; overflow: hidden;">
      <tr><td style="padding: 10px 14px; color: #64748b; width: 35%; border-bottom: 1px solid #e2e8f0;">Beneficiario:</td><td style="padding: 10px 14px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${beneficiario}</td></tr>
      <tr><td style="padding: 10px 14px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Banco:</td><td style="padding: 10px 14px; font-weight: 600; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${bancoNombre}</td></tr>
      <tr><td style="padding: 10px 14px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Cuenta:</td><td style="padding: 10px 14px; font-weight: 600; font-family: monospace; color: #0f172a; border-bottom: 1px solid #e2e8f0;">${bancoCuenta}</td></tr>
      <tr><td style="padding: 10px 14px; color: #64748b; border-bottom: 1px solid #e2e8f0;">CLABE:</td><td style="padding: 10px 14px; font-weight: 700; font-family: monospace; color: #1e3a8a; border-bottom: 1px solid #e2e8f0;">${bancoClabe}</td></tr>
      <tr><td style="padding: 10px 14px; color: #64748b;">Referencia:</td><td style="padding: 10px 14px; font-weight: 600; color: #0f172a;">${order.codigo} / ${folioFactura}</td></tr>
    </table>
    
    <p style="font-size: 13px; line-height: 1.6; color: #475569; margin-top: 20px;">Una vez realizado tu depósito o transferencia, te agradeceremos compartir tu comprobante al correo <a href="mailto:${emailCobranza}" style="color: #2563eb; text-decoration: none; font-weight: 600;">${emailCobranza}</a> o con tu asesor comercial <strong>${agenteVentas}</strong> para aplicar tu pago de inmediato y emitir tu Complemento de Recepción de Pagos (REP).</p>
  </div>
  
  <div style="text-align: center; margin-top: 18px; font-size: 11px; color: #94a3b8;">
    <p style="margin: 0;">FORMA TEXTIL S. DE R.L. DE C.V. · Guadalajara, Jalisco, México</p>
  </div>
</div>
`;

    return {
      order,
      folioFactura,
      destinatarioEmail,
      copiaVendedorEmail: order.vendor?.email,
      emailCobranza,
      subject,
      emailBody,
      emailHtml,
    };
  }

  async previewPreventiveEmail(orderId: string) {
    const data = await this.buildPreventiveEmailData(orderId);
    return {
      orderId: data.order.id,
      codigo: data.order.codigo,
      folioFactura: data.folioFactura,
      destinatarioEmail: data.destinatarioEmail,
      copiaVendedorEmail: data.copiaVendedorEmail,
      asunto: data.subject,
      cuerpoMensaje: data.emailBody,
      htmlPreview: data.emailHtml,
    };
  }

  async sendPreventiveEmail(orderId: string) {
    const data = await this.buildPreventiveEmailData(orderId);

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpSecure = process.env.SMTP_SECURE === 'true' || smtpPort === 465;
    const smtpFrom = process.env.SMTP_FROM || `"Formatex Cobranza" <${data.emailCobranza}>`;

    if (!smtpHost || !smtpUser || !smtpPass) {
      throw new BadRequestException(
        'El servidor de correo (SMTP) no está configurado en el backend. ' +
        'Se requiere configurar las variables de entorno SMTP_HOST, SMTP_USER y SMTP_PASS en Render para realizar envíos reales al cliente.'
      );
    }

    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpSecure,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    let sendResult: any;
    try {
      sendResult = await transporter.sendMail({
        from: smtpFrom,
        to: data.destinatarioEmail,
        cc: data.copiaVendedorEmail ? [data.copiaVendedorEmail] : undefined,
        replyTo: data.emailCobranza,
        subject: data.subject,
        text: data.emailBody,
        html: data.emailHtml,
      });

      this.logger.log(
        `📧 Alerta preventiva enviada con éxito para orden ${data.order.codigo} al cliente ${data.order.client?.nombre}. MessageId: ${sendResult.messageId}`
      );
    } catch (mailError: any) {
      this.logger.error(
        `❌ Error al enviar correo de alerta preventiva para orden ${data.order.codigo}: ${mailError.message}`,
        mailError.stack
      );
      throw new BadRequestException(
        `El proveedor de correo rechazó el envío a ${data.destinatarioEmail}: ${mailError.message}`
      );
    }

    // REGISTRAR COMO ENVIADO ÚNICAMENTE TRAS LA ACEPTACIÓN CONFIRMADA DEL PROVEEDOR SMTP:
    await this.prisma.order.update({
      where: { id: orderId },
      data: {
        alerta5DiasEnviada: true,
        alerta5DiasAt: new Date(),
      },
    });

    return {
      success: true,
      messageId: sendResult.messageId,
      orderId: data.order.id,
      codigo: data.order.codigo,
      folioFactura: data.folioFactura,
      destinatarioEmail: data.destinatarioEmail,
      copiaVendedorEmail: data.copiaVendedorEmail,
      asunto: data.subject,
      enviadoAt: new Date(),
    };
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
