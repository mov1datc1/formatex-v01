-- CreateTable SkuPriceList
CREATE TABLE IF NOT EXISTS "SkuPriceList" (
    "id" TEXT NOT NULL,
    "skuId" TEXT NOT NULL,
    "listaCodigo" TEXT NOT NULL,
    "precio" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SkuPriceList_pkey" PRIMARY KEY ("id")
);

-- AlterTable Client
ALTER TABLE "Client" ADD COLUMN IF NOT EXISTS "tipoCliente" TEXT;

-- AlterTable SkuMaster
ALTER TABLE "SkuMaster" ADD COLUMN IF NOT EXISTS "costoOrigenUSD" DECIMAL(10,2);
ALTER TABLE "SkuMaster" ADD COLUMN IF NOT EXISTS "costoPuestoMexicoMXN" DECIMAL(10,2);
ALTER TABLE "SkuMaster" ADD COLUMN IF NOT EXISTS "codigoChina" TEXT;
ALTER TABLE "SkuMaster" ADD COLUMN IF NOT EXISTS "nombreChino" TEXT;
ALTER TABLE "SkuMaster" ADD COLUMN IF NOT EXISTS "fabrica" TEXT;
ALTER TABLE "SkuMaster" ADD COLUMN IF NOT EXISTS "semanasLeadTime" INTEGER DEFAULT 4;

-- AlterTable IncomingShipment
ALTER TABLE "IncomingShipment" ADD COLUMN IF NOT EXISTS "numeroPedimento" TEXT;
ALTER TABLE "IncomingShipment" ADD COLUMN IF NOT EXISTS "fechaPagoPedimento" TIMESTAMP(3);
ALTER TABLE "IncomingShipment" ADD COLUMN IF NOT EXISTS "tipoCambioPedimento" DECIMAL(10,4);
ALTER TABLE "IncomingShipment" ADD COLUMN IF NOT EXISTS "aduanaDespacho" TEXT;
ALTER TABLE "IncomingShipment" ADD COLUMN IF NOT EXISTS "fleteInternacionalMXN" DECIMAL(12,2);
ALTER TABLE "IncomingShipment" ADD COLUMN IF NOT EXISTS "seguroCargaMXN" DECIMAL(12,2);
ALTER TABLE "IncomingShipment" ADD COLUMN IF NOT EXISTS "gastosIncrementablesPct" DECIMAL(5,2);

-- CreateIndexes SkuPriceList
CREATE UNIQUE INDEX IF NOT EXISTS "SkuPriceList_skuId_listaCodigo_key" ON "SkuPriceList"("skuId", "listaCodigo");
CREATE INDEX IF NOT EXISTS "SkuPriceList_skuId_idx" ON "SkuPriceList"("skuId");
CREATE INDEX IF NOT EXISTS "SkuPriceList_listaCodigo_idx" ON "SkuPriceList"("listaCodigo");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'SkuPriceList_skuId_fkey'
    ) THEN
        ALTER TABLE "SkuPriceList" ADD CONSTRAINT "SkuPriceList_skuId_fkey" FOREIGN KEY ("skuId") REFERENCES "SkuMaster"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
