/**
 * External Order Webhook — Vercel Serverless Function
 * 
 * Receives orders from external channels (GrabFood, ShopeeFood, Zalo, Manual)
 * and inserts them into the orders table with appropriate order_source.
 * 
 * Endpoint: POST /api/external-order
 * Headers: x-api-key (required)
 * Body: { source, items, total_price, customer_phone?, customer_name?, note?, table_number?, tenant_id }
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WEBHOOK_API_KEY = process.env.EXTERNAL_ORDER_API_KEY;

const VALID_SOURCES = ['grabfood', 'shopeefood', 'befood', 'zalo', 'phone_call', 'manual'];

module.exports = async function handler(req, res) {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    // Auth check
    const apiKey = req.headers['x-api-key'];
    if (!WEBHOOK_API_KEY) {
        return res.status(500).json({ error: 'EXTERNAL_ORDER_API_KEY not configured on server' });
    }
    if (apiKey !== WEBHOOK_API_KEY) {
        return res.status(401).json({ error: 'Invalid API key' });
    }

    if (!SUPABASE_SERVICE_KEY) {
        return res.status(500).json({ error: 'SUPABASE_SERVICE_ROLE_KEY not configured' });
    }

    try {
        const {
            source,
            items,
            total_price,
            customer_phone,
            customer_name,
            note,
            table_number,
            tenant_id,
            external_order_id,
            payment_method,
            delivery_address,
            delivery_phone,
            delivery_name,
            delivery_fee
        } = req.body;

        // Validation
        if (!source || !VALID_SOURCES.includes(source)) {
            return res.status(400).json({
                error: `Invalid source. Must be one of: ${VALID_SOURCES.join(', ')}`,
                received: source
            });
        }
        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ error: 'items array is required and must not be empty' });
        }
        if (!total_price || total_price <= 0) {
            return res.status(400).json({ error: 'total_price must be a positive number' });
        }
        if (!tenant_id) {
            return res.status(400).json({ error: 'tenant_id is required' });
        }

        // Normalize items
        const normalizedItems = items.map((item, idx) => ({
            name: item.name || `Món ${idx + 1}`,
            quantity: item.quantity || 1,
            price: item.price || 0,
            selectedOptions: item.options || item.selectedOptions || [],
            note: item.note || ''
        }));

        // Build order payload
        const orderPayload = {
            table_number: table_number || `EXT-${source.toUpperCase()}`,
            session_id: `ext_${source}_${Date.now()}`,
            items: normalizedItems,
            total_price: Number(total_price),
            order_note: note ? `[${source.toUpperCase()}] ${note}` : `[${source.toUpperCase()}]${external_order_id ? ` #${external_order_id}` : ''}`,
            status: 'Pending',
            payment_method: payment_method || (source === 'grabfood' || source === 'shopeefood' ? 'transfer' : 'cash'),
            payment_status: (source === 'grabfood' || source === 'shopeefood' || source === 'befood') ? 'paid' : 'pending',
            is_paid: (source === 'grabfood' || source === 'shopeefood' || source === 'befood'),
            customer_phone: customer_phone || delivery_phone || '',
            order_source: source,
            order_type: (delivery_address || delivery_phone) ? 'delivery' : 'dine_in',
            delivery_name: delivery_name || customer_name || '',
            delivery_phone: delivery_phone || customer_phone || '',
            delivery_address: delivery_address || '',
            delivery_fee: delivery_fee || 0,
            tenant_id: tenant_id,
            created_at: new Date().toISOString()
        };

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        const { data, error } = await supabase
            .from('orders')
            .insert([orderPayload])
            .select('id, status, order_source, total_price, created_at')
            .single();

        if (error) {
            console.error('Supabase insert error:', error);
            return res.status(500).json({ error: 'Failed to create order', detail: error.message });
        }

        // Broadcast realtime notification
        try {
            await supabase.channel('admin-notifications').send({
                type: 'broadcast',
                event: 'new_external_order',
                payload: {
                    order_id: data.id,
                    source: source,
                    total: total_price,
                    items_count: normalizedItems.length
                }
            });
        } catch (broadcastErr) {
            console.warn('Broadcast warning:', broadcastErr);
        }

        return res.status(201).json({
            success: true,
            order: data,
            message: `Order from ${source} created successfully`
        });

    } catch (error) {
        console.error('External order error:', error);
        return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
};
