const supabase = require('../config/supabase');

const handlePaymentWebhook = async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Server misconfiguration: Database not connected' });
    }

    const webhookSecret = process.env.WEBHOOK_SECRET;
    if (!webhookSecret) {
        console.error('❌ FATAL: WEBHOOK_SECRET is not set. Payment webhook is disabled for security.');
        return res.status(500).json({ error: 'Server misconfiguration: Webhook secret missing' });
    }

    const incomingToken = req.headers['authorization'] || req.headers['x-sepay-signature'] || req.query.token;
    if (!incomingToken || incomingToken !== webhookSecret) {
        console.warn('Webhook rejected: Invalid or missing signature');
        return res.status(401).json({ error: 'Unauthorized webhook' });
    }

    try {
        const payload = req.body;
        // SePay format usually puts list of transactions in 'data' array
        const txs = payload.data ? (Array.isArray(payload.data) ? payload.data : [payload.data]) : [payload];
        let processedCount = 0;

        for (let tx of txs) {
            const desc = (tx.description || tx.content || '').toUpperCase();
            const amount = parseFloat(tx.amount || tx.transferAmount || 0);

            // Assuming user transfers with memo containing the first 8 characters of Order ID
            const match = desc.match(/[A-F0-9]{8}/);

            if (match) {
                const shortId = match[0].toLowerCase();
                // Fetch unpaid orders and filter in JS (PostgreSQL UUID ilike throws error)
                let query = supabase
                    .from('orders')
                    .select('id, total_price, is_paid')
                    .eq('is_paid', false);
                
                if (req.query.tenant_id) {
                    query = query.eq('tenant_id', req.query.tenant_id);
                }
                
                const { data: unpaidOrders, error: fetchErr } = await query;
                    
                if (!fetchErr && unpaidOrders && unpaidOrders.length > 0) {
                    const order = unpaidOrders.find(o => o.id.toLowerCase().startsWith(shortId));
                    
                    if (order && amount >= parseFloat(order.total_price)) {
                        // Mark as paid
                        const { error: updateErr } = await supabase
                            .from('orders')
                            .update({ payment_status: 'paid', is_paid: true })
                            .eq('id', order.id);
                            
                        if (!updateErr) {
                            processedCount++;
                            // Thích hợp để tích điểm Loyalty lúc này
                        } else {
                            console.error("Webhook Update Error:", updateErr);
                        }
                    } 
                } else if (fetchErr) {
                    console.error("Webhook Fetch Error:", fetchErr);
                }
            }
        }
        res.status(200).json({ success: true, processed: processedCount });
    } catch (e) {
        console.error('Webhook Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};

module.exports = { handlePaymentWebhook };
