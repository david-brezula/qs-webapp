-- CreateEnum
CREATE TYPE "ApplicationStatus" AS ENUM ('NEW', 'REVIEWING', 'CONTACTED', 'REJECTED', 'HIRED');

-- CreateTable
CREATE TABLE "WorkerApplication" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "trades" TEXT[],
    "experienceYears" INTEGER,
    "location" TEXT,
    "willingToTravel" BOOLEAN NOT NULL DEFAULT false,
    "availableFrom" TEXT,
    "languages" TEXT,
    "drivingLicence" BOOLEAN NOT NULL DEFAULT false,
    "cvUrl" TEXT,
    "message" TEXT NOT NULL DEFAULT '',
    "status" "ApplicationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkerApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkerApplication_status_idx" ON "WorkerApplication"("status");

-- CreateIndex
CREATE INDEX "WorkerApplication_createdAt_idx" ON "WorkerApplication"("createdAt");
