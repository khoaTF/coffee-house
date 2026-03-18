const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const WEBHOOK_URL = 'http://localhost:3000/api/webhook/payment';

async function runTest() {
    console.log("1. Creating dummy order...");
    const orderData = {
        table_number: 'TEST',
        session_id: 'test_sess',
        items: [{name: 'Test Coffee', quantity: 1, price: 50000}],
        total_price: 50000,
        is_paid: false,
        status: 'Pending',
        payment_method: 'transfer'
    };
    
    const { data: inserted, error: insertErr } = await supabase.from('orders').insert([orderData]).select().single();
    if (insertErr) {
        console.error("Failed to insert order:", insertErr);
        return;
    }
    
    const orderId = inserted.id;
    const shortId = orderId.slice(0, 8).toUpperCase();
    console.log(`Order created: ${orderId} (Short ID: ${shortId})`);
    
    console.log(`2. Sending Webhook Payload to ${WEBHOOK_URL} ...`);
    const payload = {
        data: {
            description: `Thanh toan don hang ${shortId}`,
            amount: 50000
        }
    };
    
    try {
        const fetchFunc = globalThis.fetch || (await import('node-fetch')).default; 
        const res = await fetchFunc(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const resData = await res.json();
        console.log("Webhook Response:", resData);
        
        console.log("3. Verifying order status in Database...");
        
        // Wait 1.5 seconds for Supabase API to settle from Webhook
        await new Promise(r => setTimeout(r, 1500));
        
        const { data: verifying, error: verifyErr } = await supabase.from('orders').select('is_paid, payment_status').eq('id', orderId).single();
        if (verifyErr) {
            console.error("Failed to verify order:", verifyErr);
        } else {
            console.log("Order Status after Webhook:", verifying);
            if (verifying.is_paid === true && verifying.payment_status === 'paid') {
                console.log("✅ Webhook auto-payment test PASSED!");
            } else {
                console.log("❌ Webhook auto-payment test FAILED!");
            }
        }
        
    } catch(err) {
        console.error("Webhook request failed:", err);
    }
    
    console.log("4. Cleaning up (deleting test order)...");
    await supabase.from('orders').delete().eq('id', orderId);
    console.log("Cleanup complete.");
    process.exit(0);
}

runTest();
