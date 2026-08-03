REVOKE ALL PRIVILEGES ON TABLE public.recommendation_action_outcomes,
  public.recommendation_outcome_measure_versions,
  public.recommendation_outcome_observations,
  public.recommendation_outcome_status_events FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON TABLE public.recommendation_action_outcomes,
  public.recommendation_outcome_measure_versions,
  public.recommendation_outcome_observations,
  public.recommendation_outcome_status_events FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_recommendation_action_outcome(jsonb),
  public.create_recommendation_outcome_measure_version(jsonb),
  public.record_recommendation_outcome_observation(jsonb),
  public.append_recommendation_outcome_status_event(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.capture_recommendation_action_outcome()
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.is_active_recommendation_outcome_member(uuid,uuid,uuid)
  FROM PUBLIC, anon, authenticated;

GRANT SELECT, INSERT ON TABLE public.recommendation_action_outcomes,
  public.recommendation_outcome_measure_versions,
  public.recommendation_outcome_observations,
  public.recommendation_outcome_status_events TO service_role;
GRANT EXECUTE ON FUNCTION public.create_recommendation_action_outcome(jsonb),
  public.create_recommendation_outcome_measure_version(jsonb),
  public.record_recommendation_outcome_observation(jsonb),
  public.append_recommendation_outcome_status_event(jsonb) TO service_role;
