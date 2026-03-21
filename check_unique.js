const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    // Insert two users with the exact same PIN to see if it allows duplicates
    const p1 = await supabase.from('users').insert({ name: 'dup1', role: 'staff', pin: '999999' }).select();
    const p2 = await supabase.from('users').insert({ name: 'dup2', role: 'staff', pin: '999999' }).select();
    
    console.log("P1 Error:", p1.error);
    console.log("P2 Error:", p2.error);
    
    // Clean up
    await supabase.from('users').delete().eq('pin', '999999');
}
check();
