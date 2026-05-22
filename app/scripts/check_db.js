const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load environment variables from .env.local
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env variables!');
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

async function check() {
  console.log('Querying parishes...');
  const { data: parishes, error: parishesError } = await supabaseAdmin
    .from('parishes')
    .select('id, name')
    .limit(5);

  if (parishesError) {
    console.error('Parishes error:', parishesError);
  } else {
    console.log('Parishes count:', parishes ? parishes.length : 0);
    console.log('Sample parishes:', parishes);
  }

  console.log('\nQuerying projects...');
  const { data: projects, error: projectsError } = await supabaseAdmin
    .from('projects')
    .select('id, name')
    .limit(5);

  if (projectsError) {
    console.error('Projects error:', projectsError);
  } else {
    console.log('Projects count:', projects ? projects.length : 0);
    console.log('Sample projects:', projects);
  }
}

check();
