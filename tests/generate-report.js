const fs = require('fs').promises;
const path = require('path');

class TestReportGenerator {
  constructor() {
    this.reportsDir = path.join(__dirname, 'reports');
    this.screenshotsDir = path.join(__dirname, 'screenshots');
  }

  async generateCombinedReport() {
    try {
      // Ensure directories exist
      await fs.mkdir(this.reportsDir, { recursive: true });

      // Collect all test results
      const reports = await this.collectReports();
      
      // Generate combined report
      const combinedReport = {
        timestamp: new Date().toISOString(),
        environment: {
          node: process.version,
          platform: process.platform,
          testUrl: process.env.APP_URL || 'http://localhost:8000'
        },
        summary: this.generateSummary(reports),
        testSuites: reports,
        coverage: await this.collectCoverage(),
        performance: await this.collectPerformanceMetrics(reports),
        failureAnalysis: this.analyzeFailures(reports)
      };

      // Save combined JSON report
      const jsonPath = path.join(this.reportsDir, `combined-report-${Date.now()}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(combinedReport, null, 2));

      // Generate HTML report
      const htmlPath = path.join(this.reportsDir, `combined-report-${Date.now()}.html`);
      await fs.writeFile(htmlPath, this.generateHTMLReport(combinedReport));

      // Generate Markdown summary
      const mdPath = path.join(this.reportsDir, `test-summary-${Date.now()}.md`);
      await fs.writeFile(mdPath, this.generateMarkdownSummary(combinedReport));

      console.log(`✅ Reports generated:`);
      console.log(`   📄 JSON: ${jsonPath}`);
      console.log(`   🌐 HTML: ${htmlPath}`);
      console.log(`   📝 Markdown: ${mdPath}`);

      return combinedReport;
    } catch (error) {
      console.error('❌ Error generating report:', error);
      throw error;
    }
  }

  async collectReports() {
    const reports = [];
    
    try {
      const files = await fs.readdir(this.reportsDir);
      const jsonFiles = files.filter(f => f.endsWith('.json') && f.includes('test-report'));
      
      for (const file of jsonFiles) {
        const content = await fs.readFile(path.join(this.reportsDir, file), 'utf8');
        reports.push(JSON.parse(content));
      }
    } catch (error) {
      console.warn('⚠️  No existing reports found');
    }

    return reports;
  }

  generateSummary(reports) {
    let totalTests = 0;
    let totalPassed = 0;
    let totalFailed = 0;
    let totalSkipped = 0;
    let totalDuration = 0;

    reports.forEach(report => {
      totalTests += report.totalTests || 0;
      totalPassed += report.passed || 0;
      totalFailed += report.failed || 0;
      totalSkipped += report.skipped || 0;
      totalDuration += report.totalDuration || 0;
    });

    return {
      totalTests,
      totalPassed,
      totalFailed,
      totalSkipped,
      totalDuration,
      successRate: totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(2) : 0,
      averageDuration: totalTests > 0 ? (totalDuration / totalTests).toFixed(2) : 0
    };
  }

  async collectCoverage() {
    try {
      const coveragePath = path.join(__dirname, '..', 'coverage', 'coverage-summary.json');
      const coverage = await fs.readFile(coveragePath, 'utf8');
      return JSON.parse(coverage);
    } catch (error) {
      return null;
    }
  }

  collectPerformanceMetrics(reports) {
    const metrics = {
      pageLoadTimes: [],
      apiResponseTimes: [],
      memoryUsage: [],
      testDurations: []
    };

    reports.forEach(report => {
      if (report.details) {
        report.details.forEach(test => {
          if (test.metrics) {
            if (test.metrics.loadComplete) {
              metrics.pageLoadTimes.push(test.metrics.loadComplete);
            }
            if (test.metrics.apiResponseTime) {
              metrics.apiResponseTimes.push(test.metrics.apiResponseTime);
            }
            if (test.metrics.memory) {
              metrics.memoryUsage.push(test.metrics.memory.jsHeapUsedSize);
            }
          }
          if (test.duration) {
            metrics.testDurations.push(test.duration);
          }
        });
      }
    });

    return {
      averagePageLoadTime: this.calculateAverage(metrics.pageLoadTimes),
      averageApiResponseTime: this.calculateAverage(metrics.apiResponseTimes),
      averageMemoryUsage: this.calculateAverage(metrics.memoryUsage),
      averageTestDuration: this.calculateAverage(metrics.testDurations),
      maxPageLoadTime: Math.max(...metrics.pageLoadTimes, 0),
      maxApiResponseTime: Math.max(...metrics.apiResponseTimes, 0),
      maxMemoryUsage: Math.max(...metrics.memoryUsage, 0),
      maxTestDuration: Math.max(...metrics.testDurations, 0)
    };
  }

  analyzeFailures(reports) {
    const failures = [];
    const failureCategories = {};

    reports.forEach(report => {
      if (report.details) {
        report.details.forEach(test => {
          if (test.status === 'failed') {
            failures.push({
              name: test.name,
              category: test.category,
              error: test.error,
              duration: test.duration
            });

            // Categorize failures
            if (!failureCategories[test.category]) {
              failureCategories[test.category] = 0;
            }
            failureCategories[test.category]++;
          }
        });
      }
    });

    // Find common error patterns
    const errorPatterns = this.findErrorPatterns(failures);

    return {
      totalFailures: failures.length,
      failuresByCategory: failureCategories,
      commonErrors: errorPatterns,
      criticalFailures: failures.filter(f => 
        f.category === 'Authentication' || 
        f.category === 'Security' ||
        f.error?.includes('timeout')
      )
    };
  }

  findErrorPatterns(failures) {
    const patterns = {};
    
    failures.forEach(failure => {
      // Extract key error phrases
      const errorKey = failure.error
        ?.toLowerCase()
        .replace(/\d+/g, 'N')
        .replace(/['"]/g, '')
        .substring(0, 50);
      
      if (errorKey) {
        if (!patterns[errorKey]) {
          patterns[errorKey] = { count: 0, tests: [] };
        }
        patterns[errorKey].count++;
        patterns[errorKey].tests.push(failure.name);
      }
    });

    // Return top 5 most common errors
    return Object.entries(patterns)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([error, data]) => ({
        error,
        count: data.count,
        affectedTests: data.tests
      }));
  }

  calculateAverage(numbers) {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((a, b) => a + b, 0);
    return (sum / numbers.length).toFixed(2);
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html lang="pl">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>QuizMaster - Combined Test Report</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #ffffff;
            line-height: 1.6;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 2rem; }
        
        /* Header */
        .header {
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            padding: 2rem;
            border-radius: 1rem;
            margin-bottom: 2rem;
            box-shadow: 0 10px 30px rgba(124, 58, 237, 0.3);
        }
        .header h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .header p { opacity: 0.9; }
        
        /* Summary Cards */
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1.5rem;
            margin-bottom: 2rem;
        }
        .summary-card {
            background: rgba(255, 255, 255, 0.05);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 1.5rem;
            border-radius: 0.75rem;
            text-align: center;
            transition: transform 0.3s ease;
        }
        .summary-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 20px rgba(0, 0, 0, 0.3);
        }
        .summary-card h3 { 
            font-size: 2.5rem; 
            margin: 0.5rem 0;
            background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .summary-card.passed h3 { 
            background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .summary-card.failed h3 { 
            background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        
        /* Sections */
        .section {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            padding: 2rem;
            border-radius: 0.75rem;
            margin-bottom: 2rem;
        }
        .section h2 { 
            font-size: 1.75rem; 
            margin-bottom: 1.5rem;
            color: #a855f7;
        }
        
        /* Tables */
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 1rem;
        }
        th, td {
            text-align: left;
            padding: 1rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        th {
            background: rgba(124, 58, 237, 0.2);
            font-weight: 600;
        }
        tr:hover {
            background: rgba(255, 255, 255, 0.05);
        }
        
        /* Status badges */
        .status {
            padding: 0.25rem 0.75rem;
            border-radius: 9999px;
            font-size: 0.875rem;
            font-weight: 600;
        }
        .status.passed { background: #10b981; color: white; }
        .status.failed { background: #ef4444; color: white; }
        .status.skipped { background: #f59e0b; color: white; }
        
        /* Charts */
        .chart-container {
            margin: 2rem 0;
            padding: 1rem;
            background: rgba(0, 0, 0, 0.3);
            border-radius: 0.5rem;
        }
        
        /* Performance metrics */
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1rem;
            margin-top: 1rem;
        }
        .metric {
            background: rgba(255, 255, 255, 0.05);
            padding: 1rem;
            border-radius: 0.5rem;
            text-align: center;
        }
        .metric-value {
            font-size: 1.5rem;
            font-weight: bold;
            color: #a855f7;
        }
        
        /* Error analysis */
        .error-item {
            background: rgba(239, 68, 68, 0.1);
            border: 1px solid rgba(239, 68, 68, 0.3);
            padding: 1rem;
            border-radius: 0.5rem;
            margin-bottom: 1rem;
        }
        .error-count {
            background: #ef4444;
            color: white;
            padding: 0.25rem 0.5rem;
            border-radius: 0.25rem;
            font-size: 0.875rem;
            margin-left: 0.5rem;
        }
        
        /* Coverage */
        .coverage-bar {
            background: rgba(255, 255, 255, 0.1);
            height: 30px;
            border-radius: 15px;
            overflow: hidden;
            margin: 0.5rem 0;
        }
        .coverage-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            transition: width 0.5s ease;
        }
        
        /* Footer */
        .footer {
            text-align: center;
            padding: 2rem;
            margin-top: 3rem;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            color: rgba(255, 255, 255, 0.5);
        }
        
        /* Responsive */
        @media (max-width: 768px) {
            .summary-grid { grid-template-columns: 1fr; }
            .metrics-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 QuizMaster Test Report</h1>
            <p>Generated: ${new Date(report.timestamp).toLocaleString('pl-PL')}</p>
            <p>Environment: ${report.environment.platform} | Node ${report.environment.node}</p>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <p>Total Tests</p>
                <h3>${report.summary.totalTests}</h3>
                <p>Success Rate: ${report.summary.successRate}%</p>
            </div>
            <div class="summary-card passed">
                <p>Passed</p>
                <h3>${report.summary.totalPassed}</h3>
                <p>${((report.summary.totalPassed / report.summary.totalTests) * 100).toFixed(1)}%</p>
            </div>
            <div class="summary-card failed">
                <p>Failed</p>
                <h3>${report.summary.totalFailed}</h3>
                <p>${((report.summary.totalFailed / report.summary.totalTests) * 100).toFixed(1)}%</p>
            </div>
            <div class="summary-card">
                <p>Duration</p>
                <h3>${(report.summary.totalDuration / 1000).toFixed(1)}s</h3>
                <p>Avg: ${(report.summary.averageDuration / 1000).toFixed(2)}s</p>
            </div>
        </div>

        ${report.coverage ? `
        <div class="section">
            <h2>📊 Code Coverage</h2>
            <div>
                <p>Statements</p>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${report.coverage.total.statements.pct}%">
                        ${report.coverage.total.statements.pct.toFixed(1)}%
                    </div>
                </div>
            </div>
            <div>
                <p>Branches</p>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${report.coverage.total.branches.pct}%">
                        ${report.coverage.total.branches.pct.toFixed(1)}%
                    </div>
                </div>
            </div>
            <div>
                <p>Functions</p>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${report.coverage.total.functions.pct}%">
                        ${report.coverage.total.functions.pct.toFixed(1)}%
                    </div>
                </div>
            </div>
            <div>
                <p>Lines</p>
                <div class="coverage-bar">
                    <div class="coverage-fill" style="width: ${report.coverage.total.lines.pct}%">
                        ${report.coverage.total.lines.pct.toFixed(1)}%
                    </div>
                </div>
            </div>
        </div>
        ` : ''}

        <div class="section">
            <h2>⚡ Performance Metrics</h2>
            <div class="metrics-grid">
                <div class="metric">
                    <p>Avg Page Load</p>
                    <div class="metric-value">${report.performance.averagePageLoadTime}ms</div>
                    <p>Max: ${report.performance.maxPageLoadTime}ms</p>
                </div>
                <div class="metric">
                    <p>Avg API Response</p>
                    <div class="metric-value">${report.performance.averageApiResponseTime}ms</div>
                    <p>Max: ${report.performance.maxApiResponseTime}ms</p>
                </div>
                <div class="metric">
                    <p>Avg Memory</p>
                    <div class="metric-value">${report.performance.averageMemoryUsage}MB</div>
                    <p>Max: ${report.performance.maxMemoryUsage}MB</p>
                </div>
                <div class="metric">
                    <p>Avg Test Time</p>
                    <div class="metric-value">${(report.performance.averageTestDuration / 1000).toFixed(2)}s</div>
                    <p>Max: ${(report.performance.maxTestDuration / 1000).toFixed(2)}s</p>
                </div>
            </div>
        </div>

        ${report.failureAnalysis.totalFailures > 0 ? `
        <div class="section">
            <h2>❌ Failure Analysis</h2>
            <p>Total failures: ${report.failureAnalysis.totalFailures}</p>
            
            <h3>Failures by Category</h3>
            <div class="metrics-grid">
                ${Object.entries(report.failureAnalysis.failuresByCategory).map(([category, count]) => `
                    <div class="metric">
                        <p>${category}</p>
                        <div class="metric-value">${count}</div>
                    </div>
                `).join('')}
            </div>

            <h3>Common Error Patterns</h3>
            ${report.failureAnalysis.commonErrors.map(error => `
                <div class="error-item">
                    <strong>${error.error}</strong>
                    <span class="error-count">${error.count}x</span>
                    <p>Affected tests: ${error.affectedTests.join(', ')}</p>
                </div>
            `).join('')}

            ${report.failureAnalysis.criticalFailures.length > 0 ? `
                <h3>🚨 Critical Failures</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Test</th>
                            <th>Category</th>
                            <th>Error</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${report.failureAnalysis.criticalFailures.map(failure => `
                            <tr>
                                <td>${failure.name}</td>
                                <td>${failure.category}</td>
                                <td>${failure.error}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : ''}
        </div>
        ` : ''}

        <div class="section">
            <h2>📋 Test Suites</h2>
            <table>
                <thead>
                    <tr>
                        <th>Suite</th>
                        <th>Total</th>
                        <th>Passed</th>
                        <th>Failed</th>
                        <th>Skipped</th>
                        <th>Duration</th>
                    </tr>
                </thead>
                <tbody>
                    ${report.testSuites.map(suite => `
                        <tr>
                            <td>${suite.timestamp ? new Date(suite.timestamp).toLocaleString() : 'N/A'}</td>
                            <td>${suite.totalTests || 0}</td>
                            <td><span class="status passed">${suite.passed || 0}</span></td>
                            <td><span class="status failed">${suite.failed || 0}</span></td>
                            <td><span class="status skipped">${suite.skipped || 0}</span></td>
                            <td>${((suite.totalDuration || 0) / 1000).toFixed(2)}s</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <div class="footer">
            <p>QuizMaster Test Suite v1.0</p>
            <p>Generated with ❤️ for better quality</p>
        </div>
    </div>
</body>
</html>
    `;
  }

  generateMarkdownSummary(report) {
    return `# QuizMaster Test Report

Generated: ${new Date(report.timestamp).toLocaleString('pl-PL')}

## 📊 Summary

| Metric | Value |
|--------|-------|
| Total Tests | ${report.summary.totalTests} |
| Passed | ${report.summary.totalPassed} (${((report.summary.totalPassed / report.summary.totalTests) * 100).toFixed(1)}%) |
| Failed | ${report.summary.totalFailed} (${((report.summary.totalFailed / report.summary.totalTests) * 100).toFixed(1)}%) |
| Skipped | ${report.summary.totalSkipped} |
| Success Rate | ${report.summary.successRate}% |
| Total Duration | ${(report.summary.totalDuration / 1000).toFixed(1)}s |
| Average Duration | ${(report.summary.averageDuration / 1000).toFixed(2)}s |

${report.coverage ? `
## 📈 Code Coverage

- Statements: ${report.coverage.total.statements.pct.toFixed(1)}%
- Branches: ${report.coverage.total.branches.pct.toFixed(1)}%
- Functions: ${report.coverage.total.functions.pct.toFixed(1)}%
- Lines: ${report.coverage.total.lines.pct.toFixed(1)}%
` : ''}

## ⚡ Performance Metrics

- **Page Load Time**: Avg ${report.performance.averagePageLoadTime}ms (Max: ${report.performance.maxPageLoadTime}ms)
- **API Response Time**: Avg ${report.performance.averageApiResponseTime}ms (Max: ${report.performance.maxApiResponseTime}ms)
- **Memory Usage**: Avg ${report.performance.averageMemoryUsage}MB (Max: ${report.performance.maxMemoryUsage}MB)
- **Test Duration**: Avg ${(report.performance.averageTestDuration / 1000).toFixed(2)}s (Max: ${(report.performance.maxTestDuration / 1000).toFixed(2)}s)

${report.failureAnalysis.totalFailures > 0 ? `
## ❌ Failure Analysis

Total Failures: ${report.failureAnalysis.totalFailures}

### Failures by Category
${Object.entries(report.failureAnalysis.failuresByCategory)
  .map(([category, count]) => `- ${category}: ${count}`)
  .join('\n')}

### Common Error Patterns
${report.failureAnalysis.commonErrors
  .map(error => `- **${error.error}** (${error.count}x)`)
  .join('\n')}

${report.failureAnalysis.criticalFailures.length > 0 ? `
### 🚨 Critical Failures
${report.failureAnalysis.criticalFailures
  .map(f => `- **${f.name}** (${f.category}): ${f.error}`)
  .join('\n')}
` : ''}
` : ''}

## 🔍 Recommendations

${report.summary.successRate < 80 ? '- ⚠️ Success rate is below 80%. Focus on fixing failing tests.' : ''}
${report.performance.averagePageLoadTime > 2000 ? '- ⚠️ Page load time is high. Consider performance optimizations.' : ''}
${report.performance.averageMemoryUsage > 50 ? '- ⚠️ Memory usage is high. Check for memory leaks.' : ''}
${report.failureAnalysis.criticalFailures?.length > 0 ? '- 🚨 Critical failures detected in Authentication/Security. Address immediately.' : ''}
${!report.coverage ? '- 📊 Code coverage data not available. Consider enabling coverage reporting.' : ''}

---
*QuizMaster Test Suite v1.0*
    `;
  }
}

// Run if called directly
if (require.main === module) {
  const generator = new TestReportGenerator();
  generator.generateCombinedReport()
    .then(() => console.log('✅ Report generation complete'))
    .catch(error => {
      console.error('❌ Report generation failed:', error);
      process.exit(1);
    });
}

module.exports = TestReportGenerator;