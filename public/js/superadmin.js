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
                    btn.innerHTML = '<i class="fa-solid fa-lock-open me-2"></i> Unlock System';
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
            btn.innerHTML = '<i class="fa-solid fa-lock-open me-2"></i> Unlock System';
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

                showToast(data.message, 'success');
                
                // Close modal
                bootstrap.Modal.getInstance(document.getElementById('createTenantModal')).hide();
                
                // Clear form
                document.getElementById('create-tenant-form').reset();
                
                // Refresh dashboard
                await fetchAndRenderTenants();

            } catch (err) {
                console.error(err);
                showToast(err.message, 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = 'Initialize Tenant';
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
        const { data, error } = await supabase.rpc('get_all_tenants', { owner_secret: ownerSecret });
        if (error) {
            if (error.code === 'P0001') { // Invalid secret usually caught here
                document.getElementById('logout-btn').click();
                return;
            }
            throw error;
        }
        renderTenants(data);
    } catch (err) {
        console.error(err);
        showToast('Failed to fetch tenants', 'danger');
    }
}

function renderTenants(tenants) {
    const grid = document.getElementById('tenants-grid');
    
    document.getElementById('total-tenants-count').innerText = tenants ? tenants.length : 0;
    let totalUsers = 0;
    
    if (!tenants || tenants.length === 0) {
        grid.innerHTML = `
            <div class="text-center w-100 py-5 text-muted col-12">
                <i class="fa-solid fa-building-user fa-3x mb-3 opacity-50"></i>
                <p>No tenants registered yet.</p>
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
        
        html += `
            <div class="tenant-card">
                <div class="tenant-header">
                    <div>
                        <h3 class="tenant-name">${escapeHtml(t.name)}</h3>
                        <div class="tenant-id" onclick="copyTenantId('${t.id}')" style="cursor:pointer" title="Click to copy">${t.id}</div>
                    </div>
                </div>
                
                <div class="tenant-metrics">
                    <div class="metric">
                        <i class="fa-solid fa-users"></i>
                        <span>${t.total_staff || 0} Staff Active</span>
                    </div>
                    <div class="metric">
                        <i class="fa-solid fa-calendar-days"></i>
                        <span>${date}</span>
                    </div>
                </div>
                
                <div class="tenant-actions">
                    <button class="action-btn" onclick="copyTenantId('${t.id}')" title="Copy Tenant ID">
                        <i class="fa-regular fa-copy"></i> Copy ID
                    </button>
                    <button class="action-btn" title="Tenant Settings (Coming Soon)" disabled style="opacity:0.3">
                        <i class="fa-solid fa-gear"></i> Manage
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

function showToast(message, type = 'success') {
    const toastEl = document.getElementById('actionToast');
    const msgEl = document.getElementById('toast-message');
    
    msgEl.innerHTML = type === 'success' 
        ? `<i class="fa-solid fa-circle-check text-success me-2"></i> ${message}`
        : `<i class="fa-solid fa-triangle-exclamation text-danger me-2"></i> ${message}`;
        
    const toast = new bootstrap.Toast(toastEl);
    toast.show();
}
