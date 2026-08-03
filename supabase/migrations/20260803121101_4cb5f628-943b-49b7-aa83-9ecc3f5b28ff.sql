DO $migration$
DECLARE
  v_original text;
  v_fixed text;
  v_original_digest text;
  v_fixed_digest text;
BEGIN
  IF to_regclass('public._s4_007_fn_parts') IS NOT NULL THEN
    SELECT string_agg(s, '' ORDER BY i) INTO v_original
    FROM public._s4_007_fn_parts;
    v_original_digest := encode(extensions.digest(v_original, 'sha256'), 'hex');
    IF (SELECT count(*) FROM public._s4_007_fn_parts) <> 6
       OR length(v_original) <> 19983
       OR v_original_digest <> 'a2f0a464281c3fe76110af94ac7ae573bb1be05ba5aa58f0205fe83e6a27988e' THEN
      RAISE EXCEPTION 'S4_007_STAGED_FUNCTION_SOURCE_MISMATCH';
    END IF;
    v_fixed := replace(
      v_original,
      E'     OR p_input ->> ''portfolio_state'' <> CASE\n'
        || E'       WHEN v_expected_count = 0 THEN ''empty''\n'
        || E'       WHEN v_expected_count = v_scheduled_count THEN ''complete''\n'
        || E'       ELSE ''partial''\n'
        || E'     END THEN',
      E'     OR p_input ->> ''portfolio_state'' <> (CASE\n'
        || E'       WHEN v_expected_count = 0 THEN ''empty''\n'
        || E'       WHEN v_expected_count = v_scheduled_count THEN ''complete''\n'
        || E'       ELSE ''partial''\n'
        || E'     END) THEN'
    );
    v_fixed_digest := encode(extensions.digest(v_fixed, 'sha256'), 'hex');
    IF v_fixed = v_original
       OR v_fixed_digest <> '9739e3def0f39053bb058d718c993a1519290275da4ba93cf79d75743ceba043' THEN
      RAISE EXCEPTION 'S4_007_PUBLISHER_REPAIR_MISMATCH';
    END IF;
    EXECUTE format(
      'CREATE OR REPLACE FUNCTION public.publish_recommendation_portfolio(p_input jsonb) '
        || 'RETURNS public.recommendation_portfolios LANGUAGE plpgsql SECURITY DEFINER '
        || 'SET search_path = public, pg_temp AS %L',
      v_fixed
    );
    DROP TABLE public._s4_007_fn_parts;
  ELSIF to_regprocedure('public.publish_recommendation_portfolio(jsonb)') IS NULL THEN
    RAISE EXCEPTION 'S4_007_PUBLISHER_MISSING';
  END IF;
END
$migration$;

REVOKE ALL ON public.recommendation_portfolios,
  public.recommendation_portfolio_items FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_portfolios,
  public.recommendation_portfolio_items FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_portfolio(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_portfolios,
  public.recommendation_portfolio_items TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_portfolio(jsonb) TO service_role;