-- PDR-003-001 production hardening: a request-bound worker may be torn down
-- after claiming a durable hand-off. Keep the recovery lease aligned with the
-- approved 15-second no-run customer recovery window.

CREATE OR REPLACE FUNCTION public.claim_assessment_analysis_handoffs(
  p_limit integer DEFAULT 10
)
RETURNS SETOF public.assessment_analysis_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  RETURN QUERY
  WITH candidates AS (
    SELECT id
    FROM public.assessment_analysis_handoffs
    WHERE (
        (status IN ('pending', 'failed') AND next_attempt_at <= now())
        OR (status = 'processing' AND claimed_at <= now() - interval '15 seconds')
      )
      AND attempt < 10
    ORDER BY next_attempt_at, created_at
    FOR UPDATE SKIP LOCKED
    LIMIT LEAST(GREATEST(p_limit, 1), 100)
  )
  UPDATE public.assessment_analysis_handoffs h
  SET status = 'processing', attempt = h.attempt + 1, claimed_at = now(), updated_at = now()
  FROM candidates c
  WHERE h.id = c.id
  RETURNING h.*;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_assessment_analysis_handoff(p_handoff_id uuid)
RETURNS public.assessment_analysis_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_handoff public.assessment_analysis_handoffs;
BEGIN
  UPDATE public.assessment_analysis_handoffs
  SET status = 'processing', attempt = attempt + 1, claimed_at = now(), updated_at = now()
  WHERE id = p_handoff_id
    AND (
      status IN ('pending', 'failed')
      OR (status = 'processing' AND claimed_at <= now() - interval '15 seconds')
    )
    AND attempt < 10
  RETURNING * INTO v_handoff;
  RETURN v_handoff;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.claim_assessment_analysis_handoffs(integer)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.claim_assessment_analysis_handoff(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_handoffs(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_assessment_analysis_handoff(uuid) TO service_role;

COMMENT ON FUNCTION public.claim_assessment_analysis_handoffs(integer) IS
  'Claims due or request-stalled durable analysis hand-offs with a 15-second recovery lease.';
COMMENT ON FUNCTION public.claim_assessment_analysis_handoff(uuid) IS
  'Claims one durable analysis hand-off, including a request-stalled row after 15 seconds.';
