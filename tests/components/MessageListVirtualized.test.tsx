import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageListVirtualized } from '@/components/MessageListVirtualized';
import type { ChatMessage } from '@/types/chat';

describe('MessageListVirtualized', () => {
  const mockMessages: ChatMessage[] = [
    { id: 'msg-1', role: 'user', content: 'Hello', timestamp: new Date('2024-01-01T10:00:00') },
    { id: 'msg-2', role: 'assistant', content: 'Hi there!', timestamp: new Date('2024-01-01T10:01:00') },
    { id: 'msg-3', role: 'user', content: 'How are you?', timestamp: new Date('2024-01-01T10:02:00') },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render all messages', () => {
      render(<MessageListVirtualized messages={mockMessages} />);
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Hi there!')).toBeInTheDocument();
      expect(screen.getByText('How are you?')).toBeInTheDocument();
    });

    it('should show welcome message when no messages', () => {
      render(<MessageListVirtualized messages={[]} />);
      expect(screen.getByText('欢迎使用智能助手')).toBeInTheDocument();
      expect(screen.getByText('开始对话，我可以帮你查询球员、执行分组等')).toBeInTheDocument();
    });

    it('should show error message when error prop is provided', () => {
      render(<MessageListVirtualized messages={mockMessages} error="Network error" />);
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show skeleton when isLoading and hasMore', () => {
      render(<MessageListVirtualized messages={mockMessages} isLoading hasMore />);
      expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
    });

    it('should not show loading when hasMore is false', () => {
      render(<MessageListVirtualized messages={mockMessages} isLoading hasMore={false} />);
      expect(document.querySelector('.animate-pulse')).not.toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have correct ARIA attributes for message list', () => {
      render(<MessageListVirtualized messages={mockMessages} />);
      expect(screen.getByRole('log')).toHaveAttribute('aria-label', '聊天消息列表');
      expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite');
    });

    it('should have correct ARIA attributes for welcome message', () => {
      render(<MessageListVirtualized messages={[]} />);
      expect(screen.getByRole('status')).toHaveAttribute('aria-label', '欢迎信息');
    });

    it('should have correct ARIA attributes for error message', () => {
      render(<MessageListVirtualized messages={[]} error="Test error" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should have accessible message items', () => {
      render(<MessageListVirtualized messages={mockMessages} />);
      const articles = screen.getAllByRole('article');
      expect(articles[0]).toHaveAttribute('aria-label', '用户消息');
      expect(articles[1]).toHaveAttribute('aria-label', '助手消息');
    });
  });

  describe('error handling', () => {
    it('should display error with destructive styling', () => {
      render(<MessageListVirtualized messages={[]} error="Something went wrong" />);
      expect(screen.getByText(/Something went wrong/)).toBeInTheDocument();
      expect(document.querySelector('.border-destructive')).toBeInTheDocument();
    });
  });
});
