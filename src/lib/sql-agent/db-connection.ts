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
  // Support both VITE_ prefixed and non-prefixed environment variables
  // This allows the SQL Agent to work in both Vite dev and Vercel production
  const supabaseUrl =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL;

  const supabaseKey =
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    const availableVars = {
      SUPABASE_URL: !!process.env.SUPABASE_URL,
      VITE_SUPABASE_URL: !!process.env.VITE_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.SUPABASE_ANON_KEY,
      VITE_SUPABASE_ANON_KEY: !!process.env.VITE_SUPABASE_ANON_KEY,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    };

    console.error('[DB Connection] Missing Supabase environment variables');
    console.error('[DB Connection] Available variables:', JSON.stringify(availableVars, null, 2));

    throw new Error(
      'Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables. ' +
      'Available env vars: ' + Object.keys(availableVars).filter(k => availableVars[k as keyof typeof availableVars]).join(', ')
    );
  }

  console.log('[DB Connection] Using Supabase JS client (REST API)');
  console.log('[DB Connection] URL:', supabaseUrl);

  return createClient(supabaseUrl, supabaseKey);
};
