import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // ===== USERS =====
  @Get('users')
  @ApiOperation({ summary: 'Listar usuarios' })
  findAllUsers(@Query('search') search?: string, @Query('roleId') roleId?: string, @Query('page') page?: number, @Query('limit') limit?: number) {
    return this.usersService.findAll({ search, roleId, page, limit });
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Detalle de usuario' })
  findUserById(@Param('id') id: string) { return this.usersService.findById(id); }

  @Post('users')
  @ApiOperation({ summary: 'Crear usuario' })
  createUser(@Body() body: any) { return this.usersService.create(body); }

  @Put('users/:id')
  @ApiOperation({ summary: 'Actualizar usuario' })
  updateUser(@Param('id') id: string, @Body() body: any) { return this.usersService.update(id, body); }

  @Delete('users/:id')
  @ApiOperation({ summary: 'Desactivar usuario' })
  deactivateUser(@Param('id') id: string) { return this.usersService.deactivate(id); }

  // ===== ROLES =====
  @Get('roles')
  @ApiOperation({ summary: 'Listar roles con permisos' })
  findAllRoles() { return this.usersService.findAllRoles(); }

  @Get('roles/:id')
  @ApiOperation({ summary: 'Detalle de rol con usuarios y permisos' })
  findRoleById(@Param('id') id: string) { return this.usersService.findRoleById(id); }

  @Post('roles')
  @ApiOperation({ summary: 'Crear rol con permisos' })
  createRole(@Body() body: any) { return this.usersService.createRole(body); }

  @Put('roles/:id/permissions')
  @ApiOperation({ summary: 'Actualizar permisos del rol' })
  updateRolePermissions(@Param('id') id: string, @Body('permissions') permissions: any) {
    return this.usersService.updateRolePermissions(id, permissions);
  }

  // ===== PASSWORD RESET =====
  @Put('users/:id/reset-password')
  @ApiOperation({ summary: 'Resetear contraseña de usuario' })
  async resetPassword(@Param('id') id: string, @Body('password') password: string) {
    if (!password || password.length < 6) throw new BadRequestException('La contraseña debe tener al menos 6 caracteres');
    return this.usersService.update(id, { password });
  }

  // ===== SYSTEM SETTINGS =====
  @Get('settings')
  @ApiOperation({ summary: 'Listar configuraciones del sistema' })
  getSettings(@Query('grupo') grupo?: string) {
    return this.usersService.getSettings(grupo);
  }

  @Put('settings')
  @ApiOperation({ summary: 'Actualizar una configuración' })
  updateSetting(@Body() body: { clave: string; valor: string; grupo?: string }) {
    return this.usersService.upsertSetting(body.clave, body.valor, body.grupo);
  }
}
