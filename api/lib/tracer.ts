/**
 * Tracing Utilities
 *
 * Request tracing and logging utilities for observability.
 */

import { randomUUID } from 'crypto';

/**
 * Generate a unique trace ID
 *
 * @returns A UUID v4 string for tracing
 */
export function generateTraceId(): string {
  return randomUUID();
}

/**
 * Get trace ID from headers or generate new one
 *
 * @param headers - Request headers (may contain x-trace-id)
 * @returns The trace ID from headers or a new one
 */
export function getTraceId(headers: Record<string, string | string[] | undefined>): string {
  const traceId = Array.isArray(headers['x-trace-id'])
    ? headers['x-trace-id'][0]
    : headers['x-trace-id'];
  return traceId || generateTraceId();
}

/**
 * Execute a function with tracing
 *
 * Logs the start and end of the operation with the trace ID.
 *
 * @param fn - Async function to execute
 * @param traceId - Optional trace ID (generates one if not provided)
 * @returns Result of the function
 */
export async function withTrace<T>(
  fn: (traceId: string) => Promise<T>,
  traceId?: string
): Promise<T> {
  const id = traceId || generateTraceId();
  const startTime = Date.now();

  console.log(`[${id}] Operation started`);

  try {
    const result = await fn(id);
    const duration = Date.now() - startTime;
    console.log(`[${id}] Operation completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${id}] Operation failed after ${duration}ms`, error);
    throw error;
  }
}

/**
 * Structured logger for API requests
 *
 * Creates consistent log entries with trace context
 */
export class StructuredLogger {
  constructor(private traceId: string) {}

  /**
   * Log an info message
   */
  info(message: string, data?: Record<string, unknown>): void {
    console.log(
      JSON.stringify({
        traceId: this.traceId,
        level: 'info',
        message,
        data,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Log a warning message
   */
  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(
      JSON.stringify({
        traceId: this.traceId,
        level: 'warn',
        message,
        data,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Log an error message
   */
  error(message: string, error?: unknown, data?: Record<string, unknown>): void {
    console.error(
      JSON.stringify({
        traceId: this.traceId,
        level: 'error',
        message,
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        } : error,
        data,
        timestamp: new Date().toISOString(),
      })
    );
  }

  /**
   * Log a debug message
   */
  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env.DEBUG === 'true') {
      console.debug(
        JSON.stringify({
          traceId: this.traceId,
          level: 'debug',
          message,
          data,
          timestamp: new Date().toISOString(),
        })
      );
    }
  }

  /**
   * Create a child logger with a suffix
   */
  child(suffix: string): StructuredLogger {
    return new StructuredLogger(`${this.traceId}:${suffix}`);
  }
}

/**
 * Create a structured logger instance
 *
 * @param traceId - Trace ID for the logger
 * @returns A new StructuredLogger instance
 */
export function createLogger(traceId: string): StructuredLogger {
  return new StructuredLogger(traceId);
}
