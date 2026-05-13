-- CreateTable
CREATE TABLE "TableClaim" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "projectWorkerId" TEXT NOT NULL,
    "claimedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TableClaim_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TableClaim_tableId_idx" ON "TableClaim"("tableId");

-- CreateIndex
CREATE INDEX "TableClaim_projectWorkerId_idx" ON "TableClaim"("projectWorkerId");

-- CreateIndex
CREATE UNIQUE INDEX "TableClaim_tableId_projectWorkerId_key" ON "TableClaim"("tableId", "projectWorkerId");

-- AddForeignKey
ALTER TABLE "TableClaim" ADD CONSTRAINT "TableClaim_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "Table"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TableClaim" ADD CONSTRAINT "TableClaim_projectWorkerId_fkey" FOREIGN KEY ("projectWorkerId") REFERENCES "ProjectWorker"("id") ON DELETE CASCADE ON UPDATE CASCADE;
