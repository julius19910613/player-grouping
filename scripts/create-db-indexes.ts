/**
 * Create Database Indexes for Performance Optimization
 *
 * This script creates recommended indexes for the Supabase/PostgreSQL database
 * to improve query performance for common SQL Agent patterns.
 *
 * Run this script in Supabase SQL Editor or execute via Node.js with Supabase client
 */

import { createClient } from '@supabase/supabase-js';

// Get environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing required environment variables:');
  console.error('  VITE_SUPABASE_URL or SUPABASE_URL');
  console.error('  VITE_SUPABASE_ANON_KEY or SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Recommended indexes for the player grouping database
 *
 * Based on common query patterns:
 * - Sorting by overall score
 * - Filtering by position
 * - Searching by name (fuzzy)
 * - Filtering by skill ratings
 * - Joining tables on foreign keys
 */
const INDEXES = [
  // Player skills table
  {
    name: 'idx_player_skills_overall',
    table: 'player_skills',
    columns: ['overall'],
    description: 'Speed up ranking queries by overall score',
  },
  {
    name: 'idx_player_skills_two_point_shot',
    table: 'player_skills',
    columns: ['two_point_shot'],
    description: 'Speed up queries filtering by two-point shot skill',
  },
  {
    name: 'idx_player_skills_three_point_shot',
    table: 'player_skills',
    columns: ['three_point_shot'],
    description: 'Speed up queries filtering by three-point shot skill',
  },
  {
    name: 'idx_player_skills_free_throw',
    table: 'player_skills',
    columns: ['free_throw'],
    description: 'Speed up queries filtering by free throw skill',
  },
  {
    name: 'idx_player_skills_speed',
    table: 'player_skills',
    columns: ['speed'],
    description: 'Speed up queries filtering by speed',
  },
  {
    name: 'idx_player_skills_perimeter_defense',
    table: 'player_skills',
    columns: ['perimeter_defense'],
    description: 'Speed up queries filtering by perimeter defense',
  },
  {
    name: 'idx_player_skills_defense',
    table: 'player_skills',
    columns: ['interior_defense', 'perimeter_defense'],
    description: 'Composite index for defense queries',
  },

  // Players table
  {
    name: 'idx_players_name',
    table: 'players',
    columns: ['name'],
    description: 'Speed up name search queries (fuzzy search)',
  },
  {
    name: 'idx_players_position',
    table: 'players',
    columns: ['position'],
    description: 'Speed up position filter queries',
  },
  {
    name: 'idx_players_name_position',
    table: 'players',
    columns: ['name', 'position'],
    description: 'Composite index for name + position queries',
  },

  // Player match stats table
  {
    name: 'idx_player_match_stats_player_id',
    table: 'player_match_stats',
    columns: ['player_id'],
    description: 'Speed up player match stats queries',
  },
  {
    name: 'idx_player_match_stats_match_id',
    table: 'player_match_stats',
   columns: ['match_id'],
    description: 'Speed up match stats queries',
  },
  {
    name: 'idx_player_match_stats_points',
    table: 'player_match_stats',
    columns: ['points'],
    description: 'Speed up ranking by points',
  },
  {
    name: 'idx_player_match_stats_player_match',
    table: 'player_match_stats',
    columns: ['player_id', 'match_id'],
    description: 'Composite index for player + match queries',
  },

  // Matches table
  {
    name: 'idx_matches_date',
    table: 'matches',
    columns: ['date'],
    description: 'Speed up date-based queries (recent matches)',
  },
  {
    name: 'idx_matches_date_venue',
    table: 'matches',
    columns: ['date', 'venue'],
    description: 'Composite index for date + venue queries',
  },

  // Grouping history table
  {
    name: 'idx_grouping_history_created_at',
    table: 'grouping_history',
    columns: ['created_at'],
    description: 'Speed up recent grouping queries',
  },
];

/**
 * Check if an index exists
 */
async function indexExists(indexName: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('index_exists', {
    index_name: indexName,
  });

  if (error) {
    // If function doesn't exist, assume index doesn't exist
    if (error.code === 'PGRST116') {
      return false;
    }
    console.warn(`Warning checking index ${indexName}:`, error.message);
    return false;
  }

  return data === true;
}

/**
 * Create a single index
 */
async function createIndex(indexConfig: typeof INDEXES[0]): Promise<boolean> {
  try {
    const { error } = await supabase.rpc('create_index', {
      index_name: indexConfig.name,
      table_name: indexConfig.table,
      columns: indexConfig.columns,
    });

    if (error) {
      console.error(`  [ERROR] Failed to create index ${indexConfig.name}:`, error.message);
      return false;
    }

    console.log(`  [SUCCESS] Created index ${indexConfig.name}`);
    return true;
  } catch (error) {
    console.error(`  [ERROR] Failed to create index ${indexConfig.name}:`, error);
    return false;
  }
}

/**
 * Create all indexes
 */
async function createAllIndexes(): Promise<void> {
  console.log('============================================================');
  console.log('Database Index Creation Script');
  console.log('============================================================');
  console.log(`[Config] Supabase URL: ${supabaseUrl}`);
  console.log(`[Config] Total indexes to create: ${INDEXES.length}`);
  console.log('============================================================');

  let created = 0;
  let failed = 0;
  let skipped = 0;

  for (const indexConfig of INDEXES) {
    console.log(`\n[${indexConfig.name}]`);
    console.log(`  Table: ${indexConfig.table}`);
    console.log(`  Columns: ${indexConfig.columns.join(', ')}`);
    console.log(`  Description: ${indexConfig.description}`);

    // Check if index already exists
    const exists = await indexExists(indexConfig.name);

    if (exists) {
      console.log(`  [SKIP] Index already exists`);
      skipped++;
      continue;
    }

    // Create the index
    const success = await createIndex(indexConfig);

    if (success) {
      created++;
    } else {
      failed++;
    }
  }

  console.log('\n============================================================');
  console.log('Summary');
  console.log('============================================================');
  console.log(`Created: ${created}`);
  console.log(`Failed: ${failed}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Total: ${INDEXES.length}`);
  console.log('============================================================');

  if (failed > 0) {
    console.log('\n[INFO] Some indexes failed to create.');
    console.log('[INFO] You may need to run these SQL commands manually in Supabase SQL Editor:');
    console.log('\n');

    for (const indexConfig of INDEXES) {
      const sql = `CREATE INDEX ${indexConfig.name} ON ${indexConfig.table} (${indexConfig.columns.join(', ')});`;
      console.log(sql);
    }

    console.log('\n============================================================');
  }
}

/**
 * Alternative: Direct SQL execution (for Supabase SQL Editor)
 */
export const SQL_COMMANDS = INDEXES.map((index) => {
  return `-- ${index.description}
CREATE INDEX IF NOT EXISTS ${index.name}
ON ${index.table} (${index.columns.join(', ')});`;
}).join('\n\n');

console.log('============================================================');
console.log('Alternative: SQL Commands for Supabase SQL Editor');
console.log('============================================================');
console.log(SQL_COMMANDS);
console.log('============================================================');

// Run the index creation
createAllIndexes().catch((error) => {
  console.error('[ERROR] Script failed:', error);
  process.exit(1);
});
