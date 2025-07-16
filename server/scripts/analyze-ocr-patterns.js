#!/usr/bin/env node

// OCR Pattern Analysis Tool for Orthodox Church Records
// Use this to test and refine entity extraction patterns
// Run with: node analyze-ocr-patterns.js

const ChurchRecordEntityExtractor = require('../services/churchRecordEntityExtractor');

console.log('🔍 OCR Pattern Analysis Tool for Orthodox Church Records\n');

class OCRPatternAnalyzer {
  constructor() {
    this.extractor = new ChurchRecordEntityExtractor();
    this.testResults = [];
  }

  async analyzeRecord(ocrText, expectedFields = {}, recordType = 'unknown') {
    console.log(`\n📋 Analyzing ${recordType.toUpperCase()} Record`);
    console.log('=' .repeat(50));
    console.log('Raw OCR Text:');
    console.log(ocrText);
    console.log('\n' + '-'.repeat(50));

    try {
      // Check if this is a registry format
      const isRegistry = this.extractor.isRegistryFormat(ocrText);
      console.log(`📊 Registry Format Detected: ${isRegistry ? 'YES' : 'NO'}`);
      
      if (isRegistry) {
        const columns = this.extractor.detectRegistryColumns(ocrText);
        console.log(`📋 Detected Columns: ${columns.length}`);
        columns.forEach((col, idx) => {
          console.log(`   ${idx + 1}. ${col.header} (${col.type})`);
        });
      }

      // Extract entities
      const result = await this.extractor.extractData(ocrText, recordType, 'multi', 1);
      
      console.log('\n🤖 AI Extraction Results:');
      console.log(`Record Type: ${result.recordType} (confidence: ${(result.confidence * 100).toFixed(1)}%)`);
      console.log('\nExtracted Fields:');
      
      Object.entries(result.fields).forEach(([field, value]) => {
        const expected = expectedFields[field];
        const match = expected && this.compareValues(expected, value);
        
        console.log(`  ${field}: "${value}" ${match ? '✅' : expected ? '❌' : '⚪'}`);
        if (expected && !match) {
          console.log(`    Expected: "${expected}"`);
        }
      });

      console.log(`\nExtraction completed in: ${Date.now() - performance.now()}ms`);

      // Store results for analysis
      this.testResults.push({
        recordType,
        ocrText,
        extracted: result,
        expected: expectedFields,
        timestamp: new Date().toISOString()
      });

      return result;

    } catch (error) {
      console.error('❌ Extraction failed:', error.message);
      return null;
    }
  }

  compareValues(expected, actual) {
    if (!expected || !actual) return false;
    
    // Normalize both values for comparison
    const normalize = (str) => str.toString().toLowerCase().trim().replace(/\s+/g, ' ');
    
    return normalize(expected) === normalize(actual) || 
           normalize(actual).includes(normalize(expected)) ||
           normalize(expected).includes(normalize(actual));
  }

  async testRegistryExtraction() {
    console.log('\n🗂️  Testing Registry Format Extraction');
    console.log('═'.repeat(60));
    
    const registryTestCases = [
      {
        name: "Standard Orthodox Registry with Pipes",
        text: `Entry No. | Child Name        | Date of Baptism | Parents                    | Godparents         | Priest
23        | Dimitrios Kostas  | 06/25/2023      | George and Maria Kostas    | Nicholas Papadakis | Rev. Father Michael`,
        expected: {
          entryNumber: "23",
          childFirstName: "Dimitrios",
          childLastName: "Kostas",
          dateOfBaptism: "2023-06-25",
          fatherName: "George",
          motherName: "Maria",
          godparents: "Nicholas Papadakis",
          officiantName: "Michael"
        }
      },
      {
        name: "Space-Separated Registry",
        text: `23    Elena Sofia Petrov    04/16/2023    Peter and Catherine Petrov    John Georgakis    Rev. Father Michael`,
        expected: {
          entryNumber: "23",
          childFirstName: "Elena",
          childLastName: "Petrov",
          dateOfBaptism: "2023-04-16",
          fatherName: "Peter",
          motherName: "Catherine"
        }
      },
      {
        name: "Mixed Language (Greek)",
        text: `24 | Δημήτριος Κώστας | 25/6/2023 | Γιώργος και Μαρία | Νικόλαος | Π. Μιχάλης`,
        expected: {
          entryNumber: "24",
          dateOfBaptism: "2023-06-25"
        }
      }
    ];
    
    for (const testCase of registryTestCases) {
      await this.analyzeRecord(testCase.text, testCase.expected, 'baptism');
    }
  }

  generatePatternReport() {
    console.log('\n📊 PATTERN ANALYSIS REPORT');
    console.log('=' .repeat(50));
    
    const totalTests = this.testResults.length;
    if (totalTests === 0) {
      console.log('No test results to analyze.');
      return;
    }

    // Accuracy by field
    const fieldAccuracy = {};
    const fieldCounts = {};

    this.testResults.forEach(test => {
      Object.entries(test.expected).forEach(([field, expectedValue]) => {
        if (!fieldAccuracy[field]) {
          fieldAccuracy[field] = { correct: 0, total: 0 };
        }
        
        fieldAccuracy[field].total++;
        
        const extractedValue = test.extracted?.fields?.[field];
        if (extractedValue && extractedValue.toLowerCase() === expectedValue.toLowerCase()) {
          fieldAccuracy[field].correct++;
        }
      });
    });

    console.log('Field Extraction Accuracy:');
    Object.entries(fieldAccuracy).forEach(([field, stats]) => {
      const accuracy = ((stats.correct / stats.total) * 100).toFixed(1);
      console.log(`  ${field}: ${accuracy}% (${stats.correct}/${stats.total})`);
    });

    // Record type detection accuracy
    const recordTypeAccuracy = this.testResults.filter(test => 
      test.extracted?.recordType === test.recordType
    ).length;
    
    console.log(`\nRecord Type Detection: ${((recordTypeAccuracy / totalTests) * 100).toFixed(1)}% (${recordTypeAccuracy}/${totalTests})`);

    // Confidence distribution
    const confidences = this.testResults.map(test => test.extracted?.confidence?.overall || 0);
    const avgConfidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    
    console.log(`\nAverage Confidence Score: ${(avgConfidence * 100).toFixed(1)}%`);
    console.log(`Confidence Range: ${(Math.min(...confidences) * 100).toFixed(1)}% - ${(Math.max(...confidences) * 100).toFixed(1)}%`);
  }

  // Helper method to suggest pattern improvements
  suggestImprovements() {
    console.log('\n💡 SUGGESTED IMPROVEMENTS');
    console.log('=' .repeat(50));
    
    // Analyze common failure patterns
    const failures = this.testResults.filter(test => {
      return Object.entries(test.expected).some(([field, expected]) => {
        const extracted = test.extracted?.fields?.[field];
        return !extracted || extracted.toLowerCase() !== expected.toLowerCase();
      });
    });

    if (failures.length > 0) {
      console.log('Common Extraction Issues:');
      failures.forEach((failure, index) => {
        console.log(`\n${index + 1}. Record Type: ${failure.recordType}`);
        Object.entries(failure.expected).forEach(([field, expected]) => {
          const extracted = failure.extracted?.fields?.[field];
          if (!extracted || extracted.toLowerCase() !== expected.toLowerCase()) {
            console.log(`   ${field}: Expected "${expected}", Got "${extracted || 'none'}"`);
          }
        });
      });
    }

    console.log('\nRecommendations:');
    console.log('1. Add more regex patterns for failed extractions');
    console.log('2. Improve Orthodox terminology recognition');
    console.log('3. Add language-specific date parsing');
    console.log('4. Enhance confidence scoring for edge cases');
    console.log('5. Add layout-based extraction for structured forms');
  }
}

// Example usage and test cases
async function runSampleTests() {
  const analyzer = new OCRPatternAnalyzer();

  console.log('🧪 Running Sample OCR Tests...\n');
  
  // Test registry extraction first
  await analyzer.testRegistryExtraction();

  // Sample 1: English Baptism Record
  await analyzer.analyzeRecord(`
    ST. NICHOLAS ORTHODOX CHURCH
    BAPTISMAL CERTIFICATE
    
    This is to certify that
    GREGORY JOHN VERBELLI
    Son of Michael Verbelli and Maria Verbelli
    Born: July 15, 1950
    
    Was baptized on July 30, 1950
    At St. Charles Byzantine Catholic Church
    By Fr. Vadim A. Pogrebniak
    Godparents: Gerald Lewis and Mary Lewis
  `, {
    firstName: 'Gregory',
    middleName: 'John',
    lastName: 'Verbelli',
    baptismDate: '1950-07-30',
    birthDate: '1950-07-15',
    clergy: 'Fr. Vadim A. Pogrebniak',
    godparents: 'Gerald Lewis and Mary Lewis'
  }, 'baptism');

  // Sample 2: Greek Baptism Record
  await analyzer.analyzeRecord(`
    ΙΕΡΟΣ ΝΑΟΣ ΑΓΙΟΥ ΓΕΩΡΓΙΟΥ
    ΠΙΣΤΟΠΟΙΗΤΙΚΟ ΒΑΠΤΙΣΗΣ
    
    Πιστοποιείται ότι ο
    ΓΕΩΡΓΙΟΣ ΝΙΚΟΛΑΟΣ ΠΑΠΑΔΟΠΟΥΛΟΣ
    Υιός των: Νικολάου Παπαδόπουλου και Μαρίας Παπαδοπούλου
    Γεννηθείς στις: 15 Μαρτίου 1955
    
    Εβαπτίσθη στις: 20 Απριλίου 1955
    Υπό του: Πατρός Δημητρίου Κωνσταντίνου
    Ανάδοχοι: Κωνσταντίνος και Ελένη Γεωργιάδου
  `, {
    firstName: 'Γεωργιος',
    middleName: 'Νικολαος',
    lastName: 'Παπαδοπουλος',
    baptismDate: '1955-04-20',
    birthDate: '1955-03-15',
    clergy: 'Πατρός Δημητρίου Κωνσταντίνου',
    godparents: 'Κωνσταντίνος και Ελένη Γεωργιάδου'
  }, 'baptism');

  // Generate analysis
  analyzer.generatePatternReport();
  analyzer.suggestImprovements();

  console.log('\n✅ Analysis complete! Now ready to process your real church records.');
  console.log('\n📝 To test your own records:');
  console.log('   1. Create a new test case with your OCR text');
  console.log('   2. Specify the expected field values');
  console.log('   3. Run analyzer.analyzeRecord(ocrText, expectedFields, recordType)');
  console.log('   4. Review extraction accuracy and improve patterns');
}

// Export for use
module.exports = OCRPatternAnalyzer;

// Run sample tests if called directly
if (require.main === module) {
  runSampleTests().catch(console.error);
}
