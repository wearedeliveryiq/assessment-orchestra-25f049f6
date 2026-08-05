-- Lovable Cloud reapplies Data API defaults after DDL. Restore the intended
-- service-role-only posture for 2.1 and keep superseded collection disabled.
REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v21(text, text, text, text),
  public.link_delivery_dna_snapshot_v21(text, uuid, uuid, uuid, text, jsonb, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v21(text, text, text, text),
  public.link_delivery_dna_snapshot_v21(text, uuid, uuid, uuid, text, jsonb, boolean)
  TO service_role;

REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot(text, text),
  public.create_delivery_dna_snapshot_v2(text, text, text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean)
  FROM PUBLIC, anon, authenticated, service_role;