/**
 * Database connection configuration for LangChain SQL Agent
 *
 * This module provides a TypeORM DataSource configured for Supabase PostgreSQL.
 * It's used by the SQL Agent to execute natural language queries.
 */

import type { DataSource, DataSourceOptions } from 'typeorm';

/**
 * Supabase database connection options
 */
const getSupabaseConnectionOptions = (): DataSourceOptions => {
  const password = process.env.SUPABASE_DB_PASSWORD;

  if (!password) {
    console.warn(
      'SUPABASE_DB_PASSWORD not set. SQL Agent will not function properly.'
    );
  }

  const encodedPassword = password ? encodeURIComponent(password) : '';

  return {
    type: 'postgres',
    url: `postgres://postgres.saeplsevqechdnlkwjyz:${encodedPassword}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`,
    ssl: { rejectUnauthorized: false },
    // Connection pool configuration
    poolSize: 5,
    extra: {
      max: 5,
      min: 1,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    },
    // Disable logging for production
    logging: false,
  };
};

/**
 * Create a Supabase DataSource instance
 *
 * @returns TypeORM DataSource configured for Supabase PostgreSQL
 */
export const createSupabaseDataSource = (): DataSource => {
  const { DataSource } = require('typeorm');
  return new DataSource(getSupabaseConnectionOptions());
};

/**
 * Get Supabase connection options (for testing)
 *
 * @returns DataSourceOptions for Supabase
 */
export const getSupabaseOptions = (): DataSourceOptions => {
  return getSupabaseConnectionOptions();
};
