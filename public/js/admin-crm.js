// =============================================
// ADMIN CRM MODULE — Phase 8: Customer Insights & Retention
// =============================================

let crmSegmentChartInstance = null;
let crmGrowthChartInstance = null;
let crmFullData = []; // cache for filtering

/**
 * Main entry: fetch data, render KPIs, charts, and table.
 */
async function renderCrmDashboard() {
    try {
        // 1. Fetch RFM segments
        const { data: rfmData, error: rfmErr } = await supabase
            .from('customer_rfm_segments')
            .select('*')
            .eq('tenant_id', window.AdminState.tenantId)
            .order('total_spent', { ascending: false });

        if (rfmErr) {
            console.error("CRM fetch error:", rfmErr);
            document.getElementById('crm-table-body').innerHTML = '<tr><td colspan="8" class="text-center text-danger py-4">Không thể tải dữ liệu CRM</td></tr>';
            return;
        }

        crmFullData = rfmData || [];

        // 2. Fetch all customers for growth chart
        const { data: allCustomers } = await supabase
            .from('customers')
            .select('created_at')
            .eq('tenant_id', window.AdminState.tenantId);

        // Render all sections
        renderCrmKpis(crmFullData);
        renderSegmentChart(crmFullData);
        renderGrowthChart(allCustomers || []);
        renderCrmTable(crmFullData);

    } catch (e) {
        console.error("Lỗi tải CRM:", e);
        if (typeof showAdminToast === 'function') showAdminToast('Lỗi tải dữ liệu CRM', 'error');
    }
}

// =============================================
// 8A — KPI CARDS
// =============================================
function renderCrmKpis(data) {
    const container = document.getElementById('crm-kpi-container');
    if (!container) return;

    const totalCustomers = data.length;
    const totalSpentAll = data.reduce((s, c) => s + (c.total_spent || 0), 0);
    const avgClv = totalCustomers > 0 ? Math.round(totalSpentAll / totalCustomers) : 0;

    // Retention: customers with > 1 orders and last order within 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const returningCustomers = data.filter(c => (c.total_orders || 0) > 1 && c.last_order_date && new Date(c.last_order_date) >= thirtyDaysAgo).length;
    const eligibleForReturn = data.filter(c => (c.total_orders || 0) >= 1).length;
    const retentionRate = eligibleForReturn > 0 ? Math.round((returningCustomers / eligibleForReturn) * 100) : 0;

    // Active VIP (Gold/Diamond = total_spent >= 500k)
    const activeVip = data.filter(c => (c.total_spent || 0) >= 500000 && c.last_order_date && new Date(c.last_order_date) >= thirtyDaysAgo).length;

    // Segment counts
    const segCounts = { 'VVIP': 0, 'Loyal': 0, 'At Risk': 0, 'New': 0, 'Regular': 0 };
    data.forEach(c => {
        const seg = c.rfm_segment || c.segment || 'Regular';
        if (segCounts.hasOwnProperty(seg)) segCounts[seg]++;
        else segCounts['Regular']++;
    });

    container.innerHTML = `
        <div class="card bg-gradient-to-br from-emerald-50 to-emerald-100 border border-emerald-200 rounded-2xl p-4 shadow-soft">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-emerald-600 uppercase tracking-wider">Tổng Khách hàng</span>
                <span class="w-8 h-8 rounded-full bg-emerald-500 text-white flex items-center justify-center text-sm"><i class="fa-solid fa-users"></i></span>
            </div>
            <div class="text-3xl font-black text-emerald-800">${totalCustomers.toLocaleString('vi-VN')}</div>
            <div class="text-xs text-emerald-600 mt-1"><i class="fa-solid fa-chart-line me-1"></i>${segCounts.New} khách mới</div>
        </div>
        <div class="card bg-gradient-to-br from-amber-50 to-amber-100 border border-amber-200 rounded-2xl p-4 shadow-soft">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-amber-700 uppercase tracking-wider">Avg. CLV</span>
                <span class="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center text-sm"><i class="fa-solid fa-sack-dollar"></i></span>
            </div>
            <div class="text-3xl font-black text-amber-800">${avgClv.toLocaleString('vi-VN')}₫</div>
            <div class="text-xs text-amber-600 mt-1"><i class="fa-solid fa-wallet me-1"></i>Trung bình/khách</div>
        </div>
        <div class="card bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-2xl p-4 shadow-soft">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-blue-600 uppercase tracking-wider">Retention Rate</span>
                <span class="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm"><i class="fa-solid fa-rotate"></i></span>
            </div>
            <div class="text-3xl font-black text-blue-800">${retentionRate}%</div>
            <div class="text-xs text-blue-600 mt-1"><i class="fa-solid fa-clock me-1"></i>${returningCustomers} quay lại/30 ngày</div>
        </div>
        <div class="card bg-gradient-to-br from-purple-50 to-purple-100 border border-purple-200 rounded-2xl p-4 shadow-soft">
            <div class="flex items-center justify-between mb-2">
                <span class="text-xs font-bold text-purple-600 uppercase tracking-wider">Active VIP</span>
                <span class="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm"><i class="fa-solid fa-crown"></i></span>
            </div>
            <div class="text-3xl font-black text-purple-800">${activeVip}</div>
            <div class="text-xs text-purple-600 mt-1"><i class="fa-solid fa-gem me-1"></i>Silver+ hoạt động</div>
        </div>
    `;
}

// =============================================
// 8B — SEGMENT DISTRIBUTION CHART (Doughnut)
// =============================================
function renderSegmentChart(data) {
    const canvas = document.getElementById('crm-segment-chart');
    if (!canvas) return;

    const segCounts = { 'VVIP': 0, 'Loyal': 0, 'Regular': 0, 'At Risk': 0, 'New': 0 };
    data.forEach(c => {
        const seg = c.rfm_segment || c.segment || 'Regular';
        if (segCounts.hasOwnProperty(seg)) segCounts[seg]++;
        else segCounts['Regular']++;
    });

    if (crmSegmentChartInstance) crmSegmentChartInstance.destroy();

    crmSegmentChartInstance = new Chart(canvas, {
        type: 'doughnut',
        data: {
            labels: ['💎 VVIP', '🤝 Loyal', '📊 Regular', '⚠️ At Risk', '🆕 New'],
            datasets: [{
                data: [segCounts.VVIP, segCounts.Loyal, segCounts.Regular, segCounts['At Risk'], segCounts.New],
                backgroundColor: [
                    'rgba(220, 38, 38, 0.85)',  // red - VVIP
                    'rgba(59, 130, 246, 0.85)',  // blue - Loyal
                    'rgba(100, 116, 139, 0.7)',  // slate - Regular
                    'rgba(245, 158, 11, 0.85)',  // amber - At Risk
                    'rgba(16, 185, 129, 0.85)'   // emerald - New
                ],
                borderWidth: 2,
                borderColor: '#fff',
                hoverOffset: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '65%',
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { padding: 16, usePointStyle: true, pointStyleWidth: 10, font: { size: 12, weight: '600' } }
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const total = ctx.dataset.data.reduce((a, b) => a + b, 0);
                            const pct = total > 0 ? Math.round((ctx.raw / total) * 100) : 0;
                            return ` ${ctx.label}: ${ctx.raw} (${pct}%)`;
                        }
                    }
                }
            }
        }
    });
}

// =============================================
// 8C — CUSTOMER GROWTH CHART (Line)
// =============================================
function renderGrowthChart(allCustomers) {
    const canvas = document.getElementById('crm-growth-chart');
    if (!canvas) return;

    // Group by month (last 6 months)
    const now = new Date();
    const months = [];
    const counts = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const label = d.toLocaleDateString('vi-VN', { month: 'short', year: 'numeric' });
        months.push(label);

        const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
        const count = allCustomers.filter(c => {
            const cd = new Date(c.created_at);
            return cd >= monthStart && cd <= monthEnd;
        }).length;
        counts.push(count);
    }

    if (crmGrowthChartInstance) crmGrowthChartInstance.destroy();

    crmGrowthChartInstance = new Chart(canvas, {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Khách hàng mới',
                data: counts,
                borderColor: 'rgba(16, 185, 129, 1)',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4,
                borderWidth: 3,
                pointRadius: 5,
                pointBackgroundColor: '#fff',
                pointBorderColor: 'rgba(16, 185, 129, 1)',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1, font: { size: 11 } },
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    ticks: { font: { size: 11 } },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${ctx.raw} khách mới`
                    }
                }
            }
        }
    });
}

// =============================================
// 8D — ENHANCED CRM TABLE with Filter & Search
// =============================================
function renderCrmTable(data) {
    const tbody = document.getElementById('crm-table-body');
    if (!tbody) return;

    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-6">Chưa có dữ liệu khách hàng</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(c => {
        const seg = c.rfm_segment || c.segment || 'Regular';

        // Badge styling per segment
        let badgeClass = 'bg-secondary text-white';
        if (seg === 'VVIP') badgeClass = 'bg-red-500 text-white';
        else if (seg === 'Loyal') badgeClass = 'bg-blue-500 text-white';
        else if (seg === 'At Risk') badgeClass = 'bg-amber-500 text-dark';
        else if (seg === 'New') badgeClass = 'bg-emerald-500 text-white';
        else badgeClass = 'bg-slate-200 text-slate-700';

        // VIP tier
        const spent = c.total_spent || 0;
        let tierBadge = '<span class="text-xs text-slate-400">Bronze 🥉</span>';
        if (spent >= 5000000) tierBadge = '<span class="text-xs font-bold text-cyan-600">Diamond 💎</span>';
        else if (spent >= 2000000) tierBadge = '<span class="text-xs font-bold text-amber-600">Gold 👑</span>';
        else if (spent >= 500000) tierBadge = '<span class="text-xs font-bold text-slate-500">Silver 🥈</span>';

        // Days since last order
        let daysSince = '—';
        let daysSinceClass = 'text-slate-400';
        if (c.last_order_date) {
            const diff = Math.floor((new Date() - new Date(c.last_order_date)) / (1000 * 60 * 60 * 24));
            daysSince = diff + ' ngày';
            if (diff <= 7) daysSinceClass = 'text-emerald-600 font-bold';
            else if (diff <= 30) daysSinceClass = 'text-blue-600';
            else if (diff <= 60) daysSinceClass = 'text-amber-600';
            else daysSinceClass = 'text-red-500 font-bold';
        }

        const name = c.name || 'Khách vãng lai';
        const phone = c.phone || '—';
        const points = c.current_points || 0;

        return `
            <tr class="align-middle hover:bg-slate-50 transition-colors">
                <td class="fw-semibold px-4 py-3">${escapeHTML(name)}</td>
                <td class="px-4 py-3 text-slate-600">${phone}</td>
                <td class="px-4 py-3"><span class="badge ${badgeClass} rounded-pill px-3 py-1.5 text-xs font-bold">${seg}</span></td>
                <td class="px-4 py-3 text-center">${tierBadge}</td>
                <td class="px-4 py-3 text-center text-amber-600 font-bold"><i class="fa-solid fa-star text-xs me-1"></i>${points}</td>
                <td class="px-4 py-3 text-center font-semibold text-slate-700">${c.total_orders || 0}</td>
                <td class="px-4 py-3 text-end font-bold text-emerald-700">${spent.toLocaleString('vi-VN')}₫</td>
                <td class="px-4 py-3 text-center ${daysSinceClass}">${daysSince}</td>
            </tr>
        `;
    }).join('');
}

// Helper: escape HTML
function escapeHTML(str) {
    if (typeof window.escapeHTML === 'function') return window.escapeHTML(str);
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Filter CRM table by segment dropdown and search input.
 */
function filterCrmTable() {
    const segFilter = document.getElementById('crm-filter-segment')?.value || 'all';
    const searchVal = (document.getElementById('crm-search-input')?.value || '').trim().toLowerCase();

    let filtered = [...crmFullData];

    // Segment filter
    if (segFilter !== 'all') {
        filtered = filtered.filter(c => (c.rfm_segment || c.segment || 'Regular') === segFilter);
    }

    // Search filter (name or phone)
    if (searchVal) {
        filtered = filtered.filter(c => {
            const name = (c.name || '').toLowerCase();
            const phone = (c.phone || '').toLowerCase();
            return name.includes(searchVal) || phone.includes(searchVal);
        });
    }

    renderCrmTable(filtered);
}
window.filterCrmTable = filterCrmTable;

/**
 * Handle routing to Customer Tab from CRM Dashboard.
 */
function viewCustomerFromCrm(id, phone) {
    if (typeof switchTab === 'function') {
        switchTab('customers');
        const searchInput = document.getElementById('search-customer-input');
        if (searchInput && phone && phone !== 'Không có') {
            searchInput.value = phone;
            searchInput.dispatchEvent(new Event('input', { bubbles: true }));
        }
    }
}
window.viewCustomerFromCrm = viewCustomerFromCrm;
