// Smoke test to verify basic functionality
const puppeteer = require('puppeteer');
const { expect } = require('chai');

describe('QuizMaster Smoke Tests', () => {
  let browser;
  let page;
  const baseUrl = process.env.APP_URL || 'http://localhost:8000';

  before(async () => {
    browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
  });

  after(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    page = await browser.newPage();
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  it('should load the main page', async () => {
    const response = await page.goto(baseUrl, { waitUntil: 'networkidle0' });
    expect(response.status()).to.equal(200);
    
    // Check if React loads
    await page.waitForFunction(
      () => window.React && window.ReactDOM,
      { timeout: 5000 }
    );
    
    // Check for login form
    const usernameInput = await page.$('#username');
    expect(usernameInput).to.not.be.null;
  });

  it('should have required scripts loaded', async () => {
    await page.goto(baseUrl);
    
    // Check for required libraries
    const libraries = await page.evaluate(() => {
      return {
        react: typeof React !== 'undefined',
        cryptoJS: typeof CryptoJS !== 'undefined',
        tailwind: document.querySelector('script[src*="tailwindcss"]') !== null
      };
    });
    
    expect(libraries.react).to.be.true;
    expect(libraries.cryptoJS).to.be.true;
    expect(libraries.tailwind).to.be.true;
  });

  it('should display login form elements', async () => {
    await page.goto(baseUrl);
    await page.waitForSelector('#username');
    
    // Check form elements
    const elements = await page.evaluate(() => {
      return {
        username: document.querySelector('#username') !== null,
        password: document.querySelector('#password') !== null,
        submitButton: document.querySelector('button[type="submit"]') !== null,
        title: document.querySelector('h2')?.textContent || ''
      };
    });
    
    expect(elements.username).to.be.true;
    expect(elements.password).to.be.true;
    expect(elements.submitButton).to.be.true;
    expect(elements.title).to.include('Logowanie');
  });

  it('should show error on invalid login', async () => {
    await page.goto(baseUrl);
    await page.waitForSelector('#username');
    
    // Try invalid login
    await page.type('#username', 'invalid_user');
    await page.type('#password', 'invalid_pass');
    await page.click('button[type="submit"]');
    
    // Wait for error message
    await page.waitForSelector('.text-red-300', { timeout: 5000 });
    
    const errorText = await page.$eval('.text-red-300', el => el.textContent);
    expect(errorText).to.include('Nieprawidłowa');
  });

  it('should check API proxy health', async () => {
    const apiUrl = process.env.API_URL || 'http://localhost:3001';
    
    const health = await page.evaluate(async (url) => {
      try {
        const response = await fetch(`${url}/health`);
        return await response.json();
      } catch (error) {
        return null;
      }
    }, apiUrl);
    
    expect(health).to.not.be.null;
    expect(health.status).to.equal('healthy');
  });
});

// Run tests if called directly
if (require.main === module) {
  const Mocha = require('mocha');
  const mocha = new Mocha({
    timeout: 30000,
    reporter: 'spec'
  });
  
  mocha.addFile(__filename);
  
  mocha.run(failures => {
    process.exit(failures ? 1 : 0);
  });
}