REVOKE ALL ON public.recommendation_conflict_resolutions,
  public.recommendation_resolution_candidates,
  public.recommendation_resolution_trace_links FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_conflict_resolutions,
  public.recommendation_resolution_candidates,
  public.recommendation_resolution_trace_links FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_conflict_resolution(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_conflict_resolutions,
  public.recommendation_resolution_candidates,
  public.recommendation_resolution_trace_links TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_conflict_resolution(jsonb) TO service_role;
