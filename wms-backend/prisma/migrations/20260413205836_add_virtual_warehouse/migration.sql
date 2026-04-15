-- AlterTable
ALTER TABLE "Warehouse" ADD COLUMN     "clienteAsignado" TEXT,
ADD COLUMN     "descripcion" TEXT,
ADD COLUMN     "tipo" TEXT NOT NULL DEFAULT 'FISICO';
