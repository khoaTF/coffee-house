// =============================================
// ADMIN-ANALYTICS — Charts, Feedback, Dashboard KPI
// =============================================
// Dependencies: admin-core.js (orderHistory, products, supabase, showAdminToast)

let revenueDailyChartInstance = null;
let revenueCategoryChartInstance = null;
let trendCategoryChartInstance = null;
let forecastChartInstance = null;

function renderAnalytics() {
    const analyticsSection = document.getElementById('section-analytics');
    if (!analyticsSection || !analyticsSection.classList.contains('active')) return;

    const startDateInput = document.getElementById('analytics-start-date');
    const endDateInput = document.getElementById('analytics-end-date');
    let startDateStr = startDateInput ? startDateInput.value : '';
    let endDateStr = endDateInput ? endDateInput.value : '';

    let daysToShow = 7;
    let startDate = new Date();
    startDate.setDate(startDate.getDate() - 6);
    startDate.setHours(0,0,0,0);
    let endDate = new Date();
    endDate.setHours(23,59,59,999);

    if (startDateStr && endDateStr) {
        startDate = new Date(startDateStr);
        startDate.setHours(0,0,0,0);
        endDate = new Date(endDateStr);
        endDate.setHours(23,59,59,999);
        let diffTime = Math.abs(endDate - startDate);
        daysToShow = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        if (daysToShow === 0) daysToShow = 1;
    }

    const dateLabels = [...Array(daysToShow)].map((_, i) => {
        const d = new Date(startDate);
        d.setDate(d.getDate() + i);
        return { dateStr: d.toISOString().split('T')[0], display: d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }), revenue: 0 };
    });

    const categoryTotals = {};
    const itemSales = {};
    const trendCategoryData = {};

    orderHistory.forEach(o => {
        if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return;

        const d = new Date(o.createdAt);
        if (d >= startDate && d <= endDate) {
            const dateStr = d.toISOString().split('T')[0];
            const dayIndex = dateLabels.findIndex(l => l.dateStr === dateStr);
            const dayMatch = dayIndex !== -1 ? dateLabels[dayIndex] : null;
            if (dayMatch) dayMatch.revenue += (o.totalPrice || 0);

            if (o.items && Array.isArray(o.items)) {
                o.items.forEach(item => {
                    const prod = typeof products !== 'undefined' ? products.find(p => p._id === item.productId || p.id === item.productId) : null;
                    const cat = prod ? prod.category : 'Khác';
                    const itemRev = (item.price * item.quantity);
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + itemRev;

                    const name = prod ? prod.name : item.name;
                    if (!itemSales[name]) itemSales[name] = { qty: 0, rev: 0 };
                    itemSales[name].qty += item.quantity;
                    itemSales[name].rev += itemRev;
                    
                    if (!trendCategoryData[cat]) {
                        trendCategoryData[cat] = Array(daysToShow).fill(0);
                    }
                    if (dayIndex !== -1) {
                        trendCategoryData[cat][dayIndex] += itemRev;
                    }
                });
            }
        }
    });

    // Line Chart
    const ctxDaily = document.getElementById('revenueDailyChart').getContext('2d');
    if (revenueDailyChartInstance) revenueDailyChartInstance.destroy();

    revenueDailyChartInstance = new Chart(ctxDaily, {
        type: 'line',
        data: {
            labels: dateLabels.map(d => d.display),
            datasets: [{
                label: 'Doanh thu (VNĐ)',
                data: dateLabels.map(d => d.revenue),
                borderColor: '#d4a76a',
                backgroundColor: 'rgba(212,167,106,0.2)',
                borderWidth: 2,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }
            }
        }
    });

    // Doughnut Chart
    const ctxCat = document.getElementById('revenueCategoryChart').getContext('2d');
    if (revenueCategoryChartInstance) revenueCategoryChartInstance.destroy();

    revenueCategoryChartInstance = new Chart(ctxCat, {
        type: 'doughnut',
        data: {
            labels: Object.keys(categoryTotals).length ? Object.keys(categoryTotals) : ['Chưa có dữ liệu'],
            datasets: [{
                data: Object.keys(categoryTotals).length ? Object.values(categoryTotals) : [1],
                backgroundColor: ['#d4a76a', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { color: '#c9d1d9' } } }
        }
    });

    // Trend Category Chart
    const ctxTrend = document.getElementById('trendCategoryChart');
    if (ctxTrend) {
        if (trendCategoryChartInstance) trendCategoryChartInstance.destroy();
        const datasets = Object.keys(trendCategoryData).map((cat, i) => {
            const colors = ['#d4a76a', '#3498db', '#e74c3c', '#2ecc71', '#9b59b6', '#f1c40f'];
            return {
                label: cat,
                data: trendCategoryData[cat],
                borderColor: colors[i % colors.length],
                backgroundColor: colors[i % colors.length],
                tension: 0.4,
                borderWidth: 2,
                fill: false
            };
        });

        trendCategoryChartInstance = new Chart(ctxTrend.getContext('2d'), {
            type: 'line',
            data: {
                labels: Object.keys(trendCategoryData).length ? dateLabels.map(l => l.display) : ['Chưa có dữ liệu'],
                datasets: datasets.length ? datasets : [{ label: 'Không có', data: dateLabels.map(() => 0), borderColor: '#c9d1d9' }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: { ticks: { color: '#8b949e' }, grid: { display: false } },
                    y: { ticks: { color: '#8b949e', callback: v => v.toLocaleString('vi-VN') + 'đ' }, grid: { color: 'rgba(139,148,158,0.1)' } }
                },
                plugins: {
                    legend: { position: 'bottom', labels: { color: '#c9d1d9' } },
                    tooltip: { callbacks: { label: function(c) { return c.dataset.label + ': ' + c.raw.toLocaleString('vi-VN') + ' đ'; } } }
                }
            }
        });
    }

    // Top Items
    const topItemsEl = document.getElementById('top-selling-body');
    if (topItemsEl) {
        topItemsEl.innerHTML = '';
        const sortedItems = Object.keys(itemSales)
            .map(name => ({ name, ...itemSales[name] }))
            .sort((a,b) => b.qty - a.qty)
            .slice(0, 5);

        if (sortedItems.length === 0) {
            topItemsEl.innerHTML = '<tr><td colspan="3" class="text-center py-3 text-muted">Chưa có giao dịch nào trong thời gian này.</td></tr>';
        } else {
            sortedItems.forEach((item, index) => {
                const tr = document.createElement('tr');
                const badgeClass = index === 0 ? 'bg-danger' : (index === 1 ? 'bg-warning' : (index === 2 ? 'bg-success' : 'bg-secondary'));
                tr.innerHTML = `
                    <td><span class="badge ${badgeClass} me-2">#${index+1}</span> ${item.name}</td>
                    <td class="text-center font-bold text-slate-800">${item.qty} đv</td>
                    <td class="text-end text-success">${item.rev.toLocaleString('vi-VN')} đ</td>
                `;
                topItemsEl.appendChild(tr);
            });
        }
    }

    // Analytics Enhanced Features
    renderHeatmap(startDate, endDate);
    renderSmartPurchasing(startDate, endDate);
    renderForecast();
    renderPeriodComparison(startDate, endDate);
    renderProfitMargins(startDate, endDate);
    renderStaffPerformance(startDate, endDate);
}

// --- Feedback Stats ---
async function fetchFeedbackStats() {
    try {
        const { data, error } = await supabase.from('feedback').select('*').eq('tenant_id', window.AdminState.tenantId).order('created_at', { ascending: false });
        if (error) throw error;

        let total = 0;
        let count = data.length;
        data.forEach(f => total += f.rating);
        const average = count > 0 ? (total / count).toFixed(1) : 0;

        const mappedData = data.map(f => ({ ...f, createdAt: f.created_at, tableNumber: f.table_number }));

        document.getElementById('fb-avg-rating').innerText = average;
        document.getElementById('fb-total-count').innerText = `${count} lượt đánh giá`;

        const avgStars = document.getElementById('fb-avg-stars');
        avgStars.replaceChildren();
        const avg = Math.round(average);
        for(let i=1; i<=5; i++) {
            const star = document.createElement('i');
            star.className = i <= avg ? 'fa-solid fa-star text-gold' : 'fa-regular fa-star text-gold';
            avgStars.appendChild(star);
        }

        const listEl = document.getElementById('fb-recent-list');
        if(count === 0) {
            listEl.replaceChildren();
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'p-4 text-center text-muted';
            emptyDiv.textContent = 'Chưa có đánh giá nào.';
            listEl.appendChild(emptyDiv);
        } else {
            listEl.replaceChildren();
            mappedData.slice(0, 50).forEach(f => {
                const item = document.createElement('div');
                item.className = 'p-3 border-bottom fb-item';
                item.style.borderColor = 'rgba(0,0,0,0.08) !important';

                const header = document.createElement('div');
                header.className = 'd-flex justify-content-between mb-1';

                const starsDiv = document.createElement('div');
                starsDiv.className = 'text-gold';
                for(let i=0; i<5; i++) {
                    const star = document.createElement('i');
                    star.className = i < f.rating ? 'fa-solid fa-star small' : 'fa-regular fa-star small';
                    starsDiv.appendChild(star);
                }

                const dateSmall = document.createElement('small');
                dateSmall.className = 'text-muted';
                const clockIcon = document.createElement('i');
                clockIcon.className = 'fa-regular fa-clock me-1';
                dateSmall.append(clockIcon, new Date(f.createdAt).toLocaleDateString('vi-VN'));

                header.append(starsDiv, dateSmall);

                const tableInfo = document.createElement('div');
                tableInfo.className = 'fw-bold small text-slate-800';
                tableInfo.textContent = `Bàn số: ${f.tableNumber || '?'}`;

                const commentDiv = document.createElement('div');
                commentDiv.className = 'text-slate-800 small mt-1';
                commentDiv.style.fontSize = '0.95rem';
                if (f.comment) {
                    commentDiv.textContent = f.comment;
                } else {
                    const em = document.createElement('i');
                    em.className = 'text-muted';
                    em.textContent = 'Không có bình luận';
                    commentDiv.appendChild(em);
                }

                item.append(header, tableInfo, commentDiv);
                listEl.appendChild(item);
            });
        }
    } catch (error) {
        console.error('Error fetching feedback:', error);
    }
}

// --- Count-Up Animation Utility ---
function animateCountUp(element, targetValue, duration = 800, isCurrency = false) {
    if (!element) return;
    const startTime = performance.now();
    const startValue = 0;

    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        // easeOutExpo for satisfying deceleration
        const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        const currentValue = Math.round(startValue + (targetValue - startValue) * eased);

        if (isCurrency) {
            element.textContent = currentValue.toLocaleString('vi-VN') + ' đ';
        } else {
            element.textContent = currentValue.toLocaleString('vi-VN');
        }

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }
    requestAnimationFrame(update);
}

// --- Dashboard KPI Cards ---
async function renderDashboardStats() {
    const container = document.getElementById('dashboard-kpi-cards');
    if (!container) return;

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    try {
        const { data: todayOrders } = await supabase
            .from('orders')
            .select('status, total_price, payment_status')
            .eq('tenant_id', window.AdminState.tenantId)
            .gte('created_at', todayStart.toISOString());

        const { data: tablesData } = await supabase
            .from('tables')
            .select('status')
            .eq('tenant_id', window.AdminState.tenantId);

        const total = todayOrders?.length || 0;
        const pending = todayOrders?.filter(o => o.status === 'Pending' || o.status === 'Preparing').length || 0;
        const revenue = todayOrders?.filter(o => o.payment_status === 'paid' && o.status !== 'Cancelled').reduce((s, o) => s + (o.total_price || 0), 0) || 0;
        const activeTables = tablesData?.filter(t => t.status === 'occupied').length || 0;

        const role = sessionStorage.getItem('cafe_role') || localStorage.getItem('cafe_role');
        const isStaff = role === 'staff';

        if (isStaff) {
             container.innerHTML = `
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="kpi-card kpi-pending bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-hourglass-half text-orange-500 text-xl"></i>
                        </div>
                        <div class="kpi-body">
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Đơn đang xử lý</div>
                            <div class="text-xl font-bold text-slate-800" id="kpi-pending">${pending}</div>
                        </div>
                    </div>
                    <div class="kpi-card kpi-tables bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center gap-4">
                        <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-chair text-blue-500 text-xl"></i>
                        </div>
                        <div class="kpi-body">
                            <div class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Bàn đang phục vụ</div>
                            <div class="text-xl font-bold text-slate-800" id="kpi-active-tables">${activeTables}</div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            container.innerHTML = `
                <div class="dashboard-kpi-grid">
                    <div class="kpi-card kpi-orders">
                        <div class="kpi-icon"><i class="fa-solid fa-receipt"></i></div>
                        <div class="kpi-body">
                            <div class="kpi-value" id="kpi-total-orders">${total}</div>
                            <div class="kpi-label">Đơn hàng hôm nay</div>
                        </div>
                    </div>
                    <div class="kpi-card kpi-revenue">
                        <div class="kpi-icon"><i class="fa-solid fa-coins"></i></div>
                        <div class="kpi-body">
                            <div class="kpi-value" id="kpi-revenue">${revenue.toLocaleString('vi-VN')}đ</div>
                            <div class="kpi-label">Doanh thu hôm nay</div>
                        </div>
                    </div>
                    <div class="kpi-card kpi-pending">
                        <div class="kpi-icon"><i class="fa-solid fa-hourglass-half"></i></div>
                        <div class="kpi-body">
                            <div class="kpi-value" id="kpi-pending">${pending}</div>
                            <div class="kpi-label">Đơn đang xử lý</div>
                        </div>
                    </div>
                    <div class="kpi-card kpi-tables">
                        <div class="kpi-icon"><i class="fa-solid fa-chair"></i></div>
                        <div class="kpi-body">
                            <div class="kpi-value" id="kpi-active-tables">${activeTables}</div>
                            <div class="kpi-label">Bàn đang phục vụ</div>
                        </div>
                    </div>
                </div>
            `;
        }

        // Trigger count-up animations
        requestAnimationFrame(() => {
            animateCountUp(document.getElementById('kpi-total-orders'), total, 700);
            animateCountUp(document.getElementById('kpi-revenue'), revenue, 900, true);
            animateCountUp(document.getElementById('kpi-pending'), pending, 600);
            animateCountUp(document.getElementById('kpi-active-tables'), activeTables, 600);
        });

        checkLowStock();
    } catch (e) {
        console.error('Dashboard stats error:', e);
    }
}

// =============================================
// B1 — DASHBOARD TỔNG QUAN
// =============================================
async function loadDashboard() {
    const container = document.getElementById('dashboard-content');
    if (!container) return;

    container.innerHTML = `<div class="text-center py-16 text-slate-500"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải...</div>`;

    try {
        const role = sessionStorage.getItem('cafe_role') || localStorage.getItem('cafe_role');
        const isStaff = role === 'staff';

        const todayStart = new Date(); todayStart.setHours(0,0,0,0);
        const todayEnd = new Date(); todayEnd.setHours(23,59,59,999);
        const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - 6); weekStart.setHours(0,0,0,0);

        const [{ data: todayOrders }, { data: weekOrders }, { data: lowStock }, { data: pendingOrders }] = await Promise.all([
            supabase.from('orders').select('*').eq('tenant_id', window.AdminState.tenantId).gte('created_at', todayStart.toISOString()).lte('created_at', todayEnd.toISOString()),
            supabase.from('orders').select('*').eq('tenant_id', window.AdminState.tenantId).gte('created_at', weekStart.toISOString()).eq('payment_status', 'paid').neq('status', 'Cancelled'),
            supabase.from('ingredients').select('name, stock, low_stock_threshold').eq('tenant_id', window.AdminState.tenantId).lt('stock', supabase.raw ? 1 : Number.MAX_SAFE_INTEGER),
            supabase.from('orders').select('*').eq('tenant_id', window.AdminState.tenantId).in('status', ['Pending', 'Preparing'])
        ]);

        if (isStaff) {
             const recentPending = (pendingOrders || []).sort((a,b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8);
             
             container.innerHTML = `
                 <div class="card bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
                     <div class="p-4 border-b border-slate-200 justify-between items-center hidden md:flex">
                         <h5 class="font-bold text-slate-800 mb-0"><i class="fa-solid fa-list-check me-2 text-[#C0A062]"></i>Công việc cần làm (Đơn mới cập nhật)</h5>
                         <button class="btn btn-sm btn-outline-primary" onclick="switchTab('orders')">Tới trang Xử lý đơn</button>
                     </div>
                     <div class="p-4 border-b border-slate-200 md:hidden">
                         <h5 class="font-bold text-slate-800 mb-3"><i class="fa-solid fa-list-check me-2 text-[#C0A062]"></i>Công việc cần làm</h5>
                         <button class="btn btn-sm btn-outline-primary w-full" onclick="switchTab('orders')">Tới trang Xử lý đơn</button>
                     </div>
                     <div class="table-responsive">
                         <table class="table table-hover mb-0 min-w-full">
                             <thead class="bg-slate-100 text-slate-600"><tr><th class="border-0 py-3 px-4">Bàn</th><th class="border-0 py-3 px-4 w-32">Giờ đặt</th><th class="border-0 py-3 px-4 w-40 text-center">Trạng thái</th></tr></thead>
                             <tbody>
                                 ${recentPending.length === 0 ? '<tr><td colspan="3" class="text-center py-6 text-slate-500 font-medium">Hiện không có đơn nào đang chờ xử lý.</td></tr>' :
                                     recentPending.map(o => {
                                         const statusColors = { Pending:'bg-warning text-dark', Preparing:'bg-primary' };
                                         const statusVI = { Pending:'Đang chờ', Preparing:'Đang chuẩn bị' };
                                         const time = new Date(o.created_at).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'});
                                         return `<tr>
                                             <td class="py-3 px-4 text-slate-800 font-bold">${window.escapeHTML(o.table_number || '?')}</td>
                                             <td class="py-3 px-4 text-slate-500 text-sm">${time}</td>
                                             <td class="py-3 px-4 text-center"><span class="badge ${statusColors[o.status]||'bg-secondary'} px-3 py-2 text-xs rounded-full shadow-sm">${statusVI[o.status]||o.status}</span></td>
                                         </tr>`;
                                     }).join('')
                                 }
                             </tbody>
                         </table>
                     </div>
                 </div>
                 
                 <div class="text-center">
                    <p class="text-slate-500 italic mb-4">Các báo cáo và thông tin mật được giới hạn hiển thị đối với tài khoản nhân viên.</p>
                 </div>
             `;
             return;
        }

        const revenueOrdersToday = (todayOrders || []).filter(o => o.payment_status === 'paid' && o.status !== 'Cancelled');
        const revenueToday = revenueOrdersToday.reduce((s, o) => s + (o.total_price || 0), 0);
        const orderCountToday = (todayOrders || []).filter(o => o.status !== 'Cancelled').length;
        const pendingCount = pendingOrders ? pendingOrders.length : 0;

        // 7-day revenue
        const dayLabels = [];
        const dayRevenue = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0,0,0,0);
            const dEnd = new Date(d); dEnd.setHours(23,59,59,999);
            const dateStr = d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' });
            dayLabels.push(dateStr);
            const rev = (weekOrders || []).filter(o => {
                const od = new Date(o.created_at);
                return od >= d && od <= dEnd;
            }).reduce((s, o) => s + (o.total_price || 0), 0);
            dayRevenue.push(rev);
        }

        // Top 5 items
        const itemSales = {};
        (weekOrders || []).forEach(o => {
            (o.items || []).forEach(it => {
                itemSales[it.name] = (itemSales[it.name] || 0) + (it.quantity || 1);
            });
        });
        const top5 = Object.entries(itemSales).sort((a,b) => b[1]-a[1]).slice(0,5);

        // Low stock items
        const lowItems = (lowStock || []).filter(ing => (ing.stock || 0) < (ing.low_stock_threshold || 50));

        // Recent 5 orders
        const recentOrders = (todayOrders || []).slice(0, 5);

        container.innerHTML = `
            <!-- KPI Cards -->
            <div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <div class="card bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-coins text-amber-400 text-xl"></i>
                    </div>
                    <div>
                        <div class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Doanh thu hôm nay</div>
                        <div class="text-xl font-bold text-[#C0A062]">${revenueToday.toLocaleString('vi-VN')} đ</div>
                    </div>
                </div>
                <div class="card bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-receipt text-green-400 text-xl"></i>
                    </div>
                    <div>
                        <div class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Đơn hôm nay</div>
                        <div class="text-xl font-bold text-[#F2E8D5]">${orderCountToday}</div>
                    </div>
                </div>
                <div class="card bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-fire text-red-400 text-xl"></i>
                    </div>
                    <div>
                        <div class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Đang xử lý</div>
                        <div class="text-xl font-bold text-red-400">${pendingCount}</div>
                    </div>
                </div>
                <div class="card bg-white border border-slate-200 rounded-2xl p-5 flex items-center gap-4">
                    <div class="w-12 h-12 rounded-xl bg-orange-500/20 flex items-center justify-center flex-shrink-0">
                        <i class="fa-solid fa-triangle-exclamation text-orange-400 text-xl"></i>
                    </div>
                    <div>
                        <div class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-1">Kho sắp hết</div>
                        <div class="text-xl font-bold text-orange-400">${lowItems.length}</div>
                    </div>
                </div>
            </div>

            <!-- Quick Navigation Hub -->
            <div class="card bg-white border border-slate-200 rounded-2xl shadow-soft mb-6 overflow-hidden" id="nav-hub-card">
                <div class="p-4 border-b border-slate-200 flex justify-between items-center cursor-pointer select-none" onclick="toggleNavHub()">
                    <div class="flex items-center gap-3">
                        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C0A062]/20 to-[#b45309]/10 flex items-center justify-center flex-shrink-0">
                            <i class="fa-solid fa-compass text-[#C0A062] text-lg"></i>
                        </div>
                        <div>
                            <h5 class="font-bold text-slate-800 mb-0 text-base">Trung tâm Điều hướng</h5>
                            <p class="text-xs text-slate-500 mb-0">Truy cập nhanh tất cả chức năng quản trị</p>
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-slate-400 font-medium hidden sm:inline">Thu gọn / Mở rộng</span>
                        <i id="nav-hub-chevron" class="fa-solid fa-chevron-down text-slate-400 transition-transform duration-300"></i>
                    </div>
                </div>
                <div id="nav-hub-body" class="p-4" style="display:block;">
                    ${renderNavHub()}
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                <!-- Chart 7 ngày -->
                <div class="lg:col-span-2 card bg-white border border-slate-200 rounded-2xl p-5">
                    <h5 class="font-bold text-[#C0A062] mb-4 flex items-center gap-2"><i class="fa-solid fa-chart-line"></i> Doanh thu 7 ngày qua</h5>
                    <div style="height:220px"><canvas id="dash-revenue-chart"></canvas></div>
                </div>
                <!-- Top 5 món -->
                <div class="card bg-white border border-slate-200 rounded-2xl p-5">
                    <h5 class="font-bold text-[#C0A062] mb-4 flex items-center gap-2"><i class="fa-solid fa-trophy"></i> Top 5 món (7 ngày)</h5>
                    ${top5.length === 0 ? '<p class="text-slate-500 text-sm">Chưa có dữ liệu.</p>' : top5.map(([name, qty], i) => `
                        <div class="flex items-center justify-between py-2 border-b border-slate-200 last:border-0">
                            <div class="flex items-center gap-2">
                                <span class="w-6 h-6 rounded-full bg-[#e2e8f0] text-[#C0A062] text-xs font-bold flex items-center justify-center">${i+1}</span>
                                <span class="text-sm text-slate-800 truncate max-w-[120px]">${window.escapeHTML(name)}</span>
                            </div>
                            <span class="text-sm font-bold text-[#C0A062]">${qty} ly</span>
                        </div>
                    `).join('')}
                </div>
            </div>

            <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <!-- 5 đơn gần nhất hôm nay -->
                <div class="card bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div class="p-4 border-b border-slate-200"><h5 class="font-bold text-[#F2E8D5] mb-0"><i class="fa-solid fa-clock-rotate-left me-2 text-[#C0A062]"></i>5 đơn gần nhất hôm nay</h5></div>
                    <table class="table table-hover mb-0">
                        <thead class="bg-[#e2e8f0] text-[#b45309]"><tr><th class="border-0 py-2 px-4 text-xs">Bàn</th><th class="border-0 py-2 px-4 text-xs">Tổng</th><th class="border-0 py-2 px-4 text-xs">Trạng thái</th></tr></thead>
                        <tbody>
                            ${recentOrders.length === 0 ? '<tr><td colspan="3" class="text-center py-4 text-slate-500 text-sm">Chưa có đơn hôm nay.</td></tr>' :
                                recentOrders.map(o => {
                                    const statusColors = { Pending:'bg-warning text-dark', Preparing:'bg-primary', Ready:'bg-info text-dark', Completed:'bg-success', Cancelled:'bg-danger' };
                                    const statusVI = { Pending:'Chờ', Preparing:'Đang làm', Ready:'Sẵn', Completed:'Hoàn thành', Cancelled:'Hủy' };
                                    return `<tr>
                                        <td class="py-2 px-4 text-sm text-slate-800">Bàn ${window.escapeHTML(o.table_number || '?')}</td>
                                        <td class="py-2 px-4 text-sm text-[#C0A062] font-bold">${(o.total_price||0).toLocaleString('vi-VN')} đ</td>
                                        <td class="py-2 px-4"><span class="badge ${statusColors[o.status]||'bg-secondary'} text-xs">${statusVI[o.status]||o.status}</span></td>
                                    </tr>`;
                                }).join('')
                            }
                        </tbody>
                    </table>
                </div>
                <!-- Kho sắp hết -->
                <div class="card bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div class="p-4 border-b border-slate-200"><h5 class="font-bold text-[#F2E8D5] mb-0"><i class="fa-solid fa-triangle-exclamation me-2 text-orange-400"></i>Nguyên liệu sắp hết</h5></div>
                    <table class="table table-hover mb-0">
                        <thead class="bg-[#e2e8f0] text-[#b45309]"><tr><th class="border-0 py-2 px-4 text-xs">Nguyên liệu</th><th class="border-0 py-2 px-4 text-xs">Tồn kho</th></tr></thead>
                        <tbody>
                            ${lowItems.length === 0 ? '<tr><td colspan="2" class="text-center py-4 text-green-400 text-sm"><i class="fa-solid fa-check me-1"></i>Kho đầy đủ!</td></tr>' :
                                lowItems.slice(0,8).map(ing => `<tr>
                                    <td class="py-2 px-4 text-sm text-slate-800">${window.escapeHTML(ing.name)}</td>
                                    <td class="py-2 px-4"><span class="badge bg-danger text-xs">${ing.stock || 0} / ${ing.low_stock_threshold || 50}</span></td>
                                </tr>`).join('')
                            }
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Render chart
        const ctx = document.getElementById('dash-revenue-chart');
        if (ctx && typeof Chart !== 'undefined') {
            new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: dayLabels,
                    datasets: [{
                        label: 'Doanh thu (đ)',
                        data: dayRevenue,
                        backgroundColor: 'rgba(192,160,98,0.6)',
                        borderColor: '#C0A062',
                        borderWidth: 2,
                        borderRadius: 8,
                    }]
                },
                options: {
                    responsive: true, maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        y: { ticks: { color: '#64748b', callback: v => (v/1000) + 'k' }, grid: { color: '#e2e8f0' } },
                        x: { ticks: { color: '#64748b' }, grid: { display: false } }
                    }
                }
            });
        }

        // Restore nav hub collapse state
        initNavHubState();

    } catch(e) {
        console.error('loadDashboard error:', e);
        container.innerHTML = '<div class="text-center py-16 text-red-400"><i class="fa-solid fa-circle-xmark me-2"></i>Lỗi tải Dashboard.</div>';
    }
}

// --- Quick Navigation Hub ---
function renderNavHub() {
    const canAccess = window.canAccessTab || (() => true);

    const navGroups = [
        {
            title: 'Vận hành',
            icon: 'fa-solid fa-bolt',
            color: '#C0A062',
            items: [
                { tab: 'orders', icon: 'fa-solid fa-cash-register', title: 'Bán hàng (POS)', desc: 'Tạo đơn, xử lý thanh toán' },
                { tab: 'history', icon: 'fa-solid fa-clock-rotate-left', title: 'Lịch sử đơn', desc: 'Tra cứu đơn hàng đã hoàn thành' },
                { tab: 'delivery', icon: 'fa-solid fa-motorcycle', title: 'Giao hàng', desc: 'Quản lý đơn giao, shipper' },
                { tab: 'shifts', icon: 'fa-solid fa-user-clock', title: 'Ca làm việc', desc: 'Mở / đóng ca, giao ca thu ngân' },
            ]
        },
        {
            title: 'Quản lý',
            icon: 'fa-solid fa-folder-open',
            color: '#3498db',
            items: [
                { tab: 'menu', icon: 'fa-solid fa-utensils', title: 'Thực đơn', desc: 'Thêm, sửa, xoá món ăn & đồ uống' },
                { tab: 'inventory', icon: 'fa-solid fa-boxes-stacked', title: 'Kho nguyên liệu', desc: 'Tồn kho, cảnh báo hết hàng' },
                { tab: 'restock', icon: 'fa-solid fa-truck-ramp-box', title: 'Nhập hàng', desc: 'Tạo phiếu nhập kho từ nhà cung cấp' },
                { tab: 'promo', icon: 'fa-solid fa-tags', title: 'Khuyến mãi', desc: 'Tạo mã giảm giá, chương trình ưu đãi' },
                { tab: 'staff', icon: 'fa-solid fa-users-gear', title: 'Nhân viên', desc: 'Phân quyền, quản lý tài khoản NV' },
                { tab: 'customers', icon: 'fa-solid fa-people-group', title: 'Khách hàng', desc: 'Danh sách khách, lịch sử mua hàng' },
                { tab: 'crm', icon: 'fa-solid fa-heart', title: 'CRM & Loyalty', desc: 'Chăm sóc khách hàng, tích điểm' },
            ]
        },
        {
            title: 'Cửa hàng & Báo cáo',
            icon: 'fa-solid fa-store',
            color: '#2ecc71',
            items: [
                { tab: 'analytics', icon: 'fa-solid fa-chart-pie', title: 'Thống kê', desc: 'Biểu đồ doanh thu, top sản phẩm' },
                { tab: 'cashflow', icon: 'fa-solid fa-money-bill-trend-up', title: 'Dòng tiền', desc: 'Thu chi, lợi nhuận theo ngày' },
                { tab: 'tables', icon: 'fa-solid fa-chair', title: 'Sơ đồ bàn', desc: 'Cấu hình bàn, trạng thái phục vụ' },
                { tab: 'qr', icon: 'fa-solid fa-qrcode', title: 'Mã QR', desc: 'In mã QR cho từng bàn' },
                { tab: 'audit', icon: 'fa-solid fa-shield-halved', title: 'Nhật ký', desc: 'Lịch sử thao tác hệ thống' },
                { tab: 'settings', icon: 'fa-solid fa-gear', title: 'Cài đặt', desc: 'Logo, tên quán, cấu hình chung' },
            ]
        }
    ];

    // External pages
    const externalPages = [
        { url: '/pages/staff.html', icon: 'fa-solid fa-headset', title: 'Trang Nhân viên', desc: 'Giao diện xử lý đơn cho NV', color: '#e17055' },
        { url: '/pages/kitchen.html', icon: 'fa-solid fa-fire-burner', title: 'Trang Bếp', desc: 'Màn hình hiển thị đơn cho bếp', color: '#00b894' },
        { url: '/pages/delivery.html', icon: 'fa-solid fa-truck-fast', title: 'Trang Giao hàng', desc: 'Bản đồ & quản lý shipper', color: '#0984e3' },
        { url: '/pages/tv.html', icon: 'fa-solid fa-tv', title: 'Màn hình TV', desc: 'Hiển thị trạng thái đơn cho khách', color: '#6c5ce7' },
    ];

    let html = '';

    navGroups.forEach(group => {
        // Filter items by permission
        const visibleItems = group.items.filter(item => canAccess(item.tab));
        if (visibleItems.length === 0) return;

        html += `
            <div class="mb-5">
                <div class="flex items-center gap-2 mb-3">
                    <i class="${group.icon}" style="color:${group.color}"></i>
                    <span class="font-bold text-sm text-slate-700 uppercase tracking-wider">${group.title}</span>
                    <span class="text-xs text-slate-400">(${visibleItems.length})</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                    ${visibleItems.map(item => `
                        <div class="nav-hub-card group" onclick="switchTab('${item.tab}')" title="${item.desc}">
                            <div class="nav-hub-icon" style="background:${group.color}15;color:${group.color}">
                                <i class="${item.icon}"></i>
                            </div>
                            <div class="nav-hub-title">${item.title}</div>
                            <div class="nav-hub-desc">${item.desc}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    });

    // External pages section
    html += `
        <div class="mb-2">
            <div class="flex items-center gap-2 mb-3">
                <i class="fa-solid fa-arrow-up-right-from-square" style="color:#636e72"></i>
                <span class="font-bold text-sm text-slate-700 uppercase tracking-wider">Trang ngoài</span>
                <span class="text-xs text-slate-400">(${externalPages.length})</span>
            </div>
            <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                ${externalPages.map(page => `
                    <div class="nav-hub-card nav-hub-external group" onclick="window.open('${page.url}','_blank')" title="${page.desc}">
                        <div class="nav-hub-icon" style="background:${page.color}15;color:${page.color}">
                            <i class="${page.icon}"></i>
                        </div>
                        <div class="nav-hub-title">${page.title} <i class="fa-solid fa-arrow-up-right-from-square text-[10px] text-slate-400 ml-1"></i></div>
                        <div class="nav-hub-desc">${page.desc}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;

    return html;
}

function toggleNavHub() {
    const body = document.getElementById('nav-hub-body');
    const chevron = document.getElementById('nav-hub-chevron');
    if (!body) return;

    const isOpen = body.style.display !== 'none';
    body.style.display = isOpen ? 'none' : 'block';
    if (chevron) {
        chevron.style.transform = isOpen ? 'rotate(-90deg)' : 'rotate(0deg)';
    }
    try { localStorage.setItem('nav_hub_collapsed', isOpen ? '1' : '0'); } catch(e) {}
}

// Auto-restore nav hub state
function initNavHubState() {
    try {
        const collapsed = localStorage.getItem('nav_hub_collapsed');
        if (collapsed === '1') {
            const body = document.getElementById('nav-hub-body');
            const chevron = document.getElementById('nav-hub-chevron');
            if (body) body.style.display = 'none';
            if (chevron) chevron.style.transform = 'rotate(-90deg)';
        }
    } catch(e) {}
}

// --- Heatmap (Bản đồ nhiệt) ---
function renderHeatmap(startDate, endDate) {
    const heatmapEl = document.getElementById('heatmap-container');
    if (!heatmapEl) return;

    heatmapEl.innerHTML = ''; // Clear old

    // Logic: Khởi tạo mảng đếm 7 ngày, 24 giờ
    const counts = Array(7).fill(0).map(() => Array(24).fill(0));
    let maxCount = 0;

    orderHistory.forEach(order => {
        const d = new Date(order.created_at);
        if (startDate && d < startDate) return;
        if (endDate && d > endDate) return;
        
        let day = d.getDay() - 1; // 0 = Mon, 6 = Sun
        if (day === -1) day = 6;
        const hour = d.getHours();

        counts[day][hour]++;
        if (counts[day][hour] > maxCount) {
            maxCount = counts[day][hour];
        }
    });

    const days = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];
    
    // Header row (Hours 6-22) - Giả sử quán mở từ 6h sáng đến 10h tối
    const headerRow = document.createElement('div');
    headerRow.className = 'heatmap-row heatmap-header';
    headerRow.innerHTML = '<div class="heatmap-cell label-cell"></div>' + 
        Array(17).fill(0).map((_, i) => `<div class="heatmap-cell">${i+6}h</div>`).join('');
    heatmapEl.appendChild(headerRow);

    // Data rows
    days.forEach((dayLabel, dayIndex) => {
        const row = document.createElement('div');
        row.className = 'heatmap-row';
        row.innerHTML = `<div class="heatmap-cell label-cell">${dayLabel}</div>`;
        
        for (let h = 6; h <= 22; h++) {
            const count = counts[dayIndex][h];
            let intensity = 0;
            if (count > 0) {
                if (count <= maxCount * 0.25) intensity = 1;
                else if (count <= maxCount * 0.5) intensity = 2;
                else if (count <= maxCount * 0.75) intensity = 3;
                else intensity = 4;
            }
            row.innerHTML += `
            <div class="heatmap-cell intensity-${intensity} relative group cursor-pointer">
                <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 pointer-events-none shadow-lg">
                    Khung giờ ${h}h-${h+1}h ${dayLabel}: ${count} đơn
                    <svg class="absolute text-slate-800 h-2 w-full left-0 top-full" x="0px" y="0px" viewBox="0 0 255 255" xml:space="preserve"><polygon class="fill-current" points="0,0 127.5,127.5 255,0"/></svg>
                </div>
            </div>`;
        }
        heatmapEl.appendChild(row);
    });
}

// --- Phase 8: Revenue Forecast (Weighted Moving Average) ---
function renderForecast() {
    const ctx = document.getElementById('forecastChart');
    if (!ctx) return;

    // Build daily revenue map for last 28 days
    const now = new Date();
    const dayMs = 1000 * 60 * 60 * 24;
    const dailyRevenue = {};

    for (let i = 27; i >= 0; i--) {
        const d = new Date(now.getTime() - i * dayMs);
        const key = d.toISOString().split('T')[0];
        dailyRevenue[key] = 0;
    }

    orderHistory.forEach(o => {
        if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return;
        const dateStr = new Date(o.createdAt).toISOString().split('T')[0];
        if (dailyRevenue[dateStr] !== undefined) {
            dailyRevenue[dateStr] += (o.totalPrice || 0);
        }
    });

    const dates = Object.keys(dailyRevenue).sort();
    const values = dates.map(d => dailyRevenue[d]);

    // WMA Forecast: weight recent days more, same day-of-week bonus
    const forecast = [];
    const forecastDates = [];
    const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];

    for (let i = 0; i < 7; i++) {
        const targetDate = new Date(now.getTime() + (i + 1) * dayMs);
        const targetDayOfWeek = targetDate.getDay();
        forecastDates.push(targetDate.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }));

        let weightedSum = 0;
        let weightTotal = 0;

        // Look at the last 28 days
        for (let j = 0; j < values.length; j++) {
            const histDate = new Date(dates[j]);
            const daysAgo = Math.floor((now - histDate) / dayMs);
            const recencyWeight = Math.max(1, 28 - daysAgo); // More recent = higher weight
            const sameDayBonus = histDate.getDay() === targetDayOfWeek ? 3 : 1; // Same weekday gets 3x
            const weight = recencyWeight * sameDayBonus;
            weightedSum += values[j] * weight;
            weightTotal += weight;
        }

        forecast.push(weightTotal > 0 ? Math.round(weightedSum / weightTotal) : 0);
    }

    // Chart: Last 7 days actual + 7 days forecast
    const last7Dates = dates.slice(-7);
    const last7Values = values.slice(-7);
    const allLabels = [
        ...last7Dates.map(d => new Date(d).toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' })),
        ...forecastDates
    ];
    const actualData = [...last7Values, ...Array(7).fill(null)];
    const forecastData = [...Array(6).fill(null), last7Values[6] || 0, ...forecast];

    if (forecastChartInstance) forecastChartInstance.destroy();
    forecastChartInstance = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: allLabels,
            datasets: [
                {
                    label: 'Thực tế',
                    data: actualData,
                    borderColor: '#C0A062',
                    backgroundColor: 'rgba(192,160,98,0.1)',
                    borderWidth: 2.5,
                    pointRadius: 4,
                    pointBackgroundColor: '#C0A062',
                    fill: true,
                    tension: 0.3,
                    spanGaps: false
                },
                {
                    label: 'Dự báo (AI)',
                    data: forecastData,
                    borderColor: '#e17055',
                    backgroundColor: 'rgba(225,112,85,0.08)',
                    borderWidth: 2.5,
                    borderDash: [8, 4],
                    pointRadius: 4,
                    pointBackgroundColor: '#e17055',
                    pointStyle: 'triangle',
                    fill: true,
                    tension: 0.3,
                    spanGaps: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'top', labels: { font: { family: 'Manrope', weight: '600' }, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: ctx => ctx.dataset.label + ': ' + (ctx.parsed.y || 0).toLocaleString('vi-VN') + ' đ'
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { callback: v => (v / 1000).toFixed(0) + 'K' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });

    // Update summary KPIs
    const forecastTotal = forecast.reduce((a, b) => a + b, 0);
    const currentWeekTotal = last7Values.reduce((a, b) => a + b, 0);
    const trendPercent = currentWeekTotal > 0 ? ((forecastTotal - currentWeekTotal) / currentWeekTotal * 100).toFixed(1) : 0;
    const peakIdx = forecast.indexOf(Math.max(...forecast));
    const peakDate = new Date(now.getTime() + (peakIdx + 1) * dayMs);
    const peakDayName = dayNames[peakDate.getDay()] + ' ' + forecastDates[peakIdx];

    // Confidence: based on data availability (more days = higher confidence)
    const dataPoints = values.filter(v => v > 0).length;
    const confidence = Math.min(95, Math.round((dataPoints / 28) * 100));

    const fNextWeek = document.getElementById('forecast-next-week');
    const fTrend = document.getElementById('forecast-trend');
    const fPeak = document.getElementById('forecast-peak-day');
    const fConf = document.getElementById('forecast-confidence');

    if (fNextWeek) fNextWeek.textContent = forecastTotal.toLocaleString('vi-VN') + 'đ';
    if (fTrend) {
        const isUp = trendPercent >= 0;
        fTrend.innerHTML = `<i class="fa-solid fa-arrow-${isUp ? 'up' : 'down'} text-${isUp ? '[#27ae60]' : 'red-500'} mr-1"></i><span class="text-${isUp ? '[#27ae60]' : 'red-500'}">${isUp ? '+' : ''}${trendPercent}%</span>`;
    }
    if (fPeak) fPeak.textContent = peakDayName;
    if (fConf) {
        fConf.innerHTML = `<div class="flex items-center gap-2"><div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden"><div class="h-full bg-[#27ae60] rounded-full" style="width:${confidence}%"></div></div>${confidence}%</div>`;
    }
}

// --- Smart Purchasing (Dự báo nhập hàng thông minh) ---
function renderSmartPurchasing(startDate, endDate) {
    const purchasingEl = document.getElementById('smart-purchasing-body');
    if (!purchasingEl) return;
    
    // Bước 1: Tính toán tổng mức tiêu thụ của từng nguyên liệu từ các đơn hàng.
    const consumption = {}; // { ingredient_id: total_consumed_amount }
    
    // Tính tổng số ngày trong khoảng thời gian lọc (chọn tối thiểu 1 ngày)
    let daysDiff = 1;
    if (startDate && endDate) {
        daysDiff = Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)));
    } else if (orderHistory.length > 0) {
        const firstOrder = new Date(orderHistory[orderHistory.length - 1].created_at);
        const lastOrder = new Date(orderHistory[0].created_at);
        daysDiff = Math.max(1, Math.ceil((lastOrder - firstOrder) / (1000 * 60 * 60 * 24)));
    }
    
    orderHistory.forEach(order => {
        const d = new Date(order.created_at);
        if (startDate && d < startDate) return;
        if (endDate && d > endDate) return;

        if (order.status !== 'Completed' && order.status !== 'Ready') return; // Chỉ tính đơn đã bán
        
        if (order.items) {
            order.items.forEach(item => {
                // Kiểm tra xem item có lưu sẵn recipe không (hỗ trợ combo và options)
                if (item.recipe && Array.isArray(item.recipe) && item.recipe.length > 0) {
                    item.recipe.forEach(ri => {
                        const iId = ri.ingredientId || ri.ingredient_id;
                        if (!iId) return;
                        if (!consumption[iId]) consumption[iId] = 0;
                        const qty = ri.quantity !== undefined ? ri.quantity : (ri.amount || 0);
                        consumption[iId] += qty * item.quantity;
                    });
                } else {
                    // Fallback tương thích cũ: Tìm product gốc
                    const prodId = item.productId || item.product_id || item.id;
                    const product = typeof products !== 'undefined' ? products.find(p => p._id === prodId || p.id === prodId) : null;
                    if (product && product.recipe && !product.is_combo) {
                        product.recipe.forEach(ri => {
                            const iId = ri.ingredient_id || ri.ingredientId;
                            if (!iId) return;
                            if (!consumption[iId]) consumption[iId] = 0;
                            const qty = ri.amount !== undefined ? ri.amount : (ri.quantity || 0);
                            consumption[iId] += qty * item.quantity;
                        });
                    }
                }
            });
        }
    });

    purchasingEl.innerHTML = '';
    
    let hasAlerts = false;

    // Xem ingredient nào cần mua
    ingredients.forEach(ing => {
        const totalConsumed = consumption[ing.id] || consumption[ing._id] || 0;
        const avgDaily = totalConsumed / daysDiff;
        const threshold = ing.low_stock_threshold || ing.lowStockThreshold || 10;
        
        let daysUntilEmpty = 'N/A';
        let suggestedBuy = 0;
        let requiresAction = false;
        
        if (avgDaily > 0) {
            daysUntilEmpty = Math.floor(ing.stock / avgDaily);
            // Cảnh báo nếu số ngày còn lại <= 3 HOẶC tồn kho thấp hơn ngưỡng
            if (daysUntilEmpty <= 3 || ing.stock <= threshold) {
                requiresAction = true;
                hasAlerts = true;
                // Mua đảm bảo đủ 7 ngày hoặc ít nhất là gấp đôi ngưỡng tối thiểu
                let buyFor7Days = (avgDaily * 7) - ing.stock;
                let buyForThreshold = (threshold * 2) - ing.stock;
                suggestedBuy = Math.max(buyFor7Days, buyForThreshold);
                if (suggestedBuy < 0) suggestedBuy = 0;
            }
        } else if (ing.stock <= threshold) {
             requiresAction = true;
             hasAlerts = true;
             suggestedBuy = (threshold * 2) - ing.stock;
             if (suggestedBuy < 0) suggestedBuy = 0;
        }

        if (requiresAction) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="py-3"><span class="fw-bold text-slate-800">${window.escapeHTML(ing.name)}</span></td>
                <td class="py-3 text-center"><span class="${ing.stock <= threshold ? 'text-danger font-bold' : 'text-slate-600'}">${ing.stock} ${ing.unit}</span></td>
                <td class="py-3 text-center font-bold text-orange-500">${avgDaily > 0 ? avgDaily.toFixed(1) : 0} ${ing.unit}/ngày</td>
                <td class="py-3 text-center">${daysUntilEmpty === 'N/A' || daysUntilEmpty > 999 ? '-' : '<span class="badge bg-danger">' + daysUntilEmpty + ' ngày</span>'}</td>
                <td class="py-3 text-end fw-bold text-[#27ae60]"><i class="fa-solid fa-cart-plus me-1"></i>Nhập ${Math.ceil(suggestedBuy)} ${ing.unit}</td>
            `;
            purchasingEl.appendChild(tr);
        }
    });

    if (!hasAlerts) {
        purchasingEl.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-500"><i class="fa-solid fa-face-smile text-success fs-4 block mb-2"></i>Kho dồi dào. Chưa cần nhập thêm trong 7 ngày tới.</td></tr>';
    }
}

// =============================================
// 7A — PERIOD COMPARISON (So sánh khoảng thời gian)
// =============================================
let periodComparisonChartInstance = null;

function renderPeriodComparison(startDate, endDate) {
    const container = document.getElementById('period-comparison-container');
    if (!container) return;

    const periodMs = endDate - startDate;
    const prevStart = new Date(startDate.getTime() - periodMs);
    const prevEnd = new Date(startDate.getTime() - 1);

    let currentRevenue = 0, currentOrders = 0;
    let prevRevenue = 0, prevOrders = 0;

    orderHistory.forEach(o => {
        if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return;
        const d = new Date(o.createdAt);
        const rev = o.totalPrice || 0;

        if (d >= startDate && d <= endDate) {
            currentRevenue += rev;
            currentOrders++;
        } else if (d >= prevStart && d <= prevEnd) {
            prevRevenue += rev;
            prevOrders++;
        }
    });

    const currentTicket = currentOrders > 0 ? Math.round(currentRevenue / currentOrders) : 0;
    const prevTicket = prevOrders > 0 ? Math.round(prevRevenue / prevOrders) : 0;

    const calcChange = (curr, prev) => prev > 0 ? ((curr - prev) / prev * 100).toFixed(1) : (curr > 0 ? 100 : 0);
    const revChange = calcChange(currentRevenue, prevRevenue);
    const orderChange = calcChange(currentOrders, prevOrders);
    const ticketChange = calcChange(currentTicket, prevTicket);

    const renderKPI = (label, current, prev, change, isCurrency = false) => {
        const isUp = change >= 0;
        const fmt = v => isCurrency ? v.toLocaleString('vi-VN') + 'đ' : v.toLocaleString('vi-VN');
        return `
            <div class="flex-1 bg-white rounded-xl border border-slate-200 p-4 text-center">
                <div class="text-xs text-slate-500 uppercase font-bold tracking-wider mb-2">${label}</div>
                <div class="text-2xl font-black text-slate-800 mb-1">${fmt(current)}</div>
                <div class="flex items-center justify-center gap-1 text-sm">
                    <i class="fa-solid fa-arrow-${isUp ? 'up' : 'down'} text-${isUp ? '[#27ae60]' : 'red-500'} text-xs"></i>
                    <span class="font-bold text-${isUp ? '[#27ae60]' : 'red-500'}">${isUp ? '+' : ''}${change}%</span>
                    <span class="text-slate-400 text-xs">vs ${fmt(prev)}</span>
                </div>
            </div>`;
    };

    container.innerHTML = `
        <div class="flex flex-col sm:flex-row gap-3 mb-4">
            ${renderKPI('Doanh thu', currentRevenue, prevRevenue, revChange, true)}
            ${renderKPI('Số đơn', currentOrders, prevOrders, orderChange)}
            ${renderKPI('Ticket TB', currentTicket, prevTicket, ticketChange, true)}
        </div>
        <div style="height:220px"><canvas id="periodComparisonChart"></canvas></div>`;

    // Build daily comparison chart
    const days = Math.max(1, Math.ceil(periodMs / (1000 * 60 * 60 * 24)));
    const currentDaily = Array(days).fill(0);
    const prevDaily = Array(days).fill(0);
    const labels = [];

    for (let i = 0; i < days; i++) {
        const d = new Date(startDate); d.setDate(d.getDate() + i);
        labels.push(d.toLocaleDateString('vi-VN', { month: '2-digit', day: '2-digit' }));
    }

    orderHistory.forEach(o => {
        if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return;
        const d = new Date(o.createdAt);
        const rev = o.totalPrice || 0;

        if (d >= startDate && d <= endDate) {
            const idx = Math.floor((d - startDate) / (1000 * 60 * 60 * 24));
            if (idx >= 0 && idx < days) currentDaily[idx] += rev;
        } else if (d >= prevStart && d <= prevEnd) {
            const idx = Math.floor((d - prevStart) / (1000 * 60 * 60 * 24));
            if (idx >= 0 && idx < days) prevDaily[idx] += rev;
        }
    });

    const ctx = document.getElementById('periodComparisonChart');
    if (ctx && typeof Chart !== 'undefined') {
        if (periodComparisonChartInstance) periodComparisonChartInstance.destroy();
        periodComparisonChartInstance = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    { label: 'Khoảng hiện tại', data: currentDaily, backgroundColor: 'rgba(192,160,98,0.7)', borderRadius: 6 },
                    { label: 'Khoảng trước', data: prevDaily, backgroundColor: 'rgba(148,163,184,0.4)', borderRadius: 6 }
                ]
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', labels: { font: { family: 'Manrope', weight: '600' }, usePointStyle: true } } },
                scales: {
                    y: { ticks: { callback: v => (v / 1000).toFixed(0) + 'K' }, grid: { color: '#f1f5f9' } },
                    x: { grid: { display: false }, ticks: { maxTicksLimit: 10 } }
                }
            }
        });
    }
}

// =============================================
// 7B — PROFIT MARGINS (Biên lợi nhuận sản phẩm)
// =============================================
function renderProfitMargins(startDate, endDate) {
    const tbody = document.getElementById('profit-margins-body');
    if (!tbody) return;

    const productStats = {};

    orderHistory.forEach(o => {
        if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return;
        const d = new Date(o.createdAt);
        if (d < startDate || d > endDate) return;

        (o.items || []).forEach(item => {
            const prodId = item.productId || item.product_id || item.id;
            const name = item.name || 'Không rõ';
            const price = item.price || 0;
            const qty = item.quantity || 1;

            if (!productStats[name]) {
                productStats[name] = { prodId, name, price, qty: 0, revenue: 0, cost: 0 };
            }
            productStats[name].qty += qty;
            productStats[name].revenue += price * qty;

            // Calculate ingredient cost
            const product = typeof products !== 'undefined' ? products.find(p => p._id === prodId || p.id === prodId) : null;
            if (product && product.recipe && Array.isArray(product.recipe)) {
                let itemCost = 0;
                product.recipe.forEach(ri => {
                    const ingId = ri.ingredient_id || ri.ingredientId;
                    const amount = ri.amount || ri.quantity || 0;
                    const ing = typeof ingredients !== 'undefined' ? ingredients.find(i => i.id === ingId || i._id === ingId) : null;
                    if (ing && ing.cost_price) {
                        itemCost += (ing.cost_price * amount);
                    }
                });
                productStats[name].cost += itemCost * qty;
            }
        });
    });

    const sorted = Object.values(productStats)
        .map(p => ({
            ...p,
            profit: p.revenue - p.cost,
            margin: p.revenue > 0 ? ((p.revenue - p.cost) / p.revenue * 100) : 0
        }))
        .sort((a, b) => b.profit - a.profit)
        .slice(0, 15);

    tbody.innerHTML = '';

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-slate-500">Chưa có dữ liệu trong khoảng thời gian này.</td></tr>';
        return;
    }

    sorted.forEach((p, i) => {
        const marginColor = p.margin >= 60 ? 'text-[#27ae60]' : (p.margin >= 30 ? 'text-[#b45309]' : 'text-red-500');
        const marginBg = p.margin >= 60 ? 'bg-[#27ae60]' : (p.margin >= 30 ? 'bg-[#b45309]' : 'bg-red-500');
        const hasCost = p.cost > 0;

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                    <span class="w-6 h-6 rounded-full ${i < 3 ? 'bg-[#C0A062] text-white' : 'bg-slate-200 text-slate-600'} text-xs font-bold flex items-center justify-center flex-shrink-0">${i + 1}</span>
                    <span class="font-bold text-slate-800 truncate max-w-[180px]">${window.escapeHTML(p.name)}</span>
                </div>
            </td>
            <td class="py-3 px-4 text-center text-slate-600">${p.qty}</td>
            <td class="py-3 px-4 text-end text-slate-700">${p.revenue.toLocaleString('vi-VN')}đ</td>
            <td class="py-3 px-4 text-end ${hasCost ? 'text-red-500' : 'text-slate-400'}">${hasCost ? p.cost.toLocaleString('vi-VN') + 'đ' : 'N/A'}</td>
            <td class="py-3 px-4 text-end font-bold ${hasCost ? 'text-[#27ae60]' : 'text-slate-400'}">${hasCost ? p.profit.toLocaleString('vi-VN') + 'đ' : 'N/A'}</td>
            <td class="py-3 px-4 text-center">
                ${hasCost ? `
                    <div class="flex items-center gap-2 justify-center">
                        <div class="w-16 h-2 bg-slate-200 rounded-full overflow-hidden"><div class="${marginBg} h-full rounded-full" style="width:${Math.min(100, p.margin)}%"></div></div>
                        <span class="text-xs font-bold ${marginColor}">${p.margin.toFixed(1)}%</span>
                    </div>` : '<span class="text-slate-400 text-xs">Chưa có giá NL</span>'}
            </td>`;
        tbody.appendChild(tr);
    });
}

// =============================================
// 7C — STAFF PERFORMANCE (Hiệu suất nhân viên)
// =============================================
function renderStaffPerformance(startDate, endDate) {
    const tbody = document.getElementById('staff-performance-body');
    if (!tbody) return;

    const staffStats = {};

    orderHistory.forEach(o => {
        if (o.paymentStatus !== 'paid' || o.status === 'Cancelled') return;
        const d = new Date(o.createdAt);
        if (d < startDate || d > endDate) return;

        const staffName = o.created_by || o.createdBy || 'Khách đặt online';
        if (!staffStats[staffName]) {
            staffStats[staffName] = { name: staffName, orders: 0, revenue: 0 };
        }
        staffStats[staffName].orders++;
        staffStats[staffName].revenue += (o.totalPrice || 0);
    });

    const sorted = Object.values(staffStats)
        .map(s => ({ ...s, avgTicket: s.orders > 0 ? Math.round(s.revenue / s.orders) : 0 }))
        .sort((a, b) => b.revenue - a.revenue);

    tbody.innerHTML = '';

    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-slate-500">Chưa có dữ liệu trong khoảng thời gian này.</td></tr>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    sorted.forEach((s, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td class="py-3 px-4">
                <div class="flex items-center gap-2">
                    ${i < 3 ? `<span class="text-lg">${medals[i]}</span>` : `<span class="w-6 h-6 rounded-full bg-slate-200 text-slate-600 text-xs font-bold flex items-center justify-center flex-shrink-0">${i + 1}</span>`}
                    <span class="font-bold text-slate-800">${window.escapeHTML(s.name)}</span>
                </div>
            </td>
            <td class="py-3 px-4 text-center">
                <span class="bg-slate-100 px-2 py-1 rounded-lg text-sm font-bold text-slate-700">${s.orders} đơn</span>
            </td>
            <td class="py-3 px-4 text-end font-bold text-[#C0A062]">${s.revenue.toLocaleString('vi-VN')}đ</td>
            <td class="py-3 px-4 text-end text-slate-600">${s.avgTicket.toLocaleString('vi-VN')}đ</td>`;
        tbody.appendChild(tr);
    });
}

// =============================================
// REALTIME DASHBOARD
// =============================================
let _dashboardRealtimeChannel = null;

function startDashboardRealtime() {
    if (_dashboardRealtimeChannel) return;
    if (!window.AdminState?.tenantId) return;

    _dashboardRealtimeChannel = supabase
        .channel('dashboard-orders-realtime')
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `tenant_id=eq.${window.AdminState.tenantId}`
        }, (payload) => {
            const dashSection = document.getElementById('section-dashboard');
            if (!dashSection || !dashSection.classList.contains('active')) return;

            // Debounce rapid changes
            if (window._dashRealtimeTimer) clearTimeout(window._dashRealtimeTimer);
            window._dashRealtimeTimer = setTimeout(() => {
                loadDashboard();
                // Flash indicator
                const indicator = document.getElementById('realtime-indicator');
                if (indicator) {
                    indicator.classList.add('pulse-live');
                    setTimeout(() => indicator.classList.remove('pulse-live'), 2000);
                }
            }, 800);
        })
        .subscribe();
}

function stopDashboardRealtime() {
    if (_dashboardRealtimeChannel) {
        supabase.removeChannel(_dashboardRealtimeChannel);
        _dashboardRealtimeChannel = null;
    }
}
