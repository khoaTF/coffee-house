// =============================================
// ADMIN INTEGRATIONS — Telegram & Webhook Configuration
// =============================================

(function () {
    'use strict';

    // =============================================
    // UI INJECTION
    // =============================================

    function injectIntegrationSection() {
        const settingsTab = document.getElementById('section-settings');
        if (!settingsTab) return;

        // Check if already injected
        if (document.getElementById('integration-settings-panel')) return;

        // Find the settings container to append our section
        const settingsContainer = settingsTab.querySelector('.settings-container, .card-body, .p-6');
        const target = settingsContainer || settingsTab;

        const panel = document.createElement('div');
        panel.id = 'integration-settings-panel';
        panel.innerHTML = `
            <div style="margin-top: 32px; border-top: 1px solid var(--border-color, #e2e8f0); padding-top: 32px;">
                <h3 style="font-size: 18px; font-weight: 800; margin-bottom: 4px; display: flex; align-items: center; gap: 8px;">
                    <i class="fa-solid fa-plug" style="color: #d4a76a;"></i>
                    Tích hợp & Thông báo bên ngoài
                </h3>
                <p style="font-size: 13px; color: #94a3b8; margin-bottom: 24px;">
                    Kết nối Telegram Bot hoặc Webhook để nhận thông báo đơn hàng, tồn kho, doanh thu tự động.
                </p>

                <!-- Telegram Section -->
                <div class="intg-card" id="telegram-config-card">
                    <div class="intg-card-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="intg-icon" style="background: linear-gradient(135deg, #0088cc, #00a2e8);">
                                <i class="fa-brands fa-telegram"></i>
                            </div>
                            <div>
                                <div class="intg-title">Telegram Bot</div>
                                <div class="intg-desc">Nhận thông báo real-time qua Telegram</div>
                            </div>
                        </div>
                        <div id="telegram-status-badge" class="intg-badge intg-badge-off">Chưa kết nối</div>
                    </div>
                    <div class="intg-card-body">
                        <div class="intg-field">
                            <label>Bot Token</label>
                            <input type="password" id="intg-telegram-token" placeholder="123456:ABC-DEF..." autocomplete="off">
                            <small>Lấy từ <a href="https://t.me/BotFather" target="_blank" style="color: #d4a76a;">@BotFather</a></small>
                        </div>
                        <div class="intg-field">
                            <label>Chat ID / Group ID</label>
                            <input type="text" id="intg-telegram-chatid" placeholder="-1001234567890" autocomplete="off">
                            <small>Dùng <a href="https://t.me/userinfobot" target="_blank" style="color: #d4a76a;">@userinfobot</a> để lấy ID</small>
                        </div>
                        <div class="intg-actions">
                            <button class="intg-btn intg-btn-test" onclick="window.AdminIntegrations.testTelegram()">
                                <i class="fa-solid fa-paper-plane"></i> Gửi test
                            </button>
                            <button class="intg-btn intg-btn-save" onclick="window.AdminIntegrations.saveTelegram()">
                                <i class="fa-solid fa-floppy-disk"></i> Lưu
                            </button>
                        </div>
                        <div id="telegram-test-result" class="intg-result" style="display: none;"></div>
                    </div>
                </div>

                <!-- Webhook Section -->
                <div class="intg-card" id="webhook-config-card">
                    <div class="intg-card-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="intg-icon" style="background: linear-gradient(135deg, #8b5cf6, #a855f7);">
                                <i class="fa-solid fa-link"></i>
                            </div>
                            <div>
                                <div class="intg-title">Webhook URL</div>
                                <div class="intg-desc">Gửi events tới hệ thống bên ngoài (Zalo, Discord, Slack...)</div>
                            </div>
                        </div>
                        <div id="webhook-status-badge" class="intg-badge intg-badge-off">Chưa kết nối</div>
                    </div>
                    <div class="intg-card-body">
                        <div class="intg-field">
                            <label>Webhook URL</label>
                            <input type="url" id="intg-webhook-url" placeholder="https://hooks.example.com/nohope" autocomplete="off">
                        </div>
                        <div class="intg-field">
                            <label>Secret Key (tùy chọn)</label>
                            <input type="password" id="intg-webhook-secret" placeholder="my_secret_key" autocomplete="off">
                            <small>Được gửi qua header <code>X-Webhook-Secret</code></small>
                        </div>
                        <div class="intg-actions">
                            <button class="intg-btn intg-btn-test" onclick="window.AdminIntegrations.testWebhook()">
                                <i class="fa-solid fa-vial"></i> Test
                            </button>
                            <button class="intg-btn intg-btn-save" onclick="window.AdminIntegrations.saveWebhook()">
                                <i class="fa-solid fa-floppy-disk"></i> Lưu
                            </button>
                        </div>
                        <div id="webhook-test-result" class="intg-result" style="display: none;"></div>
                    </div>
                </div>

                <!-- Notification Preferences -->
                <div class="intg-card" id="notif-prefs-card">
                    <div class="intg-card-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="intg-icon" style="background: linear-gradient(135deg, #f59e0b, #f97316);">
                                <i class="fa-solid fa-bell"></i>
                            </div>
                            <div>
                                <div class="intg-title">Loại thông báo</div>
                                <div class="intg-desc">Chọn sự kiện muốn nhận qua kênh bên ngoài</div>
                            </div>
                        </div>
                    </div>
                    <div class="intg-card-body">
                        <div class="intg-toggles">
                            <label class="intg-toggle-row">
                                <span>🛒 Đơn hàng mới</span>
                                <input type="checkbox" id="notif-pref-orders" checked>
                                <span class="intg-toggle-slider"></span>
                            </label>
                            <label class="intg-toggle-row">
                                <span>💳 Thanh toán xác nhận</span>
                                <input type="checkbox" id="notif-pref-payments" checked>
                                <span class="intg-toggle-slider"></span>
                            </label>
                            <label class="intg-toggle-row">
                                <span>⚠️ Cảnh báo tồn kho</span>
                                <input type="checkbox" id="notif-pref-stock" checked>
                                <span class="intg-toggle-slider"></span>
                            </label>
                            <label class="intg-toggle-row">
                                <span>👤 Khách hàng mới</span>
                                <input type="checkbox" id="notif-pref-customers">
                                <span class="intg-toggle-slider"></span>
                            </label>
                            <label class="intg-toggle-row">
                                <span>📊 Báo cáo doanh thu hàng ngày</span>
                                <input type="checkbox" id="notif-pref-daily" checked>
                                <span class="intg-toggle-slider"></span>
                            </label>
                        </div>
                        <div style="margin-top: 12px;">
                            <button class="intg-btn intg-btn-save" onclick="window.AdminIntegrations.savePrefs()" style="width: 100%;">
                                <i class="fa-solid fa-floppy-disk"></i> Lưu tuỳ chọn thông báo
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Manual Send -->
                <div class="intg-card">
                    <div class="intg-card-header">
                        <div style="display: flex; align-items: center; gap: 10px;">
                            <div class="intg-icon" style="background: linear-gradient(135deg, #10b981, #059669);">
                                <i class="fa-solid fa-bullhorn"></i>
                            </div>
                            <div>
                                <div class="intg-title">Gửi thông báo thủ công</div>
                                <div class="intg-desc">Gửi tin nhắn tùy chỉnh tới tất cả kênh đã kết nối</div>
                            </div>
                        </div>
                    </div>
                    <div class="intg-card-body">
                        <div class="intg-field">
                            <textarea id="intg-manual-message" rows="3" placeholder="Nhập nội dung thông báo..."></textarea>
                        </div>
                        <button class="intg-btn intg-btn-test" onclick="window.AdminIntegrations.sendManual()" style="width: 100%;">
                            <i class="fa-solid fa-paper-plane"></i> Gửi ngay
                        </button>
                    </div>
                </div>
            </div>
        `;
        target.appendChild(panel);
    }

    // =============================================
    // STYLES
    // =============================================
    function injectStyles() {
        if (document.getElementById('intg-styles')) return;
        const style = document.createElement('style');
        style.id = 'intg-styles';
        style.textContent = `
            .intg-card {
                background: var(--card-bg, #ffffff);
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 16px;
                margin-bottom: 16px;
                overflow: hidden;
                transition: box-shadow 0.2s;
            }
            .intg-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.06); }
            .intg-card-header {
                padding: 16px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                border-bottom: 1px solid var(--border-color, #e2e8f0);
            }
            .intg-icon {
                width: 40px; height: 40px;
                border-radius: 12px;
                display: flex; align-items: center; justify-content: center;
                color: white; font-size: 18px;
            }
            .intg-title { font-weight: 700; font-size: 14px; color: var(--text-primary, #1e293b); }
            .intg-desc { font-size: 12px; color: #94a3b8; margin-top: 1px; }
            .intg-card-body { padding: 16px 20px; }
            .intg-field { margin-bottom: 14px; }
            .intg-field label {
                display: block; font-size: 12px; font-weight: 700;
                color: var(--text-primary, #1e293b); margin-bottom: 4px;
                text-transform: uppercase; letter-spacing: 0.5px;
            }
            .intg-field input, .intg-field textarea {
                width: 100%; padding: 10px 14px;
                border: 1px solid var(--border-color, #e2e8f0);
                border-radius: 10px; font-size: 13px;
                background: var(--input-bg, #f8fafc);
                color: var(--text-primary, #1e293b);
                outline: none; transition: border-color 0.2s;
            }
            .intg-field input:focus, .intg-field textarea:focus {
                border-color: #d4a76a; box-shadow: 0 0 0 3px rgba(212,167,106,0.15);
            }
            .intg-field small { display: block; font-size: 11px; color: #94a3b8; margin-top: 4px; }
            .intg-field small code { background: rgba(0,0,0,0.06); padding: 1px 4px; border-radius: 3px; font-size: 10px; }
            .intg-actions { display: flex; gap: 8px; }
            .intg-btn {
                padding: 8px 18px; border: none; border-radius: 10px;
                font-size: 13px; font-weight: 700; cursor: pointer;
                display: inline-flex; align-items: center; gap: 6px;
                transition: all 0.15s;
            }
            .intg-btn:active { transform: scale(0.96); }
            .intg-btn-test {
                background: var(--input-bg, #f1f5f9); color: var(--text-primary, #475569);
                border: 1px solid var(--border-color, #e2e8f0);
            }
            .intg-btn-test:hover { background: #e2e8f0; }
            .intg-btn-save {
                background: linear-gradient(135deg, #d4a76a, #c0a062);
                color: #0d1117;
            }
            .intg-btn-save:hover { box-shadow: 0 2px 8px rgba(212,167,106,0.4); }
            .intg-badge {
                padding: 4px 10px; border-radius: 20px;
                font-size: 11px; font-weight: 700;
                white-space: nowrap;
            }
            .intg-badge-on { background: #dcfce7; color: #15803d; }
            .intg-badge-off { background: #f1f5f9; color: #94a3b8; }
            .intg-result {
                margin-top: 12px; padding: 10px 14px;
                border-radius: 10px; font-size: 13px; font-weight: 600;
            }
            .intg-result.success { background: #dcfce7; color: #15803d; }
            .intg-result.error { background: #fef2f2; color: #b91c1c; }

            /* Toggle switches */
            .intg-toggles { display: flex; flex-direction: column; gap: 4px; }
            .intg-toggle-row {
                display: flex; justify-content: space-between; align-items: center;
                padding: 10px 0; cursor: pointer; position: relative;
                font-size: 14px; color: var(--text-primary, #1e293b); font-weight: 500;
            }
            .intg-toggle-row input { opacity: 0; width: 0; height: 0; position: absolute; }
            .intg-toggle-slider {
                width: 44px; height: 24px;
                background: #cbd5e1; border-radius: 12px;
                position: relative; transition: background 0.2s;
                flex-shrink: 0;
            }
            .intg-toggle-slider::after {
                content: ''; position: absolute;
                top: 2px; left: 2px; width: 20px; height: 20px;
                border-radius: 50%; background: white;
                box-shadow: 0 1px 3px rgba(0,0,0,0.2);
                transition: transform 0.2s;
            }
            .intg-toggle-row input:checked + .intg-toggle-slider { background: #d4a76a; }
            .intg-toggle-row input:checked + .intg-toggle-slider::after { transform: translateX(20px); }
        `;
        document.head.appendChild(style);
    }

    // =============================================
    // API CALLS
    // =============================================

    function getTenantId() {
        return window.AdminState?.tenantId || localStorage.getItem('admin_tenant_id') || '';
    }

    async function testTelegram() {
        const token = document.getElementById('intg-telegram-token')?.value?.trim();
        const chatId = document.getElementById('intg-telegram-chatid')?.value?.trim();
        const resultDiv = document.getElementById('telegram-test-result');

        if (!token || !chatId) {
            showResult(resultDiv, 'Vui lòng nhập cả Bot Token và Chat ID', false);
            return;
        }

        showResult(resultDiv, '⏳ Đang gửi test...', true);

        try {
            const res = await fetch('/api/notifications/test-telegram', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bot_token: token, chat_id: chatId, tenant_id: getTenantId() })
            });
            const data = await res.json();
            showResult(resultDiv, data.success ? '✅ ' + data.message : '❌ ' + (data.error || data.hint), data.success);

            if (data.success) {
                document.getElementById('telegram-status-badge').className = 'intg-badge intg-badge-on';
                document.getElementById('telegram-status-badge').textContent = 'Đã kết nối';
            }
        } catch (e) {
            showResult(resultDiv, '❌ Lỗi mạng: ' + e.message, false);
        }
    }

    async function testWebhook() {
        const url = document.getElementById('intg-webhook-url')?.value?.trim();
        const secret = document.getElementById('intg-webhook-secret')?.value?.trim();
        const resultDiv = document.getElementById('webhook-test-result');

        if (!url) {
            showResult(resultDiv, 'Vui lòng nhập Webhook URL', false);
            return;
        }

        showResult(resultDiv, '⏳ Đang test...', true);

        try {
            const res = await fetch('/api/notifications/test-webhook', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ webhook_url: url, webhook_secret: secret })
            });
            const data = await res.json();
            showResult(resultDiv, data.success ? '✅ ' + data.message : '❌ ' + data.message, data.success);

            if (data.success) {
                document.getElementById('webhook-status-badge').className = 'intg-badge intg-badge-on';
                document.getElementById('webhook-status-badge').textContent = 'Đã kết nối';
            }
        } catch (e) {
            showResult(resultDiv, '❌ Lỗi mạng: ' + e.message, false);
        }
    }

    async function saveTelegram() {
        const token = document.getElementById('intg-telegram-token')?.value?.trim();
        const chatId = document.getElementById('intg-telegram-chatid')?.value?.trim();
        const tenantId = getTenantId();

        if (!tenantId) {
            if (typeof showAdminToast === 'function') showAdminToast('⚠️ Không tìm thấy tenant ID', 'warning');
            return;
        }

        try {
            const res = await fetch('/api/notifications/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId, telegram_bot_token: token, telegram_chat_id: chatId })
            });
            const data = await res.json();
            if (data.success) {
                if (typeof showAdminToast === 'function') showAdminToast('✅ Cấu hình Telegram đã lưu', 'success');
            } else {
                if (typeof showAdminToast === 'function') showAdminToast('❌ ' + (data.error || 'Lỗi lưu'), 'error');
            }
        } catch (e) {
            if (typeof showAdminToast === 'function') showAdminToast('❌ Lỗi mạng', 'error');
        }
    }

    async function saveWebhook() {
        const url = document.getElementById('intg-webhook-url')?.value?.trim();
        const secret = document.getElementById('intg-webhook-secret')?.value?.trim();
        const tenantId = getTenantId();

        if (!tenantId) {
            if (typeof showAdminToast === 'function') showAdminToast('⚠️ Không tìm thấy tenant ID', 'warning');
            return;
        }

        try {
            const res = await fetch('/api/notifications/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId, webhook_url: url, webhook_secret: secret })
            });
            const data = await res.json();
            if (data.success) {
                if (typeof showAdminToast === 'function') showAdminToast('✅ Cấu hình Webhook đã lưu', 'success');
            } else {
                if (typeof showAdminToast === 'function') showAdminToast('❌ ' + (data.error || 'Lỗi lưu'), 'error');
            }
        } catch (e) {
            if (typeof showAdminToast === 'function') showAdminToast('❌ Lỗi mạng', 'error');
        }
    }

    async function savePrefs() {
        const tenantId = getTenantId();
        if (!tenantId) {
            if (typeof showAdminToast === 'function') showAdminToast('⚠️ Không tìm thấy tenant ID', 'warning');
            return;
        }

        const prefs = {
            notify_orders: document.getElementById('notif-pref-orders')?.checked || false,
            notify_payments: document.getElementById('notif-pref-payments')?.checked || false,
            notify_stock: document.getElementById('notif-pref-stock')?.checked || false,
            notify_customers: document.getElementById('notif-pref-customers')?.checked || false,
            notify_daily: document.getElementById('notif-pref-daily')?.checked || false
        };

        try {
            const res = await fetch('/api/notifications/save-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: tenantId, notifications_config: prefs })
            });
            const data = await res.json();
            if (data.success) {
                if (typeof showAdminToast === 'function') showAdminToast('✅ Tuỳ chọn thông báo đã lưu', 'success');
            }
        } catch (e) {
            if (typeof showAdminToast === 'function') showAdminToast('❌ Lỗi mạng', 'error');
        }
    }

    async function sendManual() {
        const message = document.getElementById('intg-manual-message')?.value?.trim();
        if (!message) {
            if (typeof showAdminToast === 'function') showAdminToast('⚠️ Vui lòng nhập nội dung', 'warning');
            return;
        }

        try {
            const res = await fetch('/api/notifications/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tenant_id: getTenantId(), message })
            });
            const data = await res.json();
            if (data.success) {
                if (typeof showAdminToast === 'function') showAdminToast('✅ Đã gửi thông báo', 'success');
                document.getElementById('intg-manual-message').value = '';
            }
        } catch (e) {
            if (typeof showAdminToast === 'function') showAdminToast('❌ Lỗi gửi', 'error');
        }
    }

    function showResult(el, msg, success) {
        if (!el) return;
        el.style.display = 'block';
        el.className = 'intg-result ' + (success ? 'success' : 'error');
        el.textContent = msg;
        setTimeout(() => { el.style.display = 'none'; }, 6000);
    }

    // =============================================
    // INIT
    // =============================================
    function init() {
        injectStyles();

        // Inject when settings tab is shown
        const observer = new MutationObserver(() => {
            const settingsTab = document.getElementById('section-settings');
            if (settingsTab && settingsTab.style.display !== 'none') {
                injectIntegrationSection();
            }
        });

        observer.observe(document.body, { attributes: true, subtree: true, attributeFilter: ['style'] });

        // Also try injecting immediately
        setTimeout(() => injectIntegrationSection(), 2000);
    }

    // Public API
    window.AdminIntegrations = {
        testTelegram,
        testWebhook,
        saveTelegram,
        saveWebhook,
        savePrefs,
        sendManual
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
