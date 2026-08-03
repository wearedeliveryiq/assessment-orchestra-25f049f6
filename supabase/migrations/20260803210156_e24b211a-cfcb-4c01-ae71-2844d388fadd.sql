-- PDR-003-004: extend the existing product availability/entitlement boundary
-- for the stable Delivery DNA Action 1.0.0 entitlement. No availability or
-- entitlement is activated by this migration; commercial access stays deny by default.
ALTER TABLE public.delivery_product_availability
  DROP CONSTRAINT delivery_product_availability_product_type_check,
  ADD CONSTRAINT delivery_product_availability_product_type_check CHECK (
    product_type IN ('knowledge_pack', 'teammate', 'delivery_dna_action')
  ),
  ADD CONSTRAINT delivery_product_availability_delivery_dna_action CHECK (
    product_type <> 'delivery_dna_action'
    OR (product_id = 'delivery_dna_action' AND product_version = '1.0.0')
  );

ALTER TABLE public.organisation_product_entitlements
  DROP CONSTRAINT organisation_product_entitlements_product_type_check,
  ADD COLUMN workspace_id uuid REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  ADD COLUMN product_version text,
  ADD COLUMN valid_from timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN expires_at timestamptz,
  ADD COLUMN revoked_at timestamptz,
  ADD COLUMN entitlement_source text NOT NULL DEFAULT 'commercial',
  ADD CONSTRAINT organisation_product_entitlements_product_type_check CHECK (
    product_type IN ('knowledge_pack', 'teammate', 'delivery_dna_action')
  ),
  ADD CONSTRAINT organisation_product_entitlements_version CHECK (
    product_version IS NULL OR product_version ~ '^\d+\.\d+\.\d+$'
  ),
  ADD CONSTRAINT organisation_product_entitlements_window CHECK (
    expires_at IS NULL OR expires_at > valid_from
  ),
  ADD CONSTRAINT organisation_product_entitlements_source CHECK (
    entitlement_source IN ('commercial', 'grandfathered')
  ),
  ADD CONSTRAINT organisation_product_entitlements_delivery_dna_action CHECK (
    product_type <> 'delivery_dna_action'
    OR (product_id = 'delivery_dna_action' AND product_version = '1.0.0')
  );

CREATE INDEX organisation_product_entitlements_delivery_dna_action_idx
  ON public.organisation_product_entitlements (
    organisation_id, workspace_id, product_type, product_id, product_version
  )
  WHERE product_type = 'delivery_dna_action' AND entitled = true;

COMMENT ON COLUMN public.organisation_product_entitlements.workspace_id IS
  'Optional workspace restriction; NULL grants the entitlement across the organisation.';
COMMENT ON COLUMN public.organisation_product_entitlements.entitlement_source IS
  'Commercial or PDR-003-004 grandfathered access provenance; never implies payment status.';

REVOKE ALL ON public.delivery_product_availability,
  public.organisation_product_entitlements FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.delivery_product_availability,
  public.organisation_product_entitlements FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.delivery_product_availability,
  public.organisation_product_entitlements TO service_role;