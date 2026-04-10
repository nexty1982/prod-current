#!/usr/bin/env npx tsx
/**
 * Unit tests for utils/questionnaireParser.js (OMD-902)
 *
 * Pure module — depends only on node:path. All methods are static.
 *
 * Coverage:
 *   - parseQuestionnaire             .tsx-only filter, frontmatter detection
 *   - extractMetadata                block + single-line styles, all @tags
 *   - generateQuestionnaireId        lowercase, non-alphanumeric → '-'
 *   - extractTitleFromFileName       camelCase + kebab/snake → title case
 *   - extractAgeGroupFromFileName    6 regex patterns, fallback to 'General'
 *   - validateContent                dangerous imports/patterns, URL warnings
 *
 * Run: npx tsx server/src/utils/__tests__/questionnaireParser.test.ts
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
// parseQuestionnaire — file extension filter
// ============================================================================
console.log('\n── parseQuestionnaire: extension filter ──────────────────');

assertEq(
  QuestionnaireParser.parseQuestionnaire('quiz.js', '/** @type questionnaire */'),
  null,
  '.js → null'
);
assertEq(
  QuestionnaireParser.parseQuestionnaire('quiz.ts', '/** @type questionnaire */'),
  null,
  '.ts → null'
);
assertEq(
  QuestionnaireParser.parseQuestionnaire('quiz.txt', '/** @type questionnaire */'),
  null,
  '.txt → null'
);
// .TSX (uppercase) — extname is lowercased before comparison, so this matches
const tsxUpper = QuestionnaireParser.parseQuestionnaire('quiz.TSX', '/** @type questionnaire */');
assert(tsxUpper !== null, '.TSX (uppercase) accepted');

// Non-questionnaire .tsx → null
assertEq(
  QuestionnaireParser.parseQuestionnaire('regular.tsx', 'export default function Foo() {}'),
  null,
  'tsx without @type → null'
);

// ============================================================================
// parseQuestionnaire — full result shape
// ============================================================================
console.log('\n── parseQuestionnaire: result shape ──────────────────────');

const fullContent = `/**
 * @type questionnaire
 * @title Baptism Quiz
 * @description Test your knowledge of baptism
 * @ageGroup K-2
 * @version 2.0
 * @author Fr. John
 * @estimatedDuration 15
 */
export default function BaptismQuiz() {}`;

const result = QuestionnaireParser.parseQuestionnaire('baptismQuiz.tsx', fullContent);
assert(result !== null, 'full content → not null');
assertEq(result.fileName, 'baptismQuiz.tsx', 'fileName preserved');
assertEq(result.title, 'Baptism Quiz', 'title from metadata');
assertEq(result.description, 'Test your knowledge of baptism', 'description');
assertEq(result.ageGroup, 'K-2', 'ageGroup from metadata');
assertEq(result.version, '2.0', 'version');
assertEq(result.author, 'Fr. John', 'author');
assertEq(result.estimatedDuration, 15, 'estimatedDuration parseInt');
assertEq(result.type, 'questionnaire', 'type literal');
assertEq(result.id, 'baptismquiz', 'id generated from filename');
assertEq(result.questions, [], 'questions default []');

// Default fallbacks when only @type is set
const minimal = QuestionnaireParser.parseQuestionnaire(
  'simpleQuiz.tsx',
  '/** @type questionnaire */'
);
assert(minimal !== null, 'minimal → not null');
assertEq(minimal.title, 'Simple Quiz', 'title fallback from filename');
assertEq(minimal.description, '', 'description default ""');
assertEq(minimal.ageGroup, 'General', 'ageGroup fallback');
assertEq(minimal.version, '1.0', 'version default');
assertEq(minimal.author, 'Unknown', 'author default');
assertEq(minimal.estimatedDuration, 10, 'estimatedDuration default 10');

// ============================================================================
// extractMetadata — block frontmatter
// ============================================================================
console.log('\n── extractMetadata: block frontmatter ────────────────────');

let m = QuestionnaireParser.extractMetadata('/** @type questionnaire */');
assertEq(m.isQuestionnaire, true, 'block @type questionnaire');

m = QuestionnaireParser.extractMetadata('/** @type: questionnaire */');
assertEq(m.isQuestionnaire, true, 'block @type: questionnaire (with colon)');

m = QuestionnaireParser.extractMetadata('/** nothing here */');
assertEq(m.isQuestionnaire, false, 'block without @type → false');

m = QuestionnaireParser.extractMetadata('plain text only');
assertEq(m.isQuestionnaire, false, 'no comments → false');

// All @tags extracted
m = QuestionnaireParser.extractMetadata(`/**
@type questionnaire
@title My Title
@description Some description
@ageGroup 9-12
@version 3.5
@author Jane
@estimatedDuration 25
*/`);
assertEq(m.isQuestionnaire, true, 'all-tags: isQuestionnaire');
assertEq(m.title, 'My Title', 'all-tags: title');
assertEq(m.description, 'Some description', 'all-tags: description');
assertEq(m.ageGroup, '9-12', 'all-tags: ageGroup');
assertEq(m.version, '3.5', 'all-tags: version');
assertEq(m.author, 'Jane', 'all-tags: author');
assertEq(m.estimatedDuration, 25, 'all-tags: estimatedDuration');

// Defaults preserved when tags absent
m = QuestionnaireParser.extractMetadata('/** @type questionnaire */');
assertEq(m.title, null, 'no title → null default');
assertEq(m.description, null, 'no description → null default');
assertEq(m.questions, [], 'questions always []');

// ============================================================================
// extractMetadata — single-line patterns
// ============================================================================
console.log('\n── extractMetadata: single-line ──────────────────────────');

const slPatterns = [
  '// @type questionnaire',
  '// @type: questionnaire',
  '/* @type questionnaire',
  '/* @type: questionnaire',
];

for (const pattern of slPatterns) {
  m = QuestionnaireParser.extractMetadata(pattern);
  assertEq(m.isQuestionnaire, true, `single-line: ${pattern}`);
}

// ============================================================================
// generateQuestionnaireId
// ============================================================================
console.log('\n── generateQuestionnaireId ───────────────────────────────');

assertEq(QuestionnaireParser.generateQuestionnaireId('baptismQuiz.tsx'), 'baptismquiz', 'camelCase lowercased');
assertEq(QuestionnaireParser.generateQuestionnaireId('my-quiz.tsx'), 'my-quiz', 'kebab preserved');
assertEq(QuestionnaireParser.generateQuestionnaireId('my_quiz.tsx'), 'my-quiz', 'snake → kebab');
assertEq(QuestionnaireParser.generateQuestionnaireId('Quiz 1.tsx'), 'quiz-1', 'space → -');
assertEq(QuestionnaireParser.generateQuestionnaireId('quiz!@#.tsx'), 'quiz---', 'special chars → -');
assertEq(QuestionnaireParser.generateQuestionnaireId('plain.tsx'), 'plain', 'plain');

// path with directories
assertEq(
  QuestionnaireParser.generateQuestionnaireId('/some/path/myQuiz.tsx'),
  'myquiz',
  'directory prefix stripped via path.basename'
);

// ============================================================================
// extractTitleFromFileName
// ============================================================================
console.log('\n── extractTitleFromFileName ──────────────────────────────');

assertEq(QuestionnaireParser.extractTitleFromFileName('baptismQuiz.tsx'), 'Baptism Quiz', 'camelCase → Title Case');
assertEq(QuestionnaireParser.extractTitleFromFileName('my-quiz.tsx'), 'My Quiz', 'kebab → Title Case');
assertEq(QuestionnaireParser.extractTitleFromFileName('my_quiz.tsx'), 'My Quiz', 'snake → Title Case');
assertEq(QuestionnaireParser.extractTitleFromFileName('simple.tsx'), 'Simple', 'single word');
assertEq(QuestionnaireParser.extractTitleFromFileName('myAwesomeQuiz.tsx'), 'My Awesome Quiz', 'multi-word camelCase');

// path with directory
assertEq(
  QuestionnaireParser.extractTitleFromFileName('/path/to/coolQuiz.tsx'),
  'Cool Quiz',
  'directory stripped'
);

// ============================================================================
// extractAgeGroupFromFileName
// ============================================================================
console.log('\n── extractAgeGroupFromFileName ───────────────────────────');

// K-2 (literal "k-2" or "kindergarten2")
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('k-2-quiz.tsx'), 'K-2', 'k-2 hyphen');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('K2quiz.tsx'), 'K-2', 'k2 no hyphen');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('kindergarten2quiz.tsx'), 'K-2', 'kindergarten2');

// Note: "kindergarten" alone (without 2) does NOT match — regex requires literal "k-2" or "kindergarten2"
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('kindergarten-quiz.tsx'), 'General', 'plain kindergarten → General');

// 3-5 — regex is /grade?s?\s*3-?5|3rd-?5th/i
// So "grade3-5", "grade 3-5", "grades 35", "3rd-5th" match.
// "grades-3-5" (hyphen between grades and 3) does NOT match because \s* doesn't include hyphen.
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('grade3-5.tsx'), '3-5', 'grade3-5');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('grade 3-5.tsx'), '3-5', 'grade 3-5 with space');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('grades3-5.tsx'), '3-5', 'grades3-5');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('3rd-5th.tsx'), '3-5', '3rd-5th');

// 6-8
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('grade6-8.tsx'), '6-8', 'grade6-8');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('6th-8th.tsx'), '6-8', '6th-8th');

// 9-12
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('grade9-12.tsx'), '9-12', 'grade9-12');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('9th-12th.tsx'), '9-12', '9th-12th');
// "high-school.tsx" does NOT match because \s* doesn't include hyphen.
// "high school.tsx" (literal space) and "highschool.tsx" both match.
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('high school.tsx'), '9-12', 'high school (with space)');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('highschool.tsx'), '9-12', 'highschool');

// Adult
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('adultQuiz.tsx'), 'Adult', 'adult');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('grown-up.tsx'), 'Adult', 'grown-up');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('grownup.tsx'), 'Adult', 'grownup');

// Pre-K
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('pre-k.tsx'), 'Pre-K', 'pre-k');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('prek.tsx'), 'Pre-K', 'prek');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('preschool.tsx'), 'Pre-K', 'preschool');

// Fallback
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('random.tsx'), 'General', 'random → General');
assertEq(QuestionnaireParser.extractAgeGroupFromFileName('quiz.tsx'), 'General', 'quiz → General');

// ============================================================================
// validateContent
// ============================================================================
console.log('\n── validateContent ───────────────────────────────────────');

// Clean content
let v = QuestionnaireParser.validateContent('export default function Q() { return <div>Hi</div>; }');
assertEq(v.isValid, true, 'clean: valid');
assertEq(v.issues, [], 'clean: no issues');
assertEq(v.warnings, [], 'clean: no warnings');

// Dangerous import: fs
v = QuestionnaireParser.validateContent('import fs from "fs";');
assertEq(v.isValid, false, 'fs import: invalid');
assert(v.issues.some((i: string) => i.includes('fs')), 'fs in issues');

// child_process
v = QuestionnaireParser.validateContent('require("child_process")');
assertEq(v.isValid, false, 'child_process: invalid');

// eval
v = QuestionnaireParser.validateContent('const x = eval("1+1");');
assertEq(v.isValid, false, 'eval call: invalid');
assert(v.issues.some((i: string) => i.includes('eval')), 'eval in issues');

// new Function
v = QuestionnaireParser.validateContent('const f = new Function("return 1");');
assertEq(v.isValid, false, 'new Function: invalid');

// document.write
v = QuestionnaireParser.validateContent('document.write("hi");');
assertEq(v.isValid, false, 'document.write: invalid');

// innerHTML assignment
v = QuestionnaireParser.validateContent('el.innerHTML = "x";');
assertEq(v.isValid, false, 'innerHTML =: invalid');

// dangerouslySetInnerHTML
v = QuestionnaireParser.validateContent('<div dangerouslySetInnerHTML={{__html:""}} />');
assertEq(v.isValid, false, 'dangerouslySetInnerHTML: invalid');

// External URLs → warning, not issue
v = QuestionnaireParser.validateContent('const url = "https://example.com";');
assertEq(v.isValid, true, 'https URL: still valid');
assert(v.warnings.length > 0, 'https URL: warning emitted');

v = QuestionnaireParser.validateContent('const url = "http://example.com";');
assert(v.warnings.length > 0, 'http URL: warning emitted');

// Multiple issues
v = QuestionnaireParser.validateContent('eval("x"); document.write("y");');
assert(v.issues.length >= 2, 'multiple issues counted');

// ============================================================================
// Summary
// ============================================================================
console.log(`\n──────────────────────────────────────────────────────────`);
console.log(`Results: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);
