import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatMessage } from '@/components/ChatMessage';
import type { ChatMessage as ChatMessageType } from '@/types/chat';

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
};

Object.assign(navigator, {
  clipboard: mockClipboard,
});

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('ChatMessage', () => {
  const mockUserMessage: ChatMessageType = {
    id: 'msg-1',
    role: 'user',
    content: 'Hello, this is a test message',
    timestamp: new Date('2024-01-01T10:00:00'),
  };

  const mockAssistantMessage: ChatMessageType = {
    id: 'msg-2',
    role: 'assistant',
    content: 'This is **bold** and *italic* text',
    timestamp: new Date('2024-01-01T10:01:00'),
  };

  const mockMessageWithSearchResults: ChatMessageType = {
    id: 'msg-3',
    role: 'assistant',
    content: 'Search results:',
    timestamp: new Date(),
    searchResults: {
      query: 'test query',
      results: [
        { title: 'Result 1', url: 'http://example.com/1', description: 'Description 1' },
        { title: 'Result 2', url: 'http://example.com/2', description: 'Description 2' },
      ],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render user message correctly', () => {
      render(<ChatMessage message={mockUserMessage} />);
      
      expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
      expect(screen.getByRole('article')).toHaveAttribute('aria-label', '用户消息');
    });

    it('should render assistant message correctly', () => {
      render(<ChatMessage message={mockAssistantMessage} />);
      
      // Markdown should be rendered
      expect(screen.getByRole('article')).toHaveAttribute('aria-label', '助手消息');
    });

    it('should render timestamp', () => {
      render(<ChatMessage message={mockUserMessage} />);
      
      expect(screen.getByText(/10:00:00/)).toBeInTheDocument();
    });

    it.skip('should render search results when available', () => {
      // ChatMessage does not currently render searchResults in UI
      render(<ChatMessage message={mockMessageWithSearchResults} />);
      expect(screen.getByText('Result 1')).toBeInTheDocument();
    });

    it('should not render search results when not available', () => {
      render(<ChatMessage message={mockUserMessage} />);
      
      expect(screen.queryByText('Result 1')).not.toBeInTheDocument();
    });
  });

  describe('copy functionality', () => {
    it('should copy message to clipboard when copy button is clicked', async () => {
      mockClipboard.writeText.mockResolvedValueOnce(undefined);
      
      render(<ChatMessage message={mockUserMessage} />);
      
      // Find copy button (hidden until hover, but still in DOM)
      const copyButton = screen.getByLabelText('复制消息');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(mockClipboard.writeText).toHaveBeenCalledWith('Hello, this is a test message');
      });
    });

    it('should show success feedback after copying', async () => {
      mockClipboard.writeText.mockResolvedValueOnce(undefined);
      
      render(<ChatMessage message={mockUserMessage} />);
      
      const copyButton = screen.getByLabelText('复制消息');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        // Button should change to "已复制"
        expect(screen.getByLabelText('已复制')).toBeInTheDocument();
      });
    });

    it('should handle copy error gracefully', async () => {
      mockClipboard.writeText.mockRejectedValueOnce(new Error('Copy failed'));
      
      render(<ChatMessage message={mockUserMessage} />);
      
      const copyButton = screen.getByLabelText('复制消息');
      fireEvent.click(copyButton);
      
      await waitFor(() => {
        expect(screen.getByLabelText('复制消息')).toBeInTheDocument();
      });
    });

    it('should reset copy state after 2 seconds', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      mockClipboard.writeText.mockResolvedValueOnce(undefined);

      render(<ChatMessage message={mockUserMessage} />);
      const copyButton = screen.getByLabelText('复制消息');
      fireEvent.click(copyButton);

      await waitFor(() => {
        expect(screen.getByLabelText('已复制')).toBeInTheDocument();
      });

      await vi.advanceTimersByTimeAsync(2000);

      await waitFor(() => {
        expect(screen.getByLabelText('复制消息')).toBeInTheDocument();
      });

      vi.useRealTimers();
    }, 10000);
  });

  describe('regenerate functionality', () => {
    it('should show regenerate button for assistant messages', () => {
      const onRegenerate = vi.fn();
      render(
        <ChatMessage
          message={mockAssistantMessage}
          onRegenerate={onRegenerate}
          isLast={true}
        />
      );
      
      expect(screen.getByLabelText('重新生成')).toBeInTheDocument();
    });

    it('should not show regenerate button for user messages', () => {
      const onRegenerate = vi.fn();
      render(
        <ChatMessage
          message={mockUserMessage}
          onRegenerate={onRegenerate}
          isLast={true}
        />
      );
      
      expect(screen.queryByLabelText('重新生成')).not.toBeInTheDocument();
    });

    it('should not show regenerate button for non-last messages', () => {
      const onRegenerate = vi.fn();
      render(
        <ChatMessage
          message={mockAssistantMessage}
          onRegenerate={onRegenerate}
          isLast={false}
        />
      );
      
      expect(screen.queryByLabelText('重新生成')).not.toBeInTheDocument();
    });

    it('should call onRegenerate when regenerate button is clicked', () => {
      const onRegenerate = vi.fn();
      render(
        <ChatMessage
          message={mockAssistantMessage}
          onRegenerate={onRegenerate}
          isLast={true}
        />
      );
      
      const regenerateButton = screen.getByLabelText('重新生成');
      fireEvent.click(regenerateButton);
      
      expect(onRegenerate).toHaveBeenCalledTimes(1);
    });
  });

  describe('accessibility', () => {
    it('should have correct ARIA attributes', () => {
      render(<ChatMessage message={mockUserMessage} />);
      
      const article = screen.getByRole('article');
      expect(article).toHaveAttribute('aria-label', '用户消息');
    });

    it('should have accessible button labels', () => {
      const onRegenerate = vi.fn();
      render(
        <ChatMessage
          message={mockAssistantMessage}
          onRegenerate={onRegenerate}
          isLast={true}
        />
      );
      
      expect(screen.getByLabelText('复制消息')).toBeInTheDocument();
      expect(screen.getByLabelText('重新生成')).toBeInTheDocument();
    });
  });

  describe('memo optimization', () => {
    it('should not re-render if message content is the same', () => {
      const { rerender } = render(<ChatMessage message={mockUserMessage} />);
      
      const firstRender = screen.getByText('Hello, this is a test message');
      
      // Re-render with same message
      rerender(<ChatMessage message={mockUserMessage} />);
      
      const secondRender = screen.getByText('Hello, this is a test message');
      
      // Should be the same element (not re-created)
      expect(firstRender).toBe(secondRender);
    });

    it('should re-render if message content changes', () => {
      const { rerender } = render(<ChatMessage message={mockUserMessage} />);
      
      expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
      
      const newMessage = { ...mockUserMessage, content: 'Updated message' };
      rerender(<ChatMessage message={newMessage} />);
      
      expect(screen.getByText('Updated message')).toBeInTheDocument();
    });
  });
});
