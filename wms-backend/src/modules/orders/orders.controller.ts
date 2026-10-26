import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de pedidos' })
  getStats() { return this.ordersService.getOrderStats(); }

  @Get('pending-delivery-confirmations')
  @ApiOperation({ summary: 'Listar pedidos en surtido pendientes de confirmación de entrega (ATC y Supervisora)' })
  getPendingDeliveryConfirmations(@Req() req: any) {
    const isSupervisor = req.user.role === 'ADMIN' ||
                         req.user.role === 'GERENCIA' ||
                         req.user.role === 'SUPERVISOR' ||
                         (req.user.nivel && req.user.nivel <= 2) ||
                         req.user.username?.toLowerCase().includes('alma');
    return this.ordersService.getPendingDeliveryConfirmations(req.user.sub, isSupervisor);
  }

  @Get('delivery-confirmations/pending')
  @ApiOperation({ summary: 'Alias para confirmaciones pendientes de entrega' })
  getPendingDeliveriesAlias(@Req() req: any) {
    return this.getPendingDeliveryConfirmations(req);
  }

  @Get('backorder/containers')
  @ApiOperation({ summary: 'Listar contenedores y embarques en tránsito para cotización y asignación de backorders' })
  getActiveContainersInTransit() {
    return this.ordersService.getActiveContainersInTransit();
  }

  @Get('backorder/queue')
  @ApiOperation({ summary: 'Cola de pedidos en backorder (FIFO) con semáforo de arribo de contenedores (15 días / 5 días)' })
  getBackorderQueue(
    @Req() req: any,
    @Query('contenedorNumero') contenedorNumero?: string,
    @Query('incomingShipmentId') incomingShipmentId?: string,
    @Query('skuId') skuId?: string,
  ) {
    const isSupervisor = req.user.role === 'ADMIN' ||
                         req.user.role === 'GERENCIA' ||
                         req.user.role === 'SUPERVISOR' ||
                         (req.user.nivel && req.user.nivel <= 2) ||
                         req.user.username?.toLowerCase().includes('alma');
    return this.ordersService.getBackorderQueue(req.user.sub, isSupervisor, {
      contenedorNumero,
      incomingShipmentId,
      skuId,
    });
  }

  @Put(':id/backorder/confirm-vigencia')
  @ApiOperation({ summary: 'Confirmar vigencia de orden de compra en backorder (o descartar)' })
  confirmBackorderVigencia(
    @Param('id') id: string,
    @Body() body: { vigente: boolean; notas?: string },
    @Req() req: any,
  ) {
    return this.ordersService.confirmBackorderVigencia(id, req.user.sub, body.vigente, body.notas);
  }

  @Post(':id/backorder/cancel-and-reassign')
  @ApiOperation({ summary: 'Cancelar pedido en backorder y recorrer la cola FIFO automáticamente' })
  cancelAndReassignBackorder(
    @Param('id') id: string,
    @Body() body: { motivo?: string },
    @Req() req: any,
  ) {
    return this.ordersService.cancelAndReassignBackorder(id, req.user.sub, body.motivo);
  }

  @Get('dispatch-queue')
  @ApiOperation({ summary: 'Torre de control y despacho de surtido (Israel / Jefe de Almacén)' })
  getDispatchQueue() {
    return this.ordersService.getDispatchQueue();
  }

  @Post('auto-dispatch')
  @ApiOperation({ summary: 'Despacho automático inteligente según montacargas y balance de carga' })
  autoDispatch(@Req() req: any) {
    return this.ordersService.autoDispatchOrders(req.user?.nombre || 'Israel (Jefe de Almacén)');
  }

  @Get()
  @ApiOperation({ summary: 'Listar pedidos' })
  findAll(
    @Query('search') search?: string,
    @Query('estado') estado?: string,
    @Query('clientId') clientId?: string,
    @Query('surtidorId') surtidorId?: string,
    @Query('retenidoCredito') retenidoCredito?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.ordersService.findAll({ search, estado, clientId, surtidorId, retenidoCredito, page, limit });
  }

  @Post(':id/assign-surtidor')
  @ApiOperation({ summary: 'Asignar o reasignar pedido a un surtidor específico (Israel)' })
  assignSurtidor(
    @Param('id') id: string,
    @Body() body: { surtidorId: string; tipoPicking?: string },
    @Req() req: any,
  ) {
    return this.ordersService.assignSurtidor(id, body.surtidorId, body.tipoPicking, req.user?.nombre || 'Israel (Jefe de Almacén)');
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle del pedido' })
  findById(@Param('id') id: string) { return this.ordersService.findById(id); }

  @Put(':id/confirm-delivery')
  @ApiOperation({ summary: 'Confirmar datos logísticos de entrega durante el surtido (ATC / Supervisora)' })
  confirmDelivery(@Param('id') id: string, @Body() body: any, @Req() req: any) {
    return this.ordersService.confirmDelivery(id, { ...body, confirmedBy: req.user.sub });
  }

  @Put(':id/approve')
  @ApiOperation({ summary: 'Aprobar o rechazar pedido que requería autorización especial' })
  approveOrder(@Param('id') id: string, @Body() body: { aprobado: boolean; reason?: string }, @Req() req: any) {
    return this.ordersService.approveOrder(id, req.user.sub, body.aprobado, body.reason);
  }

  @Post(':id/release-credit')
  @ApiOperation({ summary: 'Liberar pedido retenido por crédito tras negociación o pago (César / Cobranza)' })
  releaseCreditHold(
    @Param('id') id: string,
    @Body() body: { notasLiberacion: string },
    @Req() req: any,
  ) {
    const cobradorNombre = req.user?.nombre || req.user?.username || 'César (Cobranza)';
    return this.ordersService.releaseCreditHold(id, cobradorNombre, body.notasLiberacion);
  }

  @Get(':id/picking-list')
  @ApiOperation({ summary: 'Lista de picking con ubicaciones (para Zebra)' })
  getPickingList(@Param('id') id: string) {
    return this.ordersService.getPickingList(id);
  }

  @Post(':id/validate-scan')
  @ApiOperation({ summary: 'Validar escaneo de HU contra el pedido' })
  validateScan(@Param('id') id: string, @Body('huCodigo') huCodigo: string) {
    return this.ordersService.validateScan(id, huCodigo);
  }

  @Post()
  @ApiOperation({ summary: 'Crear cotización con HUs pre-asignados' })
  create(@Body() body: any, @Req() req: any) {
    return this.ordersService.createOrder({ ...body, creadoPor: req.user.sub });
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cambiar estado del pedido' })
  updateStatus(@Param('id') id: string, @Body('estado') estado: string, @Body() body: any) {
    return this.ordersService.updateStatus(id, estado, body);
  }

  @Put(':id/reassign/:assignmentId')
  @ApiOperation({ summary: 'Reasignar HU en un pedido (ATC)' })
  reassignHU(
    @Param('id') orderId: string,
    @Param('assignmentId') assignmentId: string,
    @Body('newHuId') newHuId: string,
    @Req() req: any,
  ) {
    return this.ordersService.reassignHU(orderId, assignmentId, newHuId, req.user.sub);
  }

  @Post('lines/:lineId/assign')
  @ApiOperation({ summary: 'Confirmar picking de HU (validado contra pre-asignación)' })
  assignHU(@Param('lineId') lineId: string, @Body() body: { huId: string; metrajeTomado: number }) {
    return this.ordersService.assignHUToOrderLine(lineId, body.huId, body.metrajeTomado);
  }

  @Put(':id/confirm-physical-validation')
  @ApiOperation({ summary: 'Almacén confirma metraje medido en rack o mesa para stock <100m' })
  confirmPhysicalValidation(
    @Param('id') id: string,
    @Body() body: { estatus: 'CONFIRMADO_VISUAL' | 'CONFIRMADO_MESA' | 'RECHAZADO'; metrajeConfirmado?: number; notas?: string },
    @Req() req: any,
  ) {
    return this.ordersService.confirmarValidacionFisica(id, body, req.user.sub);
  }

  @Put(':id/accept-lot-variation')
  @ApiOperation({ summary: 'ATC confirma autorización del cliente para mezclar lotes de tela' })
  acceptLotVariation(
    @Param('id') id: string,
    @Body() body: { aceptadoPor: string; notas?: string },
  ) {
    return this.ordersService.aceptarVariacionTono(id, body);
  }

  @Put(':id/assign-cart')
  @ApiOperation({ summary: 'Almacén asigna carrito de corte y nivel (A1, A2, A3)' })
  assignCart(
    @Param('id') id: string,
    @Body('carritoCorte') carritoCorte: string,
  ) {
    return this.ordersService.asignarCarritoCorte(id, carritoCorte);
  }

  @Put(':id/assign-shipping-label')
  @ApiOperation({ summary: 'Asignar tipo oficial de etiqueta de embarque (LOCAL_INFERIOR, FORANEO_SUPERIOR, OCOTLAN, PAQUETERIA)' })
  assignShippingLabel(
    @Param('id') id: string,
    @Body('tipoEtiqueta') tipoEtiqueta: string,
  ) {
    return this.ordersService.asignarTipoEtiqueta(id, tipoEtiqueta);
  }
}
