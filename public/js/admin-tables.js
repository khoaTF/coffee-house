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
            .in('status', ['Pending', 'Preparing', 'Ready']);

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

            let statusConfig = { color: 'rgba(255,255,255,0.05)', icon: 'fa-chair', text: 'Trống', border: 'rgba(255,255,255,0.1)', pulse: false };
            if (isOccupied) {
                if (hasUnpaid) {
                    statusConfig = { color: 'rgba(231, 76, 60, 0.15)', icon: 'fa-money-bill-wave', text: 'Chưa TToán', border: '#e74c3c', pulse: true };
                } else {
                    statusConfig = { color: 'rgba(52, 152, 219, 0.15)', icon: 'fa-utensils', text: 'Đang làm/chờ món', border: '#3498db', pulse: false };
                }
            }

            const col = document.createElement('div');
            col.className = 'col-6 col-md-4 col-lg-3 mb-3';

            const card = document.createElement('div');
            card.className = `card h-100 text-center p-3 table-card ${statusConfig.pulse ? 'pulse-border' : ''}`;
            card.style.transition = 'all 0.3s';
            card.style.background = statusConfig.color;
            card.style.border = `1px solid ${statusConfig.border}`;
            card.style.cursor = isOccupied ? 'pointer' : 'default';

            if (isOccupied) {
                card.onclick = () => window.showTableActions(i, tableOrders);
            }

            const iconContainer = document.createElement('div');
            iconContainer.className = 'icon-container fs-1 mb-2';
            iconContainer.style.color = statusConfig.border;
            const icon = document.createElement('i');
            icon.className = `fa-solid ${statusConfig.icon}`;
            iconContainer.appendChild(icon);

            const idText = document.createElement('h5');
            idText.className = 'mb-1 table-id-text';
            idText.textContent = `Bàn ${i}`;
            idText.style.color = isOccupied ? '#fff' : 'rgba(255,255,255,0.5)';

            const statusText = document.createElement('small');
            statusText.className = 'status-text';
            statusText.style.color = statusConfig.border;
            statusText.textContent = statusConfig.text;

            card.append(iconContainer, idText, statusText);

            if (isOccupied) {
                const badgeContainer = document.createElement('div');
                badgeContainer.className = 'small mt-2';
                const badge = document.createElement('span');
                badge.className = hasUnpaid ? 'badge bg-danger' : 'badge bg-primary';
                badge.textContent = `${tableOrders.length} đơn hàng`;
                badgeContainer.appendChild(badge);
                card.appendChild(badgeContainer);
            }

            col.appendChild(card);
            grid.appendChild(col);
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
                await supabase.from('orders').update({ is_paid: true }).eq('id', ord._id);
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
