CREATE TABLE public.platform_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id uuid NOT NULL,
  workspace_id uuid,
  assessment_session_id uuid,
  source_module text NOT NULL DEFAULT 'assessment',
  source_id text,
  report_type text NOT NULL,
  template_id text NOT NULL,
  template_version text NOT NULL DEFAULT '1.0.0',
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued',
  version integer NOT NULL DEFAULT 1,
  lineage_id uuid NOT NULL,
  format text NOT NULL,
  content_type text NOT NULL DEFAULT 'application/octet-stream',
  filename text NOT NULL DEFAULT '',
  storage_path text,
  checksum text NOT NULL DEFAULT '',
  file_size integer NOT NULL DEFAULT 0,
  download_count integer NOT NULL DEFAULT 0,
  last_downloaded_at timestamptz,
  generated_by uuid,
  generated_by_email text NOT NULL DEFAULT '',
  generated_at timestamptz,
  queued_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  duration_ms integer NOT NULL DEFAULT 0,
  attempts integer NOT NULL DEFAULT 0,
  max_attempts integer NOT NULL DEFAULT 3,
  expires_at timestamptz,
  error text,
  error_code text,
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  parameters jsonb NOT NULL DEFAULT '{}'::jsonb,
  schedule jsonb NOT NULL DEFAULT '{}'::jsonb,
  distribution jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  updated_by uuid,
  is_deleted boolean NOT NULL DEFAULT false,
  deleted_at timestamptz,
  deleted_by uuid
);

CREATE INDEX platform_reports_org_idx ON public.platform_reports (organisation_id, created_at DESC);
CREATE INDEX platform_reports_workspace_idx ON public.platform_reports (workspace_id, created_at DESC);
CREATE INDEX platform_reports_status_idx ON public.platform_reports (status, queued_at);
CREATE INDEX platform_reports_lineage_idx ON public.platform_reports (lineage_id, version DESC);

GRANT SELECT ON public.platform_reports TO authenticated;
GRANT ALL ON public.platform_reports TO service_role;
ALTER TABLE public.platform_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view organisation reports"
  ON public.platform_reports FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE TRIGGER platform_reports_touch
  BEFORE UPDATE ON public.platform_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.platform_report_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id uuid REFERENCES public.platform_reports(id) ON DELETE CASCADE,
  lineage_id uuid,
  organisation_id uuid NOT NULL,
  workspace_id uuid,
  event_type text NOT NULL,
  actor_id uuid,
  actor_email text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  severity text NOT NULL DEFAULT 'info',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX platform_report_events_report_idx ON public.platform_report_events (report_id, created_at DESC);
CREATE INDEX platform_report_events_org_idx ON public.platform_report_events (organisation_id, created_at DESC);

GRANT SELECT ON public.platform_report_events TO authenticated;
GRANT ALL ON public.platform_report_events TO service_role;
ALTER TABLE public.platform_report_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view organisation report history"
  ON public.platform_report_events FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE TABLE public.platform_branding_profiles (
  organisation_id uuid PRIMARY KEY,
  product_name text NOT NULL DEFAULT 'DeliveryIQ',
  logo_text text NOT NULL DEFAULT 'DIQ',
  logo_url text,
  primary_colour text NOT NULL DEFAULT '0EA5A4',
  secondary_colour text NOT NULL DEFAULT '6366F1',
  ink_colour text NOT NULL DEFAULT '0F172A',
  muted_colour text NOT NULL DEFAULT '64748B',
  surface_colour text NOT NULL DEFAULT 'F8FAFC',
  heading_font text NOT NULL DEFAULT 'Arial',
  body_font text NOT NULL DEFAULT 'Arial',
  header_text text NOT NULL DEFAULT '',
  footer_text text NOT NULL DEFAULT '',
  contact_name text NOT NULL DEFAULT '',
  contact_email text NOT NULL DEFAULT '',
  contact_phone text NOT NULL DEFAULT '',
  website text NOT NULL DEFAULT '',
  confidentiality_statement text NOT NULL DEFAULT 'Confidential — for the intended recipient only.',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid
);

GRANT SELECT ON public.platform_branding_profiles TO authenticated;
GRANT ALL ON public.platform_branding_profiles TO service_role;
ALTER TABLE public.platform_branding_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view organisation branding"
  ON public.platform_branding_profiles FOR SELECT TO authenticated
  USING (public.is_org_member(auth.uid(), organisation_id));

CREATE TRIGGER platform_branding_profiles_touch
  BEFORE UPDATE ON public.platform_branding_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();