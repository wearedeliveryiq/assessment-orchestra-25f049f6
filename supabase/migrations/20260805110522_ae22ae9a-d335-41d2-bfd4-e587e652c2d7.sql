-- DIQ-100D presentation-only amendment. Existing 2.1 responses, calculations
-- and completed sessions remain immutable and are reprojected at read time.

ALTER TABLE public.delivery_dna_snapshot_sessions
  DROP CONSTRAINT delivery_dna_snapshot_presentation_policy_version,
  ADD CONSTRAINT delivery_dna_snapshot_presentation_policy_version
    CHECK (presentation_policy_version IN ('1.0.0', '1.1.0', '2.0.0', '2.1.0', '2.1.1'));

CREATE OR REPLACE FUNCTION public.create_delivery_dna_snapshot_v21(
  p_token_hash text,
  p_ip_hash text,
  p_scope_type text,
  p_scope_display_name text
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_ip_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'SNAPSHOT_REQUEST_INVALID';
  END IF;
  IF p_scope_type NOT IN (
      'whole_organisation', 'business_unit_or_division', 'function',
      'defined_delivery_portfolio_or_delivery_system'
    ) OR length(trim(p_scope_display_name)) NOT BETWEEN 2 AND 120 THEN
    RAISE EXCEPTION 'SNAPSHOT_REQUEST_INVALID';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_ip_hash, 0));
  IF (SELECT count(*) FROM public.delivery_dna_snapshot_access_events
      WHERE ip_hash = p_ip_hash AND occurred_at > now() - interval '1 minute') >= 60
     OR (SELECT count(*) FROM public.delivery_dna_snapshot_access_events
      WHERE ip_hash = p_ip_hash AND occurred_at > now() - interval '1 day') >= 1000 THEN
    RAISE EXCEPTION 'SNAPSHOT_RATE_LIMITED';
  END IF;
  INSERT INTO public.delivery_dna_snapshot_access_events (ip_hash) VALUES (p_ip_hash);
  INSERT INTO public.delivery_dna_snapshot_sessions (
    token_hash, configuration_version, presentation_policy_version,
    scope_type, scope_display_name
  ) VALUES (
    p_token_hash, '2.1.0', '2.1.1', p_scope_type, trim(p_scope_display_name)
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_delivery_dna_snapshot_v21(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_snapshot_v21(text, text, text, text)
  TO service_role;

COMMENT ON FUNCTION public.create_delivery_dna_snapshot_v21(text, text, text, text) IS
  'Creates Delivery DNA 2.1 sessions pinned to Snapshot presentation policy 2.1.1. Historical responses and calculations are never rewritten.';