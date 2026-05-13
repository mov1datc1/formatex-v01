import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PurchasingService } from './purchasing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('purchasing')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('purchasing')
export class PurchasingController {
  constructor(private readonly purchasingService: PurchasingService) {}

  // ===== ÓRDENES DE COMPRA =====

  @Get('orders')
  @ApiOperation({ summary: 'Listar órdenes de compra' })
  findAllOrders(
    @Query('search') search?: string,
    @Query('estado') estado?: string,
    @Query('supplierId') supplierId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.purchasingService.findAllOrders({ search, estado, supplierId, fechaDesde, fechaHasta, page: Number(page) || 1, limit: Number(limit) || 20 });
  }

  @Get('orders/:id')
  @ApiOperation({ summary: 'Detalle de orden de compra' })
  findOrderById(@Param('id') id: string) {
    return this.purchasingService.findOrderById(id);
  }

  @Post('orders')
  @ApiOperation({ summary: 'Crear orden de compra' })
  createOrder(@Body() body: any, @Req() req: any) {
    return this.purchasingService.createOrder({
      ...body,
      creadoPor: req.user.sub,
    });
  }

  @Put('orders/:id')
  @ApiOperation({ summary: 'Editar orden de compra (solo borrador)' })
  updateOrder(@Param('id') id: string, @Body() body: any) {
    return this.purchasingService.updateOrder(id, body);
  }

  @Post('orders/:id/confirm')
  @ApiOperation({ summary: 'Confirmar orden de compra' })
  confirmOrder(@Param('id') id: string, @Req() req: any) {
    return this.purchasingService.confirmOrder(id, req.user.sub);
  }

  @Post('orders/:id/send-reception')
  @ApiOperation({ summary: 'Enviar OC a cola de recepción' })
  sendToReception(@Param('id') id: string, @Req() req: any) {
    return this.purchasingService.sendToReception(id, req.user.sub);
  }

  @Post('orders/:id/partial-receipt')
  @ApiOperation({ summary: 'Registrar recepción parcial' })
  registerPartialReceipt(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.purchasingService.registerPartialReceipt(id, {
      ...body,
      recibidoPor: req.user.sub,
    });
  }

  @Post('orders/:id/complete')
  @ApiOperation({ summary: 'Marcar OC como completada' })
  completeOrder(@Param('id') id: string) {
    return this.purchasingService.completeOrder(id);
  }

  @Post('orders/:id/cancel')
  @ApiOperation({ summary: 'Cancelar orden de compra' })
  cancelOrder(@Param('id') id: string, @Body() body: any) {
    return this.purchasingService.cancelOrder(id, body.motivo);
  }

  // ===== RECEPCIÓN =====

  @Get('reception-queue')
  @ApiOperation({ summary: 'Cola de recepción de OC (por prioridad + ETA)' })
  getReceptionQueue() {
    return this.purchasingService.getReceptionQueue();
  }

  // ===== HISTORIAL =====

  @Get('history')
  @ApiOperation({ summary: 'Historial de OC completadas/canceladas' })
  getCompletedHistory(
    @Query('search') search?: string,
    @Query('supplierId') supplierId?: string,
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.purchasingService.getCompletedHistory({ search, supplierId, fechaDesde, fechaHasta, page: Number(page) || 1, limit: Number(limit) || 20 });
  }

  // ===== PRECIO =====

  @Get('resolve-price')
  @ApiOperation({ summary: 'Auto-fill inteligente de precio (proveedor + SKU)' })
  resolvePrice(@Query('supplierId') supplierId: string, @Query('skuId') skuId: string) {
    return this.purchasingService.resolvePrice(supplierId, skuId);
  }

  @Get('supplier-prices')
  @ApiOperation({ summary: 'Listar precios por proveedor' })
  getSupplierPrices(@Query('supplierId') supplierId?: string) {
    return this.purchasingService.getSupplierPrices(supplierId);
  }

  @Post('supplier-prices')
  @ApiOperation({ summary: 'Crear/actualizar precio proveedor+SKU' })
  upsertSupplierPrice(@Body() body: any) {
    return this.purchasingService.upsertSupplierPrice(body);
  }

  // ===== STATS =====

  @Get('stats')
  @ApiOperation({ summary: 'KPIs del módulo de compras' })
  getStats() {
    return this.purchasingService.getStats();
  }

  // ===== PDF =====

  @Get('orders/:id/pdf-data')
  @ApiOperation({ summary: 'Datos para generar PDF de OC' })
  getOrderPDFData(@Param('id') id: string) {
    return this.purchasingService.getOrderPDFData(id);
  }
}
