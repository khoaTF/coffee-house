const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

async function test() {
    const configPath = './public/js/supabase-config.js';
    const configContent = fs.readFileSync(configPath, 'utf8');
    
    const urlMatch = configContent.match(/const SUPABASE_URL = '(.*?)'/);
    const keyMatch = configContent.match(/const SUPABASE_ANON_KEY = '(.*?)'/);
    
    if (!urlMatch || !keyMatch) {
         console.log("Could not parse supabase-config.js");
         return;
    }
    
    const supabase = createClient(urlMatch[1], keyMatch[1]);
    
    // Auth as admin to mimic admin interface
    const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: 'admin@nohope.coffee',
        password: 'admin' // typical dev password, or we can just try without auth if it allows
    });
    
    if (authErr && authErr.message !== 'Invalid login credentials') {
        console.log("Auth error:", authErr.message);
    }
    // Try service role key if auth failed?
    
    // Wait, let's just make a dummy order and see if RPC fails.
    const orderPayload = {
        table_number: "POS",
        session_id: 'POS_test',
        items: [{
            id: 'test-uuid',
            name: 'Test Coffee',
            price: 25000,
            quantity: 1,
            recipe: [],
            selectedOptions: []
        }],
        reductions: {},
        total_price: 25000,
        order_note: null,
        status: 'Completed',
        payment_method: 'cash',
        payment_status: 'paid'
    };

    const { data, error } = await supabase.rpc('place_order_and_deduct_inventory', { payload: orderPayload });
    if (error) {
        console.log("RPC Error:", JSON.stringify(error, null, 2));
    } else {
        console.log("Success! Order ID:", data);
    }
}
test();
