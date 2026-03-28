let currentShift = null;

document.addEventListener('DOMContentLoaded', () => {
    checkCurrentShift();
});

async function checkCurrentShift() {
    try {
        const { data, error } = await supabase
            .from('shifts')
            .select('*')
            .eq('status', 'open')
            .order('opened_at', { ascending: false })
            .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
            currentShift = data[0];
            updateShiftUI(true, currentShift.opened_by, new Date(currentShift.opened_at));
        } else {
            currentShift = null;
            updateShiftUI(false);
        }
    } catch (err) {
        console.error('Lỗi khi kiểm tra ca:', err);
        updateShiftUI(false);
    }
}

function updateShiftUI(isOpen, openedBy = '', openedAt = null) {
    const shiftBadge = document.getElementById('shift-status-badge');
    
    if (shiftBadge) {
        if (isOpen) {
            shiftBadge.className = 'badge bg-[#C0A062]/20 text-[#C0A062] px-2 py-1 rounded-md text-[10px] font-bold tracking-wider';
            shiftBadge.innerHTML = `<i class="fa-solid fa-lock-open me-1"></i>CA: ${window.escapeHTML(openedBy)}`;
        } else {
            shiftBadge.className = 'badge bg-[#3A3528] text-[#A89F88] px-2 py-1 rounded-md text-[10px] font-bold tracking-wider';
            shiftBadge.innerHTML = `<i class="fa-solid fa-lock me-1"></i>CHƯA MỞ CA`;
        }
    }

    // This specifically targets the sidebar button
    const toggleBtnDesktop = document.getElementById('toggle-shift-btn-desktop');
    if (toggleBtnDesktop) {
        updateSidebarShiftButton(toggleBtnDesktop, isOpen);
    }
    
    const toggleBtnMobile = document.getElementById('toggle-shift-btn-mobile');
    if (toggleBtnMobile) {
        updateSidebarShiftButton(toggleBtnMobile, isOpen);
    }
}

function updateSidebarShiftButton(btn, isOpen) {
    if (isOpen) {
        btn.innerHTML = `<i class="fa-solid fa-moon w-5 text-center"></i> Kết ca`;
        btn.className = 'nav-link bg-red-400/10 text-red-400 border-0 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-red-400/20';
        btn.onclick = () => { openCloseShiftModal(); if(typeof closeSidebarMobile === 'function') closeSidebarMobile(); };
    } else {
        btn.innerHTML = `<i class="fa-solid fa-sun w-5 text-center"></i> Mở ca`;
        btn.className = 'nav-link bg-green-400/10 text-green-400 border-0 w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-200 hover:bg-green-400/20';
        btn.onclick = () => { openStartShiftModal(); if(typeof closeSidebarMobile === 'function') closeSidebarMobile(); };
    }
}

function openStartShiftModal() {
    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Nhân viên';
    
    const html = `
        <div class="mb-3">
            <label class="form-label text-[#A89F88] text-xs uppercase font-bold mb-1">Người mở ca</label>
            <input type="text" class="form-control bg-[#1A1814] border-[#3A3528] text-[#E8DCC4] rounded-xl" value="${staffName}" disabled>
        </div>
        <div class="mb-3">
            <label class="form-label text-[#A89F88] text-xs uppercase font-bold mb-1">Số dư đầu ca (Tiền mặt tại quầy)</label>
            <div class="input-group">
                <input type="number" id="shift-start-balance" class="form-control bg-[#1A1814] border-[#3A3528] text-[#E8DCC4] rounded-xl focus:border-[#C0A062] border-end-0" value="0" min="0" step="1000">
                <span class="input-group-text bg-[#1A1814] border-[#3A3528] text-[#A89F88] rounded-xl font-bold">VNĐ</span>
            </div>
        </div>
        <div class="mb-3">
            <label class="form-label text-[#A89F88] text-xs uppercase font-bold mb-1">Ghi chú thêm (Nếu có)</label>
            <textarea id="shift-start-notes" class="form-control bg-[#1A1814] border-[#3A3528] text-[#E8DCC4] rounded-xl focus:border-[#C0A062]" rows="2" placeholder="Tình trạng quầy, tiền lẻ..."></textarea>
        </div>
    `;

    document.getElementById('shiftActionModalLabel').innerText = 'Bắt đầu ca mới';
    document.getElementById('shiftActionModalBody').innerHTML = html;
    
    const submitBtn = document.getElementById('shiftActionSubmitBtn');
    submitBtn.innerText = 'Xác nhận Bắt đầu';
    submitBtn.className = 'btn rounded-xl font-bold py-2 px-4 shadow-soft text-[#1A1814]';
    submitBtn.style.backgroundColor = '#C0A062';
    submitBtn.style.cssText += 'color: #1A1814 !important; border: none;';
    submitBtn.onclick = submitStartShift;

    const modal = new bootstrap.Modal(document.getElementById('shiftActionModal'));
    modal.show();
}

async function submitStartShift() {
    const btn = document.getElementById('shiftActionSubmitBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang mở...';

    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Nhân viên';
    const startBalance = parseFloat(document.getElementById('shift-start-balance').value) || 0;
    const notes = document.getElementById('shift-start-notes').value.trim();

    try {
        const { data, error } = await supabase
            .from('shifts')
            .insert([{
                opened_by: staffName,
                start_balance: startBalance,
                notes: notes,
                status: 'open'
            }])
            .select()
            .single();

        if (error) throw error;

        currentShift = data;
        updateShiftUI(true, data.opened_by, new Date(data.opened_at));
        
        bootstrap.Modal.getInstance(document.getElementById('shiftActionModal')).hide();
        showAlert('Đã mở ca làm việc!', 'success');
        
    } catch (err) {
        console.error('Lỗi khi mở ca:', err);
        showAlert('Lỗi: ' + err.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Xác nhận Bắt đầu';
    }
}

async function openCloseShiftModal() {
    if (!currentShift) return;

    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('*')
            .eq('status', 'Completed')
            .gte('created_at', currentShift.opened_at);

        if (error) throw error;

        const totalRevenue = orders.reduce((s, o) => s + (o.total_price || 0), 0);
        const cashRevenue = orders.filter(o => o.payment_method !== 'transfer').reduce((s, o) => s + (o.total_price || 0), 0);
        const transferRevenue = orders.filter(o => o.payment_method === 'transfer').reduce((s, o) => s + (o.total_price || 0), 0);
        
        const expectedEndBalance = currentShift.start_balance + cashRevenue;

        const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Nhân viên';
        const startStr = new Date(currentShift.opened_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});

        const html = `
            <div class="row g-3 text-sm mb-4">
                <div class="col-6">
                    <div class="p-3 bg-[#1A1814] rounded-xl border border-[#3A3528] text-center h-100 flex flex-col justify-center">
                        <span class="text-[#A89F88] block mb-1 text-xs uppercase font-bold">Giờ vào</span>
                        <strong class="text-[#E8DCC4] text-lg">${startStr}</strong>
                    </div>
                </div>
                <div class="col-6">
                    <div class="p-3 bg-[#1A1814] rounded-xl border border-[#3A3528] text-center h-100 flex flex-col justify-center">
                        <span class="text-[#A89F88] block mb-1 text-xs uppercase font-bold">Người ca trước</span>
                        <strong class="text-[#C0A062] text-sm">${window.escapeHTML(currentShift.opened_by)}</strong>
                    </div>
                </div>
            </div>

            <div class="bg-[#1A1814] p-4 rounded-xl border border-[#3A3528] mb-4 text-sm shadow-inner">
                <div class="d-flex justify-content-between mb-3 border-b border-[#3A3528] pb-2">
                    <span class="text-[#A89F88]">Sẵn có đầu ca:</span>
                    <strong class="text-[#E8DCC4]">${currentShift.start_balance.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div class="d-flex justify-content-between mb-2">
                    <span class="text-[#A89F88]">Thu tiền mặt (Đơn):</span>
                    <strong class="text-green-400">+ ${cashRevenue.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div class="d-flex justify-content-between mb-3 border-b border-[#3A3528] pb-3">
                    <span class="text-[#A89F88]">Thu chuyển khoản:</span>
                    <strong class="text-blue-400">+ ${transferRevenue.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div class="d-flex justify-content-between mt-3 mb-1">
                    <span class="text-[#A89F88] text-xs uppercase font-bold">Doanh thu ca:</span>
                    <strong class="text-[#D4AF37] text-lg">${totalRevenue.toLocaleString('vi-VN')} đ</strong>
                </div>
                <div class="d-flex justify-content-between mt-3 pt-3 border-t border-[#3A3528]">
                    <span class="text-[#E8DCC4] font-bold">Tiền mặt dự kiến tại két:</span>
                    <strong class="text-warning text-xl">${expectedEndBalance.toLocaleString('vi-VN')} đ</strong>
                </div>
            </div>

            <div class="mb-4 bg-[#232018] p-3 rounded-xl border border-[#3A3528]">
                <label class="form-label text-[#E8DCC4] text-sm font-bold mb-2">Nhập thực tế kiểm được <span class="text-danger">*</span></label>
                <div class="input-group input-group-lg">
                    <input type="number" id="shift-end-actual" class="form-control bg-[#1A1814] border-[#3A3528] text-2xl font-black text-[#D4AF37] text-center rounded-xl border-end-0 focus:border-[#C0A062]" value="${expectedEndBalance}" min="0" step="1000">
                    <span class="input-group-text bg-[#1A1814] border-[#3A3528] text-[#A89F88] rounded-xl font-bold">VNĐ</span>
                </div>
                <div id="shift-diff-notice" class="mt-2 text-sm text-center font-semibold"></div>
            </div>

            <div class="mb-3">
                <label class="form-label text-[#A89F88] text-xs uppercase font-bold mb-1">Người nhận bàn giao</label>
                <input type="text" id="shift-closed-by" class="form-control bg-[#1A1814] border-[#3A3528] text-[#E8DCC4] rounded-xl mb-3" value="${staffName}">
                
                <label class="form-label text-[#A89F88] text-xs uppercase font-bold mb-1">Giải trình (chênh lệch/sự cố)</label>
                <textarea id="shift-end-notes" class="form-control bg-[#1A1814] border-[#3A3528] text-[#E8DCC4] rounded-xl focus:border-[#C0A062]" rows="2" placeholder="Lý do lệch tiền..."></textarea>
            </div>
            
            <input type="hidden" id="shift-total-revenue" value="${totalRevenue}">
            <input type="hidden" id="shift-expected-balance" value="${expectedEndBalance}">
        `;

        document.getElementById('shiftActionModalLabel').innerText = 'Kết Thúc Ca Làm Việc';
        document.getElementById('shiftActionModalBody').innerHTML = html;
        
        document.getElementById('shift-end-actual').addEventListener('input', function() {
            const actual = parseFloat(this.value) || 0;
            const diff = actual - expectedEndBalance;
            const diffNotice = document.getElementById('shift-diff-notice');
            if (diff === 0) {
                diffNotice.innerHTML = '<span class="text-success"><i class="fa-solid fa-check-circle me-1"></i>Két khớp chuẩn</span>';
            } else if (diff > 0) {
                diffNotice.innerHTML = `<span class="text-success"><i class="fa-solid fa-arrow-up me-1"></i>Dư ${diff.toLocaleString('vi-VN')} đ</span>`;
            } else {
                diffNotice.innerHTML = `<span class="text-danger"><i class="fa-solid fa-arrow-down me-1"></i>Hụt ${Math.abs(diff).toLocaleString('vi-VN')} đ (Bắt buộc giải trình)</span>`;
            }
        });

        document.getElementById('shift-end-actual').dispatchEvent(new Event('input'));

        const submitBtn = document.getElementById('shiftActionSubmitBtn');
        submitBtn.innerText = 'Xác nhận Kết ca';
        submitBtn.className = 'btn btn-danger rounded-xl font-bold py-2 px-4 shadow-soft';
        submitBtn.style.cssText = ''; 
        submitBtn.onclick = submitCloseShift;

        const modal = new bootstrap.Modal(document.getElementById('shiftActionModal'));
        modal.show();

    } catch (err) {
        console.error('Lỗi tính toán doanh thu:', err);
        showAlert('Không thể tải dữ liệu ca', 'danger');
    }
}

async function submitCloseShift() {
    const btn = document.getElementById('shiftActionSubmitBtn');
    
    const actualBalance = parseFloat(document.getElementById('shift-end-actual').value) || 0;
    const expectedBalance = parseFloat(document.getElementById('shift-expected-balance').value) || 0;
    const notes = document.getElementById('shift-end-notes').value.trim();
    
    if (actualBalance !== expectedBalance && notes === '') {
        showAlert('Vui lòng điền lý do giải trình khi có chênh lệch két', 'warning');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang đóng...';

    const totalRevenue = parseFloat(document.getElementById('shift-total-revenue').value) || 0;
    const closedBy = document.getElementById('shift-closed-by').value.trim();

    try {
        const { error } = await supabase
            .from('shifts')
            .update({
                end_balance_expected: expectedBalance,
                end_balance_actual: actualBalance,
                total_revenue: totalRevenue,
                closed_at: new Date().toISOString(),
                status: 'closed',
                closed_by: closedBy,
                notes: notes
            })
            .eq('id', currentShift.id);

        if (error) throw error;

        currentShift = null;
        updateShiftUI(false);
        
        bootstrap.Modal.getInstance(document.getElementById('shiftActionModal')).hide();
        showAlert('Đã kết thúc ca làm việc!', 'success');
        
    } catch (err) {
        console.error('Lỗi khi đóng ca:', err);
        showAlert('Lỗi: ' + err.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerText = 'Xác nhận Kết ca';
    }
}
