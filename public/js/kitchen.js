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
            ordersContainer.innerHTML = `
                <div class="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#2A2B2B] rounded-[1.5rem] border border-gray-200 dark:border-gray-800 shadow-sm min-h-[400px]">
                    <div class="w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-[#994700] text-4xl mb-4">
                        <i class="fa-solid fa-mug-hot"></i>
                    </div>
                    <h3 class="text-xl font-bold font-headline text-[#1B1C1C] dark:text-[#F6F3F2] mb-2">Bếp rảnh rỗi</h3>
                    <p class="text-gray-500 dark:text-gray-400">Hiện tại không có đơn hàng nào chờ xử lý.</p>
                </div>
            `;
            return;
        }

        if (isGroupedView) {
            renderGroupedOrders();
            return;
        }

        orders.forEach((order, index) => {
            // Defensive checks
            let timeStr = "Vừa xong";
            let diffInMinutes = 0;
            if (order.createdAt) {
                try {
                    const orderTime = new Date(order.createdAt);
                    timeStr = orderTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                    diffInMinutes = Math.floor((new Date() - orderTime) / 60000);
                } catch (e) { }
            }

            // Build items list
            const items = Array.isArray(order.items) ? order.items : [];
            const itemsHtml = items.map(item => {
                const optionsHtml = item.selectedOptions && item.selectedOptions.length > 0
                    ? `<div class="ml-4 text-gray-500 dark:text-gray-400 text-sm mt-1 border-l-2 border-[#D97531] pl-2">+ ${item.selectedOptions.map(o => window.escapeHTML(o.choiceName)).join(', ')}</div>`
                    : '';
                return `
                <li class="py-2 border-b border-gray-100 dark:border-gray-800 last:border-0">
                    <div class="flex items-start justify-between">
                        <span class="font-medium text-[#1B1C1C] dark:text-[#F6F3F2]"><span class="font-bold text-[#D97531] mr-1">${item.quantity || 1}x</span> ${window.escapeHTML(item.name || 'Unknown Item')}</span>
                    </div>
                    ${optionsHtml}
                </li>`;
            }).join('');

            // Determine Background and Border based on wait time
            let bgClass = 'bg-white dark:bg-[#2A2B2B]';
            let borderClass = 'border-gray-200 dark:border-gray-800';
            let pulseClass = '';

            if (order.status === 'Pending' || order.status === 'Preparing') {
                if (diffInMinutes >= 10) {
                    bgClass = 'bg-red-50 dark:bg-red-900/20';
                    borderClass = 'border-red-500 dark:border-red-700';
                    pulseClass = 'animate-pulse';
                } else if (diffInMinutes >= 5) {
                    bgClass = 'bg-yellow-50 dark:bg-yellow-900/20';
                    borderClass = 'border-yellow-500 dark:border-yellow-700';
                }
            }

            const card = document.createElement('div');
            card.className = `${bgClass} rounded-[1.25rem] p-5 shadow-sm border ${borderClass} flex flex-col justify-between transition-all hover:shadow-md order-card-${order.status || 'Pending'} relative overflow-hidden ${pulseClass}`;
            
            if (order.status === 'Pending') card.classList.add('border-l-4', 'border-l-[#D97531]');
            if (order.status === 'Preparing') card.classList.add('border-l-4', 'border-l-[#994700]');
            if (order.status === 'Ready') card.classList.add('border-l-4', 'border-l-green-500');
            card.id = `order-${order._id}`;

            card.innerHTML = `
                <div>
                    <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-100 dark:border-gray-800">
                        <div class="font-headline font-bold text-lg text-[#1B1C1C] dark:text-white flex items-center gap-2">
                            <div class="w-8 h-8 rounded-full bg-[#F6F3F2] dark:bg-[#1B1C1C] text-[#994700] flex items-center justify-center text-sm shadow-inner">
                                ${window.escapeHTML(order.tableNumber || '?')}
                            </div>
                            <span>Bàn ${window.escapeHTML(order.tableNumber || '?')}</span>
                        </div>
                        <div class="flex flex-col items-end">
                            <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 font-medium bg-gray-50 dark:bg-gray-800/50 px-3 py-1.5 rounded-lg">
                                <i class="fa-regular fa-clock"></i> ${timeStr}
                            </div>
                            ${diffInMinutes > 0 ? `<div class="text-xs font-bold mt-1 ${diffInMinutes >= 10 ? 'text-red-500' : diffInMinutes >= 5 ? 'text-yellow-600' : 'text-green-500'}">${diffInMinutes} phút trước</div>` : ''}
                        </div>
                    </div>
                    <ul class="mb-4 list-none pl-0">
                        ${itemsHtml}
                    </ul>
                    ${order.orderNote ? `<div class="p-3 bg-orange-50 dark:bg-orange-900/20 text-[#994700] dark:text-orange-300 text-sm rounded-xl mb-4 font-medium flex gap-2 items-start border border-orange-100 dark:border-orange-800/50"><i class="fa-solid fa-note-sticky mt-0.5"></i> <span>Ghi chú: ${window.escapeHTML(order.orderNote)}</span></div>` : ''}
                    
                    <!-- Status / Payment tags -->
                    <div class="flex flex-wrap gap-2 mb-4">
                        ${order.payment_method === 'transfer' ? '<span class="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg border border-blue-100 dark:border-blue-800"><i class="fa-solid fa-qrcode mr-1"></i> Chuyển khoản</span>' : '<span class="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700"><i class="fa-solid fa-money-bill-wave mr-1"></i> Tại quầy</span>'}
                        ${order.payment_status === 'paid' ? '<span class="px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-semibold rounded-lg border border-green-100 dark:border-green-800"><i class="fa-solid fa-check mr-1"></i> Đã thanh toán</span>' : '<span class="px-2.5 py-1 bg-orange-50 dark:bg-orange-900/20 text-[#D97531] dark:text-orange-400 text-xs font-semibold rounded-lg border border-orange-100 dark:border-orange-800"><i class="fa-solid fa-clock mr-1"></i> Chưa thanh toán</span>'}
                    </div>
                </div>

                <div class="mt-auto pt-4 border-t border-gray-100 dark:border-gray-800">
                    ${order.status === 'Pending' ? `<button class="w-full py-3 mb-3 bg-[#D97531] hover:bg-[#b05f28] text-white rounded-xl font-bold transition-all shadow-sm hover:shadow active:scale-95 flex justify-center items-center gap-2" onclick="updateOrderStatus('${order._id}', 'Preparing', this)"><i class="fa-solid fa-fire"></i> Nhận đơn & Chế biến</button>` : ''}
                    ${order.status === 'Preparing' ? `<button class="w-full py-3 mb-3 bg-[#994700] hover:bg-[#7a3900] text-white rounded-xl font-bold transition-all shadow-sm hover:shadow active:scale-95 flex justify-center items-center gap-2" onclick="updateOrderStatus('${order._id}', 'Ready', this)"><i class="fa-solid fa-bell-concierge"></i> Đã làm xong (Báo TV)</button>` : ''}
                    ${order.status === 'Ready' ? `<button class="w-full py-3 mb-3 bg-gray-800 hover:bg-black dark:bg-gray-100 dark:hover:bg-white dark:text-[#1B1C1C] text-white rounded-xl font-bold transition-all shadow-sm hover:shadow active:scale-95 flex justify-center items-center gap-2" onclick="updateOrderStatus('${order._id}', 'Completed', this)"><i class="fa-solid fa-check-circle"></i> Đã Giao Khách (Xóa màn TV)</button>` : ''}
                    <div class="flex gap-3">
                        <button class="flex-1 py-2.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl font-semibold transition-colors flex justify-center items-center gap-2 text-sm" onclick="printReceipt('${order._id}')">
                            <i class="fa-solid fa-print"></i> In Bill
                        </button>
                        ${order.status === 'Pending' ? `<button class="px-4 py-2.5 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl font-semibold transition-colors flex justify-center items-center text-sm" onclick="updateOrderStatus('${order._id}', 'Cancelled', this)" aria-label="Cancel Order"><i class="fa-solid fa-times"></i></button>` : ''}
                    </div>
                </div>
            `;

            ordersContainer.appendChild(card);
        });
    } catch (e) {
        console.error("Lỗi hiển thị đơn hàng:", e);
        ordersContainer.innerHTML = '<div class="text-danger">Không tải được giao diện đơn hàng. Xem console để biết thêm chi tiết.</div>';
    }
    
    // Always render sidebar
    if (typeof renderBatchSidebar === 'function') renderBatchSidebar();
}

// Render Orders Grouped By Item
function renderGroupedOrders() {
    // Only group Pending and Preparing orders
    const activeOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing');

    if (activeOrders.length === 0) {
            ordersContainer.innerHTML = `
                <div class="col-span-1 md:col-span-2 lg:col-span-3 flex flex-col items-center justify-center py-16 text-center bg-white dark:bg-[#2A2B2B] rounded-[1.5rem] border border-gray-200 dark:border-gray-800 shadow-sm min-h-[400px]">
                    <div class="w-24 h-24 bg-orange-50 dark:bg-orange-900/20 rounded-full flex items-center justify-center text-[#994700] text-4xl mb-4">
                        <i class="fa-solid fa-check-double"></i>
                    </div>
                    <h3 class="text-xl font-bold font-headline text-[#1B1C1C] dark:text-[#F6F3F2] mb-2">Tất cả đã hoàn thành</h3>
                    <p class="text-gray-500 dark:text-gray-400">Không có món nào đang chờ chế biến.</p>
                </div>
            `;
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
        const tableStr = Object.keys(tableCounts).map(t => `<span class="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700">Bàn ${t}${tableCounts[t] > 1 ? ` (x${tableCounts[t]})` : ''}</span>`).join('');

        html += `
            <div class="bg-white dark:bg-[#2A2B2B] rounded-[1.25rem] shadow-sm border border-[#D97531] overflow-hidden relative">
                <div class="p-4 bg-orange-50 dark:bg-orange-900/20 border-b border-[#D97531]/20">
                    <div class="font-headline font-bold text-[#1B1C1C] dark:text-[#F6F3F2] text-lg flex items-center gap-2">
                        <span class="text-[#D97531] text-xl">${group.quantity}x</span> ${window.escapeHTML(group.name)}
                    </div>
                </div>
                <div class="p-4">
                    <p class="mb-3 text-gray-500 dark:text-gray-400 text-sm font-medium">Cần giao cho các bàn:</p>
                    <div class="flex flex-wrap gap-2">${tableStr}</div>
                </div>
            </div>
        `;
    });

    ordersContainer.innerHTML = html;
}

function renderBatchSidebar() {
    const listContainer = document.getElementById('batch-list');
    if (!listContainer) return;
    
    const activeOrders = orders.filter(o => o.status === 'Pending' || o.status === 'Preparing');
    
    if (activeOrders.length === 0) {
        listContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center py-8 text-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <i class="fa-solid fa-check text-2xl text-green-500 mb-2"></i>
                <p class="text-gray-500 dark:text-gray-400 text-sm font-medium">Bếp đang rảnh rỗi</p>
            </div>
        `;
        return;
    }

    const groupMap = {};
    activeOrders.forEach(order => {
        if (!order.items) return;
        order.items.forEach(item => {
            let optKey = '';
            if (item.selectedOptions && item.selectedOptions.length > 0) {
                optKey = item.selectedOptions.map(o => o.choiceName).sort().join(' + ');
            }
            const groupKey = optKey ? `${item.name} (${optKey})` : item.name;
            if (!groupMap[groupKey]) groupMap[groupKey] = 0;
            groupMap[groupKey] += item.quantity;
        });
    });

    const sortedItems = Object.keys(groupMap).map(k => ({ name: k, qty: groupMap[k] })).sort((a,b) => b.qty - a.qty);
    
    let html = '';
    sortedItems.forEach(item => {
        html += `
            <div class="flex justify-between items-center py-2.5 border-b border-gray-100 dark:border-gray-800 cursor-default hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-lg px-2 transition-colors -mx-2">
                <span class="text-sm font-medium text-[#1B1C1C] dark:text-gray-300 whitespace-nowrap overflow-hidden text-ellipsis mr-2">${window.escapeHTML(item.name)}</span>
                <span class="px-2.5 py-1 bg-orange-100 dark:bg-orange-900/30 text-[#994700] dark:text-orange-400 text-xs font-bold rounded-full min-w-[28px] text-center border border-orange-200 dark:border-orange-800 flex-shrink-0">${item.qty}</span>
            </div>
        `;
    });
    listContainer.innerHTML = html;
}

window.toggleOrderGrouping = function() {
    isGroupedView = document.getElementById('groupOrdersToggle')?.checked || false;
    renderOrders();
};

// Update Order Status via Supabase
window.updateOrderStatus = async (orderId, newStatus, btn) => {
    let originalHtml = '';
    if (btn) {
        originalHtml = btn.innerHTML;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Xử lý...';
        btn.disabled = true;
    }
    try {
        if (newStatus === 'Completed') {
            const order = orders.find(o => o._id === orderId);
            // NOTE: Trừ kho đã được xử lý bởi RPC place_order_and_deduct_inventory
            // khi khách đặt đơn. KHÔNG trừ kho lại ở đây để tránh double deduction.

            // Earn Loyalty Points
            if (order && order.customer_phone) {
                const { data: custData } = await supabase.from('customers').select('id, current_points, total_spent').eq('phone', order.customer_phone).maybeSingle();
                const earnedPts = order.earned_points || 0;
                const paidAmt = order.total_price || order.totalPrice || 0;
                
                if (custData) {
                    const newPts = (custData.current_points || 0) + earnedPts;
                    const newSpent = (custData.total_spent || 0) + paidAmt;
                    let newTier = 'Bronze';
                    if (newSpent >= 5000000) newTier = 'Diamond';
                    else if (newSpent >= 2000000) newTier = 'Gold';
                    else if (newSpent >= 500000) newTier = 'Silver';

                    await supabase.from('customers').update({ current_points: newPts, total_spent: newSpent, tier: newTier }).eq('id', custData.id);
                    if (earnedPts > 0) {
                        await supabase.from('point_logs').insert([{ customer_id: custData.id, amount: earnedPts, reason: 'Tích điểm đơn hàng ' + orderId.substring(0,8) }]);
                    }
                } else {
                    let newTier = 'Bronze';
                    if (paidAmt >= 5000000) newTier = 'Diamond';
                    else if (paidAmt >= 2000000) newTier = 'Gold';
                    else if (paidAmt >= 500000) newTier = 'Silver';

                    const { data: newCust } = await supabase.from('customers').insert([{
                        phone: order.customer_phone, name: 'Khách hàng', current_points: earnedPts, total_spent: paidAmt, tier: newTier
                    }]).select().single();
                    
                    if (newCust && earnedPts > 0) {
                        await supabase.from('point_logs').insert([{ customer_id: newCust.id, amount: earnedPts, reason: 'Tích điẻm đơn hàng ' + orderId.substring(0,8) }]);
                    }
                }
            }
        }

        const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
        if (error) throw error;
    } catch (error) {
        console.error("Lỗi cập nhật trạng thái:", error);
        alert("Lỗi khi cập nhật trạng thái đơn hàng");
        if(btn) {
            btn.innerHTML = originalHtml;
            btn.disabled = false;
        }
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
        
        // Helper to play a single beep
        const playBeep = (freq, startTime, duration) => {
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(freq, startTime);
            gainNode.gain.setValueAtTime(1, startTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };

        const now = audioCtx.currentTime;
        // Double Beep for higher attention
        playBeep(880, now, 0.2); // First beep
        playBeep(1046.50, now + 0.3, 0.3); // Second higher beep (C6)
        
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
                
                if (window.autoPrintKitchen) {
                    window.printKitchenTicket(newOrder);
                }
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
            <h5 class="mb-1">${window.escapeHTML(msg)}</h5>
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

    const itemsHtml = order.items.map(i => {
        const optionNames = i.selectedOptions && i.selectedOptions.length > 0 ? ` (+ ${i.selectedOptions.map(o => o.choiceName).join(', ')})` : '';
        return `<div>${i.quantity}x ${i.name}${optionNames} - ${(i.price * i.quantity).toLocaleString('vi-VN')}đ</div>`;
    }).join('');
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
                    <h2>Nohope Coffee</h2>
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
            listContainer.innerHTML = '<div class="p-8 text-center text-gray-500 dark:text-gray-400 col-span-full">Chưa có đơn hàng nào trong lịch sử.</div>';
            loader.style.display = 'none';
            return;
        }

        // Use grid for history items
        listContainer.className = 'grid grid-cols-1 md:grid-cols-2 gap-4 p-4';

        const html = pastOrders.map(order => {
            const timeStr = new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
            const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN');

            let itemsHtml = order.items.map(i => {
                const optionsHtml = i.selectedOptions && i.selectedOptions.length > 0
                    ? `<div class="ml-4 text-gray-500 dark:text-gray-400 text-sm mt-1 border-l-2 border-[#D97531] pl-2">+ ${i.selectedOptions.map(o => window.escapeHTML(o.choiceName)).join(', ')}</div>`
                    : '';
                return `
                <li class="py-2 border-b border-gray-200 dark:border-gray-700/50 last:border-0 text-[#1B1C1C] dark:text-[#F6F3F2]">
                    <div class="flex items-start justify-between">
                        <span class="font-medium"><span class="font-bold text-[#D97531] mr-1">${i.quantity}x</span> ${window.escapeHTML(i.name)}</span>
                    </div>
                    ${optionsHtml}
                </li>`;
            }).join('');

            let statusBadge = '';
            if (order.status === 'Ready') {
                statusBadge = '<span class="px-2.5 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 text-xs font-semibold rounded-lg border border-blue-100 dark:border-blue-800"><i class="fa-solid fa-bell-concierge mr-1"></i> Sẵn sàng</span>';
            } else if (order.status === 'Completed') {
                statusBadge = '<span class="px-2.5 py-1 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-xs font-semibold rounded-lg border border-green-100 dark:border-green-800"><i class="fa-solid fa-check mr-1"></i> Hoàn thành</span>';
            } else if (order.status === 'Cancelled') {
                statusBadge = '<span class="px-2.5 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg border border-red-100 dark:border-red-800"><i class="fa-solid fa-xmark mr-1"></i> Đã Hủy</span>';
            } else {
                statusBadge = `<span class="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-semibold rounded-lg border border-gray-200 dark:border-gray-700">${order.status}</span>`;
            }

            return `
                <div class="bg-[#F6F3F2] dark:bg-[#2A2B2B] rounded-[1.25rem] p-5 shadow-sm border border-gray-200 dark:border-gray-800 flex flex-col justify-between">
                    <div>
                        <div class="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                            <div class="font-headline font-bold text-lg text-[#1B1C1C] dark:text-white flex items-center gap-2">
                                <div class="w-8 h-8 rounded-full bg-white dark:bg-[#1B1C1C] text-[#994700] flex items-center justify-center text-sm shadow-sm border border-gray-100 dark:border-gray-800">
                                    ${window.escapeHTML(String(order.tableNumber)) || '?'}
                                </div>
                                <span>Bàn ${window.escapeHTML(String(order.tableNumber)) || '?'}</span>
                            </div>
                            <div class="text-right">
                                <div class="text-sm text-gray-600 dark:text-gray-400 font-medium"><i class="fa-regular fa-clock"></i> ${timeStr}</div>
                                <div class="text-xs text-gray-400 dark:text-gray-500">${dateStr}</div>
                            </div>
                        </div>
                        <ul class="mb-4 list-none pl-0">
                            ${itemsHtml}
                        </ul>
                        ${order.orderNote ? `<div class="p-3 bg-orange-50 dark:bg-orange-900/20 text-[#994700] dark:text-orange-300 text-sm rounded-xl mb-4 font-medium flex gap-2 items-start border border-orange-100 dark:border-orange-800/50"><i class="fa-solid fa-note-sticky mt-0.5"></i> <span>Ghi chú: ${window.escapeHTML(order.orderNote)}</span></div>` : ''}
                    </div>
                    
                    <div class="mt-auto pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div class="flex justify-between items-center mb-4">
                            <div>${statusBadge}</div>
                            <span class="text-[#D97531] font-bold text-lg">${(order.totalPrice || 0).toLocaleString('vi-VN')} đ</span>
                        </div>
                        <button class="w-full py-2.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 rounded-xl font-semibold transition-colors flex justify-center items-center gap-2 text-sm bg-gray-50 dark:bg-gray-700" onclick="printReceipt('${order._id}')">
                            <i class="fa-solid fa-print"></i> In Hóa Đơn
                        </button>
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

// --- Kitchen Auto-Print Logic ---
window.autoPrintKitchen = localStorage.getItem('autoPrintKitchen') === 'true';
const autoPrintToggleEl = document.getElementById('autoPrintToggle');
if (autoPrintToggleEl) autoPrintToggleEl.checked = window.autoPrintKitchen;

window.toggleAutoPrint = () => {
    window.autoPrintKitchen = document.getElementById('autoPrintToggle').checked;
    localStorage.setItem('autoPrintKitchen', window.autoPrintKitchen);
};

window.printKitchenTicket = (order) => {
    if (!order) return;

    let itemsHtml = '';
    let orderItems = order.items;
    if (typeof orderItems === 'string') {
        try { orderItems = JSON.parse(orderItems); } catch(e) { orderItems = []; }
    }
    
    if (Array.isArray(orderItems)) {
        itemsHtml = orderItems.map(i => {
            const optionNames = i.selectedOptions && i.selectedOptions.length > 0 
               ? `<div style="font-size: 14px; margin-left: 20px; color: #333;">• ${i.selectedOptions.map(o => o.choiceName).join(', ')}</div>` 
               : '';
            return `<div style="margin-bottom: 8px; font-weight: bold; font-size: 18px;">${i.quantity}x ${i.name}</div>${optionNames}`;
        }).join('');
    }
    
    const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleTimeString('vi-VN') : new Date().toLocaleTimeString('vi-VN');
    const noteHtml = order.orderNote ? `<div style="margin-top: 15px; font-style: italic; border: 1px dashed #000; padding: 5px;">Ghi chú: ${order.orderNote}</div>` : '';

    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>PHIẾU CHẾ BIẾN - Bàn ${order.tableNumber || '?'}</title>
                <style>
                    body { font-family: 'Arial', sans-serif; padding: 10px; font-size: 16px; color: #000; margin: 0; }
                    .header { text-align: center; border-bottom: 3px solid #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .table-num { font-size: 32px; font-weight: bold; margin: 5px 0; }
                    .items { margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    @media print {
                        @page { margin: 0; }
                        body { width: 80mm; padding: 5mm; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin: 0;">PHIẾU CHẾ BIẾN</h2>
                    <div class="table-num">BÀN: ${order.tableNumber || '?'}</div>
                    <div style="font-size: 14px;">Thời gian: ${timeStr}</div>
                    <div style="font-size: 14px; margin-top: 5px;">Mã: ${(order._id || order.id || '').substring(0, 6)}</div>
                </div>
                <div class="items">
                    ${itemsHtml}
                    ${noteHtml}
                </div>
                <div style="text-align: center; margin-top: 10px; font-size: 12px;">----- HẾT -----</div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 200);
};
