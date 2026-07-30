CREATE TABLE public.assessment_narratives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  knowledge_pack text NOT NULL,
  knowledge_pack_version text NOT NULL,
  headline text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'template',
  provider text NOT NULL DEFAULT 'template',
  model text NOT NULL DEFAULT '',
  tone text NOT NULL DEFAULT '',
  audience text NOT NULL DEFAULT '',
  confidence numeric NOT NULL DEFAULT 0,
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,
  evidence jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  generation_ms integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX assessment_narratives_session_idx ON public.assessment_narratives (session_id);

GRANT ALL ON public.assessment_narratives TO service_role;
ALTER TABLE public.assessment_narratives ENABLE ROW LEVEL SECURITY;
CREATE RULE assessment_narratives_immutable AS ON UPDATE TO public.assessment_narratives DO INSTEAD NOTHING;