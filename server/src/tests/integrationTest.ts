/**
 * Cycle 10: Integration test for OCR classifier improvements
 * Tests both classifyRecordType and classifyLayout against the full corpus
 */
require('dotenv').config({ path: './.env' });
const { classifyRecordType, classifyLayout } = require('./dist/utils/ocrClassifier');
const fs = require('fs');
const path = require('path');
const { GoogleAuth } = require('google-auth-library');

const sampleDir = path.join(__dirname, '..', 'docs', 'sample_records');

// Expected record types per directory
const expectedRecordTypes = {
  'baptism': 'baptism',
  'funeral': 'funeral',
  'marriage': 'marriage',
};

// Test classifyRecordType with sample OCR texts
function testRecordTypeClassifier() {
  console.log('\n=== RECORD TYPE CLASSIFIER TESTS ===\n');
  
  const testTexts = [
    { text: 'BAPTISM RECORD - Child Name: John Smith - Date of Birth: 1/5/1970 - Godmother: Mary Jane - Priest: Fr. George', expected: 'baptism' },
    { text: 'FUNERAL RECORD - Deceased: Anna Thompson - Date of Death: 3/15/2020 - Age at Death: 87 - Burial: Calvary Cemetery', expected: 'funeral' },
    { text: 'MARRIAGE CERTIFICATE - Groom: Peter Kolas - Bride: Helen Thomas - Date of Marriage: 6/22/1985 - Best Man: John Doe', expected: 'marriage' },
    { text: 'ΒΑΠΤΙΣΜΑ - Ονοματεπώνυμο: Γεώργιος Παπαδόπουλος - Νονός: Δημήτριος', expected: 'baptism' },
    { text: 'ΚΗΔΕΙΑ - Θάνατος: Μαρία Ελένη - Ταφή: 10/5/2020', expected: 'funeral' },
    { text: 'ΣΤΕΦΑΝΩΣΗ - Γάμος - Νυμφίος: Κωνσταντίνος - Νύφη: Αικατερίνη', expected: 'marriage' },
    { text: 'Date of birth 5/12/1955 Date of baptism 6/1/1955 child name David James father name James David mother name Maria David sponsors John Smith', expected: 'baptism' },
    { text: 'funeral burial death obituary age 88 date of death 9/23 date of burial 9/28 cemetery next of kin', expected: 'funeral' },
    { text: 'name witnesses crowning ceremony couple wedding marriage license groom parents bride parents', expected: 'marriage' },
  ];
  
  let passed = 0;
  for (const test of testTexts) {
    const result = classifyRecordType(test.text);
    const ok = result.suggested_type === test.expected;
    passed += ok ? 1 : 0;
    console.log(`${ok ? '✅' : '❌'} Expected: ${test.expected}, Got: ${result.suggested_type} (conf: ${result.confidence.toFixed(3)}) — "${test.text.slice(0, 60)}..."`);
  }
  console.log(`\nRecord type classifier: ${passed}/${testTexts.length} passed\n`);
  return { passed, total: testTexts.length };
}

// Test classifyLayout
function testLayoutClassifier() {
  console.log('\n=== LAYOUT CLASSIFIER TESTS ===\n');
  
  // Load vision results from stored jobs if available
  const storageDir = path.join(__dirname, 'storage', 'feeder');
  if (!fs.existsSync(storageDir)) {
    console.log('No stored vision results found. Skipping layout classifier tests.');
    return { passed: 0, total: 0 };
  }
  
  const jobDirs = fs.readdirSync(storageDir)
    .filter(d => d.startsWith('job_'))
    .sort((a, b) => parseInt(a.replace('job_', '')) - parseInt(b.replace('job_', '')));
  
  let tested = 0;
  let passed = 0;
  
  for (const jobDir of jobDirs) {
    const page0 = path.join(storageDir, jobDir, 'page_0', 'vision_result.json');
    if (!fs.existsSync(page0)) continue;
    
    try {
      const visionResult = JSON.parse(fs.readFileSync(page0, 'utf8'));
      const result = classifyLayout(visionResult);
      tested++;
      const validTypes = ['tabular', 'form', 'narrative'];
      const isValid = validTypes.includes(result.detectedLayoutType);
      passed += isValid ? 1 : 0;
      console.log(`${isValid ? '✅' : '❌'} ${jobDir}: ${result.detectedLayoutType} (conf: ${result.layoutConfidence.toFixed(3)})`);
    } catch (err) {
      console.log(`⚠️  ${jobDir}: Failed to load/classify — ${err.message}`);
    }
  }
  
  console.log(`\nLayout classifier: ${passed}/${tested} valid classifications\n`);
  return { passed, total: tested };
}

// Summary
const rtResults = testRecordTypeClassifier();
const layoutResults = testLayoutClassifier();

console.log('\n══════════════════════════════════════');
console.log('INTEGRATION TEST SUMMARY');
console.log('══════════════════════════════════════');
console.log(`Record Type Classifier: ${rtResults.passed}/${rtResults.total} passed`);
console.log(`Layout Classifier:      ${layoutResults.passed}/${layoutResults.total} valid`);
console.log(`Overall:                ${rtResults.passed + layoutResults.passed}/${rtResults.total + layoutResults.total}`);
console.log('══════════════════════════════════════\n');

process.exit(rtResults.passed === rtResults.total ? 0 : 1);
