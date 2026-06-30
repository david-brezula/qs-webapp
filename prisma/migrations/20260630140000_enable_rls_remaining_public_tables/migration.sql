-- Security hardening: enable RLS on the remaining public tables so the Supabase
-- anon / authenticated roles (PostgREST) cannot read or write them. No policies
-- are added on purpose -- RLS is ENABLEd (not FORCEd), so the table owner (the
-- `postgres` role the app + Prisma connect as) still bypasses RLS and keeps full
-- access, while anon/authenticated get a full deny. The restricted `qs_worker`
-- role has no GRANT on any of these tables, so it is unaffected.
ALTER TABLE public."_prisma_migrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."TableClaim"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ContactSubmission"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ActivityLogAudit"   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."WorkerApplication"  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."Client"             ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProjectPhoto"       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ProjectDocument"    ENABLE ROW LEVEL SECURITY;

-- Lock the SECURITY DEFINER RLS helper to qs_worker only (revoke from the
-- API-exposed roles). qs_worker keeps its explicit grant from setup-rls-role.sql.
REVOKE EXECUTE ON FUNCTION public.app_worker_accommodation_ids() FROM anon, authenticated;
