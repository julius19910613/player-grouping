import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatInput } from '@/components/ChatInput';

describe('ChatInput', () => {
  it('should render input field', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    expect(screen.getByPlaceholderText(/输入消息/)).toBeInTheDocument();
  });

  it('should render send button', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
  });

  it('should send message when button clicked', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);
    
    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('should send message on Enter key', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    const input = screen.getByTestId('chat-input');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(onSend).toHaveBeenCalledWith('Hello');
  });

  it('should not send on Shift+Enter', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    const input = screen.getByTestId('chat-input');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', shiftKey: true });
    
    expect(onSend).not.toHaveBeenCalled();
  });

  it('should clear input after sending', async () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    const input = screen.getByTestId('chat-input') as HTMLTextAreaElement;
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    
    expect(input.value).toBe('');
  });

  it('should disable send button when input is empty', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    const sendButton = screen.getByTestId('send-button');
    
    expect(sendButton).toBeDisabled();
  });

  it('should disable send button when disabled prop is true', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} disabled />);
    
    const input = screen.getByTestId('chat-input');
    const sendButton = screen.getByTestId('send-button');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    expect(sendButton).toBeDisabled();
  });

  it('should show character count', () => {
    const onSend = vi.fn();
    render(<ChatInput onSend={onSend} />);
    
    const input = screen.getByTestId('chat-input');
    
    fireEvent.change(input, { target: { value: 'Hello' } });
    
    expect(screen.getByText('5 / 1000')).toBeInTheDocument();
  });
});
