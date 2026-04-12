// =============================================
// ADMIN-DELIVERY.JS — Delivery Management Module
// =============================================

let deliveryOrders = [];
let deliveryDrivers = [];
let deliveryRealtimeChannel = null;

// --- Init ---
function initDeliveryModule() {
    const container = document.getElementById('delivery-tab-content');
    if (!container) return;

    container.innerHTML = buildDeliveryTabHTML();
    loadDeliveryOrders();
    loadDeliveryDrivers();
    setupDeliveryRealtime();
}

// --- Build HTML ---
function buildDeliveryTabHTML() {
    return `
    <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
            <h2 class="font-noto text-2xl font-bold text-slate-900 mb-1 flex items-center gap-2">
                <i class="fa-solid fa-motorcycle text-orange-500"></i> Quản lý Giao hàng
            </h2>
            <p class="text-sm text-slate-500 mb-0">Theo dõi đơn giao hàng, quản lý shipper và cấu hình phí ship.</p>
        </div>
        <div class="flex gap-2">
            <button class="btn btn-outline-secondary btn-sm rounded-xl font-semibold" onclick="switchDeliverySubTab('drivers')">
                <i class="fa-solid fa-id-card me-1"></i> Shipper
            </button>
            <button class="btn btn-outline-secondary btn-sm rounded-xl font-semibold" onclick="switchDeliverySubTab('settings')">
                <i class="fa-solid fa-sliders me-1"></i> Cài đặt Ship
            </button>
        </div>
    </div>

    <!-- KPI Cards -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6" id="delivery-kpi">
        <div class="card bg-white border border-slate-200 rounded-2xl p-4 shadow-soft text-center">
            <div class="text-xs text-slate-500 font-bold uppercase mb-1">Chờ xử lý</div>
            <div class="text-2xl font-black text-orange-500" id="dkpi-pending">0</div>
        </div>
        <div class="card bg-white border border-slate-200 rounded-2xl p-4 shadow-soft text-center">
            <div class="text-xs text-slate-500 font-bold uppercase mb-1">Đang giao</div>
            <div class="text-2xl font-black text-blue-500" id="dkpi-delivering">0</div>
        </div>
        <div class="card bg-white border border-slate-200 rounded-2xl p-4 shadow-soft text-center">
            <div class="text-xs text-slate-500 font-bold uppercase mb-1">Hoàn thành h.nay</div>
            <div class="text-2xl font-black text-green-500" id="dkpi-completed">0</div>
        </div>
        <div class="card bg-white border border-slate-200 rounded-2xl p-4 shadow-soft text-center">
            <div class="text-xs text-slate-500 font-bold uppercase mb-1">Doanh thu Ship</div>
            <div class="text-2xl font-black text-[#C0A062]" id="dkpi-revenue">0đ</div>
        </div>
    </div>

    <!-- Sub-tabs content -->
    <div id="delivery-orders-subtab">
        <!-- Filter -->
        <div class="bg-white border border-slate-200 rounded-2xl p-4 mb-4 shadow-soft">
            <div class="flex flex-wrap gap-2">
                <button class="history-filter-btn active" onclick="filterDeliveryOrders('all', this)">Tất cả</button>
                <button class="history-filter-btn" onclick="filterDeliveryOrders('Pending', this)">Chờ xử lý</button>
                <button class="history-filter-btn" onclick="filterDeliveryOrders('Preparing', this)">Đang làm</button>
                <button class="history-filter-btn" onclick="filterDeliveryOrders('Ready', this)">Sẵn sàng</button>
                <button class="history-filter-btn" onclick="filterDeliveryOrders('Delivering', this)">Đang giao</button>
                <button class="history-filter-btn" onclick="filterDeliveryOrders('Completed', this)">Hoàn thành</button>
                <button class="history-filter-btn" onclick="filterDeliveryOrders('Cancelled', this)">Đã hủy</button>
            </div>
        </div>

        <!-- Orders Table -->
        <div class="card bg-white border border-slate-200 rounded-2xl shadow-soft overflow-hidden">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 border-0">
                        <thead class="bg-slate-100 text-[#b45309]">
                            <tr>
                                <th class="border-0 font-semibold py-3 px-4">Mã đơn</th>
                                <th class="border-0 font-semibold py-3 px-4">Khách hàng</th>
                                <th class="border-0 font-semibold py-3 px-4">Các món</th>
                                <th class="border-0 font-semibold py-3 px-4">Tổng tiền</th>
                                <th class="border-0 font-semibold py-3 px-4">Trạng thái</th>
                                <th class="border-0 font-semibold py-3 px-4">Shipper</th>
                                <th class="border-0 font-semibold py-3 px-4 text-end">Hành động</th>
                            </tr>
                        </thead>
                        <tbody id="delivery-orders-body" class="border-transparent">
                            <tr><td colspan="7" class="text-center py-6 text-slate-500"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Drivers Sub-tab (hidden by default) -->
    <div id="delivery-drivers-subtab" style="display:none">
        <div class="flex justify-between items-center mb-4">
            <h3 class="font-noto text-xl font-bold text-slate-800">Danh sách Shipper</h3>
            <button class="btn btn-success rounded-xl font-semibold shadow-soft" onclick="openDriverModal()">
                <i class="fa-solid fa-plus me-2"></i> Thêm Shipper
            </button>
        </div>
        <div class="card bg-white border border-slate-200 rounded-2xl shadow-soft overflow-hidden">
            <div class="card-body p-0">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0 border-0">
                        <thead class="bg-slate-100 text-[#b45309]">
                            <tr>
                                <th class="border-0 font-semibold py-3 px-4">Tên</th>
                                <th class="border-0 font-semibold py-3 px-4">SĐT</th>
                                <th class="border-0 font-semibold py-3 px-4">Mã đăng nhập</th>
                                <th class="border-0 font-semibold py-3 px-4">Trạng thái</th>
                                <th class="border-0 font-semibold py-3 px-4">Vị trí GPS</th>
                                <th class="border-0 font-semibold py-3 px-4 text-end">Hành động</th>
                            </tr>
                        </thead>
                        <tbody id="delivery-drivers-body" class="border-transparent">
                            <tr><td colspan="6" class="text-center py-6 text-slate-500">Đang tải...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    </div>

    <!-- Settings Sub-tab (hidden by default) -->
    <div id="delivery-settings-subtab" style="display:none">
        <div class="card bg-white border border-slate-200 rounded-2xl shadow-soft">
            <div class="card-header border-b border-slate-200 bg-transparent p-4">
                <h5 class="mb-0 font-noto font-bold text-slate-800"><i class="fa-solid fa-sliders me-2 text-orange-500"></i> Cấu hình Giao hàng</h5>
            </div>
            <div class="card-body p-4">
                <form id="delivery-settings-form">
                    <div class="row g-3">
                        <div class="col-md-6">
                            <label class="form-label text-slate-500 font-bold text-xs uppercase">Bật/tắt giao hàng</label>
                            <select id="ds-enabled" class="form-select bg-slate-100 border-slate-200 rounded-xl">
                                <option value="true">Bật</option>
                                <option value="false">Tắt</option>
                            </select>
                        </div>
                        <div class="col-md-6">
                            <label class="form-label text-slate-500 font-bold text-xs uppercase">Bán kính giao hàng (km)</label>
                            <input type="number" id="ds-radius" class="form-control bg-slate-100 border-slate-200 rounded-xl" value="3" step="0.5" min="0.5" max="20">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label text-slate-500 font-bold text-xs uppercase">Phí cơ bản (VNĐ)</label>
                            <input type="number" id="ds-base-fee" class="form-control bg-slate-100 border-slate-200 rounded-xl" value="15000" step="1000">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label text-slate-500 font-bold text-xs uppercase">Phí/km (VNĐ)</label>
                            <input type="number" id="ds-fee-per-km" class="form-control bg-slate-100 border-slate-200 rounded-xl" value="5000" step="1000">
                        </div>
                        <div class="col-md-4">
                            <label class="form-label text-slate-500 font-bold text-xs uppercase">Đơn tối thiểu (VNĐ)</label>
                            <input type="number" id="ds-min-order" class="form-control bg-slate-100 border-slate-200 rounded-xl" value="30000" step="5000">
                        </div>
                        <div class="col-md-12">
                            <label class="form-label text-slate-500 font-bold text-xs uppercase"><i class="fa-solid fa-map-location-dot me-1"></i> Tọa độ quán (Google Maps format)</label>
                            <div class="input-group">
                                <input type="text" id="ds-store-coords" class="form-control bg-slate-100 border-slate-200 rounded-start-xl" placeholder="VD: 10.776, 106.700">
                                <button type="button" class="btn btn-outline-primary rounded-end-xl" onclick="autoDetectStoreLocation()">
                                    <i class="fa-solid fa-crosshairs me-1"></i> Tự định vị
                                </button>
                            </div>
                        </div>
                    </div>
                    <button type="button" class="btn mt-4 font-bold rounded-xl" style="background-color: #C0A062; color: #1A1814;" onclick="saveDeliverySettings()">
                        <i class="fa-solid fa-floppy-disk me-2"></i> Lưu cài đặt
                    </button>
                </form>
            </div>
        </div>
    </div>
    `;
}

// --- Sub-Tab Switching ---
window.switchDeliverySubTab = function (tab) {
    document.getElementById('delivery-orders-subtab').style.display = tab === 'orders' ? '' : 'none';
    document.getElementById('delivery-drivers-subtab').style.display = tab === 'drivers' ? '' : 'none';
    document.getElementById('delivery-settings-subtab').style.display = tab === 'settings' ? '' : 'none';

    if (tab === 'drivers') loadDeliveryDrivers();
    if (tab === 'settings') loadDeliverySettingsForm();
};

// --- Load Delivery Orders ---
let currentDeliveryFilter = 'all';

async function loadDeliveryOrders() {
    try {
        let query = supabase.from('orders').select('*').eq('tenant_id', window.AdminState.tenantId).eq('order_type', 'delivery').order('created_at', { ascending: false }).limit(100);

        if (currentDeliveryFilter !== 'all') {
            query = query.eq('delivery_status', currentDeliveryFilter);
        }

        const { data, error } = await query;
        if (error) throw error;

        deliveryOrders = data || [];
        renderDeliveryOrders();
        updateDeliveryKPIs();
    } catch (e) {
        console.error('Error loading delivery orders:', e);
    }
}

window.filterDeliveryOrders = function (status, btn) {
    currentDeliveryFilter = status;
    document.querySelectorAll('#delivery-orders-subtab .history-filter-btn').forEach(b => b.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadDeliveryOrders();
};

function renderDeliveryOrders() {
    const body = document.getElementById('delivery-orders-body');
    if (!body) return;

    if (deliveryOrders.length === 0) {
        body.innerHTML = '<tr><td colspan="7" class="text-center py-6 text-slate-500">Không có đơn giao hàng nào.</td></tr>';
        return;
    }

    const statusColors = {
        'Pending': 'bg-yellow-100 text-yellow-700',
        'Confirmed': 'bg-blue-100 text-blue-700',
        'Preparing': 'bg-orange-100 text-orange-700',
        'Ready': 'bg-teal-100 text-teal-700',
        'Delivering': 'bg-indigo-100 text-indigo-700',
        'Completed': 'bg-green-100 text-green-700',
        'Cancelled': 'bg-red-100 text-red-700'
    };

    const statusLabels = {
        'Pending': 'Chờ xử lý', 'Confirmed': 'Đã xác nhận', 'Preparing': 'Đang làm',
        'Ready': 'Sẵn sàng', 'Delivering': 'Đang giao', 'Completed': 'Hoàn thành', 'Cancelled': 'Đã hủy'
    };

    body.innerHTML = deliveryOrders.map(o => {
        const items = o.items || [];
        const itemsStr = items.map(i => `${i.quantity}x ${i.name}`).join(', ');
        const status = o.delivery_status || o.status || 'Pending';
        const displayId = String(o.id).slice(-6).toUpperCase();
        const colorClass = statusColors[status] || 'bg-slate-100 text-slate-600';
        const statusLabel = statusLabels[status] || status;

        const canAssign = ['Ready', 'Preparing'].includes(status);
        const canCancel = ['Pending', 'Confirmed'].includes(status);

        let actionBtns = '';
        if (canAssign) {
            actionBtns += `<button class="btn btn-sm btn-outline-primary rounded-lg me-1" onclick="openAssignDriverModal('${o.id}')"><i class="fa-solid fa-motorcycle me-1"></i>Gán Ship</button>`;
        }
        if (status === 'Ready' && o.assigned_driver_id) {
            actionBtns += `<button class="btn btn-sm btn-outline-success rounded-lg me-1" onclick="adminUpdateDeliveryStatus('${o.id}', 'Delivering')"><i class="fa-solid fa-truck me-1"></i>Bắt đầu giao</button>`;
        }
        if (canCancel) {
            actionBtns += `<button class="btn btn-sm btn-outline-danger rounded-lg" onclick="adminCancelDelivery('${o.id}')"><i class="fa-solid fa-times"></i></button>`;
        }

        return `<tr>
            <td class="px-4 py-3">
                <span class="font-bold text-sm">#${displayId}</span>
                <div class="text-xs text-slate-500">${new Date(o.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</div>
            </td>
            <td class="px-4 py-3">
                <div class="font-semibold text-sm">${escapeH(o.delivery_name || '---')}</div>
                <div class="text-xs text-slate-500">${escapeH(o.delivery_phone || '')}</div>
                <div class="text-xs text-slate-400 truncate" style="max-width:200px">${escapeH(o.delivery_address || '')}</div>
            </td>
            <td class="px-4 py-3"><span class="text-sm truncate" style="max-width:200px;display:block">${escapeH(itemsStr)}</span></td>
            <td class="px-4 py-3 font-bold text-sm">${formatVNDAdmin(o.total_price)}</td>
            <td class="px-4 py-3"><span class="px-2 py-1 rounded-lg text-xs font-bold ${colorClass}">${statusLabel}</span></td>
            <td class="px-4 py-3 text-sm">${o.assigned_driver_id ? '<i class="fa-solid fa-check text-green-500 me-1"></i>Đã gán' : '<span class="text-slate-400">Chưa</span>'}</td>
            <td class="px-4 py-3 text-end">${actionBtns}</td>
        </tr>`;
    }).join('');
}

// --- KPIs ---
function updateDeliveryKPIs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const allToday = deliveryOrders.filter(o => new Date(o.created_at) >= today);
    const pending = deliveryOrders.filter(o => ['Pending', 'Confirmed', 'Preparing', 'Ready'].includes(o.delivery_status));
    const delivering = deliveryOrders.filter(o => o.delivery_status === 'Delivering');
    const completed = allToday.filter(o => o.delivery_status === 'Completed');
    const revenue = completed.reduce((s, o) => s + (o.delivery_fee || 0), 0);

    const el = id => document.getElementById(id);
    if (el('dkpi-pending')) el('dkpi-pending').textContent = pending.length;
    if (el('dkpi-delivering')) el('dkpi-delivering').textContent = delivering.length;
    if (el('dkpi-completed')) el('dkpi-completed').textContent = completed.length;
    if (el('dkpi-revenue')) el('dkpi-revenue').textContent = formatVNDAdmin(revenue);

    // Update sidebar badge
    const badge = document.getElementById('delivery-pending-badge');
    if (badge) {
        const count = pending.length + delivering.length;
        badge.textContent = count;
        badge.classList.toggle('hidden', count === 0);
    }
}

// --- Load Drivers ---
async function loadDeliveryDrivers() {
    try {
        const { data, error } = await supabase.from('delivery_drivers').select('*').eq('tenant_id', window.AdminState.tenantId).order('name');
        if (error) throw error;
        deliveryDrivers = data || [];
        renderDeliveryDrivers();
    } catch (e) {
        console.error('Error loading drivers:', e);
    }
}

function renderDeliveryDrivers() {
    const body = document.getElementById('delivery-drivers-body');
    if (!body) return;

    if (deliveryDrivers.length === 0) {
        body.innerHTML = '<tr><td colspan="6" class="text-center py-6 text-slate-500">Chưa có shipper nào.</td></tr>';
        return;
    }

    const statusMap = {
        'available': '<span class="px-2 py-1 bg-green-100 text-green-700 rounded-lg text-xs font-bold"><i class="fa-solid fa-circle text-green-500 me-1" style="font-size:6px;vertical-align:middle"></i>Online</span>',
        'busy': '<span class="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-lg text-xs font-bold"><i class="fa-solid fa-circle text-yellow-500 me-1" style="font-size:6px;vertical-align:middle"></i>Đang giao</span>',
        'offline': '<span class="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg text-xs font-bold"><i class="fa-solid fa-circle text-slate-400 me-1" style="font-size:6px;vertical-align:middle"></i>Offline</span>'
    };

    body.innerHTML = deliveryDrivers.map(d => {
        const lastUpdate = d.last_location_update ? new Date(d.last_location_update).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' }) : '';
        const hasGPS = d.current_lat && d.current_lng;
        const gpsInfo = hasGPS
            ? `<a href="https://www.google.com/maps?q=${d.current_lat},${d.current_lng}" target="_blank" class="text-xs text-blue-500 font-semibold hover:underline"><i class="fa-solid fa-location-dot me-1"></i>${Number(d.current_lat).toFixed(5)}, ${Number(d.current_lng).toFixed(5)}</a><div class="text-xs text-slate-400 mt-0.5">${lastUpdate ? '<i class="fa-regular fa-clock me-1"></i>' + lastUpdate : ''}</div>`
            : '<span class="text-xs text-slate-400">Chưa có vị trí</span>';

        return `
        <tr>
            <td class="px-4 py-3 font-semibold">${escapeH(d.name)}</td>
            <td class="px-4 py-3">${escapeH(d.phone || '---')}</td>
            <td class="px-4 py-3"><code class="bg-slate-100 px-2 py-1 rounded text-sm">${escapeH(d.driver_code)}</code></td>
            <td class="px-4 py-3">${statusMap[d.status] || statusMap['offline']}</td>
            <td class="px-4 py-3">${gpsInfo}</td>
            <td class="px-4 py-3 text-end">
                <button class="btn btn-sm btn-outline-warning rounded-lg me-1" onclick="toggleDriverActive('${d.id}', ${!d.is_active})">
                    ${d.is_active ? '<i class="fa-solid fa-ban"></i> Khóa' : '<i class="fa-solid fa-check"></i> Mở'}
                </button>
                <button class="btn btn-sm btn-outline-danger rounded-lg" onclick="deleteDriver('${d.id}')">
                    <i class="fa-solid fa-trash"></i>
                </button>
            </td>
        </tr>
    `;
    }).join('');
}

// --- Assign Driver Modal ---
window.openAssignDriverModal = async function (orderId) {
    await loadDeliveryDrivers();
    const available = deliveryDrivers.filter(d => d.is_active && d.status !== 'offline');

    if (available.length === 0) {
        showAdminToast('Không có shipper nào đang online. Vui lòng thêm shipper.', 'warning');
        return;
    }

    const driverOptions = available.map(d => `<option value="${d.id}">${escapeH(d.name)} (${escapeH(d.phone || '---')})</option>`).join('');

    const confirmed = await customConfirm(`
        <div class="mb-3">
            <label class="form-label text-slate-500 font-bold text-xs uppercase">Chọn Shipper</label>
            <select id="assign-driver-select" class="form-select bg-slate-100 border-slate-200 rounded-xl">${driverOptions}</select>
        </div>
    `, 'Gán Shipper');

    if (confirmed) {
        const select = document.getElementById('assign-driver-select');
        if (!select) return;
        const driverId = select.value;
        try {
            await supabase.from('orders').update({ assigned_driver_id: driverId, delivery_status: 'Ready' }).eq('tenant_id', window.AdminState.tenantId).eq('id', orderId);
            await supabase.from('delivery_drivers').update({ status: 'busy' }).eq('tenant_id', window.AdminState.tenantId).eq('id', driverId);
            showAdminToast('Đã gán shipper thành công!', 'success');
            loadDeliveryOrders();
        } catch (e) {
            showAdminToast('Lỗi gán shipper: ' + e.message, 'error');
        }
    }
};

// --- Admin Actions ---
window.adminUpdateDeliveryStatus = async function (orderId, status) {
    try {
        const updates = { delivery_status: status };
        if (status === 'Completed') updates.status = 'Completed';
        await supabase.from('orders').update(updates).eq('tenant_id', window.AdminState.tenantId).eq('id', orderId);
        showAdminToast('Cập nhật trạng thái thành công!', 'success');
        loadDeliveryOrders();
    } catch (e) {
        showAdminToast('Lỗi: ' + e.message, 'error');
    }
};

window.adminCancelDelivery = async function (orderId) {
    const confirmed = await customConfirm('Bạn có chắc muốn hủy đơn giao hàng này?');
    if (!confirmed) return;
    try {
        await supabase.from('orders').update({ delivery_status: 'Cancelled', status: 'Cancelled' }).eq('tenant_id', window.AdminState.tenantId).eq('id', orderId);
        showAdminToast('Đã hủy đơn giao hàng.', 'warning');
        loadDeliveryOrders();
    } catch (e) {
        showAdminToast('Lỗi: ' + e.message, 'error');
    }
};

// --- Add Driver ---
window.openDriverModal = async function () {
    const confirmed = await customConfirm(`
        <div class="mb-3">
            <label class="form-label text-slate-500 font-bold text-xs uppercase">Tên Shipper *</label>
            <input type="text" id="new-driver-name" class="form-control bg-slate-100 border-slate-200 rounded-xl" placeholder="Nguyễn Văn A">
        </div>
        <div class="mb-3">
            <label class="form-label text-slate-500 font-bold text-xs uppercase">Số điện thoại</label>
            <input type="tel" id="new-driver-phone" class="form-control bg-slate-100 border-slate-200 rounded-xl" placeholder="0901234567">
        </div>
        <div class="mb-3">
            <label class="form-label text-slate-500 font-bold text-xs uppercase">Mã đăng nhập (4-6 ký tự)</label>
            <input type="text" id="new-driver-code" class="form-control bg-slate-100 border-slate-200 rounded-xl text-uppercase" placeholder="AB1234" maxlength="6" style="text-transform:uppercase">
        </div>
    `, 'Thêm Shipper mới');

    if (confirmed) {
        const name = document.getElementById('new-driver-name')?.value.trim();
        const phone = document.getElementById('new-driver-phone')?.value.trim();
        const code = document.getElementById('new-driver-code')?.value.trim().toUpperCase();

        if (!name || !code) {
            showAdminToast('Vui lòng nhập tên và mã đăng nhập.', 'error');
            return;
        }

        try {
            const { error } = await supabase.from('delivery_drivers').insert([{
                tenant_id: window.AdminState.tenantId, name, phone, driver_code: code, status: 'offline', is_active: true
            }]);
            if (error) throw error;
            showAdminToast('Thêm shipper thành công!', 'success');
            loadDeliveryDrivers();
        } catch (e) {
            showAdminToast('Lỗi: ' + e.message, 'error');
        }
    }
};

window.toggleDriverActive = async function (id, active) {
    try {
        await supabase.from('delivery_drivers').update({ is_active: active }).eq('tenant_id', window.AdminState.tenantId).eq('id', id);
        showAdminToast(active ? 'Đã mở khóa shipper.' : 'Đã khóa shipper.', 'success');
        loadDeliveryDrivers();
    } catch (e) {
        showAdminToast('Lỗi: ' + e.message, 'error');
    }
};

window.deleteDriver = async function (id) {
    const confirmed = await customConfirm('Xóa shipper này? Hành động không thể hoàn tác.');
    if (!confirmed) return;
    try {
        await supabase.from('delivery_drivers').delete().eq('tenant_id', window.AdminState.tenantId).eq('id', id);
        showAdminToast('Đã xóa shipper.', 'warning');
        loadDeliveryDrivers();
    } catch (e) {
        showAdminToast('Lỗi: ' + e.message, 'error');
    }
};

// --- Settings ---
async function loadDeliverySettingsForm() {
    try {
        const { data } = await supabase.from('store_settings').select('*').eq('tenant_id', window.AdminState.tenantId).maybeSingle();
        if (data) {
            const el = id => document.getElementById(id);
            if (el('ds-enabled')) el('ds-enabled').value = String(data.delivery_enabled !== false);
            if (el('ds-radius')) el('ds-radius').value = data.delivery_radius_km || 3;
            if (el('ds-base-fee')) el('ds-base-fee').value = data.delivery_base_fee || 15000;
            if (el('ds-fee-per-km')) el('ds-fee-per-km').value = data.delivery_fee_per_km || 5000;
            if (el('ds-min-order')) el('ds-min-order').value = data.delivery_min_order || 30000;
            if (el('ds-store-coords')) {
                if (data.store_lat && data.store_lng) {
                    el('ds-store-coords').value = `${data.store_lat}, ${data.store_lng}`;
                } else {
                    el('ds-store-coords').value = '';
                }
            }
        }
    } catch (e) {
        console.error('Error loading delivery settings:', e);
    }
}

window.autoDetectStoreLocation = function () {
    if (!navigator.geolocation) {
        showAdminToast('Trình duyệt không hỗ trợ định vị.', 'error');
        return;
    }
    const btn = document.querySelector('button[onclick="autoDetectStoreLocation()"]');
    if (btn) btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-1"></i> Đang tìm...';

    navigator.geolocation.getCurrentPosition((pos) => {
        document.getElementById('ds-store-coords').value = `${pos.coords.latitude}, ${pos.coords.longitude}`;
        if (btn) btn.innerHTML = '<i class="fa-solid fa-crosshairs me-1"></i> Tự định vị';
        showAdminToast('Đã lấy vị trí hiện tại!', 'success');
    }, (err) => {
        if (btn) btn.innerHTML = '<i class="fa-solid fa-crosshairs me-1"></i> Tự định vị';
        let msg = 'Không thể lấy vị trí.';
        if (err.code === 1) msg = 'Vui lòng cấp quyền vị trí cho trình duyệt.';
        showAdminToast(msg, 'error');
    }, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
    });
};

window.saveDeliverySettings = async function () {
    try {
        let lat = null, lng = null;
        const coordsStr = document.getElementById('ds-store-coords').value;
        if (coordsStr && coordsStr.includes(',')) {
            const parts = coordsStr.split(',');
            lat = parseFloat(parts[0].trim()) || null;
            lng = parseFloat(parts[1].trim()) || null;
        }

        const update = {
            delivery_enabled: document.getElementById('ds-enabled').value === 'true',
            delivery_radius_km: parseFloat(document.getElementById('ds-radius').value) || 3,
            delivery_base_fee: parseInt(document.getElementById('ds-base-fee').value) || 15000,
            delivery_fee_per_km: parseInt(document.getElementById('ds-fee-per-km').value) || 5000,
            delivery_min_order: parseInt(document.getElementById('ds-min-order').value) || 30000,
            store_lat: lat,
            store_lng: lng
        };

        const { error } = await supabase.from('store_settings').update(update).eq('tenant_id', window.AdminState.tenantId);
        if (error) throw error;

        showAdminToast('Đã lưu cài đặt giao hàng!', 'success');
        logAudit('delivery_settings_update', update);
    } catch (e) {
        showAdminToast('Lỗi lưu cài đặt: ' + e.message, 'error');
    }
};

// --- Realtime ---
let deliveryDriversChannel = null;

function setupDeliveryRealtime() {
    if (deliveryRealtimeChannel) {
        supabase.removeChannel(deliveryRealtimeChannel);
    }
    if (deliveryDriversChannel) {
        supabase.removeChannel(deliveryDriversChannel);
    }

    deliveryRealtimeChannel = supabase
        .channel('admin-delivery-orders')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: 'order_type=eq.delivery,tenant_id=eq.' + window.AdminState.tenantId
        }, () => {
            loadDeliveryOrders();
        })
        .subscribe();

    // Realtime sync for driver status & GPS
    deliveryDriversChannel = supabase
        .channel('admin-delivery-drivers')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'delivery_drivers',
            filter: 'tenant_id=eq.' + window.AdminState.tenantId
        }, () => {
            loadDeliveryDrivers();
        })
        .subscribe();
}

// --- Helpers ---
function escapeH(str) {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function formatVNDAdmin(amount) {
    if (!amount && amount !== 0) return '0đ';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}
