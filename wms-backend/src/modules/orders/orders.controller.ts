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

  @Get()
  @ApiOperation({ summary: 'Listar pedidos' })
  findAll(@Query('search') search?: string, @Query('estado') estado?: string, @Query('clientId') clientId?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.ordersService.findAll({ search, estado, clientId, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle del pedido' })
  findById(@Param('id') id: string) { return this.ordersService.findById(id); }

  @Post()
  @ApiOperation({ summary: 'Crear pedido' })
  create(@Body() body: any, @Req() req: any) {
    return this.ordersService.createOrder({ ...body, creadoPor: req.user.sub });
  }

  @Put(':id/status')
  @ApiOperation({ summary: 'Cambiar estado del pedido' })
  updateStatus(@Param('id') id: string, @Body('estado') estado: string) {
    return this.ordersService.updateStatus(id, estado);
  }

  @Post('lines/:lineId/assign')
  @ApiOperation({ summary: 'Asignar HU a línea del pedido (picking)' })
  assignHU(@Param('lineId') lineId: string, @Body() body: { huId: string; metrajeTomado: number }) {
    return this.ordersService.assignHUToOrderLine(lineId, body.huId, body.metrajeTomado);
  }
}
