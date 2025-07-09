module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/'],
  coverageDirectory: './coverage',
  collectCoverageFrom: [
    'js/**/*.js',
    '!js/init.js',
    '!node_modules/**'
  ],
  setupFilesAfterEnv: ['./jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  reporters: [
    'default',
    ['jest-html-reporter', {
      pageTitle: 'QuizMaster Test Report',
      outputPath: './tests/reports/test-report.html',
      includeFailureMsg: true,
      includeConsoleLog: true
    }]
  ]
};