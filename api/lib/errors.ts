/**
 * Error Handling Classes
 *
 * Custom error types for better error classification and handling.
 */

/**
 * MCP Error Types
 *
 * Categorizes different types of errors that can occur during MCP operations
 */
export enum MCPErrorType {
  CONNECTION_ERROR = 'CONNECTION_ERROR',
  TIMEOUT_ERROR = 'TIMEOUT_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  RLS_VIOLATION = 'RLS_VIOLATION',
  CIRCUIT_BREAKER_OPEN = 'CIRCUIT_BREAKER_OPEN',
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  UNKNOWN = 'UNKNOWN',
}

/**
 * MCP Error Class
 *
 * Base error class for MCP-related errors with type classification
 */
export class MCPError extends Error {
  constructor(
    public type: MCPErrorType,
    message: string,
    public originalError?: unknown,
    public context?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MCPError';
  }

  /**
   * Convert error to JSON for logging/serialization
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      context: this.context,
      originalError:
        this.originalError instanceof Error
          ? {
              name: this.originalError.name,
              message: this.originalError.message,
              stack: this.originalError.stack,
            }
          : this.originalError,
    };
  }
}

/**
 * Connection Error
 *
 * Thrown when MCP Server connection fails
 */
export class MCPConnectionError extends MCPError {
  constructor(message: string, originalError?: unknown) {
    super(MCPErrorType.CONNECTION_ERROR, message, originalError);
    this.name = 'MCPConnectionError';
  }
}

/**
 * Timeout Error
 *
 * Thrown when MCP operation times out
 */
export class MCPTimeoutError extends MCPError {
  constructor(timeoutMs: number, originalError?: unknown) {
    super(
      MCPErrorType.TIMEOUT_ERROR,
      `MCP operation timed out after ${timeoutMs}ms`,
      originalError,
      { timeoutMs }
    );
    this.name = 'MCPTimeoutError';
  }
}

/**
 * Validation Error
 *
 * Thrown when input validation fails
 */
export class MCPValidationError extends MCPError {
  constructor(message: string, validationErrors?: unknown) {
    super(MCPErrorType.VALIDATION_ERROR, message, validationErrors);
    this.name = 'MCPValidationError';
  }
}

/**
 * Circuit Breaker Open Error
 *
 * Thrown when circuit breaker is open and requests are rejected
 */
export class MCPCircuitBreakerError extends MCPError {
  constructor(message: string = 'Circuit breaker is open, rejecting request') {
    super(MCPErrorType.CIRCUIT_BREAKER_OPEN, message);
    this.name = 'MCPCircuitBreakerError';
  }
}

/**
 * Tool Not Found Error
 *
 * Thrown when requested tool doesn't exist
 */
export class MCPToolNotFoundError extends MCPError {
  constructor(toolName: string) {
    super(
      MCPErrorType.TOOL_NOT_FOUND,
      `Tool "${toolName}" not found`,
      undefined,
      { toolName }
    );
    this.name = 'MCPToolNotFoundError';
  }
}

/**
 * Classify an unknown error into an MCPErrorType
 *
 * @param error - The error to classify
 * @returns The classified error type
 */
export function classifyMCPError(error: unknown): MCPErrorType {
  if (error instanceof MCPError) {
    return error.type;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('econnrefused') || message.includes('connection')) {
      return MCPErrorType.CONNECTION_ERROR;
    }

    if (message.includes('timeout') || message.includes('timed out')) {
      return MCPErrorType.TIMEOUT_ERROR;
    }

    if (message.includes('circuit') || message.includes('open')) {
      return MCPErrorType.CIRCUIT_BREAKER_OPEN;
    }
  }

  return MCPErrorType.UNKNOWN;
}

/**
 * Wrap a generic error into an MCPError
 *
 * @param error - The error to wrap
 * @returns An MCPError instance
 */
export function wrapMCPError(error: unknown): MCPError {
  if (error instanceof MCPError) {
    return error;
  }

  const type = classifyMCPError(error);

  if (error instanceof Error) {
    switch (type) {
      case MCPErrorType.CONNECTION_ERROR:
        return new MCPConnectionError(error.message, error);
      case MCPErrorType.TIMEOUT_ERROR:
        return new MCPTimeoutError(5000, error);
      case MCPErrorType.CIRCUIT_BREAKER_OPEN:
        return new MCPCircuitBreakerError(error.message);
      default:
        return new MCPError(MCPErrorType.UNKNOWN, error.message, error);
    }
  }

  return new MCPError(MCPErrorType.UNKNOWN, String(error), error);
}

/**
 * Check if error is recoverable (should retry)
 *
 * @param error - The error to check
 * @returns True if error is recoverable
 */
export function isRecoverableError(error: unknown): boolean {
  const type = classifyMCPError(error);
  const recoverableTypes = [
    MCPErrorType.TIMEOUT_ERROR,
    MCPErrorType.CONNECTION_ERROR,
    MCPErrorType.UNKNOWN,
  ];

  return recoverableTypes.includes(type) && !(error instanceof MCPCircuitBreakerError);
}

/**
 * Check if error should trigger fallback
 *
 * @param error - The error to check
 * @returns True if error should trigger fallback
 */
export function shouldTriggerFallback(error: unknown): boolean {
  const type = classifyMCPError(error);
  const fallbackTypes = [
    MCPErrorType.CIRCUIT_BREAKER_OPEN,
    MCPErrorType.CONNECTION_ERROR,
  ];

  return fallbackTypes.includes(type);
}
