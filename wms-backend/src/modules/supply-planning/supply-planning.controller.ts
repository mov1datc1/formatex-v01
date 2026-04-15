import { Controller, Get, Post, Put, Param, Body, Query, Req, UseGuards } from '@nestjs/common';
import { SupplyPlanningService } from './supply-planning.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('supply-planning')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('supply-planning')
export class SupplyPlanningController {
  constructor(private readonly service: SupplyPlanningService) {}

  @Get('dashboard')
  getDashboard() {
    return this.service.getDashboard();
  }

  @Get('plans')
  findAllPlans(@Query('anio') anio?: number) {
    return this.service.findAllPlans(anio);
  }

  @Get('plans/:id')
  findPlanById(@Param('id') id: string) {
    return this.service.findPlanById(id);
  }

  @Post('plans/generate')
  generatePlan(@Body() body: { mes: number; anio: number }, @Req() req: any) {
    return this.service.generatePlan(body.mes, body.anio, req.user.sub);
  }

  @Put('plans/:id/approve')
  approvePlan(@Param('id') id: string, @Req() req: any) {
    return this.service.approvePlan(id, req.user.sub);
  }

  @Put('plans/:id/lines/:lineId')
  updateLine(
    @Param('id') planId: string,
    @Param('lineId') lineId: string,
    @Body() body: { cantidadAprobada?: number; supplierId?: string; status?: string; notas?: string },
  ) {
    return this.service.updateLine(planId, lineId, body);
  }

  @Post('plans/lines/:lineId/create-shipment')
  createShipmentFromLine(@Param('lineId') lineId: string, @Req() req: any) {
    return this.service.createShipmentFromLine(lineId, req.user.sub);
  }

  @Get('projections')
  getProjections(@Query('skuId') skuId?: string) {
    return this.service.getProjections(skuId);
  }

  @Get('alerts')
  getAlerts() {
    return this.service.getAlerts();
  }

  @Get('reorder-config')
  getReorderConfigs() {
    return this.service.getReorderConfigs();
  }

  @Put('reorder-config/:skuId')
  upsertReorderConfig(
    @Param('skuId') skuId: string,
    @Body() body: { stockMinimo: number; stockSeguridad?: number; puntoReorden: number; cantidadReorden: number; leadTimeDias?: number },
  ) {
    return this.service.upsertReorderConfig(skuId, body);
  }
}
