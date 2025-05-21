const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

// Test categories
const testCategories = [
  {
    name: 'Unit Tests',
    command: 'npm test',
    description: 'Testing individual components'
  },
  {
    name: 'Integration Tests',
    command: 'npm test -- src/tests/integration.test.js',
    description: 'Testing component interactions'
  },
  {
    name: 'Puppeteer Tests',
    command: 'npm run test:puppeteer',
    description: 'Testing browser automation'
  }
];

// Create test report
function createTestReport(results) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: results.length,
      passed: results.filter(r => r.status === 'passed').length,
      failed: results.filter(r => r.status === 'failed').length
    },
    details: results
  };

  // Save report to file
  const reportPath = path.join(__dirname, '../../test-reports');
  if (!fs.existsSync(reportPath)) {
    fs.mkdirSync(reportPath, { recursive: true });
  }

  const fileName = `test-report-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
  fs.writeFileSync(path.join(reportPath, fileName), JSON.stringify(report, null, 2));

  return report;
}

// Print test results
function printResults(report) {
  console.log('\n=== Test Results ===\n');
  
  console.log(`${colors.blue}Summary:${colors.reset}`);
  console.log(`Total Tests: ${report.summary.total}`);
  console.log(`${colors.green}Passed: ${report.summary.passed}${colors.reset}`);
  console.log(`${colors.red}Failed: ${report.summary.failed}${colors.reset}\n`);

  console.log(`${colors.blue}Detailed Results:${colors.reset}`);
  report.details.forEach(result => {
    const statusColor = result.status === 'passed' ? colors.green : colors.red;
    console.log(`\n${result.name}:`);
    console.log(`Status: ${statusColor}${result.status.toUpperCase()}${colors.reset}`);
    console.log(`Description: ${result.description}`);
    if (result.error) {
      console.log(`${colors.red}Error: ${result.error}${colors.reset}`);
    }
  });
}

// Run all tests
async function runTests() {
  console.log(`${colors.blue}Starting test suite...${colors.reset}\n`);
  
  const results = [];

  for (const category of testCategories) {
    console.log(`${colors.blue}Running ${category.name}...${colors.reset}`);
    console.log(`Description: ${category.description}\n`);

    try {
      execSync(category.command, { stdio: 'inherit' });
      results.push({
        name: category.name,
        status: 'passed',
        description: category.description
      });
    } catch (error) {
      results.push({
        name: category.name,
        status: 'failed',
        description: category.description,
        error: error.message
      });
    }
  }

  const report = createTestReport(results);
  printResults(report);

  // Exit with appropriate code
  process.exit(report.summary.failed > 0 ? 1 : 0);
}

// Run the tests
runTests().catch(error => {
  console.error(`${colors.red}Test runner failed:${colors.reset}`, error);
  process.exit(1);
}); 