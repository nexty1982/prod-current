#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/notifications.js (OMD-949)
 *
 * Thin wrappers + a NotificationSenders preset map. The module imports
 * `notificationService` from `../routes/notifications`. We stub that
 * route module via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - sendNotification        delegates to notificationService.createNotification;
 *                             on error returns null + logs
 *   - sendEmailNotification   delegates to queueEmailNotification;
 *                             on error returns null + logs
 *   - sendBothNotifications   calls both helpers; bundles ids; on error null
 *   - NotificationSenders     preset senders pass correct type/title/template
 *                             keys/options to underlying helpers
 *     · welcome
 *     · backupCompleted
 *     · backupFailed (high priority)
 *     · certificateReady
 *     · passwordReset (email-only, high priority)
 *     · loginAlert (in-app only)
 *     · profileUpdated (in-app only, low priority)
 *     · invoiceCreated
 *     · invoicePaid
 *     · systemMaintenance
 *     · noteShared
 *
 * Run from server/: npx tsx src/utils/__tests__/notifications.test.ts
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

// ── notificationService stub ─────────────────────────────────────────
type Call = { method: string; args: any[] };
const calls: Call[] = [];
let createReturn: any = 100;
let queueReturn: any = 200;
let createThrows = false;
let queueThrows = false;

function resetSvc() {
  calls.length = 0;
  createReturn = 100;
  queueReturn = 200;
  createThrows = false;
  queueThrows = false;
}

const notificationService = {
  createNotification: async (...args: any[]) => {
    calls.push({ method: 'createNotification', args });
    if (createThrows) throw new Error('create failed');
    return createReturn;
  },
  queueEmailNotification: async (...args: any[]) => {
    calls.push({ method: 'queueEmailNotification', args });
    if (queueThrows) throw new Error('queue failed');
    return queueReturn;
  },
};

const routesPath = require.resolve('../../routes/notifications');
require.cache[routesPath] = {
  id: routesPath,
  filename: routesPath,
  loaded: true,
  exports: { notificationService },
} as any;

const {
  sendNotification,
  sendEmailNotification,
  sendBothNotifications,
  NotificationSenders,
} = require('../notifications');

// Silence console
const origLog = console.log;
const origError = console.error;
function quiet() { console.log = () => {}; console.error = () => {}; }
function loud() { console.log = origLog; console.error = origError; }

async function main() {

// ============================================================================
// sendNotification
// ============================================================================
console.log('\n── sendNotification ──────────────────────────────────────');

resetSvc();
{
  const id = await sendNotification(42, 'welcome', 'Hi', 'Hello world', { priority: 'high' });
  assertEq(id, 100, 'returns createNotification result');
  assertEq(calls.length, 1, 'one call');
  assertEq(calls[0].method, 'createNotification', 'correct method');
  assertEq(calls[0].args[0], 42, 'userId passed');
  assertEq(calls[0].args[1], 'welcome', 'type passed');
  assertEq(calls[0].args[2], 'Hi', 'title passed');
  assertEq(calls[0].args[3], 'Hello world', 'message passed');
  assertEq(calls[0].args[4].priority, 'high', 'options passed');
}

// Default options
resetSvc();
{
  await sendNotification(1, 't', 'T', 'M');
  assertEq(calls[0].args[4], {}, 'default options = {}');
}

// Error → returns null
resetSvc();
createThrows = true;
quiet();
{
  const id = await sendNotification(1, 't', 'T', 'M');
  loud();
  assertEq(id, null, 'error → null');
}

// ============================================================================
// sendEmailNotification
// ============================================================================
console.log('\n── sendEmailNotification ─────────────────────────────────');

resetSvc();
{
  const id = await sendEmailNotification(7, 'invoice', { amount: 100 }, { priority: 'high' });
  assertEq(id, 200, 'returns queueEmailNotification result');
  assertEq(calls[0].method, 'queueEmailNotification', 'correct method');
  assertEq(calls[0].args[0], 7, 'userId passed');
  assertEq(calls[0].args[1], 'invoice', 'type passed');
  assertEq(calls[0].args[2].amount, 100, 'templateData passed');
  assertEq(calls[0].args[3].priority, 'high', 'options passed');
}

// Error → null
resetSvc();
queueThrows = true;
quiet();
{
  const id = await sendEmailNotification(1, 't', {});
  loud();
  assertEq(id, null, 'error → null');
}

// ============================================================================
// sendBothNotifications
// ============================================================================
console.log('\n── sendBothNotifications ─────────────────────────────────');

resetSvc();
createReturn = 555;
queueReturn = 777;
{
  const result = await sendBothNotifications(
    9, 'welcome', 'Hi', 'Msg', { name: 'Bob' }, { priority: 'normal' }
  );
  assertEq(result.notificationId, 555, 'notificationId');
  assertEq(result.emailId, 777, 'emailId');
  assertEq(calls.length, 2, 'both helpers called');
  assertEq(calls[0].method, 'createNotification', 'create called first');
  assertEq(calls[1].method, 'queueEmailNotification', 'queue called second');
}

// Even if create fails, sendNotification swallows → null id, queue still runs
resetSvc();
createThrows = true;
queueReturn = 999;
quiet();
{
  const result = await sendBothNotifications(1, 't', 'T', 'M', {});
  loud();
  assertEq(result.notificationId, null, 'create failed → null id');
  assertEq(result.emailId, 999, 'email still sent (error swallowed)');
}

// ============================================================================
// NotificationSenders.welcome
// ============================================================================
console.log('\n── NotificationSenders.welcome ───────────────────────────');

resetSvc();
await NotificationSenders.welcome(10, { name: 'Alice', email: 'a@b.com', church_name: 'Holy Trinity' });
{
  assertEq(calls.length, 2, 'sends both');
  const create = calls[0];
  assertEq(create.args[0], 10, 'userId');
  assertEq(create.args[1], 'welcome', 'type = welcome');
  assertEq(create.args[2], 'Welcome to Orthodox Metrics!', 'title');
  const queue = calls[1];
  assertEq(queue.args[2].user_name, 'Alice', 'template user_name = name');
  assertEq(queue.args[2].email, 'a@b.com', 'template email');
  assertEq(queue.args[2].church_name, 'Holy Trinity', 'template church_name');
  assertEq(create.args[4].priority, 'normal', 'priority normal');
  assertEq(create.args[4].actionUrl, '/dashboard', 'actionUrl');
}

// welcome falls back to email if name missing
resetSvc();
await NotificationSenders.welcome(11, { email: 'no-name@b.com' });
{
  const queue = calls[1];
  assertEq(queue.args[2].user_name, 'no-name@b.com', 'falls back to email');
  assertEq(queue.args[2].church_name, '', 'church_name defaults to ""');
}

// ============================================================================
// NotificationSenders.backupCompleted / backupFailed
// ============================================================================
console.log('\n── NotificationSenders.backup ────────────────────────────');

resetSvc();
await NotificationSenders.backupCompleted(1, {
  size: '50MB', duration: '5s', file_count: 100, date: '2026-04-10',
});
{
  assertEq(calls[0].args[1], 'backup_completed', 'type backup_completed');
  assert(calls[0].args[3].includes('50MB'), 'message includes size');
  assert(calls[0].args[3].includes('5s'), 'message includes duration');
  assertEq(calls[1].args[2].file_count, 100, 'template file_count');
  assertEq(calls[0].args[4].priority, 'normal', 'priority normal');
}

resetSvc();
await NotificationSenders.backupFailed(1, { message: 'disk full', date: '2026-04-10' });
{
  assertEq(calls[0].args[1], 'backup_failed', 'type backup_failed');
  assert(calls[0].args[3].includes('disk full'), 'message includes error');
  assertEq(calls[0].args[4].priority, 'high', 'high priority on failure');
}

// ============================================================================
// NotificationSenders.certificateReady
// ============================================================================
console.log('\n── NotificationSenders.certificateReady ──────────────────');

resetSvc();
await NotificationSenders.certificateReady(2, {
  type: 'baptism', person_name: 'John Doe', date: '2026-01-15', id: 99,
});
{
  assertEq(calls[0].args[1], 'certificate_ready', 'type');
  assert(calls[0].args[3].includes('baptism'), 'message includes type');
  assert(calls[0].args[3].includes('John Doe'), 'message includes name');
  assertEq(calls[0].args[4].actionUrl, '/certificates/99', 'actionUrl with id');
}

// ============================================================================
// NotificationSenders.passwordReset (email only)
// ============================================================================
console.log('\n── NotificationSenders.passwordReset ─────────────────────');

resetSvc();
await NotificationSenders.passwordReset(3, {
  user_name: 'jane', reset_link: 'https://x/reset', expiry_time: '1h',
});
{
  assertEq(calls.length, 1, 'only one call (email-only)');
  assertEq(calls[0].method, 'queueEmailNotification', 'email only');
  assertEq(calls[0].args[1], 'password_reset', 'type');
  assertEq(calls[0].args[2].reset_link, 'https://x/reset', 'reset_link in template');
  assertEq(calls[0].args[3].priority, 'high', 'high priority');
}

// ============================================================================
// NotificationSenders.loginAlert (in-app only)
// ============================================================================
console.log('\n── NotificationSenders.loginAlert ────────────────────────');

resetSvc();
await NotificationSenders.loginAlert(4, { location: 'NYC', time: '12:00' });
{
  assertEq(calls.length, 1, 'one call (in-app only)');
  assertEq(calls[0].method, 'createNotification', 'in-app only');
  assertEq(calls[0].args[1], 'login_alert', 'type');
  assert(calls[0].args[3].includes('NYC'), 'message includes location');
  assertEq(calls[0].args[4].data.location, 'NYC', 'data.location');
}

// ============================================================================
// NotificationSenders.profileUpdated
// ============================================================================
console.log('\n── NotificationSenders.profileUpdated ────────────────────');

resetSvc();
await NotificationSenders.profileUpdated(5);
{
  assertEq(calls.length, 1, 'in-app only');
  assertEq(calls[0].args[1], 'profile_updated', 'type');
  assertEq(calls[0].args[4].priority, 'low', 'low priority');
  assertEq(calls[0].args[4].actionUrl, '/profile', 'actionUrl');
}

// ============================================================================
// NotificationSenders.invoiceCreated / invoicePaid
// ============================================================================
console.log('\n── NotificationSenders.invoice ───────────────────────────');

resetSvc();
await NotificationSenders.invoiceCreated(6, {
  invoice_number: 'INV-001', amount: 99.99, due_date: '2026-04-30', id: 42,
});
{
  assertEq(calls[0].args[1], 'invoice_created', 'type created');
  assert(calls[0].args[3].includes('INV-001'), 'message includes invoice');
  assert(calls[0].args[3].includes('99.99'), 'message includes amount');
  assertEq(calls[0].args[4].actionUrl, '/invoices/42', 'actionUrl');
}

resetSvc();
await NotificationSenders.invoicePaid(6, {
  invoice_number: 'INV-002', amount: 50, payment_date: '2026-04-10', id: 43,
});
{
  assertEq(calls[0].args[1], 'invoice_paid', 'type paid');
  assert(calls[0].args[3].includes('INV-002'), 'message includes invoice');
  assertEq(calls[0].args[4].actionUrl, '/invoices/43', 'actionUrl');
}

// ============================================================================
// NotificationSenders.systemMaintenance
// ============================================================================
console.log('\n── NotificationSenders.systemMaintenance ─────────────────');

resetSvc();
await NotificationSenders.systemMaintenance(8, {
  start_time: '02:00', end_time: '04:00', description: 'DB upgrade',
});
{
  assertEq(calls[0].args[1], 'system_maintenance', 'type');
  assert(calls[0].args[3].includes('02:00'), 'message includes start');
  assert(calls[0].args[3].includes('04:00'), 'message includes end');
  assertEq(calls[1].args[2].description, 'DB upgrade', 'template description');
  assertEq(calls[0].args[4].priority, 'high', 'high priority');
}

// ============================================================================
// NotificationSenders.noteShared
// ============================================================================
console.log('\n── NotificationSenders.noteShared ────────────────────────');

resetSvc();
await NotificationSenders.noteShared(9, {
  sharer_name: 'Bob', note_title: 'My Note', note_id: 12,
});
{
  assertEq(calls.length, 1, 'in-app only');
  assertEq(calls[0].args[1], 'note_shared', 'type');
  assert(calls[0].args[3].includes('Bob'), 'message includes sharer');
  assert(calls[0].args[3].includes('My Note'), 'message includes title');
  assertEq(calls[0].args[4].actionUrl, '/notes/12', 'actionUrl with note_id');
  assertEq(calls[0].args[4].data.note_title, 'My Note', 'data has note_title');
}

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
} // end main()

main().catch((e) => {
  console.error('Unhandled test error:', e);
  process.exit(1);
});
