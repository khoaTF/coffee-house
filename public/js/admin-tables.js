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
    let tableActionsModalInstance = bootstrap.Modal.getOrCreateInstance(document.getElementById('tableActionsModal'));

    document.getElementById('tableActionsInfo').textContent =
        `Bàn ${tableNum} có ${tableOrders.length} đơn hàng.${hasUnpaid ? ` (${tableOrders.filter(o => !o.is_paid).length} chưa thanh toán)` : ' (Đã thanh toán)'}`;

    const payBtn = document.getElementById('tableActionPayBtn');
    payBtn.style.display = hasUnpaid ? 'flex' : 'none';

    const transferForm = document.getElementById('tableTransferForm');
    transferForm.style.display = 'none';
    document.getElementById('tableNewNumberInput').value = '';

    // Wire up Transfer button
    const transferBtn = document.getElementById('tableActionTransferBtn');
    const newTransferBtn = transferBtn.cloneNode(true);
    transferBtn.parentNode.replaceChild(newTransferBtn, transferBtn);
    newTransferBtn.addEventListener('click', () => {
        transferForm.style.display = 'block';
        document.getElementById('tableNewNumberInput').focus();
    });

    // Wire up Transfer Confirm button
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

    // Wire up Pay button
    const newPayBtn = payBtn.cloneNode(true);
    payBtn.parentNode.replaceChild(newPayBtn, payBtn);
    newPayBtn.style.display = hasUnpaid ? 'flex' : 'none';
    newPayBtn.addEventListener('click', async () => {
        tableActionsModalInstance.hide();
        const confirmed = await customConfirm(
            `Xác nhận đã thu tiền cho toàn bộ đơn của Bàn ${tableNum}?\n(Sau khi thu, bàn sẽ được dọn để khách mới có thể quét mã)`,
            'Xác nhận Thanh Toán'
        );
        if (!confirmed) return;
        try {
            const unpaidOrders = tableOrders.filter(o => !o.is_paid);
            for (const ord of unpaidOrders) {
                await supabase.from('orders').update({ is_paid: true, payment_status: 'paid' }).eq('id', ord._id);
                
                // --- Ghi lại Sổ Quỹ ---
                const amount = ord.total_price || ord.totalPrice || 0;
                if (amount > 0) {
                    const orderIdShort = String(ord._id).substring(0, 8);
                    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Admin';
                    const { error: txErr } = await supabase.from('cash_transactions').insert({
                        type: 'income',
                        amount: amount,
                        description: `Thu tiền bàn ${tableNum} đơn #${orderIdShort}`,
                        category: 'order_payment',
                        created_by: staffName
                    });
                    if (txErr) console.warn('Lỗi ghi sổ quỹ:', txErr.message);
                }
            }
            await supabase.from('table_sessions').delete().eq('table_number', tableNum.toString());
            logAudit('Thanh toán bàn', `Bàn ${tableNum}, ${unpaidOrders.length} đơn`);
            fetchTablesStatus();
        } catch(e) {
            showAdminToast('Lỗi thanh toán: ' + e.message, 'error');
        }
    });

    tableActionsModalInstance.show();
};
