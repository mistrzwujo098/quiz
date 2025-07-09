// Test setup and utilities
const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs').promises;

class TestEnvironment {
  constructor() {
    this.browser = null;
    this.page = null;
    this.server = null;
  }

  async setup() {
    // Launch browser
    this.browser = await puppeteer.launch({
      headless: process.env.HEADLESS !== 'false',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
      slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0
    });

    // Create new page
    this.page = await this.browser.newPage();
    
    // Set viewport
    await this.page.setViewport({ width: 1280, height: 800 });

    // Enable console logging
    this.page.on('console', msg => {
      if (process.env.DEBUG) {
        console.log('Browser console:', msg.text());
      }
    });

    // Enable error logging
    this.page.on('pageerror', error => {
      console.error('Browser error:', error.message);
    });

    // Navigate to application
    const appUrl = process.env.APP_URL || 'http://localhost:8000';
    await this.page.goto(appUrl, { waitUntil: 'networkidle2' });
  }

  async teardown() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async clearLocalStorage() {
    await this.page.evaluate(() => {
      localStorage.clear();
    });
  }

  async getLocalStorage(key) {
    return await this.page.evaluate((key) => {
      return localStorage.getItem(key);
    }, key);
  }

  async setLocalStorage(key, value) {
    await this.page.evaluate((key, value) => {
      localStorage.setItem(key, value);
    }, key, value);
  }

  async waitForReactComponent(componentName, timeout = 5000) {
    await this.page.waitForFunction(
      (name) => {
        const elements = document.querySelectorAll('[data-testid], [class*="' + name + '"]');
        return elements.length > 0;
      },
      { timeout },
      componentName
    );
  }

  async clickButton(buttonText) {
    await this.page.evaluate((text) => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const button = buttons.find(btn => btn.textContent.includes(text));
      if (button) {
        button.click();
      } else {
        throw new Error(`Button with text "${text}" not found`);
      }
    }, buttonText);
  }

  async uploadFile(inputSelector, filePath) {
    const fileInput = await this.page.$(inputSelector);
    if (!fileInput) {
      throw new Error(`File input ${inputSelector} not found`);
    }
    await fileInput.uploadFile(filePath);
  }

  async getAlertText() {
    return new Promise((resolve) => {
      this.page.once('dialog', async dialog => {
        const message = dialog.message();
        await dialog.accept();
        resolve(message);
      });
    });
  }

  async confirmDialog(accept = true) {
    return new Promise((resolve) => {
      this.page.once('dialog', async dialog => {
        const message = dialog.message();
        if (accept) {
          await dialog.accept();
        } else {
          await dialog.dismiss();
        }
        resolve(message);
      });
    });
  }

  async takeScreenshot(name) {
    const screenshotDir = path.join(__dirname, 'screenshots');
    await fs.mkdir(screenshotDir, { recursive: true });
    await this.page.screenshot({
      path: path.join(screenshotDir, `${name}.png`),
      fullPage: true
    });
  }

  async waitForNetworkIdle() {
    await this.page.waitForLoadState('networkidle');
  }
}

// Test data generators
const generateQuizData = (count = 5) => {
  const questions = [];
  for (let i = 1; i <= count; i++) {
    questions.push({
      id: i,
      department: `Dział ${i}`,
      type: `Typ zadania ${i}`,
      question: `Pytanie testowe ${i}?`,
      hasImage: false,
      imageSvg: null,
      options: {
        a: `Odpowiedź A${i}`,
        b: `Odpowiedź B${i}`,
        c: `Odpowiedź C${i}`,
        d: `Odpowiedź D${i}`
      },
      correctAnswer: ['a', 'b', 'c', 'd'][Math.floor(Math.random() * 4)],
      explanation: `Wyjaśnienie do pytania ${i}`
    });
  }
  return { questions };
};

const generateTaskData = (count = 5) => {
  const tasks = [];
  for (let i = 1; i <= count; i++) {
    tasks.push({
      id: `test_${i}`,
      przedmiot: 'egzamin ósmoklasisty',
      temat: `Temat ${i}`,
      tresc: `Treść zadania ${i}`,
      typ: 'zamkniete',
      odpowiedzi: [`Odp A${i}`, `Odp B${i}`, `Odp C${i}`, `Odp D${i}`],
      poprawna: ['A', 'B', 'C', 'D'][Math.floor(Math.random() * 4)],
      punkty: 1,
      poziom: 'podstawowy',
      rok: '2025',
      sesja: 'główna',
      obrazek: null,
      wyjaśnienie: `Wyjaśnienie ${i}`,
      dział: `Dział ${i}`
    });
  }
  return tasks;
};

module.exports = {
  TestEnvironment,
  generateQuizData,
  generateTaskData
};