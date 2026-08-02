-- Lovable Cloud applies Data API defaults to newly created public objects after
-- a migration. Run separately, immediately after the outbox migration, so the
-- final privileges remain service-role-only.

REVOKE ALL ON public.assessment_analysis_handoffs FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.assessment_analysis_handoff_events FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.assessment_analysis_handoffs FROM authenticated;
REVOKE MAINTAIN ON public.assessment_analysis_handoff_events FROM authenticated;
REVOKE ALL ON SEQUENCE public.assessment_analysis_handoff_events_id_seq
  FROM PUBLIC, anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enqueue_completed_assessment_analysis()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_assessment_analysis_handoffs(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.complete_assessment_analysis_handoff(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_assessment_analysis_handoff(uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.fail_assessment_analysis_handoff(uuid, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reconcile_assessment_analysis_handoffs(integer)
  FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.assessment_analysis_handoffs TO service_role;
GRANT ALL ON public.assessment_analysis_handoff_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.assessment_analysis_handoff_events_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_handoffs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.complete_assessment_analysis_handoff(uuid, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_handoff(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.fail_assessment_analysis_handoff(uuid, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.reconcile_assessment_analysis_handoffs(integer) TO service_role;
