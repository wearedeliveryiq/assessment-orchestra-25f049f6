CREATE TABLE public.assessment_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  knowledge_pack text NOT NULL,
  knowledge_pack_version text NOT NULL,
  score_code text NOT NULL,
  dimension text NOT NULL,
  overall_score numeric NOT NULL DEFAULT 0,
  maximum_score numeric NOT NULL DEFAULT 100,
  percentage numeric NOT NULL DEFAULT 0,
  maturity_level text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  severity text NOT NULL DEFAULT 'info',
  weight numeric NOT NULL DEFAULT 1,
  supporting_pattern_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  supporting_pattern_codes text[] NOT NULL DEFAULT '{}'::text[],
  calculation_reason text NOT NULL DEFAULT '',
  score_expression text NOT NULL DEFAULT '',
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX assessment_scores_session_code_idx
  ON public.assessment_scores (session_id, score_code);
CREATE INDEX assessment_scores_session_idx ON public.assessment_scores (session_id);

GRANT ALL ON public.assessment_scores TO service_role;
ALTER TABLE public.assessment_scores ENABLE ROW LEVEL SECURITY;
CREATE RULE assessment_scores_immutable AS ON UPDATE TO public.assessment_scores DO INSTEAD NOTHING;

CREATE TABLE public.assessment_score_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  knowledge_pack text NOT NULL,
  knowledge_pack_version text NOT NULL,
  overall_score numeric NOT NULL DEFAULT 0,
  maximum_score numeric NOT NULL DEFAULT 100,
  percentage numeric NOT NULL DEFAULT 0,
  maturity_level text NOT NULL,
  confidence numeric NOT NULL DEFAULT 0,
  dimension_count integer NOT NULL DEFAULT 0,
  pattern_count integer NOT NULL DEFAULT 0,
  breakdown jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.assessment_score_summaries TO service_role;
ALTER TABLE public.assessment_score_summaries ENABLE ROW LEVEL SECURITY;
CREATE RULE assessment_score_summaries_immutable AS ON UPDATE TO public.assessment_score_summaries DO INSTEAD NOTHING;