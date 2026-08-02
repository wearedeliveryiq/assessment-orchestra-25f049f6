CREATE TYPE public.analysis_eligibility_status AS ENUM ('eligible', 'ineligible');

CREATE TABLE public.assessment_analysis_eligibility_decisions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  handoff_id uuid NOT NULL REFERENCES public.assessment_analysis_handoffs(id) ON DELETE RESTRICT,
  assessment_session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  assessment_revision integer NOT NULL CHECK (assessment_revision > 0),
  configuration_set_id text NOT NULL,
  assessment_type text,
  knowledge_pack_id text,
  knowledge_pack_version text,
  question_set_id text,
  question_set_version text,
  assessment_manifest_digest text NOT NULL CHECK (assessment_manifest_digest ~ '^[0-9a-f]{64}$'),
  configured_manifest_digest text NOT NULL CHECK (configured_manifest_digest ~ '^[0-9a-f]{64}$'),
  status public.analysis_eligibility_status NOT NULL,
  primary_reason_code text,
  secondary_reason_codes text[] NOT NULL DEFAULT '{}',
  policy_id text NOT NULL CHECK (policy_id = 'PDR-003-002'),
  policy_version text NOT NULL CHECK (policy_version = '1.0'),
  evaluator_version text NOT NULL,
  correlation_id uuid NOT NULL,
  analysis_run_id uuid REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  evaluated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, workspace_id, assessment_session_id, assessment_revision,
          configuration_set_id, policy_id, policy_version),
  CONSTRAINT analysis_eligibility_outcome CHECK (
    (status = 'eligible' AND primary_reason_code IS NULL)
    OR (status = 'ineligible' AND primary_reason_code IS NOT NULL)
  )
);

CREATE INDEX assessment_analysis_eligibility_scope_idx
  ON public.assessment_analysis_eligibility_decisions
  (organisation_id, workspace_id, assessment_session_id, assessment_revision);

CREATE TRIGGER assessment_analysis_eligibility_immutable
BEFORE UPDATE OR DELETE ON public.assessment_analysis_eligibility_decisions
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

ALTER TABLE public.assessment_analysis_handoffs
  ADD COLUMN eligibility_decision_id uuid
    REFERENCES public.assessment_analysis_eligibility_decisions(id) ON DELETE RESTRICT,
  ADD COLUMN resolved_at timestamptz;

ALTER TABLE public.assessment_analysis_handoffs
  DROP CONSTRAINT assessment_analysis_handoff_terminal_state;
ALTER TABLE public.assessment_analysis_handoffs
  ADD CONSTRAINT assessment_analysis_handoff_terminal_state CHECK (
    (status = 'delivered' AND analysis_run_id IS NOT NULL AND delivered_at IS NOT NULL
      AND eligibility_decision_id IS NOT NULL)
    OR (status = 'ineligible' AND analysis_run_id IS NULL AND delivered_at IS NULL
      AND eligibility_decision_id IS NOT NULL AND resolved_at IS NOT NULL)
    OR (status NOT IN ('delivered', 'ineligible') AND delivered_at IS NULL AND resolved_at IS NULL)
  ) NOT VALID;

CREATE OR REPLACE FUNCTION public.attach_assessment_analysis_eligibility_decision(
  p_handoff_id uuid,
  p_eligibility_decision_id uuid
)
RETURNS public.assessment_analysis_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_handoff public.assessment_analysis_handoffs;
BEGIN
  UPDATE public.assessment_analysis_handoffs h
  SET eligibility_decision_id = d.id, updated_at = now()
  FROM public.assessment_analysis_eligibility_decisions d
  WHERE h.id = p_handoff_id AND d.id = p_eligibility_decision_id
    AND h.assessment_session_id = d.assessment_session_id
    AND h.organisation_id = d.organisation_id AND h.workspace_id = d.workspace_id
    AND h.assessment_revision = d.assessment_revision AND d.status = 'eligible'
    AND h.status = 'processing'
  RETURNING h.* INTO v_handoff;
  IF v_handoff.id IS NULL THEN RAISE EXCEPTION 'ANALYSIS_ELIGIBILITY_SCOPE_MISMATCH'; END IF;
  RETURN v_handoff;
END;
$$;

CREATE OR REPLACE FUNCTION public.mark_assessment_analysis_handoff_ineligible(
  p_handoff_id uuid,
  p_eligibility_decision_id uuid
)
RETURNS public.assessment_analysis_handoffs
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_handoff public.assessment_analysis_handoffs;
BEGIN
  UPDATE public.assessment_analysis_handoffs h
  SET status = 'ineligible', eligibility_decision_id = p_eligibility_decision_id,
      analysis_run_id = NULL, last_error_code = NULL, claimed_at = NULL,
      delivered_at = NULL,
      resolved_at = now(), updated_at = now()
  FROM public.assessment_analysis_eligibility_decisions d
  WHERE h.id = p_handoff_id AND d.id = p_eligibility_decision_id
    AND h.assessment_session_id = d.assessment_session_id
    AND h.organisation_id = d.organisation_id AND h.workspace_id = d.workspace_id
    AND h.assessment_revision = d.assessment_revision AND d.status = 'ineligible'
    AND h.status IN ('pending', 'processing', 'failed', 'delivered')
  RETURNING h.* INTO v_handoff;
  IF v_handoff.id IS NULL THEN RAISE EXCEPTION 'ANALYSIS_ELIGIBILITY_SCOPE_MISMATCH'; END IF;
  RETURN v_handoff;
END;
$$;

ALTER TABLE public.assessment_analysis_eligibility_decisions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.assessment_analysis_eligibility_decisions FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.mark_assessment_analysis_handoff_ineligible(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.attach_assessment_analysis_eligibility_decision(uuid, uuid)
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.assessment_analysis_eligibility_decisions TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_assessment_analysis_handoff_ineligible(uuid, uuid)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.attach_assessment_analysis_eligibility_decision(uuid, uuid)
  TO service_role;

COMMENT ON TABLE public.assessment_analysis_eligibility_decisions IS
  'Immutable tenant-scoped PDR-003-002 eligibility decisions; contains no raw answers.';
