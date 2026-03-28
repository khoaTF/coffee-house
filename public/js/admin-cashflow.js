// =============================================
// ADMIN-CASHFLOW — Cash Book (Sổ Quỹ) Management
// =============================================
// Dependencies: admin-core.js (supabase, logAudit, showAdminToast)
//               admin-orders.js (exportToCSV)

let cashTransactions = [];
let cashflowFilter = '30days';
let cashflowModalInstance;

function openCreateCashflowModal() {
    if (!cashflowModalInstance) {
        cashflowModalInstance = new bootstrap.Modal(document.getElementById('createCashflowModal'));
    }
    document.getElementById('createCashflowForm').reset();
    document.getElementById('cfTypeExpense').checked = true;
    cashflowModalInstance.show();
}

async function saveCashTransaction() {
    const amountInput = document.getElementById('cfAmount').value;
    const descInput = document.getElementById('cfDescription').value;
    const type = document.querySelector('input[name="cfType"]:checked').value;

    if (!amountInput || amountInput <= 0) {
        alert('Vui lòng nhập số tiền hợp lệ lớn hơn 0.');
        return;
    }
    if (!descInput.trim()) {
        alert('Vui lòng nhập diễn giải.');
        return;
    }

    try {
        const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Admin';
        const { error } = await supabase.from('cash_transactions').insert([{
            type: type,
            amount: parseFloat(amountInput),
            category: 'manual',
            description: descInput.trim(),
            created_by: staffName
        }]);

        if (error) throw error;

        cashflowModalInstance.hide();
        fetchCashflowData();

        if (typeof showNotification === 'function') {
            showNotification('Tạo phiếu thành công!', 'success');
        } else {
            alert('Tạo phiếu thành công!');
        }
    } catch (e) {
        console.error(e);
        alert('Lỗi khi lưu giao dịch sổ quỹ: ' + e.message);
    }
}

function setCashflowFilter(filter) {
    cashflowFilter = filter;
    document.querySelectorAll('.history-filter-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`cf-${filter}`).classList.add('active');
    fetchCashflowData();
}

async function fetchCashflowData() {
    let startDate = new Date();
    startDate.setHours(0,0,0,0);
    const endDate = new Date();
    endDate.setHours(23,59,59,999);

    if (cashflowFilter === 'today') {
        // already set
    } else if (cashflowFilter === 'yesterday') {
        startDate.setDate(startDate.getDate() - 1);
        endDate.setDate(endDate.getDate() - 1);
        endDate.setHours(23,59,59,999);
    } else if (cashflowFilter === '7days') {
        startDate.setDate(startDate.getDate() - 6);
    } else if (cashflowFilter === '30days') {
        startDate.setDate(startDate.getDate() - 29);
    } else if (cashflowFilter === 'all') {
        startDate = new Date('2020-01-01');
    }

    const startISO = startDate.toISOString();
    const endISO = endDate.toISOString();

    const tbody = document.getElementById('cashflow-table-body');
    if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-[#A89F88]"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải dữ liệu...</td></tr>`;

    try {
        const { data: manualData, error: manualErr } = await supabase
            .from('cash_transactions')
            .select('*')
            .gte('created_at', startISO)
            .lte('created_at', endISO)
            .order('created_at', { ascending: false });

        if (manualErr) throw manualErr;

        const { data: ordersData, error: ordersErr } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'completed')
            .gte('created_at', startISO)
            .lte('created_at', endISO);

        if (ordersErr) throw ordersErr;

        const { data: restockData, error: restockErr } = await supabase
            .from('inventory_logs')
            .select('*, ingredients(name, unit)')
            .eq('change_type', 'restock')
            .gte('created_at', startISO)
            .lte('created_at', endISO);

        if (restockErr) throw restockErr;

        let combinedData = [];

        manualData.forEach(d => {
            combinedData.push({
                type: d.type === 'income' ? 'income' : 'expense',
                source: 'manual',
                amount: parseFloat(d.amount),
                desc: d.description || 'Phiếu thu/chi thủ công',
                refId: '#M_' + d.id.substring(0,6).toUpperCase(),
                createdAt: new Date(d.created_at)
            });
        });

        ordersData.forEach(o => {
            combinedData.push({
                type: 'income',
                source: 'order',
                amount: parseFloat(o.total_amount),
                desc: `Doanh thu đơn hàng (Tự động)`,
                refId: '#O_' + o.id.toString(),
                createdAt: new Date(o.created_at)
            });
        });

        restockData.forEach(r => {
            const cost = parseFloat(r.unit_price || 0) * parseFloat(r.amount || 0);
            const ingName = r.ingredients ? r.ingredients.name : 'Hàng hóa';
            combinedData.push({
                type: 'expense',
                source: 'restock',
                amount: cost,
                desc: `Nhập nguyên liệu: ${ingName}`,
                refId: '#R_' + (r.id ? r.id.toString() : '...'),
                createdAt: new Date(r.created_at)
            });
        });

        combinedData.sort((a,b) => b.createdAt - a.createdAt);

        cashTransactions = combinedData;

        renderCashflowKPI(combinedData);
        renderCashflowTable(combinedData);

        const searchInput = document.getElementById('cashflow-search-input');
        if (searchInput) {
            searchInput.oninput = (e) => {
                const term = e.target.value.toLowerCase();
                if (!term) return renderCashflowTable(cashTransactions);
                const filtered = cashTransactions.filter(item =>
                    item.desc.toLowerCase().includes(term) ||
                    item.refId.toLowerCase().includes(term)
                );
                renderCashflowTable(filtered);
            };
        }

    } catch (e) {
        console.error(e);
        if(tbody) tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger py-4">Lỗi: ${e.message}</td></tr>`;
    }
}

function renderCashflowKPI(data) {
    let totalIncome = 0;
    let totalExpense = 0;

    data.forEach(item => {
        if (item.type === 'income') totalIncome += item.amount;
        else if (item.type === 'expense') totalExpense += item.amount;
    });

    const netProfit = totalIncome - totalExpense;
    let profitColor = netProfit >= 0 ? 'text-success' : 'text-danger';
    let profitIcon = netProfit >= 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down';

    const kpiContainer = document.getElementById('cashflow-kpi-container');
    if (!kpiContainer) return;

    kpiContainer.innerHTML = `
        <div class="card bg-[#232018] border border-[#3A3528] rounded-2xl p-4 shadow-soft relative overflow-hidden">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h6 class="text-[#A89F88] font-semibold text-sm mb-1">Tổng Thu</h6>
                    <h3 class="font-noto font-bold text-success text-2xl mb-0">${totalIncome.toLocaleString()}đ</h3>
                </div>
                <div class="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                    <i class="fa-solid fa-arrow-down text-success"></i>
                </div>
            </div>
            <p class="text-xs text-[#A89F88] mb-0 mt-2">Bao gồm Cả Đơn Hàng</p>
        </div>

        <div class="card bg-[#232018] border border-[#3A3528] rounded-2xl p-4 shadow-soft relative overflow-hidden">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h6 class="text-[#A89F88] font-semibold text-sm mb-1">Tổng Chi</h6>
                    <h3 class="font-noto font-bold text-danger text-2xl mb-0">${totalExpense.toLocaleString()}đ</h3>
                </div>
                <div class="w-10 h-10 rounded-xl bg-danger/10 flex items-center justify-center">
                    <i class="fa-solid fa-arrow-up text-danger"></i>
                </div>
            </div>
            <p class="text-xs text-[#A89F88] mb-0 mt-2">Bao gồm phiếu nhập hàng</p>
        </div>

        <div class="card bg-[#232018] border border-[#3A3528] rounded-2xl p-4 shadow-soft relative overflow-hidden">
            <div class="flex justify-between items-start mb-2">
                <div>
                    <h6 class="text-[#A89F88] font-semibold text-sm mb-1">Thực Thu (Lợi Nhuận)</h6>
                    <h3 class="font-noto font-bold ${profitColor} text-2xl mb-0">${netProfit.toLocaleString()}đ</h3>
                </div>
                <div class="w-10 h-10 rounded-xl ${netProfit >= 0 ? 'bg-success/10' : 'bg-danger/10'} flex items-center justify-center">
                    <i class="fa-solid ${profitIcon} ${profitColor}"></i>
                </div>
            </div>
            <p class="text-xs text-[#A89F88] mb-0 mt-2">Đã trừ mọi khoản chi</p>
        </div>
    `;
}

function renderCashflowTable(data) {
    const tbody = document.getElementById('cashflow-table-body');
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center py-6 text-[#A89F88]">Không có giao dịch nào trong thời gian này</td></tr>`;
        return;
    }

    let html = '';
    data.forEach(item => {
        const dateStr = item.createdAt.toLocaleString('vi-VN');
        const badgeClass = item.type === 'income' ? 'bg-success/20 text-success' : 'bg-danger/20 text-danger';
        const typeText = item.type === 'income' ? 'Thu' : 'Chi';
        const sign = item.type === 'income' ? '+' : '-';
        const srcIcon = item.source === 'order' ? '<i class="fa-solid fa-receipt me-1"></i>' : (item.source === 'restock' ? '<i class="fa-solid fa-box-open me-1"></i>' : '<i class="fa-solid fa-pen-to-square me-1"></i>');

        html += `
            <tr class="hover:bg-[#3A3528]/30 transition-colors border-b border-[#3A3528]">
                <td class="py-3 px-4"><div class="text-[#E8DCC4]">${dateStr}</div></td>
                <td class="py-3 px-4 text-[#C0A062] font-mono text-sm">${item.refId}</td>
                <td class="py-3 px-4"><span class="badge ${badgeClass} border-0 rounded-lg px-2 py-1">${srcIcon}${typeText}</span></td>
                <td class="py-3 px-4 text-[#A89F88]">${item.desc}</td>
                <td class="py-3 px-4 text-end font-bold text-[#E8DCC4]">${sign}${item.amount.toLocaleString()}đ</td>
            </tr>
        `;
    });
    tbody.innerHTML = html;
}

// --- Export Cashflow CSV ---
window.exportCashflow = function() {
    const columns = [
        { key: 'date', label: 'Ngày' },
        { key: 'refId', label: 'Mã Tham Chiếu' },
        { key: 'type', label: 'Loại' },
        { key: 'desc', label: 'Mô Tả' },
        { key: 'amount', label: 'Số Tiền (VNĐ)' }
    ];

    const rows = (cashTransactions || []).map(item => ({
        date: item.createdAt.toLocaleString('vi-VN'),
        refId: item.refId || '',
        type: item.type === 'income' ? 'Thu' : 'Chi',
        desc: item.desc || '',
        amount: item.type === 'income' ? item.amount : -item.amount
    }));

    const dateStr = new Date().toISOString().split('T')[0];
    exportToCSV(rows, columns, `so_quy_${dateStr}.csv`);
};
