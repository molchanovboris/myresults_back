-- AlterTable
ALTER TABLE "Car" ADD COLUMN "imageFilename" TEXT;

-- Move the library render off the photo table.
UPDATE "Car" AS car
SET "imageFilename" = photo."filename"
FROM (
  SELECT DISTINCT ON ("carId") "carId", "filename"
  FROM "CarPhoto"
  WHERE "source" = 'stock'
  ORDER BY "carId", "createdAt" DESC
) AS photo
WHERE car."id" = photo."carId";

DELETE FROM "CarPhoto" WHERE "source" = 'stock';

ALTER TABLE "CarPhoto" DROP COLUMN "source";

DROP TYPE "CarPhotoSource";
