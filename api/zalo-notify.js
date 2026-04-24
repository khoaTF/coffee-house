/**
 * Zalo Notification Scaffold — Vercel Serverless Function
 * 
 * Template notification engine for Zalo OA integration.
 * Currently provides scaffold structure — requires Zalo OA access token to activate.
 * 
 * Endpoint: POST /api/zalo-notify
 * Body: { event, order_id, tenant_id, phone?, message_type? }
 * 
 * Events: order_confirmed, order_ready, order_delivered, promotion
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const ZALO_OA_ACCESS_TOKEN = process.env.ZALO_OA_ACCESS_TOKEN;

// Message templates
const TEMPLATES = {
    order_confirmed: (order) => ({
        title: `✅ Đơn hàng #${(order.id || '').slice(0, 8)} đã xác nhận`,
        subtitle: `Bàn ${order.table_number || 'N/A'} • ${(order.items || []).length} món`,
        body: `Đơn hàng của bạn đã được xác nhận và đang được pha chế. Tổng: ${new Intl.NumberFormat('vi-VN').format(order.total_price)} đ`,
        image_url: '',
        action_url: ''
    }),
    order_ready: (order) => ({
        title: `☕ Đơn hàng đã sẵn sàng!`,
        subtitle: `Bàn ${order.table_number || 'N/A'}`,
        body: `Đồ uống của bạn đã pha chế xong. Vui lòng đến quầy nhận.`,
        image_url: '',
        action_url: ''
    }),
    order_delivered: (order) => ({
        title: `🚀 Đã giao đơn #${(order.id || '').slice(0, 8)}`,
        subtitle: `Tổng: ${new Intl.NumberFormat('vi-VN').format(order.total_price)} đ`,
        body: `Đơn hàng đã được giao thành công. Cảm ơn bạn đã sử dụng dịch vụ!`,
        image_url: '',
        action_url: ''
    }),
    promotion: (data) => ({
        title: data.title || '🎉 Ưu đãi đặc biệt!',
        subtitle: data.subtitle || 'Nohope Coffee',
        body: data.body || 'Mời bạn ghé thăm cửa hàng để nhận ưu đãi!',
        image_url: data.image_url || '',
        action_url: data.action_url || ''
    })
};

// Zalo OA API sender (scaffold)
async function sendZaloMessage(phone, template) {
    if (!ZALO_OA_ACCESS_TOKEN) {
        return {
            success: false,
            reason: 'ZALO_OA_ACCESS_TOKEN not configured. Set this in Vercel env variables.',
            scaffold: true,
            template_preview: template
        };
    }

    // Real Zalo OA API call would go here:
    // POST https://openapi.zalo.me/v3.0/oa/message/cs
    // Headers: { access_token: ZALO_OA_ACCESS_TOKEN }
    // Body format depends on message type (text, transaction, promotion)
    
    try {
        const response = await fetch('https://openapi.zalo.me/v3.0/oa/message/cs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'access_token': ZALO_OA_ACCESS_TOKEN
            },
            body: JSON.stringify({
                recipient: { user_id: phone },
                message: {
                    attachment: {
                        type: 'template',
                        payload: {
                            template_type: 'promotion',
                            language: 'VI',
                            elements: [{
                                image_url: template.image_url || '',
                                type: 'banner'
                            }],
                            buttons: template.action_url ? [{
                                title: 'Xem chi tiết',
                                type: 'oa.open.url',
                                payload: { url: template.action_url }
                            }] : []
                        }
                    }
                }
            })
        });

        const result = await response.json();
        return { success: result.error === 0, zalo_response: result };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

module.exports = async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') return res.status(200).end();
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

    try {
        const { event, order_id, tenant_id, phone, message_type, custom_data } = req.body;

        if (!event) {
            return res.status(400).json({ error: 'event is required', valid_events: Object.keys(TEMPLATES) });
        }

        const templateFn = TEMPLATES[event];
        if (!templateFn) {
            return res.status(400).json({ error: `Unknown event: ${event}`, valid_events: Object.keys(TEMPLATES) });
        }

        let templateData = custom_data || {};

        // Fetch order if order_id provided
        if (order_id && tenant_id && SUPABASE_SERVICE_KEY) {
            const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
            const { data: order } = await supabase
                .from('orders')
                .select('*')
                .eq('id', order_id)
                .eq('tenant_id', tenant_id)
                .single();

            if (order) templateData = order;
        }

        const template = templateFn(templateData);
        const targetPhone = phone || templateData.customer_phone || templateData.delivery_phone;

        if (!targetPhone) {
            return res.status(200).json({
                success: false,
                reason: 'No phone number available for notification',
                template_preview: template
            });
        }

        const result = await sendZaloMessage(targetPhone, template);

        // Log notification attempt
        if (SUPABASE_SERVICE_KEY) {
            try {
                const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
                await supabase.from('notification_logs').insert([{
                    tenant_id: tenant_id,
                    channel: 'zalo',
                    event: event,
                    recipient: targetPhone,
                    template: template,
                    success: result.success,
                    response: result,
                    created_at: new Date().toISOString()
                }]);
            } catch (logErr) {
                console.warn('Failed to log notification:', logErr);
            }
        }

        return res.status(200).json({
            success: result.success,
            event: event,
            template: template,
            result: result
        });

    } catch (error) {
        console.error('Zalo notify error:', error);
        return res.status(500).json({ error: 'Internal Server Error', detail: error.message });
    }
};
