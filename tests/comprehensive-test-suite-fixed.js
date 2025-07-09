// Fixed Comprehensive Test Suite for QuizMaster Application
const puppeteer = require('puppeteer');
const { expect } = require('chai');
const fs = require('fs').promises;
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  baseUrl: process.env.APP_URL || 'http://localhost:8000',
  apiUrl: process.env.API_URL || 'http://localhost:3001',
  headless: process.env.HEADLESS !== 'false',
  slowMo: parseInt(process.env.SLOW_MO || '0'),
  timeout: 30000,
  screenshotOnFailure: true,
  testUsers: {
    teacher: {
      username: 'paulinaodmatematyki',
      password: 'paulina#314159265'
    },
    student: {
      username: 'anna.kowalska',
      password: 'haslo123'
    },
    admin: {
      username: 'admin',
      password: 'admin123'
    }
  }
};

// Test utilities
class TestUtils {
  static async takeScreenshot(page, name) {
    const screenshotDir = path.join(__dirname, 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    await page.screenshot({
      path: path.join(screenshotDir, `${name}-${Date.now()}.png`),
      fullPage: true
    });
  }

  static async clearLocalStorage(page) {
    try {
      await page.evaluate(() => {
        if (window.localStorage) {
          localStorage.clear();
        }
        if (window.sessionStorage) {
          sessionStorage.clear();
        }
      });
    } catch (e) {
      // Ignore localStorage access errors in test environment
    }
  }

  static async login(page, username, password) {
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForSelector('input[placeholder="Nazwa użytkownika"]', { timeout: 5000 });
    
    // Clear and type username
    const usernameInput = await page.$('input[placeholder="Nazwa użytkownika"]');
    await usernameInput.click({ clickCount: 3 });
    await usernameInput.type(username);
    
    // Clear and type password
    const passwordInput = await page.$('input[placeholder="Hasło"]');
    await passwordInput.click({ clickCount: 3 });
    await passwordInput.type(password);
    
    // Click submit button
    await page.click('button[type="submit"]');
    
    // Wait for navigation or error
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle0', timeout: 5000 });
    } catch (e) {
      // Navigation might not happen if there's an error
    }
  }

  static async logout(page) {
    const logoutButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent && btn.textContent.includes('Wyloguj')
      );
    });
    
    if (logoutButton && logoutButton.asElement()) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }
  }

  static async waitForReact(page) {
    await page.waitForFunction(
      () => window.React && window.ReactDOM,
      { timeout: 10000 }
    );
  }

  static generateTestReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      totalTests: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      duration: results.reduce((sum, r) => sum + (r.duration || 0), 0),
      details: results
    };

    return report;
  }
}

// Test Suite Classes
class AuthenticationTests {
  static async runAll(browser) {
    const results = [];
    const testCases = [
      this.testTeacherLogin,
      this.testStudentLogin,
      this.testInvalidLogin,
      this.testLogout
    ];

    for (const testCase of testCases) {
      const result = await this.runTest(browser, testCase);
      results.push(result);
    }

    return results;
  }

  static async runTest(browser, testCase) {
    const startTime = Date.now();
    const page = await browser.newPage();
    
    // Set viewport
    await page.setViewport({ width: 1280, height: 720 });
    
    const result = {
      name: testCase.name,
      category: 'Authentication',
      status: 'pending',
      duration: 0,
      error: null,
      screenshots: []
    };

    try {
      await TestUtils.clearLocalStorage(page);
      await testCase(page);
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
      
      if (TEST_CONFIG.screenshotOnFailure) {
        await TestUtils.takeScreenshot(page, `${testCase.name}-failure`);
        result.screenshots.push(`${testCase.name}-failure`);
      }
    } finally {
      result.duration = Date.now() - startTime;
      await page.close();
    }

    return result;
  }

  static async testTeacherLogin(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    await TestUtils.waitForReact(page);
    
    // Fill login form
    await page.waitForSelector('input[placeholder="Nazwa użytkownika"]');
    await page.type('input[placeholder="Nazwa użytkownika"]', TEST_CONFIG.testUsers.teacher.username);
    await page.type('input[placeholder="Hasło"]', TEST_CONFIG.testUsers.teacher.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify we're on the teacher panel
    const titleText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : '';
    });
    
    expect(titleText).to.include('Panel Nauczyciela');
  }

  static async testStudentLogin(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    await TestUtils.waitForReact(page);
    
    // Fill login form
    await page.waitForSelector('input[placeholder="Nazwa użytkownika"]');
    await page.type('input[placeholder="Nazwa użytkownika"]', TEST_CONFIG.testUsers.student.username);
    await page.type('input[placeholder="Hasło"]', TEST_CONFIG.testUsers.student.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for navigation
    await page.waitForTimeout(2000);
    
    // Verify we're on the student panel
    const titleText = await page.evaluate(() => {
      const h1 = document.querySelector('h1');
      return h1 ? h1.textContent : '';
    });
    
    expect(titleText).to.include('Panel Ucznia');
  }

  static async testInvalidLogin(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    await TestUtils.waitForReact(page);
    
    // Try invalid credentials
    await page.waitForSelector('input[placeholder="Nazwa użytkownika"]');
    await page.type('input[placeholder="Nazwa użytkownika"]', 'invalid_user');
    await page.type('input[placeholder="Hasło"]', 'wrong_password');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForTimeout(1000);
    
    // Verify error message appears
    const errorText = await page.evaluate(() => {
      const errorDiv = document.querySelector('.text-red-300');
      return errorDiv ? errorDiv.textContent : '';
    });
    
    expect(errorText).to.include('Nieprawidłowa nazwa użytkownika lub hasło');
  }

  static async testLogout(page) {
    // Login first
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Wait for teacher panel
    await page.waitForTimeout(2000);
    
    // Find and click logout
    const logoutButton = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll('button')).find(btn => 
        btn.textContent && btn.textContent.includes('Wyloguj')
      );
    });
    
    if (logoutButton && logoutButton.asElement()) {
      await logoutButton.click();
      
      // Wait for redirect to login
      await page.waitForTimeout(2000);
      
      // Should be back at login page
      const usernameInput = await page.$('input[placeholder="Nazwa użytkownika"]');
      expect(usernameInput).to.not.be.null;
    } else {
      throw new Error('Logout button not found');
    }
  }
}

class SimpleTests {
  static async runAll(browser) {
    const results = [];
    const testCases = [
      this.testPageLoads,
      this.testReactInitializes,
      this.testAPIHealth
    ];

    for (const testCase of testCases) {
      const result = await this.runTest(browser, testCase);
      results.push(result);
    }

    return results;
  }

  static async runTest(browser, testCase) {
    const startTime = Date.now();
    const page = await browser.newPage();
    
    const result = {
      name: testCase.name,
      category: 'Basic',
      status: 'pending',
      duration: 0,
      error: null,
      screenshots: []
    };

    try {
      await testCase(page);
      result.status = 'passed';
    } catch (error) {
      result.status = 'failed';
      result.error = error.message;
    } finally {
      result.duration = Date.now() - startTime;
      await page.close();
    }

    return result;
  }

  static async testPageLoads(page) {
    const response = await page.goto(TEST_CONFIG.baseUrl);
    expect(response.status()).to.equal(200);
  }

  static async testReactInitializes(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    await TestUtils.waitForReact(page);
    
    const reactVersion = await page.evaluate(() => {
      return window.React ? window.React.version : null;
    });
    
    expect(reactVersion).to.not.be.null;
  }

  static async testAPIHealth(page) {
    const response = await page.goto(`${TEST_CONFIG.apiUrl}/health`);
    const health = await response.json();
    
    expect(health.status).to.equal('healthy');
  }
}

// Main test runner
class TestRunner {
  constructor() {
    this.browser = null;
    this.results = [];
  }

  async initialize() {
    this.browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      slowMo: TEST_CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security']
    });
  }

  async runTestSuite(name, testClass) {
    console.log(`\n📋 Running ${name}...`);
    const suiteResults = await testClass.runAll(this.browser);
    this.results.push(...suiteResults);
    
    const passed = suiteResults.filter(r => r.status === 'passed').length;
    const failed = suiteResults.filter(r => r.status === 'failed').length;
    
    console.log(`✅ Passed: ${passed}, ❌ Failed: ${failed}`);
  }

  async run() {
    console.log('🚀 Starting QuizMaster Test Suite (Fixed)...');
    console.log(`📍 Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`🔌 API URL: ${TEST_CONFIG.apiUrl}`);
    console.log(`🖥️  Headless: ${TEST_CONFIG.headless}`);

    try {
      await this.initialize();

      // Run test suites
      await this.runTestSuite('Basic Tests', SimpleTests);
      await this.runTestSuite('Authentication Tests', AuthenticationTests);

      // Generate and save report
      const report = TestUtils.generateTestReport(this.results);
      
      // Save JSON report
      const reportsDir = path.join(__dirname, 'reports');
      await fs.mkdir(reportsDir, { recursive: true });
      
      const jsonPath = path.join(reportsDir, `test-report-${Date.now()}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(report, null, 2));
      console.log(`\n📊 Test Report saved to: ${jsonPath}`);

      // Display summary
      console.log('\n📊 Final Results:');
      console.log(`   Total Tests: ${report.totalTests}`);
      console.log(`   ✅ Passed: ${report.passed}`);
      console.log(`   ❌ Failed: ${report.failed}`);
      console.log(`   ⏭️  Skipped: ${report.skipped}`);
      console.log(`   ⏱️  Duration: ${(report.duration / 1000).toFixed(2)}s`);

      // Exit with appropriate code
      process.exit(report.failed > 0 ? 1 : 0);

    } catch (error) {
      console.error('Fatal error:', error);
      process.exit(1);
    } finally {
      if (this.browser) {
        await this.browser.close();
      }
    }
  }
}

// Run tests
if (require.main === module) {
  const runner = new TestRunner();
  runner.run().catch(console.error);
}

module.exports = { TestRunner, TEST_CONFIG };