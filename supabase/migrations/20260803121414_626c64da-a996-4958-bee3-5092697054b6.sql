REVOKE DELETE, TRUNCATE, REFERENCES, TRIGGER, MAINTAIN
  ON public.recommendation_decision_events,
     public.recommendation_item_decisions
  FROM service_role;
REVOKE UPDATE ON public.recommendation_decision_events FROM service_role;
GRANT SELECT, INSERT ON public.recommendation_decision_events TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.recommendation_item_decisions TO service_role;