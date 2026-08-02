-- S3-001: immutable, tenant-scoped canonical inputs for downstream intelligence.
CREATE TABLE public.assessment_analysis_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE RESTRICT,
  runtime_execution_id uuid NOT NULL REFERENCES public.runtime_executions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  knowledge_pack_id text NOT NULL,
  knowledge_pack_version text NOT NULL,
  schema_version text NOT NULL,
  model_version text NOT NULL,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text NOT NULL UNIQUE,
  response_count integer NOT NULL CHECK (response_count > 0),
  canonical_input jsonb NOT NULL,
  completed_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assessment_analysis_runs_tenant_match CHECK (
    canonical_input #>> '{assessment,organisationId}' = organisation_id::text
    AND canonical_input #>> '{assessment,workspaceId}' = workspace_id::text
    AND canonical_input #>> '{assessment,sessionId}' = assessment_session_id::text
  )
);

CREATE INDEX assessment_analysis_runs_session_idx
  ON public.assessment_analysis_runs (assessment_session_id, created_at DESC);
CREATE INDEX assessment_analysis_runs_tenant_idx
  ON public.assessment_analysis_runs (organisation_id, workspace_id, created_at DESC);

ALTER TABLE public.assessment_analysis_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can read tenant assessment analysis runs"
  ON public.assessment_analysis_runs
  FOR SELECT TO authenticated
  USING (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.organisation_memberships membership
      WHERE membership.organisation_id = assessment_analysis_runs.organisation_id
        AND membership.user_id = auth.uid()
        AND membership.status = 'active'
        AND membership.is_deleted = false
    )
    AND EXISTS (
      SELECT 1 FROM public.workspaces workspace
      WHERE workspace.id = assessment_analysis_runs.workspace_id
        AND workspace.organisation_id = assessment_analysis_runs.organisation_id
        AND workspace.is_deleted = false
    )
  );

GRANT SELECT ON public.assessment_analysis_runs TO authenticated;
GRANT ALL ON public.assessment_analysis_runs TO service_role;

CREATE TRIGGER assessment_analysis_runs_immutable
  BEFORE UPDATE OR DELETE ON public.assessment_analysis_runs
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

COMMENT ON TABLE public.assessment_analysis_runs IS
  'Immutable, version-pinned canonical assessment input produced by S3-001. Calculates no recommendations or narratives.';
