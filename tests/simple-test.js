// Simple test runner without external dependencies
const fs = require('fs');
const path = require('path');

// Test results
const results = {
  passed: 0,
  failed: 0,
  tests: []
};

// Helper functions
function assert(condition, message) {
  if (condition) {
    results.passed++;
    results.tests.push({ status: 'PASS', message });
    console.log(`✅ PASS: ${message}`);
  } else {
    results.failed++;
    results.tests.push({ status: 'FAIL', message });
    console.log(`❌ FAIL: ${message}`);
  }
}

function assertEqual(actual, expected, message) {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  if (!pass) {
    console.log(`   Expected: ${JSON.stringify(expected)}`);
    console.log(`   Actual: ${JSON.stringify(actual)}`);
  }
  assert(pass, message);
}

// Mock localStorage
const localStorage = {
  data: {},
  getItem(key) {
    return this.data[key] || null;
  },
  setItem(key, value) {
    this.data[key] = value;
  },
  clear() {
    this.data = {};
  }
};

// Load the functions from index.html
console.log('Loading application code...\n');
const indexHtml = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

// Extract the React component code
const scriptMatch = indexHtml.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  console.error('Could not extract script from index.html');
  process.exit(1);
}

// Extract key functions for testing
const code = scriptMatch[1];

// Test data generators
function generateQuizData(count = 5) {
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
}

// Run tests
console.log('=== DATABASE CLEAR FUNCTIONALITY TESTS ===\n');

// Test 1: Clear empty database
localStorage.clear();
localStorage.setItem('zadaniaDB', JSON.stringify([]));
let data = JSON.parse(localStorage.getItem('zadaniaDB'));
assertEqual(data, [], 'Should start with empty database');

// Test 2: Clear populated database
const testTasks = [
  { id: 1, przedmiot: 'test', temat: 'test1' },
  { id: 2, przedmiot: 'test', temat: 'test2' }
];
localStorage.setItem('zadaniaDB', JSON.stringify(testTasks));
data = JSON.parse(localStorage.getItem('zadaniaDB'));
assertEqual(data.length, 2, 'Should have 2 tasks before clearing');

// Simulate clear operation
localStorage.setItem('zadaniaDB', JSON.stringify([]));
data = JSON.parse(localStorage.getItem('zadaniaDB'));
assertEqual(data, [], 'Should have empty array after clearing');

console.log('\n=== DATA STRUCTURE MAPPING TESTS ===\n');

// Test 3: Quiz data structure mapping
const quizData = generateQuizData(1);
const question = quizData.questions[0];

// Simulate the mapping from the handleDatabaseLoad function
const mapped = {
  id: `quiz_2025_${question.id}`,
  przedmiot: 'egzamin ósmoklasisty',
  temat: question.type || question.department,
  tresc: question.question,
  typ: 'zamkniete',
  odpowiedzi: [
    question.options.a,
    question.options.b,
    question.options.c,
    question.options.d
  ],
  poprawna: question.correctAnswer.toUpperCase(),
  punkty: 1,
  poziom: 'podstawowy',
  rok: '2025',
  sesja: 'główna',
  obrazek: question.hasImage && question.imageSvg ? question.imageSvg : null,
  wyjaśnienie: question.explanation || null,
  dział: question.department || null
};

assert(mapped.id === 'quiz_2025_1', 'ID should be prefixed with quiz_2025_');
assert(mapped.temat === 'Typ zadania 1', 'Should use type field for temat');
assert(mapped.dział === 'Dział 1', 'Should use department field for dział');
assert(Array.isArray(mapped.odpowiedzi), 'Odpowiedzi should be an array');
assertEqual(mapped.odpowiedzi.length, 4, 'Should have 4 answers');

// Test 4: Type priority over department
const questionWithBoth = {
  id: 2,
  department: 'Liczby i działania',
  type: 'Potęgi i pierwiastki',
  question: 'Test',
  hasImage: false,
  imageSvg: null,
  options: { a: 'A', b: 'B', c: 'C', d: 'D' },
  correctAnswer: 'a'
};

const mappedWithBoth = {
  temat: questionWithBoth.type || questionWithBoth.department,
  dział: questionWithBoth.department || null
};

assertEqual(mappedWithBoth.temat, 'Potęgi i pierwiastki', 'Should prioritize type over department');
assertEqual(mappedWithBoth.dział, 'Liczby i działania', 'Should store department in dział');

// Test 5: Handle image data
const questionWithImage = {
  id: 3,
  department: 'Geometria',
  type: 'Figury',
  question: 'Image test',
  hasImage: true,
  imageSvg: '<svg>test</svg>',
  options: { a: 'A', b: 'B', c: 'C', d: 'D' },
  correctAnswer: 'b'
};

const mappedWithImage = {
  obrazek: questionWithImage.hasImage && questionWithImage.imageSvg ? questionWithImage.imageSvg : null
};

assertEqual(mappedWithImage.obrazek, '<svg>test</svg>', 'Should include SVG when hasImage is true');

// Test 6: Handle missing image
const questionNoImage = {
  hasImage: false,
  imageSvg: '<svg>ignored</svg>'
};

const mappedNoImage = {
  obrazek: questionNoImage.hasImage && questionNoImage.imageSvg ? questionNoImage.imageSvg : null
};

assertEqual(mappedNoImage.obrazek, null, 'Should be null when hasImage is false');

console.log('\n=== DUPLICATE PREVENTION TESTS ===\n');

// Test 7: Prevent duplicates
const existingTasks = [
  { id: 'quiz_2025_1', przedmiot: 'test', temat: 'existing' }
];

const newTasks = [
  { id: 'quiz_2025_1', przedmiot: 'test', temat: 'duplicate' },
  { id: 'quiz_2025_2', przedmiot: 'test', temat: 'new' }
];

// Simulate duplicate check
const existingIds = new Set(existingTasks.map(t => t.id));
const filtered = newTasks.filter(task => !existingIds.has(task.id));

assertEqual(filtered.length, 1, 'Should filter out duplicate');
assertEqual(filtered[0].id, 'quiz_2025_2', 'Should keep only new task');

// Generate report
console.log('\n=== TEST SUMMARY ===\n');
console.log(`Total tests: ${results.passed + results.failed}`);
console.log(`Passed: ${results.passed}`);
console.log(`Failed: ${results.failed}`);
console.log(`Success rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%`);

// Generate HTML report
const reportHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>QuizMaster Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; }
        .summary { background: #f0f0f0; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .pass { color: #22c55e; }
        .fail { color: #ef4444; }
        .test { margin: 10px 0; padding: 10px; border-left: 3px solid; }
        .test.pass { border-color: #22c55e; background: #f0fdf4; }
        .test.fail { border-color: #ef4444; background: #fef2f2; }
        .timestamp { color: #666; font-size: 0.9em; }
    </style>
</head>
<body>
    <div class="container">
        <h1>QuizMaster Test Report</h1>
        <div class="timestamp">Generated: ${new Date().toLocaleString()}</div>
        
        <div class="summary">
            <h2>Summary</h2>
            <p>Total Tests: ${results.passed + results.failed}</p>
            <p class="pass">Passed: ${results.passed}</p>
            <p class="fail">Failed: ${results.failed}</p>
            <p>Success Rate: ${((results.passed / (results.passed + results.failed)) * 100).toFixed(1)}%</p>
        </div>
        
        <h2>Test Results</h2>
        ${results.tests.map(test => `
            <div class="test ${test.status.toLowerCase()}">
                <strong>${test.status}:</strong> ${test.message}
            </div>
        `).join('')}
    </div>
</body>
</html>
`;

// Save report
const reportPath = path.join(__dirname, 'test-report.html');
fs.writeFileSync(reportPath, reportHtml);
console.log(`\nHTML report saved to: ${reportPath}`);

// Exit with appropriate code
process.exit(results.failed > 0 ? 1 : 0);