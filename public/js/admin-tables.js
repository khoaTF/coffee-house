// =============================================
// ADMIN-TABLES — Table Status Grid & Actions
// =============================================
// Dependencies: admin-core.js (supabase, customConfirm, logAudit)

async function fetchTablesStatus() {
    try {
        // C2: Fetch table_count from store_settings dynamically
        let maxTable = 15;
        try {
            const { data: settings } = await supabase.from('store_settings').select('table_count').eq('id', 1).maybeSingle();
            if (settings && settings.table_count > 0) maxTable = settings.table_count;
        } catch(_) {}

        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .or('status.in.(Pending,Preparing,Ready),and(status.eq.Completed,is_paid.eq.false)');

        if (error) throw error;

        const activeOrders = data.map(o => ({
            ...o,
            _id: o.id,
            tableNumber: parseInt(o.table_number) || o.table_number
        }));

        const grid = document.getElementById('tables-grid');
        grid.innerHTML = '';

        for (let i = 1; i <= maxTable; i++) {
            const tableOrders = activeOrders.filter(o => o.tableNumber == i);
            const isOccupied = tableOrders.length > 0;
            const hasUnpaid = tableOrders.some(o => !o.is_paid);

            let statusConfig = { color: '#ffffff', icon: 'fa-chair', text: 'Trống', border: '#e2e8f0', textColor: '#94a3b8', iconColor: '#cbd5e1', pulse: false };
            if (isOccupied) {
                if (hasUnpaid) {
                    statusConfig = { color: '#fef2f2', icon: 'fa-money-bill-wave', text: 'Chưa TToán', border: '#fca5a5', textColor: '#dc2626', iconColor: '#ef4444', pulse: true };
                } else {
                    statusConfig = { color: '#eff6ff', icon: 'fa-utensils', text: 'Đang làm/chờ món', border: '#93c5fd', textColor: '#2563eb', iconColor: '#3b82f6', pulse: false };
                }
            }

            const card = document.createElement('div');
            card.className = `table-card text-center p-4 rounded-2xl shadow-sm ${statusConfig.pulse ? 'pulse-border' : ''}`;
            card.style.transition = 'all 0.3s';
            card.style.background = statusConfig.color;
            card.style.border = `2px solid ${statusConfig.border}`;
            card.style.cursor = isOccupied ? 'pointer' : 'default';

            if (isOccupied) {
                card.onclick = () => window.showTableActions(i, tableOrders);
            }

            const iconContainer = document.createElement('div');
            iconContainer.className = 'text-3xl mb-2';
            iconContainer.style.color = statusConfig.iconColor;
            const icon = document.createElement('i');
            icon.className = `fa-solid ${statusConfig.icon}`;
            iconContainer.appendChild(icon);

            const idText = document.createElement('div');
            idText.className = 'text-lg font-bold mb-1';
            idText.textContent = `Bàn ${i}`;
            idText.style.color = isOccupied ? '#1e293b' : '#94a3b8';

            const statusText = document.createElement('div');
            statusText.className = 'text-xs font-semibold';
            statusText.style.color = statusConfig.textColor;
            statusText.textContent = statusConfig.text;

            card.append(iconContainer, idText, statusText);

            if (isOccupied) {
                const badgeContainer = document.createElement('div');
                badgeContainer.className = 'mt-2';
                const badge = document.createElement('span');
                badge.className = `text-xs font-bold px-2 py-0.5 rounded-full text-white ${hasUnpaid ? 'bg-red-500' : 'bg-blue-500'}`;
                badge.textContent = `${tableOrders.length} đơn hàng`;
                badgeContainer.appendChild(badge);
                card.appendChild(badgeContainer);
            }

            grid.appendChild(card);
        }
    } catch (e) {
        console.error('Error fetching table status:', e);
    }
}


window.showTableActions = async (tableNum, tableOrders) => {
    const hasUnpaid = tableOrders.some(o => !o.is_paid);
    const allPaid = tableOrders.every(o => o.is_paid);
    let tableActionsModalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('tableActionsModal'));

    // Info text
    const unpaidCount = tableOrders.filter(o => !o.is_paid).length;
    const paidCount = tableOrders.filter(o => o.is_paid).length;
    const totalAll = tableOrders.reduce((s, o) => s + (o.total_price || 0), 0);
    document.getElementById('tableActionsInfo').innerHTML =
        `<strong>Bàn ${tableNum}</strong> — ${tableOrders.length} đơn hàng` +
        (unpaidCount > 0 ? ` <span class="text-danger">(${unpaidCount} chưa thanh toán)</span>` : '') +
        (paidCount > 0 ? ` <span class="text-success">(${paidCount} đã thanh toán)</span>` : '') +
        `<br><small class="text-slate-500">Tổng: ${totalAll.toLocaleString()}đ</small>`;

    // --- Transfer button ---
    const transferForm = document.getElementById('tableTransferForm');
    transferForm.style.display = 'none';
    document.getElementById('tableNewNumberInput').value = '';

    const transferBtn = document.getElementById('tableActionTransferBtn');
    const newTransferBtn = transferBtn.cloneNode(true);
    transferBtn.parentNode.replaceChild(newTransferBtn, transferBtn);
    newTransferBtn.addEventListener('click', () => {
        transferForm.style.display = 'block';
        document.getElementById('tableNewNumberInput').focus();
    });

    // Transfer confirm
    const confirmTransferBtn = document.getElementById('tableTransferConfirmBtn');
    const newConfirmBtn = confirmTransferBtn.cloneNode(true);
    confirmTransferBtn.parentNode.replaceChild(newConfirmBtn, confirmTransferBtn);
    newConfirmBtn.addEventListener('click', async () => {
        const newTable = document.getElementById('tableNewNumberInput').value.trim();
        if (!newTable || newTable == tableNum) {
            document.getElementById('tableNewNumberInput').classList.add('is-invalid');
            return;
        }
        newConfirmBtn.disabled = true;
        newConfirmBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i>';
        try {
            const orderIds = tableOrders.map(o => o._id);
            for (const oid of orderIds) {
                await supabase.from('orders').update({ table_number: newTable }).eq('id', oid);
            }
            const sessionIds = [...new Set(tableOrders.map(o => o.session_id))];
            for (const sid of sessionIds) {
                await supabase.from('table_sessions').update({ table_number: newTable }).eq('session_id', sid).eq('table_number', tableNum.toString());
            }
            logAudit('Chuyển bàn', `Bàn ${tableNum} → Bàn ${newTable}`);
            tableActionsModalInstance.hide();
            fetchTablesStatus();
        } catch(e) {
            showAdminToast('Lỗi khi chuyển bàn: ' + e.message, 'error');
            newConfirmBtn.disabled = false;
            newConfirmBtn.textContent = 'Chuyển';
        }
    });

    // --- Pay button (only marks paid, does NOT clear session) ---
    const payBtn = document.getElementById('tableActionPayBtn');
    const newPayBtn = payBtn.cloneNode(true);
    payBtn.parentNode.replaceChild(newPayBtn, payBtn);
    newPayBtn.style.display = hasUnpaid ? 'flex' : 'none';
    newPayBtn.addEventListener('click', async () => {
        tableActionsModalInstance.hide();
        const confirmed = await customConfirm(
            `Xác nhận đã thu tiền cho ${unpaidCount} đơn chưa thanh toán của Bàn ${tableNum}?\n(Bàn vẫn giữ phiên — khách có thể gọi thêm món)`,
            'Xác nhận Thu Tiền'
        );
        if (!confirmed) return;
        try {
            const unpaidOrders = tableOrders.filter(o => !o.is_paid);
            for (const ord of unpaidOrders) {
                await supabase.from('orders').update({ is_paid: true, payment_status: 'paid' }).eq('id', ord._id);

                // Ghi sổ quỹ
                const amount = ord.total_price || ord.totalPrice || 0;
                if (amount > 0) {
                    const orderIdShort = String(ord._id).substring(0, 8);
                    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Admin';
                    await supabase.from('cash_transactions').insert({
                        type: 'income',
                        amount: amount,
                        description: `Thu tiền bàn ${tableNum} đơn #${orderIdShort}`,
                        category: 'order_payment',
                        created_by: staffName
                    });
                }
            }
            logAudit('Thu tiền bàn', `Bàn ${tableNum}, ${unpaidOrders.length} đơn`);
            showAdminToast(`Đã thu tiền ${unpaidOrders.length} đơn cho Bàn ${tableNum}`, 'success');
            fetchTablesStatus();
        } catch(e) {
            showAdminToast('Lỗi thanh toán: ' + e.message, 'error');
        }
    });

    // --- Clear Table button (deletes session → frees table for new customer) ---
    const clearBtn = document.getElementById('tableActionClearBtn');
    const newClearBtn = clearBtn.cloneNode(true);
    clearBtn.parentNode.replaceChild(newClearBtn, clearBtn);
    newClearBtn.style.display = 'flex';
    if (hasUnpaid) {
        newClearBtn.disabled = true;
        newClearBtn.title = 'Cần thu tiền tất cả đơn trước khi dọn bàn';
    } else {
        newClearBtn.disabled = false;
    }
    newClearBtn.addEventListener('click', async () => {
        tableActionsModalInstance.hide();
        const confirmed = await customConfirm(
            `Dọn Bàn ${tableNum}?\nPhiên hiện tại sẽ kết thúc. Khách quét QR lại sẽ bắt đầu phiên mới.`,
            'Dọn Bàn'
        );
        if (!confirmed) return;
        try {
            await supabase.from('table_sessions').delete().eq('table_number', tableNum.toString());
            logAudit('Dọn bàn', `Bàn ${tableNum}`);
            showAdminToast(`Bàn ${tableNum} đã dọn xong — sẵn sàng cho khách mới`, 'success');
            fetchTablesStatus();
        } catch(e) {
            showAdminToast('Lỗi dọn bàn: ' + e.message, 'error');
        }
    });

    // --- Print Bill button (consolidated) ---
    const billBtn = document.getElementById('tableActionBillBtn');
    const newBillBtn = billBtn.cloneNode(true);
    billBtn.parentNode.replaceChild(newBillBtn, billBtn);
    newBillBtn.style.display = 'flex';
    newBillBtn.addEventListener('click', () => {
        tableActionsModalInstance.hide();
        showConsolidatedBill(tableNum, tableOrders);
    });

    tableActionsModalInstance.show();
};


// ---- Consolidated Bill ----
function showConsolidatedBill(tableNum, orders) {
    const billModal = document.getElementById('tableBillModal');
    const billBody = document.getElementById('tableBillBody');

    let totalBill = 0;
    let totalDiscount = 0;
    let itemRows = '';

    orders.forEach((order, idx) => {
        const items = order.items || [];
        const orderTotal = order.total_price || 0;
        const discount = order.discount_amount || 0;
        totalBill += orderTotal;
        totalDiscount += discount;

        items.forEach(item => {
            itemRows += `
                <tr>
                    <td class="py-1">${escapeHTML(item.name)}</td>
                    <td class="py-1 text-center">${item.quantity}</td>
                    <td class="py-1 text-end">${(item.price * item.quantity).toLocaleString()}đ</td>
                </tr>`;
        });

        if (idx < orders.length - 1) {
            itemRows += `<tr><td colspan="3" class="py-0"><hr class="my-1 border-dashed"></td></tr>`;
        }
    });

    const now = new Date();
    const timeStr = now.toLocaleString('vi-VN');
    const storeName = document.getElementById('admin-store-name')?.textContent || 'Nohope Coffee';

    billBody.innerHTML = `
        <div class="text-center mb-3">
            <h5 class="fw-bold mb-1">${escapeHTML(storeName)}</h5>
            <small class="text-slate-500">${timeStr}</small>
        </div>
        <div class="mb-3 px-2">
            <div class="d-flex justify-content-between">
                <span class="fw-semibold">Bàn ${tableNum}</span>
                <span class="text-slate-500">${orders.length} đơn hàng</span>
            </div>
        </div>
        <table class="table table-sm mb-3">
            <thead>
                <tr class="border-bottom">
                    <th class="py-1 fw-semibold">Món</th>
                    <th class="py-1 fw-semibold text-center">SL</th>
                    <th class="py-1 fw-semibold text-end">Thành tiền</th>
                </tr>
            </thead>
            <tbody>${itemRows}</tbody>
        </table>
        <div class="border-top pt-2 px-2">
            ${totalDiscount > 0 ? `<div class="d-flex justify-content-between text-sm text-slate-500"><span>Giảm giá</span><span>-${totalDiscount.toLocaleString()}đ</span></div>` : ''}
            <div class="d-flex justify-content-between fw-bold fs-5 mt-1">
                <span>TỔNG CỘNG</span>
                <span class="text-[#b45309]">${totalBill.toLocaleString()}đ</span>
            </div>
        </div>
    `;

    bootstrap.Modal.getOrCreateInstance(billModal).show();
}

window.printConsolidatedBill = () => {
    const billContent = document.getElementById('tableBillBody').innerHTML;
    const win = window.open('', '_blank', 'width=400,height=600');
    win.document.write(`
        <html><head><title>Bill</title>
        <style>
            body { font-family: 'Courier New', monospace; font-size: 13px; padding: 10px; max-width: 350px; margin: 0 auto; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 2px 4px; }
            .text-center { text-align: center; }
            .text-end { text-align: right; }
            .fw-bold { font-weight: bold; }
            .fw-semibold { font-weight: 600; }
            .fs-5 { font-size: 1.1rem; }
            .d-flex { display: flex; }
            .justify-content-between { justify-content: space-between; }
            .border-top { border-top: 1px dashed #000; }
            .border-bottom { border-bottom: 1px solid #000; }
            .mb-1 { margin-bottom: 4px; }
            .mb-3 { margin-bottom: 12px; }
            .mt-1 { margin-top: 4px; }
            .pt-2 { padding-top: 8px; }
            .py-1 { padding: 2px 0; }
            hr { border: none; border-top: 1px dashed #999; }
            @media print { body { margin: 0; } }
        </style>
        </head><body>${billContent}
        <div style="text-align:center;margin-top:16px;font-size:11px;color:#888">Cảm ơn quý khách! ☕</div>
        </body></html>
    `);
    win.document.close();
    setTimeout(() => { win.print(); }, 300);
};

