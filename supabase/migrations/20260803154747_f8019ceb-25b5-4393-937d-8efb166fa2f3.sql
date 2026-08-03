REVOKE UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLE
  public.recommendation_action_outcomes,
  public.recommendation_outcome_measure_versions,
  public.recommendation_outcome_observations,
  public.recommendation_outcome_status_events FROM service_role;

REVOKE EXECUTE ON FUNCTION public.capture_recommendation_action_outcome() FROM service_role;
REVOKE EXECUTE ON FUNCTION public.is_active_recommendation_outcome_member(uuid,uuid,uuid) FROM service_role;