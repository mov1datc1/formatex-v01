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

  @Get()
  @ApiOperation({ summary: 'Listar pedidos' })
  findAll(@Query('search') search?: string, @Query('estado') estado?: string, @Query('clientId') clientId?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.ordersService.findAll({ search, estado, clientId, page, limit });
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
}
