#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/apiResponse.js (OMD-885)
 *
 * Covers:
 *   - success         (data, message, meta variations)
 *   - error           (message, code, status, details, dev-mode stack)
 *   - paginated       (page math, hasNext/hasPrev edges)
 *   - validationError (errors array, custom message)
 *   - notFound        (with/without identifier)
 *   - unauthorized    (default + custom)
 *   - forbidden       (default + custom)
 *   - legacy callable signature: ApiResponse(success, data, error)
 *
 * apiResponse.js exports a callable function with all static methods
 * copied onto it. We import it as the default CommonJS export.
 *
 * Run: npx tsx server/src/utils/__tests__/apiResponse.test.ts
 *
 * Exits non-zero on any failure.
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const ApiResponse: any = require('../apiResponse');

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

// ============================================================================
// success
// ============================================================================
console.log('\n── success ───────────────────────────────────────────────');

const s1 = ApiResponse.success();
assertEq(s1.success, true, 'default: success=true');
assertEq(s1.message, 'Success', 'default: message="Success"');
assert(typeof s1.timestamp === 'string' && s1.timestamp.includes('T'), 'default: ISO timestamp');
assert(!('data' in s1), 'default: no data field when null');
assert(!('meta' in s1), 'default: no meta field when null');

const s2 = ApiResponse.success({ id: 1, name: 'foo' });
assertEq(s2.data, { id: 1, name: 'foo' }, 'with data: data field set');
assertEq(s2.message, 'Success', 'with data: default message');

const s3 = ApiResponse.success(null, 'Custom message');
assertEq(s3.message, 'Custom message', 'custom message');
assert(!('data' in s3), 'null data omitted');

const s4 = ApiResponse.success({ a: 1 }, 'OK', { count: 5 });
assertEq(s4.data, { a: 1 }, 'with meta: data set');
assertEq(s4.meta, { count: 5 }, 'with meta: meta set');
assertEq(s4.message, 'OK', 'with meta: message set');

// data === 0 is falsy but not null/undefined → should still be included
const s5 = ApiResponse.success(0);
assertEq(s5.data, 0, 'data=0 included (not stripped)');

// data === false should also be included
const s6 = ApiResponse.success(false);
assertEq(s6.data, false, 'data=false included');

// data === '' should also be included
const s7 = ApiResponse.success('');
assertEq(s7.data, '', 'data=empty string included');

// undefined data → omitted
const s8 = ApiResponse.success(undefined);
assert(!('data' in s8), 'data=undefined omitted');

// ============================================================================
// error
// ============================================================================
console.log('\n── error ─────────────────────────────────────────────────');

const e1 = ApiResponse.error();
assertEq(e1.success, false, 'default: success=false');
assertEq(e1.error.message, 'An error occurred', 'default: message');
assertEq(e1.error.code, 'ERROR', 'default: code');
assertEq(e1.error.status, 500, 'default: status');
assert(typeof e1.timestamp === 'string', 'default: timestamp');
assert(!('details' in e1.error), 'default: no details field');

const e2 = ApiResponse.error('Bad request', 'BAD_REQUEST', 400);
assertEq(e2.error.message, 'Bad request', 'custom: message');
assertEq(e2.error.code, 'BAD_REQUEST', 'custom: code');
assertEq(e2.error.status, 400, 'custom: status');

const e3 = ApiResponse.error('Failed', 'FAIL', 500, { reason: 'db down' });
assertEq(e3.error.details, { reason: 'db down' }, 'with details: details set');

// Dev mode stack injection
const origNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'development';
const errInstance = new Error('boom');
const e4 = ApiResponse.error('Crash', 'CRASH', 500, errInstance);
assert(typeof e4.error.stack === 'string' && e4.error.stack.length > 0, 'dev mode: stack included for Error instance');
process.env.NODE_ENV = 'production';
const e5 = ApiResponse.error('Crash', 'CRASH', 500, errInstance);
assert(!('stack' in e5.error), 'prod mode: stack NOT included');
process.env.NODE_ENV = origNodeEnv;

// Non-Error details in dev mode → no stack
process.env.NODE_ENV = 'development';
const e6 = ApiResponse.error('X', 'X', 500, { foo: 'bar' });
assert(!('stack' in e6.error), 'dev mode: no stack for non-Error details');
process.env.NODE_ENV = origNodeEnv;

// ============================================================================
// paginated
// ============================================================================
console.log('\n── paginated ─────────────────────────────────────────────');

const p1 = ApiResponse.paginated([{ id: 1 }, { id: 2 }], 1, 10, 25);
assertEq(p1.success, true, 'paginated: success=true');
assertEq(p1.data, [{ id: 1 }, { id: 2 }], 'paginated: data=items');
assertEq(p1.pagination.page, 1, 'page=1');
assertEq(p1.pagination.limit, 10, 'limit=10');
assertEq(p1.pagination.total, 25, 'total=25');
assertEq(p1.pagination.totalPages, 3, 'totalPages=ceil(25/10)=3');
assertEq(p1.pagination.hasNext, true, 'hasNext=true on page 1 of 3');
assertEq(p1.pagination.hasPrev, false, 'hasPrev=false on page 1');

// Last page
const p2 = ApiResponse.paginated([], 3, 10, 25);
assertEq(p2.pagination.hasNext, false, 'hasNext=false on last page');
assertEq(p2.pagination.hasPrev, true, 'hasPrev=true on last page');

// Middle page
const p3 = ApiResponse.paginated([], 2, 10, 25);
assertEq(p3.pagination.hasNext, true, 'middle: hasNext=true');
assertEq(p3.pagination.hasPrev, true, 'middle: hasPrev=true');

// Empty results
const p4 = ApiResponse.paginated([], 1, 10, 0);
assertEq(p4.pagination.totalPages, 0, 'empty: totalPages=0');
assertEq(p4.pagination.hasNext, false, 'empty: hasNext=false');
assertEq(p4.pagination.hasPrev, false, 'empty: hasPrev=false');

// String numbers (parseInt'd)
const p5 = ApiResponse.paginated([], '2', '5', '12');
assertEq(p5.pagination.page, 2, 'string page → parsed');
assertEq(p5.pagination.limit, 5, 'string limit → parsed');
assertEq(p5.pagination.total, 12, 'string total → parsed');
assertEq(p5.pagination.totalPages, 3, 'totalPages computed from parsed values');

// Exact division
const p6 = ApiResponse.paginated([], 2, 5, 10);
assertEq(p6.pagination.totalPages, 2, 'exact division: totalPages=2');
assertEq(p6.pagination.hasNext, false, 'exact: hasNext=false on last');

// ============================================================================
// validationError
// ============================================================================
console.log('\n── validationError ───────────────────────────────────────');

const v1 = ApiResponse.validationError([
  { field: 'email', message: 'Invalid email' },
  { field: 'age', message: 'Must be > 0' },
]);
assertEq(v1.success, false, 'validationError: success=false');
assertEq(v1.error.code, 'VALIDATION_ERROR', 'validationError: code');
assertEq(v1.error.status, 400, 'validationError: status=400');
assertEq(v1.error.message, 'Validation failed', 'validationError: default message');
assertEq(v1.error.validationErrors.length, 2, 'validationError: 2 errors');
assertEq(v1.error.validationErrors[0].field, 'email', 'validationError: first field');

const v2 = ApiResponse.validationError([], 'Custom validation message');
assertEq(v2.error.message, 'Custom validation message', 'validationError: custom message');
assertEq(v2.error.validationErrors, [], 'validationError: empty array');

// ============================================================================
// notFound
// ============================================================================
console.log('\n── notFound ──────────────────────────────────────────────');

const nf1 = ApiResponse.notFound();
assertEq(nf1.success, false, 'notFound: success=false');
assertEq(nf1.error.code, 'NOT_FOUND', 'notFound: code');
assertEq(nf1.error.status, 404, 'notFound: status=404');
assertEq(nf1.error.message, 'Resource not found', 'notFound: default message');

const nf2 = ApiResponse.notFound('User');
assertEq(nf2.error.message, 'User not found', 'notFound: with resource only');

const nf3 = ApiResponse.notFound('User', '42');
assertEq(nf3.error.message, "User with identifier '42' not found", 'notFound: with identifier');

const nf4 = ApiResponse.notFound('Church', 'om_church_99');
assertEq(nf4.error.message, "Church with identifier 'om_church_99' not found", 'notFound: full');

// ============================================================================
// unauthorized
// ============================================================================
console.log('\n── unauthorized ──────────────────────────────────────────');

const u1 = ApiResponse.unauthorized();
assertEq(u1.success, false, 'unauthorized: success=false');
assertEq(u1.error.code, 'UNAUTHORIZED', 'unauthorized: code');
assertEq(u1.error.status, 401, 'unauthorized: status=401');
assertEq(u1.error.message, 'Authentication required', 'unauthorized: default message');

const u2 = ApiResponse.unauthorized('Token expired');
assertEq(u2.error.message, 'Token expired', 'unauthorized: custom message');

// ============================================================================
// forbidden
// ============================================================================
console.log('\n── forbidden ─────────────────────────────────────────────');

const f1 = ApiResponse.forbidden();
assertEq(f1.success, false, 'forbidden: success=false');
assertEq(f1.error.code, 'FORBIDDEN', 'forbidden: code');
assertEq(f1.error.status, 403, 'forbidden: status=403');
assertEq(
  f1.error.message,
  'You do not have permission to access this resource',
  'forbidden: default message'
);

const f2 = ApiResponse.forbidden('Admin only');
assertEq(f2.error.message, 'Admin only', 'forbidden: custom message');

// ============================================================================
// Legacy callable signature: ApiResponse(success, data, error)
// ============================================================================
console.log('\n── legacy callable ───────────────────────────────────────');

// Success case
const l1 = ApiResponse(true, { id: 1 });
assertEq(l1.success, true, 'legacy(true, data): success=true');
assertEq(l1.data, { id: 1 }, 'legacy(true, data): data set');

// Failure case with default error
const l2 = ApiResponse(false);
assertEq(l2.success, false, 'legacy(false): success=false');
assertEq(l2.error.code, 'ERROR', 'legacy(false): default code');
assertEq(l2.error.status, 500, 'legacy(false): default status');

// Failure case with custom error
const l3 = ApiResponse(false, null, { message: 'Bad input', code: 'BAD', status: 400 });
assertEq(l3.error.message, 'Bad input', 'legacy(false, null, err): message');
assertEq(l3.error.code, 'BAD', 'legacy(false, null, err): code');
assertEq(l3.error.status, 400, 'legacy(false, null, err): status');

// Failure with details
const l4 = ApiResponse(false, null, { message: 'X', code: 'Y', status: 422, details: { foo: 'bar' } });
assertEq(l4.error.details, { foo: 'bar' }, 'legacy: details propagated');

// Static methods still callable on the function form
const l5 = ApiResponse.success({ x: 1 });
assertEq(l5.data, { x: 1 }, 'static method on callable: success');

const l6 = ApiResponse.notFound('Item', '7');
assertEq(l6.error.message, "Item with identifier '7' not found", 'static method on callable: notFound');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
