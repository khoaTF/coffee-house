const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const config = fs.readFileSync('public/js/supabase-config.js', 'utf8');
const urlMatch = config.match(/SUPABASE_URL\s*=\s*['"]([^'"]+)['"]/);
const keyMatch = config.match(/SUPABASE_ANON_KEY\s*=\s*['"]([^'"]+)['"]/);
const supabase = createClient(urlMatch[1], keyMatch[1]);
supabase.from('users').select('*').limit(1).then(res => console.log(JSON.stringify(res, null, 2)));
