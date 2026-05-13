-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'WORKER');

-- CreateEnum
CREATE TYPE "Locale" AS ENUM ('EN', 'SK');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('ACTIVE', 'CLOSED');

-- CreateEnum
CREATE TYPE "ActivityAction" AS ENUM ('TIE', 'CONNECT');

-- CreateEnum
CREATE TYPE "Currency" AS ENUM ('USD', 'EUR');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'WORKER',
    "language" "Locale" NOT NULL DEFAULT 'EN',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Section_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Table" (
    "id" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "rows" INTEGER NOT NULL,
    "cols" INTEGER NOT NULL,
    "skipped" INTEGER NOT NULL DEFAULT 0,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Table_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectWorker" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "priceTie" DECIMAL(10,2) NOT NULL,
    "priceConnect" DECIMAL(10,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectWorker_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "projectWorkerId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "count" INTEGER NOT NULL,
    "workDate" DATE NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accommodation" (
    "id" TEXT NOT NULL,
    "projectId" TEXT,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalCost" DECIMAL(10,2) NOT NULL,
    "currency" "Currency" NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccommodationWorker" (
    "id" TEXT NOT NULL,
    "accommodationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AccommodationWorker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Section_projectId_idx" ON "Section"("projectId");

-- CreateIndex
CREATE INDEX "Table_sectionId_idx" ON "Table"("sectionId");

-- CreateIndex
CREATE INDEX "ProjectWorker_userId_idx" ON "ProjectWorker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "ProjectWorker_projectId_userId_key" ON "ProjectWorker"("projectId", "userId");

-- CreateIndex
CREATE INDEX "ActivityLog_projectWorkerId_workDate_idx" ON "ActivityLog"("projectWorkerId", "workDate");

-- CreateIndex
CREATE INDEX "ActivityLog_tableId_action_idx" ON "ActivityLog"("tableId", "action");

-- CreateIndex
CREATE INDEX "Accommodation_projectId_idx" ON "Accommodation"("projectId");

-- CreateIndex
CREATE INDEX "Accommodation_startDate_endDate_idx" ON "Accommodation"("startDate", "endDate");

-- CreateIndex
CREATE INDEX "AccommodationWorker_userId_idx" ON "AccommodationWorker"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AccommodationWorker_accommodationId_userId_key" ON "AccommodationWorker"("accommodationId", "userId");

-- AddForeignKey
ALTER TABLE "Section" ADD CONSTRAINT "Section_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Table" ADD CONSTRAINT "Table_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorker" ADD CONSTRAINT "ProjectWorker_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectWorker" ADD CONSTRAINT "ProjectWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_projectWorkerId_fkey" FOREIGN KEY ("projectWorkerId") REFERENCES "ProjectWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accommodation" ADD CONSTRAINT "Accommodation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationWorker" ADD CONSTRAINT "AccommodationWorker_accommodationId_fkey" FOREIGN KEY ("accommodationId") REFERENCES "Accommodation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccommodationWorker" ADD CONSTRAINT "AccommodationWorker_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
