-- CreateEnum
CREATE TYPE "ZoneType" AS ENUM ('ROLLOS_ENTEROS', 'MERMA', 'RECIBO', 'CORTE', 'EMPAQUE', 'EMBARQUE');

-- CreateEnum
CREATE TYPE "LocationType" AS ENUM ('RACK', 'PISO', 'STAGING', 'MUELLE');

-- CreateEnum
CREATE TYPE "LocationStatus" AS ENUM ('LIBRE', 'PARCIAL', 'OCUPADA', 'BLOQUEADA');

-- CreateEnum
CREATE TYPE "RollType" AS ENUM ('ENTERO', 'RETAZO');

-- CreateEnum
CREATE TYPE "HuStatus" AS ENUM ('DISPONIBLE', 'RESERVADO', 'EN_PICKING', 'EN_CORTE', 'EN_EMPAQUE', 'DESPACHADO', 'AGOTADO', 'DANADO');

-- CreateEnum
CREATE TYPE "MovementType" AS ENUM ('ENTRADA', 'SALIDA', 'CORTE', 'REUBICACION', 'AJUSTE', 'CONTEO');

-- CreateEnum
CREATE TYPE "ReceiptStatus" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PENDIENTE_COBRANZA', 'APROBADO', 'EN_PICKING', 'EN_CORTE', 'EN_EMPAQUE', 'LISTO_ENVIO', 'FACTURADO', 'DESPACHADO', 'COMPLETADO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "ShipmentStatus" AS ENUM ('PENDIENTE', 'EN_TRANSITO', 'ENTREGADO', 'DEVUELTO');

-- CreateEnum
CREATE TYPE "AlertType" AS ENUM ('STOCK_BAJO', 'RETAZO_SIN_UBICAR', 'PEDIDO_ATRASADO', 'MERMA_EXCESIVA', 'ROLLO_PERDIDO', 'CONTEO_DISCREPANCIA');

-- CreateEnum
CREATE TYPE "TaskStatus" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "Warehouse" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "direccion" TEXT,
    "metrosCuad" DOUBLE PRECISION DEFAULT 1000,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Warehouse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Zone" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "ZoneType" NOT NULL DEFAULT 'ROLLOS_ENTEROS',
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Zone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "pasillo" TEXT NOT NULL,
    "rack" TEXT,
    "nivel" TEXT,
    "tipo" "LocationType" NOT NULL DEFAULT 'RACK',
    "estado" "LocationStatus" NOT NULL DEFAULT 'LIBRE',
    "capacidad" INTEGER NOT NULL DEFAULT 1,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MermaRangeConfig" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "minMetros" DOUBLE PRECISION NOT NULL,
    "maxMetros" DOUBLE PRECISION NOT NULL,
    "zonaCodigo" TEXT NOT NULL,
    "pasillo" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MermaRangeConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SkuMaster" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "categoria" TEXT,
    "composicion" TEXT,
    "anchoMetros" DOUBLE PRECISION,
    "color" TEXT,
    "pesoKgPorMetro" DOUBLE PRECISION,
    "metrajeEstandar" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "unidadMedida" TEXT NOT NULL DEFAULT 'm',
    "codigoBarras" TEXT,
    "minStock" DOUBLE PRECISION,
    "maxStock" DOUBLE PRECISION,
    "precioReferencia" DECIMAL(10,2),
    "supplierId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkuMaster_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Supplier" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "rfc" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Supplier_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "contacto" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "direccion" TEXT,
    "rfc" TEXT,
    "vendorId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vendor" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "telefono" TEXT,
    "email" TEXT,
    "comision" DECIMAL(5,2),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vendor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HandlingUnit" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "metrajeOriginal" DOUBLE PRECISION NOT NULL,
    "metrajeActual" DOUBLE PRECISION NOT NULL,
    "anchoMetros" DOUBLE PRECISION,
    "pesoKg" DOUBLE PRECISION,
    "tipoRollo" "RollType" NOT NULL DEFAULT 'ENTERO',
    "estadoHu" "HuStatus" NOT NULL DEFAULT 'DISPONIBLE',
    "ubicacionId" TEXT,
    "parentHuId" TEXT,
    "generacion" INTEGER NOT NULL DEFAULT 0,
    "receiptLineId" TEXT,
    "palletId" TEXT,
    "loteProveedor" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "etiquetaImpresa" BOOLEAN NOT NULL DEFAULT false,
    "fechaEtiquetado" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HandlingUnit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryMovement" (
    "id" TEXT NOT NULL,
    "huId" TEXT NOT NULL,
    "tipo" "MovementType" NOT NULL,
    "metrajeAntes" DOUBLE PRECISION,
    "metrajeDespues" DOUBLE PRECISION,
    "ubicacionOrigen" TEXT,
    "ubicacionDestino" TEXT,
    "referencia" TEXT,
    "notas" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InventoryMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceipt" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "fechaRecepcion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "estado" "ReceiptStatus" NOT NULL DEFAULT 'PENDIENTE',
    "totalPallets" INTEGER NOT NULL DEFAULT 0,
    "totalRollos" INTEGER NOT NULL DEFAULT 0,
    "transportista" TEXT,
    "placas" TEXT,
    "ordenCompra" TEXT,
    "notas" TEXT,
    "recibidoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseReceiptLine" (
    "id" TEXT NOT NULL,
    "receiptId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "cantidadRollos" INTEGER NOT NULL,
    "metrajePorRollo" DOUBLE PRECISION NOT NULL DEFAULT 50,
    "metrajeTotalRecibido" DOUBLE PRECISION NOT NULL,
    "palletRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseReceiptLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Order" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "vendorId" TEXT,
    "estado" "OrderStatus" NOT NULL DEFAULT 'PENDIENTE_COBRANZA',
    "prioridad" INTEGER NOT NULL DEFAULT 3,
    "fechaPedido" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaRequerida" TIMESTAMP(3),
    "facturaRef" TEXT,
    "facturaLista" BOOLEAN NOT NULL DEFAULT false,
    "requiereCorte" BOOLEAN NOT NULL DEFAULT true,
    "transportista" TEXT,
    "guiaEnvio" TEXT,
    "notas" TEXT,
    "creadoPor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLine" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "metrajeRequerido" DOUBLE PRECISION NOT NULL,
    "metrajeSurtido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "requiereCorte" BOOLEAN NOT NULL DEFAULT true,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrderLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrderLineAssignment" (
    "id" TEXT NOT NULL,
    "orderLineId" TEXT NOT NULL,
    "huId" TEXT NOT NULL,
    "metrajeTomado" DOUBLE PRECISION NOT NULL,
    "requiereCorte" BOOLEAN NOT NULL DEFAULT true,
    "cortado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderLineAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutOperation" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "huOrigenId" TEXT NOT NULL,
    "orderLineId" TEXT,
    "metrajeAntes" DOUBLE PRECISION NOT NULL,
    "metrajeCortado" DOUBLE PRECISION NOT NULL,
    "metrajeRestante" DOUBLE PRECISION NOT NULL,
    "huRetazoId" TEXT,
    "retazoUbicacion" TEXT,
    "cortadoPor" TEXT NOT NULL,
    "fechaCorte" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CutOperation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PackingSlip" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "bultos" INTEGER NOT NULL DEFAULT 1,
    "pesoTotalKg" DOUBLE PRECISION,
    "empacadoPor" TEXT NOT NULL,
    "fechaEmpaque" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PackingSlip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shipment" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "transportista" TEXT,
    "guiaEnvio" TEXT,
    "placas" TEXT,
    "chofer" TEXT,
    "estado" "ShipmentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "fechaEnvio" TIMESTAMP(3),
    "fechaEntrega" TIMESTAMP(3),
    "enviadoPor" TEXT NOT NULL,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Alert" (
    "id" TEXT NOT NULL,
    "tipo" "AlertType" NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "severidad" TEXT NOT NULL DEFAULT 'MEDIA',
    "resuelta" BOOLEAN NOT NULL DEFAULT false,
    "resueltaPor" TEXT,
    "resueltaAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Alert_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "alertId" TEXT,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "TaskStatus" NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" INTEGER NOT NULL DEFAULT 3,
    "asignadoA" TEXT,
    "fechaLimite" TIMESTAMP(3),
    "completadaAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoLogin" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "nivel" INTEGER NOT NULL DEFAULT 4,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "modulo" TEXT NOT NULL,
    "accion" TEXT NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "detalle" JSONB,
    "ip" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SystemSetting" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'string',
    "grupo" TEXT NOT NULL DEFAULT 'general',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemSetting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IntegrationConfig" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT false,
    "ultimaSync" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IntegrationConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "integracionId" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT,
    "estado" TEXT NOT NULL,
    "detalle" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Warehouse_codigo_key" ON "Warehouse"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Zone_codigo_key" ON "Zone"("codigo");

-- CreateIndex
CREATE INDEX "Zone_warehouseId_idx" ON "Zone"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "Location_codigo_key" ON "Location"("codigo");

-- CreateIndex
CREATE INDEX "Location_warehouseId_idx" ON "Location"("warehouseId");

-- CreateIndex
CREATE INDEX "Location_zoneId_idx" ON "Location"("zoneId");

-- CreateIndex
CREATE INDEX "Location_estado_idx" ON "Location"("estado");

-- CreateIndex
CREATE INDEX "MermaRangeConfig_warehouseId_idx" ON "MermaRangeConfig"("warehouseId");

-- CreateIndex
CREATE UNIQUE INDEX "MermaRangeConfig_warehouseId_minMetros_maxMetros_key" ON "MermaRangeConfig"("warehouseId", "minMetros", "maxMetros");

-- CreateIndex
CREATE UNIQUE INDEX "SkuMaster_codigo_key" ON "SkuMaster"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "SkuMaster_codigoBarras_key" ON "SkuMaster"("codigoBarras");

-- CreateIndex
CREATE INDEX "SkuMaster_categoria_idx" ON "SkuMaster"("categoria");

-- CreateIndex
CREATE INDEX "SkuMaster_color_idx" ON "SkuMaster"("color");

-- CreateIndex
CREATE UNIQUE INDEX "Supplier_codigo_key" ON "Supplier"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "Client_codigo_key" ON "Client"("codigo");

-- CreateIndex
CREATE INDEX "Client_vendorId_idx" ON "Client"("vendorId");

-- CreateIndex
CREATE UNIQUE INDEX "Vendor_codigo_key" ON "Vendor"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "HandlingUnit_codigo_key" ON "HandlingUnit"("codigo");

-- CreateIndex
CREATE INDEX "HandlingUnit_skuId_idx" ON "HandlingUnit"("skuId");

-- CreateIndex
CREATE INDEX "HandlingUnit_ubicacionId_idx" ON "HandlingUnit"("ubicacionId");

-- CreateIndex
CREATE INDEX "HandlingUnit_tipoRollo_idx" ON "HandlingUnit"("tipoRollo");

-- CreateIndex
CREATE INDEX "HandlingUnit_estadoHu_idx" ON "HandlingUnit"("estadoHu");

-- CreateIndex
CREATE INDEX "HandlingUnit_fechaIngreso_idx" ON "HandlingUnit"("fechaIngreso");

-- CreateIndex
CREATE INDEX "HandlingUnit_parentHuId_idx" ON "HandlingUnit"("parentHuId");

-- CreateIndex
CREATE INDEX "InventoryMovement_huId_idx" ON "InventoryMovement"("huId");

-- CreateIndex
CREATE INDEX "InventoryMovement_tipo_idx" ON "InventoryMovement"("tipo");

-- CreateIndex
CREATE INDEX "InventoryMovement_createdAt_idx" ON "InventoryMovement"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseReceipt_codigo_key" ON "PurchaseReceipt"("codigo");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_supplierId_idx" ON "PurchaseReceipt"("supplierId");

-- CreateIndex
CREATE INDEX "PurchaseReceipt_estado_idx" ON "PurchaseReceipt"("estado");

-- CreateIndex
CREATE INDEX "PurchaseReceiptLine_receiptId_idx" ON "PurchaseReceiptLine"("receiptId");

-- CreateIndex
CREATE UNIQUE INDEX "Order_codigo_key" ON "Order"("codigo");

-- CreateIndex
CREATE INDEX "Order_clientId_idx" ON "Order"("clientId");

-- CreateIndex
CREATE INDEX "Order_estado_idx" ON "Order"("estado");

-- CreateIndex
CREATE INDEX "Order_fechaPedido_idx" ON "Order"("fechaPedido");

-- CreateIndex
CREATE INDEX "OrderLine_orderId_idx" ON "OrderLine"("orderId");

-- CreateIndex
CREATE INDEX "OrderLineAssignment_orderLineId_idx" ON "OrderLineAssignment"("orderLineId");

-- CreateIndex
CREATE INDEX "OrderLineAssignment_huId_idx" ON "OrderLineAssignment"("huId");

-- CreateIndex
CREATE UNIQUE INDEX "CutOperation_codigo_key" ON "CutOperation"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "CutOperation_huRetazoId_key" ON "CutOperation"("huRetazoId");

-- CreateIndex
CREATE INDEX "CutOperation_huOrigenId_idx" ON "CutOperation"("huOrigenId");

-- CreateIndex
CREATE INDEX "CutOperation_fechaCorte_idx" ON "CutOperation"("fechaCorte");

-- CreateIndex
CREATE UNIQUE INDEX "PackingSlip_codigo_key" ON "PackingSlip"("codigo");

-- CreateIndex
CREATE INDEX "PackingSlip_orderId_idx" ON "PackingSlip"("orderId");

-- CreateIndex
CREATE UNIQUE INDEX "Shipment_codigo_key" ON "Shipment"("codigo");

-- CreateIndex
CREATE INDEX "Shipment_orderId_idx" ON "Shipment"("orderId");

-- CreateIndex
CREATE INDEX "Shipment_estado_idx" ON "Shipment"("estado");

-- CreateIndex
CREATE INDEX "Alert_tipo_idx" ON "Alert"("tipo");

-- CreateIndex
CREATE INDEX "Alert_resuelta_idx" ON "Alert"("resuelta");

-- CreateIndex
CREATE INDEX "Task_estado_idx" ON "Task"("estado");

-- CreateIndex
CREATE INDEX "Task_asignadoA_idx" ON "Task"("asignadoA");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_roleId_idx" ON "User"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "Role_nombre_key" ON "Role"("nombre");

-- CreateIndex
CREATE INDEX "RolePermission_roleId_idx" ON "RolePermission"("roleId");

-- CreateIndex
CREATE UNIQUE INDEX "RolePermission_roleId_modulo_accion_key" ON "RolePermission"("roleId", "modulo", "accion");

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "AuditLog"("userId");

-- CreateIndex
CREATE INDEX "AuditLog_accion_idx" ON "AuditLog"("accion");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "SystemSetting_clave_key" ON "SystemSetting"("clave");

-- CreateIndex
CREATE INDEX "SyncLog_integracionId_idx" ON "SyncLog"("integracionId");

-- CreateIndex
CREATE INDEX "SyncLog_estado_idx" ON "SyncLog"("estado");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");

-- AddForeignKey
ALTER TABLE "Zone" ADD CONSTRAINT "Zone_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Location" ADD CONSTRAINT "Location_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "Zone"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MermaRangeConfig" ADD CONSTRAINT "MermaRangeConfig_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkuMaster" ADD CONSTRAINT "SkuMaster_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Client" ADD CONSTRAINT "Client_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnit" ADD CONSTRAINT "HandlingUnit_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SkuMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnit" ADD CONSTRAINT "HandlingUnit_ubicacionId_fkey" FOREIGN KEY ("ubicacionId") REFERENCES "Location"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnit" ADD CONSTRAINT "HandlingUnit_parentHuId_fkey" FOREIGN KEY ("parentHuId") REFERENCES "HandlingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HandlingUnit" ADD CONSTRAINT "HandlingUnit_receiptLineId_fkey" FOREIGN KEY ("receiptLineId") REFERENCES "PurchaseReceiptLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_huId_fkey" FOREIGN KEY ("huId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryMovement" ADD CONSTRAINT "InventoryMovement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceipt" ADD CONSTRAINT "PurchaseReceipt_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseReceiptLine" ADD CONSTRAINT "PurchaseReceiptLine_receiptId_fkey" FOREIGN KEY ("receiptId") REFERENCES "PurchaseReceipt"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Order" ADD CONSTRAINT "Order_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLine" ADD CONSTRAINT "OrderLine_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineAssignment" ADD CONSTRAINT "OrderLineAssignment_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrderLineAssignment" ADD CONSTRAINT "OrderLineAssignment_huId_fkey" FOREIGN KEY ("huId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutOperation" ADD CONSTRAINT "CutOperation_huOrigenId_fkey" FOREIGN KEY ("huOrigenId") REFERENCES "HandlingUnit"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutOperation" ADD CONSTRAINT "CutOperation_huRetazoId_fkey" FOREIGN KEY ("huRetazoId") REFERENCES "HandlingUnit"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutOperation" ADD CONSTRAINT "CutOperation_orderLineId_fkey" FOREIGN KEY ("orderLineId") REFERENCES "OrderLine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PackingSlip" ADD CONSTRAINT "PackingSlip_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "Alert"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RolePermission" ADD CONSTRAINT "RolePermission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "Role"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
