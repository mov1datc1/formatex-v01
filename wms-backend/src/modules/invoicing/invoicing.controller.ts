import {
  Controller,
  Post,
  Get,
  Put,
  Param,
  Body,
  Query,
  Res,
  HttpCode,
} from '@nestjs/common';
import { InvoicingService } from './invoicing.service';
import { CreditService } from './credit.service';
import { CommissionsService } from './commissions.service';
import type { Response } from 'express';

@Controller('invoicing')
export class InvoicingController {
  constructor(
    private readonly invoicingService: InvoicingService,
    private readonly creditService: CreditService,
    private readonly commissionsService: CommissionsService,
  ) {}

  // =======================================================================
  // CATÁLOGOS SAT
  // =======================================================================
  @Get('catalogos')
  getCatalogos() {
    return this.invoicingService.getCatalogos();
  }

  // =======================================================================
  // TEST DE CONEXIÓN
  // =======================================================================
  @Post('test-connection')
  @HttpCode(200)
  async testConnection() {
    return this.invoicingService.testConnection();
  }

  // =======================================================================
  // HISTORIAL DE FACTURAS
  // =======================================================================
  @Get('history')
  async getHistory(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('metodoPago') metodoPago?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoicingService.getInvoiceHistory({
      search,
      status,
      metodoPago,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // =======================================================================
  // PAGOS PPD
  // =======================================================================

  @Post('payments')
  async registerPayment(
    @Body() body: {
      orderIds: string[];
      monto: number;
      formaPago: string;
      referencia?: string;
      evidenciaUrl?: string;
      registradoPor: string;
      notas?: string;
      emitirComplemento?: boolean;
    },
  ) {
    return this.invoicingService.registerPayment(body);
  }

  @Post('payments/:groupId/complement')
  async emitComplement(@Param('groupId') groupId: string) {
    return this.invoicingService.emitPaymentComplement(groupId);
  }

  @Post('orders/:orderId/complement')
  async emitComplementByOrder(@Param('orderId') orderId: string) {
    return this.invoicingService.emitComplementByOrder(orderId);
  }

  // =======================================================================
  // DASHBOARD PPD (Cobranza)
  // =======================================================================

  @Get('ppd-dashboard')
  async getPPDDashboard() {
    return this.invoicingService.getPPDDashboard();
  }

  // =======================================================================
  // ESTADO DE CUENTA / FACTURAS PENDIENTES
  // =======================================================================

  @Get('client/:clientId/statement')
  async getClientStatement(
    @Param('clientId') clientId: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.invoicingService.getClientStatement(clientId, { desde, hasta });
  }

  @Get('client/:clientId/pending')
  async getClientPendingInvoices(@Param('clientId') clientId: string) {
    return this.invoicingService.getClientPendingInvoices(clientId);
  }

  // =======================================================================
  // CRÉDITO DE CLIENTES
  // =======================================================================

  @Get('credit/price-lists')
  async getPriceLists() {
    return this.creditService.getPriceLists();
  }

  @Get('credit/:clientId')
  async getCreditConfig(@Param('clientId') clientId: string) {
    return this.creditService.getCreditConfig(clientId);
  }

  @Put('credit/:clientId')
  async upsertCreditConfig(
    @Param('clientId') clientId: string,
    @Body() body: {
      creditoHabilitado?: boolean;
      plazoDefault?: number;
      montoMaximo?: number | null;
      listaDefault?: string;
      descuentoMaximo?: number;
      notas?: string;
    },
  ) {
    return this.creditService.upsertCreditConfig(clientId, body);
  }

  @Post('credit/:clientId/block')
  async toggleBlock(
    @Param('clientId') clientId: string,
    @Body() body: { bloqueado: boolean; motivo?: string; userId: string },
  ) {
    return this.creditService.toggleBlock(clientId, body.bloqueado, body.motivo, body.userId);
  }

  @Get('credit/:clientId/check')
  async canClientOrder(@Param('clientId') clientId: string) {
    return this.creditService.canClientOrder(clientId);
  }

  // =======================================================================
  // COMISIONES
  // =======================================================================

  @Get('commissions')
  async getCommissionReport(
    @Query('vendorId') vendorId?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('soloFacturasPagadas') soloFacturasPagadas?: string,
  ) {
    return this.commissionsService.getVendorCommissionReport({
      vendorId,
      desde,
      hasta,
      soloFacturasPagadas: soloFacturasPagadas !== 'false',
    });
  }

  @Get('commissions/periods')
  async listPeriods() {
    return this.commissionsService.listPeriods();
  }

  @Post('commissions/periods')
  async createPeriod(
    @Body() body: { fechaInicio: string; fechaFin: string; creadoPor: string },
  ) {
    return this.commissionsService.createPeriod(body);
  }

  @Put('commissions/periods/:id/close')
  async closePeriod(@Param('id') id: string) {
    return this.commissionsService.closePeriod(id);
  }

  // =======================================================================
  // FACTURA INDIVIDUAL (CRUD existente)
  // =======================================================================

  @Get(':orderId')
  async getInvoice(@Param('orderId') orderId: string) {
    return this.invoicingService.getInvoice(orderId);
  }

  @Post(':orderId/create')
  async createInvoice(
    @Param('orderId') orderId: string,
    @Body() body: {
      formaPago?: string;
      metodoPago?: string;
      usoCfdi?: string;
      condicionesPago?: string;
    },
  ) {
    return this.invoicingService.createInvoice(orderId, body);
  }

  @Get(':orderId/pdf')
  async downloadPdf(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.invoicingService.downloadPdf(orderId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="factura-${orderId}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':orderId/xml')
  async downloadXml(
    @Param('orderId') orderId: string,
    @Res() res: Response,
  ) {
    const buffer = await this.invoicingService.downloadXml(orderId);
    res.set({
      'Content-Type': 'application/xml',
      'Content-Disposition': `attachment; filename="factura-${orderId}.xml"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':orderId/email')
  async sendByEmail(
    @Param('orderId') orderId: string,
    @Body('email') email: string,
  ) {
    return this.invoicingService.sendByEmail(orderId, email);
  }

  @Post(':orderId/cancel')
  async cancelInvoice(
    @Param('orderId') orderId: string,
    @Body() body: { motive: '01' | '02' | '03' | '04'; substitution?: string },
  ) {
    return this.invoicingService.cancelInvoice(orderId, body.motive, body.substitution);
  }
}
