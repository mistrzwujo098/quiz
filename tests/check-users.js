// Check users in localStorage
const puppeteer = require('puppeteer');

async function checkUsers() {
  console.log('🧪 Checking users in system...\n');
  
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Go to the page
    await page.goto('http://localhost:8000', {
      waitUntil: 'networkidle0'
    });
    
    // Wait for React
    await page.waitForFunction(
      () => window.React && window.ReactDOM,
      { timeout: 10000 }
    );
    
    // Check localStorage for users
    const users = await page.evaluate(() => {
      try {
        const usersData = localStorage.getItem('users');
        if (usersData) {
          const users = JSON.parse(usersData);
          return {
            count: users.length,
            users: users.map(u => ({
              username: u.username,
              role: u.role,
              hasPassword: !!u.password,
              passwordLength: u.password ? u.password.length : 0,
              id: u.id,
              userId: u.userId
            }))
          };
        }
        return { count: 0, users: [] };
      } catch (e) {
        return { error: e.message };
      }
    });
    
    console.log('📊 Users in localStorage:', JSON.stringify(users, null, 2));
    
    // Check if AuthManager is available
    const authManagerInfo = await page.evaluate(() => {
      if (window.AuthManager) {
        return {
          available: true,
          methods: Object.getOwnPropertyNames(window.AuthManager).filter(m => typeof window.AuthManager[m] === 'function')
        };
      }
      return { available: false };
    });
    
    console.log('\n🔐 AuthManager:', JSON.stringify(authManagerInfo, null, 2));
    
    // Try to login programmatically
    console.log('\n🧪 Testing programmatic login...');
    const loginResult = await page.evaluate(() => {
      if (window.AuthManager && typeof window.AuthManager.login === 'function') {
        try {
          const result = window.AuthManager.login('paulinaodmatematyki', 'paulina#314159265');
          return { success: true, result };
        } catch (e) {
          return { success: false, error: e.message };
        }
      }
      return { success: false, error: 'AuthManager not available' };
    });
    
    console.log('Login result:', JSON.stringify(loginResult, null, 2));
    
    // Check session
    const sessionInfo = await page.evaluate(() => {
      const session = sessionStorage.getItem('currentUser');
      return session ? JSON.parse(session) : null;
    });
    
    console.log('\n📋 Session info:', JSON.stringify(sessionInfo, null, 2));
    
    // Wait a bit
    await page.waitForTimeout(3000);
    
  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

checkUsers();