import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { PackingService } from './packing.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('fulfillment')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('packing')
export class PackingController {
  constructor(private readonly packingService: PackingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de empaque' })
  getStats() {
    return this.packingService.getPackingStats();
  }

  @Get('orders')
  @ApiOperation({ summary: 'Listar pedidos listos para empacar (estado EMPACADO)' })
  findOrders(
    @Query('search') search?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.packingService.findOrdersForPacking({ search, page, limit });
  }

  @Get('slips')
  @ApiOperation({ summary: 'Listar packing slips creados' })
  findAll(
    @Query('orderId') orderId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.packingService.findAll({ orderId, page, limit });
  }

  @Get('slips/:id')
  @ApiOperation({ summary: 'Detalle de packing slip' })
  findById(@Param('id') id: string) {
    return this.packingService.findById(id);
  }

  @Post('slips')
  @ApiOperation({ summary: 'Crear packing slip para un pedido' })
  createSlip(@Body() body: any, @Req() req: any) {
    return this.packingService.createPackingSlip({
      ...body,
      empacadoPor: req.user.sub,
    });
  }

  @Put('orders/:orderId/approve')
  @ApiOperation({ summary: 'Aprobar empaque y marcar como FACTURADO' })
  approve(
    @Param('orderId') orderId: string,
    @Body('facturaRef') facturaRef?: string,
  ) {
    return this.packingService.approveAndInvoice(orderId, facturaRef);
  }
}
