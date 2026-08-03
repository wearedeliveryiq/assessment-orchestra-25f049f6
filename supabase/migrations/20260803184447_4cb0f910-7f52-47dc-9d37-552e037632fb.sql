-- PDR-003-003: explicit Delivery DNA evidence semantics and immutable collection provenance.
ALTER TABLE public.assessment_responses
  ADD COLUMN IF NOT EXISTS evidence_reason_code text,
  ADD COLUMN IF NOT EXISTS evidence_reason_text text,
  ALTER COLUMN value DROP NOT NULL;

ALTER TABLE public.assessment_responses
  ADD CONSTRAINT assessment_responses_evidence_semantics CHECK (
    (evidence_status = 'answered'
      AND value IS NOT NULL
      AND value <> 'null'::jsonb
      AND evidence_reason_code IS NULL
      AND evidence_reason_text IS NULL)
    OR (evidence_status = 'not_applicable'
      AND (value IS NULL OR value = 'null'::jsonb)
      AND evidence_reason_code = 'customer_declared_not_applicable'
      AND length(btrim(evidence_reason_text)) BETWEEN 1 AND 500)
    OR (evidence_status = 'missing'
      AND (value IS NULL OR value = 'null'::jsonb)
      AND evidence_reason_code IS NULL
      AND evidence_reason_text IS NULL)
    OR (evidence_status = 'excluded'
      AND (value IS NULL OR value = 'null'::jsonb)
      AND exclusion_reason IN ('superseded', 'invalidated', 'duplicate', 'quality_review')
      AND evidence_reason_code IS NULL
      AND evidence_reason_text IS NULL)
  ) NOT VALID;

CREATE UNIQUE INDEX runtime_executions_delivery_dna_collection_once
  ON public.runtime_executions (
    assessment_session_id,
    knowledge_pack_id,
    knowledge_pack_version,
    pipeline_id,
    ((metadata ->> 'assessmentRevision')::integer)
  )
  WHERE pipeline_id = 'delivery-dna-collection';

CREATE OR REPLACE FUNCTION public.protect_delivery_dna_collection_execution()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF OLD.pipeline_id = 'delivery-dna-collection' AND OLD.status = 'completed' THEN
    RAISE EXCEPTION 'Completed Delivery DNA collection provenance is immutable';
  END IF;
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER runtime_executions_delivery_dna_collection_immutable
  BEFORE UPDATE OR DELETE ON public.runtime_executions
  FOR EACH ROW EXECUTE FUNCTION public.protect_delivery_dna_collection_execution();

REVOKE EXECUTE ON FUNCTION public.protect_delivery_dna_collection_execution() FROM PUBLIC;
COMMENT ON COLUMN public.assessment_responses.evidence_reason_code IS
  'Stable governed reason code for a non-answer evidence status.';
COMMENT ON COLUMN public.assessment_responses.evidence_reason_text IS
  'Customer-safe explanation associated with the governed evidence reason code.';