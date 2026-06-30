-- Track admin "paid" state per (section, worker) alongside the worker-set
-- "invoiced" state. paidAt is admin-only. invoicedAt is relaxed to nullable so
-- a row can represent a payment recorded before the worker invoices.
ALTER TABLE "SectionInvoice" ADD COLUMN "paidAt" TIMESTAMP(3);
ALTER TABLE "SectionInvoice" ALTER COLUMN "invoicedAt" DROP NOT NULL;
