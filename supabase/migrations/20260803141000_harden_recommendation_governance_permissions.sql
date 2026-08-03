REVOKE ALL ON public.recommendation_feature_flag_events,
  public.recommendation_audit_export_jobs, public.recommendation_integrity_results,
  public.recommendation_operational_events FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_feature_flag_events,
  public.recommendation_audit_export_jobs, public.recommendation_integrity_results,
  public.recommendation_operational_events FROM authenticated;
REVOKE ALL ON SEQUENCE public.recommendation_operational_events_id_seq
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_audit_export_transition(),
  public.resolve_recommendation_feature_flag(text),
  public.set_recommendation_feature_flag(jsonb),
  public.request_recommendation_audit_export(jsonb),
  public.claim_recommendation_audit_exports(integer),
  public.complete_recommendation_audit_export(uuid,text,jsonb,text),
  public.fail_recommendation_audit_export(uuid,text,text),
  public.retry_recommendation_audit_export(uuid,uuid,uuid),
  public.record_recommendation_export_access(uuid,uuid,uuid,uuid,text),
  public.recommendation_operational_health()
  FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.recommendation_feature_flag_events,
  public.recommendation_audit_export_jobs, public.recommendation_integrity_results,
  public.recommendation_operational_events FROM service_role;
GRANT SELECT ON public.recommendation_feature_flag_events,
  public.recommendation_audit_export_jobs, public.recommendation_integrity_results,
  public.recommendation_operational_events TO service_role;
GRANT EXECUTE ON FUNCTION public.resolve_recommendation_feature_flag(text),
  public.set_recommendation_feature_flag(jsonb),
  public.request_recommendation_audit_export(jsonb),
  public.claim_recommendation_audit_exports(integer),
  public.complete_recommendation_audit_export(uuid,text,jsonb,text),
  public.fail_recommendation_audit_export(uuid,text,text),
  public.retry_recommendation_audit_export(uuid,uuid,uuid),
  public.record_recommendation_export_access(uuid,uuid,uuid,uuid,text),
  public.recommendation_operational_health()
  TO service_role;
