import { Controller, Get, Post, Put, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de inventario' })
  getStats() { return this.inventoryService.getInventoryStats(); }

  @Get('hus')
  @ApiOperation({ summary: 'Listar Handling Units (rollos)' })
  findAllHUs(@Query('search') search?: string, @Query('tipoRollo') tipoRollo?: string, @Query('estadoHu') estadoHu?: string, @Query('skuId') skuId?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.inventoryService.findAllHUs({ search, tipoRollo, estadoHu, skuId, page, limit });
  }

  @Get('hus/:id')
  @ApiOperation({ summary: 'Detalle de HU con genealogía' })
  findHUById(@Param('id') id: string) { return this.inventoryService.findHUById(id); }

  @Put('hus/:id/relocate')
  @ApiOperation({ summary: 'Reubicar HU' })
  relocateHU(@Param('id') id: string, @Body('ubicacionId') ubicacionId: string, @Req() req: any) {
    return this.inventoryService.relocateHU(id, ubicacionId, req.user.sub);
  }

  @Get('zones')
  @ApiOperation({ summary: 'Listar zonas del almacén' })
  findAllZones() { return this.inventoryService.findAllZones(); }

  @Get('locations')
  @ApiOperation({ summary: 'Listar ubicaciones' })
  findAllLocations(@Query('zoneId') zoneId?: string, @Query('estado') estado?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.inventoryService.findAllLocations({ zoneId, estado, page, limit });
  }

  @Get('movements')
  @ApiOperation({ summary: 'Historial de movimientos' })
  findAllMovements(@Query('huId') huId?: string, @Query('tipo') tipo?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.inventoryService.findAllMovements({ huId, tipo, page, limit });
  }

  @Get('suggest-hus')
  @ApiOperation({ summary: 'Sugerir HUs inteligentes por SKU y metraje requerido (menor merma)' })
  suggestHUs(
    @Query('skuId') skuId: string,
    @Query('metraje') metraje: number,
    @Query('limit') limit: number = 10,
  ) {
    return this.inventoryService.suggestHUs(skuId, +metraje, +limit);
  }
}
