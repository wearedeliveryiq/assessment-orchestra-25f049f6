-- S3-014: immutable deny-by-default Delivery DNA public projections.
CREATE TABLE public.delivery_dna_public_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  audience text NOT NULL CHECK (audience = 'delivery-dna-public-result'),
  disclosure_version text NOT NULL,
  public_projection jsonb NOT NULL,
  consented_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (expires_at > created_at)
);

CREATE TABLE public.delivery_dna_public_access_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  public_result_id uuid NOT NULL REFERENCES public.delivery_dna_public_results(id) ON DELETE RESTRICT,
  ip_hash text NOT NULL CHECK (ip_hash ~ '^[0-9a-f]{64}$'),
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX delivery_dna_public_access_token_time_idx
  ON public.delivery_dna_public_access_events (public_result_id, occurred_at DESC);
CREATE INDEX delivery_dna_public_access_ip_time_idx
  ON public.delivery_dna_public_access_events (ip_hash, occurred_at DESC);

CREATE FUNCTION public.enforce_public_result_immutability()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'public results cannot be deleted'; END IF;
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL
    AND (to_jsonb(NEW) - 'revoked_at') = (to_jsonb(OLD) - 'revoked_at') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'public projections are immutable; only revocation is allowed';
END;
$$;
CREATE TRIGGER delivery_dna_public_results_immutable
  BEFORE UPDATE OR DELETE ON public.delivery_dna_public_results
  FOR EACH ROW EXECUTE FUNCTION public.enforce_public_result_immutability();
CREATE TRIGGER delivery_dna_public_access_immutable
  BEFORE UPDATE OR DELETE ON public.delivery_dna_public_access_events
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

ALTER TABLE public.delivery_dna_public_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.delivery_dna_public_access_events ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.delivery_dna_public_results, public.delivery_dna_public_access_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_dna_public_access_events_id_seq TO service_role;

CREATE FUNCTION public.resolve_delivery_dna_public_result(p_token_hash text, p_ip_hash text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE public_result public.delivery_dna_public_results;
DECLARE token_minute integer;
DECLARE token_day integer;
DECLARE ip_minute integer;
DECLARE ip_day integer;
BEGIN
  SELECT * INTO public_result FROM public.delivery_dna_public_results
  WHERE token_hash = p_token_hash AND audience = 'delivery-dna-public-result'
    AND revoked_at IS NULL AND expires_at > now();
  IF NOT FOUND THEN RETURN NULL; END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_token_hash, 0));
  SELECT count(*) FILTER (WHERE occurred_at > now() - interval '1 minute'), count(*)
    INTO token_minute, token_day FROM public.delivery_dna_public_access_events
    WHERE public_result_id = public_result.id AND occurred_at > now() - interval '24 hours';
  SELECT count(*) FILTER (WHERE occurred_at > now() - interval '1 minute'), count(*)
    INTO ip_minute, ip_day FROM public.delivery_dna_public_access_events
    WHERE ip_hash = p_ip_hash AND occurred_at > now() - interval '24 hours';
  IF token_minute >= 30 OR token_day >= 300 OR ip_minute >= 60 OR ip_day >= 1000 THEN
    RAISE EXCEPTION 'PUBLIC_RATE_LIMITED' USING ERRCODE = 'P0001';
  END IF;
  INSERT INTO public.delivery_dna_public_access_events (public_result_id, ip_hash)
    VALUES (public_result.id, p_ip_hash);
  RETURN public_result.public_projection;
END;
$$;

REVOKE ALL ON FUNCTION public.resolve_delivery_dna_public_result(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_delivery_dna_public_result(text, text) TO service_role;