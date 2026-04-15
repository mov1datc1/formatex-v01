import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== SKUs =====
  async findAllSkus(params: { search?: string; categoria?: string; page?: number; limit?: number }) {
    const { search, categoria, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { color: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (categoria) where.categoria = categoria;

    const [data, total] = await Promise.all([
      this.prisma.skuMaster.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, include: { supplier: true } }),
      this.prisma.skuMaster.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findSkuById(id: string) {
    return this.prisma.skuMaster.findUniqueOrThrow({ where: { id }, include: { supplier: true, handlingUnits: { where: { estadoHu: 'DISPONIBLE' }, select: { id: true, codigo: true, metrajeActual: true, tipoRollo: true } } } });
  }

  async createSku(data: any) {
    return this.prisma.skuMaster.create({ data });
  }

  async updateSku(id: string, data: any) {
    return this.prisma.skuMaster.update({ where: { id }, data });
  }

  // ===== SUPPLIERS =====
  async findAllSuppliers(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.supplier.findMany({ where, skip, take: limit, orderBy: { nombre: 'asc' } }),
      this.prisma.supplier.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createSupplier(data: any) {
    return this.prisma.supplier.create({ data });
  }

  async updateSupplier(id: string, data: any) {
    return this.prisma.supplier.update({ where: { id }, data });
  }

  // ===== CLIENTS =====
  async findAllClients(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({ where, skip, take: limit, orderBy: { nombre: 'asc' }, include: { vendor: true } }),
      this.prisma.client.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createClient(data: any) {
    return this.prisma.client.create({ data });
  }

  async updateClient(id: string, data: any) {
    return this.prisma.client.update({ where: { id }, data });
  }

  // ===== VENDORS =====
  async findAllVendors(params: { search?: string; page?: number; limit?: number }) {
    const { search, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.vendor.findMany({ where, skip, take: limit, orderBy: { nombre: 'asc' } }),
      this.prisma.vendor.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createVendor(data: any) {
    return this.prisma.vendor.create({ data });
  }

  async updateVendor(id: string, data: any) {
    return this.prisma.vendor.update({ where: { id }, data });
  }

  // ===== CATEGORIES (distinct) =====
  async getCategories() {
    const result = await this.prisma.skuMaster.findMany({ where: { activo: true }, select: { categoria: true }, distinct: ['categoria'] });
    return result.map((r) => r.categoria).filter(Boolean);
  }
}
