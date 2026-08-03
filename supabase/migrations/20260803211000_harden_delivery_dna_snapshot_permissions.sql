REVOKE ALL ON public.delivery_dna_snapshot_sessions, public.delivery_dna_snapshot_responses,
  public.delivery_dna_snapshot_funnel_events, public.delivery_dna_snapshot_access_events FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.delivery_dna_snapshot_sessions, public.delivery_dna_snapshot_responses,
  public.delivery_dna_snapshot_funnel_events, public.delivery_dna_snapshot_access_events FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.delivery_dna_snapshot_funnel_events_id_seq,
  public.delivery_dna_snapshot_access_events_id_seq FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_delivery_dna_snapshot(text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.cleanup_expired_delivery_dna_snapshots(integer) FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.delivery_dna_snapshot_sessions, public.delivery_dna_snapshot_responses,
  public.delivery_dna_snapshot_funnel_events, public.delivery_dna_snapshot_access_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_dna_snapshot_funnel_events_id_seq,
  public.delivery_dna_snapshot_access_events_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_snapshot(text, text),
  public.link_delivery_dna_snapshot(text, uuid, uuid, uuid, text, jsonb, boolean),
  public.cleanup_expired_delivery_dna_snapshots(integer) TO service_role;

