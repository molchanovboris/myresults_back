-- CreateEnum
CREATE TYPE "CarPhotoSource" AS ENUM ('stock', 'upload');

-- AlterTable
ALTER TABLE "CarPhoto" ADD COLUMN "source" "CarPhotoSource" NOT NULL DEFAULT 'upload';

-- Existing stock previews stay on the car page and out of the photo gallery.
UPDATE "CarPhoto" SET "source" = 'stock' WHERE "caption" = 'Stock preview';
