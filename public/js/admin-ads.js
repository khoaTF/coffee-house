// admin-ads.js

// Ensure showToast is available (defined in superadmin.js but not in admin scope)
if (typeof window.showToast !== 'function') {
    window.showToast = function(message, type = 'success') {
        // Create toast element
        const toast = document.createElement('div');
        const bgColor = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#f59e0b';
        toast.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 99999;
            padding: 12px 20px; border-radius: 12px; color: white; font-weight: 600;
            font-size: 14px; background: ${bgColor}; box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(120%); transition: transform 0.3s ease;
            max-width: 360px;
        `;
        toast.textContent = message;
        document.body.appendChild(toast);
        requestAnimationFrame(() => { toast.style.transform = 'translateX(0)'; });
        setTimeout(() => {
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };
}
// ---------------------------
// 1. AI Best Seller feature
// ---------------------------
async function autoAssignBestSellers() {
    try {
        const btn = document.querySelector('button[onclick="autoAssignBestSellers()"]');
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<i class="fa-solid fa-spinner fa-spin me-2"></i> Đang tính toán...`;
        btn.disabled = true;

        // 1. Get orders from the past 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        const { data: recentOrders, error: orderError } = await supabase
            .from('orders')
            .select(`*`)
            .eq('tenant_id', window.AdminState.tenantId)
            .gte('created_at', thirtyDaysAgo.toISOString())
            .eq('payment_status', 'paid')
            .neq('status', 'Cancelled');

        if (orderError) throw orderError;

        if (!recentOrders || recentOrders.length === 0) {
            alert('Không đủ dữ liệu đơn hàng trong 30 ngày qua để phân tích.');
            btn.innerHTML = originalContent;
            btn.disabled = false;
            return;
        }

        // 2. Tally quantities sold per product
        const salesCount = {};
        recentOrders.forEach(order => {
            let items = [];
            if (typeof order.items === 'string') {
                try { items = JSON.parse(order.items); } catch(e) {}
            } else if (Array.isArray(order.items)) {
                items = order.items;
            }

            items.forEach(item => {
                if (item.productId) {
                    salesCount[item.productId] = (salesCount[item.productId] || 0) + (item.quantity || 1);
                }
            });
        });

        // 3. Sort products by sales
        const sortedProducts = Object.entries(salesCount)
            .sort((a, b) => b[1] - a[1])
            .map(entry => entry[0]);

        if (sortedProducts.length === 0) {
            alert('Chưa có sản phẩm nào được bán trong 30 ngày qua.');
            btn.innerHTML = originalContent;
            btn.disabled = false;
            return;
        }

        // Top 4 products
        const topProductIds = sortedProducts.slice(0, 4);

        // 4. Update database
        // Bỏ is_best_seller của tất cả sản phẩm
        await supabase.from('products').update({ is_best_seller: false }).eq('tenant_id', window.AdminState.tenantId).neq('id', 'dummy'); 
        // Gán is_best_seller cho top 4
        const { error: updateError } = await supabase
            .from('products')
            .update({ is_best_seller: true })
            .eq('tenant_id', window.AdminState.tenantId)
            .in('id', topProductIds);

        if (updateError) throw updateError;

        showToast('Đã tính toán và cập nhật danh sách Best Seller bằng AI thành công!', 'success');
        
        // Cập nhật lại giao diện menu
        if (typeof loadProducts === 'function') {
            await loadProducts();
        }

    } catch (err) {
        console.error('AI Best Seller Error:', err);
        alert('Có lỗi khi gán Best Seller: ' + err.message);
    } finally {
        const btn = document.querySelector('button[onclick="autoAssignBestSellers()"]');
        if (btn) {
            btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles me-2"></i> AI Best Seller`;
            btn.disabled = false;
        }
    }
}

// ---------------------------
// 2. Banner / Advertisement Management
// ---------------------------

let bannersList = [];
let _adBannerModal = null;

function getAdBannerModal() {
    if (!_adBannerModal) {
        const el = document.getElementById('adBannerModal');
        if (el) _adBannerModal = new bootstrap.Modal(el);
    }
    return _adBannerModal;
}

async function loadBanners() {
    const tbody = document.getElementById('banners-table-body');
    if (!tbody) return;

    try {
        const { data, error } = await supabase
            .from('promotion_banners')
            .select('*')
            .eq('tenant_id', window.AdminState.tenantId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        bannersList = data || [];
        renderBannersTable();
    } catch (err) {
        console.error('Error loading banners:', err);
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-red-500">Lỗi: ${window.escapeHTML ? window.escapeHTML(err.message) : err.message}</td></tr>`;
    }
}

function renderBannersTable() {
    const tbody = document.getElementById('banners-table-body');
    if (!tbody) return;

    if (bannersList.length === 0) {
        tbody.innerHTML = `<tr><td colspan="6" class="text-center py-6 text-slate-500">Chưa có banner quảng cáo nào.</td></tr>`;
        return;
    }

    tbody.innerHTML = bannersList.map(banner => `
        <tr class="hover:bg-slate-50 transition-colors">
            <td class="py-3 px-4">
                <div class="w-16 h-10 rounded overflow-hidden border border-slate-200">
                    <img src="${banner.image_url}" alt="${escapeHTML(banner.title)}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100x50?text=Error'">
                </div>
            </td>
            <td class="py-3 px-4 font-medium text-slate-800">${escapeHTML(banner.title)}</td>
            <td class="py-3 px-4">
                ${banner.is_popup ? '<span class="badge bg-teal-100 text-teal-700 px-2.5 py-1 rounded-lg">Pop-up</span>' : '<span class="badge bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-lg">Slider Đầu Trang</span>'}
            </td>
            <td class="py-3 px-4 text-slate-500 text-sm max-w-xs truncate" title="${banner.target_url || ''}">
                ${banner.target_url ? `<a href="${banner.target_url}" target="_blank" class="text-indigo-500 hover:underline"><i class="fa-solid fa-link me-1"></i>Link</a>` : 'Không có'}
            </td>
            <td class="py-3 px-4">
                <div class="form-check form-switch custom-switch">
                    <input class="form-check-input" type="checkbox" role="switch" onchange="toggleBannerStatus('${banner.id}', this.checked)" ${banner.is_active ? 'checked' : ''}>
                </div>
            </td>
            <td class="py-3 px-4 text-end">
                <button class="btn btn-sm btn-outline-danger rounded-lg" onclick="deleteBanner('${banner.id}')" title="Xóa banner">
                    <i class="fa-regular fa-trash-can"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function openAdBannerModal() {
    document.getElementById('adBannerForm').reset();
    document.getElementById('bannerId').value = '';
    const modal = getAdBannerModal();
    if (modal) modal.show();
}

async function saveAdBanner() {
    const title = document.getElementById('bannerTitle').value.trim();
    const imageUrl = document.getElementById('bannerImageUrl').value.trim();
    const targetUrl = document.getElementById('bannerTargetUrl').value.trim();
    const position = document.getElementById('bannerPosition').value;
    const isActive = document.getElementById('bannerIsActive').checked;
    
    if (!title || !imageUrl) {
        alert('Vui lòng nhập đầy đủ tiêu đề và hình ảnh URL.');
        return;
    }

    try {
        const payload = {
            tenant_id: window.AdminState.tenantId,
            title,
            image_url: imageUrl,
            target_url: targetUrl || null,
            is_active: isActive,
            is_popup: position === 'pop_up'
        };

        const { error } = await supabase.from('promotion_banners').insert([payload]);

        if (error) throw error;

        showToast('Đã thêm banner thành công!', 'success');
        const modal = getAdBannerModal();
        if (modal) modal.hide();
        loadBanners();

    } catch (err) {
        console.error('Error saving banner:', err);
        alert('Lỗi: ' + err.message);
    }
}

async function toggleBannerStatus(id, isActive) {
    try {
        const { error } = await supabase.from('promotion_banners').update({ is_active: isActive }).eq('tenant_id', window.AdminState.tenantId).eq('id', id);
        if (error) throw error;
        
        const banner = bannersList.find(b => b.id === id);
        if (banner) banner.is_active = isActive;
        
        showToast(isActive ? 'Đã bật banner.' : 'Đã tắt banner.', 'success');
    } catch (err) {
        console.error('Error toggling banner status:', err);
        alert('Lỗi cập nhật trạng thái: ' + err.message);
        loadBanners();
    }
}

async function deleteBanner(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa banner này? Hành động này không thể hoàn tác.')) return;
    
    try {
        const { error } = await supabase.from('promotion_banners').delete().eq('tenant_id', window.AdminState.tenantId).eq('id', id);
        if (error) throw error;
        
        showToast('Đã xóa banner.', 'success');
        loadBanners();
    } catch (err) {
        console.error('Error deleting banner:', err);
        alert('Lỗi khi xóa banner: ' + err.message);
    }
}

// Hook into tab switching to load banners when promo section is shown
document.addEventListener('DOMContentLoaded', () => {
    const originalSwitchTab = window.switchTab;
    if (typeof originalSwitchTab === 'function') {
        window.switchTab = function(tabId) {
            originalSwitchTab(tabId);
            if (tabId === 'promo') {
                loadBanners();
            }
        };
    }
});
