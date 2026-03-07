import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useKeyboardShortcut } from '../useKeyboardShortcut';

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

      fireEvent.keyDown(window, { key: 'k' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should not call handler when different key is pressed', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
        })
      );

      fireEvent.keyDown(window, { key: 'j' });

      expect(handler).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive key matching', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'K',
          handler,
        })
      );

      fireEvent.keyDown(window, { key: 'k' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('modifier keys', () => {
    it('should require metaKey when specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          metaKey: true,
          handler,
        })
      );

      // Without meta key
      fireEvent.keyDown(window, { key: 'k' });
      expect(handler).not.toHaveBeenCalled();

      // With meta key
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should require ctrlKey when specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          ctrlKey: true,
          handler,
        })
      );

      // Without ctrl key
      fireEvent.keyDown(window, { key: 'k' });
      expect(handler).not.toHaveBeenCalled();

      // With ctrl key
      fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should require shiftKey when specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          shiftKey: true,
          handler,
        })
      );

      // Without shift key
      fireEvent.keyDown(window, { key: 'k' });
      expect(handler).not.toHaveBeenCalled();

      // With shift key
      fireEvent.keyDown(window, { key: 'k', shiftKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should require altKey when specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          altKey: true,
          handler,
        })
      );

      // Without alt key
      fireEvent.keyDown(window, { key: 'k' });
      expect(handler).not.toHaveBeenCalled();

      // With alt key
      fireEvent.keyDown(window, { key: 'k', altKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple modifiers', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          metaKey: true,
          shiftKey: true,
          handler,
        })
      );

      // Without all modifiers
      fireEvent.keyDown(window, { key: 'k', metaKey: true });
      expect(handler).not.toHaveBeenCalled();

      // With all modifiers
      fireEvent.keyDown(window, { key: 'k', metaKey: true, shiftKey: true });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('enabled option', () => {
    it('should not listen when disabled', () => {
      const { rerender } = renderHook(
        ({ enabled }) =>
          useKeyboardShortcut({
            key: 'k',
            handler,
            enabled,
          }),
        { initialProps: { enabled: false } }
      );

      fireEvent.keyDown(window, { key: 'k' });
      expect(handler).not.toHaveBeenCalled();

      // Enable and try again
      rerender({ enabled: true });
      fireEvent.keyDown(window, { key: 'k' });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should default to enabled when not specified', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          handler,
        })
      );

      fireEvent.keyDown(window, { key: 'k' });
      expect(handler).toHaveBeenCalledTimes(1);
    });
  });

  describe('event handling', () => {
    it('should prevent default behavior', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          metaKey: true,
          handler,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).toHaveBeenCalled();
    });

    it('should stop propagation', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          metaKey: true,
          handler,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'k',
        metaKey: true,
        bubbles: true,
      });

      const stopPropagationSpy = vi.spyOn(event, 'stopPropagation');

      window.dispatchEvent(event);

      expect(stopPropagationSpy).toHaveBeenCalled();
    });

    it('should not prevent default when shortcut not matched', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'k',
          metaKey: true,
          handler,
        })
      );

      const event = new KeyboardEvent('keydown', {
        key: 'j',
        metaKey: true,
        bubbles: true,
      });

      const preventDefaultSpy = vi.spyOn(event, 'preventDefault');

      window.dispatchEvent(event);

      expect(preventDefaultSpy).not.toHaveBeenCalled();
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

      unmount();

      fireEvent.keyDown(window, { key: 'k' });

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
        fireEvent.keyDown(window, { key: 'k' });
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

      fireEvent.keyDown(window, { key: 'Escape' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle function keys', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'F1',
          handler,
        })
      );

      fireEvent.keyDown(window, { key: 'F1' });

      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('should handle arrow keys', () => {
      renderHook(() =>
        useKeyboardShortcut({
          key: 'ArrowUp',
          handler,
        })
      );

      fireEvent.keyDown(window, { key: 'ArrowUp' });

      expect(handler).toHaveBeenCalledTimes(1);
    });
  });
});

// Helper to fire keyboard events
function fireEvent(keyDownTarget: Window, eventInit: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', eventInit);
  keyDownTarget.dispatchEvent(event);
}
