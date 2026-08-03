-- PDR-003-005 hardening: reassert least privilege for every Snapshot object.
ALTER TABLE public.delivery_dna_snapshot_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_snapshot_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_snapshot_funnel_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_snapshot_access_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL PRIVILEGES ON
  public.delivery_dna_snapshot_sessions,
  public.delivery_dna_snapshot_responses,
  public.delivery_dna_snapshot_funnel_events,
  public.delivery_dna_snapshot_access_events,
  public.delivery_product_availability,
  public.organisation_product_entitlements
FROM PUBLIC, anon, authenticated;

REVOKE MAINTAIN ON
  public.delivery_dna_snapshot_sessions,
  public.delivery_dna_snapshot_responses,
  public.delivery_dna_snapshot_funnel_events,
  public.delivery_dna_snapshot_access_events,
  public.delivery_product_availability,
  public.organisation_product_entitlements
FROM PUBLIC, anon, authenticated, service_role;

REVOKE ALL PRIVILEGES ON SEQUENCE
  public.delivery_dna_snapshot_funnel_events_id_seq,
  public.delivery_dna_snapshot_access_events_id_seq
FROM PUBLIC, anon, authenticated;

REVOKE ALL PRIVILEGES ON FUNCTION
  public.create_delivery_dna_snapshot(text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.cleanup_expired_delivery_dna_snapshots(integer)
FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.delivery_dna_snapshot_sessions,
  public.delivery_dna_snapshot_responses,
  public.delivery_dna_snapshot_funnel_events,
  public.delivery_dna_snapshot_access_events,
  public.delivery_product_availability,
  public.organisation_product_entitlements
TO service_role;

GRANT USAGE, SELECT ON SEQUENCE
  public.delivery_dna_snapshot_funnel_events_id_seq,
  public.delivery_dna_snapshot_access_events_id_seq
TO service_role;

GRANT EXECUTE ON FUNCTION
  public.create_delivery_dna_snapshot(text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.cleanup_expired_delivery_dna_snapshots(integer)
TO service_role;