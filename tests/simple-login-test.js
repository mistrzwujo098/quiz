// Simple login test to verify basic functionality
const puppeteer = require('puppeteer');

async function testLogin() {
  console.log('🧪 Testing login functionality...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false, // Show browser for debugging
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Test 1: Page loads
    console.log('📄 Loading page...');
    await page.goto('http://localhost:8000', {
      waitUntil: 'networkidle0',
      timeout: 30000
    });
    console.log('✅ Page loaded successfully');
    
    // Test 2: React initializes
    console.log('⏳ Waiting for React...');
    await page.waitForFunction(
      () => window.React && window.ReactDOM,
      { timeout: 10000 }
    );
    console.log('✅ React initialized');
    
    // Test 3: Login form appears
    console.log('🔍 Looking for login form...');
    await page.waitForSelector('input[placeholder="Nazwa użytkownika"]', { timeout: 5000 });
    console.log('✅ Login form found');
    
    // Test 4: Test invalid login
    console.log('\n🔐 Testing invalid login...');
    await page.type('input[placeholder="Nazwa użytkownika"]', 'invalid_user');
    await page.type('input[placeholder="Hasło"]', 'wrong_password');
    
    // Take screenshot before submit
    await page.screenshot({ path: 'tests/screenshots/before-login.png' });
    
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(1500);
    
    // Check for error
    const errorElement = await page.$('.text-red-300');
    if (errorElement) {
      const errorText = await page.evaluate(el => el.textContent, errorElement);
      console.log(`✅ Error message displayed: "${errorText}"`);
    } else {
      console.log('❌ No error message found');
    }
    
    // Take screenshot after invalid login
    await page.screenshot({ path: 'tests/screenshots/invalid-login.png' });
    
    // Test 5: Test valid teacher login
    console.log('\n👩‍🏫 Testing teacher login...');
    
    // Clear fields
    await page.evaluate(() => {
      document.querySelector('input[placeholder="Nazwa użytkownika"]').value = '';
      document.querySelector('input[placeholder="Hasło"]').value = '';
    });
    
    await page.type('input[placeholder="Nazwa użytkownika"]', 'paulinaodmatematyki');
    await page.type('input[placeholder="Hasło"]', 'paulina#314159265');
    
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(3000);
    
    // Check if we're logged in
    const h1Element = await page.$('h1');
    if (h1Element) {
      const titleText = await page.evaluate(el => el.textContent, h1Element);
      console.log(`✅ Logged in successfully: "${titleText}"`);
    } else {
      console.log('❌ Login failed - no title found');
    }
    
    // Take screenshot after login
    await page.screenshot({ path: 'tests/screenshots/teacher-panel.png' });
    
    // Test 6: Logout
    console.log('\n🚪 Testing logout...');
    const logoutButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent && btn.textContent.includes('Wyloguj')
      );
    });
    
    if (logoutButton.asElement()) {
      await logoutButton.click();
      await page.waitForTimeout(2000);
      
      // Check if we're back at login
      const loginInput = await page.$('input[placeholder="Nazwa użytkownika"]');
      if (loginInput) {
        console.log('✅ Logout successful - back at login page');
      } else {
        console.log('❌ Logout failed');
      }
    } else {
      console.log('❌ Logout button not found');
    }
    
    // Test 7: API health check
    console.log('\n🔌 Testing API health...');
    const apiResponse = await page.goto('http://localhost:3001/health');
    const apiData = await apiResponse.json();
    if (apiData.status === 'healthy') {
      console.log('✅ API is healthy');
    } else {
      console.log('❌ API health check failed');
    }
    
    console.log('\n✅ All tests completed!');
    
    // Keep browser open for 3 seconds to see the result
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Run the test
testLogin();