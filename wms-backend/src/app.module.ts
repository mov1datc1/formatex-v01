import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaModule } from './prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { ReceptionModule } from './modules/reception/reception.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { OrdersModule } from './modules/orders/orders.module';
import { CuttingModule } from './modules/cutting/cutting.module';
import { WarehouseModule } from './modules/warehouse/warehouse.module';
import { UsersModule } from './modules/users/users.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { TransitModule } from './modules/transit/transit.module';
import { PackingModule } from './modules/packing/packing.module';
import { ShippingModule } from './modules/shipping/shipping.module';
import { TransfersModule } from './modules/transfers/transfers.module';
import { SupplyPlanningModule } from './modules/supply-planning/supply-planning.module';
import { InvoicingModule } from './modules/invoicing/invoicing.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    AuthModule,
    CatalogModule,
    ReceptionModule,
    InventoryModule,
    OrdersModule,
    CuttingModule,
    WarehouseModule,
    UsersModule,
    ReservationsModule,
    TransitModule,
    PackingModule,
    ShippingModule,
    TransfersModule,
    SupplyPlanningModule,
    InvoicingModule,
  ],
})
export class AppModule {}
