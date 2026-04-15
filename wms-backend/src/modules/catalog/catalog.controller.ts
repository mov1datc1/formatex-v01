import { Controller, Get, Post, Put, Body, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CatalogService } from './catalog.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('catalog')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  // ===== SKUs =====
  @Get('skus')
  @ApiOperation({ summary: 'Listar SKUs de telas' })
  findAllSkus(@Query('search') search?: string, @Query('categoria') categoria?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.catalogService.findAllSkus({ search, categoria, page, limit });
  }

  @Get('skus/categories')
  @ApiOperation({ summary: 'Obtener categorías de telas' })
  getCategories() {
    return this.catalogService.getCategories();
  }

  @Get('skus/:id')
  @ApiOperation({ summary: 'Obtener SKU por ID' })
  findSkuById(@Param('id') id: string) {
    return this.catalogService.findSkuById(id);
  }

  @Post('skus')
  @ApiOperation({ summary: 'Crear SKU de tela' })
  createSku(@Body() body: any) {
    return this.catalogService.createSku(body);
  }

  @Put('skus/:id')
  @ApiOperation({ summary: 'Actualizar SKU' })
  updateSku(@Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateSku(id, body);
  }

  // ===== SUPPLIERS =====
  @Get('suppliers')
  @ApiOperation({ summary: 'Listar proveedores' })
  findAllSuppliers(@Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.catalogService.findAllSuppliers({ search, page, limit });
  }

  @Post('suppliers')
  @ApiOperation({ summary: 'Crear proveedor' })
  createSupplier(@Body() body: any) {
    return this.catalogService.createSupplier(body);
  }

  @Put('suppliers/:id')
  @ApiOperation({ summary: 'Actualizar proveedor' })
  updateSupplier(@Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateSupplier(id, body);
  }

  // ===== CLIENTS =====
  @Get('clients')
  @ApiOperation({ summary: 'Listar clientes' })
  findAllClients(@Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.catalogService.findAllClients({ search, page, limit });
  }

  @Post('clients')
  @ApiOperation({ summary: 'Crear cliente' })
  createClient(@Body() body: any) {
    return this.catalogService.createClient(body);
  }

  @Put('clients/:id')
  @ApiOperation({ summary: 'Actualizar cliente' })
  updateClient(@Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateClient(id, body);
  }

  // ===== VENDORS =====
  @Get('vendors')
  @ApiOperation({ summary: 'Listar vendedores' })
  findAllVendors(@Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.catalogService.findAllVendors({ search, page, limit });
  }

  @Post('vendors')
  @ApiOperation({ summary: 'Crear vendedor' })
  createVendor(@Body() body: any) {
    return this.catalogService.createVendor(body);
  }

  @Put('vendors/:id')
  @ApiOperation({ summary: 'Actualizar vendedor' })
  updateVendor(@Param('id') id: string, @Body() body: any) {
    return this.catalogService.updateVendor(id, body);
  }
}
