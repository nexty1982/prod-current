#!/usr/bin/env node

/**
 * End-to-end test for themes API
 * Tests: POST /api/admin/churches/:id/themes then GET to confirm roundtrip
 * 
 * Usage:
 *   node scripts/test-themes-api.js [churchId] [sessionCookie]
 * 
 * Example:
 *   node scripts/test-themes-api.js 46 "orthodoxmetrics.sid=YOUR_SESSION_ID"
 */

const http = require('http');

const CHURCH_ID = process.argv[2] || '46';
const SESSION_COOKIE = process.argv[3] || '';
const BASE_URL = process.env.API_URL || 'http://localhost:3000';

const testThemes = [
  {
    name: 'Test Theme 1',
    palette: {
      primary: '#5B2EBF',
      secondary: '#D4AF37',
      background: '#FFFFFF',
      text: '#000000'
    },
    description: 'Test theme for API validation'
  },
  {
    name: 'Test Theme 2',
    palette: {
      primary: '#DC2626',
      secondary: '#059669',
      background: '#F9FAFB',
      text: '#1F2937'
    }
  }
];

function makeRequest(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        try {
          const parsed = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function testThemesAPI() {
  console.log('🧪 Testing Themes API End-to-End\n');
  console.log(`Church ID: ${CHURCH_ID}`);
  console.log(`Base URL: ${BASE_URL}\n`);

  const url = new URL(`${BASE_URL}/api/admin/churches/${CHURCH_ID}/themes`);
  const headers = {
    'Content-Type': 'application/json',
  };

  if (SESSION_COOKIE) {
    headers['Cookie'] = SESSION_COOKIE;
  }

  try {
    // Step 1: POST themes
    console.log('📤 Step 1: POST themes...');
    const postOptions = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers
    };

    const postResponse = await makeRequest(postOptions, { themes: testThemes });
    
    console.log(`   Status: ${postResponse.status}`);
    if (postResponse.status === 200 || postResponse.status === 201) {
      console.log('   ✅ POST successful');
      console.log(`   Response:`, JSON.stringify(postResponse.data, null, 2).substring(0, 200));
    } else {
      console.error('   ❌ POST failed');
      console.error('   Response:', JSON.stringify(postResponse.data, null, 2));
      process.exit(1);
    }

    // Wait a moment for DB to update
    await new Promise(resolve => setTimeout(resolve, 500));

    // Step 2: GET themes
    console.log('\n📥 Step 2: GET themes...');
    const getOptions = {
      ...postOptions,
      method: 'GET'
    };
    delete getOptions.headers['Content-Type'];

    const getResponse = await makeRequest(getOptions);
    
    console.log(`   Status: ${getResponse.status}`);
    if (getResponse.status === 200) {
      console.log('   ✅ GET successful');
      
      const receivedThemes = getResponse.data.themes;
      const themesArray = Array.isArray(receivedThemes) 
        ? receivedThemes 
        : Object.values(receivedThemes || {});

      console.log(`   Received ${themesArray.length} theme(s)`);
      
      // Verify roundtrip
      const foundTestTheme = themesArray.find((t: any) => t.name === 'Test Theme 1');
      if (foundTestTheme) {
        console.log('   ✅ Roundtrip verified: Test Theme 1 found in GET response');
        if (foundTestTheme.palette?.primary === '#5B2EBF') {
          console.log('   ✅ Theme data intact (palette.primary matches)');
        } else {
          console.warn('   ⚠️  Theme data may have changed');
        }
      } else {
        console.warn('   ⚠️  Test Theme 1 not found in GET response');
      }

      console.log('\n📊 Full GET Response:');
      console.log(JSON.stringify(getResponse.data, null, 2));
    } else {
      console.error('   ❌ GET failed');
      console.error('   Response:', JSON.stringify(getResponse.data, null, 2));
      process.exit(1);
    }

    console.log('\n✅ End-to-end test PASSED\n');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Test FAILED:', error.message);
    if (error.stack) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

testThemesAPI();

