-- Gestão financeira - FASE 1 (somente alterações aditivas; compatível com o backend anterior)

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE');

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "financeEnabled" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "seasonId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "category" TEXT,
    "matchId" TEXT,
    "playerId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FinancialTransaction_teamId_seasonId_date_idx" ON "FinancialTransaction"("teamId", "seasonId", "date");

-- CreateIndex
CREATE INDEX "FinancialTransaction_matchId_idx" ON "FinancialTransaction"("matchId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_playerId_idx" ON "FinancialTransaction"("playerId");

-- CreateIndex (manual, não representável no Prisma schema):
-- no máximo 1 lançamento de jogador por jogo. NÃO remover: o Prisma não gera este índice.
CREATE UNIQUE INDEX "FinancialTransaction_match_player_unique"
  ON "FinancialTransaction"("matchId", "playerId")
  WHERE "matchId" IS NOT NULL AND "playerId" IS NOT NULL;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_seasonId_fkey" FOREIGN KEY ("seasonId") REFERENCES "Season"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
