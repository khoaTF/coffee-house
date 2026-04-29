// =============================================
// SHARED HELPERS — Reusable utility functions
// =============================================

// --- Data Mappers (Supabase snake_case → camelCase) ---
window.mapOrder = function(o) {
    return {
        ...o,
        _id: o.id,
        createdAt: o.created_at,
        tableNumber: o.table_number,
        orderNote: o.order_note,
        totalPrice: o.total_price,
        discountAmount: o.discount_amount,
        paymentMethod: o.payment_method,
        paymentStatus: o.payment_status
    };
};

window.mapProduct = function(p) {
    return {
        ...p,
        _id: p.id,
        imageUrl: p.image_url,
        isAvailable: p.is_available,
        isBestSeller: p.is_best_seller
    };
};

window.mapIngredient = function(i) {
    return {
        ...i,
        _id: i.id,
        lowStockThreshold: i.low_stock_threshold
    };
};

// --- Avatar Renderer ---
window.renderAvatar = function(el, url) {
    if (!el) return;
    if (url) {
        const img = document.createElement('img');
        img.src = url;
        img.alt = '';
        img.className = 'w-full h-full object-cover';
        img.onerror = function() {
            this.onerror = null;
            el.innerHTML = '';
            const icon = document.createElement('i');
            icon.className = 'fa-solid fa-user text-[#C0A062] text-xs';
            el.appendChild(icon);
        };
        el.innerHTML = '';
        el.appendChild(img);
    } else {
        el.innerHTML = '';
        const icon = document.createElement('i');
        icon.className = 'fa-solid fa-user text-[#C0A062] text-xs';
        el.appendChild(icon);
    }
};

// --- Global Error Handler & Fallback ---
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
    // Try to show a generic error toast if the function exists
    if (typeof showToast === 'function') {
        showToast('Có lỗi kết nối hoặc xử lý. Vui lòng thử lại!', 'danger');
    }
});

window.onerror = function(msg, source, line, col, error) {
    console.error('Global Error:', { msg, source, line, col, error });
    // Prevent UI from hanging blank
    if (typeof showToast === 'function') {
        showToast('Đã xảy ra lỗi không mong muốn. Vui lòng tải lại trang.', 'danger');
    }
    return false;
};

// --- Global Rapid Click Blocker ---
// Prevents rapid clicking on any buttons/submits to avoid duplicate requests/modal stacking
document.addEventListener('click', (e) => {
    const btn = e.target.closest('button, .btn, .action-btn, [type="submit"]');
    if (btn && !btn.disabled && !btn.hasAttribute('data-no-block')) {
        const originalPointerEvents = btn.style.pointerEvents;
        btn.style.pointerEvents = 'none';
        setTimeout(() => {
            btn.style.pointerEvents = originalPointerEvents;
        }, 1000); // Block for 1 second
    }
}, true); // Capture phase to execute before event handlers
