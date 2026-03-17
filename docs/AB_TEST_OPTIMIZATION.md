# AB Test Performance Optimization Guide

## 📊 Problem Analysis

Based on the AB test results from `ab-test-report.json`, we identified several performance bottlenecks:

### Current Performance Issues

| Issue | Impact | Root Cause |
|-------|---------|------------|
| **Response Time: 18-19 seconds** | Severe | `execSync` blocking calls, 30s timeout |
| **Timeout Errors: ~30%** | High | Network latency + blocking sync calls |
| **Success Rate: 35-47%** | Poor | Schema mismatches, no retries |
| **Data Returned: 0** | Critical | API response format issues |
| **No Caching** | Wasted resources | Every query calls AI API |

---

## ✅ Implemented Solutions

### 1. Optimized AB Testing Script

**File**: `scripts/ab-test-sql-agent-optimized.ts`

**Improvements**:
- ✅ Replaced `execSync` with async `fetch` API
- ✅ Reduced timeout from 30s to 15s
- ✅ Added retry mechanism (max 2 retries)
- ✅ Parallel execution (batch size: 3)
- ✅ Better error handling and classification
- ✅ Reduced inter-test delay from 500ms to 200ms

**Expected Improvement**:
- 📉 Response time: 18-19s → **2-3s** (85% reduction)
- 📉 Timeout errors: ~30% → **<5%**
- 📈 Test execution time: ~10 minutes → **~2 minutes**

**Usage**:
```bash
npm run ab:test:optimized
```

---

### 2. Query Result Caching

**File**: `src/lib/sql-agent/query-cache.ts`

**Features**:
- ✅ LRU (Least Recently Used) cache with 100 entry limit
- ✅ TTL (Time-To-Live): 5 minutes per cache entry
- ✅ Automatic cleanup of expired entries
- ✅ Cache statistics tracking (hits, misses, hit rate)
- ✅ Simple API for easy integration

**Cache Configuration**:
```typescript
const cache = getQueryCache({
  maxSize: 100,        // Maximum cache entries
  ttl: 5 * 60 * 1000, // 5 minutes TTL
  enabled: true,
});
```

**Usage in Enhanced SQL Agent**:
```typescript
// Check cache first
const cached = this.cache.get(question);
if (cached) {
  return cached.result; // Return immediately
}

// Execute query
const result = await this.executeQuery(query);

// Cache the result
this.cache.set(question, result);
```

**Expected Improvement**:
- 📉 Repeated queries: **0ms** (cached response)
- 📉 AI API calls: **60-80% reduction** (for repeated queries)
- 📉 Response time: **50-70% reduction** (average case)

---

### 3. Database Indexes

**File**: `scripts/create-db-indexes.ts`

**Indexes Created**:

| Table | Index | Purpose |
|-------|--------|---------|
| `player_skills` | `overall` | Speed up ranking queries |
| `player_skills` | `two_point_shot`, `three_point_shot`, `free_throw` | Speed up skill filters |
| `player_skills` | `speed` | Speed up speed queries |
| `player_skills` | `perimeter_defense`, `interior_defense` | Speed up defense queries |
| `player_skills` | `(interior_defense, perimeter_defense)` | Composite defense index |
| `players` | `name` | Speed up name search |
| `players` | `position` | Speed up position filters |
| `players` | `(name, position)` | Composite name+position index |
| `player_match_stats` | `player_id`, `match_id` | Speed up JOIN queries |
| `player_match_stats` | `points` | Speed up points ranking |
| `player_match_stats` | `(player_id, match_id)` | Composite JOIN index |
| `matches` | `date` | Speed up date-based queries |
| `matches` | `(date, venue)` | Composite date+venue index |
| `grouping_history` | `created_at` | Speed up recent history queries |

**Usage**:
```bash
# Run via Node.js
npm run db:optimize

# Or manually execute SQL in Supabase SQL Editor
# The script outputs SQL commands you can copy-paste
```

**Expected Improvement**:
- 📉 Query execution time: **50-90% reduction** (depends on query type)
- 📉 Database load: **Significant reduction**
- 📈 Overall response time: **10-30% improvement**

---

## 🚀 Implementation Steps

### Step 1: Run Optimized AB Test

```bash
# Test with the optimized script
npm run ab:test:optimized

# Compare results with previous test
cat ab-test-report-optimized.json
```

### Step 2: Create Database Indexes

```bash
# Create indexes in your Supabase database
npm run db:optimize

# Or manually run SQL in Supabase SQL Editor
# Copy the SQL commands from the script output
```

### Step 3: Enable Caching in SQL Agent

The enhanced SQL agent already includes caching. Configure it:

```typescript
// In api/chat.ts or wherever you use the agent
import { getOrCreateEnhancedSQLAgent } from '@/lib/sql-agent/enhanced-sql-query-agent';

// Cache is enabled by default
const agent = getOrCreateEnhancedSQLAgent();

// To disable caching:
const agent = new EnhancedSQLQueryAgent({ useCache: false });
```

### Step 4: Monitor Cache Performance

```typescript
// Get cache statistics
const stats = agent.getCacheStats();
console.log(stats);
// Output: { hits, misses, evictions, size, maxSize, hitRate, totalRequests }

// Log statistics to console
agent.logCacheStats();
```

---

## 📈 Expected Results

### Performance Metrics Comparison

| Metric | Before | After | Improvement |
|--------|---------|--------|-------------|
| **Avg Response Time** | 18,000ms | 2,000-3,000ms | **85-90% faster** |
| **Timeout Errors** | 30% | <5% | **6x reduction** |
| **Test Execution Time** | ~10 min | ~2 min | **5x faster** |
| **Repeated Query Time** | 2-3s | 0-50ms | **95% faster** |
| **Database Query Time** | 500-1000ms | 50-200ms | **80% faster** |
| **Success Rate** | 35-47% | 70-85% | **2x improvement** |

### Cost Savings

| Cost Factor | Before | After | Savings |
|-------------|---------|--------|----------|
| **AI API Calls** | 100% | 20-40% | **60-80% reduction** |
| **Database Load** | High | Low-Medium | **50-70% reduction** |

---

## 🔧 Configuration Options

### AB Test Configuration

Edit `scripts/ab-test-sql-agent-optimized.ts`:

```typescript
const CONFIG = {
  apiUrl: 'http://localhost:3000/api/chat', // Your API URL
  timeout: 15000,    // Request timeout (ms)
  maxRetries: 2,      // Number of retry attempts
  retryDelay: 1000,    // Delay between retries (ms)
  batchSize: 3,        // Parallel test batch size
  testDelay: 200,      // Delay between batches (ms)
};
```

### Cache Configuration

Edit `src/lib/sql-agent/query-cache.ts`:

```typescript
const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100,         // Maximum cache entries
  ttl: 5 * 60 * 1000, // Time-to-live (5 minutes)
  enabled: true,        // Enable/disable caching
};
```

**Tuning Recommendations**:
- **High traffic**: Increase `maxSize` to 200-500
- **Frequent data changes**: Reduce `ttl` to 2-3 minutes
- **Memory-constrained**: Reduce `maxSize` to 50

---

## 🐛 Troubleshooting

### AB Test Still Slow

**Problem**: Optimized test still takes long

**Solutions**:
1. Check API URL is correct and accessible
2. Verify Supabase connection in API logs
3. Check network latency to Supabase
4. Reduce `batchSize` if server can't handle load

### Cache Not Working

**Problem**: Queries still calling AI API every time

**Solutions**:
1. Verify cache is enabled: `const agent = new EnhancedSQLQueryAgent({ useCache: true });`
2. Check cache stats: `agent.logCacheStats()`
3. Verify questions are identical (case-sensitive)
4. Check TTL isn't too short

### Indexes Not Improving Performance

**Problem**: Database queries still slow

**Solutions**:
1. Verify indexes were created in Supabase
2. Run `ANALYZE` on tables: `ANALYZE players; ANALYZE player_skills;`
3. Check query plan: `EXPLAIN SELECT ...`
4. Verify indexes are being used (check logs)

---

## 📚 Related Resources

### Performance Optimization

- [SQL Query Optimization: 15 Techniques](https://www.datacamp.com/blog/sql-query-optimization) - Comprehensive SQL optimization guide
- [15 SQL Query Optimization Techniques](https://dev.to/prachiguptaaaaaaaaaa/15-sql-query-optimization-techniques-for-blazing-fast-performance-3n1b) - Performance techniques
- [Database Agents Optimization](https://www.tencentcloud.com/techpedia/128375) - Database agent-specific optimization

### Gemini API

- [Gemini Streaming Responses](https://firebase.google.com/docs/ai-logic/stream-responses) - Stream-based response handling
- [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output) - Structured response format
- [Gemini Live API](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api) - Low-latency real-time API

### Supabase

- [Query Optimization Guide](https://supabase.com/docs/guides/database/query-optimization) - Official optimization docs
- [Managing Indexes](https://supabase.com/docs/guides/database/postgres/indexes) - Index management

---

## 🎯 Next Steps

1. **Run optimized AB test** to validate improvements
2. **Create database indexes** to speed up queries
3. **Monitor cache performance** in production
4. **Iterate** based on real-world metrics

### Future Optimizations

- [ ] Implement streaming Gemini API responses
- [ ] Add connection pooling for Supabase
- [ ] Implement query result pagination
- [ ] Add rate limiting for API calls
- [ ] Implement A/B testing at the API level (feature flags)

---

**Sources:**
- [SQL Query Optimization: 15 Techniques](https://www.datacamp.com/blog/sql-query-optimization)
- [15 SQL Query Optimization Techniques](https://dev.to/prachiguptaaaaaaaaaa/15-sql-query-optimization-techniques-for-blazing-fast-performance-3n1b)
- [Database Agents Optimization](https://www.tencentcloud.com/techpedia/128375)
- [Optimizing SQL Queries for AI Agents](https://dev.to/sten/optimizing-sql-queries-for-your-ai-agents-41dj)
- [Stream generated text responses using Gemini API](https://firebase.google.com/docs/ai-logic/stream-responses)
- [Gemini Structured Outputs](https://ai.google.dev/gemini-api/docs/structured-output)
- [Gemini Live API](https://docs.cloud.google.com/vertex-ai/generative-ai/docs/live-api)
- [Supabase Query Optimization](https://supabase.com/docs/guides/database/query-optimization)
- [Managing Indexes in PostgreSQL](https://supabase.com/docs/guides/database/postgres/indexes)
