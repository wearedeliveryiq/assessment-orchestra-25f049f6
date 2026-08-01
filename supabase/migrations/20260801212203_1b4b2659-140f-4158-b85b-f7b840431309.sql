-- 1. Lock down SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.handle_new_identity_user() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_identity_email_confirmed() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.platform_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, uuid, public.platform_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_org_member(uuid, uuid) FROM anon;

-- Trigger-only helper functions (not SECURITY DEFINER but never meant to be called via API)
REVOKE EXECUTE ON FUNCTION public.audit_events_allow_archive_only() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.reject_audit_mutation() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.platform_touch_row() FROM anon, authenticated;

-- 2. Storage RLS for report buckets
DROP POLICY IF EXISTS "platform reports readable by org members" ON storage.objects;
CREATE POLICY "platform reports readable by org members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'platform-reports'
  AND EXISTS (
    SELECT 1 FROM public.platform_reports pr
    WHERE pr.storage_path = storage.objects.name
      AND public.is_org_member(auth.uid(), pr.organisation_id)
  )
);

DROP POLICY IF EXISTS "service role manages platform reports" ON storage.objects;
CREATE POLICY "service role manages platform reports"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'platform-reports')
WITH CHECK (bucket_id = 'platform-reports');

DROP POLICY IF EXISTS "service role manages assessment reports" ON storage.objects;
CREATE POLICY "service role manages assessment reports"
ON storage.objects FOR ALL TO service_role
USING (bucket_id = 'assessment-reports')
WITH CHECK (bucket_id = 'assessment-reports');