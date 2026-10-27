import { Controller, Get, Post, Put, Query, Param, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('reservations')
@ApiBearerAuth()
@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly svc: ReservationsService) {}

  @Get()
  findAll(@Query() params: any) {
    return this.svc.findAll(params);
  }

  // === RESERVAS ESPECIALES VIP (SUB-ALMACENES VIRTUALES) ===
  @Get('vip')
  @ApiOperation({ summary: 'Listar reservas VIP con semáforos de envejecimiento (7d amarillo / 15d rojo)' })
  listVip() {
    return this.svc.listVipReservations();
  }

  @Post('vip')
  @ApiOperation({ summary: 'Crear reserva VIP en sub-almacén virtual (Caso Seth 1,000m)' })
  createVip(@Body() body: any, @Req() req: any) {
    return this.svc.createVipReservation({
      ...body,
      autorizadoPor: body.autorizadoPor || req.user?.sub || 'DIRECCION',
    });
  }

  @Put('vip/release')
  @ApiOperation({ summary: 'Liberar / descongelar reserva VIP (1-click a venta general)' })
  releaseVip(@Body() body: any, @Req() req: any) {
    return this.svc.releaseVipReservation({
      ...body,
      liberadoPor: body.liberadoPor || req.user?.sub || 'DIRECCION',
    });
  }

  @Get('availability/:skuId')
  getAvailability(@Param('skuId') skuId: string) {
    return this.svc.getAvailability(skuId);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.createSoftReservation(body);
  }

  @Put(':id/confirm')
  confirm(@Param('id') id: string) {
    return this.svc.confirmReservation(id);
  }

  @Put(':id/cancel')
  cancel(@Param('id') id: string, @Body() body: any) {
    return this.svc.cancelReservation(id, body?.motivo);
  }
}
