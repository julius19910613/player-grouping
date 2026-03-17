/**
 * Chat API Handler with A/B Testing for SQL Agent
 *
 * Supports comparing legacy SQL Query Agent vs enhanced version:
 * - SSE streaming responses
 * - Message history format
 * - Performance metrics collection
 * - Query success rate tracking
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SQLQueryAgent } from '../src/lib/sql-agent/sql-query-agent.js';
import { EnhancedSQLQueryAgent, getOrCreateEnhancedSQLAgent } from '../src/lib/sql-agent/enhanced-sql-query-agent.js';
import type { QueryResult } from '../src/lib/sql-agent/enhanced-sql-query-agent.js';

// Config
export const config = {
  maxDuration: 10,
};

// Initialize
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

// A/B Testing Configuration
const USE_ENHANCED_AGENT = process.env.USE_ENHANCED_SQL_AGENT === 'true';

// Performance Metrics Collection
interface QueryMetrics {
  agentVersion: 'legacy' | 'enhanced';
  question: string;
  success: boolean;
  responseTime: number;
  errorType?: string;
  rowCount?: number;
}

// Metrics storage (in-memory for serverless)
const metrics: QueryMetrics[] = [];

// Database intent detection
function detectDBIntent(message: string): boolean {
  const keywords = [
    '球员', '水平', '能力', '位置', '技能',
    '最厉害', '最强', '排名', '比较', '统计',
    '得分', '防守', '传球', '投篮', '篮板',
    '骚当', '谁', '多少', '几个'
  ];
  return keywords.some(kw => message.includes(kw));
}

// Get last user message from messages array
function getLastUserMessage(messages: Array<{ role: string; content: string }>): string | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'user') {
      return messages[i].content;
    }
  }
  return null;
}

// Log metrics to console (can be replaced with proper monitoring)
function logMetrics(metrics: QueryMetrics) {
  const log = {
    agentVersion: metrics.agentVersion,
    success: metrics.success,
    responseTime: `${metrics.responseTime}ms`,
    errorType: metrics.errorType,
    rowCount: metrics.rowCount,
  };
  console.log('[AB Test Metrics]', JSON.stringify(log));
}

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  const startTime = Date.now();

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages, enableFunctionCalling, stream } = req.body;

  // Support both formats:
  // 1. { messages: [...] } - new format from frontend
  // 2. { message: "..." } - old format for backward compatibility
  const userMessage = messages ? getLastUserMessage(messages) : req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Check if database query intent
    const needsDBQuery = enableFunctionCalling !== false && detectDBIntent(userMessage);

    // Log A/B testing configuration
    console.log('[A/B Test] Using Enhanced Agent:', USE_ENHANCED_AGENT);
    console.log('[A/B Test] Database Query Intent:', needsDBQuery);

    let queryResult: QueryResult;
    let responseText: string;
    let metadata: any = {};

    if (needsDBQuery) {
      if (USE_ENHANCED_AGENT) {
        // Use Enhanced SQL Agent
        const enhancedAgent = getOrCreateEnhancedSQLAgent();
        await enhancedAgent.initialize();
        queryResult = await enhancedAgent.query(userMessage);
      } else {
        // Use Legacy SQL Agent
        const legacyAgent = new SQLQueryAgent();
        await legacyAgent.initialize();
        queryResult = await legacyAgent.query(userMessage);
      }

      if (!queryResult.success) {
        // Fall back to normal chat
        const model = genAI.getGenerativeModel({ model: 'gemini-3-flash-preview' });
        const result = await model.generateContent(userMessage);
        responseText = result.response.text();

        if (stream) {
          // SSE streaming
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          res.write(`data: ${JSON.stringify({ text: responseText })}\n\n`);
          res.write(`data: ${JSON.stringify({ error: 'Database query failed', agentVersion: USE_ENHANCED_AGENT ? 'enhanced' : 'legacy' })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        } else {
          return res.json({
            message: responseText,
            error: 'Database query failed',
            agentVersion: USE_ENHANCED_AGENT ? 'enhanced' : 'legacy',
          });
        }
      } else {
        // Generate natural language response from query results
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
        const prompt = `
用户问：${userMessage}

数据库查询结果：
${JSON.stringify(queryResult.data, null, 2)}

请用自然、友好的语言回答用户的问题，基于查询结果给出详细说明。
如果数据为空，说明没有找到相关信息。
不要提及 SQL 或技术细节。

${queryResult.explanation ? `查询说明：${queryResult.explanation}` : ''}
        `;

        const result = await model.generateContent(prompt);
        responseText = result.response.text();

        metadata = {
          sql: queryResult.sql,
          rowCount: queryResult.data?.length,
          explanation: queryResult.explanation,
        };

        if (stream) {
          // SSE streaming
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          res.write(`data: ${JSON.stringify({ text: responseText, metadata })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        } else {
          return res.json({
            message: responseText,
            metadata,
            agentVersion: USE_ENHANCED_AGENT ? 'enhanced' : 'legacy',
          });
        }
      }
    } else {
      // Normal chat
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
      const result = await model.generateContent(userMessage);
      responseText = result.response.text();

      if (stream) {
        // SSE streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({ text: responseText })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      } else {
        return res.json({
          message: responseText,
          agentVersion: USE_ENHANCED_AGENT ? 'enhanced' : 'legacy',
        });
      }
    }
  } catch (error) {
    const responseTime = Date.now() - startTime;
    console.error('Chat API error:', error);

    // Log failed metrics
    logMetrics({
      agentVersion: USE_ENHANCED_AGENT ? 'enhanced' : 'legacy',
      question: userMessage,
      success: false,
      responseTime,
      errorType: error instanceof Error ? error.name : 'Unknown',
    });

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error),
      agentVersion: USE_ENHANCED_AGENT ? 'enhanced' : 'legacy',
    });
  }

// Export metrics for monitoring endpoint (optional)
export function getMetrics(): QueryMetrics[] {
  return metrics;
}

export function getMetricsSummary() {
  if (metrics.length === 0) {
    return { total: 0, success: 0, failure: 0, avgResponseTime: 0 };
  }

  const legacyMetrics = metrics.filter(m => m.agentVersion === 'legacy');
  const enhancedMetrics = metrics.filter(m => m.agentVersion === 'enhanced');

  const calculateStats = (m: QueryMetrics[]) => {
    const total = m.length;
    const success = m.filter(x => x.success).length;
    const failure = total - success;
    const avgTime = m.length > 0
      ? Math.round(m.reduce((sum, x) => sum + x.responseTime, 0) / m.length)
      : 0;

    return { total, success, failure, avgTime, successRate: total > 0 ? Math.round((success / total) * 100) : 0 };
  };

  const legacyStats = calculateStats(legacyMetrics);
  const enhancedStats = calculateStats(enhancedMetrics);

  return {
    legacy: legacyStats,
    enhanced: enhancedStats,
    overall: {
      total: metrics.length,
      ...calculateStats(metrics),
    },
    comparison: {
      successRateImprovement: enhancedStats.successRate - legacyStats.successRate,
      avgTimeImprovement: legacyStats.avgTime - enhancedStats.avgTime,
      betterVersion: enhancedStats.successRate > legacyStats.successRate ? 'enhanced' : 'legacy',
    },
  };
}
