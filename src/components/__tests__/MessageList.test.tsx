import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MessageList } from '../MessageList';
import type { ChatMessage } from '../../types/chat';

describe('MessageList', () => {
  const mockMessages: ChatMessage[] = [
    {
      id: '1',
      role: 'user',
      content: 'Hello',
      timestamp: new Date('2026-03-08T00:00:00Z'),
    },
    {
      id: '2',
      role: 'assistant',
      content: 'Hi there!',
      timestamp: new Date('2026-03-08T00:01:00Z'),
    },
  ];

  it('should render welcome message when no messages', () => {
    render(<MessageList messages={[]} />);
    
    expect(screen.getByText('欢迎使用智能助手')).toBeInTheDocument();
  });

  it('should render messages', () => {
    render(<MessageList messages={mockMessages} />);
    
    expect(screen.getByText('Hello')).toBeInTheDocument();
    expect(screen.getByText('Hi there!')).toBeInTheDocument();
  });

  it('should show loading indicator when loading', () => {
    render(<MessageList messages={[]} isLoading />);
    
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('should show error message when error', () => {
    render(<MessageList messages={[]} error="Test error" />);
    
    expect(screen.getByText('❌ Test error')).toBeInTheDocument();
  });

  it('should display user and assistant messages with different styles', () => {
    render(<MessageList messages={mockMessages} />);
    
    const userMessage = screen.getByText('Hello').closest('div');
    const assistantMessage = screen.getByText('Hi there!').closest('div');
    
    expect(userMessage?.parentElement).toHaveClass('justify-end');
    expect(assistantMessage?.parentElement).toHaveClass('justify-start');
  });
});
