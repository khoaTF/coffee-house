// =============================================
// EXTERNAL NOTIFICATION SERVICE
// Supports: Telegram Bot API + Generic Webhook
// =============================================
const supabase = require('../config/supabase');

class NotificationService {
    constructor() {
        this.configCache = null;
        this.cacheExpiry = 0;
    }

    // =============================================
    // CONFIG: Load from store_settings or env
    // =============================================
    async getConfig(tenantId) {
        const now = Date.now();
        if (this.configCache && now < this.cacheExpiry) {
            return this.configCache;
        }

        let config = {
            telegram_enabled: false,
            telegram_bot_token: process.env.TELEGRAM_BOT_TOKEN || '',
            telegram_chat_id: process.env.TELEGRAM_CHAT_ID || '',
            webhook_enabled: false,
            webhook_url: process.env.NOTIFY_WEBHOOK_URL || '',
            webhook_secret: process.env.NOTIFY_WEBHOOK_SECRET || ''
        };

        // Try loading from store_settings (overrides env)
        if (supabase && tenantId) {
            try {
                const { data } = await supabase
                    .from('store_settings')
                    .select('telegram_bot_token, telegram_chat_id, webhook_url, webhook_secret, notifications_config')
                    .eq('tenant_id', tenantId)
                    .single();

                if (data) {
                    if (data.telegram_bot_token) config.telegram_bot_token = data.telegram_bot_token;
                    if (data.telegram_chat_id) config.telegram_chat_id = data.telegram_chat_id;
                    if (data.webhook_url) config.webhook_url = data.webhook_url;
                    if (data.webhook_secret) config.webhook_secret = data.webhook_secret;

                    // Parse JSON config if available
                    if (data.notifications_config) {
                        try {
                            const nc = typeof data.notifications_config === 'string'
                                ? JSON.parse(data.notifications_config)
                                : data.notifications_config;
                            config = { ...config, ...nc };
                        } catch (e) { /* ignore parse errors */ }
                    }
                }
            } catch (e) {
                console.warn('[NotificationService] Could not load config from DB:', e.message);
            }
        }

        config.telegram_enabled = !!(config.telegram_bot_token && config.telegram_chat_id);
        config.webhook_enabled = !!config.webhook_url;

        this.configCache = config;
        this.cacheExpiry = now + 5 * 60 * 1000; // Cache 5 minutes
        return config;
    }

    // Clear cache (e.g. after config update)
    clearCache() {
        this.configCache = null;
        this.cacheExpiry = 0;
    }

    // =============================================
    // TELEGRAM: Send message via Bot API
    // =============================================
    async sendTelegram(message, tenantId, options = {}) {
        const config = await this.getConfig(tenantId);
        if (!config.telegram_enabled) return { ok: false, reason: 'Telegram not configured' };

        const url = `https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`;

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    chat_id: config.telegram_chat_id,
                    text: message,
                    parse_mode: options.parse_mode || 'HTML',
                    disable_web_page_preview: true,
                    ...options.extra
                })
            });

            const result = await response.json();
            if (!result.ok) {
                console.error('[Telegram] Send failed:', result.description);
            }
            return result;
        } catch (e) {
            console.error('[Telegram] Network error:', e.message);
            return { ok: false, error: e.message };
        }
    }

    // =============================================
    // GENERIC WEBHOOK: POST to custom URL
    // =============================================
    async sendWebhook(eventType, payload, tenantId) {
        const config = await this.getConfig(tenantId);
        if (!config.webhook_enabled) return { ok: false, reason: 'Webhook not configured' };

        try {
            const headers = {
                'Content-Type': 'application/json',
                'X-Event-Type': eventType,
                'X-Timestamp': new Date().toISOString()
            };

            if (config.webhook_secret) {
                headers['X-Webhook-Secret'] = config.webhook_secret;
            }

            const response = await fetch(config.webhook_url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    event: eventType,
                    data: payload,
                    timestamp: new Date().toISOString()
                })
            });

            return { ok: response.ok, status: response.status };
        } catch (e) {
            console.error('[Webhook] Send error:', e.message);
            return { ok: false, error: e.message };
        }
    }

    // =============================================
    // HIGH-LEVEL NOTIFICATION METHODS
    // =============================================

    /**
     * New order placed
     */
    async notifyNewOrder(order, tenantId) {
        const items = order.items || [];
        const itemList = items.map(i => `  • ${i.name} x${i.quantity}`).join('\n');

        const message = [
            '🛒 <b>ĐƠN HÀNG MỚI</b>',
            '',
            `📋 Mã đơn: <code>${(order.id || '').substring(0, 8).toUpperCase()}</code>`,
            `🪑 Bàn: <b>${order.table_number || 'N/A'}</b>`,
            `💰 Tổng: <b>${this.formatVND(order.total_price)}</b>`,
            '',
            '📦 Chi tiết:',
            itemList || '  (Không có chi tiết)',
            '',
            order.note ? `📝 Ghi chú: ${order.note}` : '',
            `⏰ ${this.formatTime()}`
        ].filter(Boolean).join('\n');

        await Promise.allSettled([
            this.sendTelegram(message, tenantId),
            this.sendWebhook('order.new', order, tenantId)
        ]);
    }

    /**
     * Payment confirmed (via SePay/Casso webhook)
     */
    async notifyPaymentConfirmed(order, tenantId) {
        const message = [
            '✅ <b>THANH TOÁN THÀNH CÔNG</b>',
            '',
            `📋 Mã đơn: <code>${(order.id || '').substring(0, 8).toUpperCase()}</code>`,
            `🪑 Bàn: <b>${order.table_number || 'N/A'}</b>`,
            `💰 Số tiền: <b>${this.formatVND(order.total_price)}</b>`,
            `💳 Phương thức: Chuyển khoản`,
            `⏰ ${this.formatTime()}`
        ].join('\n');

        await Promise.allSettled([
            this.sendTelegram(message, tenantId),
            this.sendWebhook('payment.confirmed', order, tenantId)
        ]);
    }

    /**
     * Low stock alert
     */
    async notifyLowStock(ingredients, tenantId) {
        if (!ingredients || ingredients.length === 0) return;

        const items = ingredients.map(i => {
            const emoji = i.quantity <= 0 ? '🔴' : '🟡';
            return `  ${emoji} ${i.name}: ${i.quantity} ${i.unit || ''}`;
        }).join('\n');

        const message = [
            '⚠️ <b>CẢNH BÁO TỒN KHO</b>',
            '',
            `Có ${ingredients.length} nguyên liệu cần chú ý:`,
            '',
            items,
            '',
            `⏰ ${this.formatTime()}`
        ].join('\n');

        await Promise.allSettled([
            this.sendTelegram(message, tenantId),
            this.sendWebhook('stock.low', { ingredients }, tenantId)
        ]);
    }

    /**
     * Daily revenue summary
     */
    async notifyDailySummary(summary, tenantId) {
        const message = [
            '📊 <b>BÁO CÁO DOANH THU NGÀY</b>',
            '',
            `📅 Ngày: ${summary.date || new Date().toLocaleDateString('vi-VN')}`,
            `🛒 Tổng đơn: <b>${summary.order_count || 0}</b>`,
            `💰 Doanh thu: <b>${this.formatVND(summary.revenue)}</b>`,
            `👥 Khách hàng mới: <b>${summary.new_customers || 0}</b>`,
            '',
            summary.top_items ? '🏆 Top sản phẩm:' : '',
            ...(summary.top_items || []).map((item, i) =>
                `  ${i + 1}. ${item.name} (${item.count} lần)`
            ),
            '',
            `⏰ ${this.formatTime()}`
        ].filter(Boolean).join('\n');

        await Promise.allSettled([
            this.sendTelegram(message, tenantId),
            this.sendWebhook('report.daily', summary, tenantId)
        ]);
    }

    /**
     * New customer registered
     */
    async notifyNewCustomer(customer, tenantId) {
        const message = [
            '👤 <b>KHÁCH HÀNG MỚI</b>',
            '',
            `📱 SĐT: <b>${customer.phone || 'N/A'}</b>`,
            `👋 Tên: ${customer.name || 'Chưa cập nhật'}`,
            `⏰ ${this.formatTime()}`
        ].join('\n');

        await Promise.allSettled([
            this.sendTelegram(message, tenantId),
            this.sendWebhook('customer.new', customer, tenantId)
        ]);
    }

    /**
     * Order status changed
     */
    async notifyOrderStatusChange(order, newStatus, tenantId) {
        const statusMap = {
            'Pending': '⏳ Chờ xác nhận',
            'Preparing': '🔥 Đang pha chế',
            'Ready': '✅ Đã hoàn thành',
            'Completed': '🎉 Đã giao',
            'Cancelled': '❌ Đã hủy'
        };

        const message = [
            `📋 <b>CẬP NHẬT ĐƠN HÀNG</b>`,
            '',
            `Mã đơn: <code>${(order.id || '').substring(0, 8).toUpperCase()}</code>`,
            `🪑 Bàn: ${order.table_number || 'N/A'}`,
            `📌 Trạng thái: <b>${statusMap[newStatus] || newStatus}</b>`,
            `⏰ ${this.formatTime()}`
        ].join('\n');

        // Only webhook for status changes (avoid Telegram spam)
        await this.sendWebhook('order.status_changed', {
            order_id: order.id,
            table: order.table_number,
            status: newStatus
        }, tenantId);
    }

    // =============================================
    // UTILITY
    // =============================================
    formatVND(amount) {
        return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
    }

    formatTime() {
        return new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    }
}

// Singleton
module.exports = new NotificationService();
