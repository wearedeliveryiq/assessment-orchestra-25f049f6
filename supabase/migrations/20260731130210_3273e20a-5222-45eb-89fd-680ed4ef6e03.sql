CREATE TABLE public.assessment_lifecycle_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_pack_id text NOT NULL,
  knowledge_pack_version text NOT NULL DEFAULT '',
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  assigned_to uuid,
  runtime_session_id uuid,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','assigned','in_progress','paused','awaiting_review','completed','archived')),
  priority text NOT NULL DEFAULT 'medium' CHECK (priority IN ('low','medium','high','critical')),
  tags text[] NOT NULL DEFAULT '{}',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  progress integer NOT NULL DEFAULT 0,
  version integer NOT NULL DEFAULT 1,
  parent_session_id uuid REFERENCES public.assessment_lifecycle_sessions(id) ON DELETE SET NULL,
  root_session_id uuid,
  due_date timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  paused_at timestamptz,
  last_activity timestamptz NOT NULL DEFAULT now(),
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.assessment_lifecycle_sessions TO service_role;
ALTER TABLE public.assessment_lifecycle_sessions ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_als_org_status ON public.assessment_lifecycle_sessions (organisation_id, status, last_activity DESC);
CREATE INDEX idx_als_workspace ON public.assessment_lifecycle_sessions (workspace_id, last_activity DESC);
CREATE INDEX idx_als_assigned ON public.assessment_lifecycle_sessions (assigned_to, status);
CREATE INDEX idx_als_owner ON public.assessment_lifecycle_sessions (owner_id, status);
CREATE INDEX idx_als_due ON public.assessment_lifecycle_sessions (due_date) WHERE due_date IS NOT NULL;
CREATE INDEX idx_als_root ON public.assessment_lifecycle_sessions (root_session_id, version);

CREATE TRIGGER trg_als_updated_at BEFORE UPDATE ON public.assessment_lifecycle_sessions
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.assessment_session_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_lifecycle_sessions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('owner','reviewer','contributor','observer')),
  added_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id, role)
);

GRANT ALL ON public.assessment_session_participants TO service_role;
ALTER TABLE public.assessment_session_participants ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_asp_user ON public.assessment_session_participants (user_id);
CREATE INDEX idx_asp_session ON public.assessment_session_participants (session_id);

CREATE TABLE public.assessment_session_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_lifecycle_sessions(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  summary text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.assessment_session_timeline TO service_role;
ALTER TABLE public.assessment_session_timeline ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ast_session_created ON public.assessment_session_timeline (session_id, created_at DESC);

CREATE TRIGGER trg_ast_immutable BEFORE UPDATE OR DELETE ON public.assessment_session_timeline
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE TABLE public.assessment_session_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_lifecycle_sessions(id) ON DELETE CASCADE,
  change_type text NOT NULL,
  field text NOT NULL DEFAULT '',
  previous_value jsonb,
  next_value jsonb,
  version integer NOT NULL DEFAULT 1,
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.assessment_session_history TO service_role;
ALTER TABLE public.assessment_session_history ENABLE ROW LEVEL SECURITY;
CREATE INDEX idx_ash_session_created ON public.assessment_session_history (session_id, created_at DESC);

CREATE TRIGGER trg_ash_immutable BEFORE UPDATE OR DELETE ON public.assessment_session_history
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();