const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env variables!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function run() {
  console.log('Creating search_donors_unaccent database function...');
  
  const sql = `
    CREATE EXTENSION IF NOT EXISTS unaccent;

    CREATE OR REPLACE FUNCTION search_donors_unaccent(search_query text)
    RETURNS TABLE (
      id UUID,
      first_name TEXT,
      last_name TEXT,
      email TEXT,
      variable_symbol TEXT,
      city TEXT
    ) AS $$
    BEGIN
      RETURN QUERY
      SELECT d.id, d.first_name, d.last_name, d.email, d.variable_symbol, d.city
      FROM donors d
      WHERE 
        unaccent(d.first_name) ILIKE unaccent('%' || search_query || '%')
        OR unaccent(d.last_name) ILIKE unaccent('%' || search_query || '%')
        OR unaccent(d.first_name || ' ' || d.last_name) ILIKE unaccent('%' || search_query || '%')
        OR unaccent(d.last_name || ' ' || d.first_name) ILIKE unaccent('%' || search_query || '%')
        OR d.variable_symbol ILIKE '%' || search_query || '%'
      LIMIT 20;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    GRANT EXECUTE ON FUNCTION search_donors_unaccent(text) TO authenticated;
    GRANT EXECUTE ON FUNCTION search_donors_unaccent(text) TO service_role;
    GRANT EXECUTE ON FUNCTION search_donors_unaccent(text) TO anon;
  `;

  const { data, error } = await supabaseAdmin.rpc('exec_sql', { sql_query: sql });

  if (error) {
    console.error('Error executing SQL via RPC:', error);
  } else {
    console.log('Function search_donors_unaccent created successfully!');
  }
}

run();
