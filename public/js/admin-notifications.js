// =============================================
// ADMIN NOTIFICATIONS MODULE — Phase 9: In-App Notification Center
// =============================================

(function() {
    'use strict';

    // Notification store
    let notifications = [];
    let unreadCount = 0;
    let isNotifPanelOpen = false;
    let realtimeChannel = null;

    // =============================================
    // 9A — NOTIFICATION CENTER UI (Bell + Panel)
    // =============================================

    function initNotificationCenter() {
        injectNotificationUI();
        loadStoredNotifications();
        setupRealtimeListeners();
        startPeriodicChecks();
    }

    function injectNotificationUI() {
        // Inject into mobile header (before hamburger button)
        const mobileHeader = document.querySelector('header.md\\:hidden');
        if (mobileHeader) {
            const hamburgerBtn = mobileHeader.querySelector('button[onclick*="openSidebar"]');
            if (hamburgerBtn) {
                const bellBtn = createBellButton('mobile-notif-bell');
                hamburgerBtn.parentNode.insertBefore(bellBtn, hamburgerBtn);
            }
        }

        // Inject into sidebar header (after tenant name)
        const sidebarHeader = document.querySelector('#admin-sidebar > div:first-child');
        if (sidebarHeader) {
            const bellBtn = createBellButton('desktop-notif-bell');
            bellBtn.classList.add('hidden', 'md:flex');
            const closeBtn = sidebarHeader.querySelector('button.md\\:hidden');
            if (closeBtn) {
                sidebarHeader.insertBefore(bellBtn, closeBtn);
            } else {
                sidebarHeader.appendChild(bellBtn);
            }
        }

        // Inject notification panel
        const panel = document.createElement('div');
        panel.id = 'notif-panel';
        panel.className = 'notif-panel';
        panel.innerHTML = `
            <div class="notif-panel-header">
                <div class="flex items-center gap-2">
                    <i class="fa-solid fa-bell text-[#C0A062]"></i>
                    <span class="font-bold text-slate-800">Thông báo</span>
                    <span id="notif-count-badge" class="notif-count-inline hidden">0</span>
                </div>
                <div class="flex items-center gap-1">
                    <button onclick="AdminNotifications.markAllRead()" class="notif-action-btn" title="Đánh dấu tất cả đã đọc">
                        <i class="fa-solid fa-check-double"></i>
                    </button>
                    <button onclick="AdminNotifications.clearAll()" class="notif-action-btn" title="Xóa tất cả">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>
                    <button onclick="AdminNotifications.togglePanel()" class="notif-action-btn" title="Đóng">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>
            </div>
            <div id="notif-list" class="notif-list">
                <div class="notif-empty">
                    <i class="fa-regular fa-bell-slash text-3xl text-slate-300 mb-2"></i>
                    <p class="text-slate-400 text-sm">Không có thông báo mới</p>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Inject backdrop
        const backdrop = document.createElement('div');
        backdrop.id = 'notif-backdrop';
        backdrop.className = 'notif-backdrop hidden';
        backdrop.onclick = () => togglePanel();
        document.body.appendChild(backdrop);

        // Inject styles
        injectNotificationStyles();
    }

    function createBellButton(id) {
        const btn = document.createElement('button');
        btn.id = id;
        btn.className = 'notif-bell-btn';
        btn.onclick = () => togglePanel();
        btn.innerHTML = `
            <i class="fa-solid fa-bell"></i>
            <span class="notif-badge hidden" id="${id}-badge">0</span>
        `;
        return btn;
    }

    function injectNotificationStyles() {
        const style = document.createElement('style');
        style.textContent = `
            .notif-bell-btn {
                position: relative;
                background: transparent;
                border: none;
                cursor: pointer;
                width: 40px;
                height: 40px;
                border-radius: 12px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #64748b;
                font-size: 18px;
                transition: all 0.2s ease;
                flex-shrink: 0;
            }
            .notif-bell-btn:hover {
                background: #f1f5f9;
                color: #C0A062;
            }
            .notif-bell-btn.has-unread {
                animation: bellShake 0.5s ease;
            }
            .notif-badge {
                position: absolute;
                top: 4px;
                right: 4px;
                background: #ef4444;
                color: white;
                font-size: 10px;
                font-weight: 800;
                min-width: 18px;
                height: 18px;
                border-radius: 9px;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 0 4px;
                line-height: 1;
                box-shadow: 0 2px 4px rgba(239,68,68,0.4);
            }
            .notif-count-inline {
                background: #ef4444;
                color: white;
                font-size: 11px;
                font-weight: 700;
                min-width: 20px;
                height: 20px;
                border-radius: 10px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                padding: 0 6px;
            }
            .notif-panel {
                position: fixed;
                top: 0;
                right: -400px;
                width: 380px;
                max-width: 100vw;
                height: 100vh;
                background: #ffffff;
                box-shadow: -8px 0 32px rgba(0,0,0,0.15);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                transition: right 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            }
            .notif-panel.open {
                right: 0;
            }
            .notif-panel-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 16px 20px;
                border-bottom: 1px solid #e2e8f0;
                background: #fafafa;
            }
            .notif-action-btn {
                background: transparent;
                border: none;
                cursor: pointer;
                width: 32px;
                height: 32px;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: center;
                color: #94a3b8;
                font-size: 14px;
                transition: all 0.15s;
            }
            .notif-action-btn:hover {
                background: #f1f5f9;
                color: #475569;
            }
            .notif-list {
                flex: 1;
                overflow-y: auto;
                padding: 8px;
            }
            .notif-empty {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                padding: 60px 20px;
            }
            .notif-item {
                display: flex;
                gap: 12px;
                padding: 12px 14px;
                border-radius: 12px;
                cursor: pointer;
                transition: background 0.15s;
                margin-bottom: 4px;
                position: relative;
            }
            .notif-item:hover {
                background: #f8fafc;
            }
            .notif-item.unread {
                background: #eff6ff;
                border-left: 3px solid #3b82f6;
            }
            .notif-item .notif-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
                font-size: 14px;
            }
            .notif-icon.type-order { background: #dbeafe; color: #2563eb; }
            .notif-icon.type-stock { background: #fef3c7; color: #d97706; }
            .notif-icon.type-system { background: #e0e7ff; color: #4f46e5; }
            .notif-icon.type-customer { background: #d1fae5; color: #059669; }
            .notif-icon.type-alert { background: #fee2e2; color: #dc2626; }
            .notif-item .notif-content { flex: 1; min-width: 0; }
            .notif-item .notif-title { font-size: 13px; font-weight: 600; color: #1e293b; line-height: 1.4; }
            .notif-item .notif-desc { font-size: 12px; color: #64748b; margin-top: 2px; line-height: 1.3; }
            .notif-item .notif-time { font-size: 10px; color: #94a3b8; margin-top: 4px; font-weight: 500; }
            .notif-backdrop {
                position: fixed;
                inset: 0;
                background: rgba(0,0,0,0.3);
                z-index: 9999;
                transition: opacity 0.3s;
            }
            @keyframes bellShake {
                0%, 100% { transform: rotate(0deg); }
                20% { transform: rotate(15deg); }
                40% { transform: rotate(-10deg); }
                60% { transform: rotate(8deg); }
                80% { transform: rotate(-5deg); }
            }
            @media (max-width: 480px) {
                .notif-panel { width: 100vw; }
            }
        `;
        document.head.appendChild(style);
    }

    // =============================================
    // 9B — NOTIFICATION MANAGEMENT
    // =============================================

    function addNotification(notif) {
        const id = Date.now() + Math.random().toString(36).substring(2, 7);
        const notification = {
            id,
            type: notif.type || 'system',
            title: notif.title,
            description: notif.description || '',
            time: new Date().toISOString(),
            read: false,
            action: notif.action || null // e.g., { tab: 'inventory' }
        };

        notifications.unshift(notification);
        if (notifications.length > 50) notifications = notifications.slice(0, 50);
        unreadCount++;

        updateBadges();
        renderNotifList();
        saveNotifications();

        // Play sound for critical notifications
        if (notif.playSound !== false) {
            playNotifSound(notif.type);
        }

        // Also show toast
        if (notif.showToast !== false && typeof showAdminToast === 'function') {
            const toastType = notif.type === 'alert' || notif.type === 'stock' ? 'warning' : 'info';
            showAdminToast(`${notif.title}`, toastType, 5000);
        }

        return id;
    }

    function markAsRead(notifId) {
        const notif = notifications.find(n => n.id === notifId);
        if (notif && !notif.read) {
            notif.read = true;
            unreadCount = Math.max(0, unreadCount - 1);
            updateBadges();
            renderNotifList();
            saveNotifications();
        }
    }

    function markAllRead() {
        notifications.forEach(n => n.read = true);
        unreadCount = 0;
        updateBadges();
        renderNotifList();
        saveNotifications();
    }

    function clearAll() {
        notifications = [];
        unreadCount = 0;
        updateBadges();
        renderNotifList();
        saveNotifications();
    }

    function togglePanel() {
        isNotifPanelOpen = !isNotifPanelOpen;
        const panel = document.getElementById('notif-panel');
        const backdrop = document.getElementById('notif-backdrop');
        if (panel) panel.classList.toggle('open', isNotifPanelOpen);
        if (backdrop) backdrop.classList.toggle('hidden', !isNotifPanelOpen);
    }

    function updateBadges() {
        const badges = document.querySelectorAll('.notif-badge');
        badges.forEach(b => {
            b.textContent = unreadCount;
            b.classList.toggle('hidden', unreadCount === 0);
        });

        const inlineBadge = document.getElementById('notif-count-badge');
        if (inlineBadge) {
            inlineBadge.textContent = unreadCount;
            inlineBadge.classList.toggle('hidden', unreadCount === 0);
        }

        // Animate bell
        const bells = document.querySelectorAll('.notif-bell-btn');
        if (unreadCount > 0) {
            bells.forEach(b => {
                b.classList.add('has-unread');
                setTimeout(() => b.classList.remove('has-unread'), 600);
            });
        }
    }

    function renderNotifList() {
        const list = document.getElementById('notif-list');
        if (!list) return;

        if (notifications.length === 0) {
            list.innerHTML = `
                <div class="notif-empty">
                    <i class="fa-regular fa-bell-slash text-3xl text-slate-300 mb-2"></i>
                    <p class="text-slate-400 text-sm">Không có thông báo mới</p>
                </div>`;
            return;
        }

        const iconMap = {
            order: 'fa-solid fa-receipt',
            stock: 'fa-solid fa-boxes-stacked',
            system: 'fa-solid fa-circle-info',
            customer: 'fa-solid fa-user-plus',
            alert: 'fa-solid fa-triangle-exclamation'
        };

        list.innerHTML = notifications.map(n => {
            const icon = iconMap[n.type] || iconMap.system;
            const timeAgo = getTimeAgo(n.time);
            const unreadClass = n.read ? '' : 'unread';
            const actionAttr = n.action ? `onclick="AdminNotifications.handleAction('${n.id}', '${n.action.tab || ''}')"` : `onclick="AdminNotifications.markAsRead('${n.id}')"`;

            return `
                <div class="notif-item ${unreadClass}" ${actionAttr}>
                    <div class="notif-icon type-${n.type}"><i class="${icon}"></i></div>
                    <div class="notif-content">
                        <div class="notif-title">${escapeNotifHTML(n.title)}</div>
                        ${n.description ? `<div class="notif-desc">${escapeNotifHTML(n.description)}</div>` : ''}
                        <div class="notif-time"><i class="fa-regular fa-clock me-1"></i>${timeAgo}</div>
                    </div>
                </div>`;
        }).join('');
    }

    function handleAction(notifId, tab) {
        markAsRead(notifId);
        togglePanel();
        if (tab && typeof switchTab === 'function') {
            setTimeout(() => switchTab(tab), 200);
        }
    }

    // =============================================
    // 9C — REALTIME LISTENERS (Supabase)
    // =============================================

    function setupRealtimeListeners() {
        if (typeof supabase === 'undefined') return;
        const tenantId = window.AdminState?.tenantId;
        if (!tenantId) return;

        try {
            // Listen for new orders
            realtimeChannel = supabase
                .channel('admin-notifications')
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` },
                    (payload) => {
                        const order = payload.new;
                        const tableNum = order.table_number || 'N/A';
                        const total = (order.total_price || 0).toLocaleString('vi-VN');
                        addNotification({
                            type: 'order',
                            title: `🛒 Đơn hàng mới — Bàn ${tableNum}`,
                            description: `Tổng: ${total}₫`,
                            action: { tab: 'history' }
                        });
                    }
                )
                .on('postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'ingredients', filter: `tenant_id=eq.${tenantId}` },
                    (payload) => {
                        const ing = payload.new;
                        const threshold = ing.low_stock_threshold || 50;
                        if ((ing.stock || 0) <= threshold && (ing.stock || 0) > 0) {
                            addNotification({
                                type: 'stock',
                                title: `⚠️ ${ing.name} sắp hết`,
                                description: `Còn lại: ${ing.stock} (ngưỡng: ${threshold})`,
                                action: { tab: 'inventory' }
                            });
                        } else if ((ing.stock || 0) <= 0) {
                            addNotification({
                                type: 'alert',
                                title: `🚨 ${ing.name} đã HẾT HÀNG!`,
                                description: `Tồn kho: 0. Cần nhập hàng ngay.`,
                                action: { tab: 'restock' }
                            });
                        }
                    }
                )
                .on('postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'customers', filter: `tenant_id=eq.${tenantId}` },
                    (payload) => {
                        const customer = payload.new;
                        addNotification({
                            type: 'customer',
                            title: `👤 Khách hàng mới đăng ký`,
                            description: customer.name || customer.phone || 'N/A',
                            action: { tab: 'customers' },
                            playSound: false
                        });
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Notifications realtime channel connected');
                    }
                });
        } catch (e) {
            console.error('Lỗi thiết lập realtime notifications:', e);
        }
    }

    // =============================================
    // 9D — PERIODIC CHECKS (Low Stock, Daily Summary)
    // =============================================

    function startPeriodicChecks() {
        // Check low stock every 10 minutes
        checkLowStockNotifications();
        setInterval(checkLowStockNotifications, 10 * 60 * 1000);

        // Daily summary at start
        checkDailySummary();
    }

    async function checkLowStockNotifications() {
        try {
            const tenantId = window.AdminState?.tenantId;
            if (!tenantId) return;

            const { data: ingredients } = await supabase
                .from('ingredients')
                .select('name, stock, low_stock_threshold')
                .eq('tenant_id', tenantId);

            if (!ingredients) return;

            const criticalItems = ingredients.filter(i => (i.stock || 0) <= 0);
            const lowItems = ingredients.filter(i => {
                const threshold = i.low_stock_threshold || 50;
                return (i.stock || 0) > 0 && (i.stock || 0) <= threshold;
            });

            // Only notify once per session per item
            const warnedKey = 'notif_lowstock_warned';
            const warned = JSON.parse(sessionStorage.getItem(warnedKey) || '[]');

            criticalItems.forEach(item => {
                if (!warned.includes('crit_' + item.name)) {
                    addNotification({
                        type: 'alert',
                        title: `🚨 ${item.name} đã HẾT HÀNG!`,
                        description: 'Tồn kho: 0. Cần nhập hàng ngay.',
                        action: { tab: 'restock' },
                        showToast: true
                    });
                    warned.push('crit_' + item.name);
                }
            });

            if (lowItems.length > 0) {
                const notYetWarned = lowItems.filter(i => !warned.includes('low_' + i.name));
                if (notYetWarned.length > 0) {
                    addNotification({
                        type: 'stock',
                        title: `⚠️ ${notYetWarned.length} nguyên liệu sắp hết`,
                        description: notYetWarned.map(i => `${i.name} (${i.stock})`).slice(0, 4).join(', '),
                        action: { tab: 'inventory' },
                        showToast: false
                    });
                    notYetWarned.forEach(i => warned.push('low_' + i.name));
                }
            }

            sessionStorage.setItem(warnedKey, JSON.stringify(warned));
        } catch (e) {
            console.error('Lỗi kiểm tra tồn kho:', e);
        }
    }

    async function checkDailySummary() {
        try {
            const tenantId = window.AdminState?.tenantId;
            if (!tenantId) return;

            // Only show once per day
            const today = new Date().toISOString().slice(0, 10);
            const lastSummary = localStorage.getItem('notif_daily_summary');
            if (lastSummary === today) return;

            const startOfDay = today + 'T00:00:00';
            const { data: todayOrders } = await supabase
                .from('orders')
                .select('total_price, status')
                .eq('tenant_id', tenantId)
                .gte('created_at', startOfDay);

            if (todayOrders && todayOrders.length > 0) {
                const completed = todayOrders.filter(o => o.status === 'completed' || o.status === 'ready');
                const revenue = completed.reduce((s, o) => s + (o.total_price || 0), 0);

                addNotification({
                    type: 'system',
                    title: `📊 Tổng kết: ${completed.length} đơn hôm nay`,
                    description: `Doanh thu: ${revenue.toLocaleString('vi-VN')}₫`,
                    action: { tab: 'dashboard' },
                    playSound: false,
                    showToast: false
                });
            }

            localStorage.setItem('notif_daily_summary', today);
        } catch (e) {
            console.error('Lỗi daily summary:', e);
        }
    }

    // =============================================
    // HELPERS
    // =============================================

    function playNotifSound(type) {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain);
            gain.connect(ctx.destination);

            if (type === 'alert') {
                osc.frequency.value = 880;
                gain.gain.value = 0.15;
            } else if (type === 'order') {
                osc.frequency.value = 660;
                gain.gain.value = 0.1;
            } else {
                osc.frequency.value = 520;
                gain.gain.value = 0.08;
            }

            osc.start();
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
            osc.stop(ctx.currentTime + 0.3);
        } catch (e) { /* Ignore audio errors */ }
    }

    function getTimeAgo(isoTime) {
        const diff = Date.now() - new Date(isoTime).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Vừa xong';
        if (mins < 60) return `${mins} phút trước`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours} giờ trước`;
        const days = Math.floor(hours / 24);
        return `${days} ngày trước`;
    }

    function escapeNotifHTML(str) {
        const div = document.createElement('div');
        div.textContent = str || '';
        return div.innerHTML;
    }

    function saveNotifications() {
        try {
            localStorage.setItem('admin_notifications', JSON.stringify(notifications.slice(0, 30)));
        } catch (e) { /* Storage full */ }
    }

    function loadStoredNotifications() {
        try {
            const stored = JSON.parse(localStorage.getItem('admin_notifications') || '[]');
            notifications = stored;
            unreadCount = notifications.filter(n => !n.read).length;
            updateBadges();
            renderNotifList();
        } catch (e) { notifications = []; }
    }

    // =============================================
    // PUBLIC API
    // =============================================

    window.AdminNotifications = {
        init: initNotificationCenter,
        add: addNotification,
        markAsRead,
        markAllRead,
        clearAll,
        togglePanel,
        handleAction,
        getUnreadCount: () => unreadCount
    };

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => setTimeout(initNotificationCenter, 500));
    } else {
        setTimeout(initNotificationCenter, 500);
    }

})();
