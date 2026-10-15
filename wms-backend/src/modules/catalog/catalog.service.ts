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
        { rfc: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.client.findMany({
        where, skip, take: limit, orderBy: { nombre: 'asc' },
        include: {
          vendor: true,
          addresses: { where: { activo: true } },
          creditConfig: true,
          _count: { select: { specialPrices: true, orders: true } },
        },
      }),
      this.prisma.client.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createClient(data: any) {
    return this.prisma.client.create({
      data,
      include: { addresses: true, creditConfig: true },
    });
  }

  async findClientById(id: string) {
    return this.prisma.client.findUniqueOrThrow({
      where: { id },
      include: {
        vendor: true,
        addresses: { where: { activo: true }, orderBy: { esPredeterminada: 'desc' } },
        specialPrices: {
          where: { activo: true },
          include: { sku: { select: { id: true, codigo: true, nombre: true, color: true, precioReferencia: true } } },
        },
        creditConfig: true,
      },
    });
  }

  async updateClient(id: string, data: any) {
    // Only allow editable fields to prevent Prisma errors
    const { codigo, nombre, contacto, telefono, email, direccion, pais, rfc, cp, regimenFiscal, usoCfdi, listaPrecioDefault, cartaFletera, seguroEnvioDefault } = data;
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
    if (listaPrecioDefault !== undefined) updateData.listaPrecioDefault = listaPrecioDefault;
    if (cartaFletera !== undefined) updateData.cartaFletera = cartaFletera;
    if (seguroEnvioDefault !== undefined) updateData.seguroEnvioDefault = seguroEnvioDefault;
    return this.prisma.client.update({ where: { id }, data: updateData });
  }

  async deleteClient(id: string) {
    // Soft delete — mark as inactive
    return this.prisma.client.update({ where: { id }, data: { activo: false } });
  }

  // ===== CLIENT ADDRESSES =====
  async getClientAddresses(clientId: string) {
    return this.prisma.clientAddress.findMany({
      where: { clientId, activo: true },
      orderBy: [{ esPredeterminada: 'desc' }, { alias: 'asc' }],
    });
  }

  async createClientAddress(clientId: string, data: any) {
    if (data.esPredeterminada) {
      await this.prisma.clientAddress.updateMany({
        where: { clientId },
        data: { esPredeterminada: false },
      });
    }
    return this.prisma.clientAddress.create({
      data: { ...data, clientId },
    });
  }

  async updateClientAddress(id: string, data: any) {
    if (data.esPredeterminada) {
      const addr = await this.prisma.clientAddress.findUnique({ where: { id } });
      if (addr) {
        await this.prisma.clientAddress.updateMany({
          where: { clientId: addr.clientId },
          data: { esPredeterminada: false },
        });
      }
    }
    return this.prisma.clientAddress.update({ where: { id }, data });
  }

  async deleteClientAddress(id: string) {
    return this.prisma.clientAddress.update({ where: { id }, data: { activo: false } });
  }

  // ===== CLIENT SPECIAL PRICES =====
  async findAllSpecialPrices(params: { clientId?: string; skuId?: string; search?: string; page?: number; limit?: number }) {
    const { clientId, skuId, search, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (clientId) where.clientId = clientId;
    if (skuId) where.skuId = skuId;
    if (search) {
      where.OR = [
        { client: { nombre: { contains: search, mode: 'insensitive' } } },
        { client: { codigo: { contains: search, mode: 'insensitive' } } },
        { sku: { nombre: { contains: search, mode: 'insensitive' } } },
        { sku: { codigo: { contains: search, mode: 'insensitive' } } },
        { referenciaProyecto: { contains: search, mode: 'insensitive' } },
      ];
    }
    const [data, total] = await Promise.all([
      this.prisma.clientSpecialPrice.findMany({
        where, skip, take: limit, orderBy: { createdAt: 'desc' },
        include: {
          client: { select: { id: true, codigo: true, nombre: true } },
          sku: { select: { id: true, codigo: true, nombre: true, color: true, precioReferencia: true } },
        },
      }),
      this.prisma.clientSpecialPrice.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findSpecialPrice(clientId: string, skuId: string) {
    return this.prisma.clientSpecialPrice.findFirst({
      where: { clientId, skuId, activo: true },
      include: { sku: true, client: true },
    });
  }

  async createSpecialPrice(data: { clientId: string; skuId: string; precioPactado: number; referenciaProyecto?: string; autorizadoPor?: string; notas?: string; vigenteHasta?: string }) {
    return this.prisma.clientSpecialPrice.upsert({
      where: { clientId_skuId: { clientId: data.clientId, skuId: data.skuId } },
      create: {
        clientId: data.clientId,
        skuId: data.skuId,
        precioPactado: data.precioPactado,
        referenciaProyecto: data.referenciaProyecto,
        autorizadoPor: data.autorizadoPor || 'Dirección General',
        notas: data.notas,
        vigenteHasta: data.vigenteHasta ? new Date(data.vigenteHasta) : undefined,
        activo: true,
      },
      update: {
        precioPactado: data.precioPactado,
        referenciaProyecto: data.referenciaProyecto,
        autorizadoPor: data.autorizadoPor || 'Dirección General',
        notas: data.notas,
        vigenteHasta: data.vigenteHasta ? new Date(data.vigenteHasta) : undefined,
        activo: true,
      },
    });
  }

  async updateSpecialPrice(id: string, data: any) {
    return this.prisma.clientSpecialPrice.update({ where: { id }, data });
  }

  async deleteSpecialPrice(id: string) {
    return this.prisma.clientSpecialPrice.update({ where: { id }, data: { activo: false } });
  }

  async bulkCreateSpecialPrices(items: any[]) {
    const results = { created: 0, updated: 0, errors: [] as { row: number; error: string }[] };
    for (let i = 0; i < items.length; i++) {
      try {
        const item = items[i];
        let clientId = item.clientId;
        let skuId = item.skuId;

        // Auto-resolve client by code or name if UUID not provided
        if (!clientId && item.clientCodigo) {
          const c = await this.prisma.client.findFirst({
            where: { OR: [{ codigo: item.clientCodigo }, { nombre: { contains: item.clientCodigo, mode: 'insensitive' } }] },
          });
          if (c) clientId = c.id;
        }

        // Auto-resolve SKU by code or name if UUID not provided
        if (!skuId && item.skuCodigo) {
          const s = await this.prisma.skuMaster.findFirst({
            where: { OR: [{ codigo: item.skuCodigo }, { nombre: { contains: item.skuCodigo, mode: 'insensitive' } }] },
          });
          if (s) skuId = s.id;
        }

        if (!clientId || !skuId) {
          results.errors.push({ row: i + 1, error: `Cliente (${item.clientCodigo}) o Tela (${item.skuCodigo}) no encontrados` });
          continue;
        }

        const precio = Number(item.precioPactado);
        if (isNaN(precio) || precio <= 0) {
          results.errors.push({ row: i + 1, error: `Precio inválido: ${item.precioPactado}` });
          continue;
        }

        const existing = await this.prisma.clientSpecialPrice.findUnique({
          where: { clientId_skuId: { clientId, skuId } },
        });

        await this.prisma.clientSpecialPrice.upsert({
          where: { clientId_skuId: { clientId, skuId } },
          create: {
            clientId,
            skuId,
            precioPactado: precio,
            referenciaProyecto: item.referenciaProyecto || item.proyecto || 'Convenio Especial',
            autorizadoPor: item.autorizadoPor || 'Dirección General',
            notas: item.notas,
            activo: true,
          },
          update: {
            precioPactado: precio,
            referenciaProyecto: item.referenciaProyecto || item.proyecto,
            autorizadoPor: item.autorizadoPor || 'Dirección General',
            notas: item.notas,
            activo: true,
          },
        });

        if (existing) results.updated++;
        else results.created++;
      } catch (e: any) {
        results.errors.push({ row: i + 1, error: e.message || 'Error al procesar fila' });
      }
    }
    return results;
  }

  // ===== PRICE LIST CONFIGS =====
  async findAllPriceLists() {
    return this.prisma.priceListConfig.findMany({
      orderBy: { orden: 'asc' },
    });
  }

  async updatePriceList(id: string, data: any) {
    return this.prisma.priceListConfig.update({ where: { id }, data });
  }

  async seedPriceLists() {
    const count = await this.prisma.priceListConfig.count();
    if (count > 0) return { message: 'Las listas de precios ya existen', count };

    const lists = [
      { codigo: 'F1', nombre: 'Casa Decoradora', comisionPct: 2.50, descuentoPct: 0.00, requiereAprobacion: false, descripcion: 'Clientes de diseño y decoración residencial.', orden: 1 },
      { codigo: 'F2', nombre: 'Tienda', comisionPct: 2.25, descuentoPct: 5.00, requiereAprobacion: false, descripcion: 'Tiendas de tela y mercerías al mayoreo.', orden: 2 },
      { codigo: 'F3', nombre: 'Tienda Especial', comisionPct: 2.00, descuentoPct: 8.00, requiereAprobacion: true, descripcion: 'Tiendas con convenio de volumen. Requiere autorización gerencial.', orden: 3 },
      { codigo: 'F4', nombre: 'Fabricante', comisionPct: 2.00, descuentoPct: 10.00, requiereAprobacion: false, descripcion: 'Fabricantes de muebles y confección.', orden: 4 },
      { codigo: 'F5', nombre: 'Fabricante Especial', comisionPct: 1.75, descuentoPct: 15.00, requiereAprobacion: true, descripcion: 'Fabricantes con contrato especial o floor-plan. Requiere autorización gerencial.', orden: 5 },
      { codigo: 'F6', nombre: 'Distribuidor', comisionPct: 1.75, descuentoPct: 18.00, requiereAprobacion: false, descripcion: 'Distribuidores regionales de tela.', orden: 6 },
      { codigo: 'F7', nombre: 'Distribuidor Especial', comisionPct: 1.50, descuentoPct: 22.00, requiereAprobacion: true, descripcion: 'Grandes distribuidores mayoristas. Requiere autorización gerencial.', orden: 7 },
      { codigo: 'F8', nombre: 'Cliente Premium', comisionPct: 1.50, descuentoPct: 25.00, requiereAprobacion: false, descripcion: 'Cuentas clave institucionales de alto volumen recurrente.', orden: 8 },
      { codigo: 'F9', nombre: 'Precio Dirección / Mayorista', comisionPct: 1.00, descuentoPct: 30.00, requiereAprobacion: true, descripcion: 'Convenios directos aprobados por Dirección General.', orden: 9 },
      { codigo: 'F10', nombre: 'Venta Web / Público Externo', comisionPct: 0.00, descuentoPct: 0.00, requiereAprobacion: false, descripcion: 'Compras esporádicas no registradas canalizadas vía marketing.', orden: 10 },
    ];
    await this.prisma.priceListConfig.createMany({ data: lists });
    return { message: '10 listas de precios creadas exitosamente', count: 10 };
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
