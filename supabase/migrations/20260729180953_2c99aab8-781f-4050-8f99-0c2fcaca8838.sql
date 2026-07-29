CREATE TABLE public.assessment_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  knowledge_pack text NOT NULL,
  knowledge_pack_version text NOT NULL,
  pattern_code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  business_impact text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  severity text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  supporting_rule_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  supporting_rule_codes text[] NOT NULL DEFAULT '{}'::text[],
  pattern_expression text NOT NULL,
  evaluation_reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX assessment_patterns_session_code_key
  ON public.assessment_patterns (session_id, pattern_code);
CREATE INDEX assessment_patterns_session_idx ON public.assessment_patterns (session_id);

GRANT ALL ON public.assessment_patterns TO service_role;

ALTER TABLE public.assessment_patterns ENABLE ROW LEVEL SECURITY;

CREATE RULE assessment_patterns_no_update AS
  ON UPDATE TO public.assessment_patterns DO INSTEAD NOTHING;