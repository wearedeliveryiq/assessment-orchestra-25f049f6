-- Lovable Cloud reapplies Data API defaults after DDL. Restore the intended
-- service-role-only posture for the new function and touched governed helpers.
REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v2(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.enqueue_completed_assessment_analysis(),
  public.reconcile_assessment_analysis_handoffs(integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v2(text, text, text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.reconcile_assessment_analysis_handoffs(integer)
  TO service_role;
REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot(text, text) FROM service_role;
