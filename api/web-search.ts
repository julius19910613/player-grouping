import type { VercelRequest, VercelResponse } from '@vercel/node';
import { LRUCache } from 'lru-cache';

// Vercel Function timeout configuration
export const config = {
  maxDuration: 10,
};

// Rate limiting configuration
const rateLimit = new LRUCache<string, number>({
  max: 500,
  ttl: 60000, // 1 minute
});

// Search cache
interface SearchResult {
  query: string;
  count: number;
  results: Array<{
    title: string;
    url: string;
    description: string;
    published: string | null;
  }>;
  timestamp: string;
}

const searchCache = new LRUCache<string, SearchResult>({
  max: 1000,
  ttl: 3600000, // 1 hour
});

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://player-grouping.vercel.app', 'https://julius19910613.github.io']
    : ['http://localhost:5173', 'http://localhost:3000'];

  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // Only allow GET or POST requests
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: '只支持 GET 和 POST 请求'
    });
  }

  // Rate limiting
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown') as string;
  const count = rateLimit.get(ip) || 0;
  
  if (count >= 10) {
    return res.status(429).json({
      error: 'Too many requests',
      message: '您的请求过于频繁，请 1 分钟后再试',
      retryAfter: 60
    });
  }
  
  rateLimit.set(ip, count + 1);

  // Get query parameters
  const query = req.method === 'GET' 
    ? req.query.q as string
    : req.body.query as string;
  
  const count = req.method === 'GET'
    ? parseInt(req.query.count as string) || 5
    : req.body.count || 5;

  if (!query) {
    return res.status(400).json({
      error: 'Invalid request',
      message: '需要提供搜索关键词 (query parameter "q")'
    });
  }

  // Check cache first
  const cacheKey = `${query}:${count}`;
  const cachedResult = searchCache.get(cacheKey);
  
  if (cachedResult) {
    return res.status(200).json({
      success: true,
      cached: true,
      ...cachedResult
    });
  }

  // Get Brave Search API key
  const apiKey = process.env.BRAVE_SEARCH_API_KEY;
  if (!apiKey) {
    console.error('BRAVE_SEARCH_API_KEY not configured');
    return res.status(500).json({
      error: 'Internal server error',
      message: '服务配置错误'
    });
  }

  try {
    // Call Brave Search API
    const searchUrl = new URL('https://api.search.brave.com/res/v1/web/search');
    searchUrl.searchParams.set('q', query);
    searchUrl.searchParams.set('count', count.toString());
    searchUrl.searchParams.set('search_lang', 'zh-hans'); // Chinese
    searchUrl.searchParams.set('country', 'cn'); // China

    const response = await fetch(searchUrl.toString(), {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Accept-Encoding': 'gzip',
        'X-Subscription-Token': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Brave Search API error: ${response.status}`);
    }

    const data = await response.json();

    // Format results
    const results: SearchResult = {
      query,
      count: data.web?.results?.length || 0,
      results: (data.web?.results || []).map((r: { title: string; url: string; description: string; published?: string }) => ({
        title: r.title,
        url: r.url,
        description: r.description,
        published: r.published || null
      })),
      timestamp: new Date().toISOString()
    };

    // Cache the result
    searchCache.set(cacheKey, results);

    return res.status(200).json({
      success: true,
      cached: false,
      ...results
    });

  } catch (error: unknown) {
    console.error('Web Search API error:', error);

    // Handle API errors
    if (error instanceof Error && error.message.includes('401')) {
      return res.status(500).json({
        error: 'API authentication failed',
        message: '搜索服务配置错误'
      });
    }

    if (error.message.includes('429')) {
      return res.status(429).json({
        error: 'Rate limit exceeded',
        message: '搜索频率超限，请稍后重试'
      });
    }

    // Generic error
    return res.status(500).json({
      error: 'Search failed',
      message: '搜索服务暂时不可用，请稍后重试'
    });
  }
}
