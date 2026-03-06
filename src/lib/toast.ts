import { toast } from 'sonner';

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface ToastOptions {
  duration?: number;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * 显示 Toast 通知
 * 
 * @example
 * showToast('success', '保存成功');
 * showToast('error', '导入失败：文件格式不正确');
 * showToast('success', '成功导入 18 名球员', { description: '点击查看详情' });
 */
export function showToast(
  type: ToastType, 
  message: string, 
  options?: ToastOptions
) {
  switch (type) {
    case 'success':
      toast.success(message, {
        duration: options?.duration ?? 3000,
        description: options?.description,
        action: options?.action,
      });
      break;
    case 'error':
      toast.error(message, {
        duration: options?.duration ?? Infinity,
        description: options?.description,
        action: options?.action,
      });
      break;
    case 'warning':
      toast.warning(message, {
        duration: options?.duration ?? 5000,
        description: options?.description,
        action: options?.action,
      });
      break;
    case 'info':
      toast.info(message, {
        duration: options?.duration ?? 4000,
        description: options?.description,
        action: options?.action,
      });
      break;
    case 'loading':
      toast.loading(message, {
        duration: options?.duration ?? Infinity,
        description: options?.description,
      });
      break;
  }
}

/**
 * 显示 Promise Toast
 * 
 * @example
 * showPromiseToast(
 *   saveData(data),
 *   {
 *     loading: '正在保存...',
 *     success: '保存成功！',
 *     error: '保存失败',
 *   }
 * );
 */
export function showPromiseToast<T>(
  promise: Promise<T>,
  messages: {
    loading: string;
    success: string | ((data: T) => string);
    error: string | ((error: Error) => string);
  }
) {
  return toast.promise(promise, messages);
}

/**
 * 关闭 Toast
 */
export function dismissToast(toastId?: string | number) {
  toast.dismiss(toastId);
}

// 便捷方法
export const toastSuccess = (message: string, options?: ToastOptions) => 
  showToast('success', message, options);

export const toastError = (message: string, options?: ToastOptions) => 
  showToast('error', message, options);

export const toastWarning = (message: string, options?: ToastOptions) => 
  showToast('warning', message, options);

export const toastInfo = (message: string, options?: ToastOptions) => 
  showToast('info', message, options);

export const toastLoading = (message: string, options?: ToastOptions) => 
  showToast('loading', message, options);
