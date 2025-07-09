# QuizMaster Test Suite

Comprehensive test suite for the QuizMaster educational application.

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Node.js 18+ (for local development)
- Gemini API key (for integration tests)

### Running Tests

```bash
# Run all tests with Docker
./run-tests.sh

# Quick mode (unit tests only)
./run-tests.sh --quick

# Skip Docker rebuild
./run-tests.sh --skip-build

# Keep services running after tests
./run-tests.sh --keep-running
```

### Local Development

```bash
# Install dependencies
npm install

# Run specific test suites
npm run test:unit          # Unit tests
npm run test:integration   # Integration tests
npm run test:comprehensive # Full E2E tests
npm run test:all          # All tests

# Generate reports
npm run test:report
```

## 📋 Test Categories

### 1. **Authentication Tests** (`AuthenticationTests`)
- Teacher login/logout
- Student login/logout
- Invalid credentials handling
- Session persistence
- Password hashing verification
- User creation

### 2. **Exam Management Tests** (`ExamManagementTests`)
- Exam creation and configuration
- Question bank management
- Group assignment
- Exam scheduling
- Template management
- Exam deletion

### 3. **Student Experience Tests** (`StudentExperienceTests`)
- Exam taking flow
- Practice mode
- Results viewing
- Achievement system
- Competition features
- Recommendation system
- AI variant generation

### 4. **Integration Tests** (`IntegrationTests`)
- Gemini API proxy integration
- Data persistence (localStorage)
- File import validation
- Statistics calculation
- Notification system
- Search functionality

### 5. **Performance Tests** (`PerformanceTests`)
- Page load times
- Large dataset handling
- Concurrent user simulation
- Memory usage monitoring

### 6. **Security Tests** (`SecurityTests`)
- XSS prevention
- SQL injection prevention
- API key protection
- Session security
- Password security

## 🐳 Docker Configuration

### Services

1. **web** - Main application server
2. **api-proxy** - Gemini API proxy server
3. **test-runner** - Test execution environment
4. **test-reporter** - Report generation service

### Volumes

- `test-results/` - Test execution results
- `coverage/` - Code coverage reports
- `tests/screenshots/` - Test failure screenshots

## 📊 Test Reports

After running tests, reports are generated in multiple formats:

1. **HTML Report** - `test-results/combined-report-*.html`
   - Visual dashboard with charts
   - Detailed test results
   - Performance metrics
   - Failure analysis

2. **JSON Report** - `test-results/combined-report-*.json`
   - Machine-readable format
   - Complete test data
   - Metrics and timings

3. **Markdown Summary** - `test-results/test-summary-*.md`
   - Quick overview
   - Key metrics
   - Recommendations

4. **Coverage Report** - `coverage/lcov-report/index.html`
   - Code coverage visualization
   - Line-by-line coverage
   - Uncovered code highlights

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# API Configuration
GEMINI_API_KEY=your_api_key_here

# Test Configuration
APP_URL=http://localhost:8000
API_URL=http://localhost:3001
HEADLESS=true
SLOW_MO=0
TEST_TIMEOUT=30000
TEST_RETRIES=2
```

### Test Configuration

Edit `tests/test.config.js` to customize:
- Test users and credentials
- Performance thresholds
- Selector mappings
- Report settings

## 🧪 Writing New Tests

### Test Structure

```javascript
class NewFeatureTests {
  static async runAll(browser) {
    const results = [];
    const testCases = [
      this.testFeatureA,
      this.testFeatureB
    ];

    for (const testCase of testCases) {
      const result = await this.runTest(browser, testCase);
      results.push(result);
    }

    return results;
  }

  static async testFeatureA(page) {
    // Test implementation
    await page.goto(TEST_CONFIG.baseUrl);
    // ... test steps
    expect(something).to.be.true;
  }
}
```

### Best Practices

1. **Isolation** - Each test should be independent
2. **Cleanup** - Clear state between tests
3. **Assertions** - Use meaningful assertions
4. **Screenshots** - Capture on failure
5. **Timeouts** - Set appropriate timeouts
6. **Selectors** - Use data-testid when possible

## 🐛 Debugging

### View Container Logs

```bash
docker-compose -f docker-compose.test.yml logs web
docker-compose -f docker-compose.test.yml logs api-proxy
docker-compose -f docker-compose.test.yml logs test-runner
```

### Run Tests Interactively

```bash
# Start services
docker-compose -f docker-compose.test.yml up -d web api-proxy

# Run tests with debugging
docker-compose -f docker-compose.test.yml run --rm \
  -e HEADLESS=false \
  -e SLOW_MO=100 \
  test-runner node tests/comprehensive-test-suite.js
```

### Access Services

- Web App: http://localhost:8000
- API Proxy: http://localhost:3001
- Health Check: http://localhost:3001/health

## 📈 Performance Benchmarks

Expected performance metrics:

| Metric | Target | Actual |
|--------|--------|--------|
| Page Load Time | < 3s | - |
| First Contentful Paint | < 1.5s | - |
| API Response Time | < 2s | - |
| Memory Usage | < 100MB | - |
| Test Suite Duration | < 10min | - |

## 🚨 Troubleshooting

### Common Issues

1. **Port already in use**
   ```bash
   # Find and kill process
   lsof -ti:8000 | xargs kill -9
   lsof -ti:3001 | xargs kill -9
   ```

2. **Docker build fails**
   ```bash
   # Clean Docker cache
   docker system prune -a
   docker-compose -f docker-compose.test.yml build --no-cache
   ```

3. **Tests timeout**
   - Increase `TEST_TIMEOUT` in `.env`
   - Check service health endpoints
   - Verify network connectivity

4. **Missing dependencies**
   ```bash
   # Rebuild containers
   docker-compose -f docker-compose.test.yml down -v
   docker-compose -f docker-compose.test.yml build
   ```

## 🤝 Contributing

1. Write tests for new features
2. Ensure all tests pass locally
3. Update test documentation
4. Submit PR with test results

## 📝 License

This test suite is part of the QuizMaster project and follows the same license terms.