-- Consolidate assessment ownership around explicit organisation/workspace scope.
-- The legacy runtime table remains readable for migration purposes, but the UI
-- now creates sessions only in public.assessment_sessions.

ALTER TABLE public.runtime_assessment_sessions
  ADD COLUMN IF NOT EXISTS created_by_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_runtime_assessment_sessions_user_tenant
  ON public.runtime_assessment_sessions
  (created_by_user_id, organisation_id, workspace_id, updated_at DESC)
  WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_assessment_sessions_user_tenant
  ON public.assessment_sessions
  (created_by_user_id, organisation_id, workspace_id, updated_at DESC)
  WHERE is_deleted = false;

ALTER TABLE public.assessment_sessions
  DROP CONSTRAINT IF EXISTS assessment_sessions_explicit_tenant;
ALTER TABLE public.assessment_sessions
  ADD CONSTRAINT assessment_sessions_explicit_tenant
  CHECK (
    organisation_id IS NOT NULL
    AND workspace_id IS NOT NULL
    AND created_by_user_id IS NOT NULL
  ) NOT VALID;

DROP POLICY IF EXISTS "Users can manage their own assessment sessions"
  ON public.assessment_sessions;

CREATE POLICY "Tenant members can read assessment sessions"
  ON public.assessment_sessions
  FOR SELECT TO authenticated
  USING (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.organisation_memberships membership
      WHERE membership.organisation_id = assessment_sessions.organisation_id
        AND membership.user_id = auth.uid()
        AND membership.status = 'active'
        AND membership.is_deleted = false
    )
    AND EXISTS (
      SELECT 1
      FROM public.workspaces workspace
      WHERE workspace.id = assessment_sessions.workspace_id
        AND workspace.organisation_id = assessment_sessions.organisation_id
        AND workspace.is_deleted = false
    )
  );

CREATE POLICY "Tenant members can create assessment sessions"
  ON public.assessment_sessions
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by_user_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.organisation_memberships membership
      WHERE membership.organisation_id = assessment_sessions.organisation_id
        AND membership.user_id = auth.uid()
        AND membership.status = 'active'
        AND membership.is_deleted = false
    )
    AND EXISTS (
      SELECT 1
      FROM public.workspaces workspace
      WHERE workspace.id = assessment_sessions.workspace_id
        AND workspace.organisation_id = assessment_sessions.organisation_id
        AND workspace.is_deleted = false
    )
  );

CREATE POLICY "Creators can update tenant assessment sessions"
  ON public.assessment_sessions
  FOR UPDATE TO authenticated
  USING (created_by_user_id = auth.uid())
  WITH CHECK (created_by_user_id = auth.uid());

COMMENT ON TABLE public.runtime_assessment_sessions IS
  'Deprecated assessment runtime store. Retained temporarily for migration; new UI sessions use assessment_sessions.';