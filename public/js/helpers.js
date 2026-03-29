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

// --- Global Error Handler ---
window.addEventListener('unhandledrejection', function(e) {
    console.error('Unhandled Promise Rejection:', e.reason);
});

window.onerror = function(msg, source, line, col, error) {
    console.error('Global Error:', { msg, source, line, col, error });
    return false;
};
