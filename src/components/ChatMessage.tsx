/**
 * 增强版聊天消息组件
 * 支持复制、重新生成、Markdown 渲染
 */

import { memo, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { Copy, RotateCcw, Check } from 'lucide-react';
import { toast } from 'sonner';
import { FeedbackButtons } from './FeedbackButtons';
import type { ChatMessage as ChatMessageType } from '../types/chat';

interface ChatMessageProps {
  message: ChatMessageType;
  onRegenerate?: () => void;
  isLast?: boolean;
}

export const ChatMessage = memo<ChatMessageProps>(
  ({ message, onRegenerate, isLast }) => {
    const [copied, setCopied] = useState(false);
    const isUser = message.role === 'user';

    // 复制消息
    const handleCopy = useCallback(async () => {
      try {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        toast.success('已复制到剪贴板');
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        toast.error('复制失败');
      }
    }, [message.content]);

    // 重新生成
    const handleRegenerate = useCallback(() => {
      if (onRegenerate) {
        onRegenerate();
        toast.success('正在重新生成...');
      }
    }, [onRegenerate]);

    return (
      <div
        className={`flex ${isUser ? 'justify-end' : 'justify-start'} group`}
        role="article"
        aria-label={`${isUser ? '用户' : '助手'}消息`}
        data-testid={`message-${message.role}`}
      >
        <div
          className={`max-w-[70%] rounded-lg p-3 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted'
          }`}
        >
          {/* 消息内容 */}
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : (
            <MarkdownRenderer content={message.content} />
          )}

          {/* 时间戳和操作按钮 */}
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="text-xs opacity-70">
              {message.timestamp instanceof Date
                ? message.timestamp.toLocaleTimeString()
                : new Date(message.timestamp).toLocaleTimeString()}
            </div>

            {/* 操作按钮（hover 显示） */}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {/* 复制按钮 */}
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0"
                aria-label={copied ? '已复制' : '复制消息'}
              >
                {copied ? (
                  <Check className="h-3 w-3" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>

              {/* 重新生成按钮（仅 AI 消息且是最后一条） */}
              {!isUser && isLast && onRegenerate && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRegenerate}
                  className="h-6 w-6 p-0"
                  aria-label="重新生成"
                >
                  <RotateCcw className="h-3 w-3" />
                </Button>
              )}

              {/* 反馈按钮（仅 AI 消息） */}
              {!isUser && (
                <FeedbackButtons
                  messageId={message.id}
                  onFeedbackSubmitted={() => {
                    // 可以在这里添加反馈提交后的回调
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  },
  // 自定义比较函数
  (prevProps, nextProps) => {
    return (
      prevProps.message.id === nextProps.message.id &&
      prevProps.message.content === nextProps.message.content &&
      prevProps.isLast === nextProps.isLast
    );
  }
);

ChatMessage.displayName = 'ChatMessage';
