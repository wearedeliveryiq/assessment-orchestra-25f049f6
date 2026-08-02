REVOKE ALL ON public.recommendation_evaluations,
  public.recommendation_candidate_evaluations,
  public.recommendation_evaluation_trace_links FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_evaluations,
  public.recommendation_candidate_evaluations,
  public.recommendation_evaluation_trace_links FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_evaluation(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_evaluations,
  public.recommendation_candidate_evaluations,
  public.recommendation_evaluation_trace_links TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_evaluation(jsonb) TO service_role;