require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ FATAL: Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.');
    console.error('   Set them in .env or hosting platform environment settings.');
    console.error('   Backend will not function correctly without these.');
}

const supabase = supabaseUrl && supabaseKey
    ? createClient(supabaseUrl, supabaseKey)
    : null;

module.exports = supabase;
