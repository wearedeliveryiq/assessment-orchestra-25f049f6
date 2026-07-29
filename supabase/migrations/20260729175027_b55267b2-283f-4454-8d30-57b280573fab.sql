CREATE TABLE public.assessment_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  knowledge_pack text NOT NULL,
  knowledge_pack_version text NOT NULL,
  signal_code text NOT NULL,
  name text NOT NULL,
  category text NOT NULL,
  description text NOT NULL,
  supporting_observation_ids uuid[] NOT NULL DEFAULT '{}',
  supporting_definition_ids text[] NOT NULL DEFAULT '{}',
  confidence numeric NOT NULL,
  severity text NOT NULL,
  weight numeric NOT NULL,
  rule_expression text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT assessment_signals_unique_code UNIQUE (session_id, signal_code)
);

CREATE INDEX assessment_signals_session_idx ON public.assessment_signals (session_id);

GRANT ALL ON public.assessment_signals TO service_role;

ALTER TABLE public.assessment_signals ENABLE ROW LEVEL SECURITY;

-- Signals are immutable once created: the engine may insert or replace a run,
-- but no role may update a persisted signal row.
CREATE RULE assessment_signals_no_update AS ON UPDATE TO public.assessment_signals DO INSTEAD NOTHING;