import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { search?: string; roleId?: string; activo?: boolean; page?: number; limit?: number }) {
    const { search, roleId, activo = true, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (activo !== undefined) where.activo = activo;
    if (roleId) where.roleId = roleId;
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where, skip, take: limit, orderBy: { nombre: 'asc' },
        select: {
          id: true, nombre: true, username: true, email: true,
          activo: true, createdAt: true, ultimoLogin: true,
          role: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findById(id: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id },
      select: {
        id: true, nombre: true, username: true, email: true,
        activo: true, createdAt: true, updatedAt: true, ultimoLogin: true,
        role: { include: { permissions: true } },
      },
    });
  }

  async create(data: {
    nombre: string;
    username: string;
    email: string;
    password: string;
    roleId: string;
  }) {
    const exists = await this.prisma.user.findFirst({ where: { username: data.username } });
    if (exists) throw new BadRequestException(`Usuario "${data.username}" ya existe`);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        nombre: data.nombre,
        username: data.username,
        email: data.email,
        password: hashedPassword,
        roleId: data.roleId,
        activo: true,
      },
      select: {
        id: true, nombre: true, username: true, email: true,
        role: { select: { nombre: true } },
      },
    });
  }

  async update(id: string, data: any) {
    if (data.password) {
      data.password = await bcrypt.hash(data.password, 10);
    }
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, nombre: true, username: true, email: true, activo: true,
        role: { select: { nombre: true } },
      },
    });
  }

  async deactivate(id: string) {
    return this.prisma.user.update({ where: { id }, data: { activo: false } });
  }

  // ===== ROLES =====
  async findAllRoles() {
    return this.prisma.role.findMany({
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { users: true } },
        permissions: { orderBy: { modulo: 'asc' } },
      },
    });
  }

  async findRoleById(id: string) {
    return this.prisma.role.findUniqueOrThrow({
      where: { id },
      include: {
        permissions: { orderBy: { modulo: 'asc' } },
        users: { select: { id: true, nombre: true, username: true, activo: true }, orderBy: { nombre: 'asc' } },
      },
    });
  }

  async createRole(data: {
    nombre: string;
    descripcion?: string;
    nivel?: number;
    permissions: Array<{ modulo: string; accion: string }>;
  }) {
    return this.prisma.role.create({
      data: {
        nombre: data.nombre,
        descripcion: data.descripcion,
        nivel: data.nivel || 4,
        permissions: {
          create: data.permissions,
        },
      },
      include: { permissions: true },
    });
  }

  async updateRolePermissions(roleId: string, permissions: Array<{ modulo: string; accion: string }>) {
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    await this.prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ ...p, roleId })),
    });
    return this.findRoleById(roleId);
  }

  // ===== SYSTEM SETTINGS =====
  async getSettings(grupo?: string) {
    const where: any = {};
    if (grupo) where.grupo = grupo;
    return this.prisma.systemSetting.findMany({
      where,
      orderBy: [{ grupo: 'asc' }, { clave: 'asc' }],
    });
  }

  async upsertSetting(clave: string, valor: string, grupo?: string) {
    return this.prisma.systemSetting.upsert({
      where: { clave },
      update: { valor },
      create: { clave, valor, grupo: grupo || 'general' },
    });
  }
}
