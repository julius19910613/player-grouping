/**
 * ChatView 组件测试
 * 测试聊天视图的渲染、交互和状态管理
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatView } from '@/components/ChatView';

const { mockSendMessageStream, mockClearHistory } = vi.hoisted(() => ({
  mockSendMessageStream: vi.fn().mockResolvedValue('这是 AI 的回复'),
  mockClearHistory: vi.fn(),
}));

vi.mock('@/services/chat-service', () => ({
  chatService: {
    sendMessageStream: mockSendMessageStream,
    clearHistory: mockClearHistory,
  },
}));

vi.mock('@/hooks/useKeyboardShortcut', () => ({
  useKeyboardShortcut: vi.fn(),
  SHORTCUTS: { OPEN_CHAT: { key: 'k' }, FOCUS_INPUT: { key: '/' } },
}));

vi.mock('@/lib/accessibility', () => ({
  screenReader: { createAnnouncer: vi.fn(), destroy: vi.fn(), announce: vi.fn() },
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

describe('ChatView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMessageStream.mockResolvedValue('这是 AI 的回复');
  });

  describe('渲染', () => {
    it('应该渲染欢迎信息', () => {
      render(<ChatView />);
      expect(screen.getByText('智能助手')).toBeInTheDocument();
      expect(screen.getByText(/你好！我是篮球球员分组助手/)).toBeInTheDocument();
    });

    it('应该渲染输入框和发送按钮', () => {
      render(<ChatView />);
      
      expect(screen.getByPlaceholderText(/输入消息/)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /发送/i })).toBeInTheDocument();
    });

    it('应该显示快捷键提示', () => {
      render(<ChatView />);
      // 快捷键区包含 Enter 发送 · Shift + Enter，用更精确的匹配避免命中多处
      const shortcutEl = screen.getAllByText((_, el) => 
        /Enter\s+发送.*Shift\s*\+\s*Enter/.test(el?.textContent ?? '')
      );
      expect(shortcutEl.length).toBeGreaterThan(0);
    });
  });

  describe('发送消息', () => {
    it('应该能够发送消息', async () => {
      mockSendMessageStream.mockImplementation(async (_msg, onChunk) => {
        onChunk('这是 AI 的回复');
        return '这是 AI 的回复';
      });

      render(<ChatView />);

      const input = screen.getByPlaceholderText(/输入消息/) as HTMLTextAreaElement;
      await userEvent.type(input, '测试');
      await userEvent.click(screen.getByRole('button', { name: /发送/i }));

      // 发送后输入框清空，说明 handleSend 已执行
      await waitFor(() => expect(input.value).toBe(''));
      expect(mockSendMessageStream).toHaveBeenCalledWith('测试', expect.any(Function), expect.any(Array), expect.any(Object));

      await waitFor(() => {
        expect(screen.getByText('测试')).toBeInTheDocument();
        expect(screen.getByText('这是 AI 的回复')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该能够使用 Enter 键发送消息', async () => {
      mockSendMessageStream.mockImplementation(async (_msg, onChunk) => {
        onChunk('AI 回复');
        return 'AI 回复';
      });

      render(<ChatView />);

      const input = screen.getByPlaceholderText(/输入消息/) as HTMLTextAreaElement;
      await userEvent.type(input, '测试{enter}');

      await waitFor(() => expect(input.value).toBe(''));
      expect(mockSendMessageStream).toHaveBeenCalledWith('测试', expect.any(Function), expect.any(Array), expect.any(Object));

      await waitFor(() => {
        expect(screen.getByText('测试')).toBeInTheDocument();
        expect(screen.getByText('AI 回复')).toBeInTheDocument();
      }, { timeout: 3000 });
    });

    it('应该能够使用 Shift+Enter 换行', async () => {
      render(<ChatView />);

      const input = screen.getByPlaceholderText(/输入消息/) as HTMLTextAreaElement;

      // 输入消息并按 Shift+Enter
      await userEvent.type(input, '第一行{shift>}{enter}{/shift}第二行');

      expect(input.value).toBe('第一行\n第二行');
    });

    it('发送时应该清空输入框', async () => {
      mockSendMessageStream.mockImplementation(async (_msg, onChunk) => {
        onChunk('回复');
        return '回复';
      });

      render(<ChatView />);

      const input = screen.getByPlaceholderText(/输入消息/) as HTMLTextAreaElement;
      await userEvent.type(input, '测试');
      await userEvent.click(screen.getByRole('button', { name: /发送/i }));

      await waitFor(() => {
        expect(input.value).toBe('');
      });
    });

    it('应该禁用空消息发送', () => {
      render(<ChatView />);

      const sendButton = screen.getByRole('button', { name: /发送/i });
      expect(sendButton).toBeDisabled();
    });
  });

  describe('加载状态', () => {
    it('发送消息时应该显示加载指示器', async () => {
      let resolvePromise: any;
      mockSendMessageStream.mockImplementation(async (_msg, onChunk) => {
        return new Promise(resolve => {
          resolvePromise = resolve;
        });
      });

      render(<ChatView />);

      const input = screen.getByPlaceholderText(/输入消息/);
      await userEvent.type(input, '测试{enter}');

      // 应该显示加载状态（按钮显示"生成中..."或变为禁用）
      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /发送|生成中|正在生成/i });
        expect(sendButton).toBeDisabled();
      }, { timeout: 3000 });

      // 完成请求
      resolvePromise('回复');

      // 加载状态应该消失
      await waitFor(() => {
        const sendButton = screen.getByRole('button', { name: /发送/i });
        expect(sendButton).toHaveTextContent('发送');
      });
    });

    it('加载时应该禁用输入', async () => {
      mockSendMessageStream.mockImplementation(async () => new Promise(() => {}));

      render(<ChatView />);

      const input = screen.getByPlaceholderText(/输入消息/);
      await userEvent.type(input, '测试{enter}');

      await waitFor(() => {
        expect(input).toBeDisabled();
      });
    });
  });

  describe('错误处理', () => {
    it('应该处理错误并移除用户消息', async () => {
      mockSendMessageStream.mockRejectedValue({
        code: 'ERROR',
        message: '错误',
        retryable: false,
      });

      render(<ChatView />);

      const input = screen.getByPlaceholderText(/输入消息/);
      await userEvent.type(input, '测试{enter}');

      // 等待消息被移除
      await waitFor(() => {
        expect(screen.queryByText('测试')).not.toBeInTheDocument();
      });
    });
  });

  describe('清空对话', () => {
    it('应该能够清空对话', async () => {
      mockSendMessageStream.mockImplementation(async (_msg, onChunk) => {
        onChunk('回复');
        return '回复';
      });

      render(<ChatView />);

      // 发送一条消息
      const input = screen.getByPlaceholderText(/输入消息/);
      await userEvent.type(input, '测试{enter}');

      await waitFor(() => {
        expect(screen.getByText('测试')).toBeInTheDocument();
      });

      // 点击清空按钮
      window.confirm = vi.fn(() => true);
      const clearButton = screen.getByRole('button', { name: /清空对话/i });
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.queryByText('测试')).not.toBeInTheDocument();
        expect(mockClearHistory).toHaveBeenCalled();
      });
    });
  });

  describe('无障碍', () => {
    it('应该有正确的 ARIA 标签', () => {
      render(<ChatView />);
      
      expect(screen.getByRole('main', { name: /聊天助手/i })).toBeInTheDocument();
      expect(screen.getByRole('log', { name: /聊天消息列表/i })).toBeInTheDocument();
    });

    it('输入框应该有正确的无障碍属性', () => {
      render(<ChatView />);
      
      const input = screen.getByLabelText(/消息输入框/i);
      expect(input).toBeInTheDocument();
    });
  });
});
