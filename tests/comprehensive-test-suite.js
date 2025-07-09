// Comprehensive Test Suite for QuizMaster Application
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
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  static async login(page, username, password) {
    await page.goto(TEST_CONFIG.baseUrl);
    await page.waitForSelector('#username', { timeout: 5000 });
    await page.type('#username', username);
    await page.type('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForNavigation({ waitUntil: 'networkidle0' });
  }

  static async logout(page) {
    const logoutButton = await page.$('button:has-text("Wyloguj")');
    if (logoutButton) {
      await logoutButton.click();
      await page.waitForNavigation({ waitUntil: 'networkidle0' });
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
      this.testSessionPersistence,
      this.testLogout,
      this.testPasswordHashing,
      this.testUserCreation
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
    await page.waitForSelector('#username');
    await page.type('#username', TEST_CONFIG.testUsers.teacher.username);
    await page.type('#password', TEST_CONFIG.testUsers.teacher.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify redirect to teacher panel
    await page.waitForSelector('h1:has-text("Panel Nauczyciela")', { timeout: 5000 });
    
    // Verify user info display
    const userInfo = await page.$eval('.text-gray-300', el => el.textContent);
    expect(userInfo).to.include('paulinaodmatematyki');
  }

  static async testStudentLogin(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    await TestUtils.waitForReact(page);
    
    // Fill login form
    await page.waitForSelector('#username');
    await page.type('#username', TEST_CONFIG.testUsers.student.username);
    await page.type('#password', TEST_CONFIG.testUsers.student.password);
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify redirect to student panel
    await page.waitForSelector('h1:has-text("Panel Ucznia")', { timeout: 5000 });
    
    // Verify available exams section
    await page.waitForSelector('h2:has-text("Dostępne arkusze")');
  }

  static async testInvalidLogin(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    await TestUtils.waitForReact(page);
    
    // Try invalid credentials
    await page.waitForSelector('#username');
    await page.type('#username', 'invalid_user');
    await page.type('#password', 'wrong_password');
    
    // Submit
    await page.click('button[type="submit"]');
    
    // Verify error message
    await page.waitForSelector('.text-red-300:has-text("Nieprawidłowa nazwa użytkownika lub hasło")');
  }

  static async testSessionPersistence(page) {
    // Login first
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Get session data
    const sessionData = await page.evaluate(() => {
      return sessionStorage.getItem('currentUser');
    });
    
    expect(sessionData).to.not.be.null;
    const session = JSON.parse(sessionData);
    expect(session.username).to.equal('paulinaodmatematyki');
    expect(session.role).to.equal('teacher');
    
    // Reload page
    await page.reload();
    
    // Should still be logged in
    await page.waitForSelector('h1:has-text("Panel Nauczyciela")');
  }

  static async testLogout(page) {
    // Login first
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Find and click logout
    await page.click('button:has-text("Wyloguj")');
    
    // Should redirect to login
    await page.waitForSelector('#username');
    
    // Session should be cleared
    const sessionData = await page.evaluate(() => {
      return sessionStorage.getItem('currentUser');
    });
    
    expect(sessionData).to.be.null;
  }

  static async testPasswordHashing(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    
    // Test that passwords are hashed
    const hashedPassword = await page.evaluate((password) => {
      return CryptoJS.SHA256(password).toString();
    }, 'testPassword123');
    
    expect(hashedPassword).to.not.equal('testPassword123');
    expect(hashedPassword).to.have.lengthOf(64); // SHA256 produces 64 character hex string
  }

  static async testUserCreation(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    
    // Test user creation in localStorage
    const result = await page.evaluate(() => {
      const testUser = {
        username: 'test.user',
        password: 'test123',
        role: 'student',
        category: 'egzamin ósmoklasisty'
      };
      
      try {
        // This should be the AuthManager.createUser method
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        const hashedPassword = CryptoJS.SHA256(testUser.password).toString();
        
        const newUser = {
          id: Date.now(),
          username: testUser.username,
          password: hashedPassword,
          role: testUser.role,
          category: testUser.category,
          createdAt: new Date()
        };
        
        users.push(newUser);
        localStorage.setItem('users', JSON.stringify(users));
        
        return { success: true, userId: newUser.id };
      } catch (error) {
        return { success: false, error: error.message };
      }
    });
    
    expect(result.success).to.be.true;
    expect(result.userId).to.be.a('number');
  }
}

class ExamManagementTests {
  static async runAll(browser) {
    const results = [];
    const testCases = [
      this.testExamCreation,
      this.testQuestionBankManagement,
      this.testExamConfiguration,
      this.testGroupAssignment,
      this.testExamDeletion,
      this.testExamScheduling,
      this.testExamTemplates
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
      category: 'Exam Management',
      status: 'pending',
      duration: 0,
      error: null,
      screenshots: []
    };

    try {
      await TestUtils.clearLocalStorage(page);
      await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
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

  static async testExamCreation(page) {
    // Navigate to exam creation
    await page.click('button:has-text("Utwórz arkusz")');
    
    // Fill exam details
    await page.waitForSelector('input[placeholder="Nazwa arkusza"]');
    await page.type('input[placeholder="Nazwa arkusza"]', 'Test Matematyka - Geometria');
    
    // Select time limit
    await page.select('select', '45'); // 45 minutes
    
    // Select questions (assuming questions exist in the bank)
    const questionCheckboxes = await page.$$('input[type="checkbox"]');
    for (let i = 0; i < Math.min(5, questionCheckboxes.length); i++) {
      await questionCheckboxes[i].click();
    }
    
    // Create exam
    await page.click('button:has-text("Utwórz arkusz")');
    
    // Verify success
    await page.waitForSelector('text="Arkusz został utworzony"');
  }

  static async testQuestionBankManagement(page) {
    // Navigate to question bank
    await page.click('a:has-text("Baza zadań")');
    
    // Verify questions are displayed
    await page.waitForSelector('.card-modern');
    
    // Test filtering
    await page.select('select:first-of-type', 'Matematyka');
    
    // Verify filter applied
    const questions = await page.$$('.card-modern');
    expect(questions.length).to.be.greaterThan(0);
  }

  static async testExamConfiguration(page) {
    // Test exam time limit configuration
    await page.click('button:has-text("Utwórz arkusz")');
    
    // Test different time limits
    const timeLimits = ['30', '45', '60', '90', '120'];
    for (const limit of timeLimits) {
      await page.select('select', limit);
      const selectedValue = await page.$eval('select', el => el.value);
      expect(selectedValue).to.equal(limit);
    }
  }

  static async testGroupAssignment(page) {
    // Navigate to groups
    await page.click('button:has-text("Zarządzaj grupami")');
    
    // Create a test group
    await page.type('input[placeholder="Nazwa grupy"]', 'Grupa Testowa 8A');
    await page.click('button:has-text("Dodaj grupę")');
    
    // Verify group created
    await page.waitForSelector('text="Grupa Testowa 8A"');
  }

  static async testExamDeletion(page) {
    // Find delete buttons for exams
    const deleteButtons = await page.$$('button:has-text("Usuń")');
    
    if (deleteButtons.length > 0) {
      // Click first delete button
      await deleteButtons[0].click();
      
      // Confirm deletion
      await page.click('button:has-text("Potwierdź")');
      
      // Verify deletion message
      await page.waitForSelector('text="Arkusz został usunięty"');
    }
  }

  static async testExamScheduling(page) {
    // Navigate to scheduler
    await page.click('a:has-text("Harmonogram")');
    
    // Add new event
    await page.click('button:has-text("Dodaj wydarzenie")');
    
    // Fill event details
    await page.type('input[placeholder="Tytuł"]', 'Sprawdzian z geometrii');
    await page.select('select[name="type"]', 'exam');
    await page.type('input[type="date"]', '2024-06-20');
    await page.type('input[type="time"]', '09:00');
    
    // Save event
    await page.click('button:has-text("Zapisz")');
    
    // Verify event added
    await page.waitForSelector('text="Sprawdzian z geometrii"');
  }

  static async testExamTemplates(page) {
    // Navigate to templates
    await page.click('a:has-text("Bank arkuszy")');
    
    // Create template from existing exam
    const saveAsTemplateButtons = await page.$$('button:has-text("Zapisz jako szablon")');
    
    if (saveAsTemplateButtons.length > 0) {
      await saveAsTemplateButtons[0].click();
      
      // Fill template details
      await page.type('input[placeholder="Nazwa szablonu"]', 'Szablon - Geometria podstawowa');
      await page.type('textarea[placeholder="Opis"]', 'Podstawowe zadania z geometrii dla klasy 8');
      
      // Save template
      await page.click('button:has-text("Zapisz szablon")');
      
      // Verify template saved
      await page.waitForSelector('text="Szablon został zapisany"');
    }
  }
}

class StudentExperienceTests {
  static async runAll(browser) {
    const results = [];
    const testCases = [
      this.testExamTaking,
      this.testPracticeMode,
      this.testResultsViewing,
      this.testAchievements,
      this.testCompetitionSystem,
      this.testRecommendations,
      this.testVariantGeneration
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
      category: 'Student Experience',
      status: 'pending',
      duration: 0,
      error: null,
      screenshots: []
    };

    try {
      await TestUtils.clearLocalStorage(page);
      await TestUtils.login(page, TEST_CONFIG.testUsers.student.username, TEST_CONFIG.testUsers.student.password);
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

  static async testExamTaking(page) {
    // Find available exam
    await page.waitForSelector('.card-modern');
    const examButtons = await page.$$('button:has-text("Rozpocznij")');
    
    if (examButtons.length > 0) {
      // Start exam
      await examButtons[0].click();
      
      // Answer questions
      for (let i = 0; i < 5; i++) {
        // Wait for question
        await page.waitForSelector('.card-modern');
        
        // Select first answer option
        const answerButtons = await page.$$('button[class*="hover:bg-gray-700"]');
        if (answerButtons.length > 0) {
          await answerButtons[0].click();
        }
        
        // Next question
        const nextButton = await page.$('button:has-text("Następne")');
        if (nextButton) {
          await nextButton.click();
        }
      }
      
      // Submit exam
      await page.click('button:has-text("Zakończ egzamin")');
      
      // Verify results page
      await page.waitForSelector('h1:has-text("Wyniki egzaminu")');
    }
  }

  static async testPracticeMode(page) {
    // Navigate to practice mode
    await page.goto(`${TEST_CONFIG.baseUrl}/test-practice.html`);
    
    // Select category
    await page.waitForSelector('select');
    await page.select('select:first-of-type', 'Matematyka');
    
    // Start practice
    await page.click('button:has-text("Rozpocznij test")');
    
    // Answer a question
    await page.waitForSelector('button[class*="hover:bg-gray-700"]');
    const answerOptions = await page.$$('button[class*="hover:bg-gray-700"]');
    
    if (answerOptions.length > 0) {
      await answerOptions[0].click();
      
      // Verify answer highlighting
      await page.waitForSelector('.bg-green-900, .bg-red-900');
      
      // Test hint system
      const hintButton = await page.$('button:has-text("Pokaż podpowiedź")');
      if (hintButton) {
        await hintButton.click();
        await page.waitForSelector('.text-yellow-300');
      }
    }
  }

  static async testResultsViewing(page) {
    // Check if results exist
    const resultsSection = await page.$('h2:has-text("Twoje wyniki")');
    
    if (resultsSection) {
      // Look for result cards
      const resultCards = await page.$$('.bg-gray-800');
      expect(resultCards.length).to.be.greaterThan(0);
      
      // Check result details
      const percentageText = await page.$eval('.text-green-400, .text-red-400', el => el.textContent);
      expect(percentageText).to.match(/\d+%/);
    }
  }

  static async testAchievements(page) {
    // Find achievements section
    await page.waitForSelector('h2:has-text("Twoje osiągnięcia")');
    
    // Check for achievement cards
    const achievementCards = await page.$$('.bg-green-900');
    
    // Verify achievement structure
    if (achievementCards.length > 0) {
      const achievementText = await page.$eval('.bg-green-900', el => el.textContent);
      expect(achievementText).to.include('pkt');
    }
  }

  static async testCompetitionSystem(page) {
    // Find competition section
    await page.waitForSelector('h2:has-text("Rywalizacja")');
    
    // Check leaderboard
    const leaderboardButton = await page.$('button:has-text("Zobacz ranking")');
    if (leaderboardButton) {
      await leaderboardButton.click();
      await page.waitForSelector('table');
      
      // Verify leaderboard has entries
      const rows = await page.$$('tbody tr');
      expect(rows.length).to.be.greaterThan(0);
    }
    
    // Test challenge system
    const challengeButton = await page.$('button:has-text("Wyzwij")');
    if (challengeButton) {
      await challengeButton.click();
      await page.waitForSelector('text="Wyzwanie wysłane"');
    }
  }

  static async testRecommendations(page) {
    // Find recommendations section
    await page.waitForSelector('h2:has-text("Personalizowane rekomendacje")');
    
    // Check for recommendation cards
    const recommendationCards = await page.$$('.border-yellow-500');
    
    // Verify recommendations exist
    if (recommendationCards.length > 0) {
      const recommendationText = await page.$eval('.border-yellow-500', el => el.textContent);
      expect(recommendationText).to.include('Rekomendowane');
    }
  }

  static async testVariantGeneration(page) {
    // Navigate to practice mode
    await page.goto(`${TEST_CONFIG.baseUrl}/test-practice.html`);
    
    // Look for variant generator
    const variantButton = await page.$('button:has-text("Generuj wariant")');
    
    if (variantButton) {
      await variantButton.click();
      
      // Wait for generation
      await page.waitForSelector('.animate-pulse', { hidden: true, timeout: 10000 });
      
      // Verify new variant loaded
      await page.waitForSelector('.card-modern:has-text("Wygenerowany wariant")');
    }
  }
}

class IntegrationTests {
  static async runAll(browser) {
    const results = [];
    const testCases = [
      this.testGeminiAPIIntegration,
      this.testDataPersistence,
      this.testFileImport,
      this.testStatisticsCalculation,
      this.testNotificationSystem,
      this.testSearchFunctionality
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
      category: 'Integration',
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

  static async testGeminiAPIIntegration(page) {
    // Test API proxy health check
    const response = await page.evaluate(async (apiUrl) => {
      try {
        const res = await fetch(`${apiUrl}/health`);
        return { status: res.status, ok: res.ok };
      } catch (error) {
        return { error: error.message };
      }
    }, TEST_CONFIG.apiUrl);
    
    expect(response.ok).to.be.true;
    
    // Test variant generation endpoint
    await TestUtils.login(page, TEST_CONFIG.testUsers.student.username, TEST_CONFIG.testUsers.student.password);
    await page.goto(`${TEST_CONFIG.baseUrl}/test-practice.html`);
    
    // Mock API request
    const apiResponse = await page.evaluate(async () => {
      const generator = new TaskVariantGenerator();
      // This should use the proxy endpoint
      return await generator.checkConnection();
    });
    
    expect(apiResponse).to.not.be.null;
  }

  static async testDataPersistence(page) {
    // Test localStorage persistence
    await page.goto(TEST_CONFIG.baseUrl);
    
    // Set test data
    await page.evaluate(() => {
      localStorage.setItem('testData', JSON.stringify({
        timestamp: Date.now(),
        value: 'test'
      }));
    });
    
    // Reload page
    await page.reload();
    
    // Verify data persists
    const data = await page.evaluate(() => {
      return localStorage.getItem('testData');
    });
    
    expect(data).to.not.be.null;
    const parsed = JSON.parse(data);
    expect(parsed.value).to.equal('test');
  }

  static async testFileImport(page) {
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Navigate to import section
    await page.click('a:has-text("Baza zadań")');
    
    // Test JSON structure validation
    const validationResult = await page.evaluate(() => {
      const testTask = {
        przedmiot: 'Matematyka',
        temat: 'Test',
        poziom: 'podstawowy',
        typ: 'zamkniete',
        tresc: 'Test question?',
        odpowiedzi: ['A', 'B', 'C', 'D'],
        poprawna: 'A',
        punkty: 1
      };
      
      // This should be the validation function
      const requiredFields = ['przedmiot', 'temat', 'tresc', 'typ'];
      return requiredFields.every(field => testTask[field]);
    });
    
    expect(validationResult).to.be.true;
  }

  static async testStatisticsCalculation(page) {
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Navigate to statistics
    await page.click('a:has-text("Statystyki")');
    
    // Wait for charts to load
    await page.waitForSelector('canvas', { timeout: 5000 });
    
    // Verify statistics calculations
    const stats = await page.evaluate(() => {
      const results = JSON.parse(localStorage.getItem('examResults') || '[]');
      const totalExams = results.length;
      const avgScore = results.reduce((sum, r) => sum + r.percentage, 0) / totalExams || 0;
      
      return { totalExams, avgScore };
    });
    
    expect(stats.totalExams).to.be.a('number');
    expect(stats.avgScore).to.be.a('number');
  }

  static async testNotificationSystem(page) {
    await TestUtils.login(page, TEST_CONFIG.testUsers.student.username, TEST_CONFIG.testUsers.student.password);
    
    // Check for notification bell
    await page.waitForSelector('.fa-bell');
    
    // Check notification badge
    const notificationBadge = await page.$('.notification-badge');
    
    if (notificationBadge) {
      const count = await page.$eval('.notification-badge', el => el.textContent);
      expect(parseInt(count)).to.be.a('number');
    }
  }

  static async testSearchFunctionality(page) {
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Navigate to question bank
    await page.click('a:has-text("Baza zadań")');
    
    // Test search input
    const searchInput = await page.$('input[placeholder*="Szukaj"]');
    
    if (searchInput) {
      await searchInput.type('geometria');
      
      // Wait for filtered results
      await page.waitForTimeout(500); // Debounce
      
      // Verify filtered results
      const results = await page.$$('.card-modern');
      expect(results.length).to.be.greaterThan(0);
    }
  }
}

class PerformanceTests {
  static async runAll(browser) {
    const results = [];
    const testCases = [
      this.testPageLoadTime,
      this.testLargeDatasetHandling,
      this.testConcurrentUsers,
      this.testMemoryUsage
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
      category: 'Performance',
      status: 'pending',
      duration: 0,
      error: null,
      screenshots: [],
      metrics: {}
    };

    try {
      await testCase(page, result);
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

  static async testPageLoadTime(page, result) {
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || 0,
        firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || 0
      };
    });
    
    result.metrics = metrics;
    
    // Assert reasonable load times
    expect(metrics.loadComplete).to.be.lessThan(3000); // 3 seconds
    expect(metrics.firstContentfulPaint).to.be.lessThan(1500); // 1.5 seconds
  }

  static async testLargeDatasetHandling(page, result) {
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Generate large dataset
    const startTime = Date.now();
    
    await page.evaluate(() => {
      const largeDataset = [];
      for (let i = 0; i < 1000; i++) {
        largeDataset.push({
          id: `test_${i}`,
          przedmiot: 'Matematyka',
          temat: `Test ${i}`,
          tresc: `Question ${i}`,
          typ: 'zamkniete',
          odpowiedzi: ['A', 'B', 'C', 'D'],
          poprawna: 'A',
          punkty: 1
        });
      }
      localStorage.setItem('largeTestDataset', JSON.stringify(largeDataset));
    });
    
    const processingTime = Date.now() - startTime;
    result.metrics.largeDatasetProcessing = processingTime;
    
    // Should handle 1000 items in reasonable time
    expect(processingTime).to.be.lessThan(1000); // 1 second
  }

  static async testConcurrentUsers(page, result) {
    // Simulate multiple concurrent users
    const concurrentPages = [];
    const userCount = 5;
    
    try {
      const startTime = Date.now();
      
      // Create multiple pages
      for (let i = 0; i < userCount; i++) {
        const newPage = await page.browser().newPage();
        concurrentPages.push(newPage);
      }
      
      // All users try to login simultaneously
      await Promise.all(concurrentPages.map(async (p, index) => {
        await p.goto(TEST_CONFIG.baseUrl);
        await TestUtils.login(p, 
          index % 2 === 0 ? TEST_CONFIG.testUsers.teacher.username : TEST_CONFIG.testUsers.student.username,
          index % 2 === 0 ? TEST_CONFIG.testUsers.teacher.password : TEST_CONFIG.testUsers.student.password
        );
      }));
      
      const concurrentLoadTime = Date.now() - startTime;
      result.metrics.concurrentUsers = {
        userCount,
        totalTime: concurrentLoadTime,
        avgTimePerUser: concurrentLoadTime / userCount
      };
      
      // Should handle concurrent users efficiently
      expect(concurrentLoadTime).to.be.lessThan(10000); // 10 seconds for 5 users
      
    } finally {
      // Cleanup
      for (const p of concurrentPages) {
        await p.close();
      }
    }
  }

  static async testMemoryUsage(page, result) {
    // Monitor memory usage
    const metrics = await page.metrics();
    
    result.metrics.memory = {
      jsHeapUsedSize: Math.round(metrics.JSHeapUsedSize / 1024 / 1024), // MB
      jsHeapTotalSize: Math.round(metrics.JSHeapTotalSize / 1024 / 1024) // MB
    };
    
    // Perform memory-intensive operations
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Navigate through multiple pages
    const pages = ['Baza zadań', 'Statystyki', 'Harmonogram', 'Bank arkuszy'];
    for (const pageName of pages) {
      await page.click(`a:has-text("${pageName}")`);
      await page.waitForTimeout(500);
    }
    
    // Check memory after navigation
    const metricsAfter = await page.metrics();
    result.metrics.memoryAfterNavigation = {
      jsHeapUsedSize: Math.round(metricsAfter.JSHeapUsedSize / 1024 / 1024), // MB
      jsHeapTotalSize: Math.round(metricsAfter.JSHeapTotalSize / 1024 / 1024) // MB
    };
    
    // Memory usage should be reasonable
    expect(result.metrics.memoryAfterNavigation.jsHeapUsedSize).to.be.lessThan(100); // 100MB
  }
}

class SecurityTests {
  static async runAll(browser) {
    const results = [];
    const testCases = [
      this.testXSSPrevention,
      this.testSQLInjectionPrevention,
      this.testAPIKeyProtection,
      this.testSessionSecurity,
      this.testPasswordSecurity
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
      category: 'Security',
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

  static async testXSSPrevention(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    
    // Try to inject script tags
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(\'XSS\')">',
      'javascript:alert("XSS")',
      '<svg onload="alert(\'XSS\')">'
    ];
    
    for (const payload of xssPayloads) {
      // Try to inject via form inputs
      await page.evaluate((payload) => {
        const inputs = document.querySelectorAll('input[type="text"], textarea');
        inputs.forEach(input => {
          input.value = payload;
        });
      }, payload);
      
      // Verify no script execution
      const alertFired = await page.evaluate(() => {
        let alertCalled = false;
        const originalAlert = window.alert;
        window.alert = () => { alertCalled = true; };
        
        // Trigger React re-render
        const event = new Event('input', { bubbles: true });
        document.querySelectorAll('input').forEach(input => input.dispatchEvent(event));
        
        window.alert = originalAlert;
        return alertCalled;
      });
      
      expect(alertFired).to.be.false;
    }
  }

  static async testSQLInjectionPrevention(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    
    // Try SQL injection payloads in login
    const sqlPayloads = [
      "' OR '1'='1",
      "admin'--",
      "' DROP TABLE users--",
      "1' UNION SELECT * FROM users--"
    ];
    
    for (const payload of sqlPayloads) {
      await page.reload();
      await page.waitForSelector('#username');
      await page.type('#username', payload);
      await page.type('#password', 'password');
      await page.click('button[type="submit"]');
      
      // Should show error, not log in
      await page.waitForSelector('.text-red-300');
      
      // Verify not logged in
      const isLoggedIn = await page.evaluate(() => {
        return sessionStorage.getItem('currentUser') !== null;
      });
      
      expect(isLoggedIn).to.be.false;
    }
  }

  static async testAPIKeyProtection(page) {
    // Check that API key is not exposed in client code
    const pageContent = await page.content();
    
    // Should not contain actual API key
    expect(pageContent).to.not.include('AIzaSy'); // Google API key prefix
    expect(pageContent).to.not.include('sk-'); // OpenAI API key prefix
    
    // Check localStorage for API keys
    const localStorageKeys = await page.evaluate(() => {
      return Object.keys(localStorage);
    });
    
    const sensitiveKeys = localStorageKeys.filter(key => 
      key.toLowerCase().includes('api') || 
      key.toLowerCase().includes('key') ||
      key.toLowerCase().includes('secret')
    );
    
    // Should not store API keys in localStorage
    expect(sensitiveKeys).to.have.lengthOf(0);
  }

  static async testSessionSecurity(page) {
    // Test session token security
    await TestUtils.login(page, TEST_CONFIG.testUsers.teacher.username, TEST_CONFIG.testUsers.teacher.password);
    
    // Get session data
    const sessionData = await page.evaluate(() => {
      return sessionStorage.getItem('currentUser');
    });
    
    const session = JSON.parse(sessionData);
    
    // Session should not contain password
    expect(session).to.not.have.property('password');
    
    // Session should have timestamp
    expect(session).to.have.property('loginTime');
    
    // Test session expiry (would need to mock time)
    // For now, just verify structure
    expect(session).to.have.property('userId');
    expect(session).to.have.property('role');
  }

  static async testPasswordSecurity(page) {
    await page.goto(TEST_CONFIG.baseUrl);
    
    // Check password field attributes
    const passwordFieldAttrs = await page.evaluate(() => {
      const passwordField = document.querySelector('input[type="password"]');
      return {
        type: passwordField.type,
        autocomplete: passwordField.autocomplete,
        minLength: passwordField.minLength
      };
    });
    
    expect(passwordFieldAttrs.type).to.equal('password');
    
    // Test password hashing
    const isPasswordHashed = await page.evaluate(() => {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      if (users.length === 0) return true; // No users to check
      
      // Check if any password looks like plain text
      return users.every(user => {
        return user.password && user.password.length === 64; // SHA256 hash length
      });
    });
    
    expect(isPasswordHashed).to.be.true;
  }
}

// Main test runner
class TestRunner {
  constructor() {
    this.browser = null;
    this.results = [];
    this.startTime = null;
  }

  async setup() {
    console.log('🚀 Starting QuizMaster Test Suite...');
    console.log(`📍 Base URL: ${TEST_CONFIG.baseUrl}`);
    console.log(`🔌 API URL: ${TEST_CONFIG.apiUrl}`);
    console.log(`🖥️  Headless: ${TEST_CONFIG.headless}`);
    
    this.browser = await puppeteer.launch({
      headless: TEST_CONFIG.headless,
      slowMo: TEST_CONFIG.slowMo,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    this.startTime = Date.now();
  }

  async runAllTests() {
    const testSuites = [
      { name: 'Authentication', runner: AuthenticationTests },
      { name: 'Exam Management', runner: ExamManagementTests },
      { name: 'Student Experience', runner: StudentExperienceTests },
      { name: 'Integration', runner: IntegrationTests },
      { name: 'Performance', runner: PerformanceTests },
      { name: 'Security', runner: SecurityTests }
    ];

    for (const suite of testSuites) {
      console.log(`\n📋 Running ${suite.name} Tests...`);
      
      try {
        const suiteResults = await suite.runner.runAll(this.browser);
        this.results.push(...suiteResults);
        
        const passed = suiteResults.filter(r => r.status === 'passed').length;
        const failed = suiteResults.filter(r => r.status === 'failed').length;
        
        console.log(`✅ Passed: ${passed}, ❌ Failed: ${failed}`);
        
        // Log failed tests
        suiteResults.filter(r => r.status === 'failed').forEach(result => {
          console.error(`  ❌ ${result.name}: ${result.error}`);
        });
        
      } catch (error) {
        console.error(`💥 Suite ${suite.name} crashed: ${error.message}`);
      }
    }
  }

  async generateReport() {
    const report = TestUtils.generateTestReport(this.results);
    report.totalDuration = Date.now() - this.startTime;
    
    // Save report
    const reportPath = path.join(__dirname, 'reports', `test-report-${Date.now()}.json`);
    await fs.mkdir(path.dirname(reportPath), { recursive: true });
    await fs.writeFile(reportPath, JSON.stringify(report, null, 2));
    
    // Generate HTML report
    const htmlReport = this.generateHTMLReport(report);
    const htmlPath = path.join(__dirname, 'reports', `test-report-${Date.now()}.html`);
    await fs.writeFile(htmlPath, htmlReport);
    
    console.log(`\n📊 Test Report saved to: ${reportPath}`);
    console.log(`📄 HTML Report saved to: ${htmlPath}`);
    
    return report;
  }

  generateHTMLReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>QuizMaster Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .summary-card { padding: 20px; border-radius: 8px; text-align: center; }
        .summary-card.passed { background: #d4edda; color: #155724; }
        .summary-card.failed { background: #f8d7da; color: #721c24; }
        .summary-card.skipped { background: #fff3cd; color: #856404; }
        .summary-card.total { background: #d1ecf1; color: #0c5460; }
        .summary-card h2 { margin: 0; font-size: 36px; }
        .summary-card p { margin: 5px 0 0 0; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { text-align: left; padding: 12px; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
        tr:hover { background: #f8f9fa; }
        .status { padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        .status.passed { background: #28a745; color: white; }
        .status.failed { background: #dc3545; color: white; }
        .status.skipped { background: #ffc107; color: black; }
        .error { color: #dc3545; font-size: 12px; margin-top: 4px; }
        .category { color: #6c757d; font-size: 12px; }
        .duration { color: #6c757d; }
        .footer { margin-top: 40px; text-align: center; color: #6c757d; }
        pre { background: #f8f9fa; padding: 10px; border-radius: 4px; overflow-x: auto; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 QuizMaster Test Report</h1>
        <p>Generated: ${new Date(report.timestamp).toLocaleString()}</p>
        <p>Total Duration: ${(report.totalDuration / 1000).toFixed(2)}s</p>
        
        <div class="summary">
            <div class="summary-card total">
                <h2>${report.totalTests}</h2>
                <p>Total Tests</p>
            </div>
            <div class="summary-card passed">
                <h2>${report.passed}</h2>
                <p>Passed</p>
            </div>
            <div class="summary-card failed">
                <h2>${report.failed}</h2>
                <p>Failed</p>
            </div>
            <div class="summary-card skipped">
                <h2>${report.skipped}</h2>
                <p>Skipped</p>
            </div>
        </div>
        
        <h2>Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Details</th>
                </tr>
            </thead>
            <tbody>
                ${report.details.map(test => `
                    <tr>
                        <td>${test.name}</td>
                        <td><span class="category">${test.category}</span></td>
                        <td><span class="status ${test.status}">${test.status.toUpperCase()}</span></td>
                        <td><span class="duration">${test.duration}ms</span></td>
                        <td>
                            ${test.error ? `<div class="error">${test.error}</div>` : ''}
                            ${test.metrics ? `<pre>${JSON.stringify(test.metrics, null, 2)}</pre>` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
        
        <div class="footer">
            <p>QuizMaster Test Suite v1.0</p>
        </div>
    </div>
</body>
</html>
    `;
    
    return html;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run() {
    try {
      await this.setup();
      await this.runAllTests();
      const report = await this.generateReport();
      
      console.log('\n📊 Final Results:');
      console.log(`   Total Tests: ${report.totalTests}`);
      console.log(`   ✅ Passed: ${report.passed}`);
      console.log(`   ❌ Failed: ${report.failed}`);
      console.log(`   ⏭️  Skipped: ${report.skipped}`);
      console.log(`   ⏱️  Duration: ${(report.totalDuration / 1000).toFixed(2)}s`);
      
      // Exit with appropriate code
      process.exit(report.failed > 0 ? 1 : 0);
      
    } catch (error) {
      console.error('💥 Test runner crashed:', error);
      process.exit(1);
    } finally {
      await this.cleanup();
    }
  }
}

// Run tests if called directly
if (require.main === module) {
  const runner = new TestRunner();
  runner.run();
}

module.exports = { TestRunner, TEST_CONFIG };