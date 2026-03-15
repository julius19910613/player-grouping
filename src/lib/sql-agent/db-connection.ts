/**
 * Database connection configuration for SQL Agent
 *
 * This module provides a Supabase client configured for querying the database.
 * Uses the Supabase JS client (REST API) which is proven to work reliably.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Create a Supabase client instance for database queries
 *
 * @returns SupabaseClient configured for the project
 */
export const createSupabaseQueryClient = (): SupabaseClient => {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY environment variables'
    );
  }

  console.log('[DB Connection] Using Supabase JS client (REST API)');
  console.log('[DB Connection] URL:', supabaseUrl);

  return createClient(supabaseUrl, supabaseKey);
};
