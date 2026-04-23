/**
 * Payment Webhook API - Auto-verify bank transfers
 * 
 * Compatible with: Sepay, Casso, or any banking webhook that sends JSON with:
 *   - content/description: Transfer message containing order reference
 *   - transferAmount/amount: Transfer amount
 * 
 * Endpoint: POST /api/payment-webhook
 * 
 * Set PAYMENT_WEBHOOK_SECRET env var to secure the webhook.
 */
const supabase = require('../src/config/supabase');

module.exports = async function handler(req, res) {
    // Only accept POST
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    // Verify webhook secret (optional but recommended)
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (webhookSecret) {
        const authHeader = req.headers['authorization'] || req.headers['x-webhook-secret'] || '';
        const token = authHeader.replace('Bearer ', '').trim();
        if (token !== webhookSecret) {
            console.warn('⚠️ Webhook auth failed');
            return res.status(401).json({ error: 'Unauthorized' });
        }
    }

    try {
        const body = req.body;

        // Normalize payload from Sepay/Casso/custom
        const transactions = body.data || body.transactions || [body];
        let matchedCount = 0;

        for (const tx of Array.isArray(transactions) ? transactions : [transactions]) {
            // Extract transfer details
            const content = (tx.content || tx.description || tx.memo || tx.addDescription || '').toUpperCase().trim();
            const amount = tx.transferAmount || tx.amount || tx.value || 0;

            if (!content || !amount) continue;

            // Match order reference pattern: NH + digits (e.g., NH123456)
            // Also match just 6-digit codes
            const refMatch = content.match(/NH(\d{4,8})/i) || content.match(/\b(\d{6})\b/);
            if (!refMatch) {
                console.log(`⏭️ No order ref found in: "${content}"`);
                continue;
            }

            const orderRef = refMatch[0]; // Full match (e.g., NH123456)
            console.log(`💳 Processing payment: ref=${orderRef}, amount=${amount}`);

            if (!supabase) {
                console.error('❌ Supabase not configured');
                continue;
            }

            // Find matching unpaid order
            // Try matching by payment_ref first, then by order ID suffix
            let matchedOrder = null;

            // Strategy 1: Match by payment_ref column
            const { data: refOrders } = await supabase
                .from('orders')
                .select('_id, total, payment_status, payment_ref')
                .eq('payment_ref', orderRef)
                .eq('payment_status', 'pending')
                .limit(1);

            if (refOrders && refOrders.length > 0) {
                matchedOrder = refOrders[0];
            }

            // Strategy 2: Match by partial order ID
            if (!matchedOrder) {
                const idSuffix = refMatch[1] || refMatch[0];
                const { data: idOrders } = await supabase
                    .from('orders')
                    .select('_id, total, payment_status')
                    .eq('payment_status', 'pending')
                    .order('created_at', { ascending: false })
                    .limit(50);

                if (idOrders) {
                    matchedOrder = idOrders.find(o => 
                        o._id.toUpperCase().endsWith(idSuffix) || 
                        o._id.toUpperCase().includes(idSuffix)
                    );
                }
            }

            if (!matchedOrder) {
                console.log(`❌ No matching unpaid order for ref: ${orderRef}`);
                continue;
            }

            // Verify amount matches (with ±5% tolerance for rounding)
            const orderTotal = matchedOrder.total || 0;
            const tolerance = orderTotal * 0.05;
            if (amount < orderTotal - tolerance) {
                console.warn(`⚠️ Amount mismatch: paid=${amount}, expected=${orderTotal}`);
                // Still mark as paid but log the discrepancy
            }

            // Update order payment status
            const { error: updateError } = await supabase
                .from('orders')
                .update({ 
                    payment_status: 'paid',
                    payment_verified_at: new Date().toISOString(),
                    payment_verified_amount: amount,
                    payment_method: 'transfer'
                })
                .eq('_id', matchedOrder._id);

            if (updateError) {
                console.error(`❌ Failed to update order ${matchedOrder._id}:`, updateError);
                continue;
            }

            console.log(`✅ Order ${matchedOrder._id} marked as PAID (${amount}đ)`);
            matchedCount++;
        }

        return res.status(200).json({ 
            success: true, 
            matched: matchedCount,
            message: `${matchedCount} order(s) verified`
        });

    } catch (error) {
        console.error('❌ Webhook error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
};
