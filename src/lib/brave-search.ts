/**
 * Brave Search API Integration
 * 
 * 提供联网搜索功能
 */

/**
 * Brave Search API 配置
 */
interface BraveSearchConfig {
  apiKey: string;
  baseUrl: string;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  title: string;
  url: string;
  description: string;
}

/**
 * Brave Search API 响应
 */
interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title: string;
      url: string;
      description: string;
    }>;
  };
}

/**
 * Brave Search Client
 */
export class BraveSearchClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(config?: Partial<BraveSearchConfig>) {
    this.apiKey = config?.apiKey || import.meta.env.VITE_BRAVE_SEARCH_API_KEY || '';
    this.baseUrl = config?.baseUrl || 'https://api.search.brave.com/res/v1';
  }

  /**
   * 检查服务是否可用
   */
  isAvailable(): boolean {
    return !!this.apiKey;
  }

  /**
   * 执行搜索
   * @param query 搜索关键词
   * @param count 返回结果数量（默认 5）
   * @returns 搜索结果列表
   */
  async search(query: string, count: number = 5): Promise<SearchResult[]> {
    if (!this.isAvailable()) {
      throw new Error('Brave Search API 未配置，请设置 VITE_BRAVE_SEARCH_API_KEY');
    }

    try {
      const response = await fetch(`${this.baseUrl}/web/search?q=${encodeURIComponent(query)}&count=${count}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': this.apiKey,
        },
      });

      if (!response.ok) {
        if (response.status === 429) {
          throw new Error('搜索频率超限，请稍后再试');
        }
        throw new Error(`搜索失败: ${response.status}`);
      }

      const data: BraveSearchResponse = await response.json();

      if (!data.web?.results || data.web.results.length === 0) {
        return [];
      }

      return data.web.results.map(result => ({
        title: result.title,
        url: result.url,
        description: result.description,
      }));
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('搜索请求失败');
    }
  }

  /**
   * 搜索并返回格式化的文本结果
   * @param query 搜索关键词
   * @param count 返回结果数量
   * @returns 格式化的搜索结果文本
   */
  async searchAndFormat(query: string, count: number = 5): Promise<string> {
    const results = await this.search(query, count);

    if (results.length === 0) {
      return '未找到相关结果';
    }

    return results
      .map((result, index) => 
        `${index + 1}. ${result.title}\n   ${result.description}\n   链接: ${result.url}`
      )
      .join('\n\n');
  }
}

/**
 * 导出默认实例
 */
export const braveSearchClient = new BraveSearchClient();
