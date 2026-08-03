REVOKE ALL ON public.recommendation_priority_models,
  public.recommendation_priority_items,
  public.recommendation_priority_display_preferences FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_priority_models,
  public.recommendation_priority_items,
  public.recommendation_priority_display_preferences FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_priority_model(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_recommendation_priority_display_preference(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_priority_models,
  public.recommendation_priority_items,
  public.recommendation_priority_display_preferences TO service_role;
GRANT INSERT ON public.recommendation_priority_display_preferences TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_priority_model(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_recommendation_priority_display_preference(jsonb) TO service_role;