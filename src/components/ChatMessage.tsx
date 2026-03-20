/**
 * 增强版聊天消息组件
 * 支持复制、重新生成、Markdown 渲染、球员数据雷达图
 */

import { memo, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { MarkdownRenderer } from './MarkdownRenderer';
import { SkillRadarChart } from './SkillRadarChart';
import { Copy, RotateCcw, Check, Database } from 'lucide-react';
import { toast } from 'sonner';
import { FeedbackButtons } from './FeedbackButtons';
import { cn } from '@/lib/utils';
import { normalizePlayerForChart, hasPlayerSkillData } from '@/lib/player-data-utils';
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
          className={`max-w-[70%] rounded p-3 ${
            isUser
              ? 'bg-[#0070f2] text-white'
              : 'bg-[#eaecee] text-[#223548]'
          }`}
        >
          {/* 数据库查询标记（仅 AI 消息） */}
          {!isUser && message.metadata?.source === 'sql-agent' && (
            <div className="flex items-center gap-1.5 mb-2 px-2 py-1 bg-[#d1efff] border border-[#a6e0ff] rounded">
              <Database className="h-3.5 w-3.5 text-[#0070f2]" />
              <span className="text-xs text-[#002a86]">
                已查询数据库
              </span>
              {message.metadata.rowCount !== undefined && (
                <span className="text-xs text-muted-foreground">
                  ({message.metadata.rowCount} 条记录)
                </span>
              )}
            </div>
          )}

          {/* 球员数据雷达图 */}
          {!isUser && message.metadata?.data && Array.isArray(message.metadata.data) && hasPlayerSkillData(message.metadata.data) && (() => {
            const players = message.metadata.data
              .map((row: unknown) => normalizePlayerForChart(row))
              .filter((p): p is NonNullable<typeof p> => p !== null);
            if (players.length === 0) return null;
            return (
              <div className="mt-2 mb-3 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-[420px]">
                {players.slice(0, 4).map((p, i) => (
                  <div key={i} className="min-w-0">
                    <SkillRadarChart skills={p.skills} position={p.position} />
                    <p className="text-center text-sm font-medium mt-1 text-[#223548]">{p.name}</p>
                  </div>
                ))}
              </div>
            );
          })()}

          {/* 消息内容 */}
          {isUser ? (
            <p className="whitespace-pre-wrap">{message.content}</p>
          ) : message.content ? (
            <MarkdownRenderer content={message.content} />
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground italic py-1">
              <div className="animate-spin h-3 w-3 border-2 border-muted-foreground border-t-transparent rounded-full" />
              <span>思考中...</span>
            </div>
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
      prevProps.message.metadata?.data === nextProps.message.metadata?.data &&
      prevProps.isLast === nextProps.isLast
    );
  }
);

ChatMessage.displayName = 'ChatMessage';
