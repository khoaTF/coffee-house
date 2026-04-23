// public/js/superadmin.js
let ownerSecret = sessionStorage.getItem('nohope_owner_secret') || '';

document.addEventListener('DOMContentLoaded', () => {
    
    // Auth flow
    if (ownerSecret) {
        showDashboard();
    }

    const authForm = document.getElementById('owner-auth-form');
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const secretInput = document.getElementById('owner-secret-input').value;
            const btn = document.getElementById('auth-submit-btn');
            const errDiv = document.getElementById('auth-error');
            
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Verifying...';
            errDiv.style.display = 'none';

            try {
                // Verify by making a ping request to get_all_tenants
                const { data, error } = await supabase.rpc('get_all_tenants', { owner_secret: secretInput });
                
                if (error) throw error;
                
                ownerSecret = secretInput;
                sessionStorage.setItem('nohope_owner_secret', ownerSecret);
                showDashboard(data); // Pass data so we don't fetch twice initially

            } catch (err) {
                console.error(err);
                errDiv.innerText = "Access Denied: Invalid Owner Secret / Server Error";
                errDiv.style.display = 'block';
                setTimeout(() => {
                    btn.disabled = false;
                    btn.innerHTML = `<i class="fa-solid fa-lock-open me-2"></i> ${window.t ? window.t('superadmin.unlock_btn') : 'Unlock System'}`;
                }, 1000);
            }
        });
    }

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('nohope_owner_secret');
            ownerSecret = '';
            document.getElementById('dashboard-screen').style.display = 'none';
            document.getElementById('auth-screen').style.display = 'flex';
            document.getElementById('owner-secret-input').value = '';
            
            const btn = document.getElementById('auth-submit-btn');
            btn.disabled = false;
            btn.innerHTML = `<i class="fa-solid fa-lock-open me-2"></i> ${window.t ? window.t('superadmin.unlock_btn') : 'Unlock System'}`;
        });
    }

    const searchInput = document.getElementById('tenant-search');
    if (searchInput) {
        searchInput.addEventListener('input', applyFilters);
    }
    const statusSelect = document.getElementById('status-filter');
    if (statusSelect) {
        statusSelect.addEventListener('change', applyFilters);
    }

    const manageTierSelect = document.getElementById('manage-tenant-tier');
    if (manageTierSelect) {
        manageTierSelect.addEventListener('change', (e) => {
            const val = e.target.value;
            if(!val) return;
            const expiryInput = document.getElementById('manage-tenant-expiry');
            const maxStaffInput = document.getElementById('manage-tenant-max-staff');
            const maxItemsInput = document.getElementById('manage-tenant-max-items');
            
            let daysToLoc = new Date();
            if (val === 'trial') {
                daysToLoc.setDate(daysToLoc.getDate() + 7);
                maxStaffInput.value = 5;
                maxItemsInput.value = 50;
            } else if (val === 'basic') {
                daysToLoc.setDate(daysToLoc.getDate() + 30);
                maxStaffInput.value = 10;
                maxItemsInput.value = 200;
            } else if (val === 'premium') {
                daysToLoc.setDate(daysToLoc.getDate() + 365);
                maxStaffInput.value = 50;
                maxItemsInput.value = 9999;
            }
            daysToLoc.setMinutes(daysToLoc.getMinutes() - daysToLoc.getTimezoneOffset());
            expiryInput.value = daysToLoc.toISOString().slice(0, 16);
        });
    }

    const confirmCreateBtn = document.getElementById('confirm-create-btn');
    if (confirmCreateBtn) {
        confirmCreateBtn.addEventListener('click', async () => {
            const clientName = document.getElementById('new-client-name').value.trim();
            const adminPin = document.getElementById('new-admin-pin').value.trim();
            
            if(!clientName || !adminPin) {
                showToast('Please fill all fields', 'danger');
                return;
            }

            const btn = document.getElementById('confirm-create-btn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Provisioning...';

            try {
                const { data, error } = await supabase.rpc('create_new_client', {
                    client_name: clientName,
                    admin_pin: adminPin,
                    owner_secret: ownerSecret
                });

                if(error) throw error;

                showToast('Chi nhánh "' + clientName + '" đã tạo thành công!', 'success');
                
                // Immediately apply tier if chosen
                const tier = document.getElementById('new-client-tier').value;
                if(tier !== 'trial' && data?.tenant_id) {
                    let daysToAdd = tier === 'basic' ? 30 : 365;
                    let newExp = new Date();
                    newExp.setDate(newExp.getDate() + daysToAdd);
                    await supabase.rpc('update_tenant_subscription', {
                        p_tenant_id: data.tenant_id,
                        p_end_date: newExp.toISOString(),
                        p_max_staff: tier === 'basic' ? 10 : 50,
                        p_max_items: tier === 'basic' ? 200 : 9999,
                        owner_secret: ownerSecret
                    });
                }
                
                // Close modal safely
                const createModal = bootstrap.Modal.getInstance(document.getElementById('createTenantModal'));
                if (createModal) createModal.hide();
                
                // Clear form
                document.getElementById('create-tenant-form').reset();

            } catch (err) {
                console.error(err);
                showToast(err.message, 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = window.t ? window.t('superadmin.create_btn') : 'Create Workspace';
                // Always refresh dashboard
                await fetchAndRenderTenants();
            }
        });
    }

    const confirmUpdateCmdBtn = document.getElementById('confirm-update-tenant-btn');
    if (confirmUpdateCmdBtn) {
        confirmUpdateCmdBtn.addEventListener('click', async () => {
            const tenantId = document.getElementById('manage-tenant-id').value;
                const newStatus = document.getElementById('manage-tenant-status').value;
            const newExpiry = document.getElementById('manage-tenant-expiry').value;
            const newMaxStaff = document.getElementById('manage-tenant-max-staff').value;
            const newMaxItems = document.getElementById('manage-tenant-max-items').value;
            
            confirmUpdateCmdBtn.disabled = true;
            confirmUpdateCmdBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Saving...';

            try {
                // Update Status
                const { error: err1 } = await supabase.rpc('update_tenant_status', {
                    target_tenant_id: tenantId,
                    new_status: newStatus,
                    owner_secret: ownerSecret
                });
                if(err1) throw err1;

                // Update Limits & Expiry
                if(newExpiry) {
                    const { error: err2 } = await supabase.rpc('update_tenant_subscription', {
                        p_tenant_id: tenantId,
                        p_end_date: new Date(newExpiry).toISOString(),
                        p_max_staff: parseInt(newMaxStaff) || 5,
                        p_max_items: parseInt(newMaxItems) || 50,
                        owner_secret: ownerSecret
                    });
                    if(err2) throw err2;
                }

                // Update Branding & Integrations
                const newDomain = document.getElementById('manage-tenant-domain').value.trim();
                const newLogo = document.getElementById('manage-tenant-logo').value.trim();
                const newColor = document.getElementById('manage-tenant-color').value.trim();
                const newZnsUrl = document.getElementById('manage-tenant-zns').value.trim();
                
                let integrations = {};
                if(newZnsUrl) {
                    integrations.zns_webhook = newZnsUrl;
                }

                const { error: errBrand } = await supabase.rpc('update_tenant_brand', {
                    owner_secret: ownerSecret,
                    p_tenant_id: tenantId,
                    p_custom_domain: newDomain || null,
                    p_primary_color: newColor || '#c084fc',
                    p_logo_url: newLogo || '/images/bunny_logo.png',
                    p_integrations: integrations
                });
                
                if(errBrand) throw errBrand;

                showToast('Tenant updated successfully', 'success');
                
                // Close modal safely
                const manageModal = bootstrap.Modal.getInstance(document.getElementById('manageTenantModal'));
                if (manageModal) manageModal.hide();

            } catch (err) {
                console.error(err);
                showToast(err.message, 'danger');
            } finally {
                confirmUpdateCmdBtn.disabled = false;
                confirmUpdateCmdBtn.innerHTML = window.t ? window.t('superadmin.save_btn') : 'Save Tenant Info';
                // Always refresh dashboard
                await fetchAndRenderTenants();
            }
        });
    }

    const broadcastBtn = document.getElementById('send-broadcast-btn');
    if (broadcastBtn) {
        broadcastBtn.addEventListener('click', async () => {
            const msg = document.getElementById('broadcast-message').value.trim();
            const type = document.getElementById('broadcast-type').value;
            
            if(!msg) return showToast('Please enter a message', 'danger');
            
            broadcastBtn.disabled = true;
            broadcastBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
            
            try {
                const { error } = await supabase.rpc('create_broadcast', {
                    p_message: msg,
                    p_alert_type: type,
                    owner_secret: ownerSecret
                });
                if(error) throw error;
                showToast('Broadcast sent globally!', 'success');
                document.getElementById('broadcast-message').value = '';
            } catch(e) {
                showToast(e.message, 'danger');
            } finally {
                broadcastBtn.disabled = false;
                broadcastBtn.innerHTML = window.t ? window.t('superadmin.broadcast_btn') : 'Send Alert';
            }
        });
    }
});

async function showDashboard(preloadedData = null) {
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('dashboard-screen').style.display = 'block';
    
    if (preloadedData) {
        renderTenants(preloadedData);
    } else {
        await fetchAndRenderTenants();
    }
}

async function fetchAndRenderTenants() {
    try {
        const { data: analytics, error: errAnalytic } = await supabase.rpc('get_superadmin_analytics', { owner_secret: ownerSecret });
        if(!errAnalytic && analytics && analytics.length > 0) {
            const a = analytics[0];
            document.getElementById('total-revenue-count').innerText = new Intl.NumberFormat('vi-VN').format(a.total_revenue || 0) + 'đ';
            document.getElementById('total-tenants-count').innerText = a.active_tenants || 0;
            document.getElementById('total-users-count').innerText = a.total_staff || 0;
        }

        const { data, error } = await supabase.rpc('get_all_tenants', { owner_secret: ownerSecret });
        if (error) {
            if (error.code === 'P0001') { // Invalid secret usually caught here
                document.getElementById('logout-btn').click();
                return;
            }
            throw error;
        }
        window.allTenants = data || [];
        applyFilters();
    } catch (err) {
        console.error(err);
        showToast('Failed to fetch tenants', 'danger');
    }
}

function applyFilters() {
    if (!window.allTenants) return;
    
    const searchTerm = (document.getElementById('tenant-search')?.value || '').toLowerCase();
    const statusVal = document.getElementById('status-filter')?.value || 'all';
    
    const filtered = window.allTenants.filter(t => {
        const matchesSearch = t.name?.toLowerCase().includes(searchTerm) || (t.custom_domain && t.custom_domain.toLowerCase().includes(searchTerm)) || t.id.includes(searchTerm);
        
        let matchesStatus = true;
        if (statusVal !== 'all') {
            const isExpired = t.subscription_end_date ? new Date(t.subscription_end_date) < new Date() : false;
            
            // Check expiring within 7 days
            let isExpiringSoon = false;
            if (!isExpired && t.subscription_end_date) {
                const diffTime = new Date(t.subscription_end_date) - new Date();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                if (diffDays <= 7) isExpiringSoon = true;
            }

            if (statusVal === 'active' && t.status !== 'active') matchesStatus = false;
            if (statusVal === 'suspended' && t.status !== 'suspended') matchesStatus = false;
            if (statusVal === 'expiring' && !isExpiringSoon) matchesStatus = false;
            if (statusVal === 'expired' && !isExpired) matchesStatus = false;
        }
        
        return matchesSearch && matchesStatus;
    });
    
    renderTenants(filtered);
}

function renderTenants(tenants) {
    const grid = document.getElementById('tenants-grid');
    
    document.getElementById('total-tenants-count').innerText = tenants ? tenants.length : 0;
    let totalUsers = 0;
    
    if (!tenants || tenants.length === 0) {
        grid.innerHTML = `
            <div class="text-center w-100 py-5 text-muted col-12">
                <i class="fa-solid fa-building-user fa-3x mb-3 opacity-50"></i>
                <p>${window.t ? window.t('superadmin.card_no_tenants') : 'No tenants registered yet.'}</p>
            </div>
        `;
        document.getElementById('total-users-count').innerText = "0";
        return;
    }

    let html = '';
    tenants.forEach(t => {
        totalUsers += (t.total_staff || 0);
        const date = new Date(t.created_at).toLocaleDateString('vi-VN', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
        
        let statusColor = 'success';
        let statusText = window.t ? window.t('superadmin.filter_active') : 'Active';
        if (t.status === 'suspended') {
            statusColor = 'danger';
            statusText = window.t ? window.t('superadmin.filter_suspended') : 'Suspended';
        }

        const expiryDateStr = t.subscription_end_date ? new Date(t.subscription_end_date).toLocaleDateString('vi-VN') : 'N/A';
        const isExpired = t.subscription_end_date ? new Date(t.subscription_end_date) < new Date() : false;
        
        let isExpiringSoon = false;
        if (!isExpired && t.subscription_end_date) {
            const diffTime = new Date(t.subscription_end_date) - new Date();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays <= 7) isExpiringSoon = true;
        }

        const safeObjStr = JSON.stringify({
            id: t.id,
            name: t.name,
            status: t.status || 'active',
            expiry: t.subscription_end_date || '',
            max_staff: t.max_staff || 5,
            max_items: t.max_items || 50,
            custom_domain: t.custom_domain || '',
            primary_color: t.primary_color || '#c084fc',
            logo_url: t.logo_url || '',
            integrations: t.integrations || {}
        }).replace(/"/g, '&quot;');

        html += `
            <div class="tenant-card border-${statusColor} border-opacity-25 ${isExpired ? 'border-warning opacity-75' : ''}">
                <div class="tenant-header">
                    <div>
                        <h3 class="tenant-name d-flex align-items-center">
                            ${escapeHtml(t.name)}
                            <span class="badge bg-${statusColor} bg-opacity-25 text-${statusColor} ms-2 px-2 py-1 border border-${statusColor} border-opacity-25" style="font-size: 0.6rem; vertical-align: middle;">${statusText}</span>
                            ${isExpired ? `<span class="badge bg-warning text-dark ms-1" style="font-size:0.6rem;">${window.t ? window.t('superadmin.card_expired') : 'EXPIRED'}</span>` : (isExpiringSoon ? `<span class="badge bg-info text-dark ms-1" style="font-size:0.6rem;">${window.t ? window.t('superadmin.card_expiring') : 'EXPIRING SOON'}</span>` : '')}
                        </h3>
                        <div class="tenant-id" onclick="copyTenantId('${t.id}')" style="cursor:pointer" title="Click to copy">${t.id}</div>
                    </div>
                </div>
                
                <div class="tenant-metrics flex-wrap">
                    <div class="metric w-100 mb-1 text-success font-bold">
                        <i class="fa-solid fa-money-bill-wave"></i>
                        <span>${new Intl.NumberFormat('vi-VN').format(t.total_revenue || 0)}đ ${window.t ? window.t('superadmin.card_rev') : 'Rev'}</span>
                    </div>
                    <div class="metric" style="width: 45%;">
                        <i class="fa-solid fa-users ${(t.staff_count || 0) > (t.max_staff || 5) ? 'text-danger' : ''}"></i>
                        <span class="${(t.staff_count || 0) > (t.max_staff || 5) ? 'text-danger fw-bold' : ''}" title="${(t.staff_count || 0) > (t.max_staff || 5) ? 'Over limit (Downgraded)' : ''}">${t.staff_count || 0}/${t.max_staff || 5} ${window.t ? window.t('superadmin.card_staff') : 'Staff'}</span>
                    </div>
                    <div class="metric" style="width: 45%;">
                        <i class="fa-solid fa-hourglass-end ${isExpired ? 'text-danger' : ''}"></i>
                        <span class="${isExpired ? 'text-danger' : ''}">${expiryDateStr}</span>
                    </div>
                </div>
                
                <div class="tenant-actions">
                    <button class="action-btn" onclick="copyTenantId('${t.id}')" title="Copy Tenant ID">
                        <i class="fa-regular fa-copy"></i> ${window.t ? window.t('superadmin.card_copy_id') : 'Copy ID'}
                    </button>
                    <button class="action-btn text-primary border-primary border-opacity-25 bg-primary bg-opacity-10" title="Tenant Settings" onclick="openManageModal(this)" data-tenant="${safeObjStr}">
                        <i class="fa-solid fa-gear"></i> ${window.t ? window.t('superadmin.btn_manage') : 'Manage'}
                    </button>
                </div>
            </div>
        `;
    });
    
    document.getElementById('total-users-count').innerText = totalUsers;
    grid.innerHTML = html;
}

function escapeHtml(unsafe) {
    return (unsafe || '').toString()
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}

function copyTenantId(id) {
    navigator.clipboard.writeText(id).then(() => {
        showToast('Tenant ID copied to clipboard!', 'success');
    });
}

function openManageModal(btnEl) {
    try {
        const tenantDataStr = btnEl.getAttribute('data-tenant');
        if (!tenantDataStr) return;
        const t = JSON.parse(tenantDataStr);
        
        document.getElementById('manage-tenant-id').value = t.id;
        document.getElementById('manage-tenant-id-display').value = t.id;
        document.getElementById('manage-tenant-name-display').innerText = t.name;
        document.getElementById('manage-tenant-status').value = t.status || 'active';
        
        // Expiry date format for datetime-local: YYYY-MM-DDTHH:MM
        if (t.expiry) {
            const dateObj = new Date(t.expiry);
            if (!isNaN(dateObj.getTime())) {
                dateObj.setMinutes(dateObj.getMinutes() - dateObj.getTimezoneOffset());
                document.getElementById('manage-tenant-expiry').value = dateObj.toISOString().slice(0, 16);
            }
        }
        document.getElementById('manage-tenant-max-staff').value = t.max_staff;
        document.getElementById('manage-tenant-max-items').value = t.max_items;

        document.getElementById('manage-tenant-domain').value = t.custom_domain || '';
        document.getElementById('manage-tenant-color').value = t.primary_color || '#c084fc';
        document.getElementById('manage-tenant-logo').value = t.logo_url || '';
        document.getElementById('manage-tenant-zns').value = t.integrations?.zns_webhook || '';
        
        const modalEl = document.getElementById('manageTenantModal');
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    } catch(e) {
        console.error("Error opening manage modal:", e);
    }
}

async function impersonateTenant() {
    const tenantId = document.getElementById('manage-tenant-id').value;
    const tenantName = document.getElementById('manage-tenant-name-display').innerText;

    if(!confirm(`Login as Administrator for ${tenantName}?`)) return;

    // We can simulate an admin session manually bypassing auth (only valid for this browser context)
    // We will open admin.html in a new tab by injecting sessionStorage variables.
    
    // Create a new window
    const newWindow = window.open('admin.html', '_blank');
    if(newWindow) {
        // Because of same-origin policy, we can set session data before the page loads
        // Sometimes it's safer to use search params if session storage isn't shared across tabs instantly
        // A safer way is to store a temporary token or use localStorage (which is shared)
        newWindow.sessionStorage.setItem('nohope_staff_id', 'superadmin-override');
        newWindow.sessionStorage.setItem('nohope_tenant_id', tenantId);
        newWindow.sessionStorage.setItem('cafe_role', 'admin');
        newWindow.sessionStorage.setItem('nohope_staff_name', 'Super Admin Override');
        newWindow.sessionStorage.setItem('tenant_name', tenantName);
        newWindow.sessionStorage.setItem('nohope_permissions', JSON.stringify(['all']));
    } else {
        showToast("Popup blocked! Please allow popups for this site.", "danger");
    }
}

async function resetTenantPin() {
    const tenantId = document.getElementById('manage-tenant-id').value;
    const tenantName = document.getElementById('manage-tenant-name-display').innerText;
    
    const newPin = prompt(`Please enter a NEW 6-digit PIN for the Admin account of ${tenantName}:`);
    if(!newPin || newPin.length < 4) {
        return showToast('Reset cancelled or PIN too short.', 'warning');
    }

    try {
        const { error } = await supabase.rpc('force_reset_pin', {
            owner_secret: ownerSecret,
            p_tenant_id: tenantId,
            p_new_pin: newPin
        });
        
        if (error) throw error;
        showToast('Admin PIN reset successfully!', 'success');
    } catch(err) {
        console.error(err);
        showToast(err.message, 'danger');
    }
}

async function deleteTenant() {
    const tenantId = document.getElementById('manage-tenant-id').value;
    const tenantName = document.getElementById('manage-tenant-name-display').innerText;

    const userInput = prompt(`DANGER ZONE: This will permanently delete all data (settings, menus, staff, orders) for "${tenantName}".\nType "${tenantName}" exactly to confirm deletion:`);
    if (userInput !== tenantName) {
        return showToast("Name mismatch. Deletion cancelled.", "warning");
    }

    const btn = document.getElementById('btn-delete-tenant');
    const oldText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Deleting...';

    try {
        const { error } = await supabase.rpc('delete_tenant', {
            owner_secret: ownerSecret,
            p_tenant_id: tenantId
        });
        if (error) throw error;

        showToast('Tenant permanently deleted.', 'success');
        
        // Hide Modal safely
        const delModal = bootstrap.Modal.getInstance(document.getElementById('manageTenantModal'));
        if (delModal) delModal.hide();

    } catch(err) {
        console.error(err);
        showToast(err.message, 'danger');
    } finally {
        btn.disabled = false;
        btn.innerHTML = oldText;
        // Always refresh dashboard
        await fetchAndRenderTenants();
    }
}


function showToast(message, type = 'success') {
    const toastEl = document.getElementById('actionToast');
    const msgEl = document.getElementById('toast-message');
    
    msgEl.innerHTML = type === 'success' 
        ? `<i class="fa-solid fa-circle-check text-success me-2"></i> ${message}`
        : `<i class="fa-solid fa-triangle-exclamation text-danger me-2"></i> ${message}`;
        
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
