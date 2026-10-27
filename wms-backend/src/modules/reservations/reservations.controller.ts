import { Controller, Get, Post, Put, Query, Param, Body, UseGuards, Req, ForbiddenException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReservationsService } from './reservations.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

function isManagerOrAdmin(user: any): boolean {
  if (!user) return false;
  const role = user.role;
  const nivel = user.nivel;
  const username = user.username?.toLowerCase() || '';
  const email = user.email?.toLowerCase() || '';
  return (
    role === 'ADMIN' ||
    role === 'DIRECTOR_OPERACIONES' ||
    role === 'DIRECTOR_COMPRAS' ||
    role === 'GERENCIA' ||
    role === 'JEFE_ATC' ||
    (nivel !== undefined && nivel <= 2) ||
    username.includes('alma') ||
    email.includes('alma')
  );
}

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
  @ApiOperation({ summary: 'Crear reserva VIP en sub-almacén virtual (Gerencia / Alma / Dirección)' })
  createVip(@Body() body: any, @Req() req: any) {
    if (!isManagerOrAdmin(req.user)) {
      throw new ForbiddenException(
        'Acceso denegado: Solo Gerencia, Dirección o la Jefa de ATC (Alma) pueden autorizar apartados VIP extendidos.'
      );
    }
    return this.svc.createVipReservation({
      ...body,
      autorizadoPor: req.user?.nombre || req.user?.username || req.user?.sub || 'DIRECCION',
    });
  }

  @Put('vip/release')
  @ApiOperation({ summary: 'Liberar / descongelar reserva VIP (Gerencia / Alma / Dirección)' })
  releaseVip(@Body() body: any, @Req() req: any) {
    if (!isManagerOrAdmin(req.user)) {
      throw new ForbiddenException(
        'Acceso denegado: Solo Gerencia, Dirección o la Jefa de ATC (Alma) pueden liberar o descongelar reservas VIP a venta general.'
      );
    }
    return this.svc.releaseVipReservation({
      ...body,
      liberadoPor: req.user?.nombre || req.user?.username || req.user?.sub || 'DIRECCION',
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
