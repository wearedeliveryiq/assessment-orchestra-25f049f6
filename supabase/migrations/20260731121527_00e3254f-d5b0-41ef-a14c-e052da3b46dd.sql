-- ============ enum extensions ============
ALTER TYPE public.platform_role ADD VALUE IF NOT EXISTS 'organisation_owner';
ALTER TYPE public.platform_role ADD VALUE IF NOT EXISTS 'workspace_manager';
ALTER TYPE public.membership_status ADD VALUE IF NOT EXISTS 'suspended';

-- ============ organisations extension ============
DO $$ BEGIN
  CREATE TYPE public.organisation_status AS ENUM ('active','suspended','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.workspace_status AS ENUM ('active','archived');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS industry text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS organisation_size text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS country text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'Europe/London',
  ADD COLUMN IF NOT EXISTS logo text,
  ADD COLUMN IF NOT EXISTS website text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS status public.organisation_status NOT NULL DEFAULT 'active',
  ADD COLUMN IF NOT EXISTS subscription_plan text NOT NULL DEFAULT 'trial';

CREATE UNIQUE INDEX IF NOT EXISTS organisations_slug_key ON public.organisations (slug);

-- ============ workspace types (configurable) ============
CREATE TABLE public.workspace_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  label text NOT NULL,
  description text NOT NULL DEFAULT '',
  sort_order integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workspace_types TO authenticated;
GRANT ALL ON public.workspace_types TO service_role;
ALTER TABLE public.workspace_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Workspace types are readable by signed-in users"
  ON public.workspace_types FOR SELECT TO authenticated USING (true);

INSERT INTO public.workspace_types (code, label, description, sort_order) VALUES
  ('portfolio','Portfolio','A portfolio of programmes and initiatives.',10),
  ('programme','Programme','A single programme of delivery.',20),
  ('department','Department','A functional department.',30),
  ('business_unit','Business Unit','A business unit or division.',40),
  ('project','Project','A discrete project.',50),
  ('custom','Custom','A custom workspace shape.',60);

-- ============ workspaces ============
CREATE TABLE public.workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  name text NOT NULL,
  slug text NOT NULL,
  description text NOT NULL DEFAULT '',
  type text NOT NULL DEFAULT 'custom' REFERENCES public.workspace_types(code),
  status public.workspace_status NOT NULL DEFAULT 'active',
  colour text NOT NULL DEFAULT '#5B8DEF',
  icon text NOT NULL DEFAULT 'layers',
  visibility text NOT NULL DEFAULT 'organisation',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX workspaces_org_name_key ON public.workspaces (organisation_id, lower(name));
CREATE UNIQUE INDEX workspaces_org_slug_key ON public.workspaces (organisation_id, slug);
CREATE INDEX workspaces_org_idx ON public.workspaces (organisation_id, status);
GRANT SELECT ON public.workspaces TO authenticated;
GRANT ALL ON public.workspaces TO service_role;
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view workspaces in their organisations"
  ON public.workspaces FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE TRIGGER workspaces_set_updated_at BEFORE UPDATE ON public.workspaces
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER workspace_types_set_updated_at BEFORE UPDATE ON public.workspace_types
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ workspace memberships ============
CREATE TABLE public.workspace_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role public.platform_role NOT NULL,
  status public.membership_status NOT NULL DEFAULT 'active',
  favourite boolean NOT NULL DEFAULT false,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (workspace_id, user_id)
);
CREATE INDEX workspace_memberships_user_idx ON public.workspace_memberships (user_id, status);
GRANT SELECT ON public.workspace_memberships TO authenticated;
GRANT ALL ON public.workspace_memberships TO service_role;
ALTER TABLE public.workspace_memberships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own workspace memberships"
  ON public.workspace_memberships FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER workspace_memberships_set_updated_at BEFORE UPDATE ON public.workspace_memberships
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ settings ============
CREATE TABLE public.organisation_settings (
  organisation_id uuid PRIMARY KEY REFERENCES public.organisations(id) ON DELETE CASCADE,
  general jsonb NOT NULL DEFAULT '{}'::jsonb,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  notifications jsonb NOT NULL DEFAULT '{}'::jsonb,
  security jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.organisation_settings TO authenticated;
GRANT ALL ON public.organisation_settings TO service_role;
ALTER TABLE public.organisation_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their organisation settings"
  ON public.organisation_settings FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organisation_id));
CREATE TRIGGER organisation_settings_set_updated_at BEFORE UPDATE ON public.organisation_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.workspace_settings (
  workspace_id uuid PRIMARY KEY REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  colour text NOT NULL DEFAULT '#5B8DEF',
  icon text NOT NULL DEFAULT 'layers',
  default_knowledge_packs text[] NOT NULL DEFAULT '{}',
  archive_rules jsonb NOT NULL DEFAULT '{}'::jsonb,
  visibility text NOT NULL DEFAULT 'organisation',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.workspace_settings TO authenticated;
GRANT ALL ON public.workspace_settings TO service_role;
ALTER TABLE public.workspace_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their workspace settings"
  ON public.workspace_settings FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organisation_id));
CREATE TRIGGER workspace_settings_set_updated_at BEFORE UPDATE ON public.workspace_settings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ workspace visit history ============
CREATE TABLE public.workspace_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  visit_count integer NOT NULL DEFAULT 1,
  last_visited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, workspace_id)
);
CREATE INDEX workspace_visits_recent_idx ON public.workspace_visits (user_id, last_visited_at DESC);
GRANT SELECT ON public.workspace_visits TO authenticated;
GRANT ALL ON public.workspace_visits TO service_role;
ALTER TABLE public.workspace_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own workspace history"
  ON public.workspace_visits FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE TRIGGER workspace_visits_set_updated_at BEFORE UPDATE ON public.workspace_visits
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ notifications ============
CREATE TABLE public.platform_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE CASCADE,
  module text NOT NULL DEFAULT 'organisation',
  event_type text NOT NULL,
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info',
  read_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX platform_notifications_user_idx ON public.platform_notifications (user_id, created_at DESC);
GRANT SELECT, UPDATE ON public.platform_notifications TO authenticated;
GRANT ALL ON public.platform_notifications TO service_role;
ALTER TABLE public.platform_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own notifications"
  ON public.platform_notifications FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can mark their own notifications read"
  ON public.platform_notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ============ organisation audit ============
CREATE TABLE public.organisation_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid REFERENCES public.organisations(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  event_type text NOT NULL,
  entity_type text NOT NULL,
  entity_id text,
  summary text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text NOT NULL DEFAULT 'unknown',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX organisation_audit_org_idx ON public.organisation_audit_events (organisation_id, created_at DESC);
CREATE INDEX organisation_audit_workspace_idx ON public.organisation_audit_events (workspace_id, created_at DESC);
GRANT SELECT ON public.organisation_audit_events TO authenticated;
GRANT ALL ON public.organisation_audit_events TO service_role;
ALTER TABLE public.organisation_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their organisation audit trail"
  ON public.organisation_audit_events FOR SELECT TO authenticated
  USING (organisation_id IS NOT NULL AND public.is_org_member(auth.uid(), organisation_id));

-- ============ invitations extension ============
ALTER TABLE public.organisation_invitations
  ADD COLUMN IF NOT EXISTS workspace_id uuid REFERENCES public.workspaces(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS workspace_role public.platform_role,
  ADD COLUMN IF NOT EXISTS message text NOT NULL DEFAULT '';