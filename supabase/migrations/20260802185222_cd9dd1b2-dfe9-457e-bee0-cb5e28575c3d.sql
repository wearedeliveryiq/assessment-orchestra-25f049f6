CREATE TYPE public.recommendation_catalogue_state AS ENUM (
  'draft', 'in_review', 'approved', 'active', 'retired', 'superseded'
);

CREATE TABLE public.recommendation_catalogue_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_id text NOT NULL,
  version text NOT NULL CHECK (version ~ '^\d+\.\d+\.\d+$'),
  source_configuration_set_id text NOT NULL,
  content_digest text NOT NULL CHECK (content_digest ~ '^[0-9a-f]{64}$'),
  snapshot jsonb NOT NULL,
  current_state public.recommendation_catalogue_state NOT NULL DEFAULT 'draft',
  authored_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogue_id, version),
  UNIQUE (idempotency_key),
  CONSTRAINT recommendation_catalogue_snapshot_identity CHECK (
    snapshot #>> '{catalogueId}' = catalogue_id
    AND snapshot #>> '{version}' = version
    AND snapshot #>> '{sourceConfigurationSetId}' = source_configuration_set_id
    AND jsonb_typeof(snapshot -> 'definitions') = 'array'
  )
);

CREATE TABLE public.recommendation_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_order integer NOT NULL CHECK (catalogue_order > 0),
  intent_digest text NOT NULL CHECK (intent_digest ~ '^[0-9a-f]{64}$'),
  definition jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogue_version_id, recommendation_id),
  UNIQUE (catalogue_version_id, catalogue_order)
);

CREATE TABLE public.recommendation_stable_identities (
  recommendation_id text PRIMARY KEY,
  intent_digest text NOT NULL CHECK (intent_digest ~ '^[0-9a-f]{64}$'),
  first_catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.recommendation_dependency_mappings (
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  dependency_id text NOT NULL,
  dependency_type text NOT NULL DEFAULT 'required' CHECK (dependency_type IN ('required', 'recommended')),
  PRIMARY KEY (catalogue_version_id, recommendation_id, dependency_id),
  CHECK (recommendation_id <> dependency_id)
);

CREATE TABLE public.recommendation_conflict_mappings (
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  conflicting_recommendation_id text NOT NULL,
  PRIMARY KEY (catalogue_version_id, recommendation_id, conflicting_recommendation_id),
  CHECK (recommendation_id <> conflicting_recommendation_id)
);

CREATE TABLE public.recommendation_catalogue_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  approved_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  approved_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogue_version_id, approved_by)
);

CREATE TABLE public.recommendation_catalogue_lifecycle_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  event_type text NOT NULL,
  from_state public.recommendation_catalogue_state,
  to_state public.recommendation_catalogue_state NOT NULL,
  actor_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 1 AND 160),
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (catalogue_version_id, idempotency_key)
);

CREATE TABLE public.recommendation_catalogue_activations (
  environment text NOT NULL CHECK (environment IN ('production', 'staging', 'development', 'test')),
  recommendation_id text NOT NULL,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  recommendation_definition_id uuid NOT NULL REFERENCES public.recommendation_definitions(id) ON DELETE RESTRICT,
  activated_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  activated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (environment, recommendation_id)
);

CREATE INDEX recommendation_definitions_stable_id_idx
  ON public.recommendation_definitions (recommendation_id, recommendation_version);
CREATE INDEX recommendation_catalogue_events_version_idx
  ON public.recommendation_catalogue_lifecycle_events (catalogue_version_id, created_at);
CREATE INDEX recommendation_catalogue_activations_version_idx
  ON public.recommendation_catalogue_activations (catalogue_version_id, environment);

CREATE OR REPLACE FUNCTION public.enforce_recommendation_catalogue_version_mutation()
RETURNS trigger LANGUAGE plpgsql SET search_path = public, pg_temp AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'AUDIT_RECORD_IMMUTABLE'; END IF;
  IF NEW.catalogue_id IS DISTINCT FROM OLD.catalogue_id
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.source_configuration_set_id IS DISTINCT FROM OLD.source_configuration_set_id
     OR NEW.content_digest IS DISTINCT FROM OLD.content_digest
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.authored_by IS DISTINCT FROM OLD.authored_by
     OR NEW.idempotency_key IS DISTINCT FROM OLD.idempotency_key
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'CATALOGUE_VERSION_IMMUTABLE';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_catalogue_version_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_catalogue_versions
FOR EACH ROW EXECUTE FUNCTION public.enforce_recommendation_catalogue_version_mutation();
CREATE TRIGGER recommendation_definitions_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_definitions
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_stable_identities_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_stable_identities
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_dependencies_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_dependency_mappings
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_conflicts_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_conflict_mappings
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_approvals_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_catalogue_approvals
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_catalogue_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_catalogue_lifecycle_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE OR REPLACE FUNCTION public.create_recommendation_catalogue_version(p_input jsonb)
RETURNS public.recommendation_catalogue_versions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE v_version public.recommendation_catalogue_versions; v_definition jsonb;
BEGIN
  INSERT INTO public.recommendation_catalogue_versions (
    catalogue_id, version, source_configuration_set_id, content_digest,
    snapshot, authored_by, idempotency_key
  ) VALUES (
    p_input ->> 'catalogue_id', p_input ->> 'version',
    p_input ->> 'source_configuration_set_id', p_input ->> 'content_digest',
    p_input -> 'snapshot', (p_input ->> 'authored_by')::uuid, p_input ->> 'idempotency_key'
  ) RETURNING * INTO v_version;

  FOR v_definition IN SELECT value FROM jsonb_array_elements(p_input #> '{snapshot,definitions}') LOOP
    INSERT INTO public.recommendation_stable_identities (
      recommendation_id, intent_digest, first_catalogue_version_id
    ) VALUES (
      v_definition ->> 'id',
      p_input #>> ARRAY['definition_intent_digests', v_definition ->> 'id'],
      v_version.id
    ) ON CONFLICT (recommendation_id) DO NOTHING;
    IF NOT EXISTS (
      SELECT 1 FROM public.recommendation_stable_identities identity
      WHERE identity.recommendation_id = v_definition ->> 'id'
        AND identity.intent_digest = p_input #>> ARRAY['definition_intent_digests', v_definition ->> 'id']
    ) THEN RAISE EXCEPTION 'CATALOGUE_STABLE_ID_REUSED'; END IF;
    INSERT INTO public.recommendation_definitions (
      catalogue_version_id, recommendation_id, recommendation_version,
      catalogue_order, intent_digest, definition
    ) VALUES (
      v_version.id, v_definition ->> 'id', v_definition ->> 'version',
      (v_definition ->> 'order')::integer,
      p_input #>> ARRAY['definition_intent_digests', v_definition ->> 'id'], v_definition
    );
    INSERT INTO public.recommendation_dependency_mappings (
      catalogue_version_id, recommendation_id, dependency_id
    ) SELECT v_version.id, v_definition ->> 'id', value #>> '{}'
      FROM jsonb_array_elements(v_definition -> 'dependencies');
    INSERT INTO public.recommendation_conflict_mappings (
      catalogue_version_id, recommendation_id, conflicting_recommendation_id
    ) SELECT v_version.id, v_definition ->> 'id', value #>> '{}'
      FROM jsonb_array_elements(v_definition -> 'conflicts');
  END LOOP;
  INSERT INTO public.recommendation_catalogue_lifecycle_events (
    catalogue_version_id, event_type, to_state, actor_id, idempotency_key
  ) VALUES (v_version.id, 'catalogue.created', 'draft', v_version.authored_by, v_version.idempotency_key);
  RETURN v_version;
END;
$$;

CREATE OR REPLACE FUNCTION public.transition_recommendation_catalogue(
  p_catalogue_version_id uuid, p_command text, p_actor_id uuid, p_idempotency_key text
)
RETURNS public.recommendation_catalogue_versions
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_version public.recommendation_catalogue_versions;
  v_target public.recommendation_catalogue_state;
  v_existing public.recommendation_catalogue_lifecycle_events;
  v_catalogue_id text;
BEGIN
  SELECT catalogue_id INTO v_catalogue_id FROM public.recommendation_catalogue_versions
    WHERE id = p_catalogue_version_id;
  IF v_catalogue_id IS NULL THEN RAISE EXCEPTION 'CATALOGUE_NOT_FOUND'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(v_catalogue_id, 0));
  SELECT * INTO v_version FROM public.recommendation_catalogue_versions
    WHERE id = p_catalogue_version_id FOR UPDATE;
  SELECT * INTO v_existing FROM public.recommendation_catalogue_lifecycle_events
    WHERE catalogue_version_id = p_catalogue_version_id AND idempotency_key = p_idempotency_key;
  IF v_existing.id IS NOT NULL THEN RETURN v_version; END IF;

  v_target := CASE
    WHEN p_command = 'submit' AND v_version.current_state = 'draft' THEN 'in_review'
    WHEN p_command = 'approve' AND v_version.current_state = 'in_review' THEN 'approved'
    WHEN p_command = 'activate' AND v_version.current_state = 'approved' THEN 'active'
    WHEN p_command = 'rollback' AND v_version.current_state IN ('approved', 'retired', 'superseded') THEN 'active'
    WHEN p_command = 'retire' AND v_version.current_state = 'active' THEN 'retired'
    ELSE NULL END;
  IF v_target IS NULL THEN RAISE EXCEPTION 'CATALOGUE_TRANSITION_INVALID'; END IF;
  IF p_command = 'approve' AND p_actor_id = v_version.authored_by THEN
    RAISE EXCEPTION 'CATALOGUE_SELF_APPROVAL_DENIED';
  END IF;

  IF v_target = 'approved' THEN
    INSERT INTO public.recommendation_catalogue_approvals (catalogue_version_id, approved_by)
      VALUES (v_version.id, p_actor_id) ON CONFLICT DO NOTHING;
  END IF;
  IF v_target = 'active' THEN
    INSERT INTO public.recommendation_catalogue_lifecycle_events (
      catalogue_version_id, event_type, from_state, to_state, actor_id, idempotency_key, payload
    ) SELECT id, 'catalogue.superseded', 'active', 'superseded', p_actor_id,
             md5(p_idempotency_key || ':supersede:' || id::text),
             jsonb_build_object('supersededBy', v_version.id)
      FROM public.recommendation_catalogue_versions
      WHERE catalogue_id = v_version.catalogue_id AND current_state = 'active' AND id <> v_version.id;
    UPDATE public.recommendation_catalogue_versions
      SET current_state = 'superseded', updated_at = now()
      WHERE catalogue_id = v_version.catalogue_id AND current_state = 'active' AND id <> v_version.id;
    INSERT INTO public.recommendation_catalogue_activations (
      environment, recommendation_id, catalogue_version_id,
      recommendation_definition_id, activated_by
    ) SELECT 'production', recommendation_id, v_version.id, id, p_actor_id
      FROM public.recommendation_definitions WHERE catalogue_version_id = v_version.id
    ON CONFLICT (environment, recommendation_id) DO UPDATE SET
      catalogue_version_id = EXCLUDED.catalogue_version_id,
      recommendation_definition_id = EXCLUDED.recommendation_definition_id,
      activated_by = EXCLUDED.activated_by, activated_at = now();
  END IF;
  IF v_target = 'retired' THEN
    DELETE FROM public.recommendation_catalogue_activations
      WHERE catalogue_version_id = v_version.id;
  END IF;

  INSERT INTO public.recommendation_catalogue_lifecycle_events (
    catalogue_version_id, event_type, from_state, to_state, actor_id, idempotency_key
  ) VALUES (v_version.id, 'catalogue.' || p_command, v_version.current_state,
            v_target, p_actor_id, p_idempotency_key);
  UPDATE public.recommendation_catalogue_versions SET current_state = v_target, updated_at = now()
    WHERE id = v_version.id RETURNING * INTO v_version;
  RETURN v_version;
END;
$$;

ALTER TABLE public.recommendation_catalogue_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_stable_identities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_dependency_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_conflict_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_catalogue_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_catalogue_lifecycle_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_catalogue_activations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_catalogue_versions, public.recommendation_definitions,
  public.recommendation_stable_identities,
  public.recommendation_dependency_mappings, public.recommendation_conflict_mappings,
  public.recommendation_catalogue_approvals, public.recommendation_catalogue_lifecycle_events,
  public.recommendation_catalogue_activations FROM PUBLIC, anon, authenticated;
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