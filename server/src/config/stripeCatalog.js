/**
 * Orthodox Metrics Stripe price catalog — sandbox defaults + env overrides.
 * Lookup keys are stable across environments; price IDs differ per Stripe account/mode.
 */

const CATALOG = [
  {
    key: 'parish_essentials_setup',
    lookupKey: 'om_parish_essentials_setup',
    envKey: 'STRIPE_PRICE_PARISH_ESSENTIALS_SETUP',
    sandboxPriceId: 'price_1ThcckFQ84fvM1RbhswKkbtJ',
    label: 'Parish Essentials — Digitization Setup',
    tier: 'parish_essentials',
    billingType: 'setup',
    amountCents: 62500,
    interval: null,
    enrollmentDefault: false,
  },
  {
    key: 'parish_essentials_hosting_monthly',
    lookupKey: 'om_parish_essentials_hosting_monthly',
    envKey: 'STRIPE_PRICE_PARISH_ESSENTIALS_HOSTING',
    sandboxPriceId: 'price_1ThcctFQ84fvM1RbfUJ899zw',
    label: 'Parish Essentials — Hosting & Analytics (monthly)',
    tier: 'parish_essentials',
    billingType: 'hosting',
    amountCents: 3700,
    interval: 'month',
    enrollmentDefault: false,
  },
  {
    key: 'diocesan_standard_setup',
    lookupKey: 'om_diocesan_standard_setup',
    envKey: 'STRIPE_PRICE_DIOCESAN_STANDARD_SETUP',
    sandboxPriceId: 'price_1ThccuFQ84fvM1Rb5IGDGseL',
    label: 'Diocesan Standard — Digitization Setup',
    tier: 'diocesan_standard',
    billingType: 'setup',
    amountCents: 162500,
    interval: null,
    enrollmentDefault: true,
  },
  {
    key: 'diocesan_standard_hosting_monthly',
    lookupKey: 'om_diocesan_standard_hosting_monthly',
    envKey: 'STRIPE_PRICE_DIOCESAN_STANDARD_HOSTING',
    sandboxPriceId: 'price_1ThccuFQ84fvM1RbrSBfZ1iW',
    label: 'Diocesan Standard — Hosting & Analytics (monthly)',
    tier: 'diocesan_standard',
    billingType: 'hosting',
    amountCents: 5900,
    interval: 'month',
    enrollmentDefault: false,
  },
  {
    key: 'cathedral_pro_hosting_monthly',
    lookupKey: 'om_cathedral_pro_hosting_monthly',
    envKey: 'STRIPE_PRICE_CATHEDRAL_PRO_HOSTING',
    sandboxPriceId: 'price_1ThccvFQ84fvM1RbDpHQaoNX',
    label: 'Cathedral / Archive Pro — Hosting & Analytics (monthly)',
    tier: 'cathedral_pro',
    billingType: 'hosting',
    amountCents: 14900,
    interval: 'month',
    enrollmentDefault: false,
  },
];

function resolvePriceId(entry) {
  if (!entry) return null;
  return process.env[entry.envKey] || entry.sandboxPriceId || null;
}

function getCatalogEntries() {
  return CATALOG.map((entry) => ({
    key: entry.key,
    lookupKey: entry.lookupKey,
    label: entry.label,
    tier: entry.tier,
    billingType: entry.billingType,
    amountCents: entry.amountCents,
    interval: entry.interval,
    priceId: resolvePriceId(entry),
    enrollmentDefault: entry.enrollmentDefault,
  }));
}

function getEntryByKey(priceKey) {
  const entry = CATALOG.find((e) => e.key === priceKey);
  if (!entry) return null;
  return { ...entry, priceId: resolvePriceId(entry) };
}

function getDefaultEnrollmentPrice() {
  const fromEnv = process.env.STRIPE_DEFAULT_PRICE_ID;
  if (fromEnv) {
    const match = getCatalogEntries().find((e) => e.priceId === fromEnv);
    return match || { key: 'custom', priceId: fromEnv, label: 'Default price', billingType: 'setup', interval: null };
  }
  const entry = CATALOG.find((e) => e.enrollmentDefault) || CATALOG[0];
  return getEntryByKey(entry.key);
}

function resolveCheckoutPrice({ priceId, priceKey } = {}) {
  if (priceId) return { priceId, entry: getCatalogEntries().find((e) => e.priceId === priceId) || null };
  if (priceKey) {
    const entry = getEntryByKey(priceKey);
    if (!entry?.priceId) throw new Error(`Unknown or unconfigured Stripe price key: ${priceKey}`);
    return { priceId: entry.priceId, entry };
  }
  const def = getDefaultEnrollmentPrice();
  if (!def?.priceId) throw new Error('No Stripe price configured (STRIPE_DEFAULT_PRICE_ID or catalog)');
  return { priceId: def.priceId, entry: def };
}

module.exports = {
  CATALOG,
  getCatalogEntries,
  getEntryByKey,
  getDefaultEnrollmentPrice,
  resolveCheckoutPrice,
};
