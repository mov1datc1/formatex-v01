-- AlterTable IncomingShipment
ALTER TABLE "IncomingShipment" ADD COLUMN IF NOT EXISTS "numeroContenedor" TEXT;
CREATE INDEX IF NOT EXISTS "IncomingShipment_numeroContenedor_idx" ON "IncomingShipment"("numeroContenedor");

-- AlterTable Order
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "esBackorder" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "backorderStatus" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "condicionBackorder" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "contenedorNumero" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "fechaEstimadaArriboContenedor" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "posicionCola" INTEGER;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "incomingShipmentId" TEXT;
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notificado15DiasAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "notificado5DiasAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "vigenciaConfirmadaAt" TIMESTAMP(3);
ALTER TABLE "Order" ADD COLUMN IF NOT EXISTS "vigenciaConfirmadaPor" TEXT;

-- CreateIndexes
CREATE INDEX IF NOT EXISTS "Order_esBackorder_idx" ON "Order"("esBackorder");
CREATE INDEX IF NOT EXISTS "Order_incomingShipmentId_idx" ON "Order"("incomingShipmentId");
CREATE INDEX IF NOT EXISTS "Order_contenedorNumero_idx" ON "Order"("contenedorNumero");
CREATE INDEX IF NOT EXISTS "Order_backorderStatus_idx" ON "Order"("backorderStatus");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Order_incomingShipmentId_fkey'
    ) THEN
        ALTER TABLE "Order" ADD CONSTRAINT "Order_incomingShipmentId_fkey" FOREIGN KEY ("incomingShipmentId") REFERENCES "IncomingShipment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
