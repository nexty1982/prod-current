#!/usr/bin/env node

// Analyze real Orthodox baptism registry pages to enhance extraction patterns
// Based on user-provided registry book images

console.log('🔍 Analyzing Real Orthodox Baptism Registry Pages\n');

// Analysis of the provided baptism registry images
const registryAnalysis = {
  format: 'Orthodox Baptism Registry Book',
  layout: 'Tabular/Grid format with multiple columns',
  languages: ['English', 'Cyrillic (Russian/Serbian)'],
  yearRange: '1971-1972',
  
  columns: {
    leftPage: [
      'Entry Number',
      'Date of Birth', 
      'Name of Child (Last, First)',
      "Father's Full Name",
      "Mother's Maiden Name"
    ],
    rightPage: [
      'Full Names of Sponsors (Godparents)',
      "Priest's Name"
    ]
  },
  
  patterns: {
    entryNumbers: ['071', '208', '209', '30x', '51', '52', '53', '54', '55'],
    dates: [
      '23-07', '23-08', '26-08', '27-09', // Birth dates
      '03-08', '15-08', '21-08', '28-09'  // Baptism dates
    ],
    
    names: {
      children: [
        'Tankred Paul Spaghetti',
        'Joseph John Konkios',
        'Scott Lawrence Janielli', 
        'Brenda Danila',
        'Edward Danila',
        'Gregory Matutina',
        'Robert Petros',
        'Marko Stefanos'
      ],
      fathers: [
        'Kim Stefanis',
        'John Konkios',
        'Gerard Louis Janielli',
        'Edward Danila',
        'Edward Danila', 
        'Andrej Danilo',
        'Gherman Stefanis',
        'Nikola Stefanis'
      ],
      mothers: [
        'Sava Vasily',
        'Bertha Latifin',
        'Karen Chelemiak',
        'Mary Latifin',
        'Mary Latifin',
        'Marcia Petkovic',
        'Gherman Stefanis', 
        'Gordana Miladinovik'
      ],
      clergy: [
        'Rev. Vadim A. Pogrebnjak',
        'Rev. Robert A. George Lewis',
        'Rev. Fr. Vadim A. Pogrebnjak'
      ],
      godparents: [
        'Donald Dearden, Mary Dearden (Betty Ann Stevens)',
        'Vincent Panaretovsky, Anna Leehinsky',
        'Harry Elshorts, Evelyn Elchink',
        'Gregory Andrej Chelemiak, Joan Groznjevski'
      ]
    }
  },
  
  specialFeatures: {
    mixedLanguages: 'Names appear in both Latin and Cyrillic scripts',
    tabularLayout: 'Information spans across multiple columns and pages',
    handwriting: 'Mix of printed forms and handwritten entries',
    crossReferences: 'Some entries reference other churches or locations',
    orthodoxTerminology: 'Uses Orthodox-specific terms like "sponsors" for godparents'
  }
};

console.log('📊 Registry Analysis Results:');
console.log(`Format: ${registryAnalysis.format}`);
console.log(`Layout: ${registryAnalysis.layout}`);
console.log(`Languages: ${registryAnalysis.languages.join(', ')}`);
console.log(`Year Range: ${registryAnalysis.yearRange}`);

console.log('\n📝 Column Structure:');
console.log('Left Page Columns:');
registryAnalysis.columns.leftPage.forEach((col, i) => {
  console.log(`  ${i + 1}. ${col}`);
});
console.log('Right Page Columns:');
registryAnalysis.columns.rightPage.forEach((col, i) => {
  console.log(`  ${i + 1}. ${col}`);
});

console.log('\n👥 Sample Names Found:');
console.log('Children:', registryAnalysis.patterns.names.children.slice(0, 5).join(', ') + '...');
console.log('Fathers:', registryAnalysis.patterns.names.fathers.slice(0, 5).join(', ') + '...');
console.log('Clergy:', registryAnalysis.patterns.names.clergy.join(', '));

console.log('\n🎯 Enhanced Extraction Patterns Needed:');
console.log('1. Tabular layout recognition');
console.log('2. Cross-column data association');
console.log('3. Mixed Latin/Cyrillic name handling');
console.log('4. Date format variations (DD-MM, MM-DD-YY)');
console.log('5. Orthodox terminology normalization');
console.log('6. Handwriting OCR noise handling');

// Enhanced patterns for these specific registry formats
const enhancedPatterns = {
  // Registry-specific date patterns
  registryDates: [
    /(\d{1,2})-(\d{1,2})-?(\d{2,4})?/g, // DD-MM or DD-MM-YY
    /(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,  // MM/DD/YY
    /(\w+)\s+(\d{1,2}),?\s+(\d{4})/g     // Month DD, YYYY
  ],
  
  // Names with Orthodox patterns
  orthodoxNames: [
    /\b([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)\b/g, // First Middle Last
    /\b([А-Я][а-я]+)\s+([А-Я][а-я]+)\b/g,                 // Cyrillic names
    /\b(Rev\.?|Fr\.?|Father|Отец)\s+([A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+)/g // Clergy
  ],
  
  // Tabular data extraction
  tabularPatterns: {
    entryNumber: /^(\d{2,3})\s*[xX]?\s*$/,
    dateColumn: /(\d{1,2})-(\d{1,2})-?(\d{2,4})?/,
    nameColumn: /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*,?\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)$/,
    clergyColumn: /^(Rev\.?\s+.*|Fr\.?\s+.*|Father\s+.*)/
  },
  
  // Orthodox-specific terminology
  orthodoxTerms: {
    sponsors: ['sponsors', 'godparents', 'крёстные', 'κουμπάρος'],
    clergy: ['Rev.', 'Fr.', 'Father', 'Priest', 'Священник', 'παπάς'],
    churches: ['Orthodox', 'Byzantine', 'Catholic', 'Church', 'Церковь', 'εκκλησία']
  }
};

console.log('\n✅ Enhanced patterns prepared for registry format');
console.log('✅ Ready to update ChurchRecordEntityExtractor');

module.exports = {
  registryAnalysis,
  enhancedPatterns
};
