/**
 * 无障碍工具函数
 * 提供 ARIA 标签、键盘导航、屏幕阅读器支持
 */

/**
 * 生成唯一的 ARIA ID
 */
export function generateAriaId(prefix: string = 'aria'): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * 键盘导航处理
 */
export function handleKeyboardNavigation(
  event: React.KeyboardEvent,
  options: {
    onEnter?: () => void;
    onSpace?: () => void;
    onEscape?: () => void;
    onArrowUp?: () => void;
    onArrowDown?: () => void;
    onArrowLeft?: () => void;
    onArrowRight?: () => void;
    onTab?: () => void;
    preventDefault?: boolean;
  }
) {
  const { preventDefault = true } = options;

  switch (event.key) {
    case 'Enter':
      if (options.onEnter) {
        if (preventDefault) event.preventDefault();
        options.onEnter();
      }
      break;
    case ' ':
      if (options.onSpace) {
        if (preventDefault) event.preventDefault();
        options.onSpace();
      }
      break;
    case 'Escape':
      if (options.onEscape) {
        if (preventDefault) event.preventDefault();
        options.onEscape();
      }
      break;
    case 'ArrowUp':
      if (options.onArrowUp) {
        if (preventDefault) event.preventDefault();
        options.onArrowUp();
      }
      break;
    case 'ArrowDown':
      if (options.onArrowDown) {
        if (preventDefault) event.preventDefault();
        options.onArrowDown();
      }
      break;
    case 'ArrowLeft':
      if (options.onArrowLeft) {
        if (preventDefault) event.preventDefault();
        options.onArrowLeft();
      }
      break;
    case 'ArrowRight':
      if (options.onArrowRight) {
        if (preventDefault) event.preventDefault();
        options.onArrowRight();
      }
      break;
    case 'Tab':
      if (options.onTab) {
        options.onTab();
      }
      break;
  }
}

/**
 * 焦点管理
 */
export class FocusManager {
  private focusableElements = [
    'button',
    '[href]',
    'input',
    'select',
    'textarea',
    '[tabindex]:not([tabindex="-1"])',
  ].join(', ');

  /**
   * 获取容器内的所有可聚焦元素
   */
  getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll(this.focusableElements));
  }

  /**
   * 焦点陷阱（用于模态框）
   */
  trapFocus(container: HTMLElement, event: KeyboardEvent) {
    const focusable = this.getFocusableElements(container);
    const firstFocusable = focusable[0];
    const lastFocusable = focusable[focusable.length - 1];

    if (event.key === 'Tab') {
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable.focus();
        }
      }
    }
  }

  /**
   * 将焦点移到容器内的第一个可聚焦元素
   */
  focusFirst(container: HTMLElement) {
    const focusable = this.getFocusableElements(container);
    if (focusable.length > 0) {
      focusable[0].focus();
    }
  }
}

/**
 * 屏幕阅读器公告
 */
export class ScreenReaderAnnouncer {
  private announcerElement: HTMLElement | null = null;

  /**
   * 创建公告元素
   */
  createAnnouncer() {
    if (this.announcerElement) return;

    this.announcerElement = document.createElement('div');
    this.announcerElement.setAttribute('role', 'status');
    this.announcerElement.setAttribute('aria-live', 'polite');
    this.announcerElement.setAttribute('aria-atomic', 'true');
    this.announcerElement.className = 'sr-only';
    this.announcerElement.style.cssText = `
      position: absolute;
      width: 1px;
      height: 1px;
      padding: 0;
      margin: -1px;
      overflow: hidden;
      clip: rect(0, 0, 0, 0);
      white-space: nowrap;
      border: 0;
    `;
    document.body.appendChild(this.announcerElement);
  }

  /**
   * 公告消息
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    if (!this.announcerElement) {
      this.createAnnouncer();
    }

    if (this.announcerElement) {
      this.announcerElement.setAttribute('aria-live', priority);
      this.announcerElement.textContent = '';
      
      // 使用 timeout 确保屏幕阅读器能够捕捉到变化
      setTimeout(() => {
        if (this.announcerElement) {
          this.announcerElement.textContent = message;
        }
      }, 100);
    }
  }

  /**
   * 销毁公告元素
   */
  destroy() {
    if (this.announcerElement) {
      this.announcerElement.remove();
      this.announcerElement = null;
    }
  }
}

/**
 * 全局屏幕阅读器公告实例
 */
export const screenReader = new ScreenReaderAnnouncer();
