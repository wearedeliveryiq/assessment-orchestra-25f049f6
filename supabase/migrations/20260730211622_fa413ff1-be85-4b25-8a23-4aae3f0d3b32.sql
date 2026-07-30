CREATE TABLE public.runtime_executions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_session_id uuid NOT NULL,
  owner_key text NOT NULL,
  organisation_name text NOT NULL DEFAULT '',
  knowledge_pack_id text NOT NULL DEFAULT '',
  knowledge_pack_version text NOT NULL DEFAULT '',
  pipeline_id text NOT NULL DEFAULT 'default',
  pipeline_version text NOT NULL DEFAULT '1.0.0',
  status text NOT NULL DEFAULT 'queued',
  current_stage text,
  progress integer NOT NULL DEFAULT 0,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  error_message text,
  failure_class text,
  retry_count integer NOT NULL DEFAULT 0,
  execution_mode text NOT NULL DEFAULT 'manual',
  correlation_id text NOT NULL DEFAULT '',
  cancel_requested boolean NOT NULL DEFAULT false,
  heartbeat_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX runtime_executions_session_idx ON public.runtime_executions (assessment_session_id, created_at DESC);
CREATE INDEX runtime_executions_owner_idx ON public.runtime_executions (owner_key, created_at DESC);
CREATE INDEX runtime_executions_status_idx ON public.runtime_executions (status, created_at DESC);

CREATE TABLE public.runtime_execution_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id uuid NOT NULL REFERENCES public.runtime_executions(id) ON DELETE CASCADE,
  assessment_session_id uuid NOT NULL,
  stage_id text NOT NULL,
  engine text NOT NULL,
  sequence integer NOT NULL,
  depends_on text[] NOT NULL DEFAULT '{}'::text[],
  status text NOT NULL DEFAULT 'pending',
  attempt integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 1,
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  error_message text,
  failure_class text,
  retry_history jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (execution_id, stage_id)
);

CREATE INDEX runtime_execution_stages_execution_idx ON public.runtime_execution_stages (execution_id, sequence);

GRANT ALL ON public.runtime_executions TO service_role;
GRANT ALL ON public.runtime_execution_stages TO service_role;

ALTER TABLE public.runtime_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.runtime_execution_stages ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER runtime_executions_updated_at BEFORE UPDATE ON public.runtime_executions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER runtime_execution_stages_updated_at BEFORE UPDATE ON public.runtime_execution_stages
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();