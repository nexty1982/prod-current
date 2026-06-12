# Stripe Configuration — Orthodox Metrics

**Account:** OrthodoxMetrics LLC sandbox (`acct_1ThXf0FQ84fvM1Rb`)  
**Status:** Code deployed — **env keys required** to enable billing  
**Last updated:** 2026-06-12

---

## 1. Quick status check

```bash
curl -s http://127.0.0.1:3001/api/billing/config | jq .
```

Expected when configured:

```json
{
  "success": true,
  "enabled": true,
  "publishableKey": "pk_test_...",
  "defaultPriceConfigured": true,
  "defaultPriceKey": "diocesan_standard_setup",
  "prices": [ ... ]
}
```

---

## 2. Environment variables

Copy `stripe.env.example` into `server/.env` (merge with existing vars).

| Variable | Required | Purpose |
|----------|----------|---------|
| `STRIPE_SECRET_KEY` | Yes | Server API access |
| `STRIPE_PUBLISHABLE_KEY` | Yes | Future client-side Checkout |
| `STRIPE_WEBHOOK_SECRET` | Yes | Verify webhook signatures |
| `STRIPE_DEFAULT_PRICE_ID` | Yes | Default enrollment digitization fee |
| `STRIPE_PRICE_*` | Recommended | Per-tier price IDs for CCC selector |
| `OM_PUBLIC_URL` | Recommended | Checkout success/cancel URLs |

After editing `.env`:

```bash
/var/omai-ops/om-deploy.sh be
```

---

## 3. Product catalog (sandbox)

Created in Stripe test mode with stable **lookup keys**:

| Tier | Product | Lookup key | Sandbox price ID | Amount |
|------|---------|------------|------------------|--------|
| Parish Essentials | Digitization Setup | `om_parish_essentials_setup` | `price_1ThcckFQ84fvM1RbhswKkbtJ` | $625 one-time |
| Parish Essentials | Hosting (monthly) | `om_parish_essentials_hosting_monthly` | `price_1ThcctFQ84fvM1RbfUJ899zw` | $37/mo |
| Diocesan Standard | Digitization Setup | `om_diocesan_standard_setup` | `price_1ThccuFQ84fvM1Rb5IGDGseL` | $1,625 one-time |
| Diocesan Standard | Hosting (monthly) | `om_diocesan_standard_hosting_monthly` | `price_1ThccuFQ84fvM1RbrSBfZ1iW` | $59/mo |
| Cathedral / Archive Pro | Hosting (monthly) | `om_cathedral_pro_hosting_monthly` | `price_1ThccvFQ84fvM1RbDpHQaoNX` | $149/mo |

Amounts use midpoint list pricing from the public pricing page. Custom cathedral digitization remains sales-assisted (no automated setup price).

**Live mode:** Recreate products/prices in live mode and update `.env` with live `price_...` IDs.

---

## 4. Webhook endpoint

**URL:** `https://orthodoxmetrics.com/api/billing/webhook`

In [Stripe Dashboard → Webhooks](https://dashboard.stripe.com/test/webhooks):

1. Add endpoint → paste URL above
2. Select events:
   - `checkout.session.completed`
   - `invoice.paid`
   - `invoice.finalized`
   - `invoice.payment_failed`
3. Copy **Signing secret** → `STRIPE_WEBHOOK_SECRET=whsec_...`
4. Restart OM backend

Webhook handler syncs:

- `onboarding_requests.payment_status`
- `churches.billing_status`
- `omai_crm_leads.billing_status`

---

## 5. Customer portal

Enable in Stripe Dashboard → **Settings → Billing → Customer portal**.

CCC uses `POST /api/admin/onboarding/:onbId/stripe/portal` for paid enrollments.

---

## 6. Operator flow (CCC)

1. Parish enrolls → `ONB_*` request created
2. Admin opens **Church Command Center → Enrollment**
3. Select billing line item (tier + setup vs hosting)
4. **Stripe checkout link** or **Send Stripe invoice**
5. Webhook marks payment → provisioning gate allows tenant DB creation

Manual **Mark paid** still works when Stripe is disabled.

---

## 7. Verify script

```bash
cd /var/www/orthodoxmetrics/prod/server
node scripts/verify-stripe-config.js
```

---

## 8. API reference

| Endpoint | Auth | Purpose |
|----------|------|---------|
| `GET /api/billing/config` | Public | Status + price catalog |
| `POST /api/billing/webhook` | Stripe signature | Payment events |
| `POST /api/admin/onboarding/:id/stripe/checkout` | Admin | Checkout session |
| `POST /api/admin/onboarding/:id/stripe/invoice` | Admin | Invoice email |
| `POST /api/admin/onboarding/:id/stripe/portal` | Admin | Customer portal |

Checkout/invoice body (optional):

```json
{ "priceId": "price_...", "priceKey": "diocesan_standard_setup" }
```
