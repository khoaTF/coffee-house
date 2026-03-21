const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testInsert() {
    const { data, error } = await supabase.from('users').insert([
        { name: 'Test Staff', role: 'staff', pin: '9999' }
    ]).select();

    if (error) {
        console.error('Insert Error:', error);
    } else {
        console.log('Inserted Successfully:', data);
        
        // Clean up
        await supabase.from('users').delete().eq('id', data[0].id);
    }
}

testInsert();
