-- Add company (firm) rate columns billed to the client per module, split by
-- action (TIE / CONNECT). Used only by admin wage views to compute company
-- profit. Additive with DEFAULT 0 -- no existing rows are modified.
ALTER TABLE "Project"
  ADD COLUMN "companyPriceTie" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "companyPriceConnect" DECIMAL(10,2) NOT NULL DEFAULT 0;
