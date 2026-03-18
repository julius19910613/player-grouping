/**
 * Streaming SQL Query Agent
 * 
 * 支持流式输出的 SQL 查询 Agent
 * - 先返回"思考中"
 * - SQL 生成完成后，流式返回自然语言解释
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { SQLQueryAgent, type QueryResult } from './sql-query-agent.js';

/**
 * 流式查询结果
 */
export interface StreamingQueryResult {
  type: 'thinking' | 'sql' | 'explanation' | 'data' | 'error' | 'done';
  content: string;
  data?: any;
  sql?: string;
  rowCount?: number;
}

/**
 * 流式 SQL Agent
 */
export class StreamingSQLAgent {
  private sqlAgent: SQLQueryAgent;
  private apiKey: string;

  constructor() {
    this.sqlAgent = new SQLQueryAgent();
    this.apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';
  }

  /**
   * 流式查询数据库
   * 
   * @param question - 自然语言问题
   * @param onChunk - 流式回调
   */
  async queryStreaming(
    question: string,
    onChunk: (result: StreamingQueryResult) => void
  ): Promise<void> {
    try {
      // 1. 发送"思考中"状态
      onChunk({ type: 'thinking', content: '正在思考...' });
      
      // 2. 初始化 SQL Agent
      await this.sqlAgent.initialize();
      
      // 3. 生成结构化查询
      onChunk({ type: 'thinking', content: '正在生成查询...' });
      const queryResult = await this.sqlAgent.query(question);
      
      if (!queryResult.success) {
        onChunk({ 
          type: 'error', 
          content: queryResult.error || '查询失败'
        });
        return;
      }
      
      // 4. 发送 SQL 信息
      onChunk({ 
        type: 'sql', 
        content: queryResult.sql || '',
        sql: queryResult.sql
      });
      
      // 5. 发送数据
      onChunk({ 
        type: 'data', 
        content: '',
        data: queryResult.data,
        rowCount: queryResult.rowCount
      });
      
      // 6. 流式生成自然语言解释
      await this.generateStreamingExplanation(question, queryResult, onChunk);
      
      // 7. 完成
      onChunk({ type: 'done', content: '' });
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      onChunk({ type: 'error', content: errorMessage });
    }
  }

  /**
   * 流式生成自然语言解释
   */
  private async generateStreamingExplanation(
    question: string,
    queryResult: QueryResult,
    onChunk: (result: StreamingQueryResult) => void
  ): Promise<void> {
    if (!queryResult.data || queryResult.data.length === 0) {
      onChunk({ 
        type: 'explanation', 
        content: '没有找到匹配的数据。'
      });
      return;
    }

    const genAI = new GoogleGenerativeAI(this.apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3.1-flash-lite-preview',
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      }
    });

    // 构建提示词
    const prompt = `你是一个数据分析助手。用户问了问题："${question}"

查询返回了 ${queryResult.rowCount} 条数据。

数据内容（JSON格式）：
${JSON.stringify(queryResult.data, null, 2)}

请用简洁、自然的中文回答用户的问题，包括：
1. 直接回答问题
2. 列出关键数据（如球员名字、能力值等）
3. 如果有多个结果，用列表形式展示

注意：
- 不要说"查询成功完成"这类废话
- 直接给出有价值的信息
- 使用 Markdown 格式（如 **加粗**、列表等）`;

    try {
      // 使用流式生成
      const result = await model.generateContentStream(prompt);
      
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        if (chunkText) {
          onChunk({ 
            type: 'explanation', 
            content: chunkText 
          });
        }
      }
    } catch (error) {
      console.error('Failed to generate explanation:', error);
      // 降级：返回简单的文本
      onChunk({ 
        type: 'explanation', 
        content: `查询到 ${queryResult.rowCount} 条数据。`
      });
    }
  }
}

/**
 * 全局单例实例
 */
let globalStreamingAgent: StreamingSQLAgent | null = null;

/**
 * 获取或创建全局流式 Agent 实例
 */
export const getOrCreateStreamingAgent = (): StreamingSQLAgent => {
  if (!globalStreamingAgent) {
    globalStreamingAgent = new StreamingSQLAgent();
  }
  return globalStreamingAgent;
};
