import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== SKUs =====
  async findAllSkus(params: { search?: string; categoria?: string; page?: number; limit?: number }) {
    const page = Math.max(1, +(params.page || 1));
    const limit = Math.min(5000, Math.max(1, +(params.limit || 50)));
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (params.search) {
      where.OR = [
        { nombre: { contains: params.search, mode: 'insensitive' } },
        { codigo: { contains: params.search, mode: 'insensitive' } },
        { color: { contains: params.search, mode: 'insensitive' } },
      ];
    }
    if (params.categoria) where.categoria = params.categoria;

    const [data, total] = await Promise.all([
      this.prisma.skuMaster.findMany({
        where,
        skip,
        take: limit,
        orderBy: { nombre: 'asc' },
        include: {
          supplier: true,
          priceLists: { select: { listaCodigo: true, precio: true } },
        },
      }),
      this.prisma.skuMaster.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findSkuById(id: string) {
    return this.prisma.skuMaster.findUniqueOrThrow({
      where: { id },
      include: {
        supplier: true,
        priceLists: { select: { listaCodigo: true, precio: true } },
        handlingUnits: {
          where: { estadoHu: 'DISPONIBLE' },
          select: { id: true, codigo: true, metrajeActual: true, tipoRollo: true },
        },
      },
    });
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
  async findAllClients(params: { search?: string; vendorId?: string; page?: number; limit?: number }) {
    const { search, vendorId, page = 1, limit = 20 } = params;
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (vendorId) {
      where.vendorId = vendorId === 'UNASSIGNED' ? null : vendorId;
    }
    if (search) {
      where.OR = [
        { nombre: { contains: search, mode: 'insensitive' } },
        { codigo: { contains: search, mode: 'insensitive' } },
        { rfc: { contains: search, mode: 'insensitive' } },
        { telefono: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { direccion: { contains: search, mode: 'insensitive' } },
        { poblacion: { contains: search, mode: 'insensitive' } },
        { estado: { contains: search, mode: 'insensitive' } },
        { vendor: { nombre: { contains: search, mode: 'insensitive' } } },
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

    // Enrich with last order's ATC executive and pending PPD debt summary for the Client Directory
    const clientIds = data.map((c) => c.id);
    const [recentOrders, unpaidInvoices] = clientIds.length > 0
      ? await Promise.all([
          this.prisma.order.findMany({
            where: { clientId: { in: clientIds }, estado: { not: 'CANCELADO' } },
            orderBy: { createdAt: 'desc' },
            select: {
              id: true,
              codigo: true,
              clientId: true,
              creadoPor: true,
              atcUserId: true,
              vendorId: true,
              estado: true,
              fechaPedido: true,
              vendor: { select: { id: true, nombre: true, codigo: true } },
            },
          }),
          this.prisma.order.findMany({
            where: {
              clientId: { in: clientIds },
              metodoPagoCfdi: 'PPD',
              estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
              estado: { not: 'CANCELADO' },
            },
            select: {
              id: true,
              codigo: true,
              clientId: true,
              saldoPendiente: true,
              total: true,
              fechaVencimiento: true,
            },
          }),
        ])
      : [[], []];

    const userIds = new Set<string>();
    for (const o of recentOrders) {
      if (o.atcUserId) userIds.add(o.atcUserId);
      if (o.creadoPor) userIds.add(o.creadoPor);
    }
    const users = userIds.size > 0
      ? await this.prisma.user.findMany({
          where: { id: { in: Array.from(userIds) } },
          select: { id: true, nombre: true, username: true },
        })
      : [];
    const userMap = new Map(users.map((u) => [u.id, u.nombre || u.username]));

    const lastOrderByClient = new Map<string, any>();
    for (const o of recentOrders) {
      if (!lastOrderByClient.has(o.clientId)) {
        lastOrderByClient.set(o.clientId, o);
      }
    }

    const debtByClient = new Map<string, { count: number; saldoTotal: number; vencidasCount: number }>();
    const now = new Date();
    for (const inv of unpaidInvoices) {
      const curr = debtByClient.get(inv.clientId) || { count: 0, saldoTotal: 0, vencidasCount: 0 };
      curr.count += 1;
      curr.saldoTotal += Number(inv.saldoPendiente ?? inv.total ?? 0);
      if (inv.fechaVencimiento && new Date(inv.fechaVencimiento) < now) {
        curr.vencidasCount += 1;
      }
      debtByClient.set(inv.clientId, curr);
    }

    const enrichedData = data.map((c) => {
      const lastOrd = lastOrderByClient.get(c.id);
      const rawAtcId = lastOrd?.atcUserId || lastOrd?.creadoPor || '';
      const ultimoAtcNombre = userMap.get(rawAtcId) || (rawAtcId && rawAtcId.length < 30 ? rawAtcId : null);
      const effectiveVendor = c.vendor || lastOrd?.vendor || null;
      const debt = debtByClient.get(c.id) || { count: 0, saldoTotal: 0, vencidasCount: 0 };

      return {
        ...c,
        vendor: effectiveVendor,
        ultimoAtcNombre,
        ultimoPedidoCodigo: lastOrd?.codigo || null,
        ultimoPedidoFecha: lastOrd?.fechaPedido || null,
        ultimoPedidoEstado: lastOrd?.estado || null,
        deudaSummary: {
          facturasPendientes: debt.count,
          saldoPendienteTotal: Math.round(debt.saldoTotal * 100) / 100,
          facturasVencidas: debt.vencidasCount,
        },
      };
    });

    return { data: enrichedData, total, page, limit, totalPages: Math.ceil(total / limit) };
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
    const { codigo, nombre, contacto, telefono, email, direccion, colonia, poblacion, estado, pais, rfc, cp, regimenFiscal, usoCfdi, listaPrecioDefault, cartaFletera, seguroEnvioDefault, vendorId } = data;
    const updateData: any = {};
    if (codigo !== undefined) updateData.codigo = codigo;
    if (nombre !== undefined) updateData.nombre = nombre;
    if (contacto !== undefined) updateData.contacto = contacto;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (email !== undefined) updateData.email = email;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (colonia !== undefined) updateData.colonia = colonia;
    if (poblacion !== undefined) updateData.poblacion = poblacion;
    if (estado !== undefined) updateData.estado = estado;
    if (pais !== undefined) updateData.pais = pais;
    if (rfc !== undefined) updateData.rfc = rfc;
    if (cp !== undefined) updateData.cp = cp;
    if (regimenFiscal !== undefined) updateData.regimenFiscal = regimenFiscal;
    if (usoCfdi !== undefined) updateData.usoCfdi = usoCfdi;
    if (listaPrecioDefault !== undefined) updateData.listaPrecioDefault = listaPrecioDefault;
    if (cartaFletera !== undefined) updateData.cartaFletera = cartaFletera;
    if (seguroEnvioDefault !== undefined) updateData.seguroEnvioDefault = seguroEnvioDefault;
    if (vendorId !== undefined) updateData.vendorId = vendorId || null;
    return this.prisma.client.update({ where: { id }, data: updateData, include: { vendor: true } });
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

  private extractFabricFamily(nombre: string, color?: string | null): string {
    const cleanName = (nombre || '').trim().toUpperCase();
    const cleanColor = (color || '').trim().toUpperCase();
    if (cleanColor && cleanColor !== 'ÚNICO' && cleanColor !== 'ESTANDAR' && cleanName.endsWith(' ' + cleanColor)) {
      return cleanName.slice(0, cleanName.length - cleanColor.length - 1).trim();
    }
    const multiWordFamilies = ['HOLLAND VELVET', 'ITALIAN VELVET', 'FOREVER PLUS'];
    for (const mw of multiWordFamilies) {
      if (cleanName === mw || cleanName.startsWith(mw + ' ')) return mw;
    }
    return cleanName.split(/\s+/)[0] || cleanName;
  }

  async findSpecialPrice(clientId: string, skuId: string) {
    const exact = await this.prisma.clientSpecialPrice.findFirst({
      where: { clientId, skuId, activo: true },
      include: { sku: true, client: true },
    });
    if (exact) return exact;

    const sku = await this.prisma.skuMaster.findUnique({ where: { id: skuId } });
    if (!sku || sku.tipoArticulo === 'MUESTRARIO' || sku.nombre.toUpperCase().startsWith('MUESTRARIO')) {
      return null;
    }
    const family = this.extractFabricFamily(sku.nombre, sku.color);
    if (!family) return null;

    return this.prisma.clientSpecialPrice.findFirst({
      where: {
        clientId,
        activo: true,
        sku: {
          tipoArticulo: { not: 'MUESTRARIO' },
          OR: [
            { nombre: { equals: family, mode: 'insensitive' } },
            { nombre: { startsWith: `${family} `, mode: 'insensitive' } },
          ],
        },
      },
      include: { sku: true, client: true },
    });
  }

  // ===== RESOLUCIÓN INTELIGENTE DE PRECIO (MATRIZ FORMATEX) =====
  async resolvePrice(params: {
    skuId: string;
    clientId?: string;
    metraje?: number;
    tipoPedido?: string; // 'CORTE' | 'ROLLO_COMPLETO'
    listaOverride?: string; // e.g. 'F5'
  }) {
    const { skuId, clientId, metraje = 50, tipoPedido, listaOverride } = params;

    // 1. Obtener SKU y sus precios en todas las listas (F0 a F10)
    const sku = await this.prisma.skuMaster.findUnique({
      where: { id: skuId },
      include: {
        priceLists: { select: { listaCodigo: true, precio: true } },
      },
    });
    if (!sku) throw new NotFoundException(`SKU no encontrado: ${skuId}`);

    const priceMap: Record<string, number> = {};
    for (const pl of sku.priceLists) {
      priceMap[pl.listaCodigo] = Number(pl.precio);
    }

    // 2. Verificar si existe Precio Especial Pactado por Dirección / Alma (ATC)
    //    Se respeta automáticamente salvo que el usuario fuerce explícitamente una lista F0-F10 distinta
    const hasExplicitListOverride = Boolean(listaOverride && listaOverride !== 'ESPECIAL' && listaOverride !== 'AUTO');
    if (clientId && !hasExplicitListOverride) {
      let specialPrice = await this.prisma.clientSpecialPrice.findFirst({
        where: { clientId, skuId, activo: true },
      });

      // Fallback por familia de tela (todos los colores de la misma tela, excluyendo muestrarios)
      if (!specialPrice && sku.tipoArticulo !== 'MUESTRARIO' && !sku.nombre.toUpperCase().startsWith('MUESTRARIO')) {
        const family = this.extractFabricFamily(sku.nombre, sku.color);
        if (family) {
          specialPrice = await this.prisma.clientSpecialPrice.findFirst({
            where: {
              clientId,
              activo: true,
              sku: {
                tipoArticulo: { not: 'MUESTRARIO' },
                OR: [
                  { nombre: { equals: family, mode: 'insensitive' } },
                  { nombre: { startsWith: `${family} `, mode: 'insensitive' } },
                ],
              },
            },
          });
        }
      }

      if (specialPrice) {
        return {
          precioUnitario: Number(specialPrice.precioPactado),
          listaCodigo: 'ESPECIAL',
          nombreLista: 'Precio Especial Directivo',
          esPrecioEspecial: true,
          requiereAprobacion: false,
          referenciaProyecto: specialPrice.referenciaProyecto,
          autorizadoPor: specialPrice.autorizadoPor,
          notas: specialPrice.notas,
          todasLasListas: priceMap,
          precioReferencia: Number(sku.precioReferencia || 0),
        };
      }
    }

    // 3. Determinar tipo de cliente y reglas especiales de cliente
    let tipoCliente = 'PG';
    let clientNombre = '';
    let clientListaDefault = '';
    if (clientId) {
      const client = await this.prisma.client.findUnique({
        where: { id: clientId },
        select: { tipoCliente: true, nombre: true, listaPrecioDefault: true },
      });
      if (client?.tipoCliente) {
        tipoCliente = client.tipoCliente.toUpperCase().trim();
      }
      if (client?.nombre) {
        clientNombre = client.nombre;
      }
      if (client?.listaPrecioDefault) {
        clientListaDefault = client.listaPrecioDefault.toUpperCase().trim();
      }
    }

    // Normalizar nombres largos de tipoCliente a claves de la matriz oficial
    const tipoNormalization: Record<string, string> = {
      PUBLICO_GENERAL: 'PG',
      CASA_DECORADORA: 'CD',
      DECORADORA: 'CD',
      TIENDA: 'T',
      TIENDA_ESPECIAL: 'XT',
      FABRICANTE: 'F',
      FABRICANTE_ESPECIAL: 'XF',
      DISTRIBUIDOR: 'D',
      DISTRIBUIDOR_ESPECIAL: 'D',
      PREMIUM: 'P',
      CLIENTE_PREMIUM: 'P',
      LISTA_ESPECIAL: 'CE',
      CLIENTE_ESPECIAL: 'CE',
    };
    const normalizedTipo = tipoNormalization[tipoCliente] || tipoCliente;

    // 4. Modalidad: Rollo vs Corte (Regla Tumoine: >= 25m es Rollo; General: >= 50m es Rollo)
    const isTumoine = clientNombre.toUpperCase().includes('TUMOINE');
    const isKabah = clientNombre.toUpperCase().includes('KABAH');
    const umbralRollo = isTumoine ? 25 : (Number(sku.metrajeEstandar) || 50);
    const esCorte = tipoPedido === 'CORTE' || (tipoPedido !== 'ROLLO_COMPLETO' && metraje < umbralRollo);
    const modalidad = esCorte ? 'CORTE' : 'ROLLO';

    // 5. Matriz Oficial Formatex (LISTAS DE PRECIOS ACTUALES.png)
    const matrix: Record<string, { rollo: string; corte: string; nombre: string }> = {
      PG: { rollo: 'F0', corte: 'F1', nombre: 'Público General' },
      CD: { rollo: 'F2', corte: 'F3', nombre: 'Casa Decoradora' },
      T:  { rollo: 'F3', corte: 'F2', nombre: 'Tienda' },
      XT: { rollo: 'F4', corte: 'F3', nombre: 'Tienda Especial' },
      F:  { rollo: 'F5', corte: 'F3', nombre: 'Fabricante' },
      XF: { rollo: 'F5', corte: 'F4', nombre: 'Fabricante Especial' },
      D:  { rollo: 'F6', corte: 'F7', nombre: 'Distribuidor' },
      P:  { rollo: 'F8', corte: 'F9', nombre: 'Cliente Premium' },
      CE: { rollo: 'F10', corte: 'F10', nombre: 'Cliente Especial' },
    };

    const clientRule = matrix[normalizedTipo] || (clientListaDefault === 'F5' ? matrix.F : clientListaDefault === 'F6' ? matrix.D : matrix.PG);
    let listaSugerida = esCorte ? clientRule.corte : clientRule.rollo;
    if (isKabah) {
      // Regla KABAH: Corte y Rollo en F5
      listaSugerida = 'F5';
    }
    const listaFinal = hasExplicitListOverride ? listaOverride! : listaSugerida;

    // Candados gerenciales: F3, F5, F7, F9 requieren autorización si se fuerzan fuera de la regla
    const listasConCandado = ['F3', 'F5', 'F7', 'F9'];
    const requiereAprobacion = hasExplicitListOverride && listaFinal !== listaSugerida && listasConCandado.includes(listaFinal);

    // Obtener precio de la lista elegida
    let precioUnitario = priceMap[listaFinal];
    if (precioUnitario === undefined || precioUnitario === null) {
      precioUnitario = Number(sku.precioReferencia || 0);
    }

    return {
      precioUnitario,
      listaCodigo: listaFinal,
      listaSugerida,
      modalidad,
      tipoCliente: normalizedTipo,
      nombreTipoCliente: clientRule.nombre,
      clientNombre,
      esPrecioEspecial: false,
      requiereAprobacion,
      todasLasListas: priceMap,
      precioReferencia: Number(sku.precioReferencia || 0),
    };
  }

  async createSpecialPrice(data: {
    clientId: string;
    skuId: string;
    precioPactado: number;
    referenciaProyecto?: string;
    autorizadoPor?: string;
    notas?: string;
    vigenteHasta?: string;
    aplicarFamilia?: boolean;
  }) {
    const targetSku = await this.prisma.skuMaster.findUnique({ where: { id: data.skuId } });
    if (!targetSku) throw new NotFoundException('SKU no encontrado');

    const shouldApplyFamily = data.aplicarFamilia !== false && targetSku.tipoArticulo !== 'MUESTRARIO';
    let skusToApply = [targetSku];

    if (shouldApplyFamily) {
      const family = this.extractFabricFamily(targetSku.nombre, targetSku.color);
      if (family) {
        const familySkus = await this.prisma.skuMaster.findMany({
          where: {
            activo: true,
            tipoArticulo: { not: 'MUESTRARIO' },
            OR: [
              { nombre: { equals: family, mode: 'insensitive' } },
              { nombre: { startsWith: `${family} `, mode: 'insensitive' } },
            ],
          },
        });
        if (familySkus.length > 0) {
          skusToApply = familySkus;
        }
      }
    }

    let primaryRecord: any = null;
    for (const s of skusToApply) {
      const rec = await this.prisma.clientSpecialPrice.upsert({
        where: { clientId_skuId: { clientId: data.clientId, skuId: s.id } },
        create: {
          clientId: data.clientId,
          skuId: s.id,
          precioPactado: Number(data.precioPactado),
          referenciaProyecto: data.referenciaProyecto || 'Lista Especial Directivo',
          autorizadoPor: data.autorizadoPor || 'Dirección / Alma (ATC)',
          notas: data.notas,
          vigenteHasta: data.vigenteHasta ? new Date(data.vigenteHasta) : undefined,
          activo: true,
        },
        update: {
          precioPactado: Number(data.precioPactado),
          referenciaProyecto: data.referenciaProyecto || 'Lista Especial Directivo',
          autorizadoPor: data.autorizadoPor || 'Dirección / Alma (ATC)',
          notas: data.notas,
          vigenteHasta: data.vigenteHasta ? new Date(data.vigenteHasta) : undefined,
          activo: true,
        },
      });
      if (s.id === data.skuId || !primaryRecord) primaryRecord = rec;
    }

    return {
      ...primaryRecord,
      skusActualizados: skusToApply.length,
    };
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
