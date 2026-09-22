-- AlterTable
ALTER TABLE "Goal" ADD COLUMN     "assistantId" TEXT,
ADD COLUMN     "loanedAssistantName" TEXT;

-- CreateIndex
CREATE INDEX "Goal_assistantId_idx" ON "Goal"("assistantId");

-- AddForeignKey
ALTER TABLE "Goal" ADD CONSTRAINT "Goal_assistantId_fkey" FOREIGN KEY ("assistantId") REFERENCES "Player"("id") ON DELETE SET NULL ON UPDATE CASCADE;
