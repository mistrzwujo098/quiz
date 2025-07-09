// Quick test to verify basic functionality
const puppeteer = require('puppeteer');

async function quickTest() {
  console.log('🧪 Running quick test...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Load page
    console.log('📄 Loading page...');
    await page.goto('http://localhost:8000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log('✅ Page loaded');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/quick-test.png' });
    console.log('📸 Screenshot saved');
    
    // Wait a bit to see the page
    await page.waitForTimeout(2000);
    
    console.log('✅ Test completed successfully!');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

quickTest();