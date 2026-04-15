import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { TransfersService } from './transfers.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('transfers')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('transfers')
export class TransfersController {
  constructor(private readonly transfersService: TransfersService) {}

  @Get()
  @ApiOperation({ summary: 'Listar transferencias' })
  findAll(
    @Query('estado') estado?: string,
    @Query('warehouseId') warehouseId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.transfersService.findAll({ estado, warehouseId, page: page ? +page : undefined, limit: limit ? +limit : undefined });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de transferencias' })
  getStats() {
    return this.transfersService.getStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de transferencia' })
  findById(@Param('id') id: string) {
    return this.transfersService.findById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Crear transferencia (seleccionar HUs)' })
  create(@Body() body: any, @Req() req: any) {
    return this.transfersService.create({
      ...body,
      creadoPor: req.user.sub,
    });
  }

  @Put(':id/execute')
  @ApiOperation({ summary: 'Ejecutar transferencia (solo supervisores)' })
  execute(@Param('id') id: string, @Req() req: any) {
    return this.transfersService.execute(id, req.user.sub, req.user.nivel || 4);
  }

  @Put(':id/receive')
  @ApiOperation({ summary: 'Confirmar recepción en destino' })
  receive(@Param('id') id: string, @Req() req: any) {
    return this.transfersService.receive(id, req.user.sub);
  }

  @Put(':id/cancel')
  @ApiOperation({ summary: 'Cancelar transferencia (solo supervisores)' })
  cancel(@Param('id') id: string, @Req() req: any) {
    return this.transfersService.cancel(id, req.user.sub, req.user.nivel || 4);
  }
}
