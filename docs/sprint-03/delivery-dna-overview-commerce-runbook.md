# Delivery DNA Overview commerce runbook

## Activate the offer

1. Before the 2.1 cutover, confirm the recorded three completed unlinked 2.0 Snapshots still have no checkout, verified payment, grant or analysis run. If any genuine paid customer now exists, preserve that access and stop only the access-migration decision; do not translate evidence or delete history.
2. Apply `20260805020000_delivery_dna_2_1_cutover.sql` followed immediately by `20260805021000_harden_delivery_dna_2_1_permissions.sql` through the Lovable-managed migration path. Existing 2.0, commerce and non-VAT migrations must already be present.
3. Verify new Snapshot sessions pin collection/presentation/provenance 2.1.0; only `create_delivery_dna_snapshot_v21` and `link_delivery_dna_snapshot_v21` remain executable by `service_role`; exact 15-ID linking is tenant scoped; historical 1.x and 2.0 rows are unchanged; and client roles hold no new table/function privileges.
4. Verify RLS is enabled with zero client policies; `anon`, `authenticated` and `PUBLIC` have no table, sequence, function or `MAINTAIN` privileges; only `service_role` can call the commerce functions.
5. In Stripe, create and approve one GBP one-off price for offer `delivery-dna-overview-gbp-21` v2.1.0 whose subtotal and final total are exactly 29500 minor units. Do not enable automatic tax or tax-ID collection. The customer must see exactly: “No VAT charged — DeliveryIQ is not VAT registered.” No VAT amount, VAT registration number or VAT-inclusive claim may appear.
6. Configure deployment secrets without exposing their values:
   - `DELIVERYIQ_PAYMENT_PROVIDER=stripe`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `DELIVERYIQ_OVERVIEW_STRIPE_PRICE_ID`
7. Register the HTTPS webhook endpoint `/api/delivery-dna-overview/webhook` for completed, asynchronous-success, asynchronous-failure and expired Checkout Session events.
8. Deploy and verify the Saved Snapshot page resolves the server offer and enables the purchase action.

## First authorised purchase smoke

Use one named test purchaser in an authorised non-customer or approved tenant. Confirm:

- the checkout shows subtotal £295, VAT £0 and final total GBP £295 plus the exact approved non-VAT disclosure, and contains no card data in DeliveryIQ;
- success redirect alone remains pending and grants nothing;
- one valid signed paid event reporting subtotal 29500, tax 0 and total 29500 creates exactly one immutable scoped grant;
- replay creates no second grant or fulfilment;
- the remaining 30 `supporting_1`/`supporting_2` questions open only for the purchaser in the matching organisation/workspace;
- completion uses the existing automatic analysis hand-off;
- the web Overview and downloaded report contain the same bounded projection;
- a different tenant and an unsigned/wrong-price/wrong-tax/wrong-total event are denied without leakage;
- Delivery DNA Action remains unavailable.

Record only identifiers, statuses, version/digest and safe error codes. Do not record secrets, payment method data, raw webhook bodies or assessment evidence.

## Disable or roll back

Remove the four deployment settings to fail closed and disable new checkout immediately. Existing verified grants and immutable 1.0/2.0/2.1 history remain intact. Roll back application code if required; do not reactivate an older collection function or delete payment events, grants, analysis results or historical offer versions. Revoke a mistaken grant only through a separately authorised corrective migration that preserves its audit history.
