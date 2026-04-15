import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class WarehouseService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== WAREHOUSES (Almacenes/Bodegas) =====
  async findAllWarehouses() {
    return this.prisma.warehouse.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { zones: true } },
      },
    });
  }

  async findWarehouseById(id: string) {
    return this.prisma.warehouse.findUniqueOrThrow({
      where: { id },
      include: {
        zones: {
          where: { activo: true },
          orderBy: { orden: 'asc' },
          include: {
            _count: { select: { locations: true } },
            locations: {
              where: { activo: true },
              select: { id: true, codigo: true, estado: true },
              take: 10,
            },
          },
        },
      },
    });
  }

  async createWarehouse(data: {
    nombre: string;
    codigo: string;
    tipo: string; // FISICO | VIRTUAL
    descripcion?: string;
    areaM2?: number;
    clienteAsignado?: string; // Para bodegas virtuales — ID del cliente
  }) {
    return this.prisma.warehouse.create({ data: { ...data, activo: true } as any });
  }

  async updateWarehouse(id: string, data: any) {
    return this.prisma.warehouse.update({ where: { id }, data });
  }

  // ===== ZONES =====
  async findAllZones(params: { warehouseId?: string; tipo?: string }) {
    const where: any = { activo: true };
    if (params.warehouseId) where.warehouseId = params.warehouseId;
    if (params.tipo) where.tipo = params.tipo;
    return this.prisma.zone.findMany({
      where,
      orderBy: { orden: 'asc' },
      include: {
        warehouse: { select: { nombre: true, codigo: true } },
        _count: { select: { locations: true } },
      },
    });
  }

  async createZone(data: {
    warehouseId: string;
    nombre: string;
    codigo: string;
    tipo: string;
    descripcion?: string;
    orden?: number;
  }) {
    return this.prisma.zone.create({ data: { ...data, activo: true } as any });
  }

  async updateZone(id: string, data: any) {
    return this.prisma.zone.update({ where: { id }, data });
  }

  // ===== LOCATIONS =====
  async findAllLocations(params: {
    zoneId?: string;
    warehouseId?: string;
    estado?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const { zoneId, warehouseId, estado, search, page = 1, limit = 50 } = params;
    const skip = (page - 1) * limit;
    const where: any = { activo: true };
    if (zoneId) where.zoneId = zoneId;
    if (warehouseId) where.zone = { warehouseId };
    if (estado) where.estado = estado;
    if (search) {
      where.OR = [
        { codigo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.location.findMany({
        where,
        skip,
        take: limit,
        orderBy: { codigo: 'asc' },
        include: {
          zone: { select: { nombre: true, tipo: true, codigo: true } },
          _count: { select: { handlingUnits: true } },
          handlingUnits: {
            where: { estadoHu: { not: 'AGOTADO' } },
            select: { id: true, codigo: true, metrajeActual: true, tipoRollo: true },
            take: 5,
          },
        },
      }),
      this.prisma.location.count({ where }),
    ]);
    return { data, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async createLocation(data: {
    zoneId: string;
    codigo: string;
    tipo: string;
    pasillo?: string;
    nivel?: number;
    posicion?: number;
    capacidad?: number;
  }) {
    // Verificar que no exista el código
    const exists = await this.prisma.location.findFirst({ where: { codigo: data.codigo } });
    if (exists) throw new BadRequestException(`Ubicación ${data.codigo} ya existe`);
    return this.prisma.location.create({ data: { ...data, estado: 'LIBRE', activo: true } as any });
  }

  async createBulkLocations(data: {
    zoneId: string;
    prefijoPasillo: string;
    pasilloInicio: number;
    pasilloFin: number;
    nivelesInicio: number;
    nivelesFin: number;
    posicionesInicio: number;
    posicionesFin: number;
    tipo: string;
    capacidad: number;
  }) {
    const locations: any[] = [];
    for (let p = data.pasilloInicio; p <= data.pasilloFin; p++) {
      for (let n = data.nivelesInicio; n <= data.nivelesFin; n++) {
        for (let pos = data.posicionesInicio; pos <= data.posicionesFin; pos++) {
          const codigo = `${data.prefijoPasillo}${String(p).padStart(2, '0')}-N${n}-P${String(pos).padStart(2, '0')}`;
          locations.push({
            zoneId: data.zoneId,
            codigo,
            tipo: data.tipo,
            pasillo: `${data.prefijoPasillo}${String(p).padStart(2, '0')}`,
            nivel: n,
            posicion: pos,
            capacidad: data.capacidad,
            estado: 'LIBRE',
            activo: true,
          });
        }
      }
    }

    const created = await this.prisma.location.createMany({
      data: locations,
      skipDuplicates: true,
    });
    return { created: created.count, total: locations.length };
  }

  async updateLocation(id: string, data: any) {
    return this.prisma.location.update({ where: { id }, data });
  }

  async findLocationById(id: string) {
    return this.prisma.location.findUniqueOrThrow({
      where: { id },
      include: {
        zone: { select: { nombre: true, tipo: true, codigo: true, warehouse: { select: { nombre: true, codigo: true } } } },
        handlingUnits: {
          where: { estadoHu: { not: 'AGOTADO' } },
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            codigo: true,
            metrajeOriginal: true,
            metrajeActual: true,
            tipoRollo: true,
            estadoHu: true,
            createdAt: true,
            sku: { select: { id: true, codigo: true, nombre: true, color: true, composicion: true } },
          },
        },
        _count: { select: { handlingUnits: true } },
      },
    });
  }

  // ===== SUGERENCIA DE UBICACIÓN =====
  /**
   * Sugiere la mejor ubicación para un rollo según:
   * 1. Tipo de zona (MERMA vs ENTEROS)
   * 2. Rango de metraje (para retazos)
   * 3. Disponibilidad (LIBRE > PARCIAL)
   * 4. Proximidad a rollos del mismo SKU
   */
  async suggestLocation(params: {
    tipoRollo: 'ENTERO' | 'RETAZO';
    metraje: number;
    skuId?: string;
    warehouseId?: string;
  }): Promise<{ suggested: any; alternatives: any[] }> {
    const { tipoRollo, metraje, skuId } = params;

    let zonaCodigo: string | null = null;

    if (tipoRollo === 'RETAZO') {
      // Buscar zona de merma según rango
      const mermaConfig = await this.prisma.mermaRangeConfig.findFirst({
        where: {
          activo: true,
          minMetros: { lte: metraje },
          maxMetros: { gte: metraje },
        },
        orderBy: { orden: 'asc' },
      });
      zonaCodigo = mermaConfig?.zonaCodigo || null;
    }

    // Buscar zonas apropiadas
    const zoneWhere: any = { activo: true };
    if (zonaCodigo) {
      zoneWhere.codigo = zonaCodigo;
    } else if (tipoRollo === 'ENTERO') {
      zoneWhere.tipo = 'ROLLOS_ENTEROS';
    }

    const zones = await this.prisma.zone.findMany({
      where: zoneWhere,
      select: { id: true },
    });
    const zoneIds = zones.map((z) => z.id);

    // Buscar ubicaciones disponibles en las zonas objetivo
    const locations = await this.prisma.location.findMany({
      where: {
        zoneId: { in: zoneIds },
        estado: { in: ['LIBRE', 'PARCIAL'] },
        activo: true,
      },
      orderBy: [{ estado: 'asc' }, { codigo: 'asc' }], // LIBRE primero
      take: 5,
      include: {
        zone: { select: { nombre: true, tipo: true, codigo: true } },
        _count: { select: { handlingUnits: true } },
      },
    });

    // Si hay SKU, priorizar ubicaciones donde ya haya rollos del mismo SKU
    if (skuId && locations.length > 0) {
      const withSameSku = await this.prisma.location.findMany({
        where: {
          zoneId: { in: zoneIds },
          estado: 'PARCIAL',
          activo: true,
          handlingUnits: { some: { skuId, estadoHu: { not: 'AGOTADO' } } },
        },
        take: 3,
        include: {
          zone: { select: { nombre: true, tipo: true, codigo: true } },
          _count: { select: { handlingUnits: true } },
        },
      });

      if (withSameSku.length > 0) {
        return {
          suggested: withSameSku[0],
          alternatives: [...withSameSku.slice(1), ...locations.filter((l) => !withSameSku.find((s) => s.id === l.id))].slice(0, 4),
        };
      }
    }

    return {
      suggested: locations[0] || null,
      alternatives: locations.slice(1),
    };
  }

  // ===== MERMA RANGE CONFIG =====
  async findAllMermaRanges() {
    return this.prisma.mermaRangeConfig.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });
  }

  async createMermaRange(data: {
    nombre: string;
    minMetros: number;
    maxMetros: number;
    zonaCodigo: string;
    orden: number;
  }) {
    return this.prisma.mermaRangeConfig.create({ data: { ...data, activo: true } as any });
  }

  async updateMermaRange(id: string, data: any) {
    return this.prisma.mermaRangeConfig.update({ where: { id }, data });
  }

  // ===== STATS =====
  async getWarehouseStats() {
    const [totalZones, totalLocations, freeLocations, partialLocations, occupiedLocations, totalWarehouses] = await Promise.all([
      this.prisma.zone.count({ where: { activo: true } }),
      this.prisma.location.count({ where: { activo: true } }),
      this.prisma.location.count({ where: { estado: 'LIBRE', activo: true } }),
      this.prisma.location.count({ where: { estado: 'PARCIAL', activo: true } }),
      this.prisma.location.count({ where: { estado: 'OCUPADA', activo: true } }),
      this.prisma.warehouse.count({ where: { activo: true } }),
    ]);
    return { totalZones, totalLocations, freeLocations, partialLocations, occupiedLocations, totalWarehouses, occupancy: totalLocations > 0 ? Math.round(((partialLocations + occupiedLocations) / totalLocations) * 100) : 0 };
  }
}
