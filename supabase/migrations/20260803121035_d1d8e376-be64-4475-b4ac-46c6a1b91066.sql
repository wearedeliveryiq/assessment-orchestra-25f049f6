REVOKE ALL ON public.recommendation_portfolios,
  public.recommendation_portfolio_items FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.recommendation_portfolios,
  public.recommendation_portfolio_items FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.publish_recommendation_portfolio(jsonb)
  FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.recommendation_portfolios,
  public.recommendation_portfolio_items TO service_role;
GRANT EXECUTE ON FUNCTION public.publish_recommendation_portfolio(jsonb) TO service_role;