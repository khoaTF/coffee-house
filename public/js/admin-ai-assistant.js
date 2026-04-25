// =============================================
// ADMIN AI ASSISTANT — Chat UI + Gemini Integration
// =============================================
// Dependencies: admin-core.js (orderHistory, products, inventoryItems, supabase)

(function() {
    'use strict';

    let chatOpen = false;
    let chatHistory = [];
    const PROMPT_CATEGORIES = [
        {
            id: 'pos', label: '🖥️ POS', prompts: [
                { icon: '📊', text: 'Phân tích doanh thu hôm nay' },
                { icon: '📈', text: 'So sánh doanh thu tuần này với tuần trước' },
                { icon: '⏰', text: 'Khung giờ nào đông khách nhất?' },
                { icon: '💵', text: 'Giá trị đơn trung bình hôm nay?' },
            ]
        },
        {
            id: 'menu', label: '🍽️ Thực đơn', prompts: [
                { icon: '➕', text: 'Thêm món mới vào menu' },
                { icon: '💰', text: 'Đổi giá một món trong menu' },
                { icon: '🚫', text: 'Cho món hết hàng tạm thời' },
                { icon: '📋', text: 'Liệt kê tất cả món đang bán' },
                { icon: '🔥', text: 'Top 5 món bán chạy nhất tuần' },
            ]
        },
        {
            id: 'inventory', label: '📦 Tồn kho', prompts: [
                { icon: '⚠️', text: 'Nguyên liệu nào sắp hết?' },
                { icon: '📊', text: 'Tổng quan tồn kho hiện tại' },
                { icon: '📉', text: 'Nguyên liệu nào tiêu hao nhiều nhất?' },
            ]
        },
        {
            id: 'import', label: '🚚 Nhập hàng', prompts: [
                { icon: '📝', text: 'Tổng hợp lịch sử nhập hàng gần đây' },
                { icon: '⚠️', text: 'Nguyên liệu nào cần nhập thêm?' },
                { icon: '💸', text: 'Chi phí nhập hàng tháng này?' },
            ]
        },
        {
            id: 'promo', label: '🎁 Khuyến mãi', prompts: [
                { icon: '🎯', text: 'Nên chạy khuyến mãi gì tuần này?' },
                { icon: '📋', text: 'Liệt kê khuyến mãi đang chạy' },
                { icon: '💡', text: 'Gợi ý combo hấp dẫn cho khách' },
            ]
        },
        {
            id: 'orders', label: '📋 Đơn hàng', prompts: [
                { icon: '📦', text: 'Có bao nhiêu đơn hôm nay?' },
                { icon: '❌', text: 'Có đơn nào bị huỷ không?' },
                { icon: '💡', text: 'Gợi ý cải thiện kinh doanh' },
            ]
        },
    ];

    // --- Build business context from live data ---
    function buildContext() {
        const ctx = {};
        const now = new Date();
        const todayStr = now.toISOString().split('T')[0];

        if (typeof orderHistory !== 'undefined' && Array.isArray(orderHistory)) {
            const todayOrders = orderHistory.filter(o => {
                if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return false;
                return new Date(o.createdAt).toISOString().split('T')[0] === todayStr;
            });
            ctx.todayRevenue = todayOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
            ctx.todayOrders = todayOrders.length;

            // Average order value
            const paidOrders = orderHistory.filter(o => o.paymentStatus === 'paid' && o.status !== 'Cancelled');
            ctx.avgOrderValue = paidOrders.length > 0
                ? Math.round(paidOrders.reduce((s, o) => s + (o.totalPrice || 0), 0) / paidOrders.length)
                : 0;

            // Top items (last 7 days)
            const weekAgo = new Date(now.getTime() - 7 * 86400000);
            const itemCount = {};
            orderHistory.forEach(o => {
                if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return;
                if (new Date(o.createdAt) < weekAgo) return;
                (o.items || []).forEach(it => {
                    const name = it.name || 'Unknown';
                    if (!itemCount[name]) itemCount[name] = 0;
                    itemCount[name] += it.quantity || 1;
                });
            });
            ctx.topItems = Object.entries(itemCount)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([name, qty]) => ({ name, qty }));

            // Week revenue breakdown
            const weekRevenue = {};
            for (let i = 6; i >= 0; i--) {
                const d = new Date(now.getTime() - i * 86400000);
                weekRevenue[d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' })] = 0;
            }
            orderHistory.forEach(o => {
                if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return;
                const d = new Date(o.createdAt);
                if (d < weekAgo) return;
                const key = d.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
                if (weekRevenue[key] !== undefined) weekRevenue[key] += (o.totalPrice || 0);
            });
            ctx.weekRevenue = weekRevenue;
        }

        if (typeof products !== 'undefined' && Array.isArray(products)) {
            ctx.totalProducts = products.filter(p => p.is_available !== false).length;
            ctx.productList = products.map(p => p.name);
        }

        if (typeof inventoryItems !== 'undefined' && Array.isArray(inventoryItems)) {
            ctx.lowStockItems = inventoryItems
                .filter(i => i.quantity <= (i.min_quantity || 10))
                .map(i => `${i.name}(còn ${i.quantity} ${i.unit || ''})`)
                .slice(0, 5);
        }

        return ctx;
    }

    // --- Send message to API ---
    async function sendMessage(userMsg) {
        const msgArea = document.getElementById('ai-chat-messages');
        if (!msgArea) return;

        // Add user bubble
        appendBubble(msgArea, userMsg, 'user');
        chatHistory.push({ role: 'user', text: userMsg });

        // Show typing indicator
        const typingId = 'ai-typing-' + Date.now();
        msgArea.insertAdjacentHTML('beforeend', `
            <div id="${typingId}" class="flex gap-2 items-end mb-3">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-[#e17055] to-[#C0A062] flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-robot text-white text-xs"></i>
                </div>
                <div class="bg-slate-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%]">
                    <div class="flex gap-1.5">
                        <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay:0ms"></span>
                        <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay:150ms"></span>
                        <span class="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style="animation-delay:300ms"></span>
                    </div>
                </div>
            </div>
        `);
        msgArea.scrollTop = msgArea.scrollHeight;

        try {
            const context = buildContext();
            const response = await fetch('/api/ai-assistant', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: userMsg, context })
            });

            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                throw new Error(errData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            appendBubble(msgArea, data.reply || 'Không có phản hồi.', 'ai');
            chatHistory.push({ role: 'ai', text: data.reply });

            if (data.action) {
                appendActionCard(msgArea, data.action);
            }
        } catch (err) {
            const typingEl = document.getElementById(typingId);
            if (typingEl) typingEl.remove();
            appendBubble(msgArea, `❌ Lỗi: ${err.message}. Vui lòng thử lại.`, 'ai');
        }
    }

    // --- Render chat bubble ---
    function appendBubble(container, text, role) {
        const isUser = role === 'user';
        const formattedText = role === 'ai' ? formatMarkdown(text) : escapeHtml(text);

        const html = isUser
            ? `<div class="flex gap-2 items-end mb-3 justify-end">
                <div class="bg-[#C0A062] text-slate-900 rounded-2xl rounded-br-md px-4 py-3 max-w-[85%] text-sm font-medium">${formattedText}</div>
                <div class="w-7 h-7 rounded-full bg-slate-200 flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-user text-slate-600 text-xs"></i>
                </div>
            </div>`
            : `<div class="flex gap-2 items-end mb-3">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-[#e17055] to-[#C0A062] flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-robot text-white text-xs"></i>
                </div>
                <div class="bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] text-sm leading-relaxed ai-response-text">${formattedText}</div>
            </div>`;

        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
    }

    // --- Render action card ---
    function appendActionCard(container, action) {
        const actionId = 'action-' + Date.now();
        const actionJson = JSON.stringify(action).replace(/"/g, '&quot;');
        let summary = '';
        let icon = 'fa-bolt';

        switch (action.type) {
            case 'update_product_availability': {
                const st = action.payload.isAvailable ? 'Còn hàng' : 'Hết hàng';
                summary = `Đổi <strong>${escapeHtml(action.payload.productName)}</strong> → <strong>${st}</strong>`;
                icon = 'fa-toggle-on';
                break;
            }
            case 'add_product': {
                summary = `Thêm <strong>${escapeHtml(action.payload.name)}</strong> — ${Number(action.payload.price).toLocaleString('vi-VN')}đ (${action.payload.category})`;
                icon = 'fa-plus-circle';
                break;
            }
            case 'add_multiple_products': {
                const items = (action.payload.products || []).map(p => `<strong>${escapeHtml(p.name)}</strong> ${Number(p.price).toLocaleString('vi-VN')}đ`).join('<br>');
                summary = `Thêm ${(action.payload.products || []).length} món:<br>${items}`;
                icon = 'fa-layer-group';
                break;
            }
            case 'update_product': {
                const ch = [];
                if (action.payload.updates?.name) ch.push(`Tên → ${action.payload.updates.name}`);
                if (action.payload.updates?.price) ch.push(`Giá → ${Number(action.payload.updates.price).toLocaleString('vi-VN')}đ`);
                if (action.payload.updates?.category) ch.push(`Mục → ${action.payload.updates.category}`);
                summary = `Sửa <strong>${escapeHtml(action.payload.productName)}</strong>: ${ch.join(', ')}`;
                icon = 'fa-pen';
                break;
            }
            case 'delete_product': {
                summary = `Ẩn <strong>${escapeHtml(action.payload.productName)}</strong> khỏi menu`;
                icon = 'fa-eye-slash';
                break;
            }
            default: return;
        }

        const html = `
        <div id="${actionId}" class="flex gap-2 items-end mb-3 ml-9">
            <div class="bg-white border border-[#C0A062]/40 rounded-xl p-3 shadow-sm w-full max-w-[85%]">
                <div class="text-xs text-slate-500 mb-1 font-medium"><i class="fa-solid ${icon} text-[#e17055] mr-1"></i> Đề xuất thao tác</div>
                <div class="text-sm text-slate-800 mb-3 leading-tight">${summary}</div>
                <div class="flex gap-2">
                    <button onclick="window._aiAssistant.executeAction('${actionId}', '${actionJson}')" class="flex-1 bg-gradient-to-r from-[#e17055] to-[#C0A062] text-white text-xs font-bold py-2 rounded-lg hover:opacity-90 transition-opacity border-0 cursor-pointer">
                        <i class="fa-solid fa-check mr-1"></i> Xác nhận
                    </button>
                    <button onclick="document.getElementById('${actionId}').remove()" class="px-3 bg-slate-100 text-slate-600 text-xs font-bold py-2 rounded-lg hover:bg-slate-200 transition-colors border-0 cursor-pointer">
                        Hủy
                    </button>
                </div>
            </div>
        </div>`;
        container.insertAdjacentHTML('beforeend', html);
        container.scrollTop = container.scrollHeight;
    }

    // --- Simple markdown formatter ---
    function formatMarkdown(text) {
        return text
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code class="bg-slate-200 px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
            .replace(/^### (.*$)/gm, '<div class="font-bold text-sm mt-2 mb-1">$1</div>')
            .replace(/^## (.*$)/gm, '<div class="font-bold text-base mt-2 mb-1">$1</div>')
            .replace(/^# (.*$)/gm, '<div class="font-bold text-lg mt-2 mb-1">$1</div>')
            .replace(/^- (.*$)/gm, '<div class="pl-3 before:content-[\"•\"] before:mr-2 before:text-[#C0A062]">$1</div>')
            .replace(/^(\d+)\. (.*$)/gm, '<div class="pl-3"><span class="text-[#C0A062] font-bold mr-1">$1.</span>$2</div>')
            .replace(/\n/g, '<br>');
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // --- Initialize UI ---
    function initAIAssistant() {
        // Floating Action Button
        const fab = document.createElement('div');
        fab.id = 'ai-assistant-fab';
        fab.innerHTML = `
            <button id="ai-fab-btn" class="w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95 border-0 cursor-pointer relative group" style="background: linear-gradient(135deg, #e17055 0%, #C0A062 100%);">
                <i class="fa-solid fa-robot text-white text-xl transition-transform duration-300" id="ai-fab-icon"></i>
                <span class="absolute -top-1 -right-1 w-4 h-4 bg-green-500 border-2 border-white rounded-full animate-pulse"></span>
                <span class="absolute -bottom-8 left-1/2 -translate-x-1/2 text-[10px] font-bold text-slate-500 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">AI Assistant</span>
            </button>
        `;
        fab.className = 'fixed bottom-6 right-6 z-[1000]';
        document.body.appendChild(fab);

        // Chat Panel
        const panel = document.createElement('div');
        panel.id = 'ai-chat-panel';
        panel.className = 'fixed bottom-24 right-6 z-[1000] w-[380px] max-w-[calc(100vw-2rem)] hidden';
        panel.innerHTML = `
            <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden" style="height: 520px; max-height: calc(100dvh - 140px);">
                <!-- Header -->
                <div class="px-5 py-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0" style="background: linear-gradient(135deg, #e17055 0%, #C0A062 100%);">
                    <div class="flex items-center gap-3">
                        <div class="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                            <i class="fa-solid fa-robot text-white text-lg"></i>
                        </div>
                        <div>
                            <h6 class="text-white font-bold text-sm mb-0 leading-tight">Nohope AI Assistant</h6>
                            <span class="text-white/70 text-[10px] font-medium">Powered by Gemini</span>
                        </div>
                    </div>
                    <div class="flex items-center gap-1">
                        <button onclick="window._aiAssistant.clearChat()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer transition-colors flex items-center justify-center" title="Xoá lịch sử">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                        <button onclick="window._aiAssistant.toggle()" class="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white border-0 cursor-pointer transition-colors flex items-center justify-center" title="Đóng">
                            <i class="fa-solid fa-xmark text-sm"></i>
                        </button>
                    </div>
                </div>

                <!-- Messages Area -->
                <div id="ai-chat-messages" class="flex-1 overflow-y-auto p-4 custom-scrollbar" style="scroll-behavior: smooth;">
                    <!-- Welcome message -->
                    <div class="flex gap-2 items-end mb-3">
                        <div class="w-7 h-7 rounded-full bg-gradient-to-br from-[#e17055] to-[#C0A062] flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-robot text-white text-xs"></i>
                        </div>
                        <div class="bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] text-sm leading-relaxed">
                            Xin chào! 👋 Tôi là trợ lý AI của <strong>Nohope Coffee</strong>. Tôi có thể giúp bạn <strong>phân tích doanh thu</strong>, <strong>quản lý thực đơn</strong>, <strong>theo dõi đơn hàng & kho</strong>, và <strong>gợi ý kinh doanh</strong>. Chọn mục bên dưới nhé!
                        </div>
                    </div>

                    <!-- Category tabs -->
                    <div id="ai-quick-prompts" class="mb-3 px-9">
                        <div class="flex gap-1.5 mb-2 overflow-x-scroll pb-1.5" style="-webkit-overflow-scrolling:touch; scrollbar-width:thin; scrollbar-color:#C0A062 transparent;">
                            ${PROMPT_CATEGORIES.map((cat, i) => `<button onclick="window._aiAssistant.switchTab('${cat.id}')" id="ai-tab-${cat.id}" class="text-[10px] px-2.5 py-1 rounded-full whitespace-nowrap border cursor-pointer font-semibold transition-all flex-shrink-0 ${i === 0 ? 'bg-[#e17055] text-white border-[#e17055]' : 'border-slate-200 bg-white text-slate-500 hover:border-[#C0A062]/50'}">${cat.label}</button>`).join('')}
                        </div>
                        ${PROMPT_CATEGORIES.map((cat, i) => `<div id="ai-prompts-${cat.id}" class="flex flex-wrap gap-1.5 ${i === 0 ? '' : 'hidden'}">${cat.prompts.map(p => `<button onclick="window._aiAssistant.send('${p.text}')" class="text-xs px-3 py-1.5 rounded-full border border-[#C0A062]/30 bg-[#C0A062]/5 text-[#b45309] hover:bg-[#C0A062]/15 transition-colors cursor-pointer font-medium">${p.icon} ${p.text}</button>`).join('')}</div>`).join('')}
                    </div>
                </div>

                <!-- Input Area -->
                <div class="border-t border-slate-200 p-3 flex-shrink-0 bg-white">
                    <div class="flex items-center gap-2">
                        <input type="text" id="ai-chat-input" placeholder="Hỏi về doanh thu, tồn kho, gợi ý..." class="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm bg-slate-50 focus:outline-none focus:border-[#C0A062] focus:ring-1 focus:ring-[#C0A062] text-slate-800 placeholder-slate-400" autocomplete="off">
                        <button id="ai-send-btn" onclick="window._aiAssistant.sendFromInput()" class="w-10 h-10 rounded-xl border-0 cursor-pointer flex items-center justify-center transition-all hover:scale-105 active:scale-95 text-white flex-shrink-0" style="background: linear-gradient(135deg, #e17055, #C0A062);">
                            <i class="fa-solid fa-paper-plane text-sm"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // Event listeners
        document.getElementById('ai-fab-btn').addEventListener('click', toggle);
        document.getElementById('ai-chat-input').addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendFromInput();
            }
        });
    }

    function toggle() {
        chatOpen = !chatOpen;
        const panel = document.getElementById('ai-chat-panel');
        const icon = document.getElementById('ai-fab-icon');

        if (chatOpen) {
            panel.classList.remove('hidden');
            panel.style.animation = 'slideUpFadeIn 0.3s ease-out';
            icon.className = 'fa-solid fa-xmark text-white text-xl transition-transform duration-300';
            setTimeout(() => document.getElementById('ai-chat-input')?.focus(), 300);
        } else {
            panel.style.animation = 'slideDownFadeOut 0.2s ease-in';
            setTimeout(() => {
                panel.classList.add('hidden');
                panel.style.animation = '';
            }, 200);
            icon.className = 'fa-solid fa-robot text-white text-xl transition-transform duration-300';
        }
    }

    function sendFromInput() {
        const input = document.getElementById('ai-chat-input');
        if (!input) return;
        const msg = input.value.trim();
        if (!msg) return;
        input.value = '';
        // Hide quick prompts after first message
        const qp = document.getElementById('ai-quick-prompts');
        if (qp) qp.style.display = 'none';
        sendMessage(msg);
    }

    function clearChat() {
        const msgArea = document.getElementById('ai-chat-messages');
        if (!msgArea) return;
        chatHistory = [];
        msgArea.innerHTML = `
            <div class="flex gap-2 items-end mb-3">
                <div class="w-7 h-7 rounded-full bg-gradient-to-br from-[#e17055] to-[#C0A062] flex items-center justify-center flex-shrink-0">
                    <i class="fa-solid fa-robot text-white text-xs"></i>
                </div>
                <div class="bg-slate-100 text-slate-800 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] text-sm leading-relaxed">
                    Đã xoá lịch sử! 🧹 Hãy hỏi tôi bất cứ điều gì nhé.
                </div>
            </div>
        `;
        const qp = document.getElementById('ai-quick-prompts');
        if (qp) qp.style.display = '';
    }

    async function executeAction(actionId, actionJsonStr) {
        try {
            const action = JSON.parse(actionJsonStr);
            const actionEl = document.getElementById(actionId);
            if (actionEl) {
                actionEl.innerHTML = `<div class="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center text-xs text-slate-500 w-full max-w-[85%]"><i class="fa-solid fa-spinner fa-spin mr-1"></i> Đang thực thi...</div>`;
            }

            if (typeof supabase === 'undefined') throw new Error('Mất kết nối Supabase.');
            const tenantId = window.AdminState?.tenantId;
            if (!tenantId) throw new Error('Không xác định được tenant.');

            let successMsg = '';

            switch (action.type) {
                case 'update_product_availability': {
                    const { productName, isAvailable } = action.payload;
                    const product = (typeof products !== 'undefined' ? products : []).find(p => p.name.toLowerCase() === productName.toLowerCase());
                    if (!product) throw new Error(`Không tìm thấy món "${productName}".`);
                    const { error } = await supabase.from('products').update({ is_available: isAvailable }).eq('id', product._id || product.id).eq('tenant_id', tenantId);
                    if (error) throw error;
                    successMsg = `Đã đổi ${productName} → ${isAvailable ? 'Còn hàng' : 'Hết hàng'}`;
                    break;
                }
                case 'add_product': {
                    const p = action.payload;
                    const { error } = await supabase.from('products').insert([{ name: p.name, price: p.price, category: p.category, description: p.description || '', is_available: true, tenant_id: tenantId }]);
                    if (error) throw error;
                    successMsg = `Đã thêm món ${p.name}`;
                    break;
                }
                case 'add_multiple_products': {
                    const rows = (action.payload.products || []).map(p => ({ name: p.name, price: p.price, category: p.category, description: p.description || '', is_available: true, tenant_id: tenantId }));
                    const { error } = await supabase.from('products').insert(rows);
                    if (error) throw error;
                    successMsg = `Đã thêm ${rows.length} món vào menu`;
                    break;
                }
                case 'update_product': {
                    const { productName, updates } = action.payload;
                    const product = (typeof products !== 'undefined' ? products : []).find(p => p.name.toLowerCase() === productName.toLowerCase());
                    if (!product) throw new Error(`Không tìm thấy món "${productName}".`);
                    const updateData = {};
                    if (updates.name) updateData.name = updates.name;
                    if (updates.price) updateData.price = updates.price;
                    if (updates.category) updateData.category = updates.category;
                    if (updates.description !== undefined) updateData.description = updates.description;
                    const { error } = await supabase.from('products').update(updateData).eq('id', product._id || product.id).eq('tenant_id', tenantId);
                    if (error) throw error;
                    successMsg = `Đã cập nhật món ${productName}`;
                    break;
                }
                case 'delete_product': {
                    const { productName } = action.payload;
                    const product = (typeof products !== 'undefined' ? products : []).find(p => p.name.toLowerCase() === productName.toLowerCase());
                    if (!product) throw new Error(`Không tìm thấy món "${productName}".`);
                    const { error } = await supabase.from('products').update({ is_available: false }).eq('id', product._id || product.id).eq('tenant_id', tenantId);
                    if (error) throw error;
                    successMsg = `Đã ẩn món ${productName}`;
                    break;
                }
                default: throw new Error('Thao tác không được hỗ trợ.');
            }

            if (typeof showAdminToast === 'function') showAdminToast(successMsg, 'success');
            if (typeof fetchProducts === 'function') fetchProducts();
            if (actionEl) {
                actionEl.innerHTML = `<div class="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-xs text-green-600 font-medium w-full max-w-[85%]"><i class="fa-solid fa-check-circle mr-1"></i> ${successMsg}</div>`;
            }
        } catch (err) {
            console.error('Execute action error:', err);
            const msgArea = document.getElementById('ai-chat-messages');
            appendBubble(msgArea, `❌ Lỗi thực thi: ${err.message}`, 'ai');
            const actionEl = document.getElementById(actionId);
            if (actionEl) actionEl.remove();
        }
    }

    // --- CSS Animations ---
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideUpFadeIn {
            from { opacity: 0; transform: translateY(20px) scale(0.95); }
            to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes slideDownFadeOut {
            from { opacity: 1; transform: translateY(0) scale(1); }
            to { opacity: 0; transform: translateY(20px) scale(0.95); }
        }
        .ai-response-text code { font-size: 11px; }
        .ai-response-text strong { color: #b45309; }
        #ai-chat-messages::-webkit-scrollbar { width: 4px; }
        #ai-chat-messages::-webkit-scrollbar-thumb { background: #C0A062; border-radius: 4px; }
    `;
    document.head.appendChild(style);

    // --- Tab switching for prompt categories ---
    function switchTab(tabId) {
        PROMPT_CATEGORIES.forEach(cat => {
            const tabBtn = document.getElementById(`ai-tab-${cat.id}`);
            const panel = document.getElementById(`ai-prompts-${cat.id}`);
            if (cat.id === tabId) {
                tabBtn?.classList.remove('border-slate-200', 'bg-white', 'text-slate-500');
                tabBtn?.classList.add('bg-[#e17055]', 'text-white', 'border-[#e17055]');
                panel?.classList.remove('hidden');
            } else {
                tabBtn?.classList.add('border-slate-200', 'bg-white', 'text-slate-500');
                tabBtn?.classList.remove('bg-[#e17055]', 'text-white', 'border-[#e17055]');
                panel?.classList.add('hidden');
            }
        });
    }

    // Public API
    window._aiAssistant = {
        toggle,
        send: (msg) => {
            const qp = document.getElementById('ai-quick-prompts');
            if (qp) qp.style.display = 'none';
            if (!chatOpen) toggle();
            sendMessage(msg);
        },
        sendFromInput,
        clearChat,
        executeAction,
        switchTab
    };

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAIAssistant);
    } else {
        initAIAssistant();
    }
})();
