-- AlterTable Match
ALTER TABLE "Match" ADD COLUMN "createdById" TEXT,
ADD COLUMN "updatedById" TEXT;

-- AlterTable Goal
ALTER TABLE "Goal" ADD COLUMN "createdById" TEXT,
ADD COLUMN "updatedById" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable Presence
ALTER TABLE "Presence" ADD COLUMN "createdById" TEXT,
ADD COLUMN "updatedById" TEXT,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable FinancialTransaction
ALTER TABLE "FinancialTransaction" ADD COLUMN "updatedById" TEXT;

-- CreateIndex
CREATE INDEX "Match_createdById_idx" ON "Match"("createdById");
CREATE INDEX "Match_updatedById_idx" ON "Match"("updatedById");

-- CreateIndex
CREATE INDEX "Goal_createdById_idx" ON "Goal"("createdById");
CREATE INDEX "Goal_updatedById_idx" ON "Goal"("updatedById");

-- CreateIndex
CREATE INDEX "Presence_createdById_idx" ON "Presence"("createdById");
CREATE INDEX "Presence_updatedById_idx" ON "Presence"("updatedById");

-- CreateIndex
CREATE INDEX "FinancialTransaction_createdById_idx" ON "FinancialTransaction"("createdById");
CREATE INDEX "FinancialTransaction_updatedById_idx" ON "FinancialTransaction"("updatedById");

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Match" ADD CONSTRAINT "Match_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Presence" ADD CONSTRAINT "Presence_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_updatedById_fkey" FOREIGN KEY ("updatedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

