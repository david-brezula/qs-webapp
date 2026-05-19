-- Lock down EXECUTE on the SECURITY DEFINER helper to the worker role
-- only. Postgres grants EXECUTE on new functions to PUBLIC by default;
-- for a SECURITY DEFINER function that reads RLS-bypassed data, that is
-- too wide. The later setup-rls-role.sql grants EXECUTE explicitly to
-- qs_worker.
REVOKE EXECUTE ON FUNCTION app_worker_accommodation_ids() FROM PUBLIC;
