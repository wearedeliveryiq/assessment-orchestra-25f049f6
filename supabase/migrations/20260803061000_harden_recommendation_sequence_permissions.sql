REVOKE ALL ON public.recommendation_sequence_models,
  public.recommendation_sequence_items,
  public.recommendation_sequence_dependencies,
  public.recommendation_sequence_overrides FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_sequence_models,
  public.recommendation_sequence_items,
  public.recommendation_sequence_dependencies,
  public.recommendation_sequence_overrides FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_sequence_model(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_recommendation_sequence_override(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_sequence_models,
  public.recommendation_sequence_items,
  public.recommendation_sequence_dependencies,
  public.recommendation_sequence_overrides TO service_role;
GRANT INSERT ON public.recommendation_sequence_overrides TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_sequence_model(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_recommendation_sequence_override(jsonb) TO service_role;
