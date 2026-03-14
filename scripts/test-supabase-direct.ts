import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

async function testDirectSupabase() {
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  console.log('--- Direct Supabase Test ---');
  console.log('URL:', supabaseUrl);
  console.log('Anon Key defined:', !!supabaseKey);

  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Test 1: Count players
  console.log('\n--- Test 1: Count players ---');
  const { count, error: countError } = await supabase
    .from('players')
    .select('*', { count: 'exact', head: true });
  
  if (countError) {
    console.error('Count error:', countError.message);
  } else {
    console.log(`SUCCESS! Player count: ${count}`);
  }

  // Test 2: List players
  console.log('\n--- Test 2: List first 5 players ---');
  const { data, error: listError } = await supabase
    .from('players')
    .select('id, name, position')
    .limit(5);
  
  if (listError) {
    console.error('List error:', listError.message);
  } else {
    console.log(`SUCCESS! Players:`, JSON.stringify(data, null, 2));
  }
}

testDirectSupabase();
