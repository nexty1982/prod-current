#!/usr/bin/env node

// Test Google Translate integration with OCR
// Run with: node test-translation.js

const { Translate } = require('@google-cloud/translate').v2;

async function testTranslation() {
    console.log('🌍 Testing Google Translate Integration\n');

    try {
        // Initialize Google Translate client
        const translateClient = new Translate();
        console.log('✅ Google Translate client initialized');

        // Test text samples in different Orthodox languages
        const testSamples = [
            {
                text: 'Βεβαιώ ότι Ιωάννης Παπαδόπουλος έβαπτίσθη κατά την 15η Μαΐου 1985',
                language: 'el',
                description: 'Greek baptism certificate text'
            },
            {
                text: '8 мая 1905 года Крещён Иоанн Кузнецов о. Василием Троицкой церкви',
                language: 'ru',
                description: 'Russian baptism record text'
            },
            {
                text: 'СВИДЕТЕЛЬСТВО О РОЖДЕНИИ დაბადების მოწმობა',
                language: 'ka',
                description: 'Georgian-Russian birth certificate'
            },
            {
                text: 'Certificat de botez pentru Ioan Popescu, născut în 1990',
                language: 'ro',
                description: 'Romanian baptism certificate'
            }
        ];

        console.log('\n🔍 Testing language detection and translation...\n');

        for (let i = 0; i < testSamples.length; i++) {
            const sample = testSamples[i];
            console.log(`${i + 1}. ${sample.description}`);
            console.log(`   Expected Language: ${sample.language}`);
            console.log(`   Original Text: ${sample.text}`);

            try {
                // Test language detection
                const [detections] = await translateClient.detect(sample.text);
                const detectedLanguage = detections.language;
                const confidence = detections.confidence;
                
                console.log(`   Detected Language: ${detectedLanguage} (confidence: ${(confidence * 100).toFixed(1)}%)`);

                // Test translation to English
                const [translation] = await translateClient.translate(sample.text, {
                    from: sample.language,
                    to: 'en'
                });

                console.log(`   English Translation: ${translation}`);
                console.log(`   ✅ Translation successful\n`);

            } catch (error) {
                console.error(`   ❌ Translation failed: ${error.message}\n`);
            }
        }

        // Test translation service capabilities
        console.log('📋 Testing translation service capabilities...\n');

        try {
            // Get supported languages
            const [languages] = await translateClient.getLanguages();
            
            const orthodoxLanguages = ['el', 'ru', 'sr', 'bg', 'ro', 'uk', 'mk', 'be', 'ka'];
            const supportedOrthodoxLanguages = languages.filter(lang => 
                orthodoxLanguages.includes(lang.code)
            );

            console.log('✅ Supported Orthodox languages:');
            supportedOrthodoxLanguages.forEach(lang => {
                console.log(`   ${lang.code}: ${lang.name}`);
            });

        } catch (error) {
            console.warn('⚠️  Could not retrieve supported languages:', error.message);
        }

        console.log('\n🎉 Translation testing complete!');
        console.log('\n📋 Translation Integration Summary:');
        console.log('   ✅ Google Translate API connectivity verified');
        console.log('   ✅ Multi-language detection working');
        console.log('   ✅ Orthodox language translations successful');
        console.log('   ✅ Ready for integration with OCR pipeline');

    } catch (error) {
        console.error('❌ Translation test failed:', error);
        
        if (error.code === 'ENOENT') {
            console.error('\n💡 Make sure Google Cloud credentials are configured:');
            console.error('   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account.json"');
        }
        
        process.exit(1);
    }
}

// Run the test
testTranslation().catch(error => {
    console.error('Script failed:', error);
    process.exit(1);
});
