CREATE OR REPLACE FUNCTION public.reject_audit_mutation()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  RAISE EXCEPTION 'Audit records are immutable';
END;
$$;

CREATE OR REPLACE FUNCTION public.audit_events_allow_archive_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF OLD.archived_at IS NULL
     AND NEW.archived_at IS NOT NULL
     AND (to_jsonb(NEW) - 'archived_at') = (to_jsonb(OLD) - 'archived_at')
  THEN
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Audit records are immutable';
END;
$$;

DROP TRIGGER IF EXISTS audit_events_immutable ON public.audit_events;
CREATE TRIGGER audit_events_immutable
BEFORE UPDATE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION public.audit_events_allow_archive_only();