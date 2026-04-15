import { Controller, Get, Post, Body, Param, Query, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { CuttingService } from './cutting.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('cutting')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cutting')
export class CuttingController {
  constructor(private readonly cuttingService: CuttingService) {}

  @Get('stats')
  @ApiOperation({ summary: 'Estadísticas de corte' })
  getStats() { return this.cuttingService.getCuttingStats(); }

  @Get()
  @ApiOperation({ summary: 'Listar operaciones de corte' })
  findAll(@Query('search') search?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.cuttingService.findAllCuts({ search, page, limit });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de operación de corte' })
  findById(@Param('id') id: string) { return this.cuttingService.findCutById(id); }

  @Post()
  @ApiOperation({ summary: 'Ejecutar corte de rollo (genera retazo + auto-ubicación)' })
  executeCut(@Body() body: any, @Req() req: any) {
    return this.cuttingService.executeCut({ ...body, cortadoPor: req.user.sub });
  }
}
