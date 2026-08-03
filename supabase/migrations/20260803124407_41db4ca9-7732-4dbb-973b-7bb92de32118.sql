REVOKE MAINTAIN ON public.recommendation_improvement_plans,
  public.recommendation_improvement_actions,
  public.recommendation_improvement_action_events FROM service_role;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_action_event_scope(),
  public.enforce_recommendation_action_projection() FROM service_role;
REVOKE ALL ON public.recommendation_improvement_plans,
  public.recommendation_improvement_actions,
  public.recommendation_improvement_action_events FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_improvement_plans,
  public.recommendation_improvement_actions,
  public.recommendation_improvement_action_events TO service_role;
GRANT EXECUTE ON FUNCTION public.record_recommendation_improvement_action(jsonb) TO service_role;