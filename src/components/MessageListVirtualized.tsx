/**
 * 虚拟滚动消息列表组件（简化版）
 * 当消息超过阈值时显示提示，建议用户清空对话
 */

import { useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { SearchResultDisplay } from './chat/SearchResultDisplay';
import type { ChatMessage } from '../types/chat';

interface MessageListVirtualizedProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  error?: string | null;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

export function MessageListVirtualized({ 
  messages, 
  isLoading, 
  error,
  hasMore = false
}: MessageListVirtualizedProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4" role="alert">
        <Card className="border-destructive">
          <CardContent className="py-4 text-center text-destructive">
            ❌ {error}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (messages.length === 0 && !isLoading) {
    return (
      <div 
        className="flex-1 overflow-y-auto p-4 flex items-center justify-center"
        role="status"
        aria-label="欢迎信息"
      >
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-4" aria-hidden="true">💬</div>
          <p className="text-lg font-medium mb-2">欢迎使用智能助手</p>
          <p className="text-sm">开始对话，我可以帮你查询球员、执行分组等</p>
        </div>
      </div>
    );
  }

  return (
    <div 
      className="flex-1 overflow-y-auto p-4 space-y-4"
      role="log"
      aria-label="聊天消息列表"
      aria-live="polite"
    >
      {hasMore && isLoading && (
        <div className="text-center text-sm text-muted-foreground">
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      )}

      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={msg.id}
            className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
            data-testid={`message-${msg.role}`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                isUser
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted'
              }`}
              role="article"
              aria-label={`${isUser ? '用户' : '助手'}消息`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
              
              {/* Display search results if available */}
              {msg.searchResults && msg.searchResults.results.length > 0 && (
                <div className="mt-3">
                  <SearchResultDisplay
                    results={msg.searchResults.results}
                    query={msg.searchResults.query}
                  />
                </div>
              )}
              
              <div className="text-xs opacity-70 mt-1">
                {msg.timestamp instanceof Date
                  ? msg.timestamp.toLocaleTimeString()
                  : new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        );
      })}
      
      {isLoading && (
        <div className="flex justify-start" data-testid="loading-indicator">
          <div className="bg-muted rounded-lg p-3 space-y-2">
            <Skeleton className="h-4 w-[200px]" />
            <Skeleton className="h-4 w-[160px]" />
          </div>
        </div>
      )}
      
      <div ref={bottomRef} />
    </div>
  );
}
