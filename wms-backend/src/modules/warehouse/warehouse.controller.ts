import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { WarehouseService } from './warehouse.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('warehouse')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('warehouse')
export class WarehouseController {
  constructor(private readonly warehouseService: WarehouseService) {}

  // ===== STATS =====
  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas del almacén' })
  getStats() { return this.warehouseService.getWarehouseStats(); }

  // ===== WAREHOUSES =====
  @Get('warehouses')
  @ApiOperation({ summary: 'Listar almacenes/bodegas' })
  findAllWarehouses() { return this.warehouseService.findAllWarehouses(); }

  @Get('warehouses/:id')
  @ApiOperation({ summary: 'Detalle de almacén con zonas y ubicaciones' })
  findWarehouseById(@Param('id') id: string) { return this.warehouseService.findWarehouseById(id); }

  @Post('warehouses')
  @ApiOperation({ summary: 'Crear almacén/bodega (física o virtual)' })
  createWarehouse(@Body() body: any) { return this.warehouseService.createWarehouse(body); }

  @Put('warehouses/:id')
  @ApiOperation({ summary: 'Actualizar almacén' })
  updateWarehouse(@Param('id') id: string, @Body() body: any) { return this.warehouseService.updateWarehouse(id, body); }

  // ===== ZONES =====
  @Get('zones')
  @ApiOperation({ summary: 'Listar zonas' })
  findAllZones(@Query('warehouseId') warehouseId?: string, @Query('tipo') tipo?: string) {
    return this.warehouseService.findAllZones({ warehouseId, tipo });
  }

  @Post('zones')
  @ApiOperation({ summary: 'Crear zona' })
  createZone(@Body() body: any) { return this.warehouseService.createZone(body); }

  @Put('zones/:id')
  @ApiOperation({ summary: 'Actualizar zona' })
  updateZone(@Param('id') id: string, @Body() body: any) { return this.warehouseService.updateZone(id, body); }

  // ===== LOCATIONS =====
  @Get('locations')
  @ApiOperation({ summary: 'Listar ubicaciones con filtros' })
  findAllLocations(@Query('zoneId') zoneId?: string, @Query('warehouseId') warehouseId?: string, @Query('estado') estado?: string, @Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.warehouseService.findAllLocations({ zoneId, warehouseId, estado, search, page, limit });
  }

  @Post('locations')
  @ApiOperation({ summary: 'Crear ubicación individual' })
  createLocation(@Body() body: any) { return this.warehouseService.createLocation(body); }

  @Post('locations/bulk')
  @ApiOperation({ summary: 'Crear ubicaciones masivas (pasillos × niveles × posiciones)' })
  createBulkLocations(@Body() body: any) { return this.warehouseService.createBulkLocations(body); }

  @Put('locations/:id')
  @ApiOperation({ summary: 'Actualizar ubicación' })
  updateLocation(@Param('id') id: string, @Body() body: any) { return this.warehouseService.updateLocation(id, body); }

  @Get('locations/:id')
  @ApiOperation({ summary: 'Detalle de ubicación con todos sus HUs' })
  findLocationById(@Param('id') id: string) { return this.warehouseService.findLocationById(id); }

  // ===== LOCATION SUGGESTION =====
  @Get('suggest-location')
  @ApiOperation({ summary: 'Sugerir ubicación para un rollo (por tipo, metraje, SKU)' })
  suggestLocation(@Query('tipoRollo') tipoRollo: 'ENTERO' | 'RETAZO', @Query('metraje') metraje: number, @Query('skuId') skuId?: string) {
    return this.warehouseService.suggestLocation({ tipoRollo, metraje, skuId });
  }

  // ===== MERMA RANGES =====
  @Get('merma-ranges')
  @ApiOperation({ summary: 'Listar configuración de rangos de merma' })
  findAllMermaRanges() { return this.warehouseService.findAllMermaRanges(); }

  @Post('merma-ranges')
  @ApiOperation({ summary: 'Crear rango de merma' })
  createMermaRange(@Body() body: any) { return this.warehouseService.createMermaRange(body); }

  @Put('merma-ranges/:id')
  @ApiOperation({ summary: 'Actualizar rango de merma' })
  updateMermaRange(@Param('id') id: string, @Body() body: any) { return this.warehouseService.updateMermaRange(id, body); }
}
