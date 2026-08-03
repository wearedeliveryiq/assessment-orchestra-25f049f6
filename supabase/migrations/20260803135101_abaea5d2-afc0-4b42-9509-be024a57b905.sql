REVOKE ALL ON public.recommendation_analytics_consent_events,
  public.recommendation_analytics_events FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_analytics_consent_events,
  public.recommendation_analytics_events FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_recommendation_analytics_properties(public.recommendation_analytics_event_type,jsonb),
  public.enforce_recommendation_analytics_event_immutable(),
  public.set_recommendation_analytics_consent(jsonb),
  public.capture_recommendation_analytics_event(jsonb),
  public.recommendation_analytics_product_aggregate(timestamptz,timestamptz),
  public.apply_recommendation_analytics_retention(uuid,text,timestamptz,integer)
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.recommendation_analytics_consent_events,
  public.recommendation_analytics_events FROM service_role;
GRANT SELECT ON public.recommendation_analytics_consent_events,
  public.recommendation_analytics_events TO service_role;
GRANT EXECUTE ON FUNCTION public.set_recommendation_analytics_consent(jsonb),
  public.capture_recommendation_analytics_event(jsonb),
  public.recommendation_analytics_product_aggregate(timestamptz,timestamptz),
  public.apply_recommendation_analytics_retention(uuid,text,timestamptz,integer)
  TO service_role;