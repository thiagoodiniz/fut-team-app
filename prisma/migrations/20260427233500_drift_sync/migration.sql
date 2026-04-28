-- AlterEnum
BEGIN;
CREATE TYPE "TeamRole_new" AS ENUM ('ADMIN', 'MEMBER');

ALTER TABLE "UserTeam" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "UserTeam" ALTER COLUMN "role" TYPE "TeamRole_new" USING ("role"::text::"TeamRole_new");
ALTER TABLE "UserTeam" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

ALTER TABLE "JoinRequest" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "JoinRequest" ALTER COLUMN "role" TYPE "TeamRole_new" USING ("role"::text::"TeamRole_new");
ALTER TABLE "JoinRequest" ALTER COLUMN "role" SET DEFAULT 'MEMBER';

DROP TYPE "TeamRole";
ALTER TYPE "TeamRole_new" RENAME TO "TeamRole";
COMMIT;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "isManager" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "lastTeamId" TEXT;
