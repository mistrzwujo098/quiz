module.exports = {
  // Test environment configuration
  testEnvironment: {
    baseUrl: process.env.APP_URL || 'http://localhost:8000',
    apiUrl: process.env.API_URL || 'http://localhost:3001',
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO || '0'),
    timeout: parseInt(process.env.TEST_TIMEOUT || '30000'),
    retries: parseInt(process.env.TEST_RETRIES || '2')
  },

  // Test users
  testUsers: {
    teacher: {
      username: 'paulinaodmatematyki',
      password: 'paulina#314159265'
    },
    student: {
      username: 'anna.kowalska',
      password: 'haslo123'
    },
    testStudent: {
      username: 'test.student',
      password: 'test123'
    }
  },

  // Test data
  testData: {
    sampleTask: {
      przedmiot: 'Matematyka',
      temat: 'Geometria',
      poziom: 'podstawowy',
      typ: 'zamkniete',
      tresc: 'Oblicz pole kwadratu o boku 5 cm.',
      odpowiedzi: ['25 cm²', '20 cm²', '10 cm²', '5 cm²'],
      poprawna: '25 cm²',
      punkty: 1,
      rozwiazanie: 'Pole kwadratu = a² = 5² = 25 cm²'
    },
    sampleExam: {
      title: 'Test Matematyka - Geometria',
      timeLimit: 45,
      category: 'egzamin ósmoklasisty'
    },
    sampleGroup: {
      name: 'Klasa 8A Test',
      students: []
    }
  },

  // Browser configuration
  puppeteerConfig: {
    headless: process.env.HEADLESS !== 'false',
    slowMo: parseInt(process.env.SLOW_MO || '0'),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--single-process',
      '--disable-gpu'
    ],
    defaultViewport: {
      width: 1280,
      height: 720
    }
  },

  // Test categories to run
  testCategories: {
    authentication: true,
    examManagement: true,
    studentExperience: true,
    integration: true,
    performance: true,
    security: true
  },

  // Reporting configuration
  reporting: {
    screenshots: {
      enabled: true,
      onFailure: true,
      onSuccess: false,
      path: 'tests/screenshots'
    },
    html: {
      enabled: true,
      path: 'tests/reports',
      openAfterTest: false
    },
    json: {
      enabled: true,
      path: 'tests/reports'
    },
    console: {
      verbose: true,
      showPassedTests: true,
      showFailedTests: true,
      showTestDuration: true
    }
  },

  // Performance thresholds
  performanceThresholds: {
    pageLoadTime: 3000, // 3 seconds
    firstContentfulPaint: 1500, // 1.5 seconds
    apiResponseTime: 2000, // 2 seconds
    largeDatasetProcessing: 1000, // 1 second
    memoryUsageLimit: 100 // 100MB
  },

  // API endpoints to test
  apiEndpoints: {
    health: '/health',
    generateVariant: '/api/gemini/generate',
    authenticate: '/api/auth/session'
  },

  // Selectors map for easier maintenance
  selectors: {
    login: {
      usernameInput: '#username',
      passwordInput: '#password',
      submitButton: 'button[type="submit"]',
      errorMessage: '.text-red-300'
    },
    teacherPanel: {
      title: 'h1:has-text("Panel Nauczyciela")',
      createExamButton: 'button:has-text("Utwórz arkusz")',
      questionsBank: 'a:has-text("Baza zadań")',
      statistics: 'a:has-text("Statystyki")',
      schedule: 'a:has-text("Harmonogram")'
    },
    studentPanel: {
      title: 'h1:has-text("Panel Ucznia")',
      availableExams: 'h2:has-text("Dostępne arkusze")',
      startExamButton: 'button:has-text("Rozpocznij")',
      practiceMode: 'a[href="test-practice.html"]',
      achievements: 'h2:has-text("Twoje osiągnięcia")'
    },
    exam: {
      questionCard: '.card-modern',
      answerOption: 'button[class*="hover:bg-gray-700"]',
      nextButton: 'button:has-text("Następne")',
      previousButton: 'button:has-text("Poprzednie")',
      submitButton: 'button:has-text("Zakończ egzamin")'
    },
    practice: {
      categorySelect: 'select:first-of-type',
      subjectSelect: 'select:nth-of-type(2)',
      startButton: 'button:has-text("Rozpocznij test")',
      hintButton: 'button:has-text("Pokaż podpowiedź")',
      variantButton: 'button:has-text("Generuj wariant")'
    }
  }
};