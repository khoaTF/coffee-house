// =============================================
// ADMIN-ORDERS — Order History, Filter, Export, Print
// =============================================
// Dependencies: admin-core.js (orderHistory, historyTableBody, totalRevenueEl,
//               customConfirm, logAudit, showAdminToast, supabase)

async function fetchHistory() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('tenant_id', AdminState.tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        orderHistory = data.map(o => ({
            ...o,
            _id: o.id,
            createdAt: o.created_at,
            tableNumber: o.table_number,
            orderNote: o.order_note,
            totalPrice: o.total_price,
            discountAmount: o.discount_amount,
            paymentMethod: o.payment_method,
            paymentStatus: o.payment_status,
            orderSource: o.order_source || 'qr_table'
        }));

        renderHistoryTable();
        renderAnalytics();
    } catch (error) {
        console.error("fetchHistory error:", error);
        historyTableBody.replaceChildren();
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 7;
        td.className = 'text-danger text-center';
        td.textContent = 'Lỗi tải lịch sử đơn hàng.';
        tr.appendChild(td);
        historyTableBody.appendChild(tr);
    }
}

function renderHistoryTable() {
    historyTableBody.replaceChildren();
    let grossRevenue = 0;
    let netRevenue = 0;
    let totalProfit = 0;

    if (orderHistory.length === 0) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = 8;
        td.className = 'text-muted text-center py-4';
        td.textContent = 'Chưa có đơn hàng nào trong quá khứ.';
        tr.appendChild(td);
        historyTableBody.appendChild(tr);
        totalRevenueEl.innerHTML = `Tổng doanh thu nguyên giá: <strong>0 đ</strong> <span class="ms-3 text-success">Doanh thu thực nhận: <strong>0 đ</strong></span><span class="ms-3 text-primary">Lợi nhuận: <strong>0 đ</strong></span>`;
        return;
    }

    orderHistory.forEach(order => {
        let dateStr = "Unknown Date";
        if(order.createdAt) {
            try { dateStr = new Date(order.createdAt).toLocaleString(); } catch(e){}
        }

        const itemsStr = (order.items || []).map(i => `${i.quantity}x ${i.name}`).join(', ');
        const total = order.totalPrice || 0;
        const discount = order.discountAmount || 0;

        if (order.paymentStatus === 'paid' && order.status !== 'Cancelled') {
            netRevenue += total;
            grossRevenue += (total + discount);
            totalProfit += (order.profit || 0);
        }

        const statusMap = {
            'Pending': 'Chờ xác nhận',
            'Preparing': 'Đang làm',
            'Ready': 'Đã xong',
            'Completed': 'Hoàn thành',
            'Cancelled': 'Đã hủy'
        };

        const statusBadgeClasses = {
            'Pending': 'bg-warning text-dark',
            'Preparing': 'bg-primary',
            'Ready': 'bg-info text-dark',
            'Completed': 'bg-success',
            'Cancelled': 'bg-danger'
        };
        const badgeClass = statusBadgeClasses[order.status] || 'bg-secondary';

        const tr = document.createElement('tr');

        const tdId = document.createElement('td');
        tdId.className = 'text-dark-id';
        const smallId = document.createElement('small');
        smallId.textContent = `${(order._id||'').substring(0, 8)}...`;
        tdId.appendChild(smallId);

        const tdDate = document.createElement('td');
        tdDate.className = 'date-cell';
        tdDate.textContent = dateStr;

        const tdTable = document.createElement('td');
        tdTable.className = 'fw-bold table-cell';
        tdTable.textContent = `Bàn ${order.tableNumber || '?'}`;

        // Channel badge
        const CHANNEL_MAP = {
            qr_table: { icon: 'fa-qrcode', label: 'QR' },
            pos_counter: { icon: 'fa-cash-register', label: 'POS' },
            grabfood: { icon: 'fa-motorcycle', label: 'Grab' },
            shopeefood: { icon: 'fa-bag-shopping', label: 'Shopee' },
            befood: { icon: 'fa-utensils', label: 'BeFood' },
            zalo: { icon: 'fa-comment-dots', label: 'Zalo' },
            phone_call: { icon: 'fa-phone', label: 'Phone' },
            manual: { icon: 'fa-pen', label: 'Thủ công' }
        };
        const ch = order.orderSource || 'qr_table';
        const chInfo = CHANNEL_MAP[ch] || CHANNEL_MAP.qr_table;
        const tdChannel = document.createElement('td');
        const chBadge = document.createElement('span');
        chBadge.className = `channel-badge ch-${ch}`;
        chBadge.innerHTML = `<i class="fa-solid ${chInfo.icon}"></i> ${chInfo.label}`;
        tdChannel.appendChild(chBadge);

        const tdItems = document.createElement('td');
        const smallItems = document.createElement('small');
        smallItems.className = 'items-cell';
        smallItems.textContent = itemsStr;
        tdItems.appendChild(smallItems);

        const tdPrice = document.createElement('td');
        tdPrice.className = 'text-success fw-bold price-cell';
        tdPrice.textContent = `${total.toLocaleString('vi-VN')} đ`;

        const tdStatus = document.createElement('td');
        const statusBadge = document.createElement('span');
        statusBadge.className = `badge status-badge ${badgeClass} d-block mb-1`;
        statusBadge.textContent = statusMap[order.status] || order.status;

        const paymentBadge = document.createElement('span');
        const isPaid = order.paymentStatus === 'paid';
        const methodTxt = order.paymentMethod === 'transfer' ? 'CK' : 'Tại quầy';
        paymentBadge.className = `badge ${isPaid ? 'bg-success' : 'bg-warning text-dark'}`;
        paymentBadge.innerHTML = `<i class="fa-solid ${isPaid ? 'fa-check' : 'fa-clock'}"></i> ${methodTxt}: ${isPaid ? 'Đã TT' : 'Chưa TT'}`;

        tdStatus.appendChild(statusBadge);
        tdStatus.appendChild(paymentBadge);

        const tdAction = document.createElement('td');
        tdAction.className = 'action-cell';
        tdAction.style.cssText = 'white-space:nowrap; text-align:right; vertical-align:middle;';

        if (['Pending', 'Preparing', 'Ready'].includes(order.status)) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-danger needs-orders-edit';
            btn.textContent = 'Hủy';
            btn.onclick = () => cancelOrder(order._id);
            tdAction.appendChild(btn);
        }

        if (order.status !== 'Cancelled' && order.paymentStatus !== 'paid') {
            const btnPaid = document.createElement('button');
            btnPaid.className = 'btn btn-sm btn-success ms-1 needs-orders-edit';
            btnPaid.innerHTML = '<i class="fa-solid fa-check"></i> Thu tiền';
            btnPaid.title = "Xác nhận đã nhận tiền (Tiền mặt/Chuyển khoản)";
            btnPaid.onclick = () => markOrderPaid(order._id);
            tdAction.appendChild(btnPaid);
        }

        if (order.status === 'Completed') {
            const btnPrint = document.createElement('button');
            btnPrint.className = 'btn btn-sm btn-outline-secondary ms-1';
            btnPrint.innerHTML = '<i class="fa-solid fa-print"></i> In Bill';
            btnPrint.onclick = () => printInvoice(order._id);
            tdAction.appendChild(btnPrint);

            const btnInvoice = document.createElement('button');
            btnInvoice.className = 'btn btn-sm ms-1';
            btnInvoice.style.cssText = 'background:rgba(180,83,9,0.1);color:#b45309;border:1px solid rgba(180,83,9,0.2);font-weight:600;';
            btnInvoice.innerHTML = '<i class="fa-solid fa-file-invoice"></i> Hóa đơn';
            btnInvoice.onclick = () => generateEInvoice(order._id);
            tdAction.appendChild(btnInvoice);
        }

        tr.append(tdId, tdDate, tdTable, tdChannel, tdItems, tdPrice, tdStatus, tdAction);
        historyTableBody.appendChild(tr);
    });

    totalRevenueEl.replaceChildren();

    const strongGross = document.createElement('strong');
    strongGross.textContent = 'Tổng doanh thu (Gốc):';
    const spanGross = document.createElement('span');
    spanGross.className = 'text-muted ms-2 me-4 text-decoration-line-through';
    spanGross.textContent = `${grossRevenue.toLocaleString('vi-VN')} đ`;

    const strongNet = document.createElement('strong');
    strongNet.textContent = 'Doanh thu thực nhận:';
    const spanNet = document.createElement('span');
    spanNet.className = 'text-success ms-2 fw-bold fs-5';
    spanNet.textContent = `${netRevenue.toLocaleString('vi-VN')} đ`;

    const strongProfit = document.createElement('strong');
    strongProfit.className = 'ms-4';
    strongProfit.textContent = 'Tổng Lợi nhuận:';
    const spanProfit = document.createElement('span');
    spanProfit.className = 'text-primary ms-2 fw-bold fs-5';
    spanProfit.textContent = `${totalProfit.toLocaleString('vi-VN')} đ`;

    totalRevenueEl.append(strongGross, spanGross, strongNet, spanNet, strongProfit, spanProfit);
}

// B3: Hoàn kho nguyên liệu khi hủy đơn
async function restoreInventoryOnCancel(items) {
    if (!items || items.length === 0) return;
    try {
        for (const item of items) {
            const recipe = item.recipe || [];
            if (!Array.isArray(recipe) || recipe.length === 0) continue;
            const qty = item.quantity || 1;
            for (const ingr of recipe) {
                if (!ingr.ingredient_id && !ingr.id && !ingr.ingredientId) continue;
                const ingrId = ingr.ingredient_id || ingr.ingredientId || ingr.id;
                const restoreAmt = (ingr.amount || ingr.quantity || 0) * qty;
                if (restoreAmt <= 0) continue;
                const { data: cur } = await supabase.from('ingredients').select('stock').eq('id', ingrId).eq('tenant_id', AdminState.tenantId).maybeSingle();
                if (cur) {
                    await supabase.from('ingredients').update({ stock: (cur.stock || 0) + restoreAmt }).eq('id', ingrId).eq('tenant_id', AdminState.tenantId);
                }
            }
        }
    } catch(e) {
        console.warn('Restore inventory warning:', e);
    }
}

window.cancelOrder = async (orderId) => {
    const confirmed = await customConfirm(
        'Hủy đơn hàng này? Nguyên liệu đã dùng sẽ được hoàn lại kho tự động.',
        'Hủy Đơn Hàng'
    );
    if (!confirmed) return;
    try {
        const order = orderHistory.find(o => String(o._id) === String(orderId));
        
        let updatePayload = { status: 'Cancelled' };
        if (order && (order.paymentStatus === 'paid' || order.is_paid)) {
            updatePayload.payment_status = 'refunded';
        }

        const { error } = await supabase.from('orders').update(updatePayload).eq('id', orderId).eq('tenant_id', AdminState.tenantId);
        if (error) throw error;
        // Hoàn kho tự động
        if (order && order.items) await restoreInventoryOnCancel(order.items);
        logAudit('Hủy đơn hàng', `Đơn #${orderId.substring(0,8)}`);
        showAdminToast('Đã hủy đơn và hoàn kho thành công.', 'success');
        fetchHistory();
    } catch (error) {
        console.error(error);
        showAdminToast('Lỗi khi hủy đơn hàng.', 'error');
    }
};



window.markOrderPaid = async (orderId) => {
    try {
        // 1. Lấy thông tin đơn hàng
        const order = orderHistory.find(o => o._id === orderId || o.id === orderId);
        if (!order) throw new Error('Không tìm thấy đơn hàng');

        // 2. Cập nhật payment_status = 'paid' và is_paid = true trên orders table
        const { error: updateErr } = await supabase
            .from('orders')
            .update({ is_paid: true, payment_status: 'paid' })
            .eq('id', orderId)
            .eq('tenant_id', AdminState.tenantId);
        if (updateErr) throw updateErr;

        logAudit('Xác nhận thanh toán', `Đơn #${String(orderId).substring(0,8)} - ${(order.totalPrice||0).toLocaleString('vi-VN')}đ`);
        showAdminToast(`✅ Đã thu tiền đơn #${String(orderId).substring(0,8)} — ${(order.totalPrice||0).toLocaleString('vi-VN')}đ`, 'success');
        fetchHistory();
        // Refresh dashboard KPI ngay lập tức
        if (typeof renderDashboardStats === 'function') renderDashboardStats();
        if (typeof loadDashboard === 'function') loadDashboard();
    } catch (e) {
        console.error(e);
        showAdminToast('Lỗi xác nhận thanh toán: ' + e.message, 'error');
    }
};

window.printInvoice = async (orderId) => {
    const order = orderHistory.find(o => String(o._id) === String(orderId));
    if (!order) return;

    // Load store_settings
    let storeSettings = {};
    try {
        const { data } = await supabase.from('store_settings').select('*').eq('tenant_id', AdminState.tenantId).maybeSingle();
        storeSettings = data || JSON.parse(localStorage.getItem('store_settings') || '{}');
    } catch(e) {
        storeSettings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    }
    const storeName = storeSettings.store_name || 'Nohope Coffee';
    const storeAddress = storeSettings.store_address || '';
    const wifiName = storeSettings.wifi_name || '';
    const wifiPass = storeSettings.wifi_pass || '';
    const bankAccNo = storeSettings.bank_acc || '';
    const bankId = storeSettings.bank_id || 'mb';
    const logoUrl = storeSettings.logo_url || '';
    const zaloOa = storeSettings.zalo_oa_url || storeSettings.zalo_id || '';
    
    // Zalo or Feedback QR (Zalo preferred)
    const feedbackLink = zaloOa ? (zaloOa.startsWith('http') ? zaloOa : `https://zalo.me/${zaloOa}`) : `${window.location.origin}/feedback?t=${AdminState.tenantId}`;
    const feedbackQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(feedbackLink)}&margin=1`;


    const subtotal = order.totalPrice || 0;
    const discount = order.discountAmount || 0;
    const finalTotal = subtotal;
    const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
    const orderIdShort = (order._id || '').substring(0,8).toUpperCase();
    const payMethodMap = { cash: '💵 Tiền mặt', transfer: '📲 Chuyển khoản' };
    const payMethod = payMethodMap[order.paymentMethod] || order.paymentMethod || '';
    const payStatusBg = order.paymentStatus === 'paid' ? '#16a34a' : '#dc2626';
    const payStatusText = order.paymentStatus === 'paid' ? '✅ Đã Thanh Toán' : '⏳ Chưa Thanh Toán';

    const esc = window.escapeHTML || (s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'));
    const itemsHtml = (order.items || []).map(i => {
        const opts = i.selectedOptions && i.selectedOptions.length > 0
            ? `<div style="font-size:11px;color:#666;padding-left:12px;">↳ ${i.selectedOptions.map(o => esc(o.choiceName)).join(', ')}</div>` : '';
        return `
            <tr>
                <td style="padding:5px 4px;border-bottom:1px dashed #e2e8f0;vertical-align:top;">
                    <div style="font-weight:600;">${i.quantity}× ${esc(i.name)}</div>
                    ${opts}
                </td>
                <td style="padding:5px 4px;border-bottom:1px dashed #e2e8f0;text-align:right;white-space:nowrap;vertical-align:top;">${((i.price || 0) * (i.quantity || 1)).toLocaleString('vi-VN')} đ</td>
            </tr>`;
    }).join('');

    const qrUrl = bankAccNo
        ? `https://img.vietqr.io/image/${bankId}-${bankAccNo}-compact2.jpg?amount=${finalTotal}&addInfo=${encodeURIComponent(orderIdShort)}&accountName=${encodeURIComponent(storeName)}`
        : '';

    const printWindow = window.open('', '_blank', 'width=420,height=720');
    printWindow.document.write(`<!DOCTYPE html><html lang="vi"><head>
        <meta charset="UTF-8">
        <title>Hóa Đơn ${orderIdShort} — ${storeName}</title>
        <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Courier New', monospace; font-size: 13px; color: #111; background: #fff; width: 80mm; padding: 0; margin: 0 auto; line-height: 1.4; }
            .receipt-container { padding: 10px 8px; width: 100%; max-width: 80mm; margin: 0 auto; }
            .logo-row { text-align: center; margin-bottom: 8px; }
            .store-logo { max-width: 60px; max-height: 60px; object-fit: contain; margin-bottom: 6px; filter: grayscale(100%); }
            .store-name { font-size: 18px; font-weight: 900; -webkit-font-smoothing: antialiased; letter-spacing: 0.5px; text-transform: uppercase; }
            .store-sub { font-size: 11px; color: #333; margin-top: 3px; font-weight: 500; }
            .receipt-title { text-align: center; font-size: 14px; font-weight: bold; margin-top: 10px; margin-bottom: 5px; }
            .divider-solid { border: none; border-top: 2px solid #111; margin: 10px 0; }
            .divider-dash { border: none; border-top: 1px dashed #777; margin: 8px 0; }
            .meta-row { display: flex; justify-content: space-between; font-size: 12px; margin: 3px 0; }
            .items-table { width: 100%; border-collapse: collapse; margin: 8px 0; }
            .items-table td { font-size: 12px; padding: 6px 2px; border-bottom: 1px dashed #e2e8f0; vertical-align: top; }
            .total-section { margin-top: 10px; }
            .total-row { display: flex; justify-content: space-between; font-size: 12px; margin: 4px 0; }
            .grand-total { font-size: 18px; font-weight: 900; margin-top: 8px; padding-top: 8px; border-top: 2px solid #111; display:flex; justify-content:space-between; }
            .pay-status { text-align:center; margin: 12px 0; padding: 6px 10px; font-weight: 900; font-size: 13px; color: #fff; background: ${payStatusBg}; border-radius: 4px; border: 1px solid #111; color: #111; background: transparent; }
            .footer { text-align: center; font-size: 12px; color: #333; margin-top: 15px; }
            .qr-wrapper { text-align: center; margin: 15px 0; page-break-inside: avoid; border: 1px dashed #aaa; padding: 8px; border-radius: 6px; }
            .qr-prompt { font-size: 12px; font-weight: bold; margin-bottom: 6px; }
            .qr-img { display: block; margin: 0 auto; width: 100px; height: 100px; }
            .pay-qr-wrapper { text-align: center; margin: 10px 0; page-break-inside: avoid; }
            .pay-qr-img { display: block; margin: 0 auto; width: 120px; height: 120px; }
            .pay-qr-text { font-size: 11px; margin-top: 4px; font-weight: bold; }
            @media print { @page { margin: 0; size: 80mm auto; } body { width: 80mm !important; } .receipt-container { padding: 5px !important; } }
        </style>
    </head><body><div class="receipt-container">
        <div class="logo-row">
            ${logoUrl ? `<img src="${logoUrl}" class="store-logo" alt="Logo">` : ''}
            <div class="store-name">${esc(storeName)}</div>
            ${storeAddress ? `<div class="store-sub">${esc(storeAddress)}</div>` : ''}
        </div>
        <div class="receipt-title">HÓA ĐƠN BÁN HÀNG</div>
        <hr class="divider-solid">
        <div class="meta-row"><span>Mã đơn:</span><span><b>#${orderIdShort}</b></span></div>
        <div class="meta-row"><span>Bàn số:</span><span><b>Bàn ${esc(order.tableNumber)}</b></span></div>
        <div class="meta-row"><span>Thời gian:</span><span>${timeStr}</span></div>
        ${payMethod ? `<div class="meta-row"><span>Thanh toán:</span><span>${payMethod}</span></div>` : ''}
        <hr class="divider-dash">
        <table class="items-table">${itemsHtml}</table>
        <hr class="divider-dash">
        <div class="total-section">
            ${discount > 0 ? `
                <div class="total-row"><span>Tạm tính:</span><span>${(subtotal + discount).toLocaleString('vi-VN')} đ</span></div>
                <div class="total-row" style="font-weight:bold;"><span>Giảm giá:</span><span>-${discount.toLocaleString('vi-VN')} đ</span></div>
            ` : ''}
            ${order.orderNote ? `<div class="total-row" style="font-style:italic; margin-top:8px;"><span>Ghi chú:</span><span style="text-align:right;max-width:60%;">${esc(order.orderNote)}</span></div>` : ''}
            <div class="grand-total"><span>TỔNG CỘNG</span><span>${finalTotal.toLocaleString('vi-VN')} đ</span></div>
        </div>
        
        <div class="pay-status">${payStatusText}</div>
        
        ${qrUrl && order.paymentStatus !== 'paid' ? `
        <div class="pay-qr-wrapper">
            <img src="${qrUrl}" class="pay-qr-img" alt="QR Thanh toán">
            <div class="pay-qr-text">Quét mã để thanh toán</div>
        </div>
        ` : ''}
        
        <hr class="divider-solid">
        <div class="footer">
            ${wifiName ? `<div style="margin-bottom:8px;">📶 WiFi: <b>${esc(wifiName)}</b>${wifiPass ? ` / ${esc(wifiPass)}` : ''}</div>` : ''}
            
            <div class="qr-wrapper">
                <div class="qr-prompt">Quét mã để Đánh giá & Khuyến mãi!</div>
                <img src="${feedbackQrUrl}" class="qr-img" alt="Feedback QR">
            </div>

            <div style="margin-top:10px;font-size:13px;font-weight:900;">CẢM ƠN QUÝ KHÁCH!</div>
            <div style="font-size:11px; margin-top:3px;">Hẹn gặp lại lần sau 🙏</div>
        </div>
    </div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 400);
};


// --- History Date Filter ---
let historyFilterRange = 'today';
let historyFilteredData = [];
let channelFilter = 'all';

window.setChannelFilter = function(ch) {
    channelFilter = ch;
    document.querySelectorAll('.channel-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.querySelector(`.channel-filter-btn[data-channel="${ch}"]`);
    if (btn) btn.classList.add('active');
    applyHistoryFilters();
};

function initHistoryFilter() {
    const filterBar = document.getElementById('history-filter-bar');
    if (!filterBar) return;

    const searchInput = document.getElementById('history-search-input');
    if (searchInput) {
        searchInput.addEventListener('input', () => applyHistoryFilters());
    }
}

function setHistoryFilter(range) {
    historyFilterRange = range;
    document.querySelectorAll('.history-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById(`hf-${range}`);
    if (btn) btn.classList.add('active');

    const customDates = document.getElementById('history-custom-dates');
    if (customDates) customDates.style.display = range === 'custom' ? 'flex' : 'none';

    if (range !== 'custom') applyHistoryFilters();
}

function applyHistoryFilters() {
    const now = new Date();
    let startDate = null;

    if (historyFilterRange === 'today') {
        startDate = new Date(now); startDate.setHours(0,0,0,0);
    } else if (historyFilterRange === 'yesterday') {
        startDate = new Date(now); startDate.setDate(startDate.getDate()-1); startDate.setHours(0,0,0,0);
        const endDate = new Date(startDate); endDate.setHours(23,59,59,999);
        historyFilteredData = orderHistory.filter(o => {
            const d = new Date(o.createdAt);
            return d >= startDate && d <= endDate;
        });
        renderFilteredHistory();
        return;
    } else if (historyFilterRange === '7days') {
        startDate = new Date(now); startDate.setDate(startDate.getDate()-7);
    } else if (historyFilterRange === '30days') {
        startDate = new Date(now); startDate.setDate(startDate.getDate()-30);
    } else if (historyFilterRange === 'custom') {
        const s = document.getElementById('hf-start-date')?.value;
        const e = document.getElementById('hf-end-date')?.value;
        if (!s || !e) return;
        const sd = new Date(s + 'T00:00:00');
        const ed = new Date(e + 'T23:59:59');
        historyFilteredData = orderHistory.filter(o => {
            const d = new Date(o.createdAt);
            return d >= sd && d <= ed;
        });
        renderFilteredHistory();
        return;
    }

    historyFilteredData = startDate
        ? orderHistory.filter(o => new Date(o.createdAt) >= startDate)
        : [...orderHistory];

    renderFilteredHistory();
}

function renderFilteredHistory() {
    const searchTerm = (document.getElementById('history-search-input')?.value || '').toLowerCase().trim();
    let data = historyFilteredData;

    // Apply channel filter
    if (channelFilter && channelFilter !== 'all') {
        data = data.filter(o => (o.orderSource || o.order_source || 'qr_table') === channelFilter);
    }

    if (searchTerm) {
        data = data.filter(o => {
            const idMatch = (o._id || '').toLowerCase().includes(searchTerm);
            const tableMatch = String(o.tableNumber || '').toLowerCase().includes(searchTerm);
            const itemsMatch = (o.items || []).some(i => i.name.toLowerCase().includes(searchTerm));
            return idMatch || tableMatch || itemsMatch;
        });
    }

    const original = orderHistory;
    orderHistory = data;
    renderHistoryTable();
    orderHistory = original;
}

// --- Export CSV Utilities ---
function exportToCSV(rows, columns, filename) {
    if (!rows || rows.length === 0) {
        showAdminToast('Không có dữ liệu để xuất!', 'warning');
        return;
    }
    const BOM = '\uFEFF';
    const header = columns.map(c => `"${c.label}"`).join(',');
    const csvRows = rows.map(row => {
        return columns.map(c => {
            let val = row[c.key];
            if (val === null || val === undefined) val = '';
            if (typeof val === 'object') val = JSON.stringify(val);
            val = String(val).replace(/"/g, '""');
            return `"${val}"`;
        }).join(',');
    });
    const csvContent = BOM + header + '\n' + csvRows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

window.exportOrdersToCSV = function() {
    const columns = [
        { key: 'id_short', label: 'Mã Đơn' },
        { key: 'table_number', label: 'Bàn' },
        { key: 'status', label: 'Trạng Thái' },
        { key: 'total_price', label: 'Tổng Tiền (VNĐ)' },
        { key: 'payment_method', label: 'PT Thanh Toán' },
        { key: 'payment_status', label: 'TT Thanh Toán' },
        { key: 'item_names', label: 'Danh Sách Món' },
        { key: 'order_note', label: 'Ghi Chú' },
        { key: 'customer_phone', label: 'SĐT Khách' },
        { key: 'created_at_str', label: 'Thời Gian' }
    ];

    const rows = (orderHistory || []).map(o => ({
        id_short: (o._id || o.id || '').substring(0, 8),
        table_number: o.tableNumber || o.table_number || '',
        status: o.status || '',
        total_price: o.totalPrice || o.total_price || 0,
        payment_method: o.payment_method === 'transfer' ? 'Chuyển khoản' : 'Tiền mặt',
        payment_status: o.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán',
        item_names: (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(', '),
        order_note: o.orderNote || o.order_note || '',
        customer_phone: o.customer_phone || '',
        created_at_str: new Date(o.createdAt || o.created_at).toLocaleString('vi-VN')
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    exportToCSV(rows, columns, `don_hang_${dateStr}.csv`);
};

// --- Shift Summary ---
let shiftStartTime = null;

window.openShiftSummary = async function() {
    if (!shiftStartTime) shiftStartTime = new Date();
    const modal = document.getElementById('shiftSummaryModal');
    if (!modal) return;

    const shiftOrders = orderHistory.filter(o => new Date(o.createdAt) >= shiftStartTime);
    const completed = shiftOrders.filter(o => o.status === 'Completed');
    const paidOrders = shiftOrders.filter(o => o.paymentStatus === 'paid' && o.status !== 'Cancelled');
    const totalRevenue = paidOrders.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const cashRevenue = paidOrders.filter(o => o.paymentMethod !== 'transfer').reduce((s, o) => s + (o.totalPrice || 0), 0);
    const transferRevenue = paidOrders.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + (o.totalPrice || 0), 0);
    const cancelled = shiftOrders.filter(o => o.status === 'Cancelled').length;

    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Nhân viên';
    const startStr = shiftStartTime.toLocaleString('vi-VN');
    const endStr = new Date().toLocaleString('vi-VN');

    document.getElementById('shift-summary-content').innerHTML = `
        <div class="shift-summary-header">
            <h4><i class="fa-solid fa-moon me-2 text-[#C0A062]"></i>Tổng kết ca làm việc</h4>
            <div class="shift-meta">
                <span><i class="fa-solid fa-user me-1"></i>${window.escapeHTML(staffName)}</span>
                <span><i class="fa-solid fa-clock me-1"></i>${startStr} → ${endStr}</span>
            </div>
        </div>
        <div class="shift-kpi-row">
            <div class="shift-kpi"><div class="shift-kpi-val">${shiftOrders.length}</div><div class="shift-kpi-lbl">Tổng đơn</div></div>
            <div class="shift-kpi"><div class="shift-kpi-val text-success">${completed.length}</div><div class="shift-kpi-lbl">Hoàn thành</div></div>
            <div class="shift-kpi"><div class="shift-kpi-val text-danger">${cancelled}</div><div class="shift-kpi-lbl">Đã hủy</div></div>
        </div>
        <hr class="border-slate-200 my-4">
        <div class="shift-revenue-table">
            <div class="shift-rev-row"><span>Doanh thu tổng</span><strong class="text-[#b45309]">${totalRevenue.toLocaleString('vi-VN')} đ</strong></div>
            <div class="shift-rev-row"><span><i class="fa-solid fa-money-bill-wave me-1 text-green-400"></i>Tiền mặt</span><strong>${cashRevenue.toLocaleString('vi-VN')} đ</strong></div>
            <div class="shift-rev-row"><span><i class="fa-solid fa-qrcode me-1 text-blue-400"></i>Chuyển khoản</span><strong>${transferRevenue.toLocaleString('vi-VN')} đ</strong></div>
        </div>
    `;

    let shiftModalInstance = bootstrap.Modal.getOrCreateInstance(modal);
    shiftModalInstance.show();
};

window.printShiftSummary = function() {
    const content = document.getElementById('shift-summary-content')?.innerHTML || '';
    const w = window.open('', '', 'width=500,height=600');
    w.document.write(`<html><head><title>Tổng kết ca</title><style>body{font-family:sans-serif;padding:20px;color:#000;}.shift-summary-header h4{font-size:18px;margin-bottom:8px;}.shift-meta{font-size:12px;color:#666;margin-bottom:20px;}.shift-kpi-row{display:flex;gap:20px;margin-bottom:20px;}.shift-kpi{text-align:center;}.shift-kpi-val{font-size:28px;font-weight:900;}.shift-kpi-lbl{font-size:12px;color:#666;}.shift-rev-row{display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #eee;font-size:14px;}</style></head><body>${content}</body></html>`);
    w.document.close();
    w.focus();
    w.print();
    w.close();
};

// D6 — Export filtered orders as Excel (.xlsx) using SheetJS
window.exportOrdersExcel = function() {
    if (typeof XLSX === 'undefined') {
        showAdminToast('Thu vien xuat Excel chua san sang.', 'warning');
        return;
    }
    const source = (typeof historyFilteredData !== 'undefined' && historyFilteredData.length > 0)
        ? historyFilteredData : orderHistory;
    if (!source || source.length === 0) {
        showAdminToast('Khong co don hang nao de xuat.', 'warning');
        return;
    }
    const sMap = { Pending: 'Cho xac nhan', Preparing: 'Dang lam', Ready: 'Da xong', Completed: 'Hoan thanh', Cancelled: 'Da huy' };
    const rows = source.map(o => ({
        'Ma don': (o._id || o.id || '').substring(0, 8).toUpperCase(),
        'Thoi gian': new Date(o.createdAt || o.created_at).toLocaleString('vi-VN'),
        'Ban': o.tableNumber || o.table_number || '',
        'SDT khach': o.customer_phone || '',
        'Mon': Array.isArray(o.items) ? o.items.map(i => i.name+'x'+i.quantity).join('; ') : '',
        'Tong tien': o.totalPrice || o.total_price || 0,
        'Giam gia': o.discountAmount || o.discount_amount || 0,
        'Phuong thuc TT': o.paymentMethod || o.payment_method || '',
        'Thanh toan': (o.paymentStatus || o.payment_status) === 'paid' ? 'Da TT' : 'Chua TT',
        'Trang thai': sMap[o.status] || o.status || '',
        'Ghi chu': o.orderNote || o.order_note || ''
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Don hang');
    ws['!cols'] = Object.keys(rows[0]).map(() => ({ wch: 18 }));
    const today = new Date().toISOString().slice(0,10);
    XLSX.writeFile(wb, 'donhang_' + today + '.xlsx');
    if(typeof logAudit === 'function') logAudit('Xuat bao cao Excel', rows.length + ' don hang');
    showAdminToast('Da xuat ' + rows.length + ' don hang ra file Excel!', 'success');
};

// --- E-Invoice Generation ---
window.generateEInvoice = async function(orderId) {
    try {
        showAdminToast('Đang tạo hóa đơn...', 'info');

        const tenantId = window.AdminState?.tenantId;
        if (!tenantId) {
            showAdminToast('Không tìm thấy Tenant ID', 'error');
            return;
        }

        const response = await fetch('/api/generate-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_id: orderId, tenant_id: tenantId })
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Lỗi tạo hóa đơn');
        }

        const html = await response.text();
        const invoiceWindow = window.open('', '_blank', 'width=900,height=700');
        invoiceWindow.document.write(html);
        invoiceWindow.document.close();

        // Auto-trigger print dialog
        setTimeout(() => invoiceWindow.print(), 500);

        if (typeof logAudit === 'function') logAudit('Tạo E-Invoice', `Đơn hàng ${orderId}`);
        showAdminToast('Hóa đơn đã sẵn sàng!', 'success');
    } catch (error) {
        console.error('Invoice error:', error);
        showAdminToast('Lỗi: ' + error.message, 'error');
    }
};
