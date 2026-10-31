-- CreateEnum
CREATE TYPE "ServiceStatus" AS ENUM ('planned', 'completed');

-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN     "recommendedMileage" INTEGER,
ADD COLUMN     "status" "ServiceStatus" NOT NULL DEFAULT 'completed',
ALTER COLUMN "performedAt" DROP NOT NULL,
ALTER COLUMN "mileage" DROP NOT NULL,
ALTER COLUMN "cost" DROP NOT NULL;

-- CreateTable
CREATE TABLE "CarPhoto" (
    "id" TEXT NOT NULL,
    "carId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "originalName" TEXT,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "caption" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CarPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CarPhoto_carId_idx" ON "CarPhoto"("carId");

-- CreateIndex
CREATE INDEX "CarPhoto_carId_createdAt_idx" ON "CarPhoto"("carId", "createdAt");

-- CreateIndex
CREATE INDEX "ServiceRecord_carId_status_idx" ON "ServiceRecord"("carId", "status");

-- AddForeignKey
ALTER TABLE "CarPhoto" ADD CONSTRAINT "CarPhoto_carId_fkey" FOREIGN KEY ("carId") REFERENCES "Car"("id") ON DELETE CASCADE ON UPDATE CASCADE;
