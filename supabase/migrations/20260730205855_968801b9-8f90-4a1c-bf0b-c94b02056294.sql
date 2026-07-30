-- Audit & Explainability Service storage
CREATE TABLE public.audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp timestamptz NOT NULL DEFAULT now(),
  assessment_session_id uuid,
  organisation_id text NOT NULL DEFAULT '',
  knowledge_pack_id text NOT NULL DEFAULT '',
  knowledge_pack_version text NOT NULL DEFAULT '',
  engine text NOT NULL DEFAULT 'runtime',
  event_type text NOT NULL,
  entity_type text NOT NULL DEFAULT 'system',
  entity_id text,
  user_id text NOT NULL DEFAULT '',
  correlation_id text NOT NULL DEFAULT '',
  execution_id text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info',
  duration_ms integer,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  expires_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_session_idx ON public.audit_events (assessment_session_id, timestamp DESC);
CREATE INDEX audit_events_timestamp_idx ON public.audit_events (timestamp DESC);
CREATE INDEX audit_events_engine_idx ON public.audit_events (engine, timestamp DESC);
CREATE INDEX audit_events_entity_idx ON public.audit_events (entity_type, entity_id);
CREATE INDEX audit_events_severity_idx ON public.audit_events (severity, timestamp DESC);
CREATE INDEX audit_events_org_idx ON public.audit_events (organisation_id, timestamp DESC);
CREATE INDEX audit_events_correlation_idx ON public.audit_events (correlation_id);
CREATE INDEX audit_events_expiry_idx ON public.audit_events (expires_at);

CREATE TABLE public.audit_explainability_edges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_session_id uuid NOT NULL,
  source_type text NOT NULL,
  source_id text NOT NULL,
  source_label text NOT NULL DEFAULT '',
  target_type text NOT NULL,
  target_id text NOT NULL,
  target_label text NOT NULL DEFAULT '',
  relationship_type text NOT NULL DEFAULT 'supports',
  confidence numeric NOT NULL DEFAULT 1,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_session_id, source_type, source_id, target_type, target_id, relationship_type)
);

CREATE INDEX audit_edges_session_idx ON public.audit_explainability_edges (assessment_session_id);
CREATE INDEX audit_edges_source_idx ON public.audit_explainability_edges (source_type, source_id);
CREATE INDEX audit_edges_target_idx ON public.audit_explainability_edges (target_type, target_id);

CREATE TABLE public.audit_retention_policies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  scope text NOT NULL DEFAULT 'all',
  scope_value text NOT NULL DEFAULT '',
  mode text NOT NULL DEFAULT 'indefinite',
  retain_days integer,
  enabled boolean NOT NULL DEFAULT true,
  description text NOT NULL DEFAULT '',
  last_applied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER audit_retention_policies_updated_at
BEFORE UPDATE ON public.audit_retention_policies
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Immutability: audit events and explainability edges may never be modified.
CREATE OR REPLACE FUNCTION public.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable';
END;
$$;

CREATE TRIGGER audit_events_immutable
BEFORE UPDATE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE TRIGGER audit_edges_immutable
BEFORE UPDATE ON public.audit_explainability_edges
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

GRANT ALL ON public.audit_events TO service_role;
GRANT ALL ON public.audit_explainability_edges TO service_role;
GRANT ALL ON public.audit_retention_policies TO service_role;

ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_explainability_edges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_retention_policies ENABLE ROW LEVEL SECURITY;

INSERT INTO public.audit_retention_policies (name, scope, mode, retain_days, description)
VALUES
  ('default-retain-indefinitely', 'all', 'indefinite', NULL, 'Default policy: keep every audit record.'),
  ('debug-events-90-days', 'severity', 'purge', 90, 'Purge low-value debug events after 90 days.'),
  ('archive-after-two-years', 'all', 'archive', 730, 'Archive audit records older than two years.');

UPDATE public.audit_retention_policies SET scope_value = 'debug', enabled = false WHERE name = 'debug-events-90-days';
UPDATE public.audit_retention_policies SET enabled = false WHERE name = 'archive-after-two-years';