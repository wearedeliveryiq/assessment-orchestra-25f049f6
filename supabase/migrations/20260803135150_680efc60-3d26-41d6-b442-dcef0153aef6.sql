REVOKE ALL ON FUNCTION public.enforce_recommendation_analytics_event_immutable(),
  public.validate_recommendation_analytics_properties(public.recommendation_analytics_event_type,jsonb)
  FROM service_role, PUBLIC, anon, authenticated;

REVOKE MAINTAIN ON public.recommendation_analytics_consent_events,
  public.recommendation_analytics_events FROM service_role, PUBLIC, anon, authenticated;