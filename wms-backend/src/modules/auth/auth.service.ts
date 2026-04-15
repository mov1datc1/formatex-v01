import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    // Buscar usuario por username o email
    const user = await this.prisma.user.findFirst({
      where: {
        OR: [{ username }, { email: username }],
        activo: true,
      },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Actualizar último login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { ultimoLogin: new Date() },
    });

    // Generar JWT
    const payload = {
      sub: user.id,
      username: user.username,
      role: user.role.nombre,
      nivel: user.role.nivel,
    };

    const token = this.jwtService.sign(payload);

    // Log de auditoría
    await this.prisma.auditLog.create({
      data: {
        userId: user.id,
        accion: 'LOGIN',
        entidad: 'User',
        entidadId: user.id,
        detalle: { username: user.username, role: user.role.nombre },
      },
    });

    return {
      token,
      user: {
        id: user.id,
        nombre: user.nombre,
        username: user.username,
        email: user.email,
        role: user.role.nombre,
        nivel: user.role.nivel,
        permissions: user.role.permissions.map((p) => ({
          modulo: p.modulo,
          accion: p.accion,
        })),
      },
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            permissions: true,
          },
        },
      },
    });

    if (!user || !user.activo) {
      throw new UnauthorizedException('Usuario no encontrado o inactivo');
    }

    return {
      id: user.id,
      nombre: user.nombre,
      username: user.username,
      email: user.email,
      role: user.role.nombre,
      nivel: user.role.nivel,
      permissions: user.role.permissions.map((p) => ({
        modulo: p.modulo,
        accion: p.accion,
      })),
    };
  }

  async validateUser(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, activo: true },
      include: { role: true },
    });
    return user;
  }
}
