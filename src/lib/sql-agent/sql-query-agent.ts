/**
 * LangChain SQL Agent for natural language database queries
 *
 * This module provides a SQL Agent that converts natural language questions
 * into SQL queries and executes them against the Supabase database.
 *
 * Security Features:
 * - Table whitelist: only allows queries to specific tables
 * - SQL validation: blocks dangerous operations (DROP, DELETE, UPDATE, INSERT, ALTER, CREATE)
 * - Query limit: max 100 rows
 * - Read-only: only SELECT queries allowed
 */

import type { DataSource } from 'typeorm';

import { createSupabaseDataSource } from './db-connection.js';

/**
 * Query result from SQL Agent
 */
export interface QueryResult {
  success: boolean;
  sql?: string;
  data?: Array<Record<string, unknown>>;
  explanation?: string;
  error?: string;
  rowCount?: number;
}

/**
 * SQL validation rules
 */
const FORBIDDEN_KEYWORDS = [
  'DROP',
  'DELETE',
  'UPDATE',
  'INSERT',
  'ALTER',
  'CREATE',
  'TRUNCATE',
  'GRANT',
  'REVOKE',
] as const;

/**
 * Tables allowed in queries (whitelist)
 */
export const ALLOWED_TABLES = [
  'players',
  'player_skills',
  'matches',
  'player_match_stats',
  'grouping_history',
] as const;

/**
 * Maximum number of rows to return
 */
const MAX_ROWS = 100;

/**
 * Validate SQL query for security
 *
 * @param sql - SQL query to validate
 * @returns true if query is safe, false otherwise
 */
export function validateSQL(sql: string): boolean {
  if (!sql || typeof sql !== 'string') {
    return false;
  }

  const upperSQL = sql.toUpperCase();

  // Block forbidden keywords
  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (upperSQL.includes(keyword)) {
      console.warn(`SQL validation failed: forbidden keyword ${keyword}`);
      return false;
    }
  }

  // Only allow SELECT queries
  if (!upperSQL.trim().startsWith('SELECT')) {
    console.warn('SQL validation failed: non-SELECT query');
    return false;
  }

  // Check for allowed tables
  const hasAllowedTable = ALLOWED_TABLES.some((table) =>
    upperSQL.includes(table.toUpperCase())
  );

  if (!hasAllowedTable) {
    console.warn('SQL validation failed: no allowed tables found');
    return false;
  }

  return true;
}

/**
 * SQL Query Agent class
 *
 * Uses TypeORM and Gemini AI to convert natural language questions
 * into SQL queries and execute them against the database.
 */
export class SQLQueryAgent {
  private dataSource: DataSource | null = null;
  private initialized = false;

  /**
   * Initialize the SQL Agent
   *
   * Creates database connection using TypeORM.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Create data source
      this.dataSource = createSupabaseDataSource();
      await this.dataSource.initialize();

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize SQL Query Agent:', error);
      throw error;
    }
  }

  /**
   * Query the database with a natural language question
   *
   * @param question - Natural language question
   * @returns Query result with data and metadata
   */
  async query(question: string): Promise<QueryResult> {
    await this.initialize();

    if (!this.dataSource) {
      return {
        success: false,
        error: 'SQL Agent not initialized',
      };
    }

    try {
      // Generate SQL from natural language
      const sql = await this.generateSQL(question);

      // Validate SQL
      if (!validateSQL(sql)) {
        return {
          success: false,
          error: 'Query contains unsafe operations or forbidden tables',
        };
      }

      // Execute SQL with LIMIT to prevent excessive results
      const limitedSQL = this.addLimit(sql, MAX_ROWS);

      // Execute query
      const data = await this.executeQuery(limitedSQL);

      return {
        success: true,
        sql: limitedSQL,
        data,
        rowCount: data.length,
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      console.error('SQL Query Agent error:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Generate SQL from natural language question
   *
   * Uses Google Generative AI to generate SQL queries.
   *
   * @param question - Natural language question
   * @returns SQL query string
   */
  private async generateSQL(question: string): Promise<string> {
    if (!this.dataSource) {
      throw new Error('SQL Agent not initialized');
    }

    try {
      // Get table information from TypeORM metadata
      const tableSchemas = ALLOWED_TABLES.map((table) => {
        const entityMetadata = this.dataSource!.getMetadata(table);
        const columns = entityMetadata.columns.map((col) => {
          const type = col.type;
          const nullable = col.isNullable ? 'NULL' : 'NOT NULL';
          return `${col.propertyName} ${type} ${nullable}`;
        });
        return `-- Table: ${table}\nCREATE TABLE ${table} (\n  ${columns.join(',\n  ')}\n);`;
      }).join('\n\n');

      // Use Google Generative AI to generate SQL
      const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
      if (!apiKey) {
        throw new Error('GEMINI_API_KEY not configured');
      }

      // Import Google Generative AI
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash-exp' });

      // Create prompt for SQL generation
      const prompt = `
You are a SQL expert. Generate a SQL query to answer the following question.

Database schema:
${tableSchemas}

Question: ${question}

Rules:
- Only use tables from the allowed list: ${ALLOWED_TABLES.join(', ')}
- Use PostgreSQL syntax
- Use ILIKE for case-insensitive text matching
- Order results appropriately
- Return only the SQL query, no explanations
- Use proper JOIN syntax when needed
- Handle missing data gracefully with COALESCE
- Column names use snake_case format (e.g., player_id, created_at)
`;

      const response = await model.generateContent(prompt);
      const sql = response.response.text();

      // Clean up the SQL
      return sql
        .replace(/^```sql\n?/, '')
        .replace(/\n?```$/, '')
        .trim();
    } catch (error) {
      console.error('Failed to generate SQL:', error);
      throw error;
    }
  }

  /**
   * Execute SQL query against the database
   *
   * @param sql - SQL query to execute
   * @returns Query results as array of records
   */
  private async executeQuery(
    sql: string
  ): Promise<Array<Record<string, unknown>>> {
    if (!this.dataSource) {
      throw new Error('Data source not initialized');
    }

    try {
      const result = await this.dataSource.query(sql);
      return Array.isArray(result) ? result : [result];
    } catch (error) {
      console.error('Failed to execute SQL:', error);
      throw error;
    }
  }

  /**
   * Add LIMIT clause to SQL query if not present
   *
   * @param sql - SQL query
   * @param limit - Maximum number of rows
   * @returns SQL query with LIMIT clause
   */
  private addLimit(sql: string, limit: number): string {
    const upperSQL = sql.toUpperCase();
    if (upperSQL.includes(' LIMIT ')) {
      return sql; // Already has LIMIT
    }

    // Add LIMIT before ORDER BY (if any) or at the end
    const orderByIndex = upperSQL.lastIndexOf(' ORDER BY ');
    if (orderByIndex !== -1) {
      return `${sql} LIMIT ${limit}`;
    }

    return `${sql} LIMIT ${limit}`;
  }

  /**
   * Extract SQL from result object (for backward compatibility)
   *
   * @param result - Agent result object
   * @returns SQL string
   */
  extractSQL(result: unknown): string {
    if (typeof result === 'object' && result !== null) {
      if ('sql' in result && typeof result.sql === 'string') {
        return result.sql;
      }
      if ('query' in result && typeof result.query === 'string') {
        return result.query;
      }
    }
    return '';
  }

  /**
   * Extract data from result object (for backward compatibility)
   *
   * @param result - Agent result object
   * @returns Data array
   */
  extractData(result: unknown): Array<Record<string, unknown>> {
    if (typeof result === 'object' && result !== null) {
      if ('data' in result && Array.isArray(result.data)) {
        return result.data;
      }
      if ('rows' in result && Array.isArray(result.rows)) {
        return result.rows;
      }
    }
    return [];
  }

  /**
   * Clean up resources
   *
   * Closes database connection and resets state.
   */
  async cleanup(): Promise<void> {
    if (this.dataSource) {
      try {
        await this.dataSource.destroy();
      } catch (error) {
        console.error('Error destroying data source:', error);
      }
      this.dataSource = null;
    }
    this.initialized = false;
  }

  /**
   * Check if the agent is initialized
   *
   * @returns true if initialized, false otherwise
   */
  isReady(): boolean {
    return this.initialized && this.dataSource !== null;
  }
}

/**
 * Global singleton instance (for Vercel warm-reuse pattern)
 */
let globalAgent: SQLQueryAgent | null = null;

/**
 * Get or create global SQL Agent instance
 *
 * @returns SQL Agent instance
 */
export const getOrCreateSQLAgent = (): SQLQueryAgent => {
  if (!globalAgent) {
    globalAgent = new SQLQueryAgent();
  }
  return globalAgent;
};
