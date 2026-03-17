/**
 * Optimized SQL Query Agent A/B Testing Suite
 *
 * Improvements:
 * - Uses async fetch instead of execSync (non-blocking)
 * - Better error handling and timeout management
 * - Parallel execution for faster testing
 * - Reduced latency and improved reliability
 *
 * IMPORTANT: This script loads environment variables from .env file
 */

import 'dotenv/config'; // Load environment variables from .env

import { writeFileSync } from 'fs';
import { resolve } from 'path';

// Log loaded env vars for debugging
console.log('[Config] Environment Variables Loaded:');
console.log('  GEMINI_API_KEY:', process.env.GEMINI_API_KEY ? 'SET (hidden)' : 'NOT SET');
console.log('  SUPABASE_URL:', process.env.SUPABASE_URL ? 'SET' : 'NOT SET');
console.log('  SUPABASE_ANON_KEY:', process.env.SUPABASE_ANON_KEY ? 'SET (hidden)' : 'NOT SET');
console.log('');

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
  errorType?: 'query_error' | 'parse_error' | 'network_error' | 'timeout_error';
  hasExpectedColumns: boolean;
  hasExpectedFilters: boolean;
  hasExpectedName: boolean;
  returnedData: boolean;
  rowCount?: number;
}

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3000/api/chat',
  timeout: 25000, // 25 seconds timeout (increased to handle Gemini API latency)
  maxRetries: 2,
  retryDelay: 1000, // 1 second between retries
  batchSize: 2, // Reduced from 3 to avoid hitting Gemini rate limits (5-15 RPM free tier)
  testDelay: 1000, // Increased from 200ms to 1s to respect Gemini API rate limits
  agentCooldown: 5000, // 5 second cooldown between legacy and enhanced tests
};

/**
 * Simple sleep function for delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Fetch with timeout and retry logic
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Run a single test case with retry logic
 */
async function runTestWithRetry(
  testCase: typeof TEST_CASES[number],
  agentVersion: 'legacy' | 'enhanced'
): Promise<TestResult> {
  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= CONFIG.maxRetries; attempt++) {
    try {
      // Use POST request with proper headers
      const response = await fetchWithTimeout(
        CONFIG.apiUrl,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: testCase.question,
            enableFunctionCalling: true,
            stream: false,
          }),
        },
        CONFIG.timeout
      );

      const responseTime = Date.now() - startTime;

      // Check for timeout
      if (!response.ok && response.status === 408) {
        throw new Error('Request timeout');
      }

      // Parse response
      let parsed: any;
      try {
        const text = await response.text();
        parsed = JSON.parse(text || '{}');
      } catch {
        return {
          testCase,
          agentVersion,
          success: false,
          responseTime,
          errorType: 'parse_error',
          error: 'Failed to parse JSON response',
          hasExpectedColumns: false,
          hasExpectedFilters: false,
          hasExpectedName: false,
          returnedData: false,
        };
      }

      // Check for errors
      if (response.status >= 400) {
        throw new Error(`HTTP ${response.status}: ${parsed.error || 'Unknown error'}`);
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
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      const responseTime = Date.now() - startTime;

      // Check if it's a timeout error
      const isTimeout =
        error instanceof Error && (
          error.name === 'AbortError' ||
          error.message.includes('timeout') ||
          error.message.includes('ETIMEDOUT')
        );

      // If it's the last attempt, return error
      if (attempt === CONFIG.maxRetries) {
        return {
          testCase,
          agentVersion,
          success: false,
          responseTime,
          error: lastError?.message || 'Unknown error',
          errorType: isTimeout ? 'timeout_error' : 'network_error',
          hasExpectedColumns: false,
          hasExpectedFilters: false,
          hasExpectedName: false,
          returnedData: false,
        };
      }

      // Wait before retry
      await sleep(CONFIG.retryDelay);
    }
  }

  // This should never be reached, but TypeScript requires it
  return {
    testCase,
    agentVersion,
    success: false,
    responseTime: Date.now() - startTime,
    error: 'Max retries exceeded',
    errorType: 'network_error',
    hasExpectedColumns: false,
    hasExpectedFilters: false,
    hasExpectedName: false,
    returnedData: false,
  };
}

/**
 * Log result without complex ANSI codes
 */
function logResult(result: TestResult) {
  const { testCase, agentVersion, success, responseTime, error, hasExpectedColumns, hasExpectedFilters, hasExpectedName, returnedData, rowCount } = result;

  if (!success) {
    console.log(`[FAILED] ${agentVersion.padEnd(10)} ${testCase.category.padEnd(15)}] ${testCase.question.substring(0, 30)}...`);
    if (error) {
      console.log(`  [ERROR] ${result.errorType || 'unknown'}: ${error}`);
    }
    return;
  }

  const icon = hasExpectedColumns && hasExpectedFilters && hasExpectedName && returnedData
    ? '[GOOD]' : '[WARN]';

  console.log(`  ${icon} ${agentVersion.padEnd(10)} ${testCase.category.padEnd(15)}] ${testCase.question.substring(0, 30)}...` +
    ` (${responseTime}ms${rowCount ? `, ${rowCount} rows` : ''})`
  );
}

/**
 * Process tests in batches for parallel execution
 */
async function processTestsInBatches<T>(
  items: T[],
  processor: (item: T) => Promise<any>,
  batchSize: number,
  delayMs: number
): Promise<any[]> {
  const results: any[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    const batchResults = await Promise.all(batch.map(processor));
    results.push(...batchResults);

    // Add delay between batches
    if (i + batchSize < items.length) {
      await sleep(delayMs);
    }
  }
  return results;
}

/**
 * Run A/B test with optimized execution
 */
async function runABTest() {
  console.log('============================================================');
  console.log('SQL Query Agent A/B Testing (Optimized)');
  console.log('============================================================');
  console.log(`[Config] API URL: ${CONFIG.apiUrl}`);
  console.log(`[Config] Timeout: ${CONFIG.timeout}ms`);
  console.log(`[Config] Batch size: ${CONFIG.batchSize}`);
  console.log(`[Config] Max retries: ${CONFIG.maxRetries}`);
  console.log(`[Config] Delay between batches: ${CONFIG.testDelay}ms`);
  console.log(`[Config] Agent cooldown: ${CONFIG.agentCooldown}ms`);
  console.log('============================================================');

  const results: TestResult[] = [];

  // Test legacy version (optimized with batching)
  console.log('[Legacy] Testing Legacy Agent...');
  const legacyResults = await processTestsInBatches(
    TEST_CASES,
    (testCase) => runTestWithRetry(testCase, 'legacy'),
    CONFIG.batchSize,
    CONFIG.testDelay
  );
  results.push(...legacyResults);

  // Log results as they come in
  legacyResults.forEach(logResult);

  // Cooldown before testing enhanced version to avoid hitting Gemini rate limits
  console.log('[Cooldown] Waiting 5 seconds before testing Enhanced Agent to respect rate limits...');
  await sleep(CONFIG.agentCooldown);

  // Test enhanced version (optimized with batching)
  console.log('[Enhanced] Testing Enhanced Agent...');
  const enhancedResults = await processTestsInBatches(
    TEST_CASES,
    (testCase) => runTestWithRetry(testCase, 'enhanced'),
    CONFIG.batchSize,
    CONFIG.testDelay
  );
  results.push(...enhancedResults);

  // Log results as they come in
  enhancedResults.forEach(logResult);

  // Generate report
  generateReport(results);
}

/**
 * Generate A/B test report
 */
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

  // Count errors by type
  const legacyErrorCounts = {
    network_error: legacyResults.filter(r => r.errorType === 'network_error').length,
    timeout_error: legacyResults.filter(r => r.errorType === 'timeout_error').length,
    parse_error: legacyResults.filter(r => r.errorType === 'parse_error').length,
  };

  const enhancedErrorCounts = {
    network_error: enhancedResults.filter(r => r.errorType === 'network_error').length,
    timeout_error: enhancedResults.filter(r => r.errorType === 'timeout_error').length,
    parse_error: enhancedResults.filter(r => r.errorType === 'parse_error').length,
  };

  // Output summary
  console.log('============================================================');
  console.log('A/B Test Summary Report');
  console.log('============================================================');

  console.log('[Metrics] Success Rate:');
  console.log(`  Legacy: ${legacySuccess}/${TEST_CASES.length} (${Math.round(legacySuccess / TEST_CASES.length * 100)}%)`);
  console.log(`  Enhanced: ${enhancedSuccess}/${TEST_CASES.length} (${Math.round(enhancedSuccess / TEST_CASES.length * 100)}%)`);
  console.log(`  Improvement: ${enhancedSuccess - legacySuccess > 0 ? '+' : ''}${enhancedSuccess - legacySuccess} queries`);

  console.log('[Metrics] Average Response Time:');
  console.log(`  Legacy: ${Math.round(legacyAvgTime)}ms`);
  console.log(`  Enhanced: ${Math.round(enhancedAvgTime)}ms`);
  const timeImprovement = legacyAvgTime - enhancedAvgTime;
  console.log(`  Improvement: ${timeImprovement > 0 ? '-' : ''}${timeImprovement}ms (${Math.round((timeImprovement / legacyAvgTime) * 100)}%)`);

  console.log('[Metrics] Data Returned:');
  console.log(`  Legacy: ${legacyTotalResults}/${TEST_CASES.length} queries`);
  console.log(`  Enhanced: ${enhancedTotalResults}/${TEST_CASES.length} queries`);

  console.log('[Metrics] Column Accuracy:');
  console.log(`  Legacy: ${legacyHasExpectedColumns}/${legacyResults.length} (${Math.round(legacyHasExpectedColumns / legacyResults.length * 100)}%)`);
  console.log(`  Enhanced: ${enhancedHasExpectedColumns}/${enhancedResults.length} (${Math.round(enhancedHasExpectedColumns / enhancedResults.length * 100)}%)`);

  console.log('[Metrics] Error Analysis:');
  console.log('  Legacy Errors:');
  console.log(`    - Network: ${legacyErrorCounts.network_error}`);
  console.log(`    - Timeout: ${legacyErrorCounts.timeout_error}`);
  console.log(`    - Parse: ${legacyErrorCounts.parse_error}`);
  console.log('  Enhanced Errors:');
  console.log(`    - Network: ${enhancedErrorCounts.network_error}`);
  console.log(`    - Timeout: ${enhancedErrorCounts.timeout_error}`);
  console.log(`    - Parse: ${enhancedErrorCounts.parse_error}`);

  console.log('[Metrics] Category Analysis:');

  // Analyze by category
  const categories = ['simple-ranking', 'range-query', 'position-query', 'fuzzy-search', 'join-query', 'comparison', 'invalid-query'];
  for (const category of categories) {
    const categoryResults = results.filter(r => r.testCase.category === category);
    const legacyCatResults = categoryResults.filter(r => r.agentVersion === 'legacy');
    const enhancedCatResults = categoryResults.filter(r => r.agentVersion === 'enhanced');

    const legacyCatSuccess = legacyCatResults.filter(r => r.success).length;
    const enhancedCatSuccess = enhancedCatResults.filter(r => r.success).length;

    console.log(`[${category}]`);
    console.log(`  Legacy: ${legacyCatSuccess}/${categoryResults.length} (${Math.round(legacyCatSuccess / categoryResults.length * 100)}%)`);
    console.log(`  Enhanced: ${enhancedCatSuccess}/${categoryResults.length} (${Math.round(enhancedCatSuccess / categoryResults.length * 100)}%)`);

    if (enhancedCatSuccess > legacyCatSuccess) {
      console.log(`  [SUCCESS] Enhanced better in this category!`);
    }
  }

  // Save detailed results
  const report = {
    timestamp: new Date().toISOString(),
    config: {
      apiUrl: CONFIG.apiUrl,
      timeout: CONFIG.timeout,
      maxRetries: CONFIG.maxRetries,
      batchSize: CONFIG.batchSize,
      testDelay: CONFIG.testDelay,
      agentCooldown: CONFIG.agentCooldown,
    },
    summary: {
      legacy: {
        success: legacySuccess,
        total: TEST_CASES.length,
        successRate: Math.round(legacySuccess / TEST_CASES.length * 100),
        avgResponseTime: Math.round(legacyAvgTime),
        dataReturned: legacyTotalResults,
        columnAccuracy: Math.round(legacyHasExpectedColumns / legacyResults.length * 100),
        errorCounts: legacyErrorCounts,
      },
      enhanced: {
        success: enhancedSuccess,
        total: TEST_CASES.length,
        successRate: Math.round(enhancedSuccess / TEST_CASES.length * 100),
        avgResponseTime: Math.round(enhancedAvgTime),
        dataReturned: enhancedTotalResults,
        columnAccuracy: Math.round(enhancedHasExpectedColumns / enhancedResults.length * 100),
        errorCounts: enhancedErrorCounts,
      },
      improvement: {
        successRate: enhancedSuccess - legacySuccess,
        timeImprovement: Math.round(timeImprovement * 100),
        dataImprovement: enhancedTotalResults - legacyTotalResults,
        columnAccuracy: enhancedHasExpectedColumns - legacyHasExpectedColumns,
      },
    },
    details: results,
  };

  const reportPath = resolve(process.cwd(), 'ab-test-report-optimized.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`[Report] Detailed report saved to: ${reportPath}`);
  console.log('============================================================');
}

// Run the test
runABTest().catch(error => {
  console.error('[ERROR] Test failed:', error);
  process.exit(1);
});
