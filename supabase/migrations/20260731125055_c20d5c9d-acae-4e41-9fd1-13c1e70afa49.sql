CREATE TABLE public.runtime_assessment_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key text NOT NULL,
  pack_id text NOT NULL,
  pack_version text NOT NULL,
  assessment_id text NOT NULL,
  name text NOT NULL,
  status text NOT NULL DEFAULT 'created',
  current_section_id text,
  current_page_id text,
  answered_count integer NOT NULL DEFAULT 0,
  total_questions integer NOT NULL DEFAULT 0,
  progress integer NOT NULL DEFAULT 0,
  locked boolean NOT NULL DEFAULT false,
  started_at timestamptz NOT NULL DEFAULT now(),
  last_saved_at timestamptz,
  completed_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX runtime_assessment_sessions_owner_idx
  ON public.runtime_assessment_sessions (owner_key, started_at DESC);

CREATE TABLE public.runtime_assessment_responses (
  session_id uuid NOT NULL REFERENCES public.runtime_assessment_sessions(id) ON DELETE CASCADE,
  question_id text NOT NULL,
  section_id text NOT NULL,
  page_id text NOT NULL,
  value jsonb,
  valid boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, question_id)
);

CREATE TABLE public.runtime_assessment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.runtime_assessment_sessions(id) ON DELETE CASCADE,
  owner_key text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX runtime_assessment_events_session_idx
  ON public.runtime_assessment_events (session_id, created_at DESC);

GRANT ALL ON public.runtime_assessment_sessions TO service_role;
GRANT ALL ON public.runtime_assessment_responses TO service_role;
GRANT ALL ON public.runtime_assessment_events TO service_role;

ALTER TABLE public.runtime_assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_assessment_events ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER runtime_assessment_sessions_updated_at
  BEFORE UPDATE ON public.runtime_assessment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();