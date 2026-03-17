// Remove socket.io: const socket = io();
let orders = [];
let audioEnabled = true;
let isGroupedView = false;

// DOM Elements
const ordersContainer = document.getElementById('orders-container');
const loader = document.getElementById('loader');
let connStatus; // Global for realtime status updates

// Initialize
function init() {
    connStatus = document.getElementById('connection-status');

    // Check if we are on the history page or if elements exist
    const historyDateEl = document.getElementById('historyDate');
    if (historyDateEl) {
        const today = new Date().toISOString().split('T')[0];
        historyDateEl.value = today;
    }

    if (connStatus) {
        connStatus.innerHTML = '<i class="fa-solid fa-wifi"></i> Trực tuyến (Supabase)';
        connStatus.className = 'text-success';
    }

    fetchActiveOrders();
    fetchActiveStaffRequests();
    setupRealtimeSubscription();

    setInterval(renderOrders, 60000); // 1 minute fresh
}

// Fetch Initial Orders from Server
async function fetchActiveOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .in('status', ['Pending', 'Preparing', 'Ready'])
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Map ids for compatibility
        orders = data.map(o => ({ ...o, _id: o.id, createdAt: o.created_at, tableNumber: o.table_number, orderNote: o.order_note }));
        loader.style.display = 'none';
        renderOrders();
    } catch (error) {
        console.error("Lỗi tải đơn hàng:", error);
        loader.textContent = "Không tải được đơn hàng. Vui lòng tải lại trang.";
    }
}

// Render Orders Grid
function renderOrders() {
    try {
        if (!ordersContainer) return;
        ordersContainer.innerHTML = '';

        if (!Array.isArray(orders) || orders.length === 0) {
            ordersContainer.innerHTML = '<div class="text-muted" style="grid-column: 1 / -1;">Không có đơn hàng nào chờ xử lý.</div>';
            return;
        }

        if (isGroupedView) {
            renderGroupedOrders();
            return;
        }

        orders.forEach((order, index) => {
            // Defensive checks
            let timeStr = "Vừa xong";
            if (order.createdAt) {
                try {
                    timeStr = new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                } catch (e) { }
            }

            // Build items list
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsHtml = items.map(item => `
                <li>
                    <span>${item.quantity || 1}x ${item.name || 'Unknown Item'}</span>
                </li>
            `).join('');

            const card = document.createElement('div');
            card.className = `order-card status-${order.status || 'Pending'}`;
            card.style.setProperty('--item-idx', index);
            card.id = `order-${order._id}`;

            card.innerHTML = `
                <div class="order-header">
                    <div class="order-table">Bàn ${order.tableNumber || '?'}</div>
                    <div class="order-time">${timeStr}</div>
                </div>
                <ul class="order-list">
                    ${itemsHtml}
                </ul>
                ${order.orderNote ? `<div style="padding: 10px; background: #fff3cd; color: #856404; font-size: 0.9em; border-radius: 4px; margin-top: 10px; font-weight: bold;"><i class="fa-solid fa-note-sticky"></i> Ghi chú: ${order.orderNote}</div>` : ''}
                <div class="mt-3">
                    <select class="status-select" onchange="updateOrderStatus('${order._id}', this.value)" style="margin-bottom: 8px;">
                        <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>⏳ Chờ xác nhận</option>
                        <option value="Preparing" ${order.status === 'Preparing' ? 'selected' : ''}>🍳 Đang chế biến</option>
                        <option value="Ready" ${order.status === 'Ready' ? 'selected' : ''}>✅ Đã xong</option>
                        <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>🎉 Hoàn thành</option>
                        <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>❌ Hủy đơn (Hết món)</option>
                    </select>
                    <button class="btn btn-sm btn-outline-secondary w-100 mt-1" onclick="printReceipt('${order._id}')">
                        <i class="fa-solid fa-print"></i> In Hóa Đơn
                    </button>
                </div>
            `;

            ordersContainer.appendChild(card);
        });
    } catch (e) {
        console.error("Lỗi hiển thị đơn hàng:", e);
        ordersContainer.innerHTML = '<div class="text-danger">Không tải được giao diện đơn hàng. Xem console để biết thêm chi tiết.</div>';
    }
}

// Render Orders Grouped By Item
function renderGroupedOrders() {
    // Only group Pending and Preparing orders
    const activeOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing');

    if (activeOrders.length === 0) {
        ordersContainer.innerHTML = '<div class="text-muted" style="grid-column: 1 / -1;">Không có món nào đang chờ chế biến.</div>';
        return;
    }

    const groupMap = {};
    activeOrders.forEach(order => {
        order.items.forEach(item => {
            // Include options in the grouping key to separate differently customized items
            let optKey = '';
            if (item.selectedOptions && item.selectedOptions.length > 0) {
                optKey = item.selectedOptions.map(o => o.choiceName).sort().join(' | ');
            }

            const groupKey = optKey ? `${item.name} (+ ${optKey})` : item.name;

            if (!groupMap[groupKey]) {
                groupMap[groupKey] = { quantity: 0, tables: [] };
            }
            groupMap[groupKey].quantity += item.quantity;
            for (let i = 0; i < item.quantity; i++) {
                groupMap[groupKey].tables.push(order.tableNumber);
            }
        });
    });

    const groupedItems = Object.keys(groupMap).map(key => ({
        name: key,
        quantity: groupMap[key].quantity,
        tables: groupMap[key].tables
    })).sort((a, b) => b.quantity - a.quantity);

    let html = '';
    groupedItems.forEach((group, index) => {
        // Group tables to show smartly e.g. "Bàn 1 (x2), Bàn 5 (x3)"
        const tableCounts = {};
        group.tables.forEach(t => { tableCounts[t] = (tableCounts[t] || 0) + 1; });
        const tableStr = Object.keys(tableCounts).map(t => `<span class="badge bg-secondary me-1">Bàn ${t}${tableCounts[t] > 1 ? ` (x${tableCounts[t]})` : ''}</span>`).join('');

        html += `
            <div class="order-card status-Pending" style="--item-idx: ${index}">
                <div class="order-header" style="background-color: var(--primary);">
                    <div class="font-bold text-white fs-5 lh-sm">${group.quantity}x ${group.name}</div>
                </div>
                <div class="p-3">
                    <p class="mb-2 text-muted small">Cần giao cho các bàn:</p>
                    <div class="d-flex flex-wrap gap-1">${tableStr}</div>
                </div>
            </div>
        `;
    });

    ordersContainer.innerHTML = html;
}

// Update Order Status via Supabase
window.updateOrderStatus = async (orderId, newStatus) => {
    try {
        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) throw error;
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái:", error);
        alert("Lỗi khi cập nhật trạng thái đơn hàng");
    }

    // Optimistic update locally
    const orderIndex = orders.findIndex(o => o._id === orderId);
    if (orderIndex > -1) {
        // If completed or cancelled, we remove it from the active dashboard view immediately
        if (newStatus === 'Completed' || newStatus === 'Cancelled') {
            orders.splice(orderIndex, 1);
        } else {
            orders[orderIndex].status = newStatus;
        }
        renderOrders();
    }
};

// --- UI Toggles ---
window.toggleAudio = () => {
    audioEnabled = !audioEnabled;
    const btn = document.getElementById('btn-toggle-audio');
    if (audioEnabled) {
        btn.innerHTML = '<i class="fa-solid fa-volume-high"></i> Âm báo: Bật';
        btn.classList.replace('btn-outline-secondary', 'btn-outline-warning');
        playDing(); // Test sound
    } else {
        btn.innerHTML = '<i class="fa-solid fa-volume-xmark"></i> Âm báo: Tắt';
        btn.classList.replace('btn-outline-warning', 'btn-outline-secondary');
    }
};

window.toggleOrderGrouping = () => {
    isGroupedView = document.getElementById('groupOrdersToggle').checked;
    renderOrders();
};

// --- Socket Listeners ---

function playDing() {
    if (!audioEnabled) return;
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
        oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5); // Drop to A4
        gainNode.gain.setValueAtTime(1, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) { console.error("Audio API not supported or blocked", e); }
}

// --- Supabase Realtime Listeners ---
function setupRealtimeSubscription() {
    supabase
        .channel('kitchen-orders')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, payload => {
            console.log('NEW ORDER RECEIVED via REALTIME:', payload.new);
            const newOrder = {
                ...payload.new,
                _id: payload.new.id,
                createdAt: payload.new.created_at,
                tableNumber: payload.new.table_number,
                orderNote: payload.new.order_note,
                totalPrice: payload.new.total_price
            };

            // Avoid duplicates
            if (!orders.some(o => o._id === newOrder._id)) {
                playDing();
                orders.push(newOrder);
                orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                renderOrders();
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, payload => {
            const updatedOrder = { ...payload.new, _id: payload.new.id, createdAt: payload.new.created_at, tableNumber: payload.new.table_number, orderNote: payload.new.order_note };
            const orderIndex = orders.findIndex(o => o._id === updatedOrder._id);

            if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
                if (orderIndex > -1) {
                    orders.splice(orderIndex, 1);
                    renderOrders();
                }
            } else {
                if (orderIndex > -1) {
                    orders[orderIndex].status = updatedOrder.status;
                    renderOrders();
                } else {
                    // Only add if it's one of the statuses we care about
                    if (['Pending', 'Preparing', 'Ready'].includes(updatedOrder.status)) {
                        orders.push(updatedOrder);
                        orders.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                        renderOrders();
                    }
                }
            }
        })
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_requests' }, payload => {
            if (payload.new.status === 'pending') {
                renderStaffRequest(payload.new);
            }
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'staff_requests' }, payload => {
            if (payload.new.status === 'completed') {
                removeStaffRequestUI(payload.new.id);
            }
        })
        .subscribe((status, err) => {
            console.log('SUPABASE REALTIME STATUS:', status);
            if (err) console.error('SUPABASE REALTIME ERROR:', err);

            if (status === 'SUBSCRIBED') {
                console.log('Successfully subscribed to kitchen-orders channel');
                if (connStatus) {
                    connStatus.innerHTML = '<i class="fa-solid fa-wifi"></i> Trực tuyến (Real-time)';
                    connStatus.className = 'text-success';
                }
            } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
                console.warn('Realtime connection lost or error:', status);
                if (connStatus) {
                    connStatus.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Mất kết nối';
                    connStatus.className = 'text-danger';
                }
            }
        });
}

// --- Staff Requests ---
async function fetchActiveStaffRequests() {
    try {
        const { data, error } = await supabase
            .from('staff_requests')
            .select('*')
            .eq('status', 'pending');
        if (error) throw error;
        data.forEach(req => renderStaffRequest(req));
    } catch (e) { console.error("Error fetching staff requests:", e); }
}

function renderStaffRequest(data) {
    const { id, table_number, type, created_at } = data;
    const msg = type === 'bill' ? `Bàn ${table_number} yêu cầu thanh toán!` : `Bàn ${table_number} gọi phục vụ!`;
    const alertClass = type === 'bill' ? 'bill-alert' : 'help-alert';
    const iconClass = type === 'bill' ? 'fa-file-invoice-dollar' : 'fa-hand-paper';

    // Check if already exists
    if (document.querySelector(`.custom-alert[data-request-id="${id}"]`)) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `custom-alert ${alertClass}`;
    alertDiv.setAttribute('data-request-id', id);
    alertDiv.setAttribute('data-table', table_number);
    alertDiv.innerHTML = `
        <i class="fa-solid ${iconClass} fs-3 me-3"></i>
        <div class="flex-grow-1">
            <h5 class="mb-1">${msg}</h5>
            <small style="opacity: 0.8;"><i class="fa-regular fa-clock"></i> ${new Date(created_at).toLocaleTimeString()}</small>
        </div>
        <button class="btn btn-light btn-sm font-bold ms-3" onclick="clearRequest('${id}', this)">Xong rồi</button>
    `;
    document.getElementById('alerts-container').prepend(alertDiv);
    playDing();
}

function removeStaffRequestUI(id) {
    const el = document.querySelector(`.custom-alert[data-request-id="${id}"]`);
    if (el) el.remove();
}

window.clearRequest = async (id, btn) => {
    btn.disabled = true;
    try {
        const { error } = await supabase.from('staff_requests').update({ status: 'completed' }).eq('id', id);
        if (error) throw error;
        removeStaffRequestUI(id);
    } catch (e) {
        console.error(e);
        btn.disabled = false;
        alert("Lỗi khi đánh dấu hoàn thành!");
    }
};

// Add styles for alerts
const requestStyles = document.createElement('style');
requestStyles.innerHTML = `
    #alerts-container { position: sticky; top: 0; z-index: 1001; margin-bottom: 20px; display: flex; flex-direction: column; gap: 10px; }
    .custom-alert { padding: 15px 20px; border-radius: 12px; color: white; display: flex; align-items: center; animation: slideIn 0.3s ease; box-shadow: 0 4px 15px rgba(0,0,0,0.3); }
    .bill-alert { background: linear-gradient(135deg, #2ecc71, #27ae60); border-left: 5px solid #1e8449; }
    .help-alert { background: linear-gradient(135deg, #3498db, #2980b9); border-left: 5px solid #1c598a; }
    @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
`;
document.head.appendChild(requestStyles);

// Print Receipt
window.printReceipt = (orderId) => {
    const order = orders.find(o => o._id === orderId);
    if (!order) return;

    const itemsHtml = order.items.map(i => `<div>${i.quantity}x ${i.name} - ${(i.price * i.quantity).toLocaleString('vi-VN')}đ</div>`).join('');
    const total = order.totalPrice ? order.totalPrice.toLocaleString('vi-VN') : '0';
    const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
    const noteHtml = order.orderNote ? `<div style="margin-top: 10px; font-style: italic;">Ghi chú: ${order.orderNote}</div>` : '';

    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Hóa Đơn - Bàn ${order.tableNumber}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 14px; color: #000; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .items { margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .total { text-align: right; font-weight: bold; font-size: 16px; margin-bottom: 20px; }
                    .footer { text-align: center; font-size: 12px; }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2>Serenity Cafe</h2>
                    <div>Hóa đơn thanh toán</div>
                    <div>Bàn số: <strong>${order.tableNumber}</strong></div>
                    <div>Thời gian: ${timeStr}</div>
                    <div>Mã đơn: ${(order._id || '').substring(0, 8)}</div>
                </div>
                <div class="items">
                    ${itemsHtml}
                    ${noteHtml}
                </div>
                <div class="total">Tổng cộng: ${total} đ</div>
                <div class="footer">Cảm ơn quý khách! Hẹn gặp lại.</div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
};

// --- Kitchen History ---
let kitchenHistoryModalInstance;

window.openKitchenHistory = () => {
    if (!kitchenHistoryModalInstance) {
        kitchenHistoryModalInstance = new bootstrap.Modal(document.getElementById('kitchenHistoryModal'));
    }
    kitchenHistoryModalInstance.show();
    fetchKitchenHistory();
};

async function fetchKitchenHistory() {
    const loader = document.getElementById('kitchen-history-loader');
    const errorMsg = document.getElementById('kitchen-history-error');
    const listContainer = document.getElementById('kitchen-history-list');

    loader.style.display = 'block';
    errorMsg.style.display = 'none';
    listContainer.innerHTML = '';

    try {
        const { data: allHistory, error } = await supabase
            .from('orders')
            .select('*')
            .in('status', ['Ready', 'Completed', 'Cancelled'])
            .order('created_at', { ascending: false })
            .limit(50);

        if (error) throw error;

        // Map data for compatibility
        const pastOrders = allHistory.map(o => ({
            ...o,
            _id: o.id,
            createdAt: o.created_at,
            tableNumber: o.table_number,
            orderNote: o.order_note,
            totalPrice: o.total_price
        }));

        if (pastOrders.length === 0) {
            listContainer.innerHTML = '<div class="p-4 text-center text-muted col-12">Chưa có đơn hàng nào trong lịch sử.</div>';
            loader.style.display = 'none';
            return;
        }

        // Use dashboard grid class for consistency
        listContainer.className = 'dashboard-grid p-3';

        const html = pastOrders.map(order => {
            const timeStr = new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN');

            let itemsHtml = order.items.map(i => {
                const optionsHtml = i.selectedOptions && i.selectedOptions.length > 0
                    ? `<div class="ms-3 text-muted" style="font-size: 0.85rem;">+ ${i.selectedOptions.map(o => o.choiceName).join(', ')}</div>`
                    : '';
                return `<li><span class="fw-bold">${i.quantity}x</span> ${i.name} ${optionsHtml}</li>`;
            }).join('');

            let statusBadge = '';
            if (order.status === 'Ready') {
                statusBadge = '<span class="badge bg-info text-dark">Sẵn sàng</span>';
            } else if (order.status === 'Completed') {
                statusBadge = '<span class="badge bg-success">Hoàn thành</span>';
            } else if (order.status === 'Cancelled') {
                statusBadge = '<span class="badge bg-danger">Đã Hủy</span>';
            } else {
                statusBadge = `<span class="badge bg-secondary">${order.status}</span>`;
            }

            return `
                <div class="order-card status-${order.status}">
                    <div class="order-header">
                        <div class="order-table">Bàn ${order.tableNumber || '?'}</div>
                        <div class="order-time"><i class="fa-regular fa-clock"></i> ${timeStr} <br><small class="text-muted" style="font-size: 0.75rem;">${dateStr}</small></div>
                    </div>
                    <ul class="order-list">
                        ${itemsHtml}
                    </ul>
                    ${order.orderNote ? `<div class="mt-2 text-warning" style="font-size: 0.9rem; padding: 8px; background: rgba(255,193,7,0.1); border-radius: 8px;"><i class="fa-solid fa-note-sticky"></i> ${order.orderNote}</div>` : ''}
                    
                    <div class="d-flex justify-content-between align-items-center mt-3 pt-3" style="border-top: 1px solid var(--border);">
                        <div>${statusBadge}</div>
                        <span class="text-success font-bold">${(order.totalPrice || 0).toLocaleString('vi-VN')} đ</span>
                    </div>
                    <div class="mt-3">
                         <button class="btn btn-outline-light btn-sm w-100" onclick="printReceipt('${order._id}')"><i class="fa-solid fa-print"></i> In Hóa Đơn</button>
                    </div>
                </div>
            `;
        }).join('');

        listContainer.innerHTML = html;
        loader.style.display = 'none';

    } catch (error) {
        console.error("Lỗi tải lịch sử bếp:", error);
        loader.style.display = 'none';
        errorMsg.style.display = 'block';
    }
}

// Boot
init();
