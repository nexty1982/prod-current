#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/emailSender.js (OMD-956)
 *
 * EmailSender class — module exports `new EmailSender()`. Constructor calls
 * nodemailer.createTransport immediately, so we stub nodemailer + ./logger
 * via require.cache BEFORE requiring the SUT.
 *
 * Coverage:
 *   - sendUploadReceipt       sendMail invoked with correct from/to/subject/
 *                             text/html/headers; success returns
 *                             {success,messageId}; throws on send error
 *   - getLocalizedSubject     en/gr/ru/ro + unknown → en fallback
 *   - generateReceiptHTML     contains successful + failed files; download
 *                             buttons only when successes; localized labels;
 *                             URL-encoded sessionId in download links;
 *                             text preview truncation at 200 chars
 *   - generateReceiptText     plain-text version with sections; download
 *                             URLs; failed errors; truncates preview at 100
 *                             chars; missing fields default to 0/N/A
 *   - getTranslations         returns en for unknown language; correct
 *                             translations for each known language
 *   - getLanguageName         known + unknown (uppercases code)
 *   - testConnection          verify success → true; failure → false
 *
 * Run from server/: npx tsx src/utils/__tests__/emailSender.test.ts
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
const sentMails: any[] = [];
let sendMailReturn: any = { messageId: 'msg-abc' };
let sendMailThrows = false;
let verifyThrows = false;

function resetMail() {
  sentMails.length = 0;
  sendMailReturn = { messageId: 'msg-abc' };
  sendMailThrows = false;
  verifyThrows = false;
}

const fakeTransporter = {
  sendMail: async (opts: any) => {
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
    createTransport: () => fakeTransporter,
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

const emailSender = require('../emailSender');

async function main() {

// ============================================================================
// getLocalizedSubject
// ============================================================================
console.log('\n── getLocalizedSubject ───────────────────────────────────');

assertEq(emailSender.getLocalizedSubject('en'), 'OCR Processing Complete - Orthodox Metrics', 'en subject');
assertEq(emailSender.getLocalizedSubject('gr'), 'Ολοκλήρωση Επεξεργασίας OCR - Orthodox Metrics', 'gr subject');
assertEq(emailSender.getLocalizedSubject('ru'), 'Обработка OCR завершена - Orthodox Metrics', 'ru subject');
assertEq(emailSender.getLocalizedSubject('ro'), 'Procesarea OCR finalizată - Orthodox Metrics', 'ro subject');
assertEq(emailSender.getLocalizedSubject('xx'), 'OCR Processing Complete - Orthodox Metrics', 'unknown → en fallback');
assertEq(emailSender.getLocalizedSubject(undefined), 'OCR Processing Complete - Orthodox Metrics', 'undefined → en fallback');

// ============================================================================
// getLanguageName
// ============================================================================
console.log('\n── getLanguageName ───────────────────────────────────────');

assertEq(emailSender.getLanguageName('en'), 'English', 'en');
assertEq(emailSender.getLanguageName('gr'), 'Ελληνικά', 'gr');
assertEq(emailSender.getLanguageName('ru'), 'Русский', 'ru');
assertEq(emailSender.getLanguageName('ro'), 'Română', 'ro');
assertEq(emailSender.getLanguageName('fr'), 'FR', 'unknown → uppercase code');
assertEq(emailSender.getLanguageName('de'), 'DE', 'another unknown');

// ============================================================================
// getTranslations
// ============================================================================
console.log('\n── getTranslations ───────────────────────────────────────');

{
  const en = emailSender.getTranslations('en');
  assertEq(en.title, 'OCR Processing Complete', 'en title');
  assertEq(en.successful, 'Successful', 'en successful');

  const gr = emailSender.getTranslations('gr');
  assertEq(gr.title, 'Ολοκλήρωση Επεξεργασίας OCR', 'gr title');

  const ru = emailSender.getTranslations('ru');
  assertEq(ru.title, 'Обработка OCR завершена', 'ru title');

  const ro = emailSender.getTranslations('ro');
  assertEq(ro.title, 'Procesarea OCR finalizată', 'ro title');

  // Unknown → en
  const unknown = emailSender.getTranslations('xx');
  assertEq(unknown.title, 'OCR Processing Complete', 'unknown → en');
}

// ============================================================================
// generateReceiptText
// ============================================================================
console.log('\n── generateReceiptText ───────────────────────────────────');

{
  const data = {
    sessionId: 'sess-1',
    timestamp: '2026-04-10T12:00:00.000Z',
    language: 'en',
    uploadResults: [
      { success: true, filename: 'a.jpg', confidence: 0.95, processingTime: 5000, text: 'Hello world' },
      { success: true, filename: 'b.jpg', confidence: 0.80, processingTime: 3000 },
      { success: false, filename: 'c.jpg', error: 'OCR failure' },
    ],
  };
  const text = emailSender.generateReceiptText(data);
  assert(text.includes('OCR Processing Complete'), 'title present');
  assert(text.includes('Session ID: sess-1'), 'sessionId line');
  assert(text.includes('Language: English'), 'language name');
  assert(text.includes('Total Files: 3'), 'total = 3');
  assert(text.includes('Successful: 2'), 'successful = 2');
  assert(text.includes('Failed: 1'), 'failed = 1');
  assert(text.includes('• a.jpg'), 'a.jpg listed');
  assert(text.includes('Confidence: 1%'), 'confidence rounded (Math.round(0.95))');
  assert(text.includes('Processing Time: 5s'), 'processingTime rounded to seconds');
  assert(text.includes('Text Preview: Hello world...'), 'text preview present');
  assert(text.includes('• c.jpg'), 'failed file listed');
  assert(text.includes('Error: OCR failure'), 'failure error');
  assert(text.includes('/api/ocr/download/sess-1/pdf'), 'pdf download URL');
  assert(text.includes('/api/ocr/download/sess-1/xlsx'), 'xlsx download URL');
  assert(text.includes('automated message'), 'footer text');
}

// No successful uploads → no download section
{
  const text = emailSender.generateReceiptText({
    sessionId: 's', timestamp: Date.now(), language: 'en',
    uploadResults: [{ success: false, filename: 'x.jpg', error: 'oops' }],
  });
  assert(!text.includes('/api/ocr/download'), 'no download URLs without successes');
  assert(!text.includes('Successfully Processed Files'), 'no successful section');
  assert(text.includes('Failed Files'), 'has failed section');
}

// All successful → no failed section
{
  const text = emailSender.generateReceiptText({
    sessionId: 's', timestamp: Date.now(), language: 'en',
    uploadResults: [{ success: true, filename: 'a.jpg', confidence: 0.5, processingTime: 1000 }],
  });
  assert(!text.includes('Failed Files'), 'no failed section when all succeed');
}

// Long text truncation (text preview is substring 0..100 + '...')
{
  const longText = 'a'.repeat(200);
  const text = emailSender.generateReceiptText({
    sessionId: 's', timestamp: Date.now(), language: 'en',
    uploadResults: [
      { success: true, filename: 'a.jpg', confidence: 1, processingTime: 0, text: longText },
    ],
  });
  // The substring is 100 chars (exactly), then '...'
  const idx = text.indexOf('Text Preview: ');
  const slice = text.substring(idx + 'Text Preview: '.length, idx + 'Text Preview: '.length + 105);
  assert(slice.startsWith('a'.repeat(100) + '...'), 'preview truncated to 100 chars + ...');
}

// Missing optional fields default to 0
{
  const text = emailSender.generateReceiptText({
    sessionId: 's', timestamp: Date.now(), language: 'en',
    uploadResults: [
      { success: true, filename: 'a.jpg' },  // no confidence/processingTime/text
    ],
  });
  assert(text.includes('Confidence: 0%'), 'confidence defaults 0');
  assert(text.includes('Processing Time: 0s'), 'processingTime defaults 0');
  assert(!text.includes('Text Preview'), 'no preview when no text');
}

// Localized text
{
  const text = emailSender.generateReceiptText({
    sessionId: 's', timestamp: Date.now(), language: 'gr',
    uploadResults: [{ success: true, filename: 'a.jpg', confidence: 1, processingTime: 1000 }],
  });
  assert(text.includes('Ολοκλήρωση Επεξεργασίας OCR'), 'gr title');
  assert(text.includes('Συνολικά Αρχεία: 1'), 'gr total label');
}

// ============================================================================
// generateReceiptHTML
// ============================================================================
console.log('\n── generateReceiptHTML ───────────────────────────────────');

{
  const data = {
    sessionId: 'sess-2',
    timestamp: '2026-04-10T00:00:00.000Z',
    language: 'en',
    uploadResults: [
      { success: true, filename: 'win.jpg', confidence: 0.9, processingTime: 4000, text: 'short text' },
      { success: false, filename: 'fail.jpg', error: 'bad image' },
    ],
  };
  const html = emailSender.generateReceiptHTML(data);
  assert(html.includes('<!DOCTYPE html>'), 'has doctype');
  assert(html.includes('OCR Processing Complete'), 'title');
  assert(html.includes('sess-2'), 'sessionId rendered');
  assert(html.includes('English'), 'language name');
  assert(html.includes('win.jpg'), 'success file rendered');
  assert(html.includes('fail.jpg'), 'failed file rendered');
  assert(html.includes('bad image'), 'error rendered');
  assert(html.includes('short text'), 'preview text rendered');
  assert(html.includes('Successfully Processed Files'), 'successful section');
  assert(html.includes('Failed Files'), 'failed section');
  assert(html.includes('/api/ocr/download/sess-2/pdf'), 'pdf link');
  assert(html.includes('/api/ocr/download/sess-2/xlsx'), 'xlsx link');
  assert(html.includes('class="file-result failed"'), 'failed file has failed class');
}

// HTML preview truncation at 200 chars (with '...')
{
  const longText = 'b'.repeat(300);
  const html = emailSender.generateReceiptHTML({
    sessionId: 's',
    timestamp: Date.now(),
    language: 'en',
    uploadResults: [{ success: true, filename: 'x.jpg', confidence: 1, processingTime: 0, text: longText }],
  });
  // Should contain 200 b's followed by ...
  assert(html.includes('b'.repeat(200) + '...'), '200-char preview + ellipsis');
}

// Short text — no ellipsis
{
  const html = emailSender.generateReceiptHTML({
    sessionId: 's',
    timestamp: Date.now(),
    language: 'en',
    uploadResults: [{ success: true, filename: 'x.jpg', confidence: 1, processingTime: 0, text: 'short' }],
  });
  // Look for "short" in the text-preview div without ellipsis
  const m = html.match(/<div class="text-preview">[\s\S]*?<\/div>/);
  assert(m !== null, 'has text-preview div');
  assert(m![0].includes('short'), 'short text present');
  assert(!m![0].includes('short...'), 'no ellipsis after short text');
}

// All-failed → no download section, no success section
{
  const html = emailSender.generateReceiptHTML({
    sessionId: 's', timestamp: Date.now(), language: 'en',
    uploadResults: [{ success: false, filename: 'x.jpg', error: 'oops' }],
  });
  assert(!html.includes('Successfully Processed Files'), 'no successful section');
  // CSS class .download-links is in the <style> block; only the actual element
  // uses class="download-links". Check for the element form, not the substring.
  assert(!html.includes('class="download-links"'), 'no download links element');
  assert(html.includes('Failed Files'), 'has failed section');
}

// All-successful → no failed section
{
  const html = emailSender.generateReceiptHTML({
    sessionId: 's', timestamp: Date.now(), language: 'en',
    uploadResults: [{ success: true, filename: 'a.jpg', confidence: 1, processingTime: 0 }],
  });
  assert(!html.includes('Failed Files'), 'no failed section when all succeed');
  assert(html.includes('Successfully Processed Files'), 'has successful section');
}

// Localized HTML
{
  const html = emailSender.generateReceiptHTML({
    sessionId: 's', timestamp: Date.now(), language: 'ru',
    uploadResults: [{ success: true, filename: 'a.jpg', confidence: 1, processingTime: 0 }],
  });
  assert(html.includes('Обработка OCR завершена'), 'ru title');
  assert(html.includes('Русский'), 'ru language name');
}

// ============================================================================
// sendUploadReceipt
// ============================================================================
console.log('\n── sendUploadReceipt ─────────────────────────────────────');

{
  resetMail();
  const r = await emailSender.sendUploadReceipt('user@x.com', {
    sessionId: 'sess-X',
    uploadResults: [{ success: true, filename: 'a.jpg', confidence: 0.9, processingTime: 1000 }],
    timestamp: '2026-04-10T00:00:00.000Z',
    language: 'en',
  });
  assertEq(r.success, true, 'success');
  assertEq(r.messageId, 'msg-abc', 'messageId');
  assertEq(sentMails.length, 1, 'one email sent');

  const m = sentMails[0];
  assertEq(m.to, 'user@x.com', 'to');
  assertEq(m.subject, 'OCR Processing Complete - Orthodox Metrics', 'localized subject');
  assert(typeof m.text === 'string' && m.text.length > 0, 'text body');
  assert(typeof m.html === 'string' && m.html.length > 0, 'html body');
  assertEq(m.headers['X-Session-ID'], 'sess-X', 'X-Session-ID header');
  assert(m.from.includes('Orthodox Metrics OCR System'), 'from has fromName');
}

// Localized subject in send
{
  resetMail();
  await emailSender.sendUploadReceipt('user@x.com', {
    sessionId: 'sess-Y',
    uploadResults: [{ success: true, filename: 'a.jpg', confidence: 1, processingTime: 0 }],
    timestamp: Date.now(),
    language: 'gr',
  });
  assertEq(sentMails[0].subject, 'Ολοκλήρωση Επεξεργασίας OCR - Orthodox Metrics', 'gr subject');
}

// Failure throws (does NOT swallow)
{
  resetMail();
  sendMailThrows = true;
  let threw = false;
  try {
    await emailSender.sendUploadReceipt('user@x.com', {
      sessionId: 's', uploadResults: [], timestamp: Date.now(), language: 'en',
    });
  } catch (e: any) {
    threw = true;
    assert(e.message.includes('send failed'), 'rethrows error');
  }
  assertEq(threw, true, 'sendUploadReceipt rethrows on failure');
}

// ============================================================================
// testConnection
// ============================================================================
console.log('\n── testConnection ────────────────────────────────────────');

{
  resetMail();
  const r = await emailSender.testConnection();
  assertEq(r, true, 'verify success → true');
}

{
  resetMail();
  verifyThrows = true;
  const r = await emailSender.testConnection();
  assertEq(r, false, 'verify failure → false');
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
