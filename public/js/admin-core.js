// =============================================
// ADMIN CORE - Shared State, Utils, Init, RBAC
// =============================================

// --- Shared State (Global) ---
let products = [];
let orderHistory = [];
let ingredients = [];
let discounts = [];
let customersList = [];
let staffList = [];
let productModalInstance;
let ingredientModalInstance;
let promoModalInstance;
let confirmModalInstance;
let customerModalInstance;
let staffModalInstance;
let quickPromoModalInstance;
let createRestockModalInstance = null;

// Debounce timers for realtime subscriptions
let historyDebounceTimer = null;
let tablesDebounceTimer = null;
let inventoryDebounceTimer = null;

// DOM Elements (Initialized in DOMContentLoaded to prevent null errors)
let productsTableBody, historyTableBody, inventoryTableBody, totalRevenueEl;

// --- Custom Confirm Dialog ---
function customConfirm(message, title = 'Xác nhận') {
    return new Promise((resolve) => {
        if (!confirmModalInstance) {
            confirmModalInstance = new bootstrap.Modal(document.getElementById('confirmModal'));
        }
        document.getElementById('confirmModalTitle').textContent = title;
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-triangle-exclamation text-warning me-2';
        document.getElementById('confirmModalTitle').prepend(icon);
        document.getElementById('confirmModalBody').textContent = message;

        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');

        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        document.getElementById('confirmModalOk').addEventListener('click', () => {
            confirmModalInstance.hide();
            resolve(true);
        }, { once: true });

        document.getElementById('confirmModalCancel').addEventListener('click', () => {
            resolve(false);
        }, { once: true });

        document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
            resolve(false);
        }, { once: true });

        confirmModalInstance.show();
    });
}

// --- Toast Notification ---
function showAdminToast(message, type = 'info', duration = 4000) {
    let toastContainer = document.getElementById('admin-toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'admin-toast-container';
        toastContainer.style.cssText = 'position:fixed;top:20px;right:20px;z-index:9999;display:flex;flex-direction:column;gap:10px;max-width:380px;';
        document.body.appendChild(toastContainer);
    }

    const colorMap = { success: '#22c55e', warning: '#f59e0b', error: '#ef4444', info: '#C0A062' };
    const toast = document.createElement('div');
    toast.style.cssText = `background:#232018;border:1px solid ${colorMap[type]||colorMap.info};border-left:4px solid ${colorMap[type]||colorMap.info};border-radius:12px;padding:14px 18px;color:#E8DCC4;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:slideInRight 0.3s ease;`;
    toast.textContent = message;

    toastContainer.appendChild(toast);
    setTimeout(() => { toast.style.animation = 'slideOutRight 0.3s ease'; setTimeout(() => toast.remove(), 300); }, duration);
}

// Toast keyframes
const toastStyle = document.createElement('style');
toastStyle.textContent = `
@keyframes slideInRight { from { transform: translateX(120%); opacity:0; } to { transform: translateX(0); opacity:1; } }
@keyframes slideOutRight { from { transform: translateX(0); opacity:1; } to { transform: translateX(120%); opacity:0; } }
`;
document.head.appendChild(toastStyle);

// --- Audit Logging ---
async function logAudit(action, details) {
    const adminRole = sessionStorage.getItem('cafe_role') || localStorage.getItem('cafe_role') || 'Unknown';
    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'Ẩn danh';
    try {
        await supabase.from('audit_logs').insert([{
            admin_identifier: `${staffName} (${adminRole})`,
            action: action,
            details: details
        }]);
    } catch(e) {
        console.error("Lỗi ghi log:", e);
    }
}

// --- Tab Switching Logic ---
function switchTab(tabId) {
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    document.getElementById(`tab-${tabId}`).classList.add('active');

    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    document.getElementById(`section-${tabId}`).classList.add('active');

    if (tabId === 'dashboard') {
        if (typeof loadDashboard === 'function') loadDashboard();
    } else if (tabId === 'pos') {
        if (typeof initPOS === 'function') initPOS();
    } else if (tabId === 'history' || tabId === 'analytics') {
        fetchHistory();
        if (tabId === 'analytics') fetchFeedbackStats();
    } else if (tabId === 'tables') {
        fetchTablesStatus();
    } else if (tabId === 'inventory') {
        fetchIngredients();
    } else if (tabId === 'restock') {
        loadRestockLogs();
    } else if (tabId === 'promo') {
        fetchDiscounts();
    } else if (tabId === 'customers') {
        fetchCustomers();
    } else if (tabId === 'staff') {
        fetchStaff();
    } else if (tabId === 'shifts') {
        if (typeof initShiftsModule === 'function') initShiftsModule();
    } else if (tabId === 'audit') {
        fetchAuditLogs();
    } else if (tabId === 'settings') {
        loadStoreSettings();
    } else if (tabId === 'cashflow') {
        fetchCashflowData();
    } else {
        fetchProducts();
    }
}

// --- Staff Requests (Floating Alerts) ---
async function fetchActiveStaffRequests() {
    try {
        const { data, error } = await supabase.from('staff_requests').select('*').eq('status', 'pending');
        if (error) throw error;
        data.forEach(req => renderStaffRequest(req));
    } catch (e) { console.error("Error fetching staff requests:", e); }
}

function renderStaffRequest(data) {
    if (!document.getElementById('admin-alerts-container')) {
        const container = document.createElement('div');
        container.id = 'admin-alerts-container';
        document.body.appendChild(container);
    }

    const { id, table_number, type, created_at } = data;
    if (document.querySelector(`.admin-alert[data-request-id="${id}"]`)) return;

    const isBill = type === 'bill';
    const msg = isBill ? `Bàn ${table_number} thanh toán!` : `Bàn ${table_number} gọi phục vụ!`;
    const iconClass = isBill ? 'fa-file-invoice-dollar' : 'fa-bell-concierge';
    const alertTypeClass = isBill ? 'alert-bill' : 'alert-call';

    const alertDiv = document.createElement('div');
    alertDiv.className = `admin-alert ${alertTypeClass}`;
    alertDiv.setAttribute('data-request-id', id);

    const alertContent = document.createElement('div');
    alertContent.className = 'alert-content';

    const alertIcon = document.createElement('i');
    alertIcon.className = `fa-solid ${iconClass} fs-3`;

    const textDiv = document.createElement('div');
    const titleH = document.createElement('h6');
    titleH.className = 'mb-0 fw-bold';
    titleH.textContent = msg;

    const timeSm = document.createElement('small');
    timeSm.className = 'alert-time';
    timeSm.textContent = new Date(created_at).toLocaleTimeString('vi-VN');

    textDiv.append(titleH, timeSm);
    alertContent.append(alertIcon, textDiv);

    const doneBtn = document.createElement('button');
    doneBtn.className = 'btn btn-sm btn-light fw-bold';
    doneBtn.textContent = 'Xong';
    doneBtn.onclick = (e) => clearStaffRequest(id, e.target);

    alertDiv.append(alertContent, doneBtn);
    document.getElementById('admin-alerts-container').prepend(alertDiv);
    playAdminAudio();
}

function removeStaffRequestUI(id) {
    const el = document.querySelector(`.admin-alert[data-request-id="${id}"]`);
    if(el) el.remove();
}

window.clearStaffRequest = async (id, btn) => {
    btn.disabled = true;
    try {
        await supabase.from('staff_requests').update({ status: 'completed' }).eq('id', id);
        removeStaffRequestUI(id);
    } catch(e) {
        console.error(e);
        btn.disabled = false;
        alert("Lỗi khi hoàn thành yêu cầu");
    }
};

function playAdminAudio() {
    try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(800, audioCtx.currentTime + 0.2);
        gainNode.gain.setValueAtTime(0.5, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
    } catch(e) {}
}

// --- Realtime Subscriptions ---
supabase.channel('admin-orders')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
      if (document.getElementById('section-history').classList.contains('active') || 
          document.getElementById('section-analytics').classList.contains('active')) {
          clearTimeout(historyDebounceTimer);
          historyDebounceTimer = setTimeout(() => fetchHistory(), 400);
      }
      if (document.getElementById('section-tables').classList.contains('active')) {
          clearTimeout(tablesDebounceTimer);
          tablesDebounceTimer = setTimeout(() => fetchTablesStatus(), 400);
      }
  })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_requests' }, payload => {
      if(payload.new.status === 'pending') renderStaffRequest(payload.new);
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'staff_requests' }, payload => {
      if(payload.new.status === 'completed') removeStaffRequestUI(payload.new.id);
  })
  .subscribe((status, err) => {
      if (err) console.error('ADMIN REALTIME ERROR:', err);
  });

supabase.channel('admin-ingredients')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients' }, () => {
      if (document.getElementById('section-inventory')?.classList.contains('active')) {
          clearTimeout(inventoryDebounceTimer);
          inventoryDebounceTimer = setTimeout(() => fetchIngredients(), 400);
      }
  })
  .subscribe();

// --- Init on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    productsTableBody = document.getElementById('products-table-body');
    historyTableBody = document.getElementById('history-table-body');
    inventoryTableBody = document.getElementById('inventory-table-body');
    totalRevenueEl = document.getElementById('total-revenue');

    productModalInstance = new bootstrap.Modal(document.getElementById('productModal'));
    ingredientModalInstance = new bootstrap.Modal(document.getElementById('ingredientModal'));
    promoModalInstance = new bootstrap.Modal(document.getElementById('promoModal'));
    customerModalInstance = new bootstrap.Modal(document.getElementById('customerModal'));
    staffModalInstance = new bootstrap.Modal(document.getElementById('staffModal'));
    quickPromoModalInstance = new bootstrap.Modal(document.getElementById('quickPromoModal'));

    // Load initial data
    fetchProducts();
    fetchHistory();
    fetchIngredients();

    // RBAC: Apply Detailed Permissions
    const role = sessionStorage.getItem('cafe_role') || localStorage.getItem('cafe_role');
    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || (role === 'admin' ? 'Administrator' : 'Nhân viên');
    let permissions = [];
    try {
        permissions = JSON.parse(sessionStorage.getItem('nohope_permissions') || localStorage.getItem('nohope_permissions') || '[]');
    } catch(e) {}
    
    const desktopNameEl = document.getElementById('desktop-staff-name');
    const mobileNameEl = document.getElementById('mobile-staff-name');
    if (desktopNameEl) desktopNameEl.textContent = staffName;
    if (mobileNameEl) mobileNameEl.textContent = staffName;

    // Display avatar in sidebar
    const avatarUrl = sessionStorage.getItem('nohope_staff_avatar') || '';
    const desktopAvatarEl = document.getElementById('desktop-staff-avatar');
    if (avatarUrl && desktopAvatarEl) {
        desktopAvatarEl.innerHTML = `<img src="${avatarUrl}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fa-solid fa-user text-[#C0A062] text-xs\\'></i>';">`;
    }

    const allTabsId = ['orders', 'pos', 'history', 'tables', 'menu', 'inventory', 'restock', 'promo', 'customers', 'staff', 'analytics', 'audit', 'cashflow'];
    let defaultTab = '';
    
    if (role !== 'admin') {
        allTabsId.forEach(tab => {
            const el = document.getElementById(`tab-${tab}`);
            if (el) {
                if (!permissions.includes(tab)) {
                    el.style.display = 'none';
                } else {
                    el.style.display = '';
                    if (!defaultTab) defaultTab = tab;
                }
            }
        });
        
        const btnAddPromo = document.querySelector('button[onclick="openPromoModal()"]');
        if (btnAddPromo && !permissions.includes('promo')) btnAddPromo.style.display = 'none';

        if (defaultTab) {
            switchTab(defaultTab);
        } else {
            document.querySelector('.content-section.active')?.classList.remove('active');
            const mainContent = document.querySelector('main');
            mainContent.innerHTML = '<div class="flex items-center justify-center h-full"><div class="text-center"><i class="fa-solid fa-lock text-[#A89F88] text-6xl mb-4"></i><h2 class="text-2xl text-[#E8DCC4]">Bạn chưa được cấp quyền truy cập</h2><p class="text-[#A89F88] mt-2">Vui lòng liên hệ Quản trị viên</p></div></div>';
        }
    } else {
        allTabsId.forEach(tab => {
            const el = document.getElementById(`tab-${tab}`);
            if (el) el.style.display = '';
        });
        switchTab('dashboard');
    }

    // Quick Promo Modal event listeners
    document.getElementById('quickPromoPercentInput').addEventListener('input', function() {
        const percent = parseFloat(this.value);
        const originalPrice = parseFloat(document.getElementById('quickPromoOriginalPriceValue').value);
        if (!isNaN(percent) && !isNaN(originalPrice) && percent >= 0 && percent <= 100) {
            let discountedPrice = originalPrice * (1 - percent / 100);
            discountedPrice = Math.round(discountedPrice / 1000) * 1000;
            document.getElementById('quickPromoPriceInput').value = discountedPrice;
        } else if (this.value === '') {
            document.getElementById('quickPromoPriceInput').value = '';
        }
    });

    document.getElementById('quickPromoPriceInput').addEventListener('input', function() {
        const price = parseFloat(this.value);
        const originalPrice = parseFloat(document.getElementById('quickPromoOriginalPriceValue').value);
        if (!isNaN(price) && !isNaN(originalPrice) && originalPrice > 0 && price >= 0) {
            const percent = (1 - price / originalPrice) * 100;
            document.getElementById('quickPromoPercentInput').value = Math.round(percent * 10) / 10;
        } else if (this.value === '') {
            document.getElementById('quickPromoPercentInput').value = '';
        }
    });

    // Staff modal init
    const staffEl = document.getElementById('staffModal');
    if (staffEl) staffModalInstance = new bootstrap.Modal(staffEl);

    // B4: Realtime badge for pending orders
    function subscribeOrdersBadge() {
        const updateBadge = async () => {
            try {
                const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true }).in('status', ['Pending', 'Preparing']);
                const badge = document.getElementById('orders-pending-badge');
                if (!badge) return;
                if (count > 0) {
                    badge.textContent = count > 99 ? '99+' : count;
                    badge.classList.remove('hidden');
                } else {
                    badge.classList.add('hidden');
                }
            } catch(e) { console.warn('Badge error:', e); }
        };
        updateBadge();
        supabase.channel('orders-badge-channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, updateBadge)
            .subscribe();
    }
    subscribeOrdersBadge();

    // Dashboard stats + History filter
    shiftStartTime = new Date();
    setTimeout(renderDashboardStats, 800);
    initHistoryFilter();
    historyFilteredData = [];
});

// Init fetch staff requests
fetchActiveStaffRequests();
