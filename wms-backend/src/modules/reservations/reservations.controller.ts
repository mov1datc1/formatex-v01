import { Controller, Get, Post, Put, Query, Param, Body, UseGuards } from '@nestjs/common';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('reservations')
@UseGuards(JwtAuthGuard)
export class ReservationsController {
  constructor(private readonly svc: ReservationsService) {}

  @Get()
  findAll(@Query() params: any) {
    return this.svc.findAll(params);
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
