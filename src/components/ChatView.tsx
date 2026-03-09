/**
 * 增强版聊天视图
 * 集成虚拟滚动、防抖、快捷键、无障碍优化
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { Card } from './ui/card';
import { MessageListVirtualized } from './MessageListVirtualized';
import { ChatInput } from './ChatInput';
import { ChatMessage } from './ChatMessage';
import { chatService, type ChatError } from '../services/chat-service';
import { useKeyboardShortcut, SHORTCUTS } from '../hooks/useKeyboardShortcut';
import { screenReader } from '../lib/accessibility';
import { toast } from 'sonner';
import type { ChatMessage as ChatMessageType } from '../types/chat';

export function ChatView() {
  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // 全局快捷键：打开聊天（Cmd/Ctrl + K）
  useKeyboardShortcut({
    key: SHORTCUTS.OPEN_CHAT.key,
    metaKey: true,
    handler: () => {
      inputRef.current?.focus();
      toast.success('聊天窗口已激活');
    },
    enabled: !isLoading,
  });

  // 全局快捷键：聚焦输入框（/）
  useKeyboardShortcut({
    key: SHORTCUTS.FOCUS_INPUT.key,
    handler: () => {
      inputRef.current?.focus();
    },
    enabled: !isLoading,
  });

  // 屏幕阅读器公告
  useEffect(() => {
    screenReader.createAnnouncer();
    return () => {
      screenReader.destroy();
    };
  }, []);

  // 发送消息
  const handleSend = useCallback(async (content: string) => {
    // 添加用户消息
    const userMessage: ChatMessageType = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);
    setError(null);

    // 屏幕阅读器公告
    screenReader.announce('正在处理您的消息...', 'polite');

    try {
      // 调用 Gemini API
      const response = await chatService.sendMessage(content);
      const responseData = response as any;

      // 添加 AI 响应
      const assistantMessage: ChatMessageType = {
        id: `msg-${Date.now() + 1}`,
        role: 'assistant',
        content: typeof response === 'string' ? response : responseData.message || response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      
      // 屏幕阅读器公告
      screenReader.announce('收到回复', 'polite');
    } catch (err) {
      console.error('Chat error:', err);
      
      const chatError = err as ChatError;
      const errorMessage = chatError.message || '发送消息失败，请重试';
      
      setError(errorMessage);
      
      // 错误提示
      toast.error(errorMessage, {
        description: chatError.retryable ? '可以尝试重新发送' : '请检查网络或稍后再试',
        action: chatError.retryable ? {
          label: '重试',
          onClick: () => handleSend(content),
        } : undefined,
      });

      // 屏幕阅读器公告
      screenReader.announce(`错误：${errorMessage}`, 'assertive');

      // 移除失败的用户消息
      setMessages(prev => prev.filter(msg => msg.id !== userMessage.id));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 重新生成最后一条 AI 消息
  const handleRegenerate = useCallback(() => {
    // 找到最后一条用户消息
    const lastUserMessage = [...messages].reverse().find(msg => msg.role === 'user');
    
    if (lastUserMessage) {
      // 移除最后一条 AI 消息
      setMessages(prev => {
        const newMessages = [...prev];
        const lastAiIndex = newMessages.map(m => m.role).lastIndexOf('assistant');
        if (lastAiIndex !== -1) {
          newMessages.splice(lastAiIndex, 1);
        }
        return newMessages;
      });

      // 重新发送
      handleSend(lastUserMessage.content);
    }
  }, [messages, handleSend]);

  // 清空对话
  const handleClearChat = useCallback(() => {
    if (messages.length === 0) return;
    
    if (window.confirm('确定要清空所有对话吗？')) {
      setMessages([]);
      setError(null);
      chatService.clearHistory();
      toast.success('对话已清空');
      screenReader.announce('对话已清空', 'polite');
    }
  }, [messages.length]);

  // 加载更多历史消息（懒加载）
  const handleLoadMore = useCallback(() => {
    // TODO: 从本地存储或服务器加载历史消息
    console.log('Loading more messages...');
    toast.success('加载历史消息功能开发中...');
  }, []);

  return (
    <div 
      className="flex flex-col h-[calc(100vh-200px)]"
      role="main"
      aria-label="聊天助手"
    >
      {/* 顶部工具栏 */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold" id="chat-title">
            💬 智能助手
          </h2>
          <span className="text-sm text-muted-foreground">
            {messages.length > 0 && `${messages.length} 条消息`}
          </span>
        </div>
        
        {messages.length > 0 && (
          <button
            onClick={handleClearChat}
            className="text-sm text-muted-foreground hover:text-foreground"
            aria-label="清空对话"
          >
            清空对话
          </button>
        )}
      </div>

      {/* 聊天区域 */}
      <Card 
        className="flex-1 flex flex-col overflow-hidden"
        aria-labelledby="chat-title"
      >
        {messages.length < 50 ? (
          // 少于 50 条消息，使用普通渲染
          <div 
            className="flex-1 overflow-y-auto p-4 space-y-4"
            role="log"
            aria-label="聊天消息列表"
            aria-live="polite"
          >
            {messages.length === 0 && !isLoading && (
              <div 
                className="flex items-center justify-center h-full text-center text-muted-foreground"
                role="status"
              >
                <div>
                  <div className="text-4xl mb-4" aria-hidden="true">💬</div>
                  <p className="text-lg font-medium mb-2">欢迎使用智能助手</p>
                  <p className="text-sm mb-4">开始对话，我可以帮你查询球员、执行分组等</p>
                  <p className="text-xs text-muted-foreground">
                    💡 按 <kbd className="px-1.5 py-0.5 bg-muted rounded">Cmd/Ctrl + K</kbd> 快速聚焦输入框
                  </p>
                </div>
              </div>
            )}

            {messages.map((msg, index) => (
              <ChatMessage
                key={msg.id}
                message={msg}
                onRegenerate={index === messages.length - 1 && msg.role === 'assistant' ? handleRegenerate : undefined}
                isLast={index === messages.length - 1}
              />
            ))}

            {isLoading && (
              <div className="flex justify-start" role="status" aria-label="加载中">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                    <span className="text-sm text-muted-foreground">思考中...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          // 超过 50 条消息，使用虚拟滚动
          <MessageListVirtualized
            messages={messages}
            isLoading={isLoading}
            error={error}
            onLoadMore={handleLoadMore}
            hasMore={false}
          />
        )}

        {/* 输入框 */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          enableAutocomplete={true}
        />
      </Card>

      {/* 键盘快捷键提示 */}
      <div className="text-xs text-muted-foreground text-center mt-2" aria-hidden="true">
        <kbd className="px-1.5 py-0.5 bg-muted rounded">Enter</kbd> 发送 · 
        <kbd className="px-1.5 py-0.5 bg-muted rounded">Shift + Enter</kbd> 换行 · 
        <kbd className="px-1.5 py-0.5 bg-muted rounded">/</kbd> 快捷命令
      </div>
    </div>
  );
}
