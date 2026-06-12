#!/usr/bin/env node
/**
 * Verify Stripe billing configuration.
 * Usage: node scripts/verify-stripe-config.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const stripeCatalog = require('../src/config/stripeCatalog');
const stripeBilling = require('../src/services/stripeBillingService');

function mask(value) {
  if (!value) return '(missing)';
  if (value.length <= 8) return '***';
  return `${value.slice(0, 7)}…${value.slice(-4)}`;
}

async function main() {
  console.log('\n── Stripe configuration ───────────────────────────────────────\n');

  const checks = [
    ['STRIPE_SECRET_KEY', !!process.env.STRIPE_SECRET_KEY],
    ['STRIPE_PUBLISHABLE_KEY', !!process.env.STRIPE_PUBLISHABLE_KEY],
    ['STRIPE_WEBHOOK_SECRET', !!process.env.STRIPE_WEBHOOK_SECRET],
    ['STRIPE_DEFAULT_PRICE_ID', !!process.env.STRIPE_DEFAULT_PRICE_ID],
  ];

  for (const [name, ok] of checks) {
    console.log(`  ${ok ? 'ok' : 'MISSING'}  ${name}`);
  }

  const config = stripeBilling.publicConfig();
  console.log(`\n  enabled: ${config.enabled}`);
  console.log(`  defaultPriceKey: ${config.defaultPriceKey || '—'}`);
  console.log(`  catalog prices: ${config.prices.length}`);

  for (const p of config.prices) {
    const amt = p.amountCents != null ? `$${(p.amountCents / 100).toFixed(2)}` : '—';
    const cadence = p.interval ? `/${p.interval}` : ' one-time';
    console.log(`    · ${p.label} → ${p.priceId} (${amt}${cadence})`);
  }

  const stripe = stripeBilling.getStripe();
  if (!stripe) {
    console.log('\n  SKIP live API check — STRIPE_SECRET_KEY not set\n');
    process.exit(config.enabled ? 0 : 1);
  }

  console.log('\n── Stripe API connectivity ────────────────────────────────────\n');
  try {
    const account = await stripe.accounts.retrieve();
    console.log(`  ok  Connected to ${account.settings?.dashboard?.display_name || account.id}`);
    console.log(`      mode: ${account.livemode ? 'live' : 'test'}`);
    console.log(`      secret: ${mask(process.env.STRIPE_SECRET_KEY)}`);
  } catch (err) {
    console.log(`  FAIL  ${err.message}`);
    process.exit(1);
  }

  const defaultPrice = stripeCatalog.getDefaultEnrollmentPrice();
  if (defaultPrice?.priceId) {
    try {
      const price = await stripe.prices.retrieve(defaultPrice.priceId);
      console.log(`  ok  Default price ${price.id} (${price.unit_amount / 100} ${price.currency})`);
    } catch (err) {
      console.log(`  FAIL  Default price lookup: ${err.message}`);
      process.exit(1);
    }
  }

  console.log('\n  All checks passed.\n');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
