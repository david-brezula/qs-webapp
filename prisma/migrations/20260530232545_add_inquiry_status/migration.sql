-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('NEW', 'IN_PROGRESS', 'CLOSED');

-- AlterTable
ALTER TABLE "ContactSubmission" ADD COLUMN     "status" "InquiryStatus" NOT NULL DEFAULT 'NEW';

-- CreateIndex
CREATE INDEX "ContactSubmission_status_idx" ON "ContactSubmission"("status");
