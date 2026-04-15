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
}
