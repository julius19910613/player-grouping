/**
 * Query Cache for SQL Agent
 *
 * Caches query results to reduce latency and API costs.
 * Uses LRU (Least Recently Used) eviction policy.
 */

export interface CachedQuery {
  question: string;
  result: {
    success: boolean;
    sql?: string;
    data?: Array<Record<string, unknown>>;
    explanation?: string;
    error?: string;
    rowCount?: number;
  };
  timestamp: number;
  hits: number;
}

interface CacheConfig {
  maxSize: number; // Maximum number of cached queries
  ttl: number; // Time-to-live in milliseconds
  enabled: boolean;
}

const DEFAULT_CONFIG: CacheConfig = {
  maxSize: 100,
  ttl: 5 * 60 * 1000, // 5 minutes
  enabled: true,
};

/**
 * Simple LRU Cache implementation
 */
export class QueryCache {
  private cache: Map<string, CachedQuery>;
  private config: CacheConfig;
  private stats: {
    hits: number;
    misses: number;
    evictions: number;
  };

  constructor(config: Partial<CacheConfig> = {}) {
    this.cache = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.stats = { hits: 0, misses: 0, evictions: 0 };

    // Start cleanup interval
    if (this.config.enabled) {
      this.startCleanupInterval();
    }
  }

  /**
   * Generate cache key from question
   */
  private generateKey(question: string): string {
    // Normalize the question: lowercase, trim, remove extra whitespace
    return question.toLowerCase().trim().replace(/\s+/g, ' ');
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(entry: CachedQuery): boolean {
    const now = Date.now();
    return now - entry.timestamp > this.config.ttl;
  }

  /**
   * Evict oldest entries when cache is full
   */
  private evictOldest(): void {
    // Find the oldest entry
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Clean up expired entries periodically
   */
  private startCleanupInterval(): void {
    // Clean up every minute
    setInterval(() => {
      this.cleanupExpired();
    }, 60 * 1000);
  }

  /**
   * Clean up expired entries
   */
  public cleanupExpired(): void {
    let cleaned = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[QueryCache] Cleaned up ${cleaned} expired entries`);
    }
  }

  /**
   * Get a cached query result
   */
  public get(question: string): CachedQuery | null {
    if (!this.config.enabled) {
      return null;
    }

    const key = this.generateKey(question);
    const entry = this.cache.get(key);

    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update hit count and timestamp
    entry.hits++;
    entry.timestamp = Date.now();
    this.stats.hits++;

    console.log(`[QueryCache] Cache HIT: "${question.substring(0, 30)}..."`);
    return entry;
  }

  /**
   * Store a query result in cache
   */
  public set(question: string, result: CachedQuery['result']): void {
    if (!this.config.enabled) {
      return;
    }

    // Check if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const key = this.generateKey(question);
    const entry: CachedQuery = {
      question,
      result,
      timestamp: Date.now(),
      hits: 0,
    };

    this.cache.set(key, entry);
    console.log(`[QueryCache] Cached: "${question.substring(0, 30)}..."`);
  }

  /**
   * Clear all cache entries
   */
  public clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, evictions: 0 };
    console.log('[QueryCache] Cache cleared');
  }

  /**
   * Get cache statistics
   */
  public getStats() {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (this.stats.hits / totalRequests) * 100 : 0;

    return {
      ...this.stats,
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: Math.round(hitRate * 100) / 100,
      totalRequests,
    };
  }

  /**
   * Log cache statistics
   */
  public logStats(): void {
    const stats = this.getStats();
    console.log('[QueryCache] Statistics:');
    console.log(`  Size: ${stats.size}/${stats.maxSize}`);
    console.log(`  Total requests: ${stats.totalRequests}`);
    console.log(`  Hits: ${stats.hits} (${stats.hitRate}%)`);
    console.log(`  Misses: ${stats.misses}`);
    console.log(`  Evictions: ${stats.evictions}`);
  }
}

/**
 * Global cache instance
 */
let globalCache: QueryCache | null = null;

/**
 * Get or create global cache instance
 */
export const getQueryCache = (config?: Partial<CacheConfig>): QueryCache => {
  if (!globalCache) {
    globalCache = new QueryCache(config);
  }
  return globalCache;
};

/**
 * Reset global cache instance (useful for testing)
 */
export const resetQueryCache = (): void => {
  globalCache = null;
};
