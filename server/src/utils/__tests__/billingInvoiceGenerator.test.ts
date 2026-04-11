#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/billingInvoiceGenerator.js (OMD-944)
 *
 * BillingInvoiceGenerator class with these methods:
 *   - loadTranslations()       Constructor reads en/gr/ru/ro JSON files
 *                              from server/data/i18n/billing/
 *   - formatCurrency()         Intl.NumberFormat with locale → currency,
 *                              fallback "USD 12.34" on error
 *   - formatDate()             toLocaleDateString with year/month/day,
 *                              fallback to default toLocaleDateString
 *   - getTranslation()         Nested key lookup ("a.b.c"), falls back to
 *                              English then to the raw key
 *   - generateBillingInvoice() Returns HTML string with all fields
 *   - generateSampleBillingInvoice() Convenience: built-in sample data
 *
 * Strategy: monkey-patch fs.existsSync + fs.readFileSync to serve canned
 * i18n JSON. The class is instantiated AFTER stubs are installed so the
 * constructor's loadTranslations sees the fakes. fs is restored at the end.
 *
 * Run from server/: npx tsx src/utils/__tests__/billingInvoiceGenerator.test.ts
 */

let passed = 0;
let failed = 0;

function assert(cond: any, message: string): void {
  if (cond) { console.log(`  PASS: ${message}`); passed++; }
  else { console.error(`  FAIL: ${message}`); failed++; }
}

function assertEq<T>(actual: T, expected: T, message: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) { console.log(`  PASS: ${message}`); passed++; }
  else {
    console.error(`  FAIL: ${message}\n         expected: ${e}\n         actual:   ${a}`);
    failed++;
  }
}

// ── fs stubs ───────────────────────────────────────────────────────
const fs = require('fs');
const origExistsSync = fs.existsSync;
const origReadFileSync = fs.readFileSync;

// Canned i18n: en (full), gr (partial), no ru/ro files
const FAKE_I18N: Record<string, any> = {
  en: {
    billing: {
      invoice: {
        title: 'Invoice',
        date: 'Date',
        due_date: 'Due Date',
        status: 'Status',
        billing_address: 'Billing Address',
        service_period: 'Service Period',
        payment_terms: 'Payment Terms',
        description: 'Description',
        quantity: 'Quantity',
        unit_price: 'Unit Price',
        line_total: 'Total',
        subtotal: 'Subtotal',
        tax: 'Tax',
        total: 'Total',
        notes: 'Notes',
        thank_you: 'Thank you for your business!',
      },
      payment: {
        title: 'Payment Information',
        status: { pending: 'Pending', paid: 'Paid', failed: 'Failed' },
      },
    },
  },
  gr: {
    billing: { invoice: { title: 'Τιμολόγιο' } },
  },
};

const i18nPaths = new Set<string>();
for (const locale of ['en', 'gr', 'ru', 'ro']) {
  // Path is server/data/i18n/billing/<locale>.json relative to utils/
  const p = require('path').join(__dirname, '..', '..', '..', 'data', 'i18n', 'billing', `${locale}.json`);
  i18nPaths.add(p);
}

fs.existsSync = (p: string): boolean => {
  if (!i18nPaths.has(p)) return origExistsSync(p);
  // Only en + gr "exist"
  return p.endsWith('en.json') || p.endsWith('gr.json');
};

fs.readFileSync = (p: string, encoding?: any): any => {
  if (!i18nPaths.has(p)) return origReadFileSync(p, encoding);
  if (p.endsWith('en.json')) return JSON.stringify(FAKE_I18N.en);
  if (p.endsWith('gr.json')) return JSON.stringify(FAKE_I18N.gr);
  throw new Error('not found');
};

// Now require the SUT
const { BillingInvoiceGenerator } = require('../billingInvoiceGenerator');

const gen = new BillingInvoiceGenerator();

// ============================================================================
// loadTranslations (called by constructor)
// ============================================================================
console.log('\n── loadTranslations ──────────────────────────────────────');

assertEq(typeof (gen as any).translations, 'object', 'translations object on instance');
assertEq((gen as any).translations.en?.billing?.invoice?.title, 'Invoice', 'en translations loaded');
assertEq((gen as any).translations.gr?.billing?.invoice?.title, 'Τιμολόγιο', 'gr translations loaded');
// ru and ro files don't exist, so the keys are not present (not assigned)
assertEq((gen as any).translations.ru, undefined, 'ru not loaded (file missing)');
assertEq((gen as any).translations.ro, undefined, 'ro not loaded (file missing)');

// ============================================================================
// formatCurrency
// ============================================================================
console.log('\n── formatCurrency ────────────────────────────────────────');

// USD en (Intl uses Node ICU)
{
  const out = gen.formatCurrency(59.99, 'USD', 'en');
  assert(out.includes('59.99'), 'USD 59.99 formatted, contains 59.99');
  assert(out.includes('$') || out.includes('USD'), 'contains $ or USD');
}

// EUR
{
  const out = gen.formatCurrency(100, 'EUR', 'en');
  assert(out.includes('100'), 'EUR 100 contains 100');
}

// Currency lowercased input → uppercased
{
  const out = gen.formatCurrency(50, 'usd', 'en');
  assert(out.includes('50'), 'lowercase usd handled');
}

// Unknown locale → defaults to en-US (no throw)
{
  const out = gen.formatCurrency(10, 'USD', 'xx');
  assert(typeof out === 'string' && out.length > 0, 'unknown locale falls back');
}

// Invalid currency → fallback formatting "INVALID 12.34"
{
  const out = gen.formatCurrency(12.34, 'NOT_A_CURRENCY', 'en');
  assert(out.includes('12.34'), 'fallback contains amount');
  assert(out.toUpperCase().includes('NOT_A_CURRENCY'), 'fallback contains currency code');
}

// Default currency = USD
{
  const out = gen.formatCurrency(7);
  assert(typeof out === 'string', 'default currency works');
}

// ============================================================================
// formatDate
// ============================================================================
console.log('\n── formatDate ────────────────────────────────────────────');

{
  const d = new Date('2026-04-10T00:00:00Z');
  const out = gen.formatDate(d, 'en');
  assert(typeof out === 'string' && out.length > 0, 'returns string');
  assert(out.includes('2026'), 'contains year');
}

{
  const out = gen.formatDate('2026-04-10', 'en');
  assert(out.includes('2026'), 'string date input works');
}

// Unknown locale → en-US fallback (no throw)
{
  const out = gen.formatDate(new Date('2026-01-15'), 'xx');
  assert(out.includes('2026'), 'unknown locale falls back to en-US');
}

// Default locale = en
{
  const out = gen.formatDate(new Date('2026-06-01'));
  assert(out.includes('2026'), 'default locale works');
}

// ============================================================================
// getTranslation
// ============================================================================
console.log('\n── getTranslation ────────────────────────────────────────');

assertEq(gen.getTranslation('billing.invoice.title', 'en'), 'Invoice', 'en lookup');
assertEq(gen.getTranslation('billing.invoice.title', 'gr'), 'Τιμολόγιο', 'gr lookup');

// Missing locale → fallback to en
assertEq(gen.getTranslation('billing.invoice.title', 'ru'), 'Invoice', 'missing locale → en fallback');
assertEq(gen.getTranslation('billing.invoice.title', 'ro'), 'Invoice', 'ro → en fallback');

// Deep nested key
assertEq(gen.getTranslation('billing.payment.status.pending', 'en'), 'Pending', 'deep nested key');
assertEq(gen.getTranslation('billing.payment.status.paid', 'en'), 'Paid', 'paid status');
assertEq(gen.getTranslation('billing.payment.status.failed', 'en'), 'Failed', 'failed status');

// Missing key → returns the raw key
assertEq(gen.getTranslation('does.not.exist', 'en'), 'does.not.exist', 'missing key → key');
assertEq(gen.getTranslation('billing.invoice.unknown', 'en'), 'billing.invoice.unknown', 'partial miss → key');

// gr has only billing.invoice.title — other keys fall to ... key (NOT en).
// Source: only `translations[locale] || translations['en']` is consulted
// at lookup START. If locale exists, the en fallback is not used for missing
// sub-keys. This is the documented quirk.
assertEq(
  gen.getTranslation('billing.invoice.date', 'gr'),
  'billing.invoice.date',
  'gr partial: missing sub-key → raw key (no en fallback per-key)'
);

// Default locale = en
assertEq(gen.getTranslation('billing.invoice.title'), 'Invoice', 'default locale = en');

// ============================================================================
// generateBillingInvoice
// ============================================================================
console.log('\n── generateBillingInvoice ────────────────────────────────');

const sampleInvoice = {
  invoiceNumber: 'INV-2026-001',
  date: new Date('2026-04-01T00:00:00Z'),
  dueDate: new Date('2026-04-15T00:00:00Z'),
  church: {
    name: 'Holy Trinity Church',
    address: '123 Main St',
    city: 'Anytown, USA',
    country: 'United States',
  },
  items: [
    { description: 'Plus Plan', quantity: 1, unitPrice: 59.99, total: 59.99 },
    { description: 'OCR Add-on', quantity: 2, unitPrice: 10, total: 20 },
  ],
  subtotal: 79.99,
  tax: 6.40,
  total: 86.39,
  currency: 'USD',
  status: 'pending',
  notes: 'Thank you for your business.',
};

const html = gen.generateBillingInvoice(sampleInvoice, 'en');

// Shape
assert(html.startsWith('\n<!DOCTYPE html>'), 'starts with DOCTYPE');
assert(html.includes('<html lang="en">'), 'html lang attr');
assert(html.includes('</html>'), 'closing html tag');
assert(html.includes('<style>'), 'inline style block');
assert(html.includes('</body>'), 'body close');

// Invoice metadata rendered
assert(html.includes('INV-2026-001'), 'invoice number rendered');
assert(html.includes('Invoice'), 'translated title rendered');
assert(html.includes('2026'), 'date year rendered');
assert(html.includes('status-pending'), 'status badge class includes status');
assert(html.includes('Pending'), 'status label translated');

// Church info
assert(html.includes('Holy Trinity Church'), 'church name');
assert(html.includes('123 Main St'), 'address');
assert(html.includes('Anytown, USA'), 'city');
assert(html.includes('United States'), 'country');

// Items
assert(html.includes('Plus Plan'), 'item 1 description');
assert(html.includes('OCR Add-on'), 'item 2 description');
assert(html.includes('59.99'), 'item 1 price');
assert(html.includes('20'), 'item 2 total');

// Totals
assert(html.includes('86.39'), 'invoice total rendered');
assert(html.includes('79.99'), 'subtotal rendered');
assert(html.includes('6.4') || html.includes('6.40'), 'tax rendered');

// Notes
assert(html.includes('Thank you for your business.'), 'notes rendered');

// Currency
assert(html.includes('USD'), 'currency code');

// SOURCE QUIRK: logoUrl is computed but never inserted into the template.
// Documented here so any future change that wires it in will surface this test.
assert(!html.includes('data:image/svg+xml;base64,'), 'logoUrl unused in template (source quirk)');

// ============================================================================
// generateBillingInvoice: optional fields omitted gracefully
// ============================================================================
console.log('\n── generateBillingInvoice: optional fields ───────────────');

{
  const minimal = {
    invoiceNumber: 'X-1',
    date: new Date('2026-04-01'),
    dueDate: new Date('2026-04-15'),
    church: { name: 'Bare Church' }, // no address/city/country
    items: [{ description: 'Item', quantity: 1, unitPrice: 10, total: 10 }],
    subtotal: 10,
    tax: 0, // zero tax → tax row should be omitted
    total: 10,
    currency: 'USD',
    status: 'paid',
    // no notes
  };
  const out = gen.generateBillingInvoice(minimal, 'en');

  assert(out.includes('Bare Church'), 'minimal church renders');
  // tax === 0 → no Tax row (per `${invoiceData.tax > 0 ? ... : ''}`)
  assert(!out.includes('>Tax:<'), 'no Tax row when tax = 0');
  // No notes section. Note: `.payment-terms` appears in the inline CSS
  // unconditionally, so check the wrapping <div class="payment-terms">.
  assert(!out.includes('<div class="payment-terms">'), 'no notes div when notes empty');
  // status badge for paid
  assert(out.includes('status-paid'), 'paid status badge');
  assert(out.includes('Paid'), 'paid status label');
}

// Failed status
{
  const fail = {
    invoiceNumber: 'X-2', date: new Date(), dueDate: new Date(),
    church: { name: 'C' }, items: [], subtotal: 0, tax: 0, total: 0,
    currency: 'USD', status: 'failed',
  };
  const out = gen.generateBillingInvoice(fail, 'en');
  assert(out.includes('status-failed'), 'failed status badge');
  assert(out.includes('Failed'), 'failed status label');
}

// Locale propagation: gr lang attr
{
  const out = gen.generateBillingInvoice(sampleInvoice, 'gr');
  assert(out.includes('<html lang="gr">'), 'gr lang attribute');
  // Title falls back to gr translation we provided
  assert(out.includes('Τιμολόγιο'), 'gr title used');
}

// ============================================================================
// generateSampleBillingInvoice
// ============================================================================
console.log('\n── generateSampleBillingInvoice ──────────────────────────');

{
  const out = gen.generateSampleBillingInvoice('en');
  assert(out.startsWith('\n<!DOCTYPE html>'), 'sample is HTML');
  assert(out.includes('Saints Peter & Paul'), 'sample uses Saints Peter & Paul');
  assert(out.includes('INV-202507-001'), 'sample invoice number');
  assert(out.includes('Plus Plan'), 'sample plus plan item');
  assert(out.includes('59.99'), 'sample subtotal');
  assert(out.includes('65.39'), 'sample total');
  assert(out.includes('Manville'), 'sample city');
}

// Default locale = en
{
  const out = gen.generateSampleBillingInvoice();
  assert(out.includes('<html lang="en">'), 'default sample lang = en');
}

// ============================================================================
// Restore fs and exit
// ============================================================================
fs.existsSync = origExistsSync;
fs.readFileSync = origReadFileSync;

console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
