CREATE TABLE public.assessment_observations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  knowledge_pack text NOT NULL,
  knowledge_pack_version text NOT NULL,
  definition_id text NOT NULL,
  question_id text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text NOT NULL,
  evidence text NOT NULL,
  severity text NOT NULL,
  confidence numeric NOT NULL DEFAULT 1,
  weight numeric NOT NULL DEFAULT 1,
  source_value jsonb,
  source_label text,
  rule_expression text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assessment_observations_unique UNIQUE (session_id, definition_id)
);

GRANT ALL ON public.assessment_observations TO service_role;

ALTER TABLE public.assessment_observations ENABLE ROW LEVEL SECURITY;

CREATE INDEX assessment_observations_session_idx ON public.assessment_observations (session_id);

CREATE TRIGGER assessment_observations_set_updated_at
BEFORE UPDATE ON public.assessment_observations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();