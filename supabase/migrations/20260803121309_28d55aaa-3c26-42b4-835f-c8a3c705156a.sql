REVOKE ALL ON public.recommendation_decision_events,
  public.recommendation_item_decisions FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_decision_events,
  public.recommendation_item_decisions FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_decision_event_scope()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_decision_projection()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.record_recommendation_item_decision(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_decision_events,
  public.recommendation_item_decisions TO service_role;
GRANT INSERT ON public.recommendation_decision_events,
  public.recommendation_item_decisions TO service_role;
GRANT UPDATE ON public.recommendation_item_decisions TO service_role;
GRANT EXECUTE ON FUNCTION public.record_recommendation_item_decision(jsonb) TO service_role;