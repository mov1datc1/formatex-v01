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
}
