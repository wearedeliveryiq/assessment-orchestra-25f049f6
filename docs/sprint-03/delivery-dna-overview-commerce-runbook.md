# Delivery DNA Overview commerce runbook

## Activate the offer

1. Apply the base migrations `20260804010000_delivery_dna_overview_commerce.sql` and `20260804011000_harden_delivery_dna_overview_commerce_permissions.sql` if not already present. Then apply `20260804012000_delivery_dna_overview_non_vat_offer.sql` followed immediately by `20260804013000_harden_delivery_dna_overview_non_vat_permissions.sql` through the Lovable-managed migration path.
2. Verify RLS is enabled with zero client policies; `anon`, `authenticated` and `PUBLIC` have no table, sequence, function or `MAINTAIN` privileges; only `service_role` can call the commerce functions.
3. In Stripe, create and approve one GBP one-off price whose subtotal and final total are exactly 29500 minor units. Do not enable automatic tax or tax-ID collection. The customer must see exactly: “No VAT charged — DeliveryIQ is not VAT registered.” No VAT amount, VAT registration number or VAT-inclusive claim may appear.
4. Configure deployment secrets without exposing their values:
   - `DELIVERYIQ_PAYMENT_PROVIDER=stripe`
   - `STRIPE_SECRET_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `DELIVERYIQ_OVERVIEW_STRIPE_PRICE_ID`
5. Register the HTTPS webhook endpoint `/api/delivery-dna-overview/webhook` for completed, asynchronous-success, asynchronous-failure and expired Checkout Session events.
6. Deploy and verify the Saved Snapshot page resolves the server offer and enables the purchase action.

## First authorised purchase smoke

Use one named test purchaser in an authorised non-customer or approved tenant. Confirm:

- the checkout shows subtotal £295, VAT £0 and final total GBP £295 plus the exact approved non-VAT disclosure, and contains no card data in DeliveryIQ;
- success redirect alone remains pending and grants nothing;
- one valid signed paid event reporting subtotal 29500, tax 0 and total 29500 creates exactly one immutable scoped grant;
- replay creates no second grant or fulfilment;
- the remaining 26 questions open only for the purchaser in the matching organisation/workspace;
- completion uses the existing automatic analysis hand-off;
- the web Overview and downloaded report contain the same bounded projection;
- a different tenant and an unsigned/wrong-price/wrong-tax/wrong-total event are denied without leakage;
- Delivery DNA Action remains unavailable.

Record only identifiers, statuses, version/digest and safe error codes. Do not record secrets, payment method data, raw webhook bodies or assessment evidence.

## Disable or roll back

Remove the four deployment settings to fail closed and disable new checkout immediately. Existing verified grants and immutable history remain intact. Roll back application code if required; do not delete payment events, grants, analysis results or historical offer versions. Revoke a mistaken grant only through a separately authorised corrective migration that preserves its audit history.
