REVOKE ALL ON public.recommendation_catalogue_versions, public.recommendation_definitions,
  public.recommendation_stable_identities,
  public.recommendation_dependency_mappings, public.recommendation_conflict_mappings,
  public.recommendation_catalogue_approvals, public.recommendation_catalogue_lifecycle_events,
  public.recommendation_catalogue_activations FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_catalogue_versions, public.recommendation_definitions,
  public.recommendation_stable_identities,
  public.recommendation_dependency_mappings, public.recommendation_conflict_mappings,
  public.recommendation_catalogue_approvals, public.recommendation_catalogue_lifecycle_events,
  public.recommendation_catalogue_activations FROM authenticated;
REVOKE ALL ON SEQUENCE public.recommendation_catalogue_lifecycle_events_id_seq FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.create_recommendation_catalogue_version(jsonb),
  public.transition_recommendation_catalogue(uuid, text, uuid, text),
  public.enforce_recommendation_catalogue_version_mutation() FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_catalogue_versions, public.recommendation_definitions,
  public.recommendation_stable_identities,
  public.recommendation_dependency_mappings, public.recommendation_conflict_mappings,
  public.recommendation_catalogue_approvals, public.recommendation_catalogue_lifecycle_events,
  public.recommendation_catalogue_activations TO service_role;
GRANT EXECUTE ON FUNCTION public.create_recommendation_catalogue_version(jsonb),
  public.transition_recommendation_catalogue(uuid, text, uuid, text) TO service_role;
