CREATE TABLE public.assessment_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.assessment_sessions(id) ON DELETE CASCADE,
  owner_key text NOT NULL,
  report_type text NOT NULL,
  format text NOT NULL,
  version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'queued',
  template_id text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  knowledge_pack text NOT NULL DEFAULT '',
  knowledge_pack_version text NOT NULL DEFAULT '',
  filename text NOT NULL DEFAULT '',
  content_type text NOT NULL DEFAULT '',
  storage_path text,
  file_size integer NOT NULL DEFAULT 0,
  checksum text NOT NULL DEFAULT '',
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  validation jsonb NOT NULL DEFAULT '{}'::jsonb,
  error text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.assessment_reports TO service_role;

ALTER TABLE public.assessment_reports ENABLE ROW LEVEL SECURITY;

CREATE INDEX assessment_reports_session_idx ON public.assessment_reports (session_id, created_at DESC);
CREATE UNIQUE INDEX assessment_reports_version_idx ON public.assessment_reports (session_id, report_type, format, version);

CREATE TRIGGER assessment_reports_set_updated_at
BEFORE UPDATE ON public.assessment_reports
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();