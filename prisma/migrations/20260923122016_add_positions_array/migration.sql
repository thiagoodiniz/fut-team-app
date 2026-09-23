-- AlterTable
ALTER TABLE "Player" ADD COLUMN     "positions" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Copy data from position to positions
UPDATE "Player" SET "positions" = ARRAY["position"] WHERE "position" IS NOT NULL;

-- Drop old column
ALTER TABLE "Player" DROP COLUMN "position";
