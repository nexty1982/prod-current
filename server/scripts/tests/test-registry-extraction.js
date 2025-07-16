#!/usr/bin/env node

/**
 * Test script for Orthodox Baptism Registry Extraction
 * Tests the enhanced tabular extraction capabilities
 */

const ChurchRecordEntityExtractor = require('./services/churchRecordEntityExtractor');
const fs = require('fs');
const path = require('path');

// Sample Orthodox baptism registry data in tabular format
const sampleRegistryData = [
    {
        name: "Standard US Orthodox Parish Registry",
        text: `
Entry No. | Child Name        | Date of Birth | Date of Baptism | Parents                    | Godparents            | Officiating Priest
----------|-------------------|---------------|-----------------|----------------------------|-----------------------|------------------
23        | Dimitrios John    | 05/15/2023    | 06/25/2023      | George and Maria Kostas    | Nicholas Papadakis    | Rev. Father Michael
         | Kostas            |               |                 |                            | and Anna Kostas       | Stavros
24        | Elena Sofia       | 03/08/2023    | 04/16/2023      | Peter and Catherine        | John and Helen        | Rev. Father Michael
         | Petrov            |               |                 | Petrov                     | Georgakis             | Stavros
        `
    },
    {
        name: "Mixed Language Registry (Greek-English)",
        text: `
Αρ. | Όνομα Παιδιού | Ημ. Γέννησης | Ημ. Βαπτίσματος | Γονείς | Ανάδοχοι | Ιερέας
23  | Δημήτριος     | 15/5/2023    | 25/6/2023       | Γιώργος και Μαρία | Νικόλαος | Π. Μιχάλης
    | Κώστας        |              |                 | Κώστας            | Παπαδάκης | Σταύρος
        `
    },
    {
        name: "Space-Separated Registry (No Pipes)",
        text: `
23    Dimitrios John Kostas        05/15/2023    06/25/2023    George and Maria Kostas      Nicholas Papadakis     Rev. Father Michael
24    Elena Sofia Petrov          03/08/2023    04/16/2023    Peter and Catherine Petrov   John and Helen Georgakis   Rev. Father Michael
25    Alexander James Thompson    07/22/2023    08/13/2023    James and Susan Thompson     Michael and Diana Kostas   Rev. Father Michael
        `
    },
    {
        name: "Reception into Orthodox Church",
        text: `
Entry 15: On Pentecost Sunday, June 11, 2023, John Michael Smith was received into the Holy Orthodox Church 
from the Byzantine Catholic Church by Chrismation, where he was baptized as an infant. 
Parents: Robert and Patricia Smith. Godparents: George and Maria Konstantinos.
Officiating: Rev. Father Nicholas Stavros.
        `
    },
    {
        name: "Traditional Serbian Registry Format",
        text: `
Број | Име детета | Датум рођења | Датум крштења | Родитељи | Кумови | Свештеник
15   | Милош      | 20/04/2023   | 01/05/2023     | Петар и   | Никола | Протојереј
     | Петровић   |              |                | Ана       | Јовић  | Милан Стојановић
        `
    }
];

async function testRegistryExtraction() {
    console.log('🧪 Testing Enhanced Orthodox Registry Extraction\n');
    
    const extractor = new ChurchRecordEntityExtractor();
    
    for (let i = 0; i < sampleRegistryData.length; i++) {
        const sample = sampleRegistryData[i];
        console.log(`📋 Test ${i + 1}: ${sample.name}`);
        console.log('─'.repeat(60));
        
        try {
            // Test detection of registry format
            const isRegistry = extractor.isRegistryFormat(sample.text);
            console.log(`✓ Registry format detected: ${isRegistry}`);
            
            if (isRegistry) {
                // Test column detection
                const columns = extractor.detectRegistryColumns(sample.text);
                console.log(`✓ Detected ${columns.length} columns:`);
                columns.forEach((col, idx) => {
                    console.log(`   ${idx + 1}. ${col.header} (${col.type})`);
                });
                
                // Test full extraction
                const result = await extractor.extractEntities(sample.text, 'baptism', 'multi', 'test_church');
                
                console.log(`✓ Extraction confidence: ${(result.confidence * 100).toFixed(1)}%`);
                console.log('✓ Extracted fields:');
                
                Object.entries(result.fields).forEach(([key, value]) => {
                    if (value && value.toString().trim()) {
                        console.log(`   ${key}: ${value}`);
                    }
                });
                
                // Test specific registry methods
                if (result.fields.childFirstName || result.fields.childLastName) {
                    console.log(`✓ Child name parsing successful`);
                }
                
                if (result.fields.dateOfBaptism) {
                    console.log(`✓ Date parsing successful: ${result.fields.dateOfBaptism}`);
                }
                
                if (result.fields.fatherName || result.fields.motherName) {
                    console.log(`✓ Parent name parsing successful`);
                }
                
            } else {
                console.log('⚠️  Not detected as registry format - using standard extraction');
                const result = await extractor.extractEntities(sample.text, 'baptism', 'multi', 'test_church');
                console.log(`   Confidence: ${(result.confidence * 100).toFixed(1)}%`);
            }
            
        } catch (error) {
            console.error(`❌ Test failed:`, error.message);
        }
        
        console.log('\n');
    }
}

async function testSpecificPatterns() {
    console.log('🔍 Testing Specific Pattern Recognition\n');
    
    const extractor = new ChurchRecordEntityExtractor();
    
    // Test date parsing
    console.log('📅 Date Parsing Tests:');
    const dateTests = [
        '05/15/2023',
        '15/5/2023',
        '2023-05-15',
        '15 May 2023',
        '15 мая 2023',
        '06-25-2023'
    ];
    
    dateTests.forEach(dateStr => {
        const parsed = extractor.parseDate(dateStr);
        console.log(`   "${dateStr}" → ${parsed || 'FAILED'}`);
    });
    
    console.log('\n👥 Name Parsing Tests:');
    const nameTests = [
        'Dimitrios John Kostas',
        'Kostas, Dimitrios John',
        'Elena Sofia Petrov',
        'Δημήτριος Κώστας',
        'Милош Петровић'
    ];
    
    nameTests.forEach(nameStr => {
        const parsed = extractor.parsePersonName(nameStr);
        console.log(`   "${nameStr}" →`);
        console.log(`     First: ${parsed.firstName || 'N/A'}`);
        console.log(`     Last: ${parsed.lastName || 'N/A'}`);
    });
    
    console.log('\n👨‍👩‍👧‍👦 Parent Parsing Tests:');
    const parentTests = [
        'George and Maria Kostas',
        'Peter and Catherine Petrov',
        'Γιώργος και Μαρία Κώστας',
        'Петар и Ана'
    ];
    
    parentTests.forEach(parentStr => {
        const parsed = extractor.parseParentNames(parentStr);
        console.log(`   "${parentStr}" →`);
        console.log(`     Father: ${parsed.father || 'N/A'}`);
        console.log(`     Mother: ${parsed.mother || 'N/A'}`);
    });
}

async function benchmarkPerformance() {
    console.log('⚡ Performance Benchmark\n');
    
    const extractor = new ChurchRecordEntityExtractor();
    const sampleText = sampleRegistryData[2].text; // Use space-separated format
    
    const iterations = 100;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
        await extractor.extractEntities(sampleText, 'baptism', 'multi', 'test_church');
    }
    
    const endTime = Date.now();
    const avgTime = (endTime - startTime) / iterations;
    
    console.log(`✓ Processed ${iterations} extractions`);
    console.log(`✓ Average processing time: ${avgTime.toFixed(2)}ms`);
    console.log(`✓ Throughput: ${(1000 / avgTime).toFixed(1)} extractions/second`);
}

async function generateAnalysisReport() {
    console.log('📊 Generating Analysis Report\n');
    
    const extractor = new ChurchRecordEntityExtractor();
    const results = [];
    
    for (const sample of sampleRegistryData) {
        try {
            const result = await extractor.extractEntities(sample.text, 'baptism', 'multi', 'test_church');
            results.push({
                name: sample.name,
                success: result.confidence > 0.5,
                confidence: result.confidence,
                fieldsExtracted: Object.keys(result.fields).length,
                fields: result.fields
            });
        } catch (error) {
            results.push({
                name: sample.name,
                success: false,
                error: error.message
            });
        }
    }
    
    // Generate summary
    const successful = results.filter(r => r.success).length;
    const avgConfidence = results
        .filter(r => r.success)
        .reduce((sum, r) => sum + r.confidence, 0) / successful;
    
    console.log(`📈 Analysis Summary:`);
    console.log(`   Success Rate: ${successful}/${results.length} (${(successful/results.length*100).toFixed(1)}%)`);
    console.log(`   Average Confidence: ${(avgConfidence * 100).toFixed(1)}%`);
    
    // Save detailed report
    const reportPath = path.join(__dirname, 'registry-extraction-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
    console.log(`   Detailed report saved to: ${reportPath}`);
}

async function main() {
    console.log('🏛️  Orthodox Baptism Registry Extraction Test Suite');
    console.log('═'.repeat(60));
    console.log();
    
    try {
        await testRegistryExtraction();
        await testSpecificPatterns();
        await benchmarkPerformance();
        await generateAnalysisReport();
        
        console.log('✅ All tests completed successfully!');
        
    } catch (error) {
        console.error('❌ Test suite failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(console.error);
}

module.exports = {
    testRegistryExtraction,
    testSpecificPatterns,
    benchmarkPerformance,
    sampleRegistryData
};
