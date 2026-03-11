/**
 * MCP Client Manager
 *
 * Manages connection to Supabase MCP Server with circuit breaker,
 * timeout, and retry mechanisms for robustness.
 */

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import type { Tool, CallToolResult } from '@modelcontextprotocol/sdk/types.js';

/**
 * Circuit Breaker States
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',     // Normal operation
  OPEN = 'OPEN',         // Circuit is open, rejecting requests
  HALF_OPEN = 'HALF_OPEN', // Testing if service is recovered
}

/**
 * Circuit Breaker Configuration
 */
interface CircuitBreakerConfig {
  failureThreshold: number;  // Number of failures before opening
  recoveryTimeout: number;   // Milliseconds before attempting recovery
  halfOpenMaxCalls: number;  // Number of calls allowed in half-open state
}

/**
 * Circuit Breaker Class
 */
class CircuitBreaker {
  private state: CircuitBreakerState = CircuitBreakerState.CLOSED;
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private halfOpenCalls: number = 0;

  constructor(private config: CircuitBreakerConfig) {}

  /**
   * Check if the circuit allows a request to proceed
   */
  canProceed(): boolean {
    const now = Date.now();

    // If circuit is open and recovery timeout has passed, try half-open
    if (this.state === CircuitBreakerState.OPEN) {
      if (now - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = CircuitBreakerState.HALF_OPEN;
        this.halfOpenCalls = 0;
        console.log('[CircuitBreaker] Entering HALF_OPEN state');
      } else {
        return false;
      }
    }

    // If in half-open, limit number of calls
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      if (this.halfOpenCalls >= this.config.halfOpenMaxCalls) {
        return false;
      }
      this.halfOpenCalls++;
    }

    return true;
  }

  /**
   * Record a successful call
   */
  recordSuccess(): void {
    this.failures = 0;
    if (this.state === CircuitBreakerState.HALF_OPEN) {
      this.state = CircuitBreakerState.CLOSED;
      console.log('[CircuitBreaker] Recovered, entering CLOSED state');
    }
  }

  /**
   * Record a failed call
   */
  recordFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.config.failureThreshold) {
      this.state = CircuitBreakerState.OPEN;
      this.halfOpenCalls = 0;
      console.error(`[CircuitBreaker] Threshold reached, entering OPEN state. Failures: ${this.failures}`);
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return this.state;
  }

  /**
   * Reset circuit breaker
   */
  reset(): void {
    this.state = CircuitBreakerState.CLOSED;
    this.failures = 0;
    this.lastFailureTime = 0;
    this.halfOpenCalls = 0;
    console.log('[CircuitBreaker] Manually reset');
  }
}

/**
 * MCP Client Manager Class
 *
 * Singleton pattern with connection pooling, circuit breaker,
 * and retry mechanisms.
 */
export class MCPClientManager {
  private static instance: MCPClientManager;
  private client: Client | null = null;
  private transport: StdioClientTransport | null = null;
  private connected: boolean = false;
  private projectId: string | null = null;
  private circuitBreaker: CircuitBreaker;
  private toolsCache: Tool[] | null = null;

  // Circuit breaker config: open after 5 failures, try recovery after 60s
  private readonly CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000,
    halfOpenMaxCalls: 3,
  };

  // Retry config: max 3 retries with exponential backoff
  private readonly MAX_RETRIES = 3;
  private readonly TIMEOUT_MS = 5000;

  private constructor() {
    this.circuitBreaker = new CircuitBreaker(this.CIRCUIT_BREAKER_CONFIG);
    this.client = new Client(
      { name: 'player-grouping-chat', version: '1.0.0' },
      { capabilities: {} }
    );
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MCPClientManager {
    if (!MCPClientManager.instance) {
      MCPClientManager.instance = new MCPClientManager();
    }
    return MCPClientManager.instance;
  }

  /**
   * Connect to Supabase MCP Server
   *
   * Authentication flow:
   * 1. Uses SUPABASE_PROJECT_ID from environment
   * 2. MCP Server uses SUPABASE_ANON_KEY from its own environment
   * 3. All queries execute in anon context
   * 4. RLS policies are enforced on the database server
   * 5. Does NOT use service_role key to avoid privilege escalation
   */
  async connect(projectId: string): Promise<void> {
    if (this.connected && this.projectId === projectId) {
      console.log('[MCPClientManager] Already connected');
      return;
    }

    // Disconnect if connecting to a different project
    if (this.connected) {
      await this.disconnect();
    }

    this.projectId = projectId;

    try {
      console.log(`[MCPClientManager] Connecting to Supabase MCP Server for project: ${projectId}`);

      this.transport = new StdioClientTransport({
        command: 'npx',
        args: ['@supabase/mcp-server', '--project-id', projectId],
      });

      if (this.client) {
        await this.client.connect(this.transport);
        this.connected = true;
        console.log('[MCPClientManager] Connected successfully');
      }
    } catch (error) {
      console.error('[MCPClientManager] Connection failed:', error);
      this.connected = false;
      this.transport = null;
      throw error;
    }
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Get all available tools from MCP Server
   */
  async getTools(): Promise<Tool[]> {
    if (!this.connected || !this.client) {
      throw new Error('MCP Client not connected');
    }

    if (this.toolsCache) {
      console.log('[MCPClientManager] Returning cached tools');
      return this.toolsCache;
    }

    try {
      const { tools } = await this.client.listTools();
      this.toolsCache = tools;
      console.log(`[MCPClientManager] Retrieved ${tools.length} tools from MCP Server`);
      return tools;
    } catch (error) {
      console.error('[MCPClientManager] Failed to get tools:', error);
      this.circuitBreaker.recordFailure();
      throw error;
    }
  }

  /**
   * Call a tool with circuit breaker, timeout, and retry
   */
  async callTool(
    name: string,
    args: Record<string, unknown>,
    retries: number = this.MAX_RETRIES,
    timeout: number = this.TIMEOUT_MS
  ): Promise<CallToolResult> {
    // Check circuit breaker
    if (!this.circuitBreaker.canProceed()) {
      throw new Error(
        `Circuit breaker is ${this.circuitBreaker.getState()}. Rejecting tool call to ${name}`
      );
    }

    let lastError: Error | unknown = null;

    for (let i = 0; i < retries; i++) {
      try {
        console.log(`[MCPClientManager] Calling tool: ${name} (attempt ${i + 1}/${retries})`);

        if (!this.client || !this.connected) {
          throw new Error('MCP Client not connected');
        }

        // Create timeout controller
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        // Race between tool call and timeout
        const result = await Promise.race([
          this.client.callTool({ name, arguments: args }),
          new Promise<never>((_, reject) =>
            controller.signal.addEventListener('abort', () =>
              reject(new Error(`Tool call timeout after ${timeout}ms`))
            )
          ),
        ]);

        clearTimeout(timeoutId);

        // Record success and reset circuit breaker
        this.circuitBreaker.recordSuccess();

        console.log(`[MCPClientManager] Tool call successful: ${name}`);
        return result;
      } catch (error) {
        lastError = error;
        console.error(`[MCPClientManager] Tool call failed (attempt ${i + 1}):`, error);

        // Record failure in circuit breaker
        this.circuitBreaker.recordFailure();

        // Check if circuit is now open
        if (this.circuitBreaker.getState() === CircuitBreakerState.OPEN) {
          break; // Don't retry if circuit is open
        }

        // Exponential backoff: 100ms, 200ms, 400ms, etc.
        const backoffDelay = Math.pow(2, i) * 100;
        if (i < retries - 1) {
          await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        }
      }
    }

    const errorMessage =
      lastError instanceof Error ? lastError.message : String(lastError);
    throw new Error(`Tool call failed after ${retries} retries: ${errorMessage}`);
  }

  /**
   * Get circuit breaker state for monitoring
   */
  getCircuitBreakerState(): CircuitBreakerState {
    return this.circuitBreaker.getState();
  }

  /**
   * Manually reset circuit breaker (for recovery)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Disconnect from MCP Server
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      try {
        await this.client.close();
        console.log('[MCPClientManager] Disconnected');
      } catch (error) {
        console.error('[MCPClientManager] Disconnect error:', error);
      }
    }

    this.transport = null;
    this.connected = false;
    this.projectId = null;
    this.toolsCache = null;
  }

  /**
   * Clear tools cache (force refresh on next getTools call)
   */
  clearToolsCache(): void {
    this.toolsCache = null;
    console.log('[MCPClientManager] Tools cache cleared');
  }
}

/**
 * Global singleton for Vercel hot-reuse pattern
 *
 * In Vercel serverless functions, we use global variables to
 * persist connections between warm invocations, reducing cold
 * start latency.
 */
declare global {
  var __mcpManager: MCPClientManager | undefined;
  var __toolsCache: Tool[] | undefined;
}

/**
 * Initialize or get the global MCP manager
 *
 * This function handles Vercel's serverless environment by
 * caching the MCP manager instance globally for reuse across
 * warm invocations.
 */
export async function getOrCreateMCPManager(): Promise<MCPClientManager> {
  const projectId = process.env.SUPABASE_PROJECT_ID;

  if (!projectId) {
    throw new Error('SUPABASE_PROJECT_ID environment variable not configured');
  }

  // Reuse global instance if available (warm start)
  if (global.__mcpManager && global.__mcpManager.isConnected()) {
    console.log('[MCPManager] Reusing existing global instance');
    return global.__mcpManager;
  }

  // Create new instance
  console.log('[MCPManager] Creating new instance');
  const manager = MCPClientManager.getInstance();
  await manager.connect(projectId);

  // Cache globally
  global.__mcpManager = manager;

  return manager;
}
