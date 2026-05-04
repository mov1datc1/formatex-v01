import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma.service';

@Injectable()
export class CreditService {
  private readonly logger = new Logger(CreditService.name);

  constructor(private readonly prisma: PrismaService) {}

  // -----------------------------------------------------------------------
  // OBTENER CONFIG DE CRÉDITO DE UN CLIENTE
  // -----------------------------------------------------------------------
  async getCreditConfig(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { creditConfig: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');
    return {
      client: { id: client.id, nombre: client.nombre, codigo: client.codigo },
      creditConfig: client.creditConfig || null,
    };
  }

  // -----------------------------------------------------------------------
  // CREAR O ACTUALIZAR CONFIG DE CRÉDITO
  // -----------------------------------------------------------------------
  async upsertCreditConfig(
    clientId: string,
    data: {
      creditoHabilitado?: boolean;
      plazoDefault?: number;
      montoMaximo?: number | null;
      listaDefault?: string;
      descuentoMaximo?: number;
      notas?: string;
    },
  ) {
    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const config = await this.prisma.clientCreditConfig.upsert({
      where: { clientId },
      create: {
        clientId,
        creditoHabilitado: data.creditoHabilitado ?? true,
        plazoDefault: data.plazoDefault ?? 30,
        montoMaximo: data.montoMaximo,
        listaDefault: data.listaDefault,
        descuentoMaximo: data.descuentoMaximo ?? 20,
        notas: data.notas,
      },
      update: {
        ...(data.creditoHabilitado !== undefined && { creditoHabilitado: data.creditoHabilitado }),
        ...(data.plazoDefault !== undefined && { plazoDefault: data.plazoDefault }),
        ...(data.montoMaximo !== undefined && { montoMaximo: data.montoMaximo }),
        ...(data.listaDefault !== undefined && { listaDefault: data.listaDefault }),
        ...(data.descuentoMaximo !== undefined && { descuentoMaximo: data.descuentoMaximo }),
        ...(data.notas !== undefined && { notas: data.notas }),
      },
    });

    this.logger.log(`Crédito actualizado para ${client.nombre}: plazo=${config.plazoDefault}d, lista=${config.listaDefault}`);
    return config;
  }

  // -----------------------------------------------------------------------
  // BLOQUEAR / DESBLOQUEAR CLIENTE
  // -----------------------------------------------------------------------
  async toggleBlock(
    clientId: string,
    bloqueado: boolean,
    motivo: string | undefined,
    userId: string,
  ) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { creditConfig: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    if (!client.creditConfig) {
      // Auto-create credit config
      await this.prisma.clientCreditConfig.create({
        data: { clientId, bloqueado, motivoBloqueo: motivo, bloqueadoPor: userId, bloqueadoAt: bloqueado ? new Date() : null },
      });
    } else {
      await this.prisma.clientCreditConfig.update({
        where: { clientId },
        data: {
          bloqueado,
          motivoBloqueo: bloqueado ? motivo : null,
          bloqueadoPor: bloqueado ? userId : null,
          bloqueadoAt: bloqueado ? new Date() : null,
        },
      });
    }

    this.logger.log(`Cliente ${client.nombre} ${bloqueado ? 'BLOQUEADO' : 'DESBLOQUEADO'} por userId=${userId}`);
    return { success: true, clientId, bloqueado, motivo };
  }

  // -----------------------------------------------------------------------
  // VERIFICAR SI UN CLIENTE PUEDE COMPRAR
  // -----------------------------------------------------------------------
  async canClientOrder(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { creditConfig: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    // Check block
    if (client.creditConfig?.bloqueado) {
      return {
        allowed: false,
        reason: `Cliente bloqueado: ${client.creditConfig.motivoBloqueo || 'Sin motivo especificado'}`,
      };
    }

    // Check pending invoices
    const pendingCount = await this.prisma.order.count({
      where: { clientId, estadoPago: { in: ['PENDIENTE', 'PARCIAL'] } },
    });

    // Check overdue invoices
    const overdueCount = await this.prisma.order.count({
      where: {
        clientId,
        estadoPago: { in: ['PENDIENTE', 'PARCIAL'] },
        fechaVencimiento: { lt: new Date() },
      },
    });

    return {
      allowed: true,
      pendingInvoices: pendingCount,
      overdueInvoices: overdueCount,
      warning: overdueCount > 0 ? `⚠️ El cliente tiene ${overdueCount} factura(s) vencida(s)` : undefined,
      creditConfig: client.creditConfig,
    };
  }

  // -----------------------------------------------------------------------
  // OBTENER LISTAS DE PRECIOS
  // -----------------------------------------------------------------------
  async getPriceLists() {
    return this.prisma.priceListConfig.findMany({
      where: { activo: true },
      orderBy: { orden: 'asc' },
    });
  }

  // -----------------------------------------------------------------------
  // VALIDAR DESCUENTO
  // -----------------------------------------------------------------------
  async validateDiscount(clientId: string, discountPercent: number) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: { creditConfig: true },
    });
    if (!client) throw new NotFoundException('Cliente no encontrado');

    const maxAllowed = Number(client.creditConfig?.descuentoMaximo ?? 20);

    return {
      valid: discountPercent <= maxAllowed,
      requested: discountPercent,
      maxAllowed,
      clientName: client.nombre,
    };
  }
}
