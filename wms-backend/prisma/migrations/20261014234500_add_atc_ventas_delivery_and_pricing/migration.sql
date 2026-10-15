-- CreateTable ClientAddress
CREATE TABLE IF NOT EXISTS "ClientAddress" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'ENTREGA',
    "calleNumero" TEXT NOT NULL,
    "colonia" TEXT,
    "municipio" TEXT,
    "estado" TEXT DEFAULT 'Jalisco',
    "cp" TEXT,
    "pais" TEXT DEFAULT 'México',
    "contactoNombre" TEXT,
    "contactoTelefono" TEXT,
    "horarioRecepcion" TEXT,
    "referencias" TEXT,
    "esPredeterminada" BOOLEAN NOT NULL DEFAULT false,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientAddress_pkey" PRIMARY KEY ("id")
);

-- CreateTable ClientSpecialPrice
CREATE TABLE IF NOT EXISTS "ClientSpecialPrice" (
    "id" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "precioPactado" DECIMAL(10,2) NOT NULL,
    "referenciaProyecto" TEXT,
    "autorizadoPor" TEXT,
    "notas" TEXT,
    "vigenteDesde" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "vigenteHasta" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSpecialPrice_pkey" PRIMARY KEY ("id")
);

-- AlterTable Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "listaPrecioDefault" TEXT DEFAULT 'F1';
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "cartaFletera" TEXT;
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "seguroEnvioDefault" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable Order
ALTER TABLE "Order" ALTER COLUMN "reservaHoras" SET DEFAULT 72;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryAddressId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryContactName" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryContactPhone" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliverySchedule" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fletera" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "envioAsegurado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryConfirmed" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryConfirmedAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "deliveryConfirmedBy" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "approvalStatus" TEXT NOT NULL DEFAULT 'NO_REQUIERE';
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "approvalReason" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "approvedBy" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);

-- AlterTable PriceListConfig
ALTER TABLE "PriceListConfig" ADD COLUMN IF NOT EXISTS "descuentoPct" DECIMAL(5,2) NOT NULL DEFAULT 0;
ALTER TABLE "PriceListConfig" ADD COLUMN IF NOT EXISTS "requiereAprobacion" BOOLEAN NOT NULL DEFAULT false;

-- Unique and Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "ClientSpecialPrice_clientId_skuId_key" ON "ClientSpecialPrice"("clientId", "skuId");
CREATE INDEX IF NOT EXISTS "Client_listaPrecioDefault_idx" ON "Client"("listaPrecioDefault");
CREATE INDEX IF NOT EXISTS "ClientAddress_clientId_idx" ON "ClientAddress"("clientId");
CREATE INDEX IF NOT EXISTS "ClientAddress_tipo_idx" ON "ClientAddress"("tipo");
CREATE INDEX IF NOT EXISTS "ClientSpecialPrice_clientId_idx" ON "ClientSpecialPrice"("clientId");
CREATE INDEX IF NOT EXISTS "ClientSpecialPrice_skuId_idx" ON "ClientSpecialPrice"("skuId");
CREATE INDEX IF NOT EXISTS "Order_deliveryAddressId_idx" ON "Order"("deliveryAddressId");
CREATE INDEX IF NOT EXISTS "Order_approvalStatus_idx" ON "Order"("approvalStatus");

-- Foreign Keys
DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ClientAddress_clientId_fkey'
    ) THEN
        ALTER TABLE "ClientAddress" ADD CONSTRAINT "ClientAddress_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ClientSpecialPrice_clientId_fkey'
    ) THEN
        ALTER TABLE "ClientSpecialPrice" ADD CONSTRAINT "ClientSpecialPrice_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'ClientSpecialPrice_skuId_fkey'
    ) THEN
        ALTER TABLE "ClientSpecialPrice" ADD CONSTRAINT "ClientSpecialPrice_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SkuMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Order_deliveryAddressId_fkey'
    ) THEN
        ALTER TABLE "Order" ADD CONSTRAINT "Order_deliveryAddressId_fkey" FOREIGN KEY ("deliveryAddressId") REFERENCES "ClientAddress"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
