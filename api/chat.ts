/**
 * Chat API Handler with LangChain SQL Agent
 *
 * Supports:
 * - SSE streaming responses
 * - Message history format
 * - LangChain SQL Agent for database queries
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { SQLQueryAgent } from '../src/lib/sql-agent/sql-query-agent.js';

// Config
export const config = {
  maxDuration: 10,
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
        // Fall back to normal chat
        const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash' });
        const result = await model.generateContent(userMessage);
        const responseText = result.response.text();

        if (stream) {
          // SSE streaming
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');

          res.write(`data: ${JSON.stringify({ text: responseText })}\n\n`);
          res.write(`data: ${JSON.stringify({ error: 'Database query failed' })}\n\n`);
          res.write('data: [DONE]\n\n');
          return res.end();
        } else {
          return res.json({
            message: responseText,
            error: 'Database query failed'
          });
        }
      }

      // Generate natural language response
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash' });
      const prompt = `
用户问：${userMessage}

数据库查询结果：
${JSON.stringify(queryResult.data, null, 2)}

请用自然、友好的语言回答用户的问题，基于查询结果给出详细说明。
如果数据为空，说明没有找到相关信息。
不要提及 SQL 或技术细节。
      `;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();

      if (stream) {
        // SSE streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        res.write(`data: ${JSON.stringify({ text: responseText, metadata: { sql: queryResult.sql, rowCount: queryResult.data?.length } })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      } else {
        return res.json({
          message: responseText,
          metadata: {
            sql: queryResult.sql,
            rowCount: queryResult.data?.length
          }
        });
      }
    } else {
      // Normal chat
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash' });
      const result = await model.generateContent(userMessage);
      const responseText = result.response.text();

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
