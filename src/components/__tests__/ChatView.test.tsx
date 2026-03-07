import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ChatView } from '../ChatView';

describe('ChatView', () => {
  it('should render chat interface', () => {
    render(<ChatView />);
    
    expect(screen.getByTestId('chat-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('should show welcome message initially', () => {
    render(<ChatView />);
    
    expect(screen.getByText('欢迎使用智能助手')).toBeInTheDocument();
  });

  it('should add user message when sent', async () => {
    render(<ChatView />);
    
    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');
    
    fireEvent.change(input, { target: { value: 'Test message' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText('Test message')).toBeInTheDocument();
    });
  });

  it('should show loading indicator while processing', async () => {
    render(<ChatView />);
    
    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');
    
    fireEvent.change(input, { target: { value: 'Test' } });
    fireEvent.click(sendButton);
    
    // Loading indicator should appear immediately
    expect(screen.getByTestId('loading-indicator')).toBeInTheDocument();
  });

  it('should receive assistant response after sending', async () => {
    render(<ChatView />);
    
    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);
    
    await waitFor(() => {
      expect(screen.getByText(/收到您的消息：Hello/)).toBeInTheDocument();
    }, { timeout: 2000 });
  });
});
