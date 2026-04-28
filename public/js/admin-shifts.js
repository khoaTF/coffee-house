/**
 * Quản lý Ca Làm Việc & Dòng Tiền (Shift & Cash Management)
 * Yêu cầu: window.supabase
 */

// State
window.currentShift = null;
let currentShift = null;

// Kiểm tra ca hiện tại
async function checkCurrentShift() {
    try {
        const tenantId = sessionStorage.getItem('tenant_id') || localStorage.getItem('tenant_id');
        if (!tenantId) return null;

        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('status', 'open')
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
            console.error('Error fetching current shift:', error);
            return null;
        }

        currentShift = data || null;
        window.currentShift = currentShift;
        updateShiftUI();
        return currentShift;
    } catch (e) {
        console.error('Exception checkCurrentShift:', e);
        return null;
    }
}

// Cập nhật giao diện theo trạng thái ca
function updateShiftUI() {
    const shiftIndicator = document.getElementById('shift-status-indicator');
    const toggleShiftBtn = document.getElementById('toggle-shift-btn-desktop');
    
    if (currentShift) {
        if (shiftIndicator) {
            shiftIndicator.innerHTML = `<span class="relative flex h-3 w-3 mr-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span> Đang trong ca`;
        }
        if (toggleShiftBtn) {
            toggleShiftBtn.innerHTML = `<i class="fa-solid fa-moon w-5 text-center"></i> Kết ca`;
            toggleShiftBtn.onclick = () => showCloseShiftModal();
        }
    } else {
        if (shiftIndicator) {
            shiftIndicator.innerHTML = `<span class="relative flex h-3 w-3 mr-2">
                <span class="relative inline-flex rounded-full h-3 w-3 bg-slate-400"></span>
            </span> Chưa mở ca`;
        }
        if (toggleShiftBtn) {
            toggleShiftBtn.innerHTML = `<i class="fa-solid fa-sun w-5 text-center text-amber-500"></i> Mở ca`;
            toggleShiftBtn.onclick = () => showOpenShiftModal();
        }
    }
}

// ==========================================
// MODAL QUẢN LÝ CA
// ==========================================

function showOpenShiftModal() {
    const staffName = sessionStorage.getItem('nohope_staff_name') || 'Nhân viên';
    
    const modalHtml = `
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" id="open-shift-modal">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate__animated animate__zoomIn animate__faster">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50">
                    <h3 class="text-xl font-bold text-amber-800 flex items-center gap-2">
                        <i class="fa-solid fa-sun"></i> Mở Ca Mới
                    </h3>
                    <button onclick="document.getElementById('open-shift-modal').remove()" class="text-slate-400 hover:text-slate-600">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Nhân viên nhận ca</label>
                        <input type="text" class="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600" value="${staffName}" disabled>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Số dư tiền mặt đầu ca (VNĐ) <span class="text-red-500">*</span></label>
                        <input type="number" id="shift-start-balance" class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" placeholder="VD: 500000" value="0">
                        <p class="text-xs text-slate-500 mt-1">Đếm kỹ tiền xu / tiền lẻ trong két trước khi nhận ca.</p>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Ghi chú (Tùy chọn)</label>
                        <textarea id="shift-open-notes" class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none" rows="2" placeholder="Tình trạng két, đồ dùng..."></textarea>
                    </div>
                    
                    <button onclick="submitOpenShift()" class="w-full py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2">
                        <i class="fa-solid fa-play"></i> Bắt đầu làm việc
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
}

async function submitOpenShift() {
    const startBalance = document.getElementById('shift-start-balance').value;
    const notes = document.getElementById('shift-open-notes').value;
    const tenantId = sessionStorage.getItem('tenant_id') || localStorage.getItem('tenant_id');
    const staffName = sessionStorage.getItem('nohope_staff_name') || 'Nhân viên';

    if (startBalance === '') {
        showAlert('Vui lòng nhập số dư đầu ca', 'warning');
        return;
    }

    try {
        const { data, error } = await supabase.rpc('open_shift', {
            p_tenant_id: tenantId,
            p_opened_by: staffName,
            p_start_balance: parseFloat(startBalance),
            p_notes: notes ? 'Mở ca: ' + notes : null
        });

        if (error) throw error;

        showAlert('Đã mở ca thành công!', 'success');
        document.getElementById('open-shift-modal').remove();
        
        // Ghi log
        if (window.logAdminAction) {
            logAdminAction('Mở ca', \`Số dư đầu: \${formatCurrency(startBalance)}\`);
        }

        await checkCurrentShift();

        // Refresh POS if we are on POS page
        if (window.location.pathname.includes('pos')) {
            window.location.reload();
        }
    } catch (e) {
        console.error('Error opening shift:', e);
        showAlert('Lỗi khi mở ca: ' + e.message, 'danger');
    }
}

async function showCloseShiftModal() {
    if (!currentShift) return showAlert('Chưa có ca nào đang mở!', 'warning');
    
    const staffName = sessionStorage.getItem('nohope_staff_name') || 'Nhân viên';
    
    // Fetch summary for this shift
    let cashIn = 0;
    let cashOut = 0;
    let cashRevenue = 0;

    try {
        // Fetch transactions
        const { data: txs } = await supabase.from('cash_transactions').select('amount, transaction_type').eq('shift_id', currentShift.id);
        if (txs) {
            cashIn = txs.filter(t => t.transaction_type === 'in').reduce((s, t) => s + parseFloat(t.amount), 0);
            cashOut = txs.filter(t => t.transaction_type === 'out').reduce((s, t) => s + parseFloat(t.amount), 0);
        }

        // Fetch revenue
        const { data: orders } = await supabase.from('orders')
            .select('total_price')
            .eq('tenant_id', currentShift.tenant_id)
            .eq('is_paid', true)
            .eq('payment_method', 'cash')
            .gte('created_at', currentShift.opened_at);
            
        if (orders) {
            cashRevenue = orders.reduce((s, o) => s + parseFloat(o.total_price), 0);
        }
    } catch (e) {
        console.error('Error calculating shift summary:', e);
    }

    const startBalance = parseFloat(currentShift.start_balance || 0);
    const expectedBalance = startBalance + cashIn - cashOut + cashRevenue;

    const modalHtml = \`
        <div class="fixed inset-0 bg-slate-900/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity" id="close-shift-modal">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden animate__animated animate__zoomIn animate__faster flex flex-col md:flex-row">
                <!-- Cột trái: Tóm tắt -->
                <div class="p-6 bg-slate-50 border-r border-slate-100 w-full md:w-1/2">
                    <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2 mb-6">
                        <i class="fa-solid fa-moon text-indigo-500"></i> Báo Cáo Két (Z-Read)
                    </h3>
                    
                    <div class="space-y-4 text-sm text-slate-600">
                        <div class="flex justify-between border-b border-slate-200 pb-2">
                            <span>Giờ mở ca:</span>
                            <span class="font-semibold text-slate-800">\${new Date(currentShift.opened_at).toLocaleString('vi-VN')}</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Số dư đầu ca:</span>
                            <span class="font-semibold text-slate-800">\${formatCurrency(startBalance)}</span>
                        </div>
                        <div class="flex justify-between text-emerald-600">
                            <span>Thu tiền mặt (Đơn hàng):</span>
                            <span class="font-semibold">+\${formatCurrency(cashRevenue)}</span>
                        </div>
                        <div class="flex justify-between text-blue-500">
                            <span>Nạp thêm tiền mặt:</span>
                            <span class="font-semibold">+\${formatCurrency(cashIn)}</span>
                        </div>
                        <div class="flex justify-between text-rose-500 border-b border-slate-200 pb-2">
                            <span>Chi tiêu tiền mặt:</span>
                            <span class="font-semibold">-\${formatCurrency(cashOut)}</span>
                        </div>
                        <div class="flex justify-between text-lg pt-2">
                            <span class="font-bold text-slate-800">Tiền mặt dự kiến:</span>
                            <span class="font-black text-indigo-600" id="expected-balance-display">\${formatCurrency(expectedBalance)}</span>
                        </div>
                    </div>
                </div>

                <!-- Cột phải: Nhập liệu -->
                <div class="p-6 w-full md:w-1/2 flex flex-col justify-center">
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Người chốt ca</label>
                        <input type="text" class="w-full px-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-slate-600" value="\${staffName}" disabled>
                    </div>
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Số tiền đếm được thực tế (VNĐ) <span class="text-red-500">*</span></label>
                        <input type="number" id="shift-end-actual" class="w-full px-4 py-3 text-lg font-bold border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-indigo-500 outline-none text-center" placeholder="Đếm tiền trong két và nhập vào đây">
                        <div id="balance-diff" class="text-center text-sm font-bold mt-2"></div>
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Ghi chú kết ca</label>
                        <textarea id="shift-close-notes" class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" rows="2" placeholder="Giải trình chênh lệch (nếu có)..."></textarea>
                    </div>
                    
                    <div class="flex gap-3">
                        <button onclick="document.getElementById('close-shift-modal').remove()" class="flex-1 py-3 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl font-bold transition-colors">
                            Hủy
                        </button>
                        <button onclick="submitCloseShift(\${expectedBalance})" class="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2">
                            <i class="fa-solid fa-check-double"></i> Chốt ca
                        </button>
                    </div>
                </div>
            </div>
        </div>
    \`;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Xử lý logic hiển thị chênh lệch
    const actualInput = document.getElementById('shift-end-actual');
    const diffDisplay = document.getElementById('balance-diff');
    actualInput.addEventListener('input', (e) => {
        const actual = parseFloat(e.target.value) || 0;
        const diff = actual - expectedBalance;
        if (diff === 0) {
            diffDisplay.innerHTML = '<span class="text-emerald-500"><i class="fa-solid fa-check-circle"></i> Khớp số tiền</span>';
        } else if (diff > 0) {
            diffDisplay.innerHTML = \`<span class="text-blue-500"><i class="fa-solid fa-arrow-trend-up"></i> Dư \${formatCurrency(diff)}</span>\`;
        } else {
            diffDisplay.innerHTML = \`<span class="text-rose-500"><i class="fa-solid fa-arrow-trend-down"></i> Thiếu \${formatCurrency(Math.abs(diff))}</span>\`;
        }
    });
}

async function submitCloseShift(expectedBalance) {
    const actualBalance = document.getElementById('shift-end-actual').value;
    const notes = document.getElementById('shift-close-notes').value;
    const tenantId = sessionStorage.getItem('tenant_id') || localStorage.getItem('tenant_id');
    const staffName = sessionStorage.getItem('nohope_staff_name') || 'Nhân viên';

    if (actualBalance === '') {
        showAlert('Vui lòng đếm và nhập số tiền thực tế', 'warning');
        return;
    }

    try {
        const { data, error } = await supabase.rpc('close_shift', {
            p_tenant_id: tenantId,
            p_shift_id: currentShift.id,
            p_closed_by: staffName,
            p_end_balance_actual: parseFloat(actualBalance),
            p_notes: notes ? 'Kết ca: ' + notes : null
        });

        if (error) throw error;

        showAlert('Đã kết ca thành công!', 'success');
        document.getElementById('close-shift-modal').remove();
        
        // Ghi log
        if (window.logAdminAction) {
            const diff = parseFloat(actualBalance) - expectedBalance;
            logAdminAction('Kết ca', \`Chênh lệch: \${diff !== 0 ? formatCurrency(diff) : '0đ'}\`);
        }

        currentShift = null;
        window.currentShift = null;
        updateShiftUI();

    } catch (e) {
        console.error('Error closing shift:', e);
        showAlert('Lỗi khi kết ca: ' + e.message, 'danger');
    }
}

// ==========================================
// THU / CHI TRONG CA
// ==========================================
window.showCashTransactionModal = function(type = 'out') {
    if (!window.currentShift) {
        showAlert('Vui lòng mở ca làm việc trước khi thực hiện thu/chi!', 'warning');
        return;
    }
    
    const isCashIn = type === 'in';
    const title = isCashIn ? 'Nạp Tiền Vào Két' : 'Chi Tiền Khỏi Két';
    const icon = isCashIn ? 'fa-arrow-down text-blue-500' : 'fa-arrow-up text-rose-500';
    const btnColor = isCashIn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-rose-600 hover:bg-rose-700';

    const modalHtml = `
        <div class="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4 transition-opacity" id="cash-tx-modal">
            <div class="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate__animated animate__zoomIn animate__faster">
                <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 class="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <i class="fa-solid ${icon}"></i> ${title}
                    </h3>
                    <button onclick="document.getElementById('cash-tx-modal').remove()" class="text-slate-400 hover:text-slate-600">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div class="p-6">
                    <div class="mb-4">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Số tiền (VNĐ) <span class="text-red-500">*</span></label>
                        <input type="number" id="cash-tx-amount" class="w-full px-4 py-3 text-lg font-bold border-2 border-slate-200 rounded-lg focus:ring-0 focus:border-slate-500 outline-none" placeholder="VD: 100000">
                    </div>
                    <div class="mb-6">
                        <label class="block text-sm font-semibold text-slate-700 mb-1">Lý do / Diễn giải <span class="text-red-500">*</span></label>
                        <textarea id="cash-tx-reason" class="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-500 focus:border-slate-500 outline-none" rows="2" placeholder="${isCashIn ? 'VD: Nạp thêm tiền lẻ...' : 'VD: Mua đá, mua ly...'}"></textarea>
                    </div>
                    
                    <button onclick="submitCashTransaction('${type}')" class="w-full py-3 ${btnColor} text-white rounded-xl font-bold transition-colors flex justify-center items-center gap-2">
                        <i class="fa-solid fa-check"></i> Xác nhận
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
};

window.submitCashTransaction = async function(type) {
    const amount = document.getElementById('cash-tx-amount').value;
    const reason = document.getElementById('cash-tx-reason').value;
    const tenantId = sessionStorage.getItem('tenant_id') || localStorage.getItem('tenant_id');
    const staffName = sessionStorage.getItem('nohope_staff_name') || 'Nhân viên';

    if (!amount || parseFloat(amount) <= 0) {
        showAlert('Vui lòng nhập số tiền hợp lệ', 'warning');
        return;
    }
    if (!reason.trim()) {
        showAlert('Vui lòng nhập lý do/diễn giải', 'warning');
        return;
    }

    try {
        const { error } = await supabase.from('cash_transactions').insert([{
            tenant_id: tenantId,
            shift_id: window.currentShift.id,
            transaction_type: type,
            amount: parseFloat(amount),
            reason: reason,
            created_by: staffName
        }]);

        if (error) throw error;

        showAlert('Đã ghi nhận giao dịch thành công!', 'success');
        document.getElementById('cash-tx-modal').remove();
        
        // Ghi log
        if (window.logAdminAction) {
            logAdminAction(type === 'in' ? 'Nạp tiền vào két' : 'Chi tiền từ két', `${formatCurrency(amount)} - ${reason}`);
        }
    } catch (e) {
        console.error('Error submitting cash transaction:', e);
        showAlert('Lỗi: ' + e.message, 'danger');
    }
}

// Function helper để format tiền tệ (nếu chưa có global)
function formatCurrency(amount) {
    if(isNaN(amount)) return '0đ';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount);
}

// Khởi chạy khi load
document.addEventListener('DOMContentLoaded', () => {
    // Đợi Supabase khởi tạo
    setTimeout(() => {
        if (window.supabase) {
            checkCurrentShift();
        }
    }, 1000);
});

// Expose to window
window.checkCurrentShift = checkCurrentShift;
window.showOpenShiftModal = showOpenShiftModal;
window.showCloseShiftModal = showCloseShiftModal;
