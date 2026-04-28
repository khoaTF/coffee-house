-- =============================================
-- V24: Integration & Notification Config Columns
-- Adds Telegram/Webhook configuration to store_settings
-- =============================================

-- Add notification integration columns to store_settings
ALTER TABLE store_settings
    ADD COLUMN IF NOT EXISTS telegram_bot_token TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS telegram_chat_id TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS webhook_url TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS webhook_secret TEXT DEFAULT '',
    ADD COLUMN IF NOT EXISTS notifications_config JSONB DEFAULT '{
        "notify_orders": true,
        "notify_payments": true,
        "notify_stock": true,
        "notify_customers": false,
        "notify_daily": true
    }'::jsonb;

-- Add comment for documentation
COMMENT ON COLUMN store_settings.telegram_bot_token IS 'Telegram Bot API token from @BotFather';
COMMENT ON COLUMN store_settings.telegram_chat_id IS 'Telegram chat/group/channel ID for notifications';
COMMENT ON COLUMN store_settings.webhook_url IS 'Generic webhook URL for external integrations (Zalo, Discord, etc.)';
COMMENT ON COLUMN store_settings.webhook_secret IS 'Shared secret for webhook authentication via X-Webhook-Secret header';
COMMENT ON COLUMN store_settings.notifications_config IS 'JSON config for notification preferences (which events to send)';

-- RLS: Ensure these columns follow existing store_settings policies
-- (No additional RLS needed as store_settings already has tenant-based policies)
