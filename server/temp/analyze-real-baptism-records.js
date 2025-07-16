#!/usr/bin/env node

// Real Orthodox Baptism Records Analysis
// Based on actual Cyrillic baptism registry books
// Run with: node analyze-real-baptism-records.js

const ChurchRecordEntityExtractor = require('./services/churchRecordEntityExtractor');

console.log('📜 Analyzing Real Orthodox Baptism Records\n');

class OrthodoxBaptismAnalyzer {
  constructor() {
    this.extractor = new ChurchRecordEntityExtractor();
  }

  async analyzeRealRecords() {
    console.log('🔍 Testing extraction on actual Orthodox baptism registry entries...\n');

    // Sample 1: From the first image - mixed Russian/English
    const sample1 = `
      МЕТРИЧЕСКАЯ КНИГА НА
      ГОД, ЧАСТЬ ПЕРВАЯ, О РОЖДЕНИЯХ
      YEAR 72 73
      
      КТО СТАТИК
      ОТЦА ВАСИЛ
      
      FATHER'S FULL NAME MOTHER'S MAIDEN NAME
      
      ДИМИТРЕ ПЕТКОВ
      МАРИЯ БОЖКОВ (СВЕТА АНА СТЕВКЕ)
      
      FULL NAMES OF SPONSORS
      REV. VADIM A. POGREBNIAK
      
      PRIEST'S NAME
      REV. VADIM A. POGREBNIAK
    `;

    // Sample 2: More structured entry
    const sample2 = `
      МЕТРИЧЕСКАЯ КНИГА НА 1971
      
      JOHN РОССЕЛЬ ТАК ANNA АНА LECHINSKY
      VINCENT PANARCZENKO ANNA LECHINSKY
      REV. ROBERT A. GEORGE LEWIS
      
      RECEIVED INTO THE HOLY ORTHODOX CHURCH FROM THE
      BYZANTINE CATHOLIC CHURCH WHERE HE WAS BAPTIZED ON FEBRUARY
      19, 1937, WHERE HE WAS ORDAINED TO THE
      PRIESTHOOD ON JUNE 20, 1969 BY
      BISHOP STEPHEN J. KOCISKO (ARCHBISHOPIC)
      OF MCHALE, PENN. RECEIVED AS IN
      ORTHODOX LAYMAN ON PENTECOST SUNDAY,
      JUNE 6, 1971 BY CHRISMATION.
      
      SAMUEL DE STEFANO, HARRY SUSTICH
      MARY VINCENT, LEONA SUSTICH
    `;

    // Sample 3: Traditional format
    const sample3 = `
      YEAR 1971 1972
      
      JOSEPH ELLING
      GERUNDA EDWIN BALCZER
      
      HARRY ELSHОRE EVELYN ELCНИК
      REV. ROBERT A. GEORGE LEWIS
      
      GREGORY ANDREW CHORONAK SEAN KRONKOWSKI
      REV. ROBERT A. GEORGE LEWIS
      
      RECEIVED INTO THE HOLY ORTHODOX CHURCH FROM THE
      BYZANTINE CATHOLIC CHURCH WHERE HE WAS BAPTIZED ON
      APRIL 6, 1952. RECEIVED BY CHRISMATION FEBRUARY 9, 1973.
      
      KNIGHT CLUB MARIA BALUT
      NAME OF CONFIRMANT ALEXANDRA
      DATE OF BIRTH 6/12/71
      PERSON'S MAIDEN NAME ALEXANDRA
      MOTHER'S MAIDEN NAME ALEXANDRA
      CHURCH OF BAPTISM ST. PETER'S BYZANTINE
      ADDRESS 234 ST. N. PHILADELPHIA
      CONFIRMED BY FATHER JOHN CHORBA
      CHURCH ST. CHARLES BORROMEO
      ADDRESS 39 GREENFIELD DR. N. HUNTINGDON PA
      SPONSOR GARY PITTSBURG
    `;

    // Test each sample
    console.log('📊 Testing Sample 1 (Mixed Cyrillic/English)...');
    await this.testExtraction(sample1, {
      firstName: 'Димитре',
      lastName: 'Петков',
      motherName: 'Мария Божков',
      clergy: 'Rev. Vadim A. Pogrebniak',
      recordType: 'baptism'
    });

    console.log('\n📊 Testing Sample 2 (Reception Record)...');
    await this.testExtraction(sample2, {
      firstName: 'John',
      lastName: 'Lechinsky',
      motherName: 'Anna Lechinsky',
      clergy: 'Rev. Robert A. George Lewis',
      recordType: 'reception'
    });

    console.log('\n📊 Testing Sample 3 (Traditional Format)...');
    await this.testExtraction(sample3, {
      firstName: 'Joseph',
      lastName: 'Elling',
      motherName: 'Evelyn Elchnik',
      clergy: 'Rev. Robert A. George Lewis',
      recordType: 'baptism'
    });

    this.generateRecommendations();
  }

  async testExtraction(text, expected) {
    try {
      const result = await this.extractor.extractEntities(text, 'test_church');
      
      console.log(`   Record Type: ${result.recordType} (Expected: ${expected.recordType || 'baptism'})`);
      console.log(`   Confidence: ${(result.confidence.overall * 100).toFixed(1)}%`);
      
      console.log('   Extracted Fields:');
      Object.entries(result.fields).forEach(([field, value]) => {
        const confidence = result.confidence[field] || 0;
        const expectedValue = expected[field];
        const match = expectedValue && value.toLowerCase().includes(expectedValue.toLowerCase());
        
        console.log(`     ${field}: "${value}" (${(confidence * 100).toFixed(1)}%) ${match ? '✅' : expectedValue ? '❌' : '⚪'}`);
      });

    } catch (error) {
      console.error('   ❌ Extraction failed:', error.message);
    }
  }

  generateRecommendations() {
    console.log('\n💡 RECOMMENDATIONS FOR ORTHODOX BAPTISM RECORDS');
    console.log('=' .repeat(60));
    
    console.log('\n🔧 Pattern Improvements Needed:');
    console.log('1. **Cyrillic Name Extraction**');
    console.log('   - Add regex for: ДИМИТРЕ ПЕТКОВ, МАРИЯ БОЖКОВ');
    console.log('   - Pattern: /([А-Я]{2,})\s+([А-Я]{2,})/g');
    
    console.log('\n2. **Mixed Language Records**');
    console.log('   - Handle Russian headers with English content');
    console.log('   - МЕТРИЧЕСКАЯ КНИГА НА + year patterns');
    
    console.log('\n3. **Orthodox Reception Records**');
    console.log('   - "RECEIVED INTO THE HOLY ORTHODOX CHURCH"');
    console.log('   - "BY CHRISMATION" patterns');
    console.log('   - Convert to baptism_type: "reception"');
    
    console.log('\n4. **Tabular Data Extraction**');
    console.log('   - Column-based parsing for registry books');
    console.log('   - Father/Mother name columns');
    console.log('   - Sponsor/Priest columns');
    
    console.log('\n5. **Orthodox Specific Terms**');
    console.log('   - "Byzantine Catholic Church" → previous_church');
    console.log('   - "Bishop Stephen J. Kocisko" → ordaining_bishop');
    console.log('   - "Pentecost Sunday" → reception_date');
    
    console.log('\n6. **Date Parsing**');
    console.log('   - "JUNE 6, 1971" format');
    console.log('   - "6/12/71" format');
    console.log('   - "FEBRUARY 9, 1973" format');
    
    console.log('\n📋 Specific Patterns to Add:');
    console.log(`
// Cyrillic names
/([А-ЯЁ][а-яё]+)\\s+([А-ЯЁ][а-яё]+)/g

// Reception records  
/RECEIVED\\s+INTO\\s+THE\\s+HOLY\\s+ORTHODOX\\s+CHURCH/gi

// Orthodox titles
/(REV\\.|FATHER|FR\\.|BISHOP|ARCHBISHOP)\\s+([A-Z][a-z]+(?:\\s+[A-Z]\\.)?\\s+[A-Z][a-z]+)/gi

// Previous church
/FROM\\s+THE\\s+([^\\n]+CHURCH)/gi

// Chrismation dates
/BY\\s+CHRISMATION[,\\s]+([^\\n]+)/gi
    `);
  }
}

// Enhanced patterns specifically for Orthodox baptism registries
function createOrthodoxBaptismPatterns() {
  return {
    // Cyrillic name patterns
    cyrillicNames: {
      fullName: /([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)/g,
      paternalName: /([А-ЯЁ][а-яё]+)\s+([А-ЯЁ][а-яё]+)\s*\(([^)]+)\)/g,
    },

    // Orthodox reception patterns
    reception: {
      receivedInto: /RECEIVED\s+INTO\s+THE\s+HOLY\s+ORTHODOX\s+CHURCH/gi,
      fromChurch: /FROM\s+THE\s+([^,\n]+CHURCH)/gi,
      byChrismation: /BY\s+CHRISMATION[,\s]*([^,\n]+)/gi,
      previousBaptism: /WHERE\s+HE\s+WAS\s+BAPTIZED\s+ON\s+([^,\n]+)/gi,
    },

    // Registry book headers
    registryHeaders: {
      metricBook: /МЕТРИЧЕСКАЯ\s+КНИГА\s+НА\s*(\d{4})/gi,
      yearRange: /YEAR\s+(\d{2,4})\s*[-\s]*(\d{2,4})?/gi,
      birthSection: /О\s+РОЖДЕНИЯХ/gi,
    },

    // Orthodox clergy titles
    orthodoxClergy: {
      priest: /(REV\.|FATHER|FR\.|ПРОТОИЕРЕЙ|ИЕРЕЙ)\s+([A-ZА-Я][A-Za-zа-я\s\.]+)/gi,
      bishop: /(BISHOP|ARCHBISHOP|ЕПИСКОП|АРХИЕПИСКОП)\s+([A-ZА-Я][A-Za-zа-я\s\.]+)/gi,
    },

    // Orthodox date formats
    orthodoxDates: {
      pentecost: /PENTECOST\s+SUNDAY[,\s]+([^,\n]+)/gi,
      feast: /(EASTER|PENTECOST|CHRISTMAS|EPIPHANY)[,\s]+([^,\n]+)/gi,
    }
  };
}

// Export enhanced patterns
module.exports = { OrthodoxBaptismAnalyzer, createOrthodoxBaptismPatterns };

// Run analysis if called directly
if (require.main === module) {
  const analyzer = new OrthodoxBaptismAnalyzer();
  analyzer.analyzeRealRecords().catch(console.error);
}
