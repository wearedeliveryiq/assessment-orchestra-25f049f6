REVOKE ALL ON public.recommendation_product_handoffs,
  public.recommendation_product_handoff_events,
  public.organisation_product_activations FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_product_handoffs,
  public.recommendation_product_handoff_events,
  public.organisation_product_activations FROM authenticated;
REVOKE ALL ON SEQUENCE public.recommendation_product_handoff_events_id_seq
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_product_handoff_event_scope(),
  public.create_recommendation_product_handoff(jsonb),
  public.consume_recommendation_product_handoff(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER ON
  public.recommendation_product_handoffs,
  public.recommendation_product_handoff_events,
  public.organisation_product_activations FROM service_role;
REVOKE ALL ON SEQUENCE public.recommendation_product_handoff_events_id_seq
  FROM service_role;
GRANT SELECT ON public.recommendation_product_handoffs,
  public.recommendation_product_handoff_events,
  public.organisation_product_activations TO service_role;
GRANT EXECUTE ON FUNCTION public.create_recommendation_product_handoff(jsonb),
  public.consume_recommendation_product_handoff(jsonb) TO service_role;