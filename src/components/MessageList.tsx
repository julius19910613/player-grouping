import { useRef, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Skeleton } from './ui/skeleton';
import type { ChatMessage } from '../types/chat';

interface MessageListProps {
  messages: ChatMessage[];
  isLoading?: boolean;
  error?: string | null;
}

export function MessageList({ messages, isLoading, error }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (error) {
    return (
      <div className="flex-1 overflow-y-auto p-4">
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
      <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-lg font-medium mb-2">欢迎使用智能助手</p>
          <p className="text-sm">开始对话，我可以帮你查询球员、执行分组等</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
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
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>
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
