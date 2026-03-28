// =============================================
// ADMIN-ANALYTICS — Charts, Feedback, Dashboard KPI
// =============================================
// Dependencies: admin-core.js (orderHistory, products, supabase, showAdminToast)

let revenueDailyChartInstance = null;
let revenueCategoryChartInstance = null;

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

    orderHistory.forEach(o => {
        if (o.status !== 'Completed' && o.status !== 'Ready') return;

        const d = new Date(o.createdAt);
        if (d >= startDate && d <= endDate) {
            const dateStr = d.toISOString().split('T')[0];
            const dayMatch = dateLabels.find(l => l.dateStr === dateStr);
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
                    <td class="text-center font-bold text-light">${item.qty} đv</td>
                    <td class="text-end text-success">${item.rev.toLocaleString('vi-VN')} đ</td>
                `;
                topItemsEl.appendChild(tr);
            });
        }
    }
}

// --- Feedback Stats ---
async function fetchFeedbackStats() {
    try {
        const { data, error } = await supabase.from('feedback').select('*').order('created_at', { ascending: false });
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
                item.style.borderColor = 'rgba(255,255,255,0.08) !important';

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
                tableInfo.className = 'fw-bold small text-light';
                tableInfo.textContent = `Bàn số: ${f.tableNumber || '?'}`;

                const commentDiv = document.createElement('div');
                commentDiv.className = 'text-white small mt-1';
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
            .gte('created_at', todayStart.toISOString());

        const { data: tablesData } = await supabase
            .from('tables')
            .select('status');

        const total = todayOrders?.length || 0;
        const pending = todayOrders?.filter(o => o.status === 'Pending' || o.status === 'Preparing').length || 0;
        const revenue = todayOrders?.filter(o => o.status === 'Completed').reduce((s, o) => s + (o.total_price || 0), 0) || 0;
        const activeTables = tablesData?.filter(t => t.status === 'occupied').length || 0;

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

        checkLowStock();
    } catch (e) {
        console.error('Dashboard stats error:', e);
    }
}
