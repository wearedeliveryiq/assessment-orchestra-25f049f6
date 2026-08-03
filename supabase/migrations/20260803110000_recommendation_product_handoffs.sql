ALTER TABLE public.delivery_product_availability
  ADD COLUMN product_version text,
  ADD CONSTRAINT delivery_product_availability_version CHECK (
    product_version IS NULL OR product_version ~ '^\d+\.\d+\.\d+$'
  );

CREATE TYPE public.delivery_product_handoff_cta AS ENUM (
  'start_assessment', 'view_pack', 'review_activation', 'view_teammate'
);
CREATE TYPE public.delivery_product_handoff_event_type AS ENUM ('consumed');

CREATE TABLE public.recommendation_product_handoffs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_action_id uuid NOT NULL
    REFERENCES public.recommendation_improvement_actions(id) ON DELETE RESTRICT,
  source_portfolio_item_id uuid NOT NULL
    REFERENCES public.recommendation_portfolio_items(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  target_type text NOT NULL CHECK (target_type IN ('knowledge_pack', 'teammate')),
  target_id text NOT NULL CHECK (length(target_id) BETWEEN 1 AND 160),
  target_version text NOT NULL CHECK (target_version ~ '^\d+\.\d+\.\d+$'),
  cta public.delivery_product_handoff_cta NOT NULL,
  consent_basis text NOT NULL CHECK (consent_basis = 'explicit_handoff_request'),
  consented_at timestamptz NOT NULL,
  created_by_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text NOT NULL CHECK (length(idempotency_key) BETWEEN 16 AND 160),
  request_hash text NOT NULL CHECK (request_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organisation_id, workspace_id, idempotency_key),
  CONSTRAINT recommendation_product_handoff_expiry CHECK (
    expires_at >= created_at + interval '1 minute'
    AND expires_at <= created_at + interval '15 minutes'
  ),
  CONSTRAINT recommendation_product_handoff_cta_target CHECK (
    (target_type = 'knowledge_pack' AND cta IN ('start_assessment', 'view_pack'))
    OR (target_type = 'teammate' AND cta IN ('review_activation', 'view_teammate'))
  )
);

CREATE TABLE public.recommendation_product_handoff_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  handoff_id uuid NOT NULL REFERENCES public.recommendation_product_handoffs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  event_type public.delivery_product_handoff_event_type NOT NULL,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (handoff_id, event_type)
);

CREATE TABLE public.organisation_product_activations (
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  product_type text NOT NULL CHECK (product_type IN ('knowledge_pack', 'teammate')),
  product_id text NOT NULL CHECK (length(product_id) BETWEEN 1 AND 160),
  product_version text NOT NULL CHECK (product_version ~ '^\d+\.\d+\.\d+$'),
  status text NOT NULL CHECK (status IN ('active', 'inactive')),
  activated_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, product_type, product_id, product_version),
  CONSTRAINT organisation_product_activation_time CHECK (
    (status = 'active' AND activated_at IS NOT NULL)
    OR (status = 'inactive')
  )
);

CREATE INDEX recommendation_product_handoffs_tenant_action_idx
  ON public.recommendation_product_handoffs (
    organisation_id, workspace_id, source_action_id, created_at DESC
  );
CREATE INDEX recommendation_product_handoffs_expiry_idx
  ON public.recommendation_product_handoffs (expires_at);
CREATE INDEX recommendation_product_handoff_events_tenant_idx
  ON public.recommendation_product_handoff_events (
    organisation_id, workspace_id, handoff_id, occurred_at
  );
CREATE INDEX organisation_product_activations_lookup_idx
  ON public.organisation_product_activations (
    organisation_id, product_type, product_id, status
  );

CREATE TRIGGER recommendation_product_handoffs_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_product_handoffs
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE TRIGGER recommendation_product_handoff_events_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_product_handoff_events
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

CREATE TRIGGER organisation_product_activations_audit
BEFORE UPDATE ON public.organisation_product_activations
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.enforce_recommendation_product_handoff_event_scope()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_handoff public.recommendation_product_handoffs;
BEGIN
  SELECT * INTO v_handoff FROM public.recommendation_product_handoffs
    WHERE id = NEW.handoff_id;
  IF v_handoff.id IS NULL
     OR v_handoff.organisation_id <> NEW.organisation_id
     OR v_handoff.workspace_id <> NEW.workspace_id
     OR v_handoff.created_by_user_id <> NEW.actor_user_id THEN
    RAISE EXCEPTION 'PRODUCT_HANDOFF_ACCESS_DENIED';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER recommendation_product_handoff_event_scope
BEFORE INSERT ON public.recommendation_product_handoff_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_recommendation_product_handoff_event_scope();

CREATE OR REPLACE FUNCTION public.create_recommendation_product_handoff(p_input jsonb)
RETURNS public.recommendation_product_handoffs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_action public.recommendation_improvement_actions;
  v_item public.recommendation_portfolio_items;
  v_decision public.recommendation_item_decisions;
  v_availability public.delivery_product_availability;
  v_entitled boolean := false;
  v_existing public.recommendation_product_handoffs;
  v_created public.recommendation_product_handoffs;
  v_actor uuid;
  v_expires timestamptz;
  v_target_type text;
  v_target_id text;
  v_target_version text;
  v_cta public.delivery_product_handoff_cta;
BEGIN
  IF p_input IS NULL
     OR coalesce(p_input ->> 'token_hash', '') !~ '^[0-9a-f]{64}$'
     OR coalesce(p_input ->> 'request_hash', '') !~ '^[0-9a-f]{64}$'
     OR length(coalesce(p_input ->> 'idempotency_key', '')) NOT BETWEEN 16 AND 160
     OR coalesce(p_input ->> 'target_version', '') !~ '^\d+\.\d+\.\d+$'
     OR p_input ->> 'consent_basis' <> 'explicit_handoff_request' THEN
    RAISE EXCEPTION 'PRODUCT_HANDOFF_INVALID';
  END IF;
  v_actor := (p_input ->> 'actor_user_id')::uuid;
  v_expires := (p_input ->> 'expires_at')::timestamptz;
  v_target_type := p_input ->> 'target_type';
  v_target_id := p_input ->> 'target_id';
  v_target_version := p_input ->> 'target_version';
  v_cta := (p_input ->> 'cta')::public.delivery_product_handoff_cta;
  IF v_target_type NOT IN ('knowledge_pack', 'teammate')
     OR length(coalesce(v_target_id, '')) NOT BETWEEN 1 AND 160
     OR v_expires < now() + interval '1 minute'
     OR v_expires > now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'PRODUCT_HANDOFF_INVALID';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(p_input ->> 'token_hash', 0));
  SELECT * INTO v_existing FROM public.recommendation_product_handoffs
    WHERE organisation_id = (p_input ->> 'organisation_id')::uuid
      AND workspace_id = (p_input ->> 'workspace_id')::uuid
      AND idempotency_key = p_input ->> 'idempotency_key';
  IF v_existing.id IS NOT NULL THEN
    IF v_existing.source_action_id <> (p_input ->> 'source_action_id')::uuid
       OR v_existing.request_hash <> p_input ->> 'request_hash' THEN
      RAISE EXCEPTION 'PRODUCT_HANDOFF_INVALID';
    END IF;
    RETURN v_existing;
  END IF;

  SELECT * INTO v_action FROM public.recommendation_improvement_actions
    WHERE id = (p_input ->> 'source_action_id')::uuid FOR SHARE;
  SELECT * INTO v_item FROM public.recommendation_portfolio_items
    WHERE id = (p_input ->> 'source_portfolio_item_id')::uuid FOR SHARE;
  SELECT * INTO v_decision FROM public.recommendation_item_decisions
    WHERE portfolio_item_id = v_item.id FOR SHARE;
  SELECT * INTO v_availability FROM public.delivery_product_availability
    WHERE product_type = v_target_type AND product_id = v_target_id FOR SHARE;
  SELECT coalesce((
    SELECT entitled FROM public.organisation_product_entitlements
    WHERE organisation_id = v_action.organisation_id
      AND product_type = v_target_type AND product_id = v_target_id
  ), false) INTO v_entitled;

  IF v_action.id IS NULL OR v_item.id IS NULL
     OR v_action.status = 'cancelled'
     OR v_action.portfolio_item_id <> v_item.id
     OR v_action.analysis_run_id <> v_item.analysis_run_id
     OR v_action.recommendation_id <> v_item.recommendation_id
     OR v_action.recommendation_version <> v_item.recommendation_version
     OR v_action.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_action.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_item.organisation_id <> v_action.organisation_id
     OR v_item.workspace_id <> v_action.workspace_id
     OR v_availability.product_id IS NULL
     OR v_availability.status <> 'active'
     OR v_availability.product_version IS DISTINCT FROM v_target_version
     OR NOT EXISTS (
       SELECT 1 FROM public.organisation_memberships membership
       JOIN public.workspace_memberships workspace_membership
         ON workspace_membership.user_id = membership.user_id
        AND workspace_membership.workspace_id = v_action.workspace_id
       JOIN public.workspaces workspace
         ON workspace.id = workspace_membership.workspace_id
        AND workspace.organisation_id = membership.organisation_id
       WHERE membership.user_id = v_actor
         AND membership.organisation_id = v_action.organisation_id
         AND membership.status = 'active' AND membership.is_deleted = false
         AND workspace_membership.status = 'active'
         AND workspace_membership.is_deleted = false
         AND workspace.is_deleted = false
     ) THEN
    RAISE EXCEPTION 'PRODUCT_HANDOFF_NOT_AVAILABLE';
  END IF;
  IF (v_target_type = 'teammate' AND (v_decision.id IS NULL OR v_decision.current_state <> 'accepted'))
     OR (v_target_type = 'knowledge_pack' AND v_entitled AND v_cta <> 'start_assessment')
     OR (v_target_type = 'knowledge_pack' AND NOT v_entitled AND v_cta <> 'view_pack')
     OR (v_target_type = 'teammate' AND v_entitled AND v_cta <> 'review_activation')
     OR (v_target_type = 'teammate' AND NOT v_entitled AND v_cta <> 'view_teammate') THEN
    RAISE EXCEPTION 'PRODUCT_HANDOFF_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.recommendation_product_handoffs (
    source_action_id, source_portfolio_item_id, analysis_run_id,
    recommendation_id, recommendation_version, organisation_id, workspace_id,
    target_type, target_id, target_version, cta, consent_basis, consented_at,
    created_by_user_id, token_hash, idempotency_key, request_hash, expires_at
  ) VALUES (
    v_action.id, v_item.id, v_action.analysis_run_id, v_action.recommendation_id,
    v_action.recommendation_version, v_action.organisation_id, v_action.workspace_id,
    v_target_type, v_target_id, v_target_version, v_cta,
    'explicit_handoff_request', now(), v_actor, p_input ->> 'token_hash',
    p_input ->> 'idempotency_key', p_input ->> 'request_hash', v_expires
  ) RETURNING * INTO v_created;
  RETURN v_created;
END;
$$;

CREATE OR REPLACE FUNCTION public.consume_recommendation_product_handoff(p_input jsonb)
RETURNS public.recommendation_product_handoffs
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_temp AS $$
DECLARE
  v_handoff public.recommendation_product_handoffs;
  v_action public.recommendation_improvement_actions;
  v_decision public.recommendation_item_decisions;
  v_availability public.delivery_product_availability;
  v_entitled boolean := false;
  v_actor uuid;
BEGIN
  IF p_input IS NULL OR coalesce(p_input ->> 'token_hash', '') !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'PRODUCT_HANDOFF_INVALID';
  END IF;
  v_actor := (p_input ->> 'actor_user_id')::uuid;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_input ->> 'token_hash', 0));
  SELECT * INTO v_handoff FROM public.recommendation_product_handoffs
    WHERE token_hash = p_input ->> 'token_hash' FOR SHARE;
  IF v_handoff.id IS NULL
     OR v_handoff.organisation_id <> (p_input ->> 'organisation_id')::uuid
     OR v_handoff.workspace_id <> (p_input ->> 'workspace_id')::uuid
     OR v_handoff.created_by_user_id <> v_actor THEN
    RAISE EXCEPTION 'PRODUCT_HANDOFF_ACCESS_DENIED';
  END IF;
  IF v_handoff.expires_at <= now() THEN RAISE EXCEPTION 'PRODUCT_HANDOFF_EXPIRED'; END IF;
  IF EXISTS (
    SELECT 1 FROM public.recommendation_product_handoff_events
    WHERE handoff_id = v_handoff.id AND event_type = 'consumed'
  ) THEN RETURN v_handoff; END IF;

  SELECT * INTO v_action FROM public.recommendation_improvement_actions
    WHERE id = v_handoff.source_action_id FOR SHARE;
  SELECT * INTO v_decision FROM public.recommendation_item_decisions
    WHERE portfolio_item_id = v_handoff.source_portfolio_item_id FOR SHARE;
  SELECT * INTO v_availability FROM public.delivery_product_availability
    WHERE product_type = v_handoff.target_type
      AND product_id = v_handoff.target_id FOR SHARE;
  SELECT coalesce((
    SELECT entitled FROM public.organisation_product_entitlements
    WHERE organisation_id = v_handoff.organisation_id
      AND product_type = v_handoff.target_type AND product_id = v_handoff.target_id
  ), false) INTO v_entitled;
  IF v_action.id IS NULL OR v_action.status = 'cancelled'
     OR v_availability.product_id IS NULL
     OR v_availability.status <> 'active'
     OR v_availability.product_version IS DISTINCT FROM v_handoff.target_version
     OR (v_handoff.target_type = 'teammate'
       AND (v_decision.id IS NULL OR v_decision.current_state <> 'accepted'))
     OR (v_handoff.cta IN ('start_assessment', 'review_activation') AND NOT v_entitled)
     OR (v_handoff.cta IN ('view_pack', 'view_teammate') AND v_entitled)
     OR NOT EXISTS (
       SELECT 1 FROM public.organisation_memberships membership
       JOIN public.workspace_memberships workspace_membership
         ON workspace_membership.user_id = membership.user_id
        AND workspace_membership.workspace_id = v_handoff.workspace_id
       JOIN public.workspaces workspace
         ON workspace.id = workspace_membership.workspace_id
        AND workspace.organisation_id = membership.organisation_id
       WHERE membership.user_id = v_actor
         AND membership.organisation_id = v_handoff.organisation_id
         AND membership.status = 'active' AND membership.is_deleted = false
         AND workspace_membership.status = 'active'
         AND workspace_membership.is_deleted = false
         AND workspace.is_deleted = false
     ) THEN
    RAISE EXCEPTION 'PRODUCT_HANDOFF_NOT_AVAILABLE';
  END IF;

  INSERT INTO public.recommendation_product_handoff_events (
    handoff_id, organisation_id, workspace_id, event_type, actor_user_id
  ) VALUES (
    v_handoff.id, v_handoff.organisation_id, v_handoff.workspace_id, 'consumed', v_actor
  );
  RETURN v_handoff;
END;
$$;

ALTER TABLE public.recommendation_product_handoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_product_handoff_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organisation_product_activations ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.recommendation_product_handoffs,
  public.recommendation_product_handoff_events,
  public.organisation_product_activations FROM PUBLIC, anon, authenticated;
REVOKE ALL ON SEQUENCE public.recommendation_product_handoff_events_id_seq
  FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.enforce_recommendation_product_handoff_event_scope(),
  public.create_recommendation_product_handoff(jsonb),
  public.consume_recommendation_product_handoff(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_product_handoffs,
  public.recommendation_product_handoff_events,
  public.organisation_product_activations TO service_role;
GRANT EXECUTE ON FUNCTION public.create_recommendation_product_handoff(jsonb),
  public.consume_recommendation_product_handoff(jsonb) TO service_role;

COMMENT ON TABLE public.recommendation_product_handoffs IS
  'Immutable, consented, short-lived S4-011 single-purpose product hand-off intents.';
COMMENT ON TABLE public.recommendation_product_handoff_events IS
  'Append-only S4-011 product hand-off consumption audit.';
COMMENT ON TABLE public.organisation_product_activations IS
  'Operational read model that distinguishes product activation from eligibility and hand-off.';
