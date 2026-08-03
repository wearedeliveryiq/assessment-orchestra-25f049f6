CREATE TYPE public.recommendation_sequence_horizon AS ENUM ('day30', 'day60', 'day90');
CREATE TYPE public.recommendation_sequence_state AS ENUM (
  'scheduled', 'blocked_dependency', 'capacity_exceeded'
);
CREATE TYPE public.recommendation_dependency_resolution AS ENUM (
  'direct', 'superseded', 'deduplicated', 'unavailable'
);
CREATE TYPE public.recommendation_dependency_state AS ENUM (
  'available', 'blocked', 'unavailable'
);

CREATE TABLE public.recommendation_sequence_models (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  priority_model_id uuid NOT NULL REFERENCES public.recommendation_priority_models(id) ON DELETE RESTRICT,
  conflict_resolution_id uuid NOT NULL REFERENCES public.recommendation_conflict_resolutions(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  configuration_set_id text NOT NULL,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  catalogue_id text NOT NULL,
  catalogue_version text NOT NULL CHECK (catalogue_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_digest text NOT NULL CHECK (catalogue_digest ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  engine_version text NOT NULL,
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text NOT NULL CHECK (output_hash ~ '^[0-9a-f]{64}$'),
  canonical_input jsonb NOT NULL,
  canonical_sequence jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (priority_model_id, policy_version),
  CONSTRAINT recommendation_sequence_model_scope CHECK (
    canonical_input ->> 'analysisRunId' = analysis_run_id::text
    AND canonical_input ->> 'priorityModelId' = priority_model_id::text
    AND canonical_input ->> 'conflictResolutionId' = conflict_resolution_id::text
    AND canonical_input ->> 'organisationId' = organisation_id::text
    AND canonical_input ->> 'workspaceId' = workspace_id::text
    AND canonical_input ->> 'configurationSetId' = configuration_set_id
    AND canonical_input ->> 'catalogueVersionId' = catalogue_version_id::text
    AND canonical_input ->> 'catalogueId' = catalogue_id
    AND canonical_input ->> 'catalogueVersion' = catalogue_version
    AND canonical_input ->> 'catalogueDigest' = catalogue_digest
    AND canonical_input ->> 'policyVersion' = policy_version
  ),
  CONSTRAINT recommendation_sequence_model_output CHECK (
    canonical_sequence ->> 'schemaVersion' = 'deliveryiq.recommendation-sequencing/1.0.0'
    AND canonical_sequence ->> 'policyVersion' = policy_version
    AND canonical_sequence ->> 'engineVersion' = engine_version
    AND jsonb_typeof(canonical_sequence -> 'capacity') = 'object'
    AND jsonb_typeof(canonical_sequence -> 'items') = 'array'
    AND jsonb_typeof(canonical_sequence -> 'dependencies') = 'array'
  )
);

CREATE TABLE public.recommendation_sequence_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_model_id uuid NOT NULL REFERENCES public.recommendation_sequence_models(id) ON DELETE RESTRICT,
  priority_item_id uuid NOT NULL REFERENCES public.recommendation_priority_items(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_order integer NOT NULL CHECK (catalogue_order > 0),
  generated_rank integer NOT NULL CHECK (generated_rank > 0),
  generated_sequence integer CHECK (generated_sequence IS NULL OR generated_sequence > 0),
  generated_horizon public.recommendation_sequence_horizon,
  effort text NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
  sequence_state public.recommendation_sequence_state NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN (
    'dependency_precedence', 'dependency_satisfied', 'rank_and_horizon_fit',
    'blocked_dependency', 'capacity_exceeded'
  )),
  blocking_dependency_ids jsonb NOT NULL CHECK (jsonb_typeof(blocking_dependency_ids) = 'array'),
  caveats jsonb NOT NULL CHECK (jsonb_typeof(caveats) = 'array'),
  source_trace_node_ids jsonb NOT NULL CHECK (jsonb_typeof(source_trace_node_ids) = 'array'),
  semantic_hash text NOT NULL CHECK (semantic_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_model_id, priority_item_id),
  UNIQUE (sequence_model_id, recommendation_id),
  UNIQUE (sequence_model_id, generated_sequence),
  CONSTRAINT recommendation_sequence_item_terminal CHECK (
    (
      sequence_state = 'scheduled'
      AND generated_sequence IS NOT NULL
      AND generated_horizon IS NOT NULL
      AND reason_code IN ('dependency_precedence', 'dependency_satisfied', 'rank_and_horizon_fit')
      AND jsonb_array_length(blocking_dependency_ids) = 0
    )
    OR (
      sequence_state = 'blocked_dependency'
      AND generated_sequence IS NULL
      AND generated_horizon IS NULL
      AND reason_code = 'blocked_dependency'
      AND jsonb_array_length(blocking_dependency_ids) > 0
    )
    OR (
      sequence_state = 'capacity_exceeded'
      AND generated_sequence IS NULL
      AND generated_horizon IS NULL
      AND reason_code = 'capacity_exceeded'
      AND jsonb_array_length(blocking_dependency_ids) = 0
    )
  )
);

CREATE TABLE public.recommendation_sequence_dependencies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_model_id uuid NOT NULL REFERENCES public.recommendation_sequence_models(id) ON DELETE RESTRICT,
  dependant_sequence_item_id uuid NOT NULL REFERENCES public.recommendation_sequence_items(id) ON DELETE RESTRICT,
  resolved_sequence_item_id uuid REFERENCES public.recommendation_sequence_items(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  dependant_recommendation_id text NOT NULL,
  source_dependency_id text NOT NULL,
  resolved_dependency_id text,
  dependency_type text NOT NULL CHECK (dependency_type IN ('required', 'recommended')),
  resolution public.recommendation_dependency_resolution NOT NULL,
  dependency_state public.recommendation_dependency_state NOT NULL,
  reason_code text NOT NULL CHECK (reason_code IN (
    'dependency_available', 'dependency_superseded', 'dependency_deduplicated',
    'dependency_unavailable', 'dependency_blocked'
  )),
  semantic_hash text NOT NULL CHECK (semantic_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_model_id, dependant_recommendation_id, source_dependency_id),
  CONSTRAINT recommendation_sequence_dependency_resolution CHECK (
    (
      resolution = 'unavailable'
      AND resolved_dependency_id IS NULL
      AND resolved_sequence_item_id IS NULL
      AND dependency_state = 'unavailable'
      AND reason_code = 'dependency_unavailable'
    )
    OR (
      resolution <> 'unavailable'
      AND resolved_dependency_id IS NOT NULL
      AND resolved_sequence_item_id IS NOT NULL
      AND dependency_state IN ('available', 'blocked')
      AND reason_code = CASE
        WHEN dependency_state = 'blocked' THEN 'dependency_blocked'
        WHEN resolution = 'superseded' THEN 'dependency_superseded'
        WHEN resolution = 'deduplicated' THEN 'dependency_deduplicated'
        ELSE 'dependency_available'
      END
    )
  )
);

CREATE TABLE public.recommendation_sequence_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sequence_model_id uuid NOT NULL REFERENCES public.recommendation_sequence_models(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  version integer NOT NULL CHECK (version > 0),
  previous_override_id uuid REFERENCES public.recommendation_sequence_overrides(id) ON DELETE RESTRICT,
  ordered_recommendation_ids jsonb NOT NULL CHECK (jsonb_typeof(ordered_recommendation_ids) = 'array'),
  reason text NOT NULL CHECK (length(btrim(reason)) BETWEEN 1 AND 1000),
  acknowledged_risk boolean NOT NULL CHECK (acknowledged_risk = true),
  dependency_risks jsonb NOT NULL CHECK (jsonb_typeof(dependency_risks) = 'array'),
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_model_id, version),
  UNIQUE (organisation_id, workspace_id, idempotency_key)
);

CREATE INDEX recommendation_sequence_models_tenant_run_idx
  ON public.recommendation_sequence_models (
    organisation_id, workspace_id, analysis_run_id, created_at DESC
  );
CREATE INDEX recommendation_sequence_items_generated_idx
  ON public.recommendation_sequence_items (sequence_model_id, generated_sequence);
CREATE INDEX recommendation_sequence_dependencies_graph_idx
  ON public.recommendation_sequence_dependencies (
    sequence_model_id, dependant_recommendation_id, resolved_dependency_id
  );
CREATE INDEX recommendation_sequence_overrides_current_idx
  ON public.recommendation_sequence_overrides (
    organisation_id, workspace_id, sequence_model_id, version DESC
  );

CREATE TRIGGER recommendation_sequence_models_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_sequence_models
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_sequence_items_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_sequence_items
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_sequence_dependencies_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_sequence_dependencies
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_sequence_overrides_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_sequence_overrides
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.publish_recommendation_sequence_model(p_input jsonb)
RETURNS public.recommendation_sequence_models
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_run public.assessment_analysis_runs;
  v_priority public.recommendation_priority_models;
  v_resolution public.recommendation_conflict_resolutions;
  v_catalogue public.recommendation_catalogue_versions;
  v_model public.recommendation_sequence_models;
  v_existing public.recommendation_sequence_models;
  v_priority_item public.recommendation_priority_items;
  v_dependant_item public.recommendation_sequence_items;
  v_resolved_item public.recommendation_sequence_items;
  v_item jsonb;
  v_dependency jsonb;
  v_expected_count integer;
  v_expected_dependency_count integer;
  v_actual_count integer;
  v_capacity jsonb;
BEGIN
  IF p_input IS NULL
     OR jsonb_typeof(p_input -> 'items') <> 'array'
     OR jsonb_typeof(p_input -> 'dependencies') <> 'array'
     OR jsonb_typeof(p_input -> 'canonical_input') <> 'object'
     OR jsonb_typeof(p_input -> 'canonical_sequence') <> 'object'
     OR jsonb_array_length(p_input -> 'items') > 250
     OR jsonb_array_length(p_input -> 'dependencies') > 1000
     OR p_input ->> 'input_hash' !~ '^[0-9a-f]{64}$'
     OR p_input ->> 'output_hash' !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_input ->> 'priority_model_id', 0));
  SELECT * INTO v_run FROM public.assessment_analysis_runs
    WHERE id = (p_input ->> 'analysis_run_id')::uuid FOR SHARE;
  SELECT * INTO v_priority FROM public.recommendation_priority_models
    WHERE id = (p_input ->> 'priority_model_id')::uuid FOR SHARE;
  SELECT * INTO v_resolution FROM public.recommendation_conflict_resolutions
    WHERE id = (p_input ->> 'conflict_resolution_id')::uuid FOR SHARE;
  SELECT * INTO v_catalogue FROM public.recommendation_catalogue_versions
    WHERE id = (p_input ->> 'catalogue_version_id')::uuid FOR SHARE;

  IF v_run.id IS NULL OR v_run.status <> 'completed'
     OR v_priority.id IS NULL OR v_priority.analysis_run_id <> v_run.id
     OR v_priority.organisation_id <> v_run.organisation_id
     OR v_priority.workspace_id <> v_run.workspace_id
     OR v_priority.conflict_resolution_id <> v_resolution.id
     OR v_resolution.id IS NULL OR v_resolution.analysis_run_id <> v_run.id
     OR v_resolution.organisation_id <> v_run.organisation_id
     OR v_resolution.workspace_id <> v_run.workspace_id
     OR v_catalogue.id IS NULL OR v_catalogue.id <> v_priority.catalogue_version_id
     OR v_catalogue.content_digest <> v_priority.catalogue_digest
     OR v_catalogue.current_state <> 'active'
     OR v_run.configuration_set_id <> p_input ->> 'configuration_set_id'
     OR v_run.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_run.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_priority.output_hash <> p_input #>> '{canonical_input,priorityModelHash}'
     OR v_priority.id::text <> p_input #>> '{canonical_input,priorityModelId}'
     OR v_resolution.id::text <> p_input #>> '{canonical_input,conflictResolutionId}'
     OR v_catalogue.catalogue_id <> p_input ->> 'catalogue_id'
     OR v_catalogue.version <> p_input ->> 'catalogue_version'
     OR v_catalogue.content_digest <> p_input ->> 'catalogue_digest' THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;

  SELECT * INTO v_existing FROM public.recommendation_sequence_models
    WHERE priority_model_id = v_priority.id
      AND policy_version = p_input ->> 'policy_version';
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.input_hash <> p_input ->> 'input_hash'
       OR v_existing.output_hash <> p_input ->> 'output_hash' THEN
      RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_IDEMPOTENCY_CONFLICT';
    END IF;
    RETURN v_existing;
  END IF;

  v_capacity := v_run.configuration_snapshot #> '{roadmap,capacity}';
  IF v_capacity IS NULL
     OR p_input #> '{canonical_sequence,capacity}' IS DISTINCT FROM v_capacity THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;

  SELECT count(*) INTO v_expected_count FROM public.recommendation_priority_items
    WHERE priority_model_id = v_priority.id;
  SELECT count(*) INTO v_expected_dependency_count
    FROM public.recommendation_dependency_mappings mapping
    JOIN public.recommendation_priority_items item
      ON item.priority_model_id = v_priority.id
     AND item.recommendation_id = mapping.recommendation_id
    WHERE mapping.catalogue_version_id = v_catalogue.id;
  IF jsonb_array_length(p_input -> 'items') <> v_expected_count
     OR jsonb_array_length(p_input -> 'dependencies') <> v_expected_dependency_count
     OR p_input #> '{canonical_sequence,items}' IS DISTINCT FROM p_input -> 'items'
     OR p_input #> '{canonical_sequence,dependencies}' IS DISTINCT FROM p_input -> 'dependencies' THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;

  INSERT INTO public.recommendation_sequence_models (
    analysis_run_id, priority_model_id, conflict_resolution_id,
    organisation_id, workspace_id, configuration_set_id,
    catalogue_version_id, catalogue_id, catalogue_version, catalogue_digest,
    policy_version, engine_version, input_hash, output_hash,
    canonical_input, canonical_sequence
  ) VALUES (
    v_run.id, v_priority.id, v_resolution.id,
    v_run.organisation_id, v_run.workspace_id, v_run.configuration_set_id,
    v_catalogue.id, v_catalogue.catalogue_id, v_catalogue.version, v_catalogue.content_digest,
    p_input ->> 'policy_version', p_input ->> 'engine_version',
    p_input ->> 'input_hash', p_input ->> 'output_hash',
    p_input -> 'canonical_input', p_input -> 'canonical_sequence'
  ) RETURNING * INTO v_model;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_input -> 'items') LOOP
    SELECT * INTO v_priority_item FROM public.recommendation_priority_items
      WHERE id = (v_item ->> 'priorityItemId')::uuid
        AND priority_model_id = v_priority.id;
    IF v_priority_item.id IS NULL
       OR v_priority_item.recommendation_id <> v_item ->> 'recommendationId'
       OR v_priority_item.recommendation_version <> v_item ->> 'recommendationVersion'
       OR v_priority_item.catalogue_order <> (v_item ->> 'catalogueOrder')::integer
       OR v_priority_item.generated_rank <> (v_item ->> 'generatedRank')::integer
       OR v_priority_item.effort <> v_item ->> 'effort'
       OR v_priority_item.source_trace_node_ids IS DISTINCT FROM v_item -> 'sourceTraceNodeIds'
       OR v_item ->> 'semanticHash' !~ '^[0-9a-f]{64}$'
       OR jsonb_typeof(v_item -> 'blockingDependencyIds') <> 'array'
       OR jsonb_typeof(v_item -> 'caveats') <> 'array' THEN
      RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
    END IF;
    INSERT INTO public.recommendation_sequence_items (
      sequence_model_id, priority_item_id, analysis_run_id, organisation_id, workspace_id,
      recommendation_id, recommendation_version, catalogue_order, generated_rank,
      generated_sequence, generated_horizon, effort, sequence_state, reason_code,
      blocking_dependency_ids, caveats, source_trace_node_ids, semantic_hash
    ) VALUES (
      v_model.id, v_priority_item.id, v_run.id, v_run.organisation_id, v_run.workspace_id,
      v_item ->> 'recommendationId', v_item ->> 'recommendationVersion',
      (v_item ->> 'catalogueOrder')::integer, (v_item ->> 'generatedRank')::integer,
      NULLIF(v_item ->> 'generatedSequence', '')::integer,
      NULLIF(v_item ->> 'generatedHorizon', '')::public.recommendation_sequence_horizon,
      v_item ->> 'effort', (v_item ->> 'sequenceState')::public.recommendation_sequence_state,
      v_item ->> 'reasonCode', v_item -> 'blockingDependencyIds', v_item -> 'caveats',
      v_item -> 'sourceTraceNodeIds', v_item ->> 'semanticHash'
    );
  END LOOP;

  IF EXISTS (
    SELECT 1 FROM public.recommendation_sequence_items
    WHERE sequence_model_id = v_model.id AND sequence_state = 'scheduled'
    GROUP BY sequence_model_id
    HAVING min(generated_sequence) <> 1
       OR max(generated_sequence) <> count(*)
       OR count(DISTINCT generated_sequence) <> count(*)
  ) OR (SELECT count(*) FROM public.recommendation_sequence_items
        WHERE sequence_model_id = v_model.id AND generated_horizon = 'day30')
       > (v_capacity ->> 'day30')::integer
     OR (SELECT count(*) FROM public.recommendation_sequence_items
        WHERE sequence_model_id = v_model.id AND generated_horizon = 'day60')
       > (v_capacity ->> 'day60')::integer
     OR (SELECT count(*) FROM public.recommendation_sequence_items
        WHERE sequence_model_id = v_model.id AND generated_horizon = 'day90')
       > (v_capacity ->> 'day90')::integer THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;

  FOR v_dependency IN SELECT value FROM jsonb_array_elements(p_input -> 'dependencies') LOOP
    SELECT * INTO v_dependant_item FROM public.recommendation_sequence_items
      WHERE sequence_model_id = v_model.id
        AND recommendation_id = v_dependency ->> 'dependantRecommendationId';
    SELECT * INTO v_resolved_item FROM public.recommendation_sequence_items
      WHERE sequence_model_id = v_model.id
        AND recommendation_id = v_dependency ->> 'resolvedDependencyId';
    IF v_dependant_item.id IS NULL
       OR v_dependency ->> 'semanticHash' !~ '^[0-9a-f]{64}$'
       OR NOT EXISTS (
         SELECT 1 FROM public.recommendation_dependency_mappings mapping
         WHERE mapping.catalogue_version_id = v_catalogue.id
           AND mapping.recommendation_id = v_dependency ->> 'dependantRecommendationId'
           AND mapping.dependency_id = v_dependency ->> 'sourceDependencyId'
           AND mapping.dependency_type = v_dependency ->> 'dependencyType'
       ) THEN
      RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
    END IF;
    IF v_dependency ->> 'resolution' = 'direct' AND (
         v_dependency ->> 'resolvedDependencyId' <> v_dependency ->> 'sourceDependencyId'
         OR v_resolved_item.id IS NULL
       ) THEN
      RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
    ELSIF v_dependency ->> 'resolution' IN ('superseded', 'deduplicated') AND NOT EXISTS (
      SELECT 1 FROM public.recommendation_resolution_candidates candidate
      WHERE candidate.resolution_id = v_resolution.id
        AND candidate.recommendation_id = v_dependency ->> 'sourceDependencyId'
        AND candidate.resolution_result = 'suppressed'
        AND candidate.reason_code::text = v_dependency ->> 'resolution'
        AND candidate.winner_recommendation_id = v_dependency ->> 'resolvedDependencyId'
        AND v_resolved_item.id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
    ELSIF v_dependency ->> 'resolution' = 'unavailable' AND (
      v_dependency ->> 'resolvedDependencyId' IS NOT NULL OR v_resolved_item.id IS NOT NULL
    ) THEN
      RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
    END IF;
    IF v_dependency ->> 'state' = 'available' AND (
         v_resolved_item.id IS NULL OR v_resolved_item.sequence_state <> 'scheduled'
       ) OR v_dependency ->> 'state' = 'blocked' AND (
         v_resolved_item.id IS NULL OR v_resolved_item.sequence_state = 'scheduled'
       ) OR v_dependency ->> 'state' = 'unavailable' AND v_resolved_item.id IS NOT NULL THEN
      RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
    END IF;
    INSERT INTO public.recommendation_sequence_dependencies (
      sequence_model_id, dependant_sequence_item_id, resolved_sequence_item_id,
      organisation_id, workspace_id, dependant_recommendation_id,
      source_dependency_id, resolved_dependency_id, dependency_type,
      resolution, dependency_state, reason_code, semantic_hash
    ) VALUES (
      v_model.id, v_dependant_item.id, v_resolved_item.id,
      v_run.organisation_id, v_run.workspace_id, v_dependency ->> 'dependantRecommendationId',
      v_dependency ->> 'sourceDependencyId', v_dependency ->> 'resolvedDependencyId',
      v_dependency ->> 'dependencyType',
      (v_dependency ->> 'resolution')::public.recommendation_dependency_resolution,
      (v_dependency ->> 'state')::public.recommendation_dependency_state,
      v_dependency ->> 'reasonCode', v_dependency ->> 'semanticHash'
    );
  END LOOP;

  SELECT count(*) INTO v_actual_count FROM public.recommendation_sequence_dependencies
    WHERE sequence_model_id = v_model.id;
  IF v_actual_count <> v_expected_dependency_count OR EXISTS (
    SELECT 1
    FROM public.recommendation_sequence_dependencies dependency
    JOIN public.recommendation_sequence_items dependant
      ON dependant.id = dependency.dependant_sequence_item_id
    JOIN public.recommendation_sequence_items required_item
      ON required_item.id = dependency.resolved_sequence_item_id
    WHERE dependency.sequence_model_id = v_model.id
      AND dependency.dependency_state = 'available'
      AND dependant.sequence_state = 'scheduled'
      AND required_item.generated_sequence >= dependant.generated_sequence
  ) OR EXISTS (
    SELECT 1
    FROM public.recommendation_sequence_dependencies dependency
    JOIN public.recommendation_sequence_items dependant
      ON dependant.id = dependency.dependant_sequence_item_id
    WHERE dependency.sequence_model_id = v_model.id
      AND dependency.dependency_type = 'required'
      AND dependency.dependency_state <> 'available'
      AND dependant.sequence_state <> 'blocked_dependency'
  ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;
  RETURN v_model;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_recommendation_sequence_override(p_input jsonb)
RETURNS public.recommendation_sequence_overrides
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_model public.recommendation_sequence_models;
  v_previous public.recommendation_sequence_overrides;
  v_existing public.recommendation_sequence_overrides;
  v_override public.recommendation_sequence_overrides;
  v_expected_count integer;
  v_supplied_count integer;
  v_risks jsonb;
BEGIN
  IF p_input IS NULL
     OR jsonb_typeof(p_input -> 'ordered_recommendation_ids') <> 'array'
     OR jsonb_typeof(p_input -> 'dependency_risks') <> 'array'
     OR length(p_input ->> 'idempotency_key') NOT BETWEEN 16 AND 160
     OR length(btrim(p_input ->> 'reason')) NOT BETWEEN 1 AND 1000
     OR (p_input ->> 'acknowledged_risk')::boolean IS DISTINCT FROM true
     OR (p_input ->> 'expected_version')::integer < 0 THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_input ->> 'sequence_model_id', 0));
  SELECT * INTO v_model FROM public.recommendation_sequence_models
    WHERE id = (p_input ->> 'sequence_model_id')::uuid FOR SHARE;
  IF v_model.id IS NULL
     OR v_model.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_model.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR NOT EXISTS (
       SELECT 1 FROM public.organisation_memberships membership
       JOIN public.workspaces workspace ON workspace.id = v_model.workspace_id
       WHERE membership.user_id = (p_input ->> 'actor_user_id')::uuid
         AND membership.organisation_id = v_model.organisation_id
         AND membership.status = 'active' AND membership.is_deleted = false
         AND workspace.organisation_id = v_model.organisation_id
         AND workspace.is_deleted = false
     ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_ACCESS_DENIED';
  END IF;
  SELECT * INTO v_existing FROM public.recommendation_sequence_overrides
    WHERE organisation_id = v_model.organisation_id
      AND workspace_id = v_model.workspace_id
      AND idempotency_key = p_input ->> 'idempotency_key';
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.sequence_model_id <> v_model.id
       OR v_existing.actor_user_id <> (p_input ->> 'actor_user_id')::uuid
       OR v_existing.ordered_recommendation_ids IS DISTINCT FROM p_input -> 'ordered_recommendation_ids'
       OR v_existing.reason <> btrim(p_input ->> 'reason')
       OR v_existing.dependency_risks IS DISTINCT FROM p_input -> 'dependency_risks' THEN
      RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
    END IF;
    RETURN v_existing;
  END IF;
  SELECT * INTO v_previous FROM public.recommendation_sequence_overrides
    WHERE sequence_model_id = v_model.id ORDER BY version DESC LIMIT 1 FOR UPDATE;
  IF coalesce(v_previous.version, 0) <> (p_input ->> 'expected_version')::integer THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_VERSION_CONFLICT';
  END IF;
  SELECT count(*) INTO v_expected_count FROM public.recommendation_sequence_items
    WHERE sequence_model_id = v_model.id AND sequence_state = 'scheduled';
  SELECT count(DISTINCT value) INTO v_supplied_count
    FROM jsonb_array_elements_text(p_input -> 'ordered_recommendation_ids');
  IF jsonb_array_length(p_input -> 'ordered_recommendation_ids') <> v_expected_count
     OR v_supplied_count <> v_expected_count
     OR EXISTS (
       SELECT 1 FROM jsonb_array_elements_text(p_input -> 'ordered_recommendation_ids') supplied(id)
       WHERE NOT EXISTS (
         SELECT 1 FROM public.recommendation_sequence_items item
         WHERE item.sequence_model_id = v_model.id
           AND item.sequence_state = 'scheduled'
           AND item.recommendation_id = supplied.id
       )
     ) THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;
  SELECT coalesce(jsonb_agg(jsonb_build_object(
      'dependantRecommendationId', risk.dependant_recommendation_id,
      'dependencyRecommendationId', risk.resolved_dependency_id,
      'dependencyType', risk.dependency_type
    ) ORDER BY risk.dependant_recommendation_id, risk.resolved_dependency_id), '[]'::jsonb)
    INTO v_risks
    FROM public.recommendation_sequence_dependencies risk
    JOIN jsonb_array_elements_text(p_input -> 'ordered_recommendation_ids')
      WITH ORDINALITY dependant_position(id, position)
      ON dependant_position.id = risk.dependant_recommendation_id
    JOIN jsonb_array_elements_text(p_input -> 'ordered_recommendation_ids')
      WITH ORDINALITY dependency_position(id, position)
      ON dependency_position.id = risk.resolved_dependency_id
    WHERE risk.sequence_model_id = v_model.id
      AND dependency_position.position > dependant_position.position;
  IF v_risks IS DISTINCT FROM p_input -> 'dependency_risks' THEN
    RAISE EXCEPTION 'RECOMMENDATION_SEQUENCE_INVALID';
  END IF;
  INSERT INTO public.recommendation_sequence_overrides (
    sequence_model_id, organisation_id, workspace_id, version, previous_override_id,
    ordered_recommendation_ids, reason, acknowledged_risk, dependency_risks,
    actor_user_id, idempotency_key
  ) VALUES (
    v_model.id, v_model.organisation_id, v_model.workspace_id,
    coalesce(v_previous.version, 0) + 1, v_previous.id,
    p_input -> 'ordered_recommendation_ids', btrim(p_input ->> 'reason'), true,
    v_risks, (p_input ->> 'actor_user_id')::uuid, p_input ->> 'idempotency_key'
  ) RETURNING * INTO v_override;
  RETURN v_override;
END;
$$;

ALTER TABLE public.recommendation_sequence_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_sequence_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_sequence_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_sequence_overrides ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_sequence_models,
  public.recommendation_sequence_items,
  public.recommendation_sequence_dependencies,
  public.recommendation_sequence_overrides FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_sequence_model(jsonb)
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.set_recommendation_sequence_override(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_sequence_models,
  public.recommendation_sequence_items,
  public.recommendation_sequence_dependencies,
  public.recommendation_sequence_overrides TO service_role;
GRANT INSERT ON public.recommendation_sequence_overrides TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_sequence_model(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.set_recommendation_sequence_override(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_sequence_models IS
  'Immutable S4-006 dependency and generated sequence baseline.';
COMMENT ON TABLE public.recommendation_sequence_overrides IS
  'Append-only authorised customer sequence overlay with explicit risk acknowledgement.';
