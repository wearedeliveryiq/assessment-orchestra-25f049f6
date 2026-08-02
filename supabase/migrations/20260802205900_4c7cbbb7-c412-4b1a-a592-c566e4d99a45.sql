ALTER TABLE public.organisation_memberships
  ADD CONSTRAINT organisation_memberships_no_product_governance_role
  CHECK (role <> 'product_governance');

ALTER TABLE public.organisation_invitations
  ADD CONSTRAINT organisation_invitations_no_product_governance_role
  CHECK (role <> 'product_governance'),
  ADD CONSTRAINT organisation_invitations_no_product_governance_workspace_role
  CHECK (workspace_role IS NULL OR workspace_role <> 'product_governance');

ALTER TABLE public.workspace_memberships
  ADD CONSTRAINT workspace_memberships_no_product_governance_role
  CHECK (role <> 'product_governance');