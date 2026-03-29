// =============================================
// ADMIN-MANAGEMENT — Staff, Customers, Promos, Audit, QR, Settings
// =============================================
// Dependencies: admin-core.js (staffList, customersList, discounts,
//               staffModalInstance, customerModalInstance, promoModalInstance,
//               customConfirm, logAudit, showAdminToast, supabase)

// --- Staff Management ---
function initStaffModal() {
    const el = document.getElementById('staffModal');
    if (el) staffModalInstance = new bootstrap.Modal(el);
}

document.addEventListener('DOMContentLoaded', () => {
    initStaffModal();
});

async function fetchStaff() {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;
    try {
        const { data, error } = await supabase.from('users').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        staffList = data || [];
        renderStaff(staffList);
    } catch (e) {
        console.error("Error fetching staff:", e);
        tbody.innerHTML = '<tr><td colspan="4" class="text-danger text-center">Lỗi tải dữ liệu nhân viên.</td></tr>';
    }
}

function renderStaff(data) {
    const tbody = document.getElementById('staff-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-muted text-center py-4">Chưa có nhân viên nào.</td></tr>';
        return;
    }

    const roleMap = {
        'admin': 'Quản trị viên (Admin)',
        'manager': 'Quản lý (Manager)',
        'kitchen': 'Nhân viên Bếp',
        'staff': 'Nhân viên Lễ Tân/Chạy bàn'
    };

    data.forEach(s => {
        const tr = document.createElement('tr');
        const roleLabel = roleMap[s.role] || s.role;
        const badgeClass = s.role === 'admin' ? 'bg-danger' : (s.role === 'manager' ? 'bg-warning' : 'bg-info');

        tr.innerHTML = `
            <td class="font-bold text-light"><i class="fa-solid fa-user me-2 text-muted"></i>${s.name}</td>
            <td><span class="badge ${badgeClass} text-dark rounded-xl px-2 py-1">${roleLabel}</span></td>
            <td class="font-mono text-warning font-bold tracking-widest">${s.pin || '---'}</td>
            <td class="text-end">
                <button class="action-btn text-info" title="Sửa" onclick="openStaffModal('${s.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn delete" title="Xóa" onclick="deleteStaff('${s.id}')"><i class="fa-solid fa-trash"></i></button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function togglePermissionsBlock() {
    const role = document.getElementById('staff-role').value;
    const block = document.getElementById('staff-permissions-block');
    if (role === 'admin') {
        block.style.display = 'none';
    } else {
        block.style.display = 'block';
    }
}

function openStaffModal(id = null) {
    document.getElementById('staff-form').reset();
    document.getElementById('staff-id').value = id || '';

    document.querySelectorAll('.perm-cb').forEach(cb => cb.checked = false);

    if (id) {
        const s = staffList.find(x => String(x.id) === String(id));
        if (s) {
            document.getElementById('staff-name').value = s.name || '';
            document.getElementById('staff-pin').value = s.pin || '';
            document.getElementById('staff-role').value = s.role || 'staff';
            document.getElementById('staffModalTitle').innerText = 'Sửa thông tin nhân viên';

            if (s.permissions && Array.isArray(s.permissions)) {
                s.permissions.forEach(p => {
                    const cb = document.querySelector(`.perm-cb[value="${p}"]`);
                    if (cb) cb.checked = true;
                });
            }
        }
    } else {
        document.getElementById('staffModalTitle').innerText = 'Thêm nhân viên mới';
    }
    if (!window.staffModalInstance) {
        window.staffModalInstance = new bootstrap.Modal(document.getElementById('staffModal'));
    }
    togglePermissionsBlock();
    window.staffModalInstance.show();
}

async function saveStaff() {
    const id = document.getElementById('staff-id').value;
    const name = document.getElementById('staff-name').value.trim();
    const pin = document.getElementById('staff-pin').value.trim();
    const role = document.getElementById('staff-role').value;

    if (!name || !pin) {
        alert("Vui lòng điền đầy đủ Tên và Mã PIN.");
        return;
    }
    if (!/^[0-9]{4,6}$/.test(pin)) {
        alert("Mã PIN phải từ 4 đến 6 chữ số.");
        return;
    }

    const permissions = [];
    if (role !== 'admin') {
        document.querySelectorAll('.perm-cb:checked').forEach(cb => {
            permissions.push(cb.value);
        });
    }

    const payload = { name, pin, role, permissions };

    try {
        if (id) {
            const { data, error } = await supabase.from('users').update(payload).eq('id', id).select();
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error("Không thể cập nhật dữ liệu. Có thể do lỗi phân quyền (RLS) hoặc nhân viên không tồn tại.");
            }
        } else {
            const { error } = await supabase.from('users').insert([payload]);
            if (error) throw error;
        }
        if (window.staffModalInstance) {
            window.staffModalInstance.hide();
        }
        fetchStaff();
    } catch (e) {
        console.error("Save staff error:", e);
        alert("Lỗi khi lưu thông tin nhân viên: " + (e.message || JSON.stringify(e)));
    }
}

async function deleteStaff(id) {
    const s = staffList.find(x => String(x.id) === String(id));
    const confirmed = await customConfirm(`Bạn có chắc chắn muốn xóa nhân viên ${s ? s.name : ''}?`, 'Xác nhận xóa');
    if (!confirmed) return;

    try {
        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) throw error;
        fetchStaff();
    } catch (e) {
        console.error("Delete staff error:", e);
        alert("Lỗi khi xóa nhân viên.");
    }
}

// --- Customer Management ---
async function fetchCustomers() {
    try {
        const { data, error } = await supabase.from('customers').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        customersList = data;
        renderCustomersTable();
    } catch (e) {
        console.error(e);
        document.getElementById('customers-table-body').innerHTML = '<tr><td colspan="6" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>';
    }
}

function renderCustomersTable(data = null) {
    const tbody = document.getElementById('customers-table-body');
    tbody.replaceChildren();
    const list = data !== null ? data : customersList;
    if (list.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Chưa có khách hàng nào.</td></tr>';
        return;
    }
    list.forEach(c => {
        const vipBadge = (c.total_spent || 0) >= 500000 ? '<span class="badge bg-warning text-dark ms-1"><i class="fa-solid fa-crown"></i> VIP</span>' : '';
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="fw-bold">${window.escapeHTML(c.phone || '')}</td>
            <td>${window.escapeHTML(c.name || '') || '<i>Khách vô danh</i>'}${vipBadge}</td>
            <td class="text-warning fw-bold"><i class="fa-solid fa-star"></i> ${c.current_points || 0}</td>
            <td class="text-success">${(c.total_spent || 0).toLocaleString('vi-VN')} đ</td>
            <td>${c.created_at ? new Date(c.created_at).toLocaleDateString() : 'N/A'}</td>
            <td class="text-end">
                <button class="action-btn edit-btn" title="Chỉnh sửa điểm" onclick="editCustomer('${window.escapeHTML(c.id || '')}')">
                    <i class="fa-solid fa-pen"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

window.filterCustomers = function(query) {
    if (!query || !query.trim()) {
        renderCustomersTable();
        return;
    }
    const q = query.trim().toLowerCase();
    const filtered = customersList.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.phone || '').toLowerCase().includes(q)
    );
    renderCustomersTable(filtered);
};


function editCustomer(id) {
    const c = customersList.find(x => String(x.id) === String(id));
    if (!c) return;
    document.getElementById('customerId').value = c.id;
    document.getElementById('customerName').value = c.name || '';
    document.getElementById('customerPhone').value = c.phone || '';
    document.getElementById('customerPoints').value = c.current_points || 0;
    customerModalInstance.show();
}

async function saveCustomer() {
    const id = document.getElementById('customerId').value;
    const points = parseInt(document.getElementById('customerPoints').value) || 0;
    try {
        const { error } = await supabase.from('customers').update({ current_points: points }).eq('id', id);
        if (error) throw error;
        logAudit('Sửa điểm KH', `ID: ${id}, Điểm cập nhật: ${points}`);
        customerModalInstance.hide();
        fetchCustomers();
    } catch (e) {
        console.error(e);
        alert('Lỗi cập nhật điểm khách hàng.');
    }
}

// --- Promo Management ---
async function fetchDiscounts() {
    const tbody = document.getElementById('promo-table-body');
    if (!tbody) return;
    try {
        const { data, error } = await supabase.from('discounts').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        discounts = data;
        renderDiscountsTable(data);
    } catch (e) {
        console.error(e);
        tbody.innerHTML = '<tr><td colspan="7" class="text-danger text-center">Lỗi tải dữ liệu.</td></tr>';
    }
}

function renderDiscountsTable(data) {
    const tbody = document.getElementById('promo-table-body');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-muted text-center py-4">Chưa có mã khuyến mãi nào.</td></tr>';
        return;
    }

    data.forEach(d => {
        const tr = document.createElement('tr');
        const isActive = d.active !== false;

        tr.innerHTML = `
            <td class="font-bold text-light">${d.code}</td>
            <td>${d.discount_type === 'PERCENT' ? 'Phần trăm' : 'Cố định'}</td>
            <td class="text-success">${d.discount_type === 'PERCENT' ? d.value + '%' : d.value.toLocaleString('vi-VN') + ' đ'}</td>
            <td>${d.usage_limit || 'Không giới hạn'}</td>
            <td>${d.used_count || 0}</td>
            <td><span class="badge ${isActive ? 'bg-success' : 'bg-danger'}">${isActive ? 'Hoạt động' : 'Đã ngưng'}</span></td>
            <td class="text-end">
                <button class="action-btn" title="Sửa" onclick="editPromo('${d.id}')"><i class="fa-solid fa-pen"></i></button>
                <button class="action-btn ${isActive ? 'delete' : 'text-success'}" title="${isActive ? 'Ngưng' : 'Bật lại'}" onclick="togglePromoStatus('${d.id}', ${isActive})">
                    <i class="fa-solid ${isActive ? 'fa-ban' : 'fa-check'}"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function openPromoModal() {
    document.getElementById('promoForm').reset();
    document.getElementById('promoId').value = '';
    promoModalInstance.show();
}

function editPromo(id) {
    const p = discounts.find(i => String(i.id) === String(id));
    if(!p) return;
    document.getElementById('promoId').value = p.id;
    document.getElementById('promoCode').value = p.code;
    document.getElementById('promoType').value = p.discount_type;
    document.getElementById('promoValue').value = p.value;
    document.getElementById('promoLimit').value = p.usage_limit || 0;
    promoModalInstance.show();
}

async function savePromo() {
    const id = document.getElementById('promoId').value;
    const data = {
        code: document.getElementById('promoCode').value.trim().toUpperCase(),
        discount_type: document.getElementById('promoType').value,
        value: parseFloat(document.getElementById('promoValue').value) || 0,
        usage_limit: parseInt(document.getElementById('promoLimit').value) || 0
    };

    if (!data.code || data.value <= 0) {
        alert("Vui lòng nhập mã và mức giảm hợp lệ.");
        return;
    }

    try {
        if (id) {
            const { error } = await supabase.from('discounts').update(data).eq('id', id);
            if(error) throw error;
            logAudit('Cập nhật mã KM', `Mã: ${data.code}`);
        } else {
            const { error } = await supabase.from('discounts').insert([data]);
            if(error) throw error;
            logAudit('Thêm mã KM mới', `Mã: ${data.code}`);
        }
        promoModalInstance.hide();
        fetchDiscounts();
    } catch (e) {
        console.error(e);
        alert("Lỗi khi lưu mã khuyến mãi.");
    }
}

async function togglePromoStatus(id, currentlyActive) {
    const conf = await customConfirm(`Bạn muốn ${currentlyActive ? 'ngưng' : 'bật lại'} mã này?`, "Xác nhận");
    if(!conf) return;
    try {
        const { error } = await supabase.from('discounts').update({ active: !currentlyActive }).eq('id', id);
        if(error) throw error;
        logAudit(currentlyActive ? 'Ngưng mã KM' : 'Bật mã KM', `ID: ${id}`);
        fetchDiscounts();
    } catch(e) {
        console.error(e);
        alert("Lỗi hệ thống.");
    }
}

// --- Audit Logs ---
async function fetchAuditLogs() {
    try {
        const { data, error } = await supabase.from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        renderAuditLogs(data);
    } catch (e) {
        console.error("Lỗi lấy nhật ký:", e);
        document.getElementById('audit-table-body').innerHTML = '<tr><td colspan="4" class="text-center text-danger">Lỗi tải dữ liệu.</td></tr>';
    }
}

function renderAuditLogs(logs) {
    const tbody = document.getElementById('audit-table-body');
    if (!tbody) return;
    tbody.replaceChildren();

    if (!logs || logs.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">Chưa có nhật ký hoạt động nào.</td></tr>';
        return;
    }

    logs.forEach(log => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${new Date(log.created_at).toLocaleString('vi-VN')}</td>
            <td><span class="badge bg-secondary">${window.escapeHTML(log.admin_identifier || '')}</span></td>
            <td class="font-bold text-info">${window.escapeHTML(log.action || '')}</td>
            <td class="text-end text-muted small">${window.escapeHTML(log.details || '')}</td>
        `;
        tbody.appendChild(tr);
    });
}

// --- QR Code Management ---
window.generateQRCodes = function() {
    const countInput = document.getElementById('qr-table-count');
    const count = parseInt(countInput.value);
    if (!count || isNaN(count) || count <= 0) {
        if(typeof showAdminToast === 'function') showAdminToast('Vui lòng nhập số lượng bàn hợp lệ.', 'error');
        else alert('Vui lòng nhập số lượng bàn hợp lệ.');
        return;
    }

    const printArea = document.getElementById('qr-print-area');
    printArea.innerHTML = '';

    const baseUrl = window.location.origin;

    for (let i = 1; i <= count; i++) {
        const tableUrl = `${baseUrl}/?table=${i}`;

        const wrapper = document.createElement('div');
        wrapper.className = 'qr-card bg-[#232018] border border-[#3A3528] rounded-2xl p-4 flex flex-col items-center justify-center text-center shadow-soft relative';

        const titleSpan = document.createElement('h5');
        titleSpan.className = 'text-[#C0A062] font-noto font-bold mb-3 text-lg';
        titleSpan.textContent = `Bàn ${i}`;

        const qrContainer = document.createElement('div');
        qrContainer.className = 'bg-white p-2 rounded-xl mb-3 flex justify-center w-full';

        new QRCode(qrContainer, {
            text: tableUrl,
            width: 128,
            height: 128,
            colorDark : "#000000",
            colorLight : "#ffffff",
            correctLevel : QRCode.CorrectLevel.H
        });

        const linkElem = document.createElement('a');
        linkElem.href = tableUrl;
        linkElem.target = '_blank';
        linkElem.className = 'text-[10px] text-[#A89F88] break-all truncate w-full hover:text-[#C0A062] transition-colors mt-2';
        linkElem.textContent = tableUrl;

        wrapper.appendChild(titleSpan);
        wrapper.appendChild(qrContainer);
        wrapper.appendChild(linkElem);

        printArea.appendChild(wrapper);
    }

    if(typeof showAdminToast === 'function') showAdminToast(`Đã tạo thành công ${count} mã QR!`, 'success');
};

// --- Store Settings ---
window.saveStoreSettings = async function(type) {
    let updates = {};
    if (type === 'general') {
        updates = {
            store_name: document.getElementById('setting-store-name').value,
            store_address: document.getElementById('setting-store-address').value,
            wifi_name: document.getElementById('setting-wifi-name').value,
            wifi_pass: document.getElementById('setting-wifi-pass').value,
            table_count: parseInt(document.getElementById('setting-table-count')?.value || '15') || 15
        };
    } else if (type === 'bank') {
        updates = {
            bank_id: document.getElementById('setting-bank-id').value,
            bank_acc: document.getElementById('setting-bank-acc').value,
            bank_name: document.getElementById('setting-bank-name').value
        };
    }

    try {
        if (typeof supabase !== 'undefined') {
            const { error } = await supabase.from('store_settings').upsert({ id: 1, ...updates });
            if (error && error.code !== '42P01') console.warn(error);
        }
    } catch (e) {
        console.warn('Supabase context missing or table missing, using localStorage');
    }

    const existing = JSON.parse(localStorage.getItem('store_settings') || '{}');
    const newSettings = { ...existing, ...updates };
    localStorage.setItem('store_settings', JSON.stringify(newSettings));

    if(typeof showAdminToast === 'function') showAdminToast(`Đã lưu thiết lập ${type === 'general' ? 'thông tin' : 'thanh toán'} thành công!`, 'success');
    else alert('Đã lưu cài đặt!');
};

window.loadStoreSettings = async function() {
    let settings = {};
    try {
        if (typeof supabase !== 'undefined') {
            const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
            if (data) settings = data;
            else throw new Error("No table");
        } else {
            throw new Error("No supabase client");
        }
    } catch(e) {
        settings = JSON.parse(localStorage.getItem('store_settings') || '{}');
    }

    if (document.getElementById('setting-store-name')) document.getElementById('setting-store-name').value = settings.store_name || '';
    if (document.getElementById('setting-store-address')) document.getElementById('setting-store-address').value = settings.store_address || '';
    if (document.getElementById('setting-wifi-name')) document.getElementById('setting-wifi-name').value = settings.wifi_name || '';
    if (document.getElementById('setting-wifi-pass')) document.getElementById('setting-wifi-pass').value = settings.wifi_pass || '';
    if (document.getElementById('setting-bank-id')) document.getElementById('setting-bank-id').value = settings.bank_id || '';
    if (document.getElementById('setting-bank-acc')) document.getElementById('setting-bank-acc').value = settings.bank_acc || '';
    if (document.getElementById('setting-bank-name')) document.getElementById('setting-bank-name').value = settings.bank_name || '';
    if (document.getElementById('setting-table-count')) document.getElementById('setting-table-count').value = settings.table_count || 15;
};
