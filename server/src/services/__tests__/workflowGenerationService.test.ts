#!/usr/bin/env npx tsx
/**
 * Unit tests for services/workflowGenerationService.js buildPromptFromStep (OMD-982)
 *
 * Tests the pure prompt-text builder function that's exposed via
 * module.exports for testing. The full generatePrompts/previewGeneration
 * flows are DB+transaction-heavy and out of scope.
 *
 * Coverage:
 *   - All 8 required sections present (METADATA, CRITICAL, TASK,
 *     REQUIREMENTS, OUTPUT REQUIREMENTS, PROHIBITIONS, FINAL REQUIREMENT,
 *     plus the injected constraint section)
 *   - METADATA: ID zero-padded, DATE is ISO yyyy-mm-dd, COMPONENT
 *     resolution (step > workflow), PURPOSE/PARENT/WORKFLOW labels
 *   - Type label mapping (plan → "Planning & Architecture", etc.)
 *   - Unknown prompt_type falls back to the raw type string
 *   - Constraint block injection (only when non-empty)
 *   - depends_on_step rendering (only when set)
 *   - requirements_summary falls back to default checklist
 *   - Step count zero-padding (001 / 010)
 *
 * Run: npx tsx server/src/services/__tests__/workflowGenerationService.test.ts
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

// Stub config/db and constraintInjectionEngine so module loads safely
const dbPath = require.resolve('../../config/db');
require.cache[dbPath] = {
  id: dbPath, filename: dbPath, loaded: true,
  exports: { getAppPool: () => ({ query: async () => [[]] }) },
} as any;

const iePath = require.resolve('../constraintInjectionEngine');
require.cache[iePath] = {
  id: iePath, filename: iePath, loaded: true,
  exports: {
    buildConstraintBlock: async () => ({ text: '', constraints: [] }),
    previewConstraints: async () => '',
  },
} as any;

const { buildPromptFromStep } = require('../workflowGenerationService');

// ── Fixture helpers ─────────────────────────────────────────────────
function baseStep(overrides: any = {}) {
  return {
    step_number: 1,
    title: 'Build the feature',
    purpose: 'Implement the core logic',
    component: 'backend',
    prompt_type: 'implementation',
    expected_outcome: 'Feature works end-to-end',
    ...overrides,
  };
}

function baseWorkflow(overrides: any = {}) {
  return {
    id: 'wf-123',
    name: 'Test Workflow',
    component: 'fullstack',
    ...overrides,
  };
}

// ============================================================================
// All 8 required sections present
// ============================================================================
console.log('\n── All required sections ─────────────────────────────');

const full = buildPromptFromStep(baseStep(), baseWorkflow(), 0, 5, '');

assert(full.includes('[METADATA]'), 'METADATA section');
assert(full.includes('CRITICAL EXECUTION RULES'), 'CRITICAL section');
assert(full.includes('TASK:'), 'TASK section');
assert(full.includes('REQUIREMENTS:'), 'REQUIREMENTS section');
assert(full.includes('OUTPUT REQUIREMENTS:'), 'OUTPUT REQUIREMENTS section');
assert(full.includes('PROHIBITIONS:'), 'PROHIBITIONS section');
assert(full.includes('FINAL REQUIREMENT:'), 'FINAL REQUIREMENT section');
assert(full.includes('SYSTEM PRIORITIES'), 'SYSTEM PRIORITIES section');

// ============================================================================
// METADATA fields
// ============================================================================
console.log('\n── METADATA fields ────────────────────────────────────');

const meta = buildPromptFromStep(
  baseStep({ purpose: 'My Purpose' }),
  baseWorkflow({ id: 'wf-ABC', name: 'My Flow' }),
  0, 3, ''
);

// ID zero-padded (index 0 → 001)
assert(meta.includes('ID: 001'), 'ID: 001 (index 0)');
assert(meta.includes('PARENT: wf-ABC'), 'PARENT = workflow id');
assert(meta.includes('WORKFLOW: My Flow (step 1 of 3)'), 'WORKFLOW label with step count');
assert(meta.includes('PROMPT_TYPE: implementation'), 'PROMPT_TYPE');
assert(meta.includes('PURPOSE: My Purpose'), 'PURPOSE');

// DATE is ISO yyyy-mm-dd
const dateMatch = meta.match(/DATE: (\d{4}-\d{2}-\d{2})/);
assert(dateMatch !== null, 'DATE is yyyy-mm-dd format');

// ID padding for higher indices
const idx9 = buildPromptFromStep(baseStep(), baseWorkflow(), 9, 15, '');
assert(idx9.includes('ID: 010'), 'ID: 010 (index 9)');

const idx99 = buildPromptFromStep(baseStep(), baseWorkflow(), 99, 200, '');
assert(idx99.includes('ID: 100'), 'ID: 100 (index 99)');

// ============================================================================
// Component resolution: step > workflow
// ============================================================================
console.log('\n── Component resolution ───────────────────────────────');

const stepComp = buildPromptFromStep(
  baseStep({ component: 'frontend' }),
  baseWorkflow({ component: 'backend' }),
  0, 1, ''
);
assert(stepComp.includes('COMPONENT: frontend'), 'step.component wins');
assert(stepComp.includes('Component: frontend'), 'also in body');

// No step component → falls back to workflow
const wfComp = buildPromptFromStep(
  baseStep({ component: null }),
  baseWorkflow({ component: 'backend' }),
  0, 1, ''
);
assert(wfComp.includes('COMPONENT: backend'), 'falls back to workflow.component');

// ============================================================================
// Type label mapping
// ============================================================================
console.log('\n── Type label mapping ─────────────────────────────────');

const typeChecks = [
  { type: 'plan', label: 'Planning & Architecture' },
  { type: 'implementation', label: 'Implementation' },
  { type: 'verification', label: 'Verification & Testing' },
  { type: 'correction', label: 'Correction & Fix' },
  { type: 'migration', label: 'Data Migration' },
  { type: 'docs', label: 'Documentation' },
];

for (const { type, label } of typeChecks) {
  const out = buildPromptFromStep(
    baseStep({ prompt_type: type }),
    baseWorkflow(), 0, 1, ''
  );
  assert(out.includes(`Type: ${label}`), `${type} → "${label}"`);
  assert(out.includes(`PROMPT_TYPE: ${type}`), `PROMPT_TYPE metadata`);
}

// Unknown type falls back to raw type string
const unknown = buildPromptFromStep(
  baseStep({ prompt_type: 'custom_type' }),
  baseWorkflow(), 0, 1, ''
);
assert(unknown.includes('Type: custom_type'), 'unknown type → raw string');

// ============================================================================
// Constraint block injection
// ============================================================================
console.log('\n── Constraint block ───────────────────────────────────');

const noConstraint = buildPromptFromStep(baseStep(), baseWorkflow(), 0, 1, '');
// Should NOT include an extra --- block beyond the normal structure
const noConstraintCount = (noConstraint.match(/---/g) || []).length;

const withConstraint = buildPromptFromStep(
  baseStep(), baseWorkflow(), 0, 1,
  '[HIGH] Must use existing auth middleware\n[MEDIUM] Prefer async/await'
);
assert(
  withConstraint.includes('Must use existing auth middleware'),
  'constraint text injected'
);
assert(
  withConstraint.includes('[HIGH]'),
  'constraint severity marker present'
);

// Constraint block adds section separators — should have more `---` markers
const withConstraintCount = (withConstraint.match(/---/g) || []).length;
assert(withConstraintCount > noConstraintCount, 'constraint adds ---');

// Null/undefined constraintBlock treated as empty
const nullConstraint = buildPromptFromStep(baseStep(), baseWorkflow(), 0, 1, null as any);
const undefConstraint = buildPromptFromStep(baseStep(), baseWorkflow(), 0, 1, undefined as any);
assertEq(nullConstraint, undefConstraint, 'null and undefined identical');

// ============================================================================
// depends_on_step rendering
// ============================================================================
console.log('\n── depends_on_step ────────────────────────────────────');

const noDep = buildPromptFromStep(baseStep(), baseWorkflow(), 0, 1, '');
assert(!noDep.includes('Depends on:'), 'no dep → no "Depends on"');

const withDep = buildPromptFromStep(
  baseStep({ depends_on_step: 2 }),
  baseWorkflow(), 2, 5, ''
);
assert(withDep.includes('Depends on: Step 2'), 'dep → "Depends on: Step 2"');
assert(withDep.includes('must be completed first'), 'includes must be completed');

// ============================================================================
// requirements_summary fallback
// ============================================================================
console.log('\n── requirements_summary ───────────────────────────────');

const withSummary = buildPromptFromStep(
  baseStep({ requirements_summary: '1. Do this\n2. Do that' }),
  baseWorkflow(), 0, 1, ''
);
assert(withSummary.includes('1. Do this'), 'custom summary included');
assert(withSummary.includes('2. Do that'), 'custom summary included');

const noSummary = buildPromptFromStep(
  baseStep({ requirements_summary: null }),
  baseWorkflow(), 0, 1, ''
);
assert(
  noSummary.includes('Complete all objectives'),
  'default fallback checklist'
);
assert(
  noSummary.includes('existing codebase patterns'),
  'default fallback mentions patterns'
);

// Empty string also triggers fallback
const emptySummary = buildPromptFromStep(
  baseStep({ requirements_summary: '' }),
  baseWorkflow(), 0, 1, ''
);
assert(
  emptySummary.includes('Complete all objectives'),
  'empty summary also → fallback'
);

// ============================================================================
// expected_outcome rendering
// ============================================================================
console.log('\n── expected_outcome ───────────────────────────────────');

const outcome = buildPromptFromStep(
  baseStep({ expected_outcome: 'All tests pass with 100% coverage' }),
  baseWorkflow(), 0, 1, ''
);
assert(outcome.includes('Expected Outcome:'), 'outcome label');
assert(
  outcome.includes('All tests pass with 100% coverage'),
  'outcome text'
);

// ============================================================================
// Step number in TASK body
// ============================================================================
console.log('\n── Step number in body ────────────────────────────────');

const step5of10 = buildPromptFromStep(
  baseStep({ step_number: 5 }),
  baseWorkflow({ name: 'Big Flow' }),
  4, 10, ''
);
assert(
  step5of10.includes('step 5 of 10'),
  'TASK body shows "step 5 of 10"'
);
assert(step5of10.includes('"Big Flow"'), 'workflow name in body');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
