#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/questionnaireParser.js (OMD-890)
 *
 * Pure static-method class — no DB, no I/O, no fs.
 * Covers all 6 public static methods:
 *   - parseQuestionnaire
 *   - extractMetadata (frontmatter + single-line variants)
 *   - generateQuestionnaireId
 *   - extractTitleFromFileName
 *   - extractAgeGroupFromFileName
 *   - validateContent
 *
 * Run: npx tsx server/src/utils/__tests__/questionnaireParser.test.ts
 *
 * Exits non-zero on any failure.
 */

const QuestionnaireParser = require('../questionnaireParser');

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
// generateQuestionnaireId
// ============================================================================
console.log('\n── generateQuestionnaireId ───────────────────────────────');

assertEq(
  QuestionnaireParser.generateQuestionnaireId('MyQuestionnaire.tsx'),
  'myquestionnaire',
  'simple camelCase → lowercase'
);
assertEq(
  QuestionnaireParser.generateQuestionnaireId('grade-3-5.tsx'),
  'grade-3-5',
  'kebab-case preserved'
);
assertEq(
  QuestionnaireParser.generateQuestionnaireId('Adult_Quiz.tsx'),
  'adult-quiz',
  'underscore replaced with hyphen'
);
assertEq(
  QuestionnaireParser.generateQuestionnaireId('K2Test!.tsx'),
  'k2test-',
  'special chars → hyphens'
);
assertEq(
  QuestionnaireParser.generateQuestionnaireId('foo.bar.tsx'),
  'foo-bar',
  'extension stripped, dot replaced'
);
assertEq(
  QuestionnaireParser.generateQuestionnaireId('plain.tsx'),
  'plain',
  'simple name'
);
assertEq(
  QuestionnaireParser.generateQuestionnaireId('UPPERCASE.tsx'),
  'uppercase',
  'uppercase lowercased'
);

// ============================================================================
// extractTitleFromFileName
// ============================================================================
console.log('\n── extractTitleFromFileName ──────────────────────────────');

assertEq(
  QuestionnaireParser.extractTitleFromFileName('myQuestionnaire.tsx'),
  'My Questionnaire',
  'camelCase → Title Case'
);
assertEq(
  QuestionnaireParser.extractTitleFromFileName('adult-quiz.tsx'),
  'Adult Quiz',
  'kebab-case → Title Case'
);
assertEq(
  QuestionnaireParser.extractTitleFromFileName('youth_survey.tsx'),
  'Youth Survey',
  'snake_case → Title Case'
);
assertEq(
  QuestionnaireParser.extractTitleFromFileName('AlreadyTitle.tsx'),
  'Already Title',
  'PascalCase → Title Case'
);
assertEq(
  QuestionnaireParser.extractTitleFromFileName('plain.tsx'),
  'Plain',
  'single word'
);
assertEq(
  QuestionnaireParser.extractTitleFromFileName('grade3to5.tsx'),
  'Grade3to5',
  'numbers preserved as-is'
);

// ============================================================================
// extractAgeGroupFromFileName
// ============================================================================
console.log('\n── extractAgeGroupFromFileName ───────────────────────────');

assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('K-2-quiz.tsx'),
  'K-2',
  'K-2 pattern'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('kindergarten2.tsx'),
  'K-2',
  'kindergarten variant'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('grade3-5.tsx'),
  '3-5',
  'grade 3-5'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('grades6-8.tsx'),
  '6-8',
  'grades 6-8'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('grade9-12.tsx'),
  '9-12',
  'grade 9-12'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('high school survey.tsx'),
  '9-12',
  'high school → 9-12'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('adult-quiz.tsx'),
  'Adult',
  'adult pattern'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('grown-up.tsx'),
  'Adult',
  'grown-up → Adult'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('pre-k-quiz.tsx'),
  'Pre-K',
  'pre-k pattern'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('preschool.tsx'),
  'Pre-K',
  'preschool → Pre-K'
);
assertEq(
  QuestionnaireParser.extractAgeGroupFromFileName('random.tsx'),
  'General',
  'no pattern → General'
);

// ============================================================================
// extractMetadata — frontmatter
// ============================================================================
console.log('\n── extractMetadata: frontmatter ──────────────────────────');

const fmEmpty = QuestionnaireParser.extractMetadata('// no frontmatter');
assertEq(fmEmpty.isQuestionnaire, false, 'no frontmatter → not questionnaire');
assertEq(fmEmpty.title, null, 'no frontmatter → null title');

const fmFull = QuestionnaireParser.extractMetadata(`/**
 * @type questionnaire
 * @title My Quiz
 * @description A fun quiz
 * @ageGroup K-2
 * @version 2.5
 * @author Jane Doe
 * @estimatedDuration 15
 */
export default function MyQuiz() {}`);

assertEq(fmFull.isQuestionnaire, true, 'frontmatter @type questionnaire detected');
assertEq(fmFull.title, 'My Quiz', 'title extracted');
assertEq(fmFull.description, 'A fun quiz', 'description extracted');
assertEq(fmFull.ageGroup, 'K-2', 'ageGroup extracted');
assertEq(fmFull.version, '2.5', 'version extracted');
assertEq(fmFull.author, 'Jane Doe', 'author extracted');
assertEq(fmFull.estimatedDuration, 15, 'duration parsed as int');

// @type: questionnaire (with colon)
const fmColon = QuestionnaireParser.extractMetadata(`/**
 * @type: questionnaire
 */`);
assertEq(fmColon.isQuestionnaire, true, '@type: questionnaire (with colon) detected');

// Frontmatter without @type
const fmNoType = QuestionnaireParser.extractMetadata(`/**
 * @title Just a comment
 */`);
assertEq(fmNoType.isQuestionnaire, false, 'frontmatter without @type → not questionnaire');
assertEq(fmNoType.title, 'Just a comment', 'title still extracted from non-questionnaire frontmatter');

// ============================================================================
// extractMetadata — single-line variants
// ============================================================================
console.log('\n── extractMetadata: single-line ──────────────────────────');

const slDoubleSlash = QuestionnaireParser.extractMetadata('// @type questionnaire\nexport {}');
assertEq(slDoubleSlash.isQuestionnaire, true, '// @type questionnaire detected');

const slDoubleSlashColon = QuestionnaireParser.extractMetadata('// @type: questionnaire\nexport {}');
assertEq(slDoubleSlashColon.isQuestionnaire, true, '// @type: questionnaire detected');

const slBlock = QuestionnaireParser.extractMetadata('/* @type questionnaire */ export {}');
assertEq(slBlock.isQuestionnaire, true, '/* @type questionnaire */ detected');

const slBlockColon = QuestionnaireParser.extractMetadata('/* @type: questionnaire */ export {}');
assertEq(slBlockColon.isQuestionnaire, true, '/* @type: questionnaire */ detected');

// Just an unrelated comment
const slNone = QuestionnaireParser.extractMetadata('// just a comment\nexport {}');
assertEq(slNone.isQuestionnaire, false, 'unrelated comment → not questionnaire');

// ============================================================================
// parseQuestionnaire
// ============================================================================
console.log('\n── parseQuestionnaire ────────────────────────────────────');

// Non-tsx file
const notTsx = QuestionnaireParser.parseQuestionnaire(
  'foo.js',
  '/** @type questionnaire */'
);
assertEq(notTsx, null, '.js file → null');

const notJsx = QuestionnaireParser.parseQuestionnaire(
  'foo.jsx',
  '/** @type questionnaire */'
);
assertEq(notJsx, null, '.jsx file → null');

// .tsx but not questionnaire
const tsxNotQuiz = QuestionnaireParser.parseQuestionnaire(
  'Component.tsx',
  '// regular component'
);
assertEq(tsxNotQuiz, null, '.tsx without @type → null');

// Valid tsx questionnaire — uses metadata
const validQuiz = QuestionnaireParser.parseQuestionnaire(
  'AdultSurvey.tsx',
  `/**
 * @type questionnaire
 * @title Adult Faith Survey
 * @description For adults
 * @ageGroup Adult
 * @version 1.2
 * @author Father John
 * @estimatedDuration 20
 */
export default function () {}`
);
assert(validQuiz !== null, 'valid quiz returns object');
assertEq(validQuiz.id, 'adultsurvey', 'id from filename');
assertEq(validQuiz.fileName, 'AdultSurvey.tsx', 'fileName preserved');
assertEq(validQuiz.title, 'Adult Faith Survey', 'title from metadata');
assertEq(validQuiz.description, 'For adults', 'description from metadata');
assertEq(validQuiz.ageGroup, 'Adult', 'ageGroup from metadata');
assertEq(validQuiz.type, 'questionnaire', 'type is "questionnaire"');
assertEq(validQuiz.version, '1.2', 'version from metadata');
assertEq(validQuiz.author, 'Father John', 'author from metadata');
assertEq(validQuiz.estimatedDuration, 20, 'duration from metadata');
assertEq(validQuiz.questions, [], 'questions defaults to []');

// Valid tsx questionnaire — defaults applied
// Note: ageGroup pattern needs explicit "K-2" or "kindergarten2" — plain
// "kindergarten" doesn't match (regex is /k-?2|kindergarten-?2/).
const minQuiz = QuestionnaireParser.parseQuestionnaire(
  'k-2-quiz.tsx',
  '// @type questionnaire'
);
assert(minQuiz !== null, 'minimal quiz returns object');
assertEq(minQuiz.id, 'k-2-quiz', 'id derived from filename');
assertEq(minQuiz.title, 'K 2 Quiz', 'title from filename when missing');
assertEq(minQuiz.description, '', 'description default empty');
assertEq(minQuiz.ageGroup, 'K-2', 'ageGroup from filename pattern');
assertEq(minQuiz.version, '1.0', 'version default 1.0');
assertEq(minQuiz.author, 'Unknown', 'author default Unknown');
assertEq(minQuiz.estimatedDuration, 10, 'duration default 10');

// ============================================================================
// validateContent
// ============================================================================
console.log('\n── validateContent ───────────────────────────────────────');

// Clean content
const clean = QuestionnaireParser.validateContent('export default function() { return <div>hi</div>; }');
assertEq(clean.isValid, true, 'clean content valid');
assertEq(clean.issues, [], 'clean: no issues');
assertEq(clean.warnings, [], 'clean: no warnings');

// Dangerous import: fs
const fsImport = QuestionnaireParser.validateContent("import fs from 'fs';");
assertEq(fsImport.isValid, false, 'fs import → invalid');
assert(fsImport.issues.some((i: string) => i.includes('fs')), 'fs import flagged');

// Dangerous: child_process
const cpImport = QuestionnaireParser.validateContent("require('child_process')");
assertEq(cpImport.isValid, false, 'child_process → invalid');

// eval pattern
const evalUse = QuestionnaireParser.validateContent('eval("1+1")');
assertEq(evalUse.isValid, false, 'eval() pattern → invalid');
assert(
  evalUse.issues.some((i: string) => i.includes('eval')),
  'eval pattern flagged'
);

// Function constructor
const funcCtor = QuestionnaireParser.validateContent('new Function("return 1")');
assertEq(funcCtor.isValid, false, 'new Function → invalid');

// document.write
const docWrite = QuestionnaireParser.validateContent('document.write("hi")');
assertEq(docWrite.isValid, false, 'document.write → invalid');

// innerHTML assign
const innerHtml = QuestionnaireParser.validateContent('el.innerHTML = "x"');
assertEq(innerHtml.isValid, false, 'innerHTML assign → invalid');

// dangerouslySetInnerHTML
const dangerHtml = QuestionnaireParser.validateContent('<div dangerouslySetInnerHTML={{__html: x}} />');
assertEq(dangerHtml.isValid, false, 'dangerouslySetInnerHTML → invalid');

// External URL warning (still valid)
const extUrl = QuestionnaireParser.validateContent('const u = "https://example.com";');
assertEq(extUrl.isValid, true, 'external URL → still valid');
assert(extUrl.warnings.length > 0, 'external URL → warning emitted');
assert(
  extUrl.warnings.some((w: string) => w.includes('External URLs')),
  'external URL warning text'
);

// http (not just https)
const httpUrl = QuestionnaireParser.validateContent('const u = "http://example.com";');
assert(httpUrl.warnings.length > 0, 'http URL also warns');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
