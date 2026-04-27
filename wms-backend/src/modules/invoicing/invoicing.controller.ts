import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Res,
  HttpCode,
} from '@nestjs/common';
import { InvoicingService } from './invoicing.service';
import type { Response } from 'express';

@Controller('invoicing')
export class InvoicingController {
  constructor(private readonly invoicingService: InvoicingService) {}

  // -----------------------------------------------------------------------
  // Catálogos SAT (formas de pago, regímenes, usos CFDI)
  // -----------------------------------------------------------------------
  @Get('catalogos')
  getCatalogos() {
    return this.invoicingService.getCatalogos();
  }

  // -----------------------------------------------------------------------
  // Test de conexión con Facturapi
  // -----------------------------------------------------------------------
  @Post('test-connection')
  @HttpCode(200)
  async testConnection() {
    return this.invoicingService.testConnection();
  }

  // -----------------------------------------------------------------------
  // Historial de facturas emitidas
  // -----------------------------------------------------------------------
  @Get('history')
  async getHistory(
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.invoicingService.getInvoiceHistory({
      search,
      status,
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
    });
  }

  // -----------------------------------------------------------------------
  // Obtener factura de un pedido
  // -----------------------------------------------------------------------
  @Get(':orderId')
  async getInvoice(@Param('orderId') orderId: string) {
    return this.invoicingService.getInvoice(orderId);
  }

  // -----------------------------------------------------------------------
  // Crear factura CFDI para pedido EMPACADO
  // -----------------------------------------------------------------------
  @Post(':orderId/create')
  async createInvoice(
    @Param('orderId') orderId: string,
    @Body()
    body: {
      formaPago?: string;
      metodoPago?: string;
      usoCfdi?: string;
      condicionesPago?: string;
    },
  ) {
    return this.invoicingService.createInvoice(orderId, body);
  }

  // -----------------------------------------------------------------------
  // Descargar PDF de la factura
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Descargar XML de la factura
  // -----------------------------------------------------------------------
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

  // -----------------------------------------------------------------------
  // Enviar factura por email
  // -----------------------------------------------------------------------
  @Post(':orderId/email')
  async sendByEmail(
    @Param('orderId') orderId: string,
    @Body('email') email: string,
  ) {
    return this.invoicingService.sendByEmail(orderId, email);
  }

  // -----------------------------------------------------------------------
  // Cancelar factura
  // -----------------------------------------------------------------------
  @Post(':orderId/cancel')
  async cancelInvoice(
    @Param('orderId') orderId: string,
    @Body() body: { motive: '01' | '02' | '03' | '04'; substitution?: string },
  ) {
    return this.invoicingService.cancelInvoice(
      orderId,
      body.motive,
      body.substitution,
    );
  }
}
