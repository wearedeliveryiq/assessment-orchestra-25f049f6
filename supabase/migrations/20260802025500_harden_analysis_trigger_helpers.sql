-- Trigger helpers are internal implementation details and must not retain the
-- PostgreSQL default EXECUTE privilege granted to PUBLIC.
REVOKE EXECUTE ON FUNCTION public.assign_analysis_event_sequence() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_analysis_run_transition() FROM PUBLIC;
