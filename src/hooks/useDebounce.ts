/**
 * 自定义 Hook - 防抖
 * 用于延迟执行频繁触发的操作
 */

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * 防抖值 Hook
 * @param value 需要防抖的值
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的值
 */
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * 防抖函数 Hook
 * @param fn 需要防抖的函数
 * @param delay 延迟时间（毫秒）
 * @returns 防抖后的函数
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fnRef = useRef(fn);

  // 更新函数引用
  useEffect(() => {
    fnRef.current = fn;
  }, [fn]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const debouncedFn = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        fnRef.current(...args);
      }, delay);
    },
    [delay]
  );

  return debouncedFn;
}

/**
 * 防抖搜索 Hook
 * @param initialQuery 初始搜索词
 * @param delay 延迟时间（毫秒）
 * @returns [搜索词, 设置搜索词, 防抖后的搜索词]
 */
export function useDebouncedSearch(
  initialQuery: string = '',
  delay: number = 300
): [string, (query: string) => void, string] {
  const [query, setQuery] = useState(initialQuery);
  const debouncedQuery = useDebounce(query, delay);

  return [query, setQuery, debouncedQuery];
}
