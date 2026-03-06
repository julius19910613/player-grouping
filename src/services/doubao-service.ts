/**
 * 豆包大模型 API 服务（火山引擎 ARK）
 * 文档: https://www.volcengine.com/docs/82379/2123228
 */

export interface ArkImageInput {
  type: 'input_image';
  image_url: string;
}

export interface ArkTextInput {
  type: 'input_text';
  text: string;
}

export interface ArkVideoInput {
  type: 'input_video';
  video_url: string;
}

export type ArkContent = ArkImageInput | ArkTextInput | ArkVideoInput;

export interface ArkMessage {
  role: 'user' | 'assistant' | 'system';
  content: ArkContent[];
}

export interface ArkRequest {
  model: string;
  input: ArkMessage[];
  parameters?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface ArkResponse {
  id: string;
  created: number;
  model: string;
  output: {
    text: string;
    finish_reason: string;
  };
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * 豆包 API 服务类
 */
export class DoubaoService {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = import.meta.env.VITE_ARK_API_KEY;
    this.baseUrl = import.meta.env.VITE_ARK_BASE_URL || 'https://ark.cn-beijing.volces.com/api/v3';
    this.model = import.meta.env.VITE_ARK_MODEL || 'doubao-seed-1-8-251228';
  }

  /**
   * 识别图片内容
   * @param imageUrl 图片 URL 或 base64
   * @param prompt 提示词
   */
  async recognizeImage(imageUrl: string, prompt: string = '请详细描述这张图片的内容'): Promise<string> {
    const request: ArkRequest = {
      model: this.model,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_image', image_url: imageUrl },
            { type: 'input_text', text: prompt }
          ]
        }
      ]
    };

    const response = await this.callApi(request);
    return response.output.text;
  }

  /**
   * 识别比赛技术统计图片
   * @param imageUrl 图片 URL 或 base64
   */
  async recognizeMatchStats(imageUrl: string): Promise<MatchStatsResult> {
    const prompt = `请识别这张篮球比赛技术统计图片，提取所有球员的数据。

输出格式要求（JSON）：
{
  "matchDate": "比赛日期（YYYY-MM-DD，如无法识别则返回 null）",
  "matchType": "比赛类型（5v5/3v3/练习赛，如无法识别则返回 null）",
  "players": [
    {
      "name": "球员姓名",
      "points": 得分（数字）,
      "rebounds": 篮板（数字）,
      "assists": 助攻（数字）,
      "steals": 抢断（数字，如无则0）,
      "blocks": 盖帽（数字，如无则0）,
      "turnovers": 失误（数字，如无则0）,
      "fgm": 投篮命中（数字，如无则0）,
      "fga": 投篮出手（数字，如无则0）,
      "tpm": 三分命中（数字，如无则0）,
      "tpa": 三分出手（数字，如无则0）
    }
  ]
}

注意：
1. 如果图片中有表格，按行提取每个球员的数据
2. 如果某些数据缺失，填写 0
3. 球员姓名必须准确识别
4. 只返回 JSON，不要有其他文字`;

    const text = await this.recognizeImage(imageUrl, prompt);
    return this.parseJson(text);
  }

  /**
   * 分析球员视频
   * @param videoUrl 视频 URL
   * @param playerName 球员姓名
   * @param playerPosition 球员位置
   */
  async analyzePlayerVideo(
    videoUrl: string,
    playerName: string,
    playerPosition: string
  ): Promise<PlayerAnalysisResult> {
    const prompt = `请分析这段 ${playerName}（${playerPosition}）的篮球比赛集锦视频。

请从以下维度分析球员表现，并给出能力值建议（1-99）：

1. **投篮能力**
   - two_point_shot: 两分投篮
   - three_point_shot: 三分投篮
   - free_throw: 罚球

2. **组织能力**
   - passing: 传球
   - ball_control: 控球
   - court_vision: 视野

3. **防守能力**
   - perimeter_defense: 外线防守
   - interior_defense: 内线防守
   - steals: 抢断
   - blocks: 盖帽

4. **篮板能力**
   - offensive_rebound: 进攻篮板
   - defensive_rebound: 防守篮板

5. **身体素质**
   - speed: 速度
   - strength: 力量
   - vertical: 弹跳
   - stamina: 体能

6. **篮球智商**
   - basketball_iq: 篮球智商
   - teamwork: 团队配合
   - clutch: 关键球能力

输出格式（JSON）：
{
  "summary": "球员特点总结（50-100字）",
  "strengths": ["优点1", "优点2", "优点3"],
  "weaknesses": ["缺点1", "缺点2"],
  "suggestedSkills": {
    "two_point_shot": 数字,
    "three_point_shot": 数字,
    // ... 其他能力值
  },
  "confidence": "high/medium/low"
}

注意：
1. 根据视频内容客观分析
2. 如果视频中展示的内容有限，降低置信度
3. 能力值要符合业余球员水平（通常 50-85）
4. 只返回 JSON`;

    const request: ArkRequest = {
      model: this.model,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_video', video_url: videoUrl },
            { type: 'input_text', text: prompt }
          ]
        }
      ]
    };

    const response = await this.callApi(request);
    return this.parseJson(response.output.text);
  }

  /**
   * 调用豆包 API
   */
  private async callApi(request: ArkRequest): Promise<ArkResponse> {
    const response = await fetch(`${this.baseUrl}/responses`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`豆包 API 调用失败: ${response.status} - ${error}`);
    }

    return response.json();
  }

  /**
   * 解析 JSON
   */
  private parseJson<T>(text: string): T {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('无法从 AI 响应中解析 JSON');
    }
    return JSON.parse(jsonMatch[0]);
  }
}

// 类型导出
export interface MatchStatsResult {
  matchDate: string | null;
  matchType: '5v5' | '3v3' | '练习赛' | null;
  players: Array<{
    name: string;
    points: number;
    rebounds: number;
    assists: number;
    steals: number;
    blocks: number;
    turnovers: number;
    fgm: number;
    fga: number;
    tpm: number;
    tpa: number;
  }>;
}

export interface PlayerAnalysisResult {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestedSkills: Record<string, number>;
  confidence: 'high' | 'medium' | 'low';
}

// 单例导出
export const doubaoService = new DoubaoService();
