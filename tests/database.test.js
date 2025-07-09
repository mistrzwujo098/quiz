const { TestEnvironment, generateQuizData, generateTaskData } = require('./setup');
const path = require('path');
const fs = require('fs').promises;

describe('Database Management Tests', () => {
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

  describe('Clear Database Functionality', () => {
    beforeEach(async () => {
      // Pre-populate localStorage with test data
      const testData = generateTaskData(10);
      await env.setLocalStorage('zadaniaDB', JSON.stringify(testData));
      await env.page.reload({ waitUntil: 'networkidle2' });
    });

    test('should show confirmation dialogs when clearing database', async () => {
      // Navigate to database tab
      await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
      await env.page.waitForTimeout(500);

      // Setup dialog handlers
      const confirmMessages = [];
      env.page.on('dialog', async dialog => {
        confirmMessages.push(dialog.message());
        await dialog.accept();
      });

      // Click clear database button
      await env.clickButton('Wyczyść bazę');

      // Wait for dialogs
      await env.page.waitForTimeout(1000);

      // Verify two confirmation dialogs appeared
      expect(confirmMessages).toHaveLength(3); // 2 confirms + 1 alert
      expect(confirmMessages[0]).toContain('Czy na pewno chcesz usunąć wszystkie zadania');
      expect(confirmMessages[1]).toContain('Czy jesteś absolutnie pewien');
      expect(confirmMessages[2]).toBe('Baza zadań została wyczyszczona');
    });

    test('should clear localStorage when confirmed', async () => {
      // Navigate to database tab
      await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
      await env.page.waitForTimeout(500);

      // Setup dialog handlers to accept
      env.page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // Verify data exists before clearing
      let storedData = await env.getLocalStorage('zadaniaDB');
      expect(JSON.parse(storedData)).toHaveLength(10);

      // Click clear database button
      await env.clickButton('Wyczyść bazę');
      await env.page.waitForTimeout(1000);

      // Verify localStorage is cleared
      storedData = await env.getLocalStorage('zadaniaDB');
      expect(JSON.parse(storedData)).toEqual([]);
    });

    test('should not clear database when user cancels', async () => {
      // Navigate to database tab
      await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
      await env.page.waitForTimeout(500);

      // Setup dialog handler to cancel on first dialog
      let dialogCount = 0;
      env.page.on('dialog', async dialog => {
        if (dialogCount === 0) {
          await dialog.dismiss(); // Cancel first dialog
        } else {
          await dialog.accept();
        }
        dialogCount++;
      });

      // Click clear database button
      await env.clickButton('Wyczyść bazę');
      await env.page.waitForTimeout(1000);

      // Verify localStorage still has data
      const storedData = await env.getLocalStorage('zadaniaDB');
      expect(JSON.parse(storedData)).toHaveLength(10);
    });

    test('should not load any default data after clearing', async () => {
      // Navigate to database tab
      await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
      await env.page.waitForTimeout(500);

      // Setup dialog handlers to accept
      env.page.on('dialog', async dialog => {
        await dialog.accept();
      });

      // Clear database
      await env.clickButton('Wyczyść bazę');
      await env.page.waitForTimeout(1000);

      // Reload page
      await env.page.reload({ waitUntil: 'networkidle2' });

      // Verify no default data is loaded
      const storedData = await env.getLocalStorage('zadaniaDB');
      expect(JSON.parse(storedData)).toEqual([]);

      // Check in-memory zadania variable
      const zadaniaLength = await env.page.evaluate(() => {
        return window.zadania ? window.zadania.length : -1;
      });
      expect(zadaniaLength).toBe(0);
    });
  });

  describe('Load Database Functionality', () => {
    test('should load quiz_data.json format correctly', async () => {
      // Create test file
      const testData = generateQuizData(5);
      const testFilePath = path.join(__dirname, 'test-quiz-data.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      try {
        // Navigate to database tab
        await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
        await env.page.waitForTimeout(500);

        // Upload file
        await env.uploadFile('#databaseFileInput', testFilePath);
        await env.page.waitForTimeout(1000);

        // Check localStorage
        const storedData = await env.getLocalStorage('zadaniaDB');
        const parsedData = JSON.parse(storedData);

        // Verify data structure
        expect(parsedData).toHaveLength(5);
        expect(parsedData[0]).toHaveProperty('id', 'quiz_2025_1');
        expect(parsedData[0]).toHaveProperty('przedmiot', 'egzamin ósmoklasisty');
        expect(parsedData[0]).toHaveProperty('temat', 'Typ zadania 1');
        expect(parsedData[0]).toHaveProperty('tresc', 'Pytanie testowe 1?');
        expect(parsedData[0]).toHaveProperty('dział', 'Dział 1');
        expect(parsedData[0].odpowiedzi).toHaveLength(4);
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should prioritize type over department for temat field', async () => {
      // Create test data with both type and department
      const testData = {
        questions: [{
          id: 1,
          department: 'Liczby i działania',
          type: 'Potęgi i pierwiastki',
          question: 'Test question',
          hasImage: false,
          imageSvg: null,
          options: { a: 'A', b: 'B', c: 'C', d: 'D' },
          correctAnswer: 'a'
        }]
      };
      
      const testFilePath = path.join(__dirname, 'test-type-priority.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      try {
        // Navigate to database tab
        await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
        await env.page.waitForTimeout(500);

        // Upload file
        await env.uploadFile('#databaseFileInput', testFilePath);
        await env.page.waitForTimeout(1000);

        // Check localStorage
        const storedData = await env.getLocalStorage('zadaniaDB');
        const parsedData = JSON.parse(storedData);

        // Verify type is used for temat
        expect(parsedData[0].temat).toBe('Potęgi i pierwiastki');
        expect(parsedData[0].dział).toBe('Liczby i działania');
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should handle direct task array format', async () => {
      // Create test file with direct task array
      const testData = generateTaskData(3);
      const testFilePath = path.join(__dirname, 'test-task-data.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      try {
        // Navigate to database tab
        await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
        await env.page.waitForTimeout(500);

        // Upload file
        await env.uploadFile('#databaseFileInput', testFilePath);
        await env.page.waitForTimeout(1000);

        // Check localStorage
        const storedData = await env.getLocalStorage('zadaniaDB');
        const parsedData = JSON.parse(storedData);

        // Verify data is loaded correctly
        expect(parsedData).toHaveLength(3);
        expect(parsedData[0]).toHaveProperty('id', 'test_1');
        expect(parsedData[0]).toHaveProperty('przedmiot', 'egzamin ósmoklasisty');
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should handle image data correctly', async () => {
      // Create test data with image
      const testData = {
        questions: [{
          id: 1,
          department: 'Geometria',
          type: 'Figury płaskie',
          question: 'Question with image',
          hasImage: true,
          imageSvg: '<svg>test image</svg>',
          options: { a: 'A', b: 'B', c: 'C', d: 'D' },
          correctAnswer: 'b'
        }]
      };
      
      const testFilePath = path.join(__dirname, 'test-image-data.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      try {
        // Navigate to database tab
        await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
        await env.page.waitForTimeout(500);

        // Upload file
        await env.uploadFile('#databaseFileInput', testFilePath);
        await env.page.waitForTimeout(1000);

        // Check localStorage
        const storedData = await env.getLocalStorage('zadaniaDB');
        const parsedData = JSON.parse(storedData);

        // Verify image is stored
        expect(parsedData[0].obrazek).toBe('<svg>test image</svg>');
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should show error for invalid file format', async () => {
      // Create invalid file
      const invalidData = { invalid: 'format' };
      const testFilePath = path.join(__dirname, 'test-invalid.json');
      await fs.writeFile(testFilePath, JSON.stringify(invalidData));

      try {
        // Navigate to database tab
        await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
        await env.page.waitForTimeout(500);

        // Setup alert handler
        const alertPromise = env.getAlertText();

        // Upload file
        await env.uploadFile('#databaseFileInput', testFilePath);

        // Wait for alert
        const alertText = await alertPromise;
        expect(alertText).toContain('Błąd: Nieprawidłowy format pliku');
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });

    test('should prevent duplicate entries', async () => {
      // Create test data with duplicates
      const testData = {
        questions: [
          {
            id: 1,
            department: 'Math',
            type: 'Algebra',
            question: 'Question 1',
            hasImage: false,
            imageSvg: null,
            options: { a: 'A', b: 'B', c: 'C', d: 'D' },
            correctAnswer: 'a'
          },
          {
            id: 1, // Duplicate ID
            department: 'Math',
            type: 'Algebra',
            question: 'Question 1 Duplicate',
            hasImage: false,
            imageSvg: null,
            options: { a: 'A2', b: 'B2', c: 'C2', d: 'D2' },
            correctAnswer: 'b'
          }
        ]
      };
      
      const testFilePath = path.join(__dirname, 'test-duplicates.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      try {
        // Navigate to database tab
        await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
        await env.page.waitForTimeout(500);

        // Setup alert handler
        const alertPromise = env.getAlertText();

        // Upload file
        await env.uploadFile('#databaseFileInput', testFilePath);

        // Wait for alert
        const alertText = await alertPromise;
        expect(alertText).toContain('pomijanie 1 duplikatów');

        // Check only one entry is stored
        const storedData = await env.getLocalStorage('zadaniaDB');
        const parsedData = JSON.parse(storedData);
        expect(parsedData).toHaveLength(1);
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });
  });

  describe('Integration Tests', () => {
    test('should persist data after page reload', async () => {
      // Load test data
      const testData = generateTaskData(5);
      await env.setLocalStorage('zadaniaDB', JSON.stringify(testData));
      
      // Reload page
      await env.page.reload({ waitUntil: 'networkidle2' });

      // Verify data persists
      const storedData = await env.getLocalStorage('zadaniaDB');
      expect(JSON.parse(storedData)).toHaveLength(5);
    });

    test('should handle large datasets', async () => {
      // Create large dataset
      const testData = generateQuizData(1000);
      const testFilePath = path.join(__dirname, 'test-large-data.json');
      await fs.writeFile(testFilePath, JSON.stringify(testData));

      try {
        // Navigate to database tab
        await env.page.click('[data-tab="database"], button:has-text("Baza danych")');
        await env.page.waitForTimeout(500);

        // Upload file
        await env.uploadFile('#databaseFileInput', testFilePath);
        await env.page.waitForTimeout(3000); // Give more time for large file

        // Check localStorage
        const storedData = await env.getLocalStorage('zadaniaDB');
        const parsedData = JSON.parse(storedData);
        expect(parsedData).toHaveLength(1000);
      } finally {
        await fs.unlink(testFilePath).catch(() => {});
      }
    });
  });
});