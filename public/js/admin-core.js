// =============================================
// ADMIN CORE - Shared State, Utils, Init, RBAC
// =============================================

// --- Theme System ---
(function initTheme() {
    const saved = localStorage.getItem('admin_theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    document.documentElement.setAttribute('data-theme', theme);
})();

function toggleAdminTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('admin_theme', next);
    updateThemeToggleBtn(next);
}

function updateThemeToggleBtn(theme) {
    const btn = document.getElementById('theme-toggle-btn');
    if (!btn) return;
    const icon = btn.querySelector('i');
    const text = btn.querySelector('span');
    if (theme === 'dark') {
        icon.className = 'fa-solid fa-sun w-5 text-center';
        if (text) text.textContent = 'Chế độ sáng';
    } else {
        icon.className = 'fa-solid fa-moon w-5 text-center';
        if (text) text.textContent = 'Chế độ tối';
    }
}

// Init toggle button state on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    updateThemeToggleBtn(document.documentElement.getAttribute('data-theme') || 'light');
});

// --- Shared State (Global) ---
window.AdminState = {
    tenantId: sessionStorage.getItem('tenant_id') || localStorage.getItem('tenant_id') || null
};

if (!window.AdminState.tenantId) {
    console.error("Missing tenantId in admin panel! Redirecting to login.");
    if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
    }
}

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
let cashflowDebounceTimer = null;

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
        document.getElementById('confirmModalBody').innerHTML = message;

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
    toast.style.cssText = `background:#ffffff;border:1px solid ${colorMap[type]||colorMap.info};border-left:4px solid ${colorMap[type]||colorMap.info};border-radius:12px;padding:14px 18px;color:#1e293b;font-size:14px;font-weight:600;box-shadow:0 8px 24px rgba(0,0,0,0.4);animation:slideInRight 0.3s ease;`;
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
            tenant_id: window.AdminState.tenantId,
            admin_identifier: `${staffName} (${adminRole})`,
            action: action,
            details: details
        }]);
    } catch(e) {
        console.error("Lỗi ghi log:", e);
    }
}

// --- Tab Switching Logic ---
window.hasPermission = function(perm) {
    if (sessionStorage.getItem('cafe_role') === 'admin') return true;
    try {
        const perms = JSON.parse(sessionStorage.getItem('nohope_permissions') || '[]');
        return perms.includes(perm);
    } catch(e) {
        return false;
    }
};

window.canAccessTab = function(tabId) {
    if (sessionStorage.getItem('cafe_role') === 'admin') return true;
    const perms = JSON.parse(sessionStorage.getItem('nohope_permissions') || '[]');
    if (perms.length === 0) return false;

    const accessMap = {
        'dashboard': ['analytics_dashboard', 'analytics_revenue', 'analytics_products'],
        'pos': ['pos_create'],
        'orders': ['orders_view', 'orders_status', 'orders_payment', 'orders_cancel', 'orders_discount'],
        'menu': ['menu_view', 'menu_add', 'menu_edit', 'menu_delete', 'menu_category', 'menu_promo'],
        'inventory': ['inventory_view', 'inventory_edit', 'inventory_delete'],
        'restock': ['restock_view', 'restock_create'],
        'promo': ['menu_promo'],
        'history': ['history_view', 'history_export', 'history_cancel', 'history_print'],
        'shifts': ['shifts_view', 'shifts_manage'],
        'analytics': ['analytics_revenue', 'analytics_products', 'analytics_export'],
        'cashflow': ['cashflow_view', 'cashflow_export', 'cashflow_create', 'cashflow_edit', 'cashflow_delete'],
        'tables': ['tables_view', 'tables_add', 'tables_edit', 'tables_delete', 'tables_qr'],
        'customers': ['customers_view', 'customers_edit'],
        'staff': ['staff_view', 'staff_add', 'staff_edit', 'staff_permissions', 'staff_delete'],
        'audit': ['settings_audit'],
        'qr': ['tables_qr'],
        'delivery': ['delivery_view', 'delivery_manage', 'delivery_drivers', 'delivery_settings'],
        'crm': ['analytics_dashboard', 'analytics_revenue', 'crm_view'],
        'settings': ['settings_manage']
    };

    if (accessMap[tabId]) {
        return accessMap[tabId].some(p => perms.includes(p));
    }

    return perms.includes(tabId) || perms.some(p => p.startsWith(tabId + '_'));
};

function switchTab(tabId) {
    if (!window.canAccessTab(tabId)) {
        if (typeof showAdminToast === 'function') {
            showAdminToast('Bạn không có quyền truy cập chức năng này', 'error');
        }
        return;
    }

    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    // Add active class if nav button exists
    const navLink = document.getElementById(`tab-${tabId}`);
    if (navLink) navLink.classList.add('active');

    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(`section-${tabId}`);
    if (targetSection) targetSection.classList.add('active');

    // Manage dashboard realtime subscription
    if (tabId === 'dashboard') {
        if (typeof startDashboardRealtime === 'function') startDashboardRealtime();
    } else {
        if (typeof stopDashboardRealtime === 'function') stopDashboardRealtime();
    }

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
    } else if (tabId === 'delivery') {
        if (typeof initDeliveryModule === 'function') initDeliveryModule();
    } else if (tabId === 'crm') {
        if (typeof renderCrmDashboard === 'function') renderCrmDashboard();
    } else {
        fetchProducts();
    }
}

// --- Staff Requests (Floating Alerts) ---
async function fetchActiveStaffRequests() {
    try {
        const { data, error } = await supabase.from('staff_requests').select('*')
            .eq('tenant_id', window.AdminState.tenantId)
            .eq('status', 'pending');
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
        await supabase.from('staff_requests').update({ status: 'completed' })
            .eq('tenant_id', window.AdminState.tenantId)
            .eq('id', id);
        removeStaffRequestUI(id);
    } catch(e) {
        console.error(e);
        btn.disabled = false;
        showAdminToast("Lỗi khi hoàn thành yêu cầu", 'error');
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
  .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${window.AdminState.tenantId}` }, payload => {
      if (document.getElementById('section-history').classList.contains('active') || 
          document.getElementById('section-analytics').classList.contains('active')) {
          clearTimeout(historyDebounceTimer);
          historyDebounceTimer = setTimeout(() => fetchHistory(), 400);
      }
      if (document.getElementById('section-tables').classList.contains('active')) {
          clearTimeout(tablesDebounceTimer);
          tablesDebounceTimer = setTimeout(() => fetchTablesStatus(), 400);
      }
      
      // KPI cards are global, always update them
      if (typeof renderDashboardStats === 'function') {
          setTimeout(() => renderDashboardStats(), 400);
      }

      if (document.getElementById('section-dashboard').classList.contains('active')) {
          if (typeof loadDashboard === 'function') setTimeout(() => loadDashboard(), 400);
      }
  })
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'staff_requests', filter: `tenant_id=eq.${window.AdminState.tenantId}` }, payload => {
      if(payload.new.status === 'pending') renderStaffRequest(payload.new);
  })
  .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'staff_requests', filter: `tenant_id=eq.${window.AdminState.tenantId}` }, payload => {
      if(payload.new.status === 'completed') removeStaffRequestUI(payload.new.id);
  })
  .subscribe((status, err) => {
      if (err) console.error('ADMIN REALTIME ERROR:', err);
  });

// SaaS Broadcast Listener
supabase.channel('global-broadcasts')
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'broadcast_messages' }, payload => {
      if (typeof showAdminToast === 'function') {
          showAdminToast(`📢 THÔNG BÁO TỪ HỆ THỐNG:\n${payload.new.message}`, 'info', 10000);
          if (typeof playAdminAudio === 'function') playAdminAudio();
      }
  })
  .subscribe();

supabase.channel('admin-ingredients')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'ingredients', filter: `tenant_id=eq.${window.AdminState.tenantId}` }, () => {
      if (document.getElementById('section-inventory')?.classList.contains('active')) {
          clearTimeout(inventoryDebounceTimer);
          inventoryDebounceTimer = setTimeout(() => fetchIngredients(), 400);
      }
  })
  .subscribe();

supabase.channel('admin-cashflow')
  .on('postgres_changes', { event: '*', schema: 'public', table: 'cash_transactions', filter: `tenant_id=eq.${window.AdminState.tenantId}` }, () => {
      if (typeof renderDashboardStats === 'function') {
          setTimeout(() => renderDashboardStats(), 400);
      }
      if (typeof fetchCashflowData === 'function' && document.getElementById('section-cashflow')?.classList.contains('active')) {
          clearTimeout(cashflowDebounceTimer);
          cashflowDebounceTimer = setTimeout(() => fetchCashflowData(), 400);
      }
  })
  .subscribe();

// --- Init on DOMContentLoaded ---
document.addEventListener('DOMContentLoaded', () => {
    // SaaS Subscription Lock Check
    const expireDateStr = sessionStorage.getItem('subscription_end_date');
    if (expireDateStr) {
        const expireDate = new Date(expireDateStr);
        if (new Date() > expireDate) {
            const overlay = document.createElement('div');
            overlay.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.85);backdrop-filter:blur(10px);z-index:99999;display:flex;flex-direction:column;align-items:center;justify-content:center;color:white;text-align:center;padding:2rem;';
            overlay.innerHTML = `
                <i class="fa-solid fa-lock text-[#ef4444] text-7xl mb-6"></i>
                <h1 class="text-3xl font-bold mb-3">Tài khoản đã hết hạn</h1>
                <p class="text-lg text-gray-300 max-w-lg mb-6">Gói phần mềm của bạn đã hết hạn bảo trì vào ngày ${expireDate.toLocaleDateString('vi-VN')}. Vui lòng liên hệ Super Admin Nohope để gia hạn ngay lập tức.</p>
                <button onclick="window.location.href='/login'" class="px-6 py-2 bg-[#C0A062] rounded-lg text-white font-medium hover:bg-[#A08042] transition-colors">Quay lại Đăng nhập</button>
            `;
            document.body.appendChild(overlay);
            const mainW = document.querySelector('.main-wrapper');
            if (mainW) mainW.style.display = 'none';
            return; // Halt further visual init if expired
        }
    }

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

    const tenantName = localStorage.getItem('tenant_name') || sessionStorage.getItem('tenant_name') || 'Nohope Coffee';
    const desktopTenantEl = document.getElementById('desktop-tenant-name');
    const mobileTenantEl = document.getElementById('mobile-tenant-name');
    if (desktopTenantEl) desktopTenantEl.textContent = tenantName;
    if (mobileTenantEl) mobileTenantEl.textContent = tenantName;

    // Async: fetch latest store name & logo from DB to keep sidebar in sync
    if (typeof supabase !== 'undefined' && window.AdminState?.tenantId) {
        supabase.from('store_settings').select('store_name, logo')
            .eq('tenant_id', window.AdminState.tenantId).maybeSingle()
            .then(({ data }) => {
                if (data?.store_name) {
                    localStorage.setItem('tenant_name', data.store_name);
                    if (desktopTenantEl) desktopTenantEl.textContent = data.store_name;
                    if (mobileTenantEl) mobileTenantEl.textContent = data.store_name;
                }
                if (data?.logo) {
                    localStorage.setItem('tenant_logo', data.logo);
                    document.querySelectorAll('.tenant-logo-img').forEach(img => img.src = data.logo);
                }
            });
    }

    // Apply store logo to admin UI if set
    const storeLogo = localStorage.getItem('tenant_logo');
    if (storeLogo) {
        document.querySelectorAll('.tenant-logo-img').forEach(img => img.src = storeLogo);
    }

    // Display avatar in sidebar
    const desktopAvatarEl = document.getElementById('desktop-staff-avatar');
    const initAvatarUrl = sessionStorage.getItem('nohope_staff_avatar') || '';
    if (initAvatarUrl && desktopAvatarEl) {
        desktopAvatarEl.innerHTML = `<img src="${initAvatarUrl}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fa-solid fa-user text-[#C0A062] text-xs\\'></i>';">`;
    }

    // Refresh avatar and sync permissions from DB seamlessly
    if (staffName && staffName !== 'Administrator' && staffName !== 'Nhân viên') {
        supabase.from('users').select('avatar_url, permissions, role')
            .eq('tenant_id', window.AdminState.tenantId)
            .eq('name', staffName).maybeSingle().then(({data}) => {
            if (data && data.avatar_url) {
                sessionStorage.setItem('nohope_staff_avatar', data.avatar_url);
                if (desktopAvatarEl) {
                    desktopAvatarEl.innerHTML = `<img src="${data.avatar_url}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fa-solid fa-user text-[#C0A062] text-xs\\'></i>';">`;
                }
                const posAvatarEl = document.getElementById('pos-header-avatar');
                if (posAvatarEl) {
                    posAvatarEl.innerHTML = `<img src="${data.avatar_url}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null;this.parentElement.innerHTML='<i class=\\'fa-solid fa-user text-[#C0A062] text-xs\\'></i>';">`;
                }
            }

            // Sync permissions on page load to prevent stale sessions
            if (data) {
                const currentPerms = JSON.parse(sessionStorage.getItem('nohope_permissions') || '[]');
                const currentRole = sessionStorage.getItem('cafe_role');
                const newPerms = data.permissions || [];
                const newRole = data.role;

                if (JSON.stringify(currentPerms) !== JSON.stringify(newPerms) || currentRole !== newRole) {
                    sessionStorage.setItem('nohope_permissions', JSON.stringify(newPerms));
                    sessionStorage.setItem('cafe_role', newRole);
                    window.location.reload();
                }
            }
        });

        // Listen for realtime permission/role changes
        supabase.channel('admin-user-channel')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: `tenant_id=eq.${window.AdminState.tenantId}` }, payload => {
                if (payload.new.name === staffName) {
                    const newPerms = payload.new.permissions || [];
                    const newRole = payload.new.role;
                    const oldPerms = JSON.parse(sessionStorage.getItem('nohope_permissions') || '[]');
                    const oldRole = sessionStorage.getItem('cafe_role');
                    
                    if (JSON.stringify(newPerms) !== JSON.stringify(oldPerms) || newRole !== oldRole) {
                        sessionStorage.setItem('nohope_permissions', JSON.stringify(newPerms));
                        sessionStorage.setItem('cafe_role', newRole);
                        showAdminToast('Quản trị viên vừa cập nhật quyền truy cập của bạn! Hệ thống đang tải lại...', 'warning', 3000);
                        setTimeout(() => window.location.reload(), 3000);
                    }
                }
            })
            .subscribe();
    }

    window.hasPermission = function(perm) {
        if (sessionStorage.getItem('cafe_role') === 'admin') return true;
        try {
            const perms = JSON.parse(sessionStorage.getItem('nohope_permissions') || '[]');
            return perms.includes(perm);
        } catch(e) {
            return false;
        }
    }; // We redefine it here just in case, but it's already global

    const allTabsId = ['dashboard', 'orders', 'pos', 'history', 'tables', 'menu', 'inventory', 'restock', 'promo', 'customers', 'staff', 'analytics', 'audit', 'cashflow', 'shifts', 'qr', 'delivery', 'crm', 'settings'];
    let defaultTab = '';
    
    if (role !== 'admin') {
        allTabsId.forEach(tab => {
            const el = document.getElementById(`tab-${tab}`);
            const navEl = document.getElementById(`nav-${tab}`);
            if (el) {
                if (!window.canAccessTab(tab)) {
                    el.style.display = 'none';
                    if (navEl) navEl.style.display = 'none';
                } else {
                    el.style.display = '';
                    if (navEl) navEl.style.display = '';
                    if (!defaultTab) defaultTab = tab;
                }
            }
        });
        
        // Hide granular action elements based on write permissions
        const actionRules = [
            { query: 'button[onclick*="openProductModal"]', perm: 'menu_add' },
            { query: 'button[onclick*="openCategoryModal"]', perm: 'menu_category' },
            { query: 'button[onclick*="openIngredientModal"]', perm: 'inventory_edit' },
            { query: 'button[onclick*="openCreateRestockModal"]', perm: 'restock_create' },
            { query: 'button[onclick*="openCreateCashflowModal"]', perm: 'cashflow_create' },
            { query: 'button[onclick*="openPromoModal"]', perm: 'menu_promo' },
            { query: 'button[onclick*="openAdBannerModal"]', perm: 'menu_promo' },
            { query: 'button[onclick*="exportCashflowCSV"]', perm: 'cashflow_export' },
            { query: 'button[onclick*="exportRestockHistoryCSV"]', perm: 'cashflow_export' }
        ];

        actionRules.forEach(rule => {
            const els = document.querySelectorAll(rule.query);
            els.forEach(el => {
                if (!permissions.includes(rule.perm)) {
                    el.style.display = 'none';
                }
            });
        });

        // Add dynamic CSS to hide table action buttons class
        let cssRules = '';
        if (!permissions.includes('analytics_export')) cssRules += '.needs-analytics-export { display: none !important; } ';
        if (!permissions.includes('pos_create')) cssRules += '.needs-pos-create { display: none !important; } ';
        if (!permissions.includes('orders_status')) cssRules += '.needs-orders-status { display: none !important; } ';
        if (!permissions.includes('orders_discount')) cssRules += '.needs-orders-discount { display: none !important; } ';
        if (!permissions.includes('orders_payment')) cssRules += '.needs-orders-payment { display: none !important; } ';
        if (!permissions.includes('orders_cancel')) cssRules += '.needs-orders-cancel { display: none !important; } ';
        if (!permissions.includes('history_export')) cssRules += '.needs-history-export { display: none !important; } ';
        if (!permissions.includes('history_print')) cssRules += '.needs-history-print { display: none !important; } ';
        if (!permissions.includes('history_cancel')) cssRules += '.needs-history-cancel { display: none !important; } ';
        if (!permissions.includes('tables_add')) cssRules += '.needs-tables-add { display: none !important; } ';
        if (!permissions.includes('tables_edit')) cssRules += '.needs-tables-edit { display: none !important; } ';
        if (!permissions.includes('tables_delete')) cssRules += '.needs-tables-delete { display: none !important; } ';
        if (!permissions.includes('tables_qr')) cssRules += '.needs-tables-qr { display: none !important; } ';
        if (!permissions.includes('menu_add')) cssRules += '.needs-menu-add { display: none !important; } ';
        if (!permissions.includes('menu_edit')) cssRules += '.needs-menu-edit { display: none !important; } ';
        if (!permissions.includes('menu_delete')) cssRules += '.needs-menu-delete { display: none !important; } ';
        if (!permissions.includes('menu_category')) cssRules += '.needs-menu-category { display: none !important; } ';
        if (!permissions.includes('menu_promo')) cssRules += '.needs-menu-promo { display: none !important; } ';
        if (!permissions.includes('inventory_edit')) cssRules += '.needs-inventory-edit { display: none !important; } ';
        if (!permissions.includes('inventory_delete')) cssRules += '.needs-inventory-delete { display: none !important; } ';
        if (!permissions.includes('restock_create')) cssRules += '.needs-restock-create { display: none !important; } ';
        if (!permissions.includes('cashflow_create')) cssRules += '.needs-cashflow-create { display: none !important; } ';
        if (!permissions.includes('cashflow_edit')) cssRules += '.needs-cashflow-edit { display: none !important; } ';
        if (!permissions.includes('cashflow_delete')) cssRules += '.needs-cashflow-delete { display: none !important; } ';
        if (!permissions.includes('cashflow_export')) cssRules += '.needs-cashflow-export { display: none !important; } ';
        if (!permissions.includes('shifts_manage')) cssRules += '.needs-shifts-manage { display: none !important; } ';
        if (!permissions.includes('staff_add')) cssRules += '.needs-staff-add { display: none !important; } ';
        if (!permissions.includes('staff_edit')) cssRules += '.needs-staff-edit { display: none !important; } ';
        if (!permissions.includes('staff_permissions')) cssRules += '.needs-staff-permissions { display: none !important; } ';
        if (!permissions.includes('staff_delete')) cssRules += '.needs-staff-delete { display: none !important; } ';
        if (!permissions.includes('customers_edit')) cssRules += '.needs-customers-edit { display: none !important; } ';
        if (!permissions.includes('settings_manage')) cssRules += '.needs-settings-manage { display: none !important; } ';
        if (!permissions.includes('promo_manage')) cssRules += '.needs-promo-manage { display: none !important; } ';
        if (!permissions.includes('delivery_view')) cssRules += '.needs-delivery-view { display: none !important; } ';
        if (!permissions.includes('delivery_manage')) cssRules += '.needs-delivery-manage { display: none !important; } ';
        if (!permissions.includes('delivery_drivers')) cssRules += '.needs-delivery-drivers { display: none !important; } ';
        if (!permissions.includes('delivery_settings')) cssRules += '.needs-delivery-settings { display: none !important; } ';
        
        if (cssRules) {
            const style = document.createElement('style');
            style.innerHTML = cssRules;
            document.head.appendChild(style);
        }

        if (defaultTab) {
            switchTab(defaultTab);
        } else {
            document.querySelector('.content-section.active')?.classList.remove('active');
            const mainContent = document.querySelector('main');
            mainContent.innerHTML = '<div class="flex items-center justify-center h-full"><div class="text-center"><i class="fa-solid fa-lock text-slate-500 text-6xl mb-4"></i><h2 class="text-2xl text-slate-800">Bạn chưa được cấp quyền truy cập</h2><p class="text-slate-500 mt-2">Vui lòng liên hệ Quản trị viên</p></div></div>';
        }
    } else {
        allTabsId.forEach(tab => {
            const el = document.getElementById(`tab-${tab}`);
            const navEl = document.getElementById(`nav-${tab}`);
            if (el) el.style.display = '';
            if (navEl) navEl.style.display = '';
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
                const { count } = await supabase.from('orders').select('id', { count: 'exact', head: true })
                    .eq('tenant_id', window.AdminState.tenantId)
                    .in('status', ['Pending', 'Preparing']);
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
            .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${window.AdminState.tenantId}` }, updateBadge)
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
