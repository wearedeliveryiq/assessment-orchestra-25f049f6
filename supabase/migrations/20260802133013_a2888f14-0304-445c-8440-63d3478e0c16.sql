-- Lovable Cloud applies broad grants to newly created public objects. Restore
-- the Sprint 03 least-privilege contract after the analysis-run migration.
REVOKE ALL ON TABLE public.assessment_analysis_runs FROM anon;
REVOKE ALL ON TABLE public.assessment_analysis_events FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.assessment_analysis_runs FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.assessment_analysis_events FROM authenticated;
GRANT SELECT ON TABLE public.assessment_analysis_runs TO authenticated;
GRANT SELECT ON TABLE public.assessment_analysis_events TO authenticated;

REVOKE ALL ON SEQUENCE public.assessment_analysis_events_id_seq FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.assign_analysis_event_sequence() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_analysis_run_transition() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_assessment_analysis_run(uuid, text, integer)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_assessment_analysis_run(uuid, text)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_assessment_analysis_run(uuid, text, text, text, boolean)
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.retry_assessment_analysis_run(uuid)
  FROM anon, authenticated;

GRANT ALL ON TABLE public.assessment_analysis_runs, public.assessment_analysis_events
  TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.assessment_analysis_events_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_run(uuid, text, integer)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_assessment_analysis_run(uuid, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_assessment_analysis_run(uuid, text, text, text, boolean)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.retry_assessment_analysis_run(uuid)
  TO service_role;