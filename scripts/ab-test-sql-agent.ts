/**
 * SQL Query Agent A/B Testing Suite
 *
 * This script runs comparison tests between legacy and enhanced SQL agents
 * to measure performance and accuracy improvements.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

// Test cases covering various query types
const TEST_CASES = [
  // Simple ranking queries
  {
    category: 'simple-ranking',
    question: '谁是投篮最厉害的球员？',
    expectedColumns: ['two_point_shot'],
    expectsName: true,
    expectsJoin: true,
  },
  {
    category: 'simple-ranking',
    question: '综合评分最高的3个球员',
    expectedColumns: ['overall'],
    expectsName: true,
    expectsJoin: true,
  },
  {
    category: 'simple-ranking',
    question: '速度最快的5个球员',
    expectedColumns: ['speed'],
    expectsName: true,
    expectsJoin: true,
  },

  // Range queries
  {
    category: 'range-query',
    question: '综合评分在80-90之间的球员',
    expectedColumns: ['overall'],
    expectsName: true,
    expectsFilters: true,
  },
  {
    category: 'range-query',
    question: '三分球能力大于85的球员',
    expectedColumns: ['three_point_shot'],
    expectsName: true,
    expectsFilters: true,
  },
  {
    category: 'range-query',
    question: '二分球和罚球都高于80的球员',
    expectedColumns: ['two_point_shot', 'free_throw'],
    expectsName: true,
    expectsFilters: true,
  },

  // Position queries
  {
    category: 'position-query',
    question: '所有控卫（PG）',
    expectedColumns: ['position'],
    expectsFilters: true,
    expectsPositionOnly: true,
  },
  {
    category: 'position-query',
    question: '前锋（SF和PF）',
    expectedColumns: ['position'],
    expectsFilters: true,
  },
  {
    category: 'position-query',
    question: '中锋和控卫',
    expectedColumns: ['position'],
    expectsFilters: true,
  },

  // Fuzzy search queries
  {
    category: 'fuzzy-search',
    question: '名字里带"明"的球员',
    expectedColumns: ['name'],
    expectsFilters: true,
  },
  {
    category: 'fuzzy-search',
    question: '搜索姓"张"或"李"的球员',
    expectedColumns: ['name'],
    expectsFilters: true,
  },

  // JOIN queries (match data)
  {
    category: 'join-query',
    question: '张三最近的5场比赛',
    expectedColumns: ['date', 'points', 'rebounds', 'assists'],
    expectsName: true,
    expectsJoin: true,
  },
  {
    category: 'join-query',
    question: '李四最近比赛的得分和助攻',
    expectedColumns: ['points', 'assists'],
    expectsName: true,
    expectsJoin: true,
  },

  // Complex comparison queries
  {
    category: 'comparison',
    question: '比较张三和李四的投篮能力',
    expectedColumns: ['two_point_shot', 'three_point_shot'],
    expectsName: true,
    expectsFilters: true,
    expectsMultiplePlayers: true,
  },
  {
    category: 'comparison',
    question: '控卫中投篮和防守最好的是谁',
    expectedColumns: ['position', 'two_point_shot', 'perimeter_defense'],
    expectsFilters: true,
    expectsName: true,
  },

  // Invalid queries (should fail gracefully)
  {
    category: 'invalid-query',
    question: '查询命中率字段', // field doesn't exist
    expectsFailure: true,
    expectedError: 'Field not found',
  },
  {
    category: 'invalid-query',
    question: '查询平均得分', // need aggregation, not available
    expectsFailure: true,
    expectedError: 'Requires aggregation',
  },
];

interface TestResult {
  testCase: typeof TEST_CASES[number];
  agentVersion: 'legacy' | 'enhanced';
  success: boolean;
  responseTime: number;
  error?: string;
  errorType?: 'query_error' | 'parse_error' | 'network_error';
  hasExpectedColumns: boolean;
  hasExpectedFilters: boolean;
  returnedData: boolean;
  rowCount?: number;
}

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function runTest(
  testCase: typeof TEST_CASES[number],
  agentVersion: 'legacy' | 'enhanced'
): Promise<TestResult> {
  const startTime = Date.now();

  try {
    // Determine API URL
    const apiUrl = process.env.API_URL || 'http://localhost:3000/api/chat';

    // Send request
    const response = execSync(
      `curl -s -X POST "${apiUrl}" \\` +
      `-H "Content-Type: application/json" \\` +
      `-d '${JSON.stringify({
        message: testCase.question,
        enableFunctionCalling: true,
        stream: false,
      })}'`,
      { encoding: 'utf-8', timeout: 30000 }
    );

    const responseTime = Date.now() - startTime;

    // Parse response
    let parsed: any;
    try {
      parsed = JSON.parse(response.stdout || response.stderr || '{}');
    } catch {
      return {
        testCase,
        agentVersion,
        success: false,
        responseTime,
        errorType: 'parse_error',
        error: 'Failed to parse JSON response',
        hasExpectedColumns: false,
        returnedData: false,
      };
    }

    // Check for errors
    if (!parsed.success && !parsed.error && !parsed.message) {
      return {
        testCase,
        agentVersion,
        success: false,
        responseTime,
        errorType: 'query_error',
        error: 'No valid response',
        hasExpectedColumns: false,
        returnedData: false,
      };
    }

    // Validate response
    const hasExpectedColumns = testCase.expectedColumns.every(col =>
      parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0 &&
      col in (parsed.data[0] as Record<string, unknown>)
    );

    const hasExpectedFilters = !testCase.expectsFilters ||
      (parsed.metadata && parsed.metadata.sql && testCase.expectsFilters);

    const hasExpectedName = !testCase.expectsName ||
      (parsed.data && Array.isArray(parsed.data) && parsed.data.some((d: any) => d.name || d.players?.name));

    const returnedData = parsed.data && Array.isArray(parsed.data) && parsed.data.length > 0;

    return {
      testCase,
      agentVersion,
      success: parsed.success || (!parsed.error && parsed.message),
      responseTime,
      hasExpectedColumns,
      hasExpectedFilters,
      hasExpectedName,
      returnedData,
      rowCount: returnedData ? (parsed.data as any[]).length : undefined,
    };
  } catch (error: {
    const responseTime = Date.now() - startTime;

    return {
      testCase,
      agentVersion,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
      errorType: 'network_error',
      hasExpectedColumns: false,
      hasExpectedFilters: false,
      returnedData: false,
    };
  }
}

async function runABTest() {
  console.log('\n' + '='.repeat(60));
  console.log('SQL Query Agent A/B Testing');
  console.log('='.repeat(60) + '\n');

  const results: TestResult[] = [];

  // Test legacy version
  console.log('\n[Legacy] Testing Legacy Agent...');
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase, 'legacy');
    results.push(result);
    logResult(result);
    await sleep(500); // Rate limiting
  }

  // Test enhanced version
  console.log('\n[Enhanced] Testing Enhanced Agent...');
  for (const testCase of TEST_CASES) {
    const result = await runTest(testCase, 'enhanced');
    results.push(result);
    logResult(result);
    await sleep(500); // Rate limiting
  }

  // Generate report
  generateReport(results);
}

function logResult(result: TestResult) {
  const { testCase, agentVersion, success, responseTime, error, hasExpectedColumns, hasExpectedFilters, hasExpectedName, returnedData, rowCount } = result;

  if (!success) {
    console.log(colors.red + `✗ ${agentVersion.padEnd(10)} [${testCase.category.padEnd(15)}] ${testCase.question.substring(0, 30)}...`);
    if (error) {
      console.log(colors.red + `  Error: ${error}`);
    }
    return;
  }

  const icon = hasExpectedColumns && hasExpectedFilters && hasExpectedName && returnedData
    ? '✅' : '⚠️ ';
  const color = icon === '✅' ? colors.green : colors.yellow;

  console.log(
    color +
    `${icon} ${agentVersion.padEnd(10)} [${testCase.category.padEnd(15)}] ` +
    `${testCase.question.substring(0, 30)}...` +
    colors.reset +
    ` (${responseTime}ms${rowCount ? `, ${rowCount} rows` : ''})`
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function generateReport(results: TestResult[]) {
  const legacyResults = results.filter(r => r.agentVersion === 'legacy');
  const enhancedResults = results.filter(r => r.agentVersion === 'enhanced');

  // Calculate statistics
  const legacySuccess = legacyResults.filter(r => r.success).length;
  const enhancedSuccess = enhancedResults.filter(r => r.success).length;
  const legacyTotalResults = legacyResults.filter(r => r.returnedData).length;
  const enhancedTotalResults = enhancedResults.filter(r => r.returnedData).length;

  const legacyAvgTime = legacyResults.reduce((sum, r) => sum + r.responseTime, 0) / legacyResults.length;
  const enhancedAvgTime = enhancedResults.reduce((sum, r) => sum + r.responseTime, 0) / enhancedResults.length;

  const legacyHasExpectedColumns = legacyResults.filter(r => r.hasExpectedColumns).length;
  const enhancedHasExpectedColumns = enhancedResults.filter(r => r.hasExpectedColumns).length;

  // Output summary
  console.log(colors.reset);
  console.log('\n' + '='.repeat(60));
  console.log(colors.cyan + ' A/B Test Summary Report');
  console.log('='.repeat(60) + '\n');

  console.log(colors.magenta + '\n📊 Success Rate:');
  console.log(`  Legacy: ${legacySuccess}/${TEST_CASES.length} (${Math.round(legacySuccess / TEST_CASES.length * 100)}%)`);
  console.log(`  Enhanced: ${enhancedSuccess}/${TEST_CASES.length} (${Math.round(enhancedSuccess / TEST_CASES.length * 100)}%)`);
  console.log(`  Improvement: ${enhancedSuccess - legacySuccess > 0 ? '+' : ''}${enhancedSuccess - legacySuccess} queries`);

  console.log(colors.magenta + '\n⏱️  Average Response Time:');
  console.log(`  Legacy: ${Math.round(legacyAvgTime)}ms`);
  console.log(`  Enhanced: ${Math.round(enhancedAvgTime)}ms`);
  const timeImprovement = legacyAvgTime - enhancedAvgTime;
  console.log(`  Improvement: ${timeImprovement > 0 ? '-' : ''}${timeImprovement}ms (${Math.round((timeImprovement / legacyAvgTime) * 100)}%)`);

  console.log(colors.magenta + '\n📋 Data Returned:');
  console.log(`  Legacy: ${legacyTotalResults}/${TEST_CASES.length} queries`);
  console.log(`  Enhanced: ${enhancedTotalResults}/${TEST_CASES.length} queries`);

  console.log(colors.magenta + '\n🎯 Column Accuracy:');
  console.log(`  Legacy: ${legacyHasExpectedColumns}/${legacyResults.length} (${Math.round(legacyHasExpectedColumns / legacyResults.length * 100)}%)`);
  console.log(`  Enhanced: ${enhancedHasExpectedColumns}/${enhancedResults.length} (${Math.round(enhancedHasExpectedColumns / enhancedResults.length * 100)}%)`);

  console.log(colors.magenta + '\n📑 Category Analysis:');

  // Analyze by category
  const categories = ['simple-ranking', 'range-query', 'position-query', 'fuzzy-search', 'join-query', 'comparison', 'invalid-query'];
  for (const category of categories) {
    const categoryResults = results.filter(r => r.testCase.category === category);
    const legacyCatResults = categoryResults.filter(r => r.agentVersion === 'legacy');
    const enhancedCatResults = categoryResults.filter(r => r.agentVersion === 'enhanced');

    const legacyCatSuccess = legacyCatResults.filter(r => r.success).length;
    const enhancedCatSuccess = enhancedCatResults.filter(r => r.success).length;

    console.log(`\n${category}:`);
    console.log(`  Legacy: ${legacyCatSuccess}/${categoryResults.length} (${Math.round(legacyCatSuccess / categoryResults.length * 100)}%)`);
    console.log(`  Enhanced: ${enhancedCatSuccess}/${categoryResults.length} (${Math.round(enhancedCatSuccess / categoryResults.length * 100)}%)`);

    if (enhancedCatSuccess > legacyCatSuccess) {
      console.log(colors.green + `  ✅ Enhanced better in this category!` + colors.reset);
    }
  }

  // Save detailed results
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      legacy: {
        success: legacySuccess,
        total: TEST_CASES.length,
        successRate: Math.round(legacySuccess / TEST_CASES.length * 100),
        avgResponseTime: Math.round(legacyAvgTime),
        dataReturned: legacyTotalResults,
        columnAccuracy: Math.round(legacyHasExpectedColumns / legacyResults.length * 100),
      },
      enhanced: {
        success: enhancedSuccess,
        total: TEST_CASES.length,
        successRate: Math.round(enhancedSuccess / TEST_CASES.length * 100),
        avgResponseTime: Math.round(enhancedAvgTime),
        dataReturned: enhancedTotalResults,
        columnAccuracy: Math.round(enhancedHasExpectedColumns / enhancedResults.length * 100),
      },
      improvement: {
        successRate: enhancedSuccess - legacySuccess,
        timeImprovement: legacyAvgTime - enhancedAvgTime,
        timeImprovementPercent: Math.round(((legacyAvgTime - enhancedAvgTime) / legacyAvgTime) * 100),
        dataImprovement: enhancedTotalResults - legacyTotalResults,
        columnAccuracyImprovement: enhancedHasExpectedColumns - legacyHasExpectedColumns,
      },
    },
    details: results,
  };

  const reportPath = resolve(process.cwd(), 'ab-test-report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(colors.cyan + `\n📄 Detailed report saved to: ${reportPath}`);
  console.log('='.repeat(60) + colors.reset + '\n');
}

// Run the test
runABTest().catch(error => {
  console.error(colors.red + '\n❌ Test failed:', error);
  process.exit(1);
});
