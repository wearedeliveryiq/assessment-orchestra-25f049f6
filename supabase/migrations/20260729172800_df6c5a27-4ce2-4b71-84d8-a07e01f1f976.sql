CREATE TYPE public.assessment_status AS ENUM ('draft','in_progress','submitted','processing','completed','archived');
CREATE TYPE public.stage_status AS ENUM ('pending','running','completed','failed','skipped');

CREATE TABLE public.assessment_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_key TEXT NOT NULL,
  organisation_name TEXT NOT NULL DEFAULT 'Untitled organisation',
  contact_name TEXT,
  assessment_type TEXT NOT NULL DEFAULT 'delivery-maturity',
  status public.assessment_status NOT NULL DEFAULT 'draft',
  current_section TEXT,
  progress INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB,
  failure_reason TEXT,
  submitted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_assessment_sessions_owner ON public.assessment_sessions (owner_key, status, updated_at DESC);

CREATE TABLE public.assessment_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  section_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  value JSONB NOT NULL DEFAULT 'null'::jsonb,
  score NUMERIC,
  notes TEXT,
  answered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, question_id)
);
CREATE INDEX idx_assessment_responses_session ON public.assessment_responses (session_id);

CREATE TABLE public.assessment_stage_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  sequence INTEGER NOT NULL,
  status public.stage_status NOT NULL DEFAULT 'pending',
  attempt INTEGER NOT NULL DEFAULT 0,
  output JSONB,
  error TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (session_id, stage)
);
CREATE INDEX idx_assessment_stage_runs_session ON public.assessment_stage_runs (session_id, sequence);

GRANT ALL ON public.assessment_sessions TO service_role;
GRANT ALL ON public.assessment_responses TO service_role;
GRANT ALL ON public.assessment_stage_runs TO service_role;

ALTER TABLE public.assessment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_stage_runs ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_assessment_sessions_updated BEFORE UPDATE ON public.assessment_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assessment_responses_updated BEFORE UPDATE ON public.assessment_responses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_assessment_stage_runs_updated BEFORE UPDATE ON public.assessment_stage_runs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();