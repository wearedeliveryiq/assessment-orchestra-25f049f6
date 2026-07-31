-- ============================================================
-- Platform Data Model & Persistence
-- 1. Canonical entities missing from the model (knowledge packs, settings,
--    retention policies)
-- 2. Common entity fields on every persisted aggregate
-- 3. Automatic audit/version maintenance via trigger
-- 4. Multi-tenant + soft-delete indexing strategy
-- ============================================================

-- ---------- 1. Automatic audit + optimistic concurrency trigger ----------
CREATE OR REPLACE FUNCTION public.platform_touch_row()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  IF to_jsonb(NEW) ? 'version' THEN
    -- version is advanced by the repository layer when it supplies a value,
    -- otherwise it is auto-incremented here so no feature team can forget it.
    IF NEW.version IS NULL OR NEW.version <= OLD.version THEN
      NEW.version := OLD.version + 1;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- ---------- 2. Knowledge Pack registry ----------
CREATE TABLE public.knowledge_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pack_id text NOT NULL,
  pack_version text NOT NULL,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'general',
  status text NOT NULL DEFAULT 'draft',
  source text NOT NULL DEFAULT 'builtin',
  tags text[] NOT NULL DEFAULT '{}',
  definition jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  version integer NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT knowledge_packs_identity_unique UNIQUE (pack_id, pack_version, organisation_id)
);

GRANT SELECT ON public.knowledge_packs TO authenticated;
GRANT ALL ON public.knowledge_packs TO service_role;
ALTER TABLE public.knowledge_packs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read knowledge packs in their organisation"
ON public.knowledge_packs FOR SELECT TO authenticated
USING (
  is_deleted = false
  AND (organisation_id IS NULL OR public.is_org_member(auth.uid(), organisation_id))
);

CREATE TRIGGER knowledge_packs_touch
BEFORE UPDATE ON public.knowledge_packs
FOR EACH ROW EXECUTE FUNCTION public.platform_touch_row();

CREATE INDEX knowledge_packs_tenant_idx
  ON public.knowledge_packs (organisation_id, workspace_id, is_deleted);
CREATE INDEX knowledge_packs_lookup_idx
  ON public.knowledge_packs (pack_id, status) WHERE is_deleted = false;

-- ---------- 3. Platform settings ----------
CREATE TABLE public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scope text NOT NULL DEFAULT 'platform',
  scope_id uuid,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  description text NOT NULL DEFAULT '',
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  version integer NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT platform_settings_scope_key_unique UNIQUE (scope, scope_id, key)
);

GRANT SELECT ON public.platform_settings TO authenticated;
GRANT ALL ON public.platform_settings TO service_role;
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read settings in scope"
ON public.platform_settings FOR SELECT TO authenticated
USING (
  is_deleted = false
  AND (
    scope = 'platform'
    OR (organisation_id IS NOT NULL AND public.is_org_member(auth.uid(), organisation_id))
  )
);

CREATE TRIGGER platform_settings_touch
BEFORE UPDATE ON public.platform_settings
FOR EACH ROW EXECUTE FUNCTION public.platform_touch_row();

CREATE INDEX platform_settings_scope_idx
  ON public.platform_settings (scope, scope_id) WHERE is_deleted = false;

-- ---------- 4. Generic data retention policies ----------
CREATE TABLE public.platform_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity text NOT NULL,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  mode text NOT NULL DEFAULT 'retain',
  retain_days integer,
  enabled boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  last_applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  version integer NOT NULL DEFAULT 1,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid,
  CONSTRAINT platform_retention_entity_unique UNIQUE (entity, organisation_id)
);

GRANT ALL ON public.platform_retention_policies TO service_role;
ALTER TABLE public.platform_retention_policies ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER platform_retention_policies_touch
BEFORE UPDATE ON public.platform_retention_policies
FOR EACH ROW EXECUTE FUNCTION public.platform_touch_row();

-- ---------- 5. Common entity fields on existing aggregates ----------
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'organisations',
    'workspaces',
    'organisation_memberships',
    'workspace_memberships',
    'platform_notifications',
    'assessment_sessions',
    'runtime_assessment_sessions',
    'assessment_responses',
    'identity_profiles',
    'organisation_invitations'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS created_by uuid,
        ADD COLUMN IF NOT EXISTS updated_by uuid,
        ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
        ADD COLUMN IF NOT EXISTS is_deleted boolean NOT NULL DEFAULT false,
        ADD COLUMN IF NOT EXISTS deleted_at timestamptz,
        ADD COLUMN IF NOT EXISTS deleted_by uuid', t);

    -- platform_notifications has no updated_at column of its own
    EXECUTE format('ALTER TABLE public.%I
        ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()', t);

    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.%I', t || '_touch', t);
    EXECUTE format('CREATE TRIGGER %I BEFORE UPDATE ON public.%I
        FOR EACH ROW EXECUTE FUNCTION public.platform_touch_row()', t || '_touch', t);
  END LOOP;
END;
$$;

-- Tenant columns that were previously implicit
ALTER TABLE public.assessment_sessions
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

ALTER TABLE public.runtime_assessment_sessions
  ADD COLUMN IF NOT EXISTS organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE;

-- ---------- 6. Indexing strategy ----------
CREATE INDEX IF NOT EXISTS workspaces_tenant_idx
  ON public.workspaces (organisation_id, is_deleted, status);
CREATE INDEX IF NOT EXISTS organisation_memberships_user_idx
  ON public.organisation_memberships (user_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS workspace_memberships_user_idx
  ON public.workspace_memberships (user_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS platform_notifications_inbox_idx
  ON public.platform_notifications (user_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS assessment_sessions_tenant_idx
  ON public.assessment_sessions (organisation_id, workspace_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS runtime_sessions_tenant_idx
  ON public.runtime_assessment_sessions (organisation_id, workspace_id, status) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS assessment_responses_session_idx
  ON public.assessment_responses (session_id, question_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS audit_events_retention_idx
  ON public.audit_events (created_at) WHERE archived_at IS NULL;