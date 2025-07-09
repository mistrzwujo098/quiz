// Jest setup file
const fs = require('fs').promises;
const path = require('path');

// Create necessary directories
beforeAll(async () => {
  const dirs = [
    path.join(__dirname, 'screenshots'),
    path.join(__dirname, 'reports'),
    path.join(__dirname, 'temp')
  ];

  for (const dir of dirs) {
    await fs.mkdir(dir, { recursive: true });
  }
});

// Clean up temp files after tests
afterAll(async () => {
  const tempDir = path.join(__dirname, 'temp');
  try {
    const files = await fs.readdir(tempDir);
    for (const file of files) {
      await fs.unlink(path.join(tempDir, file));
    }
  } catch (error) {
    // Ignore errors
  }
});

// Global test utilities
global.testUtils = {
  wait: (ms) => new Promise(resolve => setTimeout(resolve, ms)),
  
  randomString: (length = 10) => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  },

  generateTestFile: async (filename, content) => {
    const filepath = path.join(__dirname, 'temp', filename);
    await fs.writeFile(filepath, content);
    return filepath;
  }
};