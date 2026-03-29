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
            paymentStatus: o.payment_status
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
        td.colSpan = 7;
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

        if (order.status === 'Completed') {
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
        tdAction.className = 'text-end action-cell';

        if (['Pending', 'Preparing', 'Ready'].includes(order.status)) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-sm btn-outline-danger';
            btn.textContent = 'Hủy';
            btn.onclick = () => cancelOrder(order._id);
            tdAction.appendChild(btn);

            if (order.paymentStatus !== 'paid') {
                const btnPaid = document.createElement('button');
                btnPaid.className = 'btn btn-sm btn-success ms-1';
                btnPaid.innerHTML = '<i class="fa-solid fa-check"></i> Thu tiền';
                btnPaid.title = "Xác nhận đã nhận tiền (Tiền mặt/Chuyển khoản)";
                btnPaid.onclick = () => markOrderPaid(order._id);
                tdAction.appendChild(btnPaid);
            }
        } else if (order.status === 'Completed') {
            const btnPrint = document.createElement('button');
            btnPrint.className = 'btn btn-sm btn-outline-secondary ms-1';
            btnPrint.innerHTML = '<i class="fa-solid fa-print"></i> In Bill';
            btnPrint.onclick = () => printInvoice(order._id);
            tdAction.appendChild(btnPrint);
        }

        tr.append(tdId, tdDate, tdTable, tdItems, tdPrice, tdStatus, tdAction);
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
                if (!ingr.ingredient_id && !ingr.id) continue;
                const ingrId = ingr.ingredient_id || ingr.id;
                const restoreAmt = (ingr.amount || 0) * qty;
                if (restoreAmt <= 0) continue;
                const { data: cur } = await supabase.from('ingredients').select('stock').eq('id', ingrId).maybeSingle();
                if (cur) {
                    await supabase.from('ingredients').update({ stock: (cur.stock || 0) + restoreAmt }).eq('id', ingrId);
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
        const { error } = await supabase.from('orders').update({ status: 'Cancelled' }).eq('id', orderId);
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
        const { error } = await supabase.from('orders').update({ payment_status: 'paid' }).eq('id', orderId);
        if (error) throw error;
        fetchHistory();
    } catch (e) {
        console.error(e);
        alert('Lỗi xác nhận thanh toán.');
    }
};

window.printInvoice = async (orderId) => {
    const order = orderHistory.find(o => String(o._id) === String(orderId));
    if (!order) return;

    // Load from store_settings (with localStorage fallback)
    let storeSettings = {};
    try {
        const { data } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
        storeSettings = data || JSON.parse(localStorage.getItem('store_settings') || '{}');
    } catch(e) {
        storeSettings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    }
    const storeName = storeSettings.store_name || 'Nohope Coffee';
    const storeAddress = storeSettings.store_address ? `Đ/C: ${storeSettings.store_address}` : '';
    const wifiInfo = storeSettings.wifi_name ? `Wifi: ${storeSettings.wifi_name} / Pass: ${storeSettings.wifi_pass || ''}` : '';

    const itemsHtml = order.items.map(i => {
        const optionNames = i.selectedOptions && i.selectedOptions.length > 0 ? ` (+ ${i.selectedOptions.map(o => o.choiceName).join(', ')})` : '';
        return `<div>${i.quantity}x ${i.name}${optionNames} - ${(i.price * i.quantity).toLocaleString('vi-VN')}đ</div>`;
    }).join('');

    const subtotal = order.totalPrice ? order.totalPrice : 0;
    const discount = order.discountAmount ? order.discountAmount : 0;
    const finalTotal = subtotal - discount;

    const timeStr = order.createdAt ? new Date(order.createdAt).toLocaleString('vi-VN') : new Date().toLocaleString('vi-VN');
    const noteHtml = order.orderNote ? `<div style="margin-top: 10px; font-style: italic;">Ghi chú: ${order.orderNote}</div>` : '';

    const printWindow = window.open('', '', 'width=400,height=600');
    printWindow.document.write(`
        <html>
            <head>
                <title>Hóa Đơn - Bàn ${order.tableNumber}</title>
                <style>
                    body { font-family: 'Courier New', Courier, monospace; padding: 20px; font-size: 14px; color: #000; margin: 0; }
                    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 15px; }
                    .items { margin-bottom: 15px; border-bottom: 2px dashed #000; padding-bottom: 10px; }
                    .summary { text-align: right; font-size: 14px; margin-bottom: 5px; }
                    .total { text-align: right; font-weight: bold; font-size: 18px; margin-bottom: 20px; margin-top: 10px; }
                    .footer { text-align: center; font-size: 12px; }
                    @media print { @page { margin: 0; } body { width: 80mm; padding: 5mm; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <h2 style="margin: 0 0 5px 0;">${storeName}</h2>
                    <div>${storeAddress}</div>
                    <div>Hóa đơn thanh toán</div>
                    <div style="margin-top: 10px;">Bàn số: <strong>${order.tableNumber}</strong></div>
                    <div>Thời gian: ${timeStr}</div>
                    <div>Mã đơn: ${(order._id || '').substring(0, 8)}</div>
                </div>
                <div class="items">
                    ${itemsHtml}
                    ${noteHtml}
                </div>
                ${discount > 0 ? `<div class="summary">Giảm giá: -${discount.toLocaleString('vi-VN')} đ</div>` : ''}
                <div class="total">Tổng cộng: ${finalTotal.toLocaleString('vi-VN')} đ</div>
                <div class="footer">
                    <div>${wifiInfo}</div>
                    <div style="margin-top: 5px;">Cảm ơn quý khách! Hẹn gặp lại.</div>
                </div>
            </body>
        </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); printWindow.close(); }, 200);
};

// --- History Date Filter ---
let historyFilterRange = 'today';
let historyFilteredData = [];

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
        alert('Không có dữ liệu để xuất!');
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
    const data = historyFilteredData.length > 0 ? historyFilteredData : orderHistory;
    if (!data || data.length === 0) {
        showAdminToast('Không có dữ liệu để xuất.', 'error');
        return;
    }
    const BOM = '\uFEFF';
    const headers = ['Mã đơn', 'Thời gian', 'Bàn', 'Các món', 'Tổng tiền (đ)', 'Giảm giá (đ)', 'TT thanh toán', 'Trạng thái'];
    const rows = data.map(o => [
        (o._id || '').substring(0, 8),
        o.createdAt ? new Date(o.createdAt).toLocaleString('vi-VN') : '',
        `Bàn ${o.tableNumber || '?'}`,
        (o.items || []).map(i => `${i.quantity}x ${i.name}`).join(' | '),
        o.totalPrice || 0,
        o.discountAmount || 0,
        o.paymentMethod === 'transfer' ? 'Chuyển khoản' : 'Tại quầy',
        o.status || ''
    ]);
    const csvContent = BOM + [headers, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nohope_orders_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAdminToast('✅ Đã xuất file CSV thành công!', 'success');
    logAudit('Xuất CSV đơn hàng', `${data.length} đơn`);
};

window.exportOrderHistory = function() {
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

// Alias
window.exportOrdersToCSV = window.exportOrderHistory;

// --- Shift Summary ---
let shiftStartTime = null;

window.openShiftSummary = async function() {
    if (!shiftStartTime) shiftStartTime = new Date();
    const modal = document.getElementById('shiftSummaryModal');
    if (!modal) return;

    const shiftOrders = orderHistory.filter(o => new Date(o.createdAt) >= shiftStartTime);
    const completed = shiftOrders.filter(o => o.status === 'Completed');
    const totalRevenue = completed.reduce((s, o) => s + (o.totalPrice || 0), 0);
    const cashRevenue = completed.filter(o => o.paymentMethod !== 'transfer').reduce((s, o) => s + (o.totalPrice || 0), 0);
    const transferRevenue = completed.filter(o => o.paymentMethod === 'transfer').reduce((s, o) => s + (o.totalPrice || 0), 0);
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
        <hr class="border-[#3A3528] my-4">
        <div class="shift-revenue-table">
            <div class="shift-rev-row"><span>Doanh thu tổng</span><strong class="text-[#D4AF37]">${totalRevenue.toLocaleString('vi-VN')} đ</strong></div>
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
