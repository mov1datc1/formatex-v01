import { Controller, Get, Post, Put, Query, Param, Body, UseGuards } from '@nestjs/common';
import { TransitService } from './transit.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('transit')
@UseGuards(JwtAuthGuard)
export class TransitController {
  constructor(private readonly svc: TransitService) {}

  @Get()
  findAll(@Query() params: any) {
    return this.svc.findAll(params);
  }

  @Get('stats')
  getStats() {
    return this.svc.getStats();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.svc.findById(id);
  }

  @Post()
  create(@Body() body: any) {
    return this.svc.create(body);
  }

  @Put(':id/received')
  markReceived(@Param('id') id: string) {
    return this.svc.markReceived(id);
  }

  // ===== COSTEO DE IMPORTACIÓN Y EXPORTACIÓN CONTPAQI =====
  @Get(':id/costing')
  getCosting(@Param('id') id: string, @Query() query: any) {
    return this.svc.calculateCosting(id, {
      tipoCambio: query.tipoCambio ? Number(query.tipoCambio) : undefined,
      gastosIncrementablesPct: query.gastosIncrementablesPct ? Number(query.gastosIncrementablesPct) : undefined,
      numeroPedimento: query.numeroPedimento,
      aduanaDespacho: query.aduanaDespacho,
    });
  }

  @Post(':id/costing')
  saveCosting(@Param('id') id: string, @Body() body: any) {
    return this.svc.saveCosting(id, body);
  }

  @Get(':id/export-contpaqi')
  exportContpaqi(@Param('id') id: string) {
    return this.svc.exportContpaqi(id);
  }
}
