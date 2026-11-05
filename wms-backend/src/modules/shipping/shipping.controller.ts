import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('fulfillment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shipping')
export class ShippingController {
  constructor(private readonly shippingService: ShippingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de envío' })
  getStats() {
    return this.shippingService.getShippingStats();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Listar pedidos FACTURADOS listos para despacho' })
  findOrders(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shippingService.findOrdersForShipping({ search, page, limit });
  }

  @Get('validate-scan')
  @ApiOperation({ summary: 'Candado de Embarque: validar código escaneado antes de subir a camioneta (Fecha de hoy, Estatus y Ruta)' })
  validateScanGet(
    @Query('code') code: string,
    @Query('targetRoute') targetRoute?: string,
    @Query('targetDate') targetDate?: string,
  ) {
    return this.shippingService.validateTruckLoadingScan({ code, targetRoute, targetDate });
  }

  @Post('validate-scan')
  @ApiOperation({ summary: 'Candado de Embarque (POST): validar código escaneado antes de subir a camioneta' })
  validateScanPost(
    @Body() body: { code: string; targetRoute?: string; targetDate?: string },
  ) {
    return this.shippingService.validateTruckLoadingScan(body);
  }

  @Put('orders/:id/schedule')
  @ApiOperation({ summary: 'Programar o reprogramar fecha de embarque y ruta de un pedido' })
  updateSchedule(
    @Param('id') id: string,
    @Body() body: { fechaPromesaEntrega: string; tipoEtiquetaEmbarque?: string },
  ) {
    return this.shippingService.updateScheduledShippingDate(id, body.fechaPromesaEntrega, body.tipoEtiquetaEmbarque);
  }

  @Get('shipments')
  @ApiOperation({ summary: 'Listar envíos con filtros' })
  findAll(
    @Query('orderId') orderId?: string,
    @Query('estado') estado?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.shippingService.findAll({ orderId, estado, page, limit });
  }

  @Get('shipments/:id')
  @ApiOperation({ summary: 'Detalle de envío' })
  findById(@Param('id') id: string) {
    return this.shippingService.findById(id);
  }

  @Post('dispatch')
  @ApiOperation({ summary: 'Despachar pedido — crea envío y actualiza orden a DESPACHADO' })
  dispatch(@Body() body: any, @Req() req: any) {
    return this.shippingService.createShipment({
      ...body,
      enviadoPor: req.user.sub,
    });
  }

  @Put('shipments/:id/confirm-delivery')
  @ApiOperation({ summary: 'Confirmar entrega del envío' })
  confirmDelivery(@Param('id') id: string) {
    return this.shippingService.confirmDelivery(id);
  }

  @Put('shipments/:id/upload-evidence')
  @ApiOperation({ summary: 'Subir fotografía del acuse de recibo y guía sellada por fletera' })
  uploadEvidence(
    @Param('id') id: string,
    @Body() body: { evidenciaFotoUrl: string; guiaEnvio?: string; transportista?: string },
  ) {
    return this.shippingService.uploadShippingEvidence(id, body);
  }
}
