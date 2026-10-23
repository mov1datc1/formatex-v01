import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class TransitService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: { estado?: string; supplierId?: string }) {
    const where: any = {};
    if (params.estado) where.estado = params.estado;
    if (params.supplierId) where.supplierId = params.supplierId;

    const shipments = await this.prisma.incomingShipment.findMany({
      where,
      include: {
        supplier: { select: { id: true, nombre: true, codigo: true } },
        lineas: {
          include: {
            sku: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                color: true,
                composicion: true,
                anchoMetros: true,
                pesoKgPorMetro: true,
                precioReferencia: true,
              },
            },
            reservations: {
              where: { estado: 'ACTIVA' },
              select: {
                id: true,
                metrajeReservado: true,
                tipo: true,
                expiresAt: true,
                order: {
                  select: {
                    id: true,
                    codigo: true,
                    client: { select: { id: true, nombre: true, codigo: true } },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { fechaEstimada: 'asc' },
    });

    return shipments.map(s => ({
      ...s,
      metrajeTotal: s.lineas.reduce((a, l) => a + l.metrajeTotal, 0),
      metrajeReservado: s.lineas.reduce((a, l) => a + l.metrajeReservado, 0),
      metrajeDisponible: Math.max(0, s.lineas.reduce((a, l) => a + (l.metrajeTotal - l.metrajeReservado), 0)),
      totalRollos: s.lineas.reduce((a, l) => a + (l.cantidadRollos || 0), 0),
      diasParaLlegar: Math.ceil((new Date(s.fechaEstimada).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));
  }

  async findById(id: string) {
    return this.prisma.incomingShipment.findUniqueOrThrow({
      where: { id },
      include: {
        supplier: true,
        lineas: {
          include: {
            sku: true,
            reservations: { include: { order: { select: { codigo: true, client: { select: { nombre: true } } } } } },
          },
        },
      },
    });
  }

  async create(data: {
    supplierId: string;
    ordenCompra?: string;
    fechaEstimada: string;
    transportista?: string;
    notas?: string;
    creadoPor: string;
    lineas: Array<{ skuId: string; cantidadRollos: number; metrajePorRollo?: number }>;
  }) {
    const year = new Date().getFullYear();
    const count = await this.prisma.incomingShipment.count();
    const codigo = `EMB-${year}-${String(count + 1).padStart(4, '0')}`;

    return this.prisma.incomingShipment.create({
      data: {
        codigo,
        supplierId: data.supplierId,
        ordenCompra: data.ordenCompra,
        fechaEstimada: new Date(data.fechaEstimada),
        transportista: data.transportista,
        notas: data.notas,
        creadoPor: data.creadoPor,
        lineas: {
          create: data.lineas.map(l => ({
            skuId: l.skuId,
            cantidadRollos: l.cantidadRollos,
            metrajePorRollo: l.metrajePorRollo || 50,
            metrajeTotal: l.cantidadRollos * (l.metrajePorRollo || 50),
          })),
        },
      },
      include: { lineas: true },
    });
  }

  /**
   * Marcar embarque como recibido — conecta con recepción
   */
  async markReceived(id: string) {
    const shipment = await this.prisma.incomingShipment.findUniqueOrThrow({ where: { id } });
    if (shipment.estado !== 'EN_TRANSITO') {
      throw new BadRequestException('Solo embarques en tránsito se pueden marcar como recibidos');
    }
    return this.prisma.incomingShipment.update({
      where: { id },
      data: { estado: 'RECIBIDO', fechaReal: new Date() },
    });
  }

  async getStats() {
    const shipments = await this.prisma.incomingShipment.findMany({
      where: { estado: 'EN_TRANSITO' },
      include: { lineas: true },
    });

    const totalEmbarques = shipments.length;
    const metrajeEsperado = shipments.reduce((a, s) => a + s.lineas.reduce((b, l) => b + l.metrajeTotal, 0), 0);
    const metrajeReservado = shipments.reduce((a, s) => a + s.lineas.reduce((b, l) => b + l.metrajeReservado, 0), 0);
    const proximoEmbarque = shipments.sort((a, b) => new Date(a.fechaEstimada).getTime() - new Date(b.fechaEstimada).getTime())[0];

    return {
      totalEmbarques,
      metrajeEsperado,
      metrajeReservado,
      metrajeDisponible: metrajeEsperado - metrajeReservado,
      proximoEmbarque: proximoEmbarque ? {
        codigo: proximoEmbarque.codigo,
        eta: proximoEmbarque.fechaEstimada,
        diasParaLlegar: Math.ceil((new Date(proximoEmbarque.fechaEstimada).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
      } : null,
    };
  }

  // ===== CÁLCULO DE COSTEO DE IMPORTACIÓN (FÓRMULA OFICIAL ELBA FORMATEX) =====
  async calculateCosting(
    id: string,
    overrides?: {
      tipoCambio?: number;
      gastosIncrementablesPct?: number;
      numeroPedimento?: string;
      aduanaDespacho?: string;
    },
  ) {
    const shipment = await this.prisma.incomingShipment.findUniqueOrThrow({
      where: { id },
      include: {
        supplier: true,
        lineas: {
          include: {
            sku: true,
          },
        },
      },
    });

    const tipoCambio = Number(overrides?.tipoCambio ?? shipment.tipoCambioPedimento ?? 18.3688);
    const gastosPct = Number(overrides?.gastosIncrementablesPct ?? shipment.gastosIncrementablesPct ?? 23.0);
    const factorGastos = 1 + gastosPct / 100;
    const factorFM = 0.88; // Factor de transferencia inter-compañía (Telares -> Formatex)

    let totalMetros = 0;
    let totalRollos = 0;
    let totalUSD = 0;
    let totalPesosSinGastos = 0;
    let totalCostoTT = 0;
    let totalCostoFM = 0;

    const lineasCosteo = shipment.lineas.map((line) => {
      const sku = line.sku;
      const costoFobUSD = Number(sku.costoOrigenUSD || (sku as any).costoEstimado || 0);
      const metraje = Number(line.metrajeTotal);
      const rollos = Number(line.cantidadRollos);

      const subtotalUSD = costoFobUSD * metraje;
      const costoPesosBase = costoFobUSD * tipoCambio;
      const costoLandedTT = costoPesosBase * factorGastos; // Costo Telares y Tejidos
      const costoLandedFM = costoLandedTT / factorFM; // Costo Formatex
      const subtotalTT = costoLandedTT * metraje;
      const subtotalFM = costoLandedFM * metraje;

      totalMetros += metraje;
      totalRollos += rollos;
      totalUSD += subtotalUSD;
      totalPesosSinGastos += costoPesosBase * metraje;
      totalCostoTT += subtotalTT;
      totalCostoFM += subtotalFM;

      return {
        lineId: line.id,
        skuId: sku.id,
        codigo: sku.codigo,
        nombre: sku.nombre,
        color: sku.color,
        cantidadRollos: rollos,
        metrajeTotal: metraje,
        costoFobUSD,
        subtotalUSD: Number(subtotalUSD.toFixed(2)),
        costoPesosBase: Number(costoPesosBase.toFixed(2)),
        costoLandedTT: Number(costoLandedTT.toFixed(2)),
        costoLandedFM: Number(costoLandedFM.toFixed(2)),
        subtotalTT: Number(subtotalTT.toFixed(2)),
        subtotalFM: Number(subtotalFM.toFixed(2)),
      };
    });

    return {
      shipmentId: shipment.id,
      codigoEmbarque: shipment.codigo,
      ordenCompra: shipment.ordenCompra,
      numeroContenedor: shipment.numeroContenedor,
      numeroPedimento: overrides?.numeroPedimento ?? shipment.numeroPedimento ?? '26 16 1924 6003496',
      fechaPagoPedimento: shipment.fechaPagoPedimento,
      aduanaDespacho: overrides?.aduanaDespacho ?? shipment.aduanaDespacho ?? '16 - Manzanillo',
      tipoCambio,
      gastosIncrementablesPct: gastosPct,
      factorTransferenciaFM: factorFM,
      totales: {
        totalRollos,
        totalMetros: Number(totalMetros.toFixed(2)),
        totalUSD: Number(totalUSD.toFixed(2)),
        totalPesosSinGastos: Number(totalPesosSinGastos.toFixed(2)),
        totalCostoTT: Number(totalCostoTT.toFixed(2)),
        totalCostoFM: Number(totalCostoFM.toFixed(2)),
      },
      lineas: lineasCosteo,
    };
  }

  // Guardar costeo y actualizar en cascada costoPuestoMexicoMXN en SkuMaster
  async saveCosting(
    id: string,
    data: {
      tipoCambio: number;
      gastosIncrementablesPct: number;
      numeroPedimento?: string;
      fechaPagoPedimento?: string;
      aduanaDespacho?: string;
      fleteInternacionalMXN?: number;
      seguroCargaMXN?: number;
    },
  ) {
    const costeo = await this.calculateCosting(id, {
      tipoCambio: data.tipoCambio,
      gastosIncrementablesPct: data.gastosIncrementablesPct,
      numeroPedimento: data.numeroPedimento,
      aduanaDespacho: data.aduanaDespacho,
    });

    // 1. Actualizar IncomingShipment
    await this.prisma.incomingShipment.update({
      where: { id },
      data: {
        tipoCambioPedimento: data.tipoCambio,
        gastosIncrementablesPct: data.gastosIncrementablesPct,
        numeroPedimento: data.numeroPedimento,
        fechaPagoPedimento: data.fechaPagoPedimento ? new Date(data.fechaPagoPedimento) : undefined,
        aduanaDespacho: data.aduanaDespacho,
        fleteInternacionalMXN: data.fleteInternacionalMXN,
        seguroCargaMXN: data.seguroCargaMXN,
      },
    });

    // 2. Actualizar costoPuestoMexicoMXN en los SKUs del embarque
    for (const l of costeo.lineas) {
      await this.prisma.skuMaster.update({
        where: { id: l.skuId },
        data: {
          costoPuestoMexicoMXN: l.costoLandedFM,
        },
      });
    }

    return {
      message: 'Costeo de importación aplicado exitosamente y SKUs actualizados',
      costeo,
    };
  }

  // Exportar a formato CONTPAQi Hoja Electrónica
  async exportContpaqi(id: string) {
    const costeo = await this.calculateCosting(id);
    const pedimentoLimpio = (costeo.numeroPedimento || '26 16 1924 6003496').replace(/\s+/g, '');

    // Filas para exportar al layout CONTPAQi
    const rows = costeo.lineas.map((l, idx) => ({
      producto: l.codigo,
      nombre: `${l.nombre} ${l.color || ''}`.trim(),
      um: 'MTS',
      cantidad: l.metrajeTotal,
      costo: l.costoLandedFM,
      importe: l.subtotalFM,
      lote: `${costeo.codigoEmbarque.replace(/[^a-zA-Z0-9]/g, '')}-${idx + 1}`,
      fecFab: new Date().toISOString().split('T')[0],
      fecCad: new Date(Date.now() + 365 * 2 * 24 * 3600 * 1000).toISOString().split('T')[0],
      pedimento: pedimentoLimpio,
    }));

    return {
      embarque: costeo.codigoEmbarque,
      numeroPedimento: costeo.numeroPedimento,
      tipoCambio: costeo.tipoCambio,
      totalRegistros: rows.length,
      rows,
    };
  }
}
