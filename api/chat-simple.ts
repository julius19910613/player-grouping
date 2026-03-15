import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  const isVercelSubdomain = origin.endsWith('.vercel.app');
  const isLocalhost = origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:');
  const isGithubPages = origin === 'https://julius19910613.github.io';

  if (isVercelSubdomain || isLocalhost || isGithubPages) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
      return res.status(500).json({
        error: 'API key not configured'
      });
    }

    const { messages, stream = false } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Invalid request',
        message: '需要提供 messages 数组'
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash-lite' });

    // 流式输出
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache, no-transform');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const writeChunk = (text: string) => {
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
      };

      try {
        const result = await model.generateContentStream(messages[0].content);

        for await (const chunk of result.stream) {
          const text = chunk.text();
          if (text) {
            writeChunk(text);
          }
        }

        res.write('data: [DONE]\n\n');
        return res.end();
      } catch (error) {
        console.error('Stream error:', error);
        res.write(`data: ${JSON.stringify({ error: 'Stream error' })}\n\n`);
        return res.end();
      }
    }

    // 非流式输出（向后兼容）
    const result = await model.generateContent(messages[0].content);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({
      success: true,
      message: text
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
  }
}
