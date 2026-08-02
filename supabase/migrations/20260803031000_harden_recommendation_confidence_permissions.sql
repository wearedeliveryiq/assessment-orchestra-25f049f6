REVOKE ALL ON public.recommendation_confidence_gates,
  public.recommendation_candidate_confidence_gates,
  public.recommendation_confidence_gate_trace_links FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_confidence_gates,
  public.recommendation_candidate_confidence_gates,
  public.recommendation_confidence_gate_trace_links FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_confidence_gate(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_confidence_gates,
  public.recommendation_candidate_confidence_gates,
  public.recommendation_confidence_gate_trace_links TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_confidence_gate(jsonb) TO service_role;
