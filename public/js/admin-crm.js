// =============================================
// ADMIN CRM MODULE - RFM Segmentation (Phase 5)
// =============================================

/**
 * Fetch data from customer_rfm_segments view and populate the CRM dashboard.
 */
async function renderCrmDashboard() {
    try {
        const { data, error } = await supabase
            .from('customer_rfm_segments')
            .select('*')
            .eq('tenant_id', window.AdminState.tenantId)
            .order('total_spent', { ascending: false });

        if (error) {
            console.error("PostgREST Error in CRM view:", error);
            // Non-blocking fallback if the view is not completely populated yet
            document.getElementById('crm-table-body').innerHTML = '<tr><td colspan="7" class="text-center text-danger py-4">Không thể tải dữ liệu phân khúc (Vui lòng kiểm tra Server)</td></tr>';
            return;
        }

        // 1. Process KPI Stats
        let vvip = 0, loyal = 0, atRisk = 0, newCust = 0;
        data.forEach(c => {
            if (c.segment === 'VVIP') vvip++;
            else if (c.segment === 'Loyal') loyal++;
            else if (c.segment === 'At Risk') atRisk++;
            else if (c.segment === 'New') newCust++;
        });

        // 2. Update KPI DOM
        const vvipEl = document.getElementById('crm-vvip-count');
        const loyalEl = document.getElementById('crm-loyal-count');
        const atRiskEl = document.getElementById('crm-atrisk-count');
        const newEl = document.getElementById('crm-new-count');

        if (vvipEl) vvipEl.textContent = vvip;
        if (loyalEl) loyalEl.textContent = loyal;
        if (atRiskEl) atRiskEl.textContent = atRisk;
        if (newEl) newEl.textContent = newCust;

        // 3. Render Table
        const tbody = document.getElementById('crm-table-body');
        if (!tbody) return;

        if (data.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">Chưa có dữ liệu khách hàng</td></tr>';
            return;
        }

        tbody.innerHTML = data.map(c => {
            // Determine badge color based on segment
            let badgeClass = 'bg-secondary';
            if (c.segment === 'VVIP') badgeClass = 'bg-danger text-light shadow-sm';
            else if (c.segment === 'Loyal') badgeClass = 'bg-primary text-light shadow-sm';
            else if (c.segment === 'At Risk') badgeClass = 'bg-warning text-dark shadow-sm';
            else if (c.segment === 'New') badgeClass = 'bg-info text-dark shadow-sm';
            else if (c.segment === 'Regular') badgeClass = 'bg-light text-dark border';

            const lastOrderStr = c.last_order_date ? new Date(c.last_order_date).toLocaleDateString('vi-VN') : 'Chưa có';
            const customerName = c.name || 'Khách vãng lai';
            const customerPhone = c.phone || 'Không có';

            return `
                <tr class="align-middle">
                    <td class="fw-bold">${customerName}</td>
                    <td>${customerPhone}</td>
                    <td class="text-start">
                        <span class="badge ${badgeClass} fs-7 px-3 py-2 rounded-pill">${c.segment}</span>
                    </td>
                    <td class="text-center fw-semibold text-primary">${c.total_orders || 0}</td>
                    <td class="text-end fw-bold text-success">${(c.total_spent || 0).toLocaleString('vi-VN')} ₫</td>
                    <td class="text-center">${lastOrderStr}</td>
                    <td class="text-center">
                        <button class="btn btn-sm btn-outline-[#C0A062] rounded-circle" title="Xem chi tiết" onclick="viewCustomerFromCrm('${c.id}', '${c.phone}')">
                            <i class="fa-solid fa-arrow-right"></i>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

    } catch (e) {
        console.error("Lỗi tải dữ liệu CRM:", e);
        if (typeof showAdminToast === 'function') showAdminToast('Lỗi tải dữ liệu Marketing & CRM, vui lòng thử lại', 'error');
    }
}

/**
 * Handle routing to Customer Tab from CRM Dashboard
 */
function viewCustomerFromCrm(id, phone) {
    // Attempt to switch to the Customers tab
    if (typeof switchTab === 'function') {
        switchTab('customers');
        // Optionally, pre-fill search input if available
        const searchInput = document.getElementById('search-customer-input');
        if (searchInput && phone && phone !== 'Không có') {
            searchInput.value = phone;
            // Trigger input event to filter customer table immediately
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}

// Ensure the render map is attached logically. 
// Can be refreshed when socket picks up new orders if 'section-crm' is active.
