/**
 * Chat API Handler with LangChain SQL Agent (FIXED VERSION)
 *
 * Fixed TypeScript syntax errors in template strings
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SQLQueryAgent } from '../src/lib/sql-agent/sql-query-agent.js';

// Config
export const config = {
  maxDuration: 30, // Increased to 30s (Hobby tier max) to handle longer Gemini API responses
};

// Initialize
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
let sqlAgent: SQLQueryAgent | null = null;

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

// Main handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    if (needsDBQuery) {
      // Use SQL Agent
      if (!sqlAgent) {
        sqlAgent = new SQLQueryAgent();
        await sqlAgent.initialize();
      }

      const queryResult = await sqlAgent.query(userMessage);

      if (!queryResult.success) {
        // SQL query failed - return error with consistent format
        const errorResponse = {
          success: false,
          data: [],
          error: queryResult.error || 'Database query failed',
          sql: queryResult.sql,
          rowCount: 0
        };

        if (stream) {
          // SSE streaming
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          res.write('data: ' + JSON.stringify(errorResponse) + '\n\n');
          res.write('data: [DONE]\n\n');
          return res.end();
        } else {
          return res.json(errorResponse);
        }
      }

      // Use the AI-generated explanation from SQL Agent
      const explanation = queryResult.explanation || '查询成功完成。';

      // Return successful query result with data
      if (stream) {
        // SSE streaming - add success field for consistency
        const streamResponse = {
          success: true,
          data: queryResult.data,
          text: explanation,
          metadata: {
            sql: queryResult.sql,
            rowCount: queryResult.data?.length
          }
        };

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write('data: ' + JSON.stringify(streamResponse) + '\n\n');
        res.write('data: [DONE]\n\n');
        return res.end();
      } else {
        return res.json({
          success: true,
          data: queryResult.data,
          text: explanation,
          metadata: {
            sql: queryResult.sql,
            rowCount: queryResult.data?.length
          }
        });
      }
    } else {
      // Normal chat
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
      const result = await model.generateContent(userMessage);
      const responseText = result.response.text();

      if (stream) {
        // SSE streaming - add success field for consistency
        const streamResponse = {
          success: true,
          text: responseText
        };

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write('data: ' + JSON.stringify(streamResponse) + '\n\n');
        res.write('data: [DONE]\n\n');
        return res.end();
      } else {
        return res.json({
          success: true,
          message: responseText
        });
      }
    }
  } catch (error) {
    console.error('Chat API error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : String(error)
    });
  }
}
