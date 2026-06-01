-- CreateEnum
CREATE TYPE "AdvanceStatus" AS ENUM ('REQUESTED', 'APPROVED', 'REJECTED', 'PAID');

-- AlterTable
ALTER TABLE "Accommodation" ADD COLUMN     "sectionId" TEXT;

-- CreateTable
CREATE TABLE "SectionInvoice" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "projectWorkerId" TEXT NOT NULL,
    "invoicedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SectionInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvanceRequest" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'EUR',
    "note" TEXT,
    "status" "AdvanceStatus" NOT NULL DEFAULT 'REQUESTED',
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidedAt" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),

    CONSTRAINT "AdvanceRequest_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SectionInvoice_projectWorkerId_idx" ON "SectionInvoice"("projectWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "SectionInvoice_sectionId_projectWorkerId_key" ON "SectionInvoice"("sectionId", "projectWorkerId");

-- CreateIndex
CREATE INDEX "AdvanceRequest_userId_idx" ON "AdvanceRequest"("userId");

-- CreateIndex
CREATE INDEX "AdvanceRequest_status_idx" ON "AdvanceRequest"("status");

-- CreateIndex
CREATE INDEX "Accommodation_sectionId_idx" ON "Accommodation"("sectionId");

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionInvoice" ADD CONSTRAINT "SectionInvoice_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SectionInvoice" ADD CONSTRAINT "SectionInvoice_projectWorkerId_fkey" FOREIGN KEY ("projectWorkerId") REFERENCES "ProjectWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvanceRequest" ADD CONSTRAINT "AdvanceRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
