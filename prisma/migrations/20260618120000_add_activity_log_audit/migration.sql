-- CreateEnum
CREATE TYPE "ActivityLogChange" AS ENUM ('CREATE', 'UPDATE', 'DELETE');

-- CreateTable
CREATE TABLE "ActivityLogAudit" (
    "id" TEXT NOT NULL,
    "activityLogId" TEXT NOT NULL,
    "projectWorkerId" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "action" "ActivityAction" NOT NULL,
    "change" "ActivityLogChange" NOT NULL,
    "oldCount" INTEGER,
    "newCount" INTEGER,
    "workDate" DATE NOT NULL,
    "changedById" TEXT NOT NULL,
    "changedByRole" "Role" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityLogAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ActivityLogAudit_projectWorkerId_idx" ON "ActivityLogAudit"("projectWorkerId");

-- CreateIndex
CREATE INDEX "ActivityLogAudit_changedById_idx" ON "ActivityLogAudit"("changedById");

-- CreateIndex
CREATE INDEX "ActivityLogAudit_activityLogId_idx" ON "ActivityLogAudit"("activityLogId");

-- CreateIndex
CREATE INDEX "ActivityLogAudit_createdAt_idx" ON "ActivityLogAudit"("createdAt");

-- NOTE: No grant is issued to the restricted `qs_worker` role and the table is
-- intentionally omitted from scripts/setup-rls-role.sql, so the worker (RLS)
-- connection has no access to the audit trail. Admin reads go through the
-- privileged Prisma connection, which bypasses RLS.
