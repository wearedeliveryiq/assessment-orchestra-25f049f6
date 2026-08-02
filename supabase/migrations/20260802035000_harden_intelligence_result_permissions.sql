-- Restore least privilege after Lovable Cloud applies broad defaults to newly
-- created public objects in the result and trace migration.
REVOKE ALL ON TABLE public.delivery_intelligence_results FROM anon;
REVOKE ALL ON TABLE public.delivery_intelligence_trace_nodes FROM anon;
REVOKE ALL ON TABLE public.delivery_intelligence_trace_edges FROM anon;

REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.delivery_intelligence_results FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.delivery_intelligence_trace_nodes FROM authenticated;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
  ON TABLE public.delivery_intelligence_trace_edges FROM authenticated;
GRANT SELECT ON TABLE public.delivery_intelligence_results TO authenticated;
GRANT SELECT ON TABLE public.delivery_intelligence_trace_nodes TO authenticated;
GRANT SELECT ON TABLE public.delivery_intelligence_trace_edges TO authenticated;

REVOKE EXECUTE ON FUNCTION public.enforce_delivery_intelligence_edge_scope() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.enforce_delivery_intelligence_edge_scope()
  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_delivery_intelligence_result(uuid, text, text, jsonb, jsonb, jsonb)
  FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.publish_delivery_intelligence_result(uuid, text, text, jsonb, jsonb, jsonb)
  FROM anon, authenticated;

GRANT ALL ON TABLE public.delivery_intelligence_results,
  public.delivery_intelligence_trace_nodes,
  public.delivery_intelligence_trace_edges TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_delivery_intelligence_result(uuid, text, text, jsonb, jsonb, jsonb)
  TO service_role;

-- This helper is intentionally callable by authenticated users from RLS. It
-- returns only a boolean derived from auth.uid() and accepts no arbitrary SQL.
REVOKE EXECUTE ON FUNCTION public.can_read_delivery_intelligence(uuid, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.can_read_delivery_intelligence(uuid, uuid)
  TO authenticated, service_role;
