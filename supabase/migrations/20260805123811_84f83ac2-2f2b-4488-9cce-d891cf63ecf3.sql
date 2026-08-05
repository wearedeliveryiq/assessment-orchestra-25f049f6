-- Restore the governed function boundary after Lovable Cloud applies its
-- public-schema default grants to newly created routines.

REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v22(text, text, text, text),
  public.link_delivery_dna_snapshot_v22(text, uuid, uuid, uuid, text, jsonb, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v22(text, text, text, text),
  public.link_delivery_dna_snapshot_v22(text, uuid, uuid, uuid, text, jsonb, boolean)
  TO service_role;

-- Keep every superseded collection/linking entry point unavailable after the
-- Cloud grant hook. Historical rows and immutable provenance remain intact.
REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot(text, text),
  public.create_delivery_dna_snapshot_v2(text, text, text, text),
  public.create_delivery_dna_snapshot_v21(text, text, text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.link_delivery_dna_snapshot_v21(text, uuid, uuid, uuid, text, jsonb, boolean)
  FROM PUBLIC, anon, authenticated, service_role;