import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ReceptionService } from './reception.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('reception')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('reception')
export class ReceptionController {
  constructor(private readonly receptionService: ReceptionService) {}

  @Get()
  @ApiOperation({ summary: 'Listar recepciones' })
  findAll(@Query('search') search?: string, @Query('estado') estado?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.receptionService.findAllReceipts({ search, estado, page, limit });
  }

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de recepción' })
  getStats() {
    return this.receptionService.getReceptionStats();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener recepción por ID' })
  findById(@Param('id') id: string) {
    return this.receptionService.findReceiptById(id);
  }

  @Get('suggest-locations')
  @ApiOperation({ summary: 'Sugerir 3 ubicaciones inteligentes para HUs entrantes' })
  suggestLocations(
    @Query('skuId') skuId: string,
    @Query('tipoRollo') tipoRollo: 'ENTERO' | 'RETAZO' = 'ENTERO',
    @Query('metraje') metraje: number = 50,
    @Query('cantidadRollos') cantidadRollos: number = 1,
  ) {
    return this.receptionService.suggestLocations({ skuId, tipoRollo, metraje: +metraje, cantidadRollos: +cantidadRollos });
  }

  @Post()
  @ApiOperation({ summary: 'Registrar recepción de pallet (crea HUs automáticamente)' })
  register(@Body() body: any, @Req() req: any) {
    return this.receptionService.registerReception({ ...body, recibidoPor: req.user.sub });
  }
}
