INSERT INTO public._s4_007_fn_parts VALUES (6, $p6$
  SELECT jsonb_build_object(
    'immediate_attention', count(*) FILTER (WHERE primary_class = 'immediate_attention'),
    'foundation', count(*) FILTER (WHERE primary_class = 'foundation'),
    'quick_win', count(*) FILTER (WHERE primary_class = 'quick_win'),
    'strategic_initiative', count(*) FILTER (WHERE primary_class = 'strategic_initiative'),
    'watch', count(*) FILTER (WHERE primary_class = 'watch')
  ) INTO v_expected_class_counts
  FROM public.recommendation_portfolio_items WHERE portfolio_id = v_portfolio.id;
  IF EXISTS (
    SELECT 1 FROM public.recommendation_portfolio_items
    WHERE portfolio_id = v_portfolio.id
    GROUP BY portfolio_id
    HAVING min(portfolio_order) <> 1
       OR max(portfolio_order) <> count(*)
       OR count(DISTINCT portfolio_order) <> count(*)
  ) OR EXISTS (
    SELECT 1
    FROM (
      SELECT item.id, item.portfolio_order,
        row_number() OVER (ORDER BY
          CASE item.primary_class
            WHEN 'immediate_attention' THEN 1
            WHEN 'foundation' THEN 2
            WHEN 'quick_win' THEN 3
            WHEN 'strategic_initiative' THEN 4
            ELSE 5
          END,
          item.generated_sequence NULLS LAST,
          item.generated_rank,
          item.catalogue_order,
          item.recommendation_id
        ) AS expected_order
      FROM public.recommendation_portfolio_items item
      WHERE item.portfolio_id = v_portfolio.id
    ) ordered
    WHERE ordered.portfolio_order <> ordered.expected_order
  ) OR v_expected_class_counts IS DISTINCT FROM p_input #> '{canonical_portfolio,summary,classCounts}'
     OR (SELECT count(*) FROM public.recommendation_portfolio_items
         WHERE portfolio_id = v_portfolio.id) <> v_expected_count THEN
    RAISE EXCEPTION 'PORTFOLIO_PUBLICATION_FAILED';
  END IF;
  RETURN v_portfolio;
END;
$p6$);