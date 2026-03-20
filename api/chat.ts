/**
 * Chat API Handler - Streaming Version
 * 
 * 流式输出支持：
 * 1. 先返回"思考中"
 * 2. SQL 生成完成后，流式返回自然语言解释
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { StreamingSQLAgent, type StreamingQueryResult } from '../src/lib/sql-agent/sql-query-agent-streaming.js';

// Config
export const config = {
  maxDuration: 30, // Increased to 30s (Hobby tier max)
};

// Initialize
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
let streamingAgent: StreamingSQLAgent | null = null;

// Database intent detection
function detectDBIntent(message: string): boolean {
  const keywords = [
    '球员', '水平', '能力', '位置', '技能',
    '最厉害', '最强', '最准', '排名', '比较', '统计',
    '得分', '防守', '传球', '投篮', '篮板', '三分', '两分',
    '骚当', '谁', '多少', '几个', '数据'
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

/**
 * Send SSE event
 */
function sendEvent(res: VercelResponse, data: any): void {
  res.write('data: ' + JSON.stringify(data) + '\n\n');
}

/**
 * Main handler
 */
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

  // Support both formats
  const userMessage = messages ? getLastUserMessage(messages) : req.body.message;

  if (!userMessage) {
    return res.status(400).json({ error: 'Message is required' });
  }

  try {
    // Check if database query intent
    const needsDBQuery = enableFunctionCalling !== false && detectDBIntent(userMessage);

    if (needsDBQuery) {
      // Use Streaming SQL Agent
      if (!streamingAgent) {
        streamingAgent = new StreamingSQLAgent();
      }

      if (stream) {
        // Setup SSE
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Stream query results
        let fullExplanation = '';
        let lastData: any = null;
        let lastSql: string = '';
        let lastRowCount = 0;

        await streamingAgent.queryStreaming(userMessage, (result: StreamingQueryResult) => {
          switch (result.type) {
            case 'thinking':
              sendEvent(res, {
                success: true,
                type: 'thinking',
                text: result.content
              });
              break;

            case 'sql':
              lastSql = result.sql || '';
              sendEvent(res, {
                success: true,
                type: 'sql',
                sql: lastSql
              });
              break;

            case 'data':
              lastData = result.data;
              lastRowCount = result.rowCount || 0;
              sendEvent(res, {
                success: true,
                type: 'data',
                data: lastData,
                rowCount: lastRowCount
              });
              break;

            case 'explanation':
              fullExplanation += result.content;
              sendEvent(res, {
                success: true,
                type: 'explanation',
                text: result.content
              });
              break;

            case 'error':
              sendEvent(res, {
                success: false,
                type: 'error',
                error: result.content
              });
              break;

            case 'done':
              // Send final metadata only (text already sent via explanation events)
              sendEvent(res, {
                success: true,
                type: 'complete',
                metadata: {
                  sql: lastSql,
                  rowCount: lastRowCount
                },
                data: lastData
              });
              res.write('data: [DONE]\n\n');
              res.end();
              break;
          }
        });

      } else {
        // Non-streaming mode - collect all results
        let fullExplanation = '';
        let lastData: any = null;
        let lastSql: string = '';
        let lastRowCount = 0;

        await streamingAgent.queryStreaming(userMessage, (result: StreamingQueryResult) => {
          if (result.type === 'explanation') {
            fullExplanation += result.content;
          } else if (result.type === 'data') {
            lastData = result.data;
            lastRowCount = result.rowCount || 0;
          } else if (result.type === 'sql') {
            lastSql = result.sql || '';
          }
        });

        return res.json({
          success: true,
          data: lastData,
          text: fullExplanation,
          metadata: {
            sql: lastSql,
            rowCount: lastRowCount
          }
        });
      }

    } else {
      // Normal chat (no streaming for now)
      const model = genAI.getGenerativeModel({ model: 'gemini-3.1-flash-lite-preview' });
      const result = await model.generateContent(userMessage);
      const responseText = result.response.text();

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        sendEvent(res, {
          success: true,
          type: 'text',
          text: responseText
        });
        res.write('data: [DONE]\n\n');
        res.end();
      } else {
        return res.json({
          success: true,
          message: responseText
        });
      }
    }
  } catch (error) {
    console.error('Chat Streaming API error:', error);
    
    if (stream && !res.headersSent) {
      sendEvent(res, {
        success: false,
        type: 'error',
        error: error instanceof Error ? error.message : String(error)
      });
      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      return res.status(500).json({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }
}
