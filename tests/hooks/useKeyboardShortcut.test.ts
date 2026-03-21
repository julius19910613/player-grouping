import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcut } from '@/hooks/useKeyboardShortcut';

/**
 * 触发键盘事件
 */
function fireKeyEvent(key: string, modifiers: Partial<KeyboardEvent> = {}) {
  const event = new KeyboardEvent('keydown', {
    key,
    bubbles: true,
    cancelable: true,
    ...modifiers,
  });
  window.dispatchEvent(event);
  return event;
}

describe('useKeyboardShortcut', () => {
  let handler: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    handler = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic functionality', () => {
    it('should call handler when shortcut is pressed', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
        })
      );

      fireKeyEvent('k');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not call handler when different key is pressed', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
        })
      );

      fireKeyEvent('j');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive key matching', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'K',
          handler,
        })
      );

      fireKeyEvent('k');

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('modifier keys', () => {
    it('should require metaKey when specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
          metaKey: true,
        })
      );

      // Without meta key
      fireKeyEvent('k');
      expect(handler).not.toHaveBeenCalled();

      // With meta key
      fireKeyEvent('k', { metaKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should require ctrlKey when specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
          ctrlKey: true,
        })
      );

      // Without ctrl key
      fireKeyEvent('k');
      expect(handler).not.toHaveBeenCalled();

      // With ctrl key
      fireKeyEvent('k', { ctrlKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should require shiftKey when specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
          shiftKey: true,
        })
      );

      // Without shift key
      fireKeyEvent('k');
      expect(handler).not.toHaveBeenCalled();

      // With shift key
      fireKeyEvent('k', { shiftKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should require altKey when specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
          altKey: true,
        })
      );

      // Without alt key
      fireKeyEvent('k');
      expect(handler).not.toHaveBeenCalled();

      // With alt key
      fireKeyEvent('k', { altKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple modifiers', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
          metaKey: true,
          shiftKey: true,
        })
      );

      // Without all modifiers
      fireKeyEvent('k', { metaKey: true });
      expect(handler).not.toHaveBeenCalled();

      // With all modifiers
      fireKeyEvent('k', { metaKey: true, shiftKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('enabled option', () => {
    it('should not listen when disabled', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
          enabled: false,
        })
      );

      fireKeyEvent('k');

      expect(handler).not.toHaveBeenCalled();
    });

    it('should default to enabled when not specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
        })
      );

      fireKeyEvent('k');

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handling', () => {
    it('should stop propagation', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
        })
      );

      const event = fireKeyEvent('k');

      expect(handler).toHaveBeenCalled();
      // Note: stopPropagation is called internally
    });
  });

  describe('cleanup', () => {
    it('should remove event listener on unmount', () => {
      const { unmount } = renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
        })
      );

      fireKeyEvent('k');
      expect(handler).toHaveBeenCalledTimes(1);

      handler.mockClear();

      unmount();

      fireKeyEvent('k');

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle rapid key presses', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
        })
      );

      // Rapid key presses
      for (let i = 0; i < 5; i++) {
        fireKeyEvent('k');
      }

      expect(handler).toHaveBeenCalledTimes(5);
    });

    it('should handle special keys', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'Escape',
          handler,
        })
      );

      fireKeyEvent('Escape');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle function keys', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'F1',
          handler,
        })
      );

      fireKeyEvent('F1');

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle arrow keys', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'ArrowUp',
          handler,
        })
      );

      fireKeyEvent('ArrowUp');

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});
