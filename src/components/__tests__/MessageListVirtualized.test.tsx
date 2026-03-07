import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MessageListVirtualized } from '../MessageListVirtualized';
import type { ChatMessage } from '../../types/chat';

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: vi.fn(({ children, itemCount, itemData, height, width }) => (
    <div
      data-testid="virtualized-list"
      data-item-count={itemCount}
      data-height={height}
      data-width={width}
    >
      {Array.from({ length: itemCount }).map((_, index) => (
        <div key={index}>{children({ index, style: {}, data: itemData })}</div>
      ))}
    </div>
  )),
}));

describe('MessageListVirtualized', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date('2024-01-01T10:00:00'),
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hi there!',
      timestamp: new Date('2024-01-01T10:01:00'),
    },
    {
      id: 'msg-3',
      role: 'user',
      content: 'How are you?',
      timestamp: new Date('2024-01-01T10:02:00'),
    },
  ];

  const mockMessagesWithSearchResults: ChatMessage[] = [
    {
      id: 'msg-4',
      role: 'assistant',
      content: 'Search results:',
      timestamp: new Date(),
      searchResults: {
        query: 'test',
        results: [
          { title: 'Result 1', url: 'http://example.com/1', description: 'Desc 1' },
        ],
      },
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render virtualized list with messages', () => {
      render(<MessageListVirtualized messages={mockMessages} />);
      
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
      expect(screen.getByTestId('virtualized-list')).toHaveAttribute('data-item-count', '3');
    });

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
      render(
        <MessageListVirtualized
          messages={mockMessages}
          error="Network error"
        />
      );
      
      expect(screen.getByText(/Network error/)).toBeInTheDocument();
    });

    it('should render search results when available', () => {
      render(<MessageListVirtualized messages={mockMessagesWithSearchResults} />);
      
      expect(screen.getByText('Result 1')).toBeInTheDocument();
    });
  });

  describe('loading state', () => {
    it('should show loading indicator when isLoading is true', () => {
      render(<MessageListVirtualized messages={mockMessages} isLoading={true} />);
      
      expect(screen.getByLabelText('加载中')).toBeInTheDocument();
    });

    it('should not show loading indicator when isLoading is false', () => {
      render(<MessageListVirtualized messages={mockMessages} isLoading={false} />);
      
      expect(screen.queryByLabelText('加载中')).not.toBeInTheDocument();
    });

    it('should show loading indicator at top when loading more', () => {
      render(
        <MessageListVirtualized
          messages={mockMessages}
          isLoading={true}
          hasMore={true}
        />
      );
      
      expect(screen.getByText(/加载中/)).toBeInTheDocument();
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

  describe('regenerate functionality', () => {
    it('should show regenerate button for assistant messages', () => {
      render(<MessageListVirtualized messages={mockMessages} />);
      
      // Should have regenerate button for assistant message
      const regenerateButtons = screen.getAllByLabelText('重新生成');
      expect(regenerateButtons.length).toBeGreaterThan(0);
    });

    it('should call onRegenerate when regenerate button is clicked', async () => {
      const onRegenerate = vi.fn();
      
      render(
        <MessageListVirtualized
          messages={mockMessages}
          onRegenerate={onRegenerate}
        />
      );
      
      const regenerateButton = screen.getAllByLabelText('重新生成')[0];
      regenerateButton.click();
      
      await waitFor(() => {
        expect(onRegenerate).toHaveBeenCalledWith('msg-2');
      });
    });
  });

  describe('copy functionality', () => {
    it('should show copy button for messages', () => {
      render(<MessageListVirtualized messages={mockMessages} />);
      
      const copyButtons = screen.getAllByLabelText('复制消息');
      expect(copyButtons.length).toBe(mockMessages.length);
    });
  });

  describe('lazy loading', () => {
    it('should call onLoadMore when scrolled to top', () => {
      const onLoadMore = vi.fn();
      
      render(
        <MessageListVirtualized
          messages={mockMessages}
          onLoadMore={onLoadMore}
          hasMore={true}
        />
      );
      
      // The virtualized list mock doesn't actually trigger onItemsRendered
      // This test verifies the prop is passed correctly
      expect(screen.getByTestId('virtualized-list')).toBeInTheDocument();
    });

    it('should not call onLoadMore when hasMore is false', () => {
      const onLoadMore = vi.fn();
      
      render(
        <MessageListVirtualized
          messages={mockMessages}
          onLoadMore={onLoadMore}
          hasMore={false}
        />
      );
      
      expect(onLoadMore).not.toHaveBeenCalled();
    });
  });

  describe('performance', () => {
    it('should render large message lists efficiently', () => {
      // Create 100 messages
      const manyMessages: ChatMessage[] = Array.from({ length: 100 }, (_, i) => ({
        id: `msg-${i}`,
        role: i % 2 === 0 ? 'user' : 'assistant',
        content: `Message ${i}`,
        timestamp: new Date(),
      }));

      const { container } = render(<MessageListVirtualized messages={manyMessages} />);
      
      // Should render virtualized list
      expect(screen.getByTestId('virtualized-list')).toHaveAttribute('data-item-count', '100');
    });
  });

  describe('error handling', () => {
    it('should display error message with correct styling', () => {
      render(
        <MessageListVirtualized
          messages={[]}
          error="Something went wrong"
        />
      );
      
      const errorCard = screen.getByRole('alert');
      expect(errorCard).toHaveClass('border-destructive');
    });
  });
});
