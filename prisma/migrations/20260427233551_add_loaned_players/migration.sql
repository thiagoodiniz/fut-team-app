-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "loanedPlayers" TEXT[] DEFAULT ARRAY[]::TEXT[];
