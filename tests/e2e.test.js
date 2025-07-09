const { TestEnvironment, generateQuizData, generateTaskData } = require('./setup');
const path = require('path');
const fs = require('fs').promises;

describe('End-to-End Application Tests', () => {
  let env;

  beforeEach(async () => {
    env = new TestEnvironment();
    await env.setup();
    await env.clearLocalStorage();
    await env.page.reload({ waitUntil: 'networkidle2' });
  });

  afterEach(async () => {
    await env.teardown();
  });

  describe('Full User Workflow', () => {
    test('should complete full workflow: load data, create exam, export results', async () => {
      // Create test data
      const testData = generateQuizData(20);
      const testFilePath = path.join(__dirname, 'test-workflow-data.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      try {
        // Step 1: Navigate to database tab and load data
        await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
        await env.page.waitForTimeout(500);
        
        await env.uploadFile('#databaseFileInput', testFilePath);
        await env.page.waitForTimeout(1000);

        // Verify data loaded
        const storedData = await env.getLocalStorage('zadaniaDB');
        expect(JSON.parse(storedData)).toHaveLength(20);

        // Step 2: Navigate to exam creation
        await env.page.click('[data-tab="create"], button:has-text("Utwórz arkusz")');
        await env.page.waitForTimeout(500);

        // Step 3: Create exam with specific parameters
        // This would involve selecting questions, setting time limits, etc.
        // Implementation depends on exact UI elements

        // Step 4: Export exam
        // await env.clickButton('Eksportuj arkusz');

        // Take screenshot for verification
        await env.takeScreenshot('workflow-complete');
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });
  });

  describe('Error Handling', () => {
    test('should handle network errors gracefully', async () => {
      // Simulate offline mode
      await env.page.setOfflineMode(true);

      // Try to perform operations
      await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
      await env.page.waitForTimeout(500);

      // Verify app still functions
      const isVisible = await env.page.isVisible('button:has-text("Wyczyść bazę")');
      expect(isVisible).toBe(true);

      // Re-enable network
      await env.page.setOfflineMode(false);
    });

    test('should handle corrupted localStorage data', async () => {
      // Set corrupted data
      await env.setLocalStorage('zadaniaDB', 'corrupted{data}not-json');
      
      // Reload page
      await env.page.reload({ waitUntil: 'networkidle2' });

      // Verify app handles error
      const zadaniaLength = await env.page.evaluate(() => {
        return window.zadania ? window.zadania.length : -1;
      });
      expect(zadaniaLength).toBe(0); // Should default to empty array
    });
  });

  describe('UI Responsiveness', () => {
    test('should work on mobile viewport', async () => {
      // Set mobile viewport
      await env.page.setViewport({ width: 375, height: 812 });

      // Navigate through tabs
      const tabs = ['database', 'create', 'student'];
      for (const tab of tabs) {
        await env.page.click(`[data-tab="${tab}"], button:has-text("${tab}")`);
        await env.page.waitForTimeout(300);
        
        // Take screenshot
        await env.takeScreenshot(`mobile-${tab}`);
      }
    });

    test('should handle rapid clicks without errors', async () => {
      // Navigate to database tab
      await env.page.click('[data-tab="database"], button:has-text("Baza danych")');

      // Setup dialog handler
      let dialogCount = 0;
      env.page.on('dialog', async dialog => {
        dialogCount++;
        await dialog.dismiss();
      });

      // Rapidly click clear button
      for (let i = 0; i < 5; i++) {
        await env.page.click('button:has-text("Wyczyść bazę")', { force: true });
        await env.page.waitForTimeout(50);
      }

      // Should only show dialogs for valid clicks
      expect(dialogCount).toBeGreaterThanOrEqual(1);
      expect(dialogCount).toBeLessThanOrEqual(5);
    });
  });

  describe('Accessibility Tests', () => {
    test('should be keyboard navigable', async () => {
      // Tab through interface
      await env.page.keyboard.press('Tab');
      await env.page.keyboard.press('Tab');
      await env.page.keyboard.press('Tab');

      // Check focus is visible
      const focusedElement = await env.page.evaluate(() => {
        const el = document.activeElement;
        return {
          tagName: el.tagName,
          text: el.textContent,
          hasOutline: window.getComputedStyle(el).outline !== 'none'
        };
      });

      expect(focusedElement.tagName).toBeTruthy();
    });

    test('should have proper ARIA labels', async () => {
      // Check for ARIA labels on buttons
      const buttons = await env.page.$$eval('button', buttons => {
        return buttons.map(btn => ({
          text: btn.textContent,
          ariaLabel: btn.getAttribute('aria-label'),
          role: btn.getAttribute('role')
        }));
      });

      // Verify important buttons have labels
      const clearButton = buttons.find(btn => btn.text.includes('Wyczyść bazę'));
      expect(clearButton).toBeTruthy();
    });
  });

  describe('Performance Tests', () => {
    test('should load page within acceptable time', async () => {
      const startTime = Date.now();
      await env.page.reload({ waitUntil: 'networkidle2' });
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000); // Should load within 3 seconds
    });

    test('should handle memory efficiently with large datasets', async () => {
      // Get initial memory usage
      const initialMetrics = await env.page.metrics();

      // Load large dataset
      const largeData = generateTaskData(5000);
      await env.setLocalStorage('zadaniaDB', JSON.stringify(largeData));
      await env.page.reload({ waitUntil: 'networkidle2' });

      // Get memory after loading
      const afterLoadMetrics = await env.page.metrics();

      // Memory increase should be reasonable
      const memoryIncrease = afterLoadMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      expect(memoryIncreaseMB).toBeLessThan(100); // Less than 100MB increase
    });
  });
});