/*
  Warnings:

  - Made the column `mileage` on table `ServiceRecord` required. This step will fail if there are existing NULL values in that column.
  - Made the column `cost` on table `ServiceRecord` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "ServiceRecord" ALTER COLUMN "mileage" SET NOT NULL,
ALTER COLUMN "cost" SET NOT NULL;
