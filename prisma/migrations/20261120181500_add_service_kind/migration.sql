-- CreateEnum
CREATE TYPE "ServiceKind" AS ENUM ('maintenance', 'repair');

-- AlterTable
ALTER TABLE "ServiceRecord" ADD COLUMN "kind" "ServiceKind";
