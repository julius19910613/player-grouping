import type { SearchResult } from '../lib/brave-search';

export interface ToolCall {
  name: string;
  args: Record<string, any>;
  status: 'calling' | 'success' | 'error';
  result?: any;
  error?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  toolCalls?: ToolCall[];
  searchResults?: {
    query: string;
    results: SearchResult[];
  };
}

export interface ChatSession {
  id: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
