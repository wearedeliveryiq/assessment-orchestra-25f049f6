REVOKE ALL ON public.assessment_analysis_eligibility_decisions FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.assessment_analysis_eligibility_decisions FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_assessment_analysis_handoff_ineligible(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.attach_assessment_analysis_eligibility_decision(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.assessment_analysis_eligibility_decisions TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_assessment_analysis_handoff_ineligible(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_assessment_analysis_eligibility_decision(uuid, uuid)
  TO service_role;
