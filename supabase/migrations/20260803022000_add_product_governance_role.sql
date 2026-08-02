-- PB-004 section 14: Product Governance is an independent platform role.
-- Keep the enum change in its own migration because PostgreSQL requires a
-- commit before a newly added enum value can be used by later constraints.
ALTER TYPE public.platform_role ADD VALUE IF NOT EXISTS 'product_governance';
