require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const supabaseKey = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL'; // Supabase anon key from public config
const supabase = createClient(supabaseUrl, supabaseKey);

async function testInsert() {
    console.log("Testing insert into staff_requests...");
    const { data, error } = await supabase
        .from('staff_requests')
        .insert([{ table_number: "Ban_Test", type: "staff" }]);

    if (error) {
        console.error("Supabase Error Details:", error);
    } else {
        console.log("Insert Success! Data:", data);
        
        // Clean up test data
        await supabase.from('staff_requests').delete().eq('table_number', 'Ban_Test');
    }
}

testInsert();
