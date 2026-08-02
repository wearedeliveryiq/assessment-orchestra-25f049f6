-- Final Lovable Cloud least-privilege pass for public projection and product
-- recommendation objects, plus removal of the PG17 MAINTAIN default from all
-- authenticated Sprint 03 tables.
REVOKE ALL ON TABLE public.delivery_dna_public_results,
  public.delivery_dna_public_access_events,
  public.delivery_product_availability,
  public.organisation_product_entitlements,
  public.analysis_recommendation_acceptances FROM anon, authenticated;

REVOKE ALL ON SEQUENCE public.delivery_dna_public_access_events_id_seq
  FROM anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_public_result_immutability()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_delivery_dna_public_result(text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_delivery_dna_public_result(text, text)
  TO service_role;

GRANT ALL ON TABLE public.delivery_dna_public_results,
  public.delivery_dna_public_access_events,
  public.delivery_product_availability,
  public.organisation_product_entitlements,
  public.analysis_recommendation_acceptances TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_dna_public_access_events_id_seq
  TO service_role;

REVOKE MAINTAIN ON TABLE public.assessment_analysis_runs,
  public.assessment_analysis_events,
  public.delivery_intelligence_results,
  public.delivery_intelligence_trace_nodes,
  public.delivery_intelligence_trace_edges,
  public.delivery_dna_public_results,
  public.delivery_dna_public_access_events,
  public.delivery_product_availability,
  public.organisation_product_entitlements,
  public.analysis_recommendation_acceptances FROM authenticated;
