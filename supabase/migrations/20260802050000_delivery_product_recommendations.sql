-- S3-009/S3-010: governed operational availability and tenant entitlements.
-- Deliberately contains no catalogue seed data: production availability is an
-- operational decision, separate from deterministic intelligence eligibility.
CREATE TABLE public.delivery_product_availability (
  product_type text NOT NULL CHECK (product_type IN ('knowledge_pack', 'teammate')),
  product_id text NOT NULL,
  status text NOT NULL CHECK (status IN ('active', 'inactive', 'unavailable')),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (product_type, product_id)
);

CREATE TABLE public.organisation_product_entitlements (
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  product_type text NOT NULL CHECK (product_type IN ('knowledge_pack', 'teammate')),
  product_id text NOT NULL,
  entitled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, product_type, product_id)
);

CREATE TABLE public.analysis_recommendation_acceptances (
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  accepted_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (analysis_run_id, recommendation_id)
);

CREATE INDEX analysis_recommendation_acceptances_tenant_idx
  ON public.analysis_recommendation_acceptances (organisation_id, workspace_id, analysis_run_id);

CREATE TRIGGER delivery_product_availability_audit
  BEFORE UPDATE ON public.delivery_product_availability
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER organisation_product_entitlements_audit
  BEFORE UPDATE ON public.organisation_product_entitlements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER analysis_recommendation_acceptances_immutable
  BEFORE UPDATE OR DELETE ON public.analysis_recommendation_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

ALTER TABLE public.delivery_product_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_product_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analysis_recommendation_acceptances ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.delivery_product_availability,
  public.organisation_product_entitlements,
  public.analysis_recommendation_acceptances TO service_role;
