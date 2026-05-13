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

  async findClientById(id: string) {
    return this.prisma.client.findUniqueOrThrow({
      where: { id },
      include: { vendor: true },
    });
  }

  async updateClient(id: string, data: any) {
    // Only allow editable fields to prevent Prisma errors
    const { codigo, nombre, contacto, telefono, email, direccion, pais, rfc, cp, regimenFiscal, usoCfdi } = data;
    const updateData: any = {};
    if (codigo !== undefined) updateData.codigo = codigo;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (contacto !== undefined) updateData.contacto = contacto;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (email !== undefined) updateData.email = email;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (pais !== undefined) updateData.pais = pais;
    if (rfc !== undefined) updateData.rfc = rfc;
    if (cp !== undefined) updateData.cp = cp;
    if (regimenFiscal !== undefined) updateData.regimenFiscal = regimenFiscal;
    if (usoCfdi !== undefined) updateData.usoCfdi = usoCfdi;
    return this.prisma.client.update({ where: { id }, data: updateData });
  }

  async deleteClient(id: string) {
    // Soft delete — mark as inactive
    return this.prisma.client.update({ where: { id }, data: { activo: false } });
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

  // ===== BULK IMPORT =====
  async bulkCreateSkus(items: any[]) {
    const results = { created: 0, errors: [] as { row: number; error: string }[] };
    for (let i = 0; i < items.length; i++) {
      try {
        const { codigo, nombre, categoria, color, composicion, anchoMetros, metrajeEstandar, codigoBarras } = items[i];
        if (!codigo || !nombre) { results.errors.push({ row: i + 1, error: 'Código y nombre son obligatorios' }); continue; }
        await this.prisma.skuMaster.create({
          data: { codigo, nombre, categoria, color, composicion, anchoMetros: anchoMetros ? Number(anchoMetros) : null, metrajeEstandar: metrajeEstandar ? Number(metrajeEstandar) : 50, codigoBarras },
        });
        results.created++;
      } catch (e: any) {
        results.errors.push({ row: i + 1, error: e.code === 'P2002' ? `Código duplicado: ${items[i].codigo}` : (e.message || 'Error desconocido') });
      }
    }
    return results;
  }

  async bulkCreateSuppliers(items: any[]) {
    const results = { created: 0, errors: [] as { row: number; error: string }[] };
    for (let i = 0; i < items.length; i++) {
      try {
        const { codigo, nombre, contacto, telefono, email, rfc } = items[i];
        if (!codigo || !nombre) { results.errors.push({ row: i + 1, error: 'Código y nombre son obligatorios' }); continue; }
        await this.prisma.supplier.create({ data: { codigo, nombre, contacto, telefono, email, rfc } });
        results.created++;
      } catch (e: any) {
        results.errors.push({ row: i + 1, error: e.code === 'P2002' ? `Código duplicado: ${items[i].codigo}` : (e.message || 'Error desconocido') });
      }
    }
    return results;
  }

  async bulkCreateClients(items: any[]) {
    const results = { created: 0, errors: [] as { row: number; error: string }[] };
    for (let i = 0; i < items.length; i++) {
      try {
        const { codigo, nombre, contacto, telefono, email, direccion, pais, rfc, cp, regimenFiscal, usoCfdi } = items[i];
        if (!codigo || !nombre) { results.errors.push({ row: i + 1, error: 'Código y nombre son obligatorios' }); continue; }
        await this.prisma.client.create({ data: { codigo, nombre, contacto, telefono, email, direccion, pais, rfc, cp, regimenFiscal, usoCfdi } });
        results.created++;
      } catch (e: any) {
        results.errors.push({ row: i + 1, error: e.code === 'P2002' ? `Código duplicado: ${items[i].codigo}` : (e.message || 'Error desconocido') });
      }
    }
    return results;
  }

  async bulkCreateVendors(items: any[]) {
    const results = { created: 0, errors: [] as { row: number; error: string }[] };
    for (let i = 0; i < items.length; i++) {
      try {
        const { codigo, nombre, telefono, email } = items[i];
        if (!codigo || !nombre) { results.errors.push({ row: i + 1, error: 'Código y nombre son obligatorios' }); continue; }
        await this.prisma.vendor.create({ data: { codigo, nombre, telefono, email } });
        results.created++;
      } catch (e: any) {
        results.errors.push({ row: i + 1, error: e.code === 'P2002' ? `Código duplicado: ${items[i].codigo}` : (e.message || 'Error desconocido') });
      }
    }
    return results;
  }
}
