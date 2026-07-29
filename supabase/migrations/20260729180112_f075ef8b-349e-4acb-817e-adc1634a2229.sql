CREATE TABLE public.assessment_rule_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  knowledge_pack text NOT NULL,
  knowledge_pack_version text NOT NULL,
  rule_code text NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  status text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  severity text NOT NULL,
  supporting_signal_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  supporting_signal_codes text[] NOT NULL DEFAULT '{}'::text[],
  evaluation_reason text NOT NULL,
  rule_expression text NOT NULL,
  weight numeric NOT NULL DEFAULT 1,
  executed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assessment_rule_results_unique_code UNIQUE (session_id, rule_code)
);

GRANT ALL ON public.assessment_rule_results TO service_role;

ALTER TABLE public.assessment_rule_results ENABLE ROW LEVEL SECURITY;

CREATE INDEX assessment_rule_results_session_idx ON public.assessment_rule_results (session_id);

CREATE RULE assessment_rule_results_no_update AS ON UPDATE TO public.assessment_rule_results DO INSTEAD NOTHING;