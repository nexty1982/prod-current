#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/sendProvisionEmail.js (OMD-955)
 *
 * Stubs nodemailer + ../config/db-compat + ./logger via require.cache
 * BEFORE requiring the SUT.
 *
 * Note: the SUT calls nodemailer.createTransporter (with the trailing 'er')
 * which is a typo — the real nodemailer API is createTransport. Our stub
 * provides the typo'd name to match what the code does. This is a
 * pre-existing bug in the SUT, out of scope for this test PR.
 *
 * Coverage:
 *   - sendProvisionEmail        queue lookup, language template lookup,
 *                               English fallback when template missing,
 *                               template-not-found error, var substitution
 *                               into subject + body, html conversion,
 *                               extraData merge, siteUrl from extraData
 *                               vs constructed, success path returns
 *                               {success:true,messageId,...}, logEmailSent
 *                               called, failure path returns
 *                               {success:false,error}, logEmailFailed called
 *   - sendCustomEmail           sendMail called with right options,
 *                               headers, success/failure
 *   - sendBulkEmails            iterates recipients, processes templates per
 *                               recipient, returns array of results
 *   - testEmailConfig           verify success / failure
 *   - getEmailTemplates         returns rows; query uses language; failure
 *   - updateEmailTemplate       UPDATE path (affectedRows > 0); INSERT path
 *                               when nothing updated; failure
 *   - initializeEmailSystem     calls initializeEmailLog (CREATE TABLE) +
 *                               testEmailConfig
 *
 * Run from server/: npx tsx src/utils/__tests__/sendProvisionEmail.test.ts
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

// ── stubs ────────────────────────────────────────────────────────────
type Query = { sql: string; params: any[] };
const queries: Query[] = [];
let queryReturns: any[] = []; // queue of return values
let queryErrorOnIndex: number | null = null;

function resetDb() {
  queries.length = 0;
  queryReturns = [];
  queryErrorOnIndex = null;
}

function nextReturn(): any {
  return queryReturns.length > 0 ? queryReturns.shift() : [[]];
}

const fakePool = {
  query: async (sql: string, params: any[] = []) => {
    queries.push({ sql, params });
    if (queryErrorOnIndex !== null && queries.length - 1 === queryErrorOnIndex) {
      throw new Error('pool query failure');
    }
    return nextReturn();
  },
};

const dbCompatPath = require.resolve('../../config/db-compat');
require.cache[dbCompatPath] = {
  id: dbCompatPath,
  filename: dbCompatPath,
  loaded: true,
  exports: {
    getAppPool: () => fakePool,
    pool: fakePool,
    getAuthPool: () => fakePool,
    getOmaiPool: () => fakePool,
  },
} as any;

// Logger stub
const loggerPath = require.resolve('../logger');
require.cache[loggerPath] = {
  id: loggerPath,
  filename: loggerPath,
  loaded: true,
  exports: {
    info: () => {},
    warn: () => {},
    error: () => {},
    debug: () => {},
  },
} as any;

// Nodemailer stub
type MailOptions = any;
const sentMails: MailOptions[] = [];
let sendMailReturn: any = { messageId: 'msg-123' };
let sendMailThrows = false;
let verifyThrows = false;

function resetMail() {
  sentMails.length = 0;
  sendMailReturn = { messageId: 'msg-123' };
  sendMailThrows = false;
  verifyThrows = false;
}

const fakeTransporter = {
  sendMail: async (opts: MailOptions) => {
    sentMails.push(opts);
    if (sendMailThrows) throw new Error('send failed');
    return sendMailReturn;
  },
  verify: async () => {
    if (verifyThrows) throw new Error('verify failed');
    return true;
  },
};

const nodemailerPath = require.resolve('nodemailer');
require.cache[nodemailerPath] = {
  id: nodemailerPath,
  filename: nodemailerPath,
  loaded: true,
  exports: {
    // SUT uses the typo'd name; real API is createTransport
    createTransporter: () => fakeTransporter,
    createTransport: () => fakeTransporter,
  },
} as any;

const SUT = require('../sendProvisionEmail');
const {
  sendProvisionEmail,
  sendCustomEmail,
  sendBulkEmails,
  testEmailConfig,
  getEmailTemplates,
  updateEmailTemplate,
  initializeEmailSystem,
} = SUT;

// Patch global setTimeout to fire immediately so bulk tests don't wait 1s/email
const origSetTimeout = global.setTimeout;
function fastTime() { (global as any).setTimeout = (fn: any) => { fn(); return 0 as any; }; }
function realTime() { (global as any).setTimeout = origSetTimeout; }

async function main() {

// ============================================================================
// sendProvisionEmail
// ============================================================================
console.log('\n── sendProvisionEmail ────────────────────────────────────');

// Successful path with native-language template
{
  resetDb();
  resetMail();
  // Q1: queue lookup, Q2: template lookup (found), Q3: log email sent
  queryReturns.push([[
    {
      id: 1,
      church_name: 'Holy Trinity',
      church_location: 'Brooklyn',
      contact_email: 'c@x.com',
      contact_name: 'John',
      site_slug: 'holy-trinity',
      admin_email: 'admin@holy-trinity.com',
      language_preference: 'en',
    },
  ]]);
  queryReturns.push([[
    {
      subject_template: 'Welcome {{contactName}} from {{churchName}}',
      body_template: 'Hi {{contactName}}, your church {{churchName}} at {{siteUrl}} is ready.',
    },
  ]]);
  queryReturns.push([{ insertId: 99 }]); // log insert

  const r = await sendProvisionEmail(1, 'welcome');
  assertEq(r.success, true, 'success');
  assertEq(r.messageId, 'msg-123', 'messageId');
  assertEq(r.recipient, 'admin@holy-trinity.com', 'recipient');
  assertEq(r.templateType, 'welcome', 'templateType');

  // Verify queue + template + log_email_sent queries
  assertEq(queries.length, 3, '3 queries: queue, template, log');
  assert(queries[0].sql.includes('church_provision_queue'), 'q1: queue lookup');
  assertEq(queries[0].params[0], 1, 'queueId param');
  assert(queries[1].sql.includes('provision_notification_templates'), 'q2: template lookup');
  assertEq(queries[1].params[0], 'en', 'language en');
  assertEq(queries[1].params[1], 'welcome', 'templateType welcome');
  assert(queries[2].sql.includes('INSERT INTO provision_email_log'), 'q3: log sent');
  // status is hardcoded literal 'sent' in the SQL, not a param
  assert(queries[2].sql.includes("'sent'"), "status = 'sent' literal in SQL");
  assertEq(queries[2].params[5], 'en', 'log language param');

  // Verify outgoing email
  assertEq(sentMails.length, 1, '1 email sent');
  const m = sentMails[0];
  assertEq(m.to, 'admin@holy-trinity.com', 'to');
  assertEq(m.subject, 'Welcome John from Holy Trinity', 'subject substituted');
  assert(m.text.includes('Hi John'), 'body includes contactName');
  assert(m.text.includes('Holy Trinity'), 'body includes churchName');
  // siteUrl was constructed from BASE_URL/churches/site_slug since no extraData.siteUrl
  assert(m.text.includes('/churches/holy-trinity'), 'siteUrl constructed from slug');
  assert(m.html.startsWith('<p>'), 'html wrapped in <p>');
  assertEq(m.headers['X-Church-Queue-ID'], 1, 'queue header');
  assertEq(m.headers['X-Church-Slug'], 'holy-trinity', 'slug header');
  assertEq(m.headers['X-Template-Type'], 'welcome', 'template header');
  assertEq(m.headers['X-Language'], 'en', 'language header');
}

// Language fallback to English when language template missing
{
  resetDb();
  resetMail();
  queryReturns.push([[
    {
      id: 2, church_name: 'St. Mary',
      site_slug: 'st-mary', admin_email: 'a@b.com',
      contact_name: null, language_preference: 'el',
    },
  ]]);
  queryReturns.push([[]]); // No Greek template
  queryReturns.push([[
    { subject_template: 'Greetings {{contactName}}', body_template: 'Body for {{churchName}}' },
  ]]); // English fallback
  queryReturns.push([{}]); // log

  const r = await sendProvisionEmail(2, 'welcome');
  assertEq(r.success, true, 'fallback success');
  assertEq(queries.length, 4, '4 queries: queue, language, english, log');
  assertEq(queries[1].params[0], 'el', 'first attempt: el');
  assert(queries[2].sql.includes("language_code = 'en'"), 'fallback to English');
  // contact_name was null → defaults to "Dear Friend"
  assertEq(sentMails[0].subject, 'Greetings Dear Friend', 'contactName default');
}

// Template missing in BOTH language and English → throws (caught) → returns failure
{
  resetDb();
  resetMail();
  queryReturns.push([[{ id: 3, admin_email: 'a@b.com', site_slug: 's' }]]);
  queryReturns.push([[]]); // language template empty
  queryReturns.push([[]]); // English fallback also empty
  queryReturns.push([{}]); // logEmailFailed insert

  const r = await sendProvisionEmail(3, 'no-such-type');
  assertEq(r.success, false, 'returns failure');
  assert(r.error.includes('No email template found'), 'error mentions template');
  assertEq(sentMails.length, 0, 'no email sent');
  // logEmailFailed should have been called
  const failLog = queries.find(q => q.sql.includes("'failed'"));
  assert(failLog !== undefined, 'logEmailFailed query issued');
}

// Queue entry not found → failure path
{
  resetDb();
  resetMail();
  queryReturns.push([[]]); // empty queue lookup
  queryReturns.push([{}]); // logEmailFailed
  const r = await sendProvisionEmail(999, 'welcome');
  assertEq(r.success, false, 'failure');
  assert(r.error.includes('not found'), 'error: not found');
}

// Email send failure → failure result + logEmailFailed
{
  resetDb();
  resetMail();
  sendMailThrows = true;
  queryReturns.push([[
    { id: 4, church_name: 'Test', site_slug: 't', admin_email: 'a@b.com', contact_name: 'X' },
  ]]);
  queryReturns.push([[
    { subject_template: 'S', body_template: 'B' },
  ]]);
  queryReturns.push([{}]);
  const r = await sendProvisionEmail(4, 'welcome');
  assertEq(r.success, false, 'send fail → failure');
  assert(r.error.includes('send failed'), 'error from sendMail');
}

// extraData.siteUrl overrides constructed URL
{
  resetDb();
  resetMail();
  queryReturns.push([[
    { id: 5, church_name: 'C', site_slug: 'c', admin_email: 'a@b.com', contact_name: 'X' },
  ]]);
  queryReturns.push([[
    { subject_template: 'S', body_template: 'URL: {{siteUrl}}' },
  ]]);
  queryReturns.push([{}]);
  const r = await sendProvisionEmail(5, 'welcome', { siteUrl: 'https://override.example/c' });
  assertEq(r.success, true, 'success with extraData');
  assertEq(sentMails[0].text, 'URL: https://override.example/c', 'extraData.siteUrl wins');
}

// extraData merged into template vars
{
  resetDb();
  resetMail();
  queryReturns.push([[
    { id: 6, church_name: 'C', site_slug: 'c', admin_email: 'a@b.com' },
  ]]);
  queryReturns.push([[
    { subject_template: 'S {{customField}}', body_template: 'B' },
  ]]);
  queryReturns.push([{}]);
  await sendProvisionEmail(6, 'welcome', { customField: 'XYZ' });
  assertEq(sentMails[0].subject, 'S XYZ', 'extraData substitutes');
}

// ============================================================================
// HTML conversion (verified through sendCustomEmail)
// ============================================================================
console.log('\n── HTML conversion ───────────────────────────────────────');

{
  resetMail();
  // Use trailing whitespace after URL/email so the [^\s]+ regex stops there
  // (without trailing space, the URL match would greedily consume <br></p>)
  await sendCustomEmail({
    to: 'a@b.com',
    subject: 'Subj',
    body: 'Hello\n\nworld\nNew line\n🔗 https://x.com end\n📧 user@x.com end\n**bold** end',
  });
  const m = sentMails[0];
  assert(m.html.startsWith('<p>'), 'wraps in <p>');
  assert(m.html.endsWith('</p>'), 'closes </p>');
  assert(m.html.includes('</p><p>'), 'double newline → paragraph break');
  assert(m.html.includes('<br>'), 'single newline → br');
  assert(m.html.includes('<a href="https://x.com"'), 'URL → anchor');
  assert(m.html.includes('<a href="mailto:user@x.com"'), 'email → mailto link');
  assert(m.html.includes('<strong>bold</strong>'), '**bold** → strong');
}

// ============================================================================
// sendCustomEmail
// ============================================================================
console.log('\n── sendCustomEmail ───────────────────────────────────────');

{
  resetMail();
  const r = await sendCustomEmail({
    to: 'x@y.com',
    subject: 'Hi',
    body: 'Hello',
    language: 'es',
    churchSlug: 'my-church',
  });
  assertEq(r.success, true, 'success');
  assertEq(r.messageId, 'msg-123', 'messageId');
  const m = sentMails[0];
  assertEq(m.to, 'x@y.com', 'to');
  assertEq(m.subject, 'Hi', 'subject');
  assertEq(m.text, 'Hello', 'text body');
  assertEq(m.headers['X-Language'], 'es', 'language header');
  assertEq(m.headers['X-Church-Slug'], 'my-church', 'church header');
  assertEq(m.headers['X-Email-Type'], 'custom', 'type header');
}

// Default language en, churchSlug null
{
  resetMail();
  await sendCustomEmail({ to: 'a@b.com', subject: 'S', body: 'B' });
  assertEq(sentMails[0].headers['X-Language'], 'en', 'default language');
  assertEq(sentMails[0].headers['X-Church-Slug'], null, 'null churchSlug');
}

// Failure
{
  resetMail();
  sendMailThrows = true;
  const r = await sendCustomEmail({ to: 'a@b.com', subject: 'S', body: 'B' });
  assertEq(r.success, false, 'failure');
  assert(r.error.includes('send failed'), 'error message');
}

// ============================================================================
// sendBulkEmails
// ============================================================================
console.log('\n── sendBulkEmails ────────────────────────────────────────');

// Two recipients, template substitution per recipient
{
  resetMail();
  fastTime();
  const r = await sendBulkEmails({
    recipients: [
      { email: 'a@x.com', name: 'Alice', churchSlug: 'a' },
      { email: 'b@x.com', name: 'Bob', churchSlug: 'b' },
    ],
    subject: 'Hi {{name}}',
    body: 'Hello {{name}}',
    language: 'en',
  });
  realTime();
  assertEq(r.length, 2, '2 results');
  assertEq(r[0].recipient, 'a@x.com', 'first recipient');
  assertEq(r[0].success, true, 'first success');
  assertEq(r[1].recipient, 'b@x.com', 'second recipient');
  assertEq(sentMails.length, 2, '2 mails sent');
  assertEq(sentMails[0].subject, 'Hi Alice', 'first subject substituted');
  assertEq(sentMails[1].subject, 'Hi Bob', 'second subject substituted');
  assertEq(sentMails[0].text, 'Hello Alice', 'first body substituted');
}

// Failure for one recipient does not stop the others
{
  resetMail();
  fastTime();
  // Make the first send throw, then succeed for the second
  let callCount = 0;
  const origSend = fakeTransporter.sendMail;
  fakeTransporter.sendMail = async (opts: MailOptions) => {
    callCount++;
    sentMails.push(opts);
    if (callCount === 1) throw new Error('first failed');
    return { messageId: 'msg-2' };
  };
  const r = await sendBulkEmails({
    recipients: [
      { email: 'a@x.com', name: 'A' },
      { email: 'b@x.com', name: 'B' },
    ],
    subject: 'S',
    body: 'B',
  });
  fakeTransporter.sendMail = origSend;
  realTime();
  assertEq(r.length, 2, '2 results');
  assertEq(r[0].success, false, 'first failed');
  assertEq(r[1].success, true, 'second succeeded');
}

// ============================================================================
// testEmailConfig
// ============================================================================
console.log('\n── testEmailConfig ───────────────────────────────────────');

{
  resetMail();
  const r = await testEmailConfig();
  assertEq(r.success, true, 'verify success');
}

{
  resetMail();
  verifyThrows = true;
  const r = await testEmailConfig();
  assertEq(r.success, false, 'verify failure');
  assert(r.error.includes('verify failed'), 'error message');
}

// ============================================================================
// getEmailTemplates
// ============================================================================
console.log('\n── getEmailTemplates ─────────────────────────────────────');

{
  resetDb();
  queryReturns.push([[
    { template_type: 'welcome', subject_template: 'S1', body_template: 'B1' },
    { template_type: 'reset', subject_template: 'S2', body_template: 'B2' },
  ]]);
  const r = await getEmailTemplates('en');
  assertEq(r.success, true, 'success');
  assertEq(r.templates.length, 2, '2 templates');
  assertEq(queries[0].params[0], 'en', 'language param');
}

// Default language
{
  resetDb();
  queryReturns.push([[]]);
  await getEmailTemplates();
  assertEq(queries[0].params[0], 'en', 'default language en');
}

// Failure
{
  resetDb();
  queryErrorOnIndex = 0;
  const r = await getEmailTemplates('fr');
  assertEq(r.success, false, 'failure');
  assert(r.error.includes('pool query failure'), 'error message');
}

// ============================================================================
// updateEmailTemplate
// ============================================================================
console.log('\n── updateEmailTemplate ───────────────────────────────────');

// Existing template — UPDATE only (affectedRows > 0)
{
  resetDb();
  queryReturns.push([{ affectedRows: 1 }]);
  const r = await updateEmailTemplate({
    language: 'en', templateType: 'welcome',
    subjectTemplate: 'NewS', bodyTemplate: 'NewB',
  });
  assertEq(r.success, true, 'success');
  assertEq(queries.length, 1, 'only UPDATE issued');
  assert(queries[0].sql.startsWith('\n      UPDATE') || queries[0].sql.includes('UPDATE provision_notification_templates'), 'UPDATE');
  assertEq(queries[0].params, ['NewS', 'NewB', 'en', 'welcome'], 'params order');
}

// Non-existing template — UPDATE then INSERT
{
  resetDb();
  queryReturns.push([{ affectedRows: 0 }]); // UPDATE
  queryReturns.push([{}]); // INSERT
  await updateEmailTemplate({
    language: 'el', templateType: 'reset',
    subjectTemplate: 'GS', bodyTemplate: 'GB',
  });
  assertEq(queries.length, 2, 'UPDATE + INSERT');
  assert(queries[1].sql.includes('INSERT INTO provision_notification_templates'), 'second is INSERT');
  assertEq(queries[1].params, ['el', 'reset', 'GS', 'GB'], 'INSERT params');
}

// Failure
{
  resetDb();
  queryErrorOnIndex = 0;
  const r = await updateEmailTemplate({
    language: 'en', templateType: 'welcome',
    subjectTemplate: 'X', bodyTemplate: 'Y',
  });
  assertEq(r.success, false, 'failure');
}

// ============================================================================
// initializeEmailSystem
// ============================================================================
console.log('\n── initializeEmailSystem ─────────────────────────────────');

{
  resetDb();
  resetMail();
  queryReturns.push([{}]); // CREATE TABLE
  const r = await initializeEmailSystem();
  assertEq(r.success, true, 'success');
  assertEq(queries.length, 1, 'CREATE TABLE called');
  assert(queries[0].sql.includes('CREATE TABLE IF NOT EXISTS provision_email_log'), 'creates log table');
}

// CREATE TABLE failure → still attempts testEmailConfig (logged but not blocking)
{
  resetDb();
  resetMail();
  queryErrorOnIndex = 0;
  const r = await initializeEmailSystem();
  assertEq(r.success, true, 'still returns success from testEmailConfig');
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
