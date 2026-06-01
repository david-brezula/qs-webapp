-- AlterEnum
ALTER TYPE "AdvanceStatus" ADD VALUE 'SETTLED';

-- AlterTable
ALTER TABLE "AdvanceRequest" ADD COLUMN     "sectionId" TEXT,
ADD COLUMN     "settledAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "AdvanceRequest_sectionId_idx" ON "AdvanceRequest"("sectionId");

-- AddForeignKey
ALTER TABLE "AdvanceRequest" ADD CONSTRAINT "AdvanceRequest_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;
