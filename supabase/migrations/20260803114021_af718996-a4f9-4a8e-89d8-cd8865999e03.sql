CREATE TYPE public.recommendation_portfolio_class AS ENUM (
  'immediate_attention', 'foundation', 'quick_win', 'strategic_initiative', 'watch'
);
CREATE TYPE public.recommendation_portfolio_state AS ENUM ('empty', 'partial', 'complete');

CREATE TABLE public.recommendation_portfolios (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  recommendation_evaluation_id uuid NOT NULL REFERENCES public.recommendation_evaluations(id) ON DELETE RESTRICT,
  confidence_gate_id uuid NOT NULL REFERENCES public.recommendation_confidence_gates(id) ON DELETE RESTRICT,
  conflict_resolution_id uuid NOT NULL REFERENCES public.recommendation_conflict_resolutions(id) ON DELETE RESTRICT,
  priority_model_id uuid NOT NULL REFERENCES public.recommendation_priority_models(id) ON DELETE RESTRICT,
  sequence_model_id uuid NOT NULL REFERENCES public.recommendation_sequence_models(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  configuration_set_id text NOT NULL,
  catalogue_version_id uuid NOT NULL REFERENCES public.recommendation_catalogue_versions(id) ON DELETE RESTRICT,
  catalogue_id text NOT NULL,
  catalogue_version text NOT NULL CHECK (catalogue_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_digest text NOT NULL CHECK (catalogue_digest ~ '^[0-9a-f]{64}$'),
  policy_version text NOT NULL,
  projector_version text NOT NULL,
  portfolio_state public.recommendation_portfolio_state NOT NULL,
  item_count integer NOT NULL CHECK (item_count BETWEEN 0 AND 250),
  scheduled_count integer NOT NULL CHECK (scheduled_count BETWEEN 0 AND item_count),
  input_hash text NOT NULL CHECK (input_hash ~ '^[0-9a-f]{64}$'),
  output_hash text NOT NULL CHECK (output_hash ~ '^[0-9a-f]{64}$'),
  canonical_input jsonb NOT NULL,
  canonical_portfolio jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (sequence_model_id, policy_version),
  CONSTRAINT recommendation_portfolio_scope CHECK (
    canonical_input ->> 'analysisRunId' = analysis_run_id::text
    AND canonical_input ->> 'recommendationEvaluationId' = recommendation_evaluation_id::text
    AND canonical_input ->> 'confidenceGateId' = confidence_gate_id::text
    AND canonical_input ->> 'conflictResolutionId' = conflict_resolution_id::text
    AND canonical_input ->> 'priorityModelId' = priority_model_id::text
    AND canonical_input ->> 'sequenceModelId' = sequence_model_id::text
    AND canonical_input ->> 'organisationId' = organisation_id::text
    AND canonical_input ->> 'workspaceId' = workspace_id::text
    AND canonical_input ->> 'configurationSetId' = configuration_set_id
    AND canonical_input ->> 'catalogueVersionId' = catalogue_version_id::text
    AND canonical_input ->> 'catalogueId' = catalogue_id
    AND canonical_input ->> 'catalogueVersion' = catalogue_version
    AND canonical_input ->> 'catalogueDigest' = catalogue_digest
    AND canonical_input ->> 'policyVersion' = policy_version
  ),
  CONSTRAINT recommendation_portfolio_output CHECK (
    canonical_portfolio ->> 'schemaVersion' = 'deliveryiq.recommendation-portfolio/1.0.0'
    AND canonical_portfolio ->> 'policyVersion' = policy_version
    AND canonical_portfolio ->> 'projectorVersion' = projector_version
    AND canonical_portfolio #>> '{summary,state}' = portfolio_state::text
    AND (canonical_portfolio #>> '{summary,itemCount}')::integer = item_count
    AND (canonical_portfolio #>> '{summary,scheduledCount}')::integer = scheduled_count
    AND jsonb_typeof(canonical_portfolio -> 'items') = 'array'
  )
);

CREATE TABLE public.recommendation_portfolio_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  portfolio_id uuid NOT NULL REFERENCES public.recommendation_portfolios(id) ON DELETE RESTRICT,
  priority_item_id uuid NOT NULL REFERENCES public.recommendation_priority_items(id) ON DELETE RESTRICT,
  sequence_item_id uuid NOT NULL REFERENCES public.recommendation_sequence_items(id) ON DELETE RESTRICT,
  resolution_candidate_id uuid NOT NULL REFERENCES public.recommendation_resolution_candidates(id) ON DELETE RESTRICT,
  recommendation_definition_id uuid NOT NULL REFERENCES public.recommendation_definitions(id) ON DELETE RESTRICT,
  analysis_run_id uuid NOT NULL REFERENCES public.assessment_analysis_runs(id) ON DELETE RESTRICT,
  organisation_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE RESTRICT,
  workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE RESTRICT,
  recommendation_id text NOT NULL,
  recommendation_version text NOT NULL CHECK (recommendation_version ~ '^\d+\.\d+\.\d+$'),
  catalogue_order integer NOT NULL CHECK (catalogue_order > 0),
  portfolio_order integer NOT NULL CHECK (portfolio_order > 0),
  title text NOT NULL CHECK (length(btrim(title)) BETWEEN 1 AND 300),
  outcome text NOT NULL CHECK (length(btrim(outcome)) BETWEEN 1 AND 1000),
  success_measures jsonb NOT NULL CHECK (
    jsonb_typeof(success_measures) = 'array' AND jsonb_array_length(success_measures) > 0
  ),
  matched_triggers jsonb NOT NULL CHECK (
    jsonb_typeof(matched_triggers) = 'array' AND jsonb_array_length(matched_triggers) > 0
  ),
  generated_rank integer NOT NULL CHECK (generated_rank > 0),
  priority_label public.recommendation_priority_label NOT NULL,
  impact text NOT NULL CHECK (impact IN ('low', 'medium', 'high')),
  effort text NOT NULL CHECK (effort IN ('low', 'medium', 'high')),
  urgency numeric NOT NULL CHECK (urgency BETWEEN 0 AND 100),
  confidence_state public.recommendation_confidence_state NOT NULL,
  confidence_result public.recommendation_confidence_gate_result NOT NULL CHECK (
    confidence_result IN ('presented', 'evidence_first')
  ),
  confidence_caveat text,
  generated_sequence integer CHECK (generated_sequence IS NULL OR generated_sequence > 0),
  generated_horizon public.recommendation_sequence_horizon,
  sequence_state public.recommendation_sequence_state NOT NULL,
  sequence_reason_code text NOT NULL CHECK (sequence_reason_code IN (
    'dependency_precedence', 'dependency_satisfied', 'rank_and_horizon_fit',
    'blocked_dependency', 'capacity_exceeded'
  )),
  blocking_dependency_ids jsonb NOT NULL CHECK (jsonb_typeof(blocking_dependency_ids) = 'array'),
  dependencies jsonb NOT NULL CHECK (jsonb_typeof(dependencies) = 'array'),
  caveats jsonb NOT NULL CHECK (jsonb_typeof(caveats) = 'array'),
  rationale jsonb NOT NULL CHECK (jsonb_typeof(rationale) = 'array'),
  source_trace_node_ids jsonb NOT NULL CHECK (
    jsonb_typeof(source_trace_node_ids) = 'array'
    AND jsonb_array_length(source_trace_node_ids) > 0
  ),
  primary_class public.recommendation_portfolio_class NOT NULL,
  secondary_tags jsonb NOT NULL CHECK (jsonb_typeof(secondary_tags) = 'array'),
  semantic_hash text NOT NULL CHECK (semantic_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (portfolio_id, recommendation_id),
  UNIQUE (portfolio_id, priority_item_id),
  UNIQUE (portfolio_id, sequence_item_id),
  UNIQUE (portfolio_id, portfolio_order),
  CONSTRAINT recommendation_portfolio_item_sequence_state CHECK (
    (
      sequence_state = 'scheduled'
      AND generated_sequence IS NOT NULL
      AND generated_horizon IS NOT NULL
    )
    OR (
      sequence_state <> 'scheduled'
      AND generated_sequence IS NULL
      AND generated_horizon IS NULL
    )
  )
);

CREATE INDEX recommendation_portfolios_tenant_run_idx
  ON public.recommendation_portfolios (
    organisation_id, workspace_id, analysis_run_id, created_at DESC
  );
CREATE INDEX recommendation_portfolio_items_class_order_idx
  ON public.recommendation_portfolio_items (portfolio_id, primary_class, portfolio_order);

CREATE TRIGGER recommendation_portfolios_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_portfolios
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();
CREATE TRIGGER recommendation_portfolio_items_immutable
BEFORE UPDATE OR DELETE ON public.recommendation_portfolio_items
FOR EACH ROW EXECUTE FUNCTION public.reject_audit_mutation();

ALTER TABLE public.recommendation_portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recommendation_portfolio_items ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.recommendation_portfolios IS
  'Immutable S4-007 customer-ready recommendation portfolio baseline.';
COMMENT ON TABLE public.recommendation_portfolio_items IS
  'Immutable classified portfolio items reconciled to evaluation, priority and sequence.';