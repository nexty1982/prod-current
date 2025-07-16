#!/usr/bin/env node

// Test script for Google Cloud Translation API
// Run with: node test-translation-api.js

console.log('🌍 Testing Google Cloud Translation API\n');

async function testTranslationAPI() {
  try {
    // Import the translation service
    const { Translate } = require('@google-cloud/translate').v2;
    const translateClient = new Translate();
    
    console.log('✅ Translation client created');
    
    // Test basic translation
    console.log('\n1️⃣ Testing English to Spanish translation...');
    const [translation] = await translateClient.translate('Hello World!', 'es');
    console.log('✅ Translation successful!');
    console.log(`   Original: "Hello World!"`);
    console.log(`   Spanish: "${translation}"`);
    
    // Test language detection
    console.log('\n2️⃣ Testing language detection...');
    const [detection] = await translateClient.detect('Bonjour le monde!');
    console.log('✅ Language detection successful!');
    console.log(`   Text: "Bonjour le monde!"`);
    console.log(`   Detected language: ${detection.language}`);
    console.log(`   Confidence: ${detection.confidence}`);
    
    // Test multiple languages
    console.log('\n3️⃣ Testing multiple language translations...');
    const testText = 'Welcome to Orthodox Metrics OCR service!';
    const languages = ['es', 'fr', 'de', 'it', 'pt'];
    
    for (const lang of languages) {
      try {
        const [result] = await translateClient.translate(testText, lang);
        console.log(`   ${lang.toUpperCase()}: "${result}"`);
      } catch (error) {
        console.log(`   ${lang.toUpperCase()}: ❌ Failed - ${error.message}`);
      }
    }
    
    console.log('\n🎉 Translation API is working correctly!');
    
  } catch (error) {
    console.error('❌ Translation API test failed:', error.message);
    
    if (error.message.includes('has not been used') || error.message.includes('disabled')) {
      console.log('\n💡 Solution:');
      console.log('   1. Go to: https://console.developers.google.com/apis/api/translate.googleapis.com/overview?project=937503688469');
      console.log('   2. Click "ENABLE" button');
      console.log('   3. Wait 1-2 minutes and try again');
    } else if (error.message.includes('permission') || error.message.includes('auth')) {
      console.log('\n💡 Solution:');
      console.log('   1. Check that GOOGLE_APPLICATION_CREDENTIALS is set correctly');
      console.log('   2. Verify the service account has Translation API permissions');
    } else {
      console.log('\n💡 Other potential issues:');
      console.log('   1. Check internet connectivity');
      console.log('   2. Verify Google Cloud project billing is enabled');
      console.log('   3. Check service account permissions');
    }
  }
}

// Run the test
testTranslationAPI().then(() => {
  console.log('\n📋 Test completed');
}).catch(err => {
  console.error('❌ Test script error:', err);
});
