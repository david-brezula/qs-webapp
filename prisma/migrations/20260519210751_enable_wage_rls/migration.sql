-- Worker wage Row Level Security.
-- RLS is ENABLEd (not FORCEd): the table owner -- the role the app and Prisma
-- migrations connect as -- bypasses every policy below. Only the restricted
-- `qs_worker` role (created by scripts/setup-rls-role.sql) is constrained.

-- Helper: the accommodation ids the current worker belongs to. SECURITY
-- DEFINER so it runs as the owner and bypasses RLS, which breaks the
-- otherwise-recursive Accommodation/AccommodationWorker policy cycle.
CREATE OR REPLACE FUNCTION app_worker_accommodation_ids()
  RETURNS TABLE (accommodation_id text)
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public
AS $$
  SELECT "accommodationId"
  FROM "AccommodationWorker"
  WHERE "userId" = current_setting('app.user_id', true)
$$;

-- User: the worker sees only their own row.
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_user ON "User"
  FOR SELECT
  USING (id = current_setting('app.user_id', true));

-- ProjectWorker: the worker sees only their own assignment/rate rows.
ALTER TABLE "ProjectWorker" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_project_worker ON "ProjectWorker"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

-- Project: projects the worker is assigned to (ProjectWorker is RLS-scoped).
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_project ON "Project"
  FOR SELECT
  USING (id IN (SELECT "projectId" FROM "ProjectWorker"));

-- Section: sections of the worker's projects (Project is RLS-scoped).
ALTER TABLE "Section" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_section ON "Section"
  FOR SELECT
  USING ("projectId" IN (SELECT id FROM "Project"));

-- Table: tables in the worker's sections (Section is RLS-scoped).
ALTER TABLE "Table" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_table ON "Table"
  FOR SELECT
  USING ("sectionId" IN (SELECT id FROM "Section"));

-- ActivityLog: rows tied to one of the worker's ProjectWorker rows.
ALTER TABLE "ActivityLog" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_activity_log ON "ActivityLog"
  FOR SELECT
  USING ("projectWorkerId" IN (SELECT id FROM "ProjectWorker"));

-- AccommodationWorker: every member of accommodations the worker belongs to,
-- so the worker page can count heads to split the cost.
ALTER TABLE "AccommodationWorker" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_accommodation_worker ON "AccommodationWorker"
  FOR SELECT
  USING ("accommodationId" IN (SELECT accommodation_id FROM app_worker_accommodation_ids()));

-- Accommodation: accommodations the worker belongs to (AccommodationWorker is
-- RLS-scoped).
ALTER TABLE "Accommodation" ENABLE ROW LEVEL SECURITY;
CREATE POLICY worker_self_accommodation ON "Accommodation"
  FOR SELECT
  USING (id IN (SELECT "accommodationId" FROM "AccommodationWorker"));
