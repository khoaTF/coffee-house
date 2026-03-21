const { createClient } = require('@supabase/supabase-js');
const SUPABASE_URL = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function check() {
    const { data: cols, error: err1 } = await supabase.from('users').select('*').limit(1);
    console.log("Cols:", cols, err1);
    
    // Try inserting
    const { data, error } = await supabase.from('users').insert({
        name: 'test1', role: 'staff', pin: '000000'
    }).select();
    console.log("Insert result:", JSON.stringify({data, error}, null, 2));
    
    if (data) {
        await supabase.from('users').delete().eq('id', data[0].id);
    }
}
check();
