/**
 * 自定义 Hook - 全局快捷键
 * 支持组合键（Cmd/Ctrl + Key）
 */

import { useEffect, useCallback } from 'react';

type KeyHandler = (event: KeyboardEvent) => void;

interface KeyboardShortcutOptions {
  key: string;
  ctrlKey?: boolean;
  metaKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  handler: KeyHandler;
  preventDefault?: boolean;
  enabled?: boolean;
}

/**
 * 全局快捷键 Hook
 * @param options 快捷键配置
 */
export function useKeyboardShortcut(options: KeyboardShortcutOptions) {
  const {
    key,
    ctrlKey = false,
    metaKey = false,
    shiftKey = false,
    altKey = false,
    handler,
    preventDefault = true,
    enabled = true,
  } = options;

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // 检查是否匹配快捷键
      const keyMatch = event.key.toLowerCase() === key.toLowerCase();
      const ctrlMatch = ctrlKey ? event.ctrlKey || event.metaKey : true;
      const metaMatch = metaKey ? event.metaKey : true;
      const shiftMatch = shiftKey ? event.shiftKey : true;
      const altMatch = altKey ? event.altKey : true;

      if (keyMatch && ctrlMatch && metaMatch && shiftMatch && altMatch) {
        if (preventDefault) {
          event.preventDefault();
        }
        handler(event);
      }
    },
    [key, ctrlKey, metaKey, shiftKey, altKey, handler, preventDefault]
  );

  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [handleKeyDown, enabled]);
}

/**
 * 预定义的快捷键配置
 */
export const SHORTCUTS = {
  // 聊天相关
  OPEN_CHAT: {
    key: 'k',
    metaKey: true,
    description: '打开聊天',
  },
  SEND_MESSAGE: {
    key: 'Enter',
    description: '发送消息',
  },
  NEW_LINE: {
    key: 'Enter',
    shiftKey: true,
    description: '换行',
  },
  
  // 导航相关
  FOCUS_INPUT: {
    key: '/',
    description: '聚焦输入框',
  },
  
  // 消息操作
  COPY_MESSAGE: {
    key: 'c',
    metaKey: true,
    description: '复制消息',
  },
  REGENERATE: {
    key: 'r',
    metaKey: true,
    shiftKey: true,
    description: '重新生成',
  },
} as const;

/**
 * 快捷键管理 Hook
 * 统一管理多个快捷键
 */
export function useKeyboardShortcuts(
  shortcuts: Array<KeyboardShortcutOptions>
) {
  shortcuts.forEach((shortcut) => {
    useKeyboardShortcut(shortcut);
  });
}
