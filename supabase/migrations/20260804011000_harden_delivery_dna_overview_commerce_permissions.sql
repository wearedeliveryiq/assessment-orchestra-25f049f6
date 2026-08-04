REVOKE ALL ON public.delivery_dna_overview_checkouts,
  public.delivery_dna_overview_payment_events,
  public.delivery_dna_overview_access_grants FROM PUBLIC, anon, authenticated;
REVOKE MAINTAIN ON public.delivery_dna_overview_checkouts,
  public.delivery_dna_overview_payment_events,
  public.delivery_dna_overview_access_grants FROM anon, authenticated;
REVOKE ALL ON SEQUENCE public.delivery_dna_overview_payment_events_id_seq FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_delivery_dna_overview_checkout(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  integer, text, text, text, text, timestamptz
), public.attach_delivery_dna_overview_provider_checkout(uuid, text, text),
  public.fail_delivery_dna_overview_checkout(uuid, text),
  public.fulfil_delivery_dna_overview_payment(
    text, text, text, text, text, integer, text, text, uuid, uuid, uuid,
    uuid, uuid, uuid, text, text, text, text
  ) FROM PUBLIC, anon, authenticated;

GRANT ALL ON public.delivery_dna_overview_checkouts,
  public.delivery_dna_overview_payment_events,
  public.delivery_dna_overview_access_grants TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.delivery_dna_overview_payment_events_id_seq TO service_role;
GRANT EXECUTE ON FUNCTION public.create_delivery_dna_overview_checkout(
  uuid, uuid, uuid, uuid, uuid, text, text, text, text, text, text,
  integer, text, text, text, text, timestamptz
), public.attach_delivery_dna_overview_provider_checkout(uuid, text, text),
  public.fail_delivery_dna_overview_checkout(uuid, text),
  public.fulfil_delivery_dna_overview_payment(
    text, text, text, text, text, integer, text, text, uuid, uuid, uuid,
    uuid, uuid, uuid, text, text, text, text
  ) TO service_role;
