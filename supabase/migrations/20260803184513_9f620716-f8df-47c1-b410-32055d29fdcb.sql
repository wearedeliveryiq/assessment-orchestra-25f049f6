-- Lovable Cloud reapplies public-schema defaults after object creation; restore least privilege.
REVOKE EXECUTE ON FUNCTION public.protect_delivery_dna_collection_execution()
  FROM PUBLIC, anon, authenticated;