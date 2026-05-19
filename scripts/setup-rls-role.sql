-- Creates the restricted role used by the worker-facing wages page.
-- Run once per environment, AFTER `prisma migrate deploy`, as the database
-- owner. Supply the password as a psql variable:
--
--   psql "$DATABASE_URL" -v worker_password=CHOOSE_A_STRONG_PASSWORD \
--     -f scripts/setup-rls-role.sql
--
-- The role is LOGIN, NOSUPERUSER, NOBYPASSRLS and gets SELECT only -- it can
-- never write, and it is fully subject to the policies from the
-- enable_wage_rls migration.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'qs_worker') THEN
    CREATE ROLE qs_worker LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END
$$;

ALTER ROLE qs_worker WITH PASSWORD :'worker_password';

GRANT USAGE ON SCHEMA public TO qs_worker;

GRANT SELECT ON
  "User",
  "Project",
  "Section",
  "Table",
  "ProjectWorker",
  "ActivityLog",
  "Accommodation",
  "AccommodationWorker"
TO qs_worker;

GRANT EXECUTE ON FUNCTION app_worker_accommodation_ids() TO qs_worker;
