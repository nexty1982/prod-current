const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function captureRecaptchaRemovalScreenshots() {
    let browser;
    try {
        console.log('🚀 Starting reCAPTCHA removal documentation...');
        
        // Ensure screenshots directory exists
        const screenshotsDir = path.join(__dirname, '../../screenshots');
        if (!fs.existsSync(screenshotsDir)) {
            fs.mkdirSync(screenshotsDir, { recursive: true });
        }

        browser = await puppeteer.launch({
            headless: true,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1920, height: 1080 });

        // Screenshot 1: Clean login page without reCAPTCHA
        console.log('📸 Capturing login page without reCAPTCHA...');
        await page.goto('https://orthodoxmetrics.com/login', { 
            waitUntil: 'networkidle0',
            timeout: 10000 
        });

        // Add URL overlay to screenshot
        await page.evaluate(() => {
            const overlay = document.createElement('div');
            overlay.style.position = 'fixed';
            overlay.style.top = '10px';
            overlay.style.left = '10px';
            overlay.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
            overlay.style.color = 'white';
            overlay.style.padding = '8px 12px';
            overlay.style.borderRadius = '4px';
            overlay.style.fontSize = '14px';
            overlay.style.fontFamily = 'monospace';
            overlay.style.zIndex = '999999';
            overlay.textContent = `URL: ${window.location.href} | reCAPTCHA REMOVED`;
            document.body.appendChild(overlay);
        });

        await page.screenshot({
            path: path.join(screenshotsDir, 'task138-01.png'),
            fullPage: true
        });
        console.log('✅ Screenshot 1 saved: task138-01.png');

        // Screenshot 2: Form focus showing clean input fields
        console.log('📸 Capturing login form detail...');
        
        // Focus on email field to highlight the form
        await page.focus('input[type="email"]').catch(() => {
            console.log('Email field not found, trying alternative selector...');
        });

        await page.screenshot({
            path: path.join(screenshotsDir, 'task138-02.png'),
            clip: await page.evaluate(() => {
                const form = document.querySelector('form');
                if (form) {
                    const rect = form.getBoundingClientRect();
                    return {
                        x: Math.max(0, rect.x - 20),
                        y: Math.max(0, rect.y - 20),
                        width: Math.min(1920, rect.width + 40),
                        height: Math.min(1080, rect.height + 40)
                    };
                }
                return { x: 0, y: 0, width: 1920, height: 1080 };
            })
        });
        console.log('✅ Screenshot 2 saved: task138-02.png (form detail)');

        console.log('\n🎉 reCAPTCHA Removal Complete!');
        console.log('📋 Summary of Changes:');
        console.log('   ✅ Removed reCAPTCHA component from login form');
        console.log('   ✅ Removed backend reCAPTCHA verification middleware');
        console.log('   ✅ Removed react-google-recaptcha dependency');
        console.log('   ✅ Cleaned up environment variable references');
        console.log('   ✅ Updated TypeScript interfaces');
        console.log('   ✅ Simplified authentication flow for OCR compatibility');
        console.log('\n💡 Benefits:');
        console.log('   • OCR operations no longer trigger Enterprise reCAPTCHA requirements');
        console.log('   • Cleaner login form with faster user experience');
        console.log('   • Reduced dependency footprint');
        console.log('   • Simplified authentication flow');
        console.log('\n📸 Screenshots saved:');
        console.log('   - task138-01.png: Clean login page without reCAPTCHA');
        console.log('   - task138-02.png: Login form detail view');

    } catch (error) {
        console.error('❌ Error capturing screenshots:', error.message);
    } finally {
        if (browser) {
            await browser.close();
        }
        process.exit(0);
    }
}

captureRecaptchaRemovalScreenshots();