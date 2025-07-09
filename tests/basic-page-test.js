// Basic test to check if the page loads correctly
const puppeteer = require('puppeteer');

async function testBasicPageLoad() {
  console.log('🧪 Testing basic page load...\n');
  
  let browser;
  try {
    // Launch browser
    browser = await puppeteer.launch({
      headless: true, // Use legacy headless mode for compatibility
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    // Navigate to page
    console.log('📄 Loading http://localhost:8000...');
    const response = await page.goto('http://localhost:8000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    
    console.log(`✅ Page loaded with status: ${response.status()}`);
    
    // Wait for React to load
    console.log('⏳ Waiting for React to initialize...');
    await page.waitForFunction(
      () => window.React && window.ReactDOM,
      { timeout: 10000 }
    );
    console.log('✅ React is loaded');
    
    // Check for login form
    console.log('🔍 Looking for login form...');
    await page.waitForSelector('input[type="text"]', { timeout: 5000 });
    console.log('✅ Username field found');
    
    const passwordField = await page.$('input[type="password"]');
    if (passwordField) {
      console.log('✅ Password field found');
    }
    
    const submitButton = await page.$('button');
    if (submitButton) {
      console.log('✅ Submit button found');
    }
    
    // Check page title
    const titleElement = await page.$('h2');
    if (titleElement) {
      const titleText = await page.evaluate(el => el.textContent, titleElement);
      console.log(`✅ Page title: "${titleText}"`);
    }
    
    // Take screenshot
    await page.screenshot({ 
      path: 'tests/screenshots/basic-page-load.png',
      fullPage: true 
    });
    console.log('📸 Screenshot saved to tests/screenshots/basic-page-load.png');
    
    // Test login error
    console.log('\n🔐 Testing login with invalid credentials...');
    await page.type('input[type="text"]', 'invalid_user');
    await page.type('input[type="password"]', 'invalid_pass');
    await page.click('button');
    
    // Wait for error message
    try {
      await page.waitForSelector('.text-red-300', { timeout: 5000 });
      const errorText = await page.$eval('.text-red-300', el => el.textContent);
      console.log(`✅ Error message displayed: "${errorText}"`);
    } catch (e) {
      console.log('❌ No error message found');
    }
    
    console.log('\n✅ All basic tests passed!');
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    
    // Take error screenshot
    if (browser) {
      const page = await browser.newPage();
      await page.goto('http://localhost:8000');
      await page.screenshot({ 
        path: 'tests/screenshots/error-state.png',
        fullPage: true 
      });
      console.log('📸 Error screenshot saved');
    }
    
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testBasicPageLoad();