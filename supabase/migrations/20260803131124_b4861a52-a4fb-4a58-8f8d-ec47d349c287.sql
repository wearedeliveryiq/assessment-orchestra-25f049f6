REVOKE MAINTAIN ON public.recommendation_product_handoffs,
  public.recommendation_product_handoff_events,
  public.organisation_product_activations FROM service_role, PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_product_handoff_event_scope()
  FROM service_role, PUBLIC, anon, authenticated;