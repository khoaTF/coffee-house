// =============================================
// NOTIFICATION CONTROLLER
// API endpoints for managing notification integrations
// =============================================
const notificationService = require('../services/notification.service');
const supabase = require('../config/supabase');

/**
 * POST /api/notifications/test-telegram
 * Test Telegram bot connection
 */
const testTelegram = async (req, res) => {
    const { bot_token, chat_id, tenant_id } = req.body;

    if (!bot_token || !chat_id) {
        return res.status(400).json({ error: 'bot_token và chat_id là bắt buộc' });
    }

    try {
        const url = `https://api.telegram.org/bot${bot_token}/sendMessage`;
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id,
                text: '✅ <b>Nohope Coffee</b>\n\nKết nối Telegram thành công!\nBot đã sẵn sàng nhận thông báo từ hệ thống.',
                parse_mode: 'HTML'
            })
        });

        const result = await response.json();

        if (result.ok) {
            res.json({ success: true, message: 'Tin nhắn test đã gửi thành công!' });
        } else {
            res.status(400).json({
                success: false,
                error: result.description || 'Không thể gửi tin nhắn',
                hint: result.error_code === 401
                    ? 'Bot token không hợp lệ'
                    : 'Kiểm tra lại chat_id (Bot phải đã được thêm vào group/channel)'
            });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

/**
 * POST /api/notifications/test-webhook
 * Test generic webhook connection
 */
const testWebhook = async (req, res) => {
    const { webhook_url, webhook_secret } = req.body;

    if (!webhook_url) {
        return res.status(400).json({ error: 'webhook_url là bắt buộc' });
    }

    try {
        const headers = {
            'Content-Type': 'application/json',
            'X-Event-Type': 'test',
            'X-Timestamp': new Date().toISOString()
        };
        if (webhook_secret) headers['X-Webhook-Secret'] = webhook_secret;

        const response = await fetch(webhook_url, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                event: 'test',
                data: { message: 'Nohope Coffee webhook test' },
                timestamp: new Date().toISOString()
            })
        });

        res.json({
            success: response.ok,
            status: response.status,
            message: response.ok ? 'Webhook test thành công!' : `Webhook trả về status ${response.status}`
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
};

/**
 * POST /api/notifications/save-config
 * Save notification config to store_settings
 */
const saveConfig = async (req, res) => {
    if (!supabase) {
        return res.status(500).json({ error: 'Database not connected' });
    }

    const { tenant_id, telegram_bot_token, telegram_chat_id, webhook_url, webhook_secret, notifications_config } = req.body;

    if (!tenant_id) {
        return res.status(400).json({ error: 'tenant_id là bắt buộc' });
    }

    try {
        const updateData = {};
        if (telegram_bot_token !== undefined) updateData.telegram_bot_token = telegram_bot_token;
        if (telegram_chat_id !== undefined) updateData.telegram_chat_id = telegram_chat_id;
        if (webhook_url !== undefined) updateData.webhook_url = webhook_url;
        if (webhook_secret !== undefined) updateData.webhook_secret = webhook_secret;
        if (notifications_config !== undefined) updateData.notifications_config = notifications_config;

        const { error } = await supabase
            .from('store_settings')
            .update(updateData)
            .eq('tenant_id', tenant_id);

        if (error) {
            return res.status(400).json({ error: error.message });
        }

        // Clear service cache so new config takes effect
        notificationService.clearCache();

        res.json({ success: true, message: 'Cấu hình đã lưu' });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

/**
 * POST /api/notifications/send
 * Manually send a notification (admin use)
 */
const sendManual = async (req, res) => {
    const { tenant_id, message, channel } = req.body;

    if (!message) {
        return res.status(400).json({ error: 'message là bắt buộc' });
    }

    const results = {};

    if (!channel || channel === 'telegram') {
        results.telegram = await notificationService.sendTelegram(message, tenant_id);
    }
    if (!channel || channel === 'webhook') {
        results.webhook = await notificationService.sendWebhook('manual', { message }, tenant_id);
    }

    res.json({ success: true, results });
};

module.exports = { testTelegram, testWebhook, saveConfig, sendManual };
