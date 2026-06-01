-- Worker RLS for the new payroll tables. RLS is ENABLEd (not FORCEd): the owner
-- role the app/Prisma connect as bypasses these policies; only `qs_worker` is
-- constrained. Writes happen through the owner connection in server actions.

-- SectionInvoice: a worker sees only invoices tied to their own ProjectWorker
-- rows (ProjectWorker is itself RLS-scoped to the current worker).
ALTER TABLE "SectionInvoice" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_section_invoice ON "SectionInvoice"
  FOR SELECT
  USING ("projectWorkerId" IN (SELECT id FROM "ProjectWorker"));

-- AdvanceRequest: a worker sees only their own requests.
ALTER TABLE "AdvanceRequest" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_advance_request ON "AdvanceRequest"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

-- The restricted worker role gets SELECT only on the new tables.
GRANT SELECT ON "SectionInvoice", "AdvanceRequest" TO qs_worker;
