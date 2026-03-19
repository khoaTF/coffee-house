require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://xvghmwfmjxramrsptxfh.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';
const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;
