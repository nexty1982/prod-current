// Site Testing Utility using Puppeteer
// Performs automated testing on deployed church sites

const puppeteer = require('puppeteer');
const logger = require('./logger');

// Test configuration
const TEST_CONFIG = {
  timeout: 30000,
  viewport: { width: 1366, height: 768 },
  userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  headless: process.env.NODE_ENV === 'production'
};

// Language-specific test expectations
const LANGUAGE_TESTS = {
  en: {
    expectedTexts: ['Orthodox Church', 'Login', 'Calendar', 'Records'],
    titlePattern: /orthodox.*church/i,
    loginButtonText: 'Login'
  },
  gr: {
    expectedTexts: ['Ορθόδοξη Εκκλησία', 'Σύνδεση', 'Ημερολόγιο', 'Αρχεία'],
    titlePattern: /ορθόδοξ.*εκκλησ/i,
    loginButtonText: 'Σύνδεση'
  },
  ru: {
    expectedTexts: ['Православная Церковь', 'Вход', 'Календарь', 'Записи'],
    titlePattern: /православ.*церк/i,
    loginButtonText: 'Вход'
  },
  ro: {
    expectedTexts: ['Biserica Ortodoxă', 'Autentificare', 'Calendar', 'Înregistrări'],
    titlePattern: /biseric.*ortodox/i,
    loginButtonText: 'Autentificare'
  }
};

// Test deployed site
async function testDeployedSite({ siteUrl, language }) {
  let browser = null;
  
  try {
    logger.info(`Starting automated testing for ${siteUrl} in ${language}`);
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu'
      ]
    });

    const page = await browser.newPage();
    
    // Set viewport and user agent
    await page.setViewport(TEST_CONFIG.viewport);
    await page.setUserAgent(TEST_CONFIG.userAgent);

    // Enable request interception for monitoring
    await page.setRequestInterception(true);
    const requests = [];
    const responses = [];
    
    page.on('request', request => {
      requests.push({
        url: request.url(),
        method: request.method(),
        resourceType: request.resourceType()
      });
      request.continue();
    });

    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status(),
        ok: response.ok()
      });
    });

    // Capture console logs and errors
    const consoleLogs = [];
    const errors = [];
    
    page.on('console', msg => {
      consoleLogs.push({
        type: msg.type(),
        text: msg.text()
      });
    });

    page.on('pageerror', error => {
      errors.push(error.message);
    });

    // Start tests
    const testResults = {
      siteUrl,
      language,
      startTime: new Date().toISOString(),
      tests: {}
    };

    // Test 1: Basic page load
    testResults.tests.pageLoad = await testPageLoad(page, siteUrl);

    // Test 2: Language-specific content
    testResults.tests.languageContent = await testLanguageContent(page, language);

    // Test 3: Navigation elements
    testResults.tests.navigation = await testNavigation(page, language);

    // Test 4: Login functionality
    testResults.tests.loginForm = await testLoginForm(page, language);

    // Test 5: Mobile responsiveness
    testResults.tests.mobile = await testMobileResponsiveness(page);

    // Test 6: Performance metrics
    testResults.tests.performance = await testPerformance(page);

    // Test 7: Accessibility
    testResults.tests.accessibility = await testAccessibility(page);

    // Collect final metrics
    testResults.endTime = new Date().toISOString();
    testResults.duration = Date.now() - new Date(testResults.startTime).getTime();
    testResults.requests = requests.length;
    testResults.errors = errors;
    testResults.consoleLogs = consoleLogs.filter(log => log.type === 'error');
    testResults.httpErrors = responses.filter(r => !r.ok).length;

    // Calculate overall success
    const passedTests = Object.values(testResults.tests).filter(test => test.passed).length;
    const totalTests = Object.keys(testResults.tests).length;
    testResults.success = passedTests === totalTests && errors.length === 0;
    testResults.score = Math.round((passedTests / totalTests) * 100);

    logger.info(`Site testing completed: ${testResults.score}% passed (${passedTests}/${totalTests})`);

    return testResults;

  } catch (error) {
    logger.error(`Site testing failed for ${siteUrl}:`, error);
    return {
      success: false,
      error: error.message,
      siteUrl,
      language
    };
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Test basic page load
async function testPageLoad(page, siteUrl) {
  try {
    const startTime = Date.now();
    
    const response = await page.goto(siteUrl, {
      waitUntil: 'networkidle2',
      timeout: TEST_CONFIG.timeout
    });

    const loadTime = Date.now() - startTime;
    
    return {
      passed: response.ok(),
      loadTime,
      status: response.status(),
      details: {
        statusOk: response.ok(),
        fastLoad: loadTime < 5000,
        message: response.ok() ? 'Page loaded successfully' : `Failed with status ${response.status()}`
      }
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message,
      details: { message: 'Page failed to load' }
    };
  }
}

// Test language-specific content
async function testLanguageContent(page, language) {
  try {
    const langConfig = LANGUAGE_TESTS[language] || LANGUAGE_TESTS.en;
    const results = { passed: true, details: {} };

    // Check page title
    const title = await page.title();
    results.details.titleTest = {
      title,
      matches: langConfig.titlePattern.test(title)
    };

    // Check for expected language texts
    const pageText = await page.evaluate(() => document.body.innerText);
    results.details.textTests = [];

    for (const expectedText of langConfig.expectedTexts) {
      const found = pageText.includes(expectedText);
      results.details.textTests.push({
        text: expectedText,
        found
      });
      if (!found) results.passed = false;
    }

    // Check HTML lang attribute
    const htmlLang = await page.evaluate(() => document.documentElement.lang);
    results.details.htmlLang = {
      expected: language,
      actual: htmlLang,
      matches: htmlLang === language
    };

    if (!results.details.htmlLang.matches) {
      results.passed = false;
    }

    return results;
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

// Test navigation elements
async function testNavigation(page, language) {
  try {
    const results = { passed: true, details: {} };

    // Check for navigation menu
    const navExists = await page.$('nav') !== null;
    results.details.navigationMenu = navExists;

    // Check for main navigation links
    const expectedLinks = ['login', 'calendar', 'records'];
    const links = await page.$$eval('a', anchors => 
      anchors.map(a => ({ href: a.href, text: a.textContent.trim() }))
    );

    results.details.navigationLinks = {
      total: links.length,
      hasLoginLink: links.some(link => link.href.includes('/login')),
      hasCalendarLink: links.some(link => link.href.includes('/calendar')),
      hasRecordsLink: links.some(link => 
        link.href.includes('/records') || 
        link.href.includes('/baptism') || 
        link.href.includes('/marriage')
      )
    };

    // Check if critical links exist
    if (!results.details.navigationLinks.hasLoginLink || 
        !results.details.navigationLinks.hasCalendarLink) {
      results.passed = false;
    }

    return results;
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

// Test login form
async function testLoginForm(page, language) {
  try {
    const results = { passed: true, details: {} };

    // Navigate to login page
    const loginLink = await page.$('a[href*="/login"]');
    if (!loginLink) {
      results.details.loginLinkFound = false;
      results.passed = false;
      return results;
    }

    await loginLink.click();
    await page.waitForSelector('form', { timeout: 5000 });

    // Check for login form elements
    const emailInput = await page.$('input[type="email"], input[name="email"], input[name="username"]');
    const passwordInput = await page.$('input[type="password"]');
    const submitButton = await page.$('button[type="submit"], input[type="submit"]');

    results.details.formElements = {
      emailInput: !!emailInput,
      passwordInput: !!passwordInput,
      submitButton: !!submitButton
    };

    // Test form validation
    if (emailInput && passwordInput && submitButton) {
      await emailInput.click();
      await passwordInput.click();
      await submitButton.click();
      
      // Wait a moment for validation messages
      await page.waitForTimeout(1000);
      
      const validationMessages = await page.$$eval('.invalid-feedback, .error, .form-error', 
        elements => elements.map(el => el.textContent)
      );
      
      results.details.validationWorks = validationMessages.length > 0;
    } else {
      results.passed = false;
    }

    return results;
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

// Test mobile responsiveness
async function testMobileResponsiveness(page) {
  try {
    const results = { passed: true, details: {} };

    // Test mobile viewport
    await page.setViewport({ width: 375, height: 667 }); // iPhone SE
    await page.waitForTimeout(1000);

    // Check if navigation collapses on mobile
    const mobileNavExists = await page.$('.navbar-toggler, .mobile-menu, .hamburger') !== null;
    results.details.mobileNavigation = mobileNavExists;

    // Check for responsive meta tag
    const viewportMeta = await page.evaluate(() => {
      const meta = document.querySelector('meta[name="viewport"]');
      return meta ? meta.content : null;
    });

    results.details.viewportMeta = {
      exists: !!viewportMeta,
      content: viewportMeta,
      responsive: viewportMeta && viewportMeta.includes('width=device-width')
    };

    // Reset to desktop viewport
    await page.setViewport(TEST_CONFIG.viewport);

    return results;
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

// Test performance metrics
async function testPerformance(page) {
  try {
    const metrics = await page.metrics();
    const performanceEntries = await page.evaluate(() => {
      return JSON.stringify(performance.getEntriesByType('navigation'));
    });

    const navigation = JSON.parse(performanceEntries)[0];

    return {
      passed: navigation.loadEventEnd < 5000, // Under 5 seconds
      details: {
        loadTime: Math.round(navigation.loadEventEnd),
        domContentLoaded: Math.round(navigation.domContentLoadedEventEnd),
        firstPaint: Math.round(navigation.loadEventEnd - navigation.fetchStart),
        jsHeapUsedSize: metrics.JSHeapUsedSize,
        jsHeapTotalSize: metrics.JSHeapTotalSize
      }
    };
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

// Test basic accessibility
async function testAccessibility(page) {
  try {
    const results = { passed: true, details: {} };

    // Check for alt attributes on images
    const imagesWithoutAlt = await page.$$eval('img:not([alt])', imgs => imgs.length);
    results.details.imagesWithoutAlt = imagesWithoutAlt;

    // Check for headings structure
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', 
      headings => headings.map(h => h.tagName)
    );
    results.details.headingsStructure = headings;
    results.details.hasH1 = headings.includes('H1');

    // Check for form labels
    const inputsWithoutLabels = await page.evaluate(() => {
      const inputs = document.querySelectorAll('input[type="text"], input[type="email"], input[type="password"]');
      let count = 0;
      inputs.forEach(input => {
        const hasLabel = document.querySelector(`label[for="${input.id}"]`) || 
                         input.closest('label') ||
                         input.getAttribute('aria-label') ||
                         input.getAttribute('placeholder');
        if (!hasLabel) count++;
      });
      return count;
    });

    results.details.inputsWithoutLabels = inputsWithoutLabels;

    // Basic accessibility score
    const issues = imagesWithoutAlt + inputsWithoutLabels + (results.details.hasH1 ? 0 : 1);
    results.passed = issues === 0;
    results.details.accessibilityScore = Math.max(0, 100 - (issues * 10));

    return results;
  } catch (error) {
    return {
      passed: false,
      error: error.message
    };
  }
}

// Run comprehensive tests for all church sites
async function testAllChurchSites() {
  try {
    const db = require('../../config/db');
    
    const [sites] = await db.execute(`
      SELECT site_slug, site_url, language_preference, church_name
      FROM church_provision_queue 
      WHERE status = 'provisioned' AND site_url IS NOT NULL
    `);

    const results = [];

    for (const site of sites) {
      try {
        const testResult = await testDeployedSite({
          siteUrl: site.site_url,
          language: site.language_preference
        });

        results.push({
          churchName: site.church_name,
          siteSlug: site.site_slug,
          ...testResult
        });

        // Add delay between tests
        await new Promise(resolve => setTimeout(resolve, 2000));

      } catch (error) {
        results.push({
          churchName: site.church_name,
          siteSlug: site.site_slug,
          success: false,
          error: error.message
        });
      }
    }

    return {
      success: true,
      totalSites: sites.length,
      results
    };

  } catch (error) {
    logger.error('Failed to test all church sites:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  testDeployedSite,
  testAllChurchSites,
  TEST_CONFIG,
  LANGUAGE_TESTS
};
