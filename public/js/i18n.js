const translations = {
    vi: {
        app_title: "Nohope Coffee",
        my_orders: "Đơn của tôi",
        search_placeholder: "Tìm kiếm món ăn...",
        order_status: "Trạng thái đơn hàng",
        call_staff: "Gọi NV",
        water: "Nước",
        checkout: "Tính Tiền",
        filter_all: "Tất cả",
        filter_coffee: "Cà phê",
        filter_tea: "Trà",
        filter_food: "Đồ ăn",
        loading_menu: "Đang tải thực đơn...",
        cart_empty: "Giỏ hàng đang trống.",
        cart_note: "Ghi chú (Tùy chọn):",
        cart_total: "Tổng thanh toán:",
        btn_cash: "Thanh toán tại quầy",
        btn_transfer: "Chuyển khoản (Duyệt TĐ)",
        modal_checkout_title: "Thanh toán chuyển khoản",
        modal_history_title: "Lịch sử Đơn hàng",
        cart_items_count: "Món",
        view_cart: "Xem giỏ hàng",
        loyalty_title: "Tích điểm / Thành viên:",
        promo_title: "Mã khuyến mãi:",
        qr_scan_prompt: "Sử dụng <strong>App Ngân hàng</strong> hoặc <strong>MoMo</strong> quét mã QR để thanh toán.",
        history_empty: "Bạn chưa đặt đơn hàng nào.",
        options_title: "Tùy chọn món",
        confirm_options: "Cập nhật Giá & Thêm vào Giỏ",
        modal_confirm_title: "Xác nhận",
        modal_confirm_body: "Bạn có chắc chắn không?",
        btn_cancel: "Không",
        btn_confirm: "Có, xác nhận",
        payment_done: "Tôi đã chuyển khoản xong",
        qr_transfer_memo: "Nội dung CK bắt buộc:",
        add_to_cart: "Thêm vào giỏ",
        options_label: "Tùy chọn",
        your_order: "Đơn hàng của bạn",
        // Gacha
        gacha_title: "🎰 Túi Mù",
        gacha_subtitle: "Thanh toán trước, mở túi sau! Lời hay lỗ — hên xui!",
        gacha_add_btn: "Thêm vào giỏ",
        gacha_limited: "✦ Giới hạn ✦",
        gacha_added_toast: "🎰 Đã thêm Túi Mù vào giỏ! Thanh toán để mở túi.",
        gacha_wait_toast: "Đợi đơn hiện tại hoàn thành trước nhé!",
        gacha_win: "LỜI RỒI!",
        gacha_even: "Hoà!",
        gacha_lose: "Lỗ nhẹ!",
        gacha_save: "🔥 Tiết kiệm",
        gacha_exact: "➡️ Giá vừa đúng!",
        gacha_diff: "📉 Chênh",
        gacha_original_price: "Giá gốc:",
        gacha_you_paid: "Bạn trả:",
        // Categories
        filter_milk_tea: "Trà sữa",
        filter_smoothie: "Đá xay",
        filter_fruit_tea: "Trà trái cây",
        filter_pastry: "Bánh ngọt",
        // Delivery
        delivery_btn: "Đặt món trực tuyến",
        delivery_address: "Địa chỉ giao hàng",
        delivery_phone: "Số điện thoại",
        delivery_note: "Ghi chú giao hàng"
    },
    en: {
        app_title: "Nohope Coffee",
        my_orders: "My Orders",
        search_placeholder: "Search for items...",
        order_status: "Order Status",
        call_staff: "Call Staff",
        water: "Water",
        checkout: "Checkout",
        filter_all: "All",
        filter_coffee: "Coffee",
        filter_tea: "Tea",
        filter_food: "Food",
        loading_menu: "Loading menu...",
        cart_empty: "Cart is empty.",
        cart_note: "Note (Optional):",
        cart_total: "Total Amount:",
        btn_cash: "Pay at counter",
        btn_transfer: "Bank Transfer",
        modal_checkout_title: "Bank Transfer Payment",
        modal_history_title: "Order History",
        cart_items_count: "Items",
        view_cart: "View Cart",
        loyalty_title: "Loyalty / Member:",
        promo_title: "Promo Code:",
        qr_scan_prompt: "Use your <strong>Banking App</strong> or <strong>MoMo</strong> to scan this QR code.",
        history_empty: "You haven't placed any orders yet.",
        options_title: "Item Options",
        confirm_options: "Update Price & Add to Cart",
        modal_confirm_title: "Confirm",
        modal_confirm_body: "Are you sure?",
        btn_cancel: "No",
        btn_confirm: "Yes, confirm",
        payment_done: "I have completed the transfer",
        qr_transfer_memo: "Mandatory Transfer Memo:",
        add_to_cart: "Add to Cart",
        options_label: "Options",
        your_order: "Your Order",
        // Gacha
        gacha_title: "🎰 Mystery Box",
        gacha_subtitle: "Pay first, reveal after! Win or lose — it's a gamble!",
        gacha_add_btn: "Add to Cart",
        gacha_limited: "✦ Limited ✦",
        gacha_added_toast: "🎰 Mystery Box added! Checkout to reveal.",
        gacha_wait_toast: "Wait for your current order to complete first!",
        gacha_win: "YOU WON!",
        gacha_even: "Even!",
        gacha_lose: "Slight loss!",
        gacha_save: "🔥 You saved",
        gacha_exact: "➡️ Exact price!",
        gacha_diff: "📉 Diff",
        gacha_original_price: "Original:",
        gacha_you_paid: "You paid:",
        // Categories
        filter_milk_tea: "Milk Tea",
        filter_smoothie: "Smoothie",
        filter_fruit_tea: "Fruit Tea",
        filter_pastry: "Pastry",
        // Delivery
        delivery_btn: "Order Online",
        delivery_address: "Delivery Address",
        delivery_phone: "Phone Number",
        delivery_note: "Delivery Note"
    }
};

let currentLang = localStorage.getItem('lang') || 'vi';

/**
 * Exposed globally so customer.js can call t() for dynamic text.
 * Usage: window.t('add_to_cart') → "Thêm vào giỏ" or "Add to Cart"
 */
window.t = function(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
};

window.toggleLanguage = function() {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    localStorage.setItem('lang', currentLang);
    applyLanguage();
};

function applyLanguage() {
    const t = translations[currentLang];

    // --- 1. Update <html lang=""> ---
    document.documentElement.lang = currentLang;

    // --- 2. Update lang toggle button (preserve icon) ---
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) {
        // Keep the material icon span, only swap the text span
        const textSpan = langBtn.querySelector('span:not(.material-symbols-outlined)');
        if (textSpan) {
            textSpan.textContent = currentLang === 'vi' ? 'EN / VI' : 'VI / EN';
        } else {
            langBtn.textContent = currentLang === 'vi' ? 'EN' : 'VI';
        }
    }

    // --- 3. Static element map (selectors → update type) ---
    const map = {
        '[data-i18n="app_title"]': { html: `<i class="fa-solid fa-mug-hot"></i> ${t.app_title}` },
        '[data-i18n="my_orders"]': { html: t.my_orders },
        // Search inputs (both desktop and mobile)
        '#menu-search':         { placeholder: t.search_placeholder },
        '#menu-search-desktop': { placeholder: t.search_placeholder },
        '#menu-search-mobile':  { placeholder: t.search_placeholder },
        // Banner
        '.banner-title': { html: `<i class="fa-solid fa-clock pulse-icon text-primary me-2"></i> ${t.order_status}` },
        // Staff service buttons — match by onclick attribute
        [`button[onclick*="requestStaffService('staff')"]`]:    { html: `<i class="fa-solid fa-bell text-primary"></i> ${t.call_staff}` },
        [`button[onclick*="requestStaffService('water')"]`]:    { html: `<i class="fa-solid fa-glass-water text-primary"></i> ${t.water}` },
        [`button[onclick*="requestStaffService('checkout')"]`]: { html: `<i class="fa-solid fa-money-bill text-danger"></i> ${t.checkout}` },
        // Cart/checkout
        '#checkout-cash-btn':     { html: `<i class="fa-solid fa-money-bill-wave"></i> ${t.btn_cash}` },
        '#checkout-transfer-btn': { html: `<i class="fa-solid fa-qrcode"></i> ${t.btn_transfer}` },
        '#confirm-payment-btn':   { html: `<i class="fa-solid fa-check-circle"></i> ${t.payment_done}` },
        '#confirm-options-btn':   { text: t.confirm_options },
        // Modal titles
        '#payment-modal h2':        { text: t.modal_checkout_title },
        '#order-history-modal h2':  { text: t.modal_history_title },
        '#options-modal-title':     { text: t.options_title },
        '#options-modal h2':        { text: t.options_title },
        // Confirm modal
        '#confirmModalTitle':  { html: `<i class="fa-solid fa-triangle-exclamation text-accent me-2"></i>${t.modal_confirm_title}` },
        '#confirmModalCancel': { text: t.btn_cancel },
        '#confirmModalOk':     { text: t.btn_confirm },
        // Misc
        'label[for="order-note"]': { text: t.cart_note },
        '.empty-cart':             { text: t.cart_empty },
    };

    for (const selector in map) {
        document.querySelectorAll(selector).forEach(el => {
            const cfg = map[selector];
            if (cfg.html !== undefined)         el.innerHTML = cfg.html;
            else if (cfg.text !== undefined)    el.textContent = cfg.text;
            else if (cfg.placeholder !== undefined) el.placeholder = cfg.placeholder;
        });
    }

    // --- 4. Fine-grained replacements that need extra care ---

    // History empty state
    const historyEmpty = document.querySelector('#history-items-container .empty-cart');
    if (historyEmpty) historyEmpty.textContent = t.history_empty;

    // Payment modal QR prompt
    const qrScanPrompt = document.querySelector('#payment-modal .cart-modal-body p');
    if (qrScanPrompt) qrScanPrompt.innerHTML = t.qr_scan_prompt;

    // Cart total label
    const cartTotalLabel = document.querySelector('.cart-modal-footer .flex-between.mb-2 span:first-child, .cart-modal-footer span.font-bold.text-lg');
    if (cartTotalLabel && !cartTotalLabel.id) cartTotalLabel.textContent = t.cart_total;

    // Cart modal title
    const cartModalTitle = document.querySelector('#cart-modal h2');
    if (cartModalTitle) cartModalTitle.textContent = t.your_order;


    // --- 5. Patch card button text in-place (no full re-render) ---
    // Only update the text node inside "Add to Cart" / "Options" buttons
    // that were built dynamically by customer.js — avoids a costly full DOM rebuild.
    document.querySelectorAll('article[data-product-id] .action-btn-container > button:not(.w-10)').forEach(btn => {
        const icon = btn.querySelector('i');
        if (!icon) return;
        const isOptions = icon.classList.contains('fa-sliders');
        // Clear all child nodes after the icon, then append translated text
        Array.from(btn.childNodes).forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) node.remove();
        });
        btn.append(document.createTextNode(' ' + (isOptions ? t.options_label : t.add_to_cart)));
    });

    // --- 6. Dispatch custom event so other modules can react ---
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang, t } }));
}

/** Utility: get the current translation object (for use in other JS files) */
window.getCurrentTranslations = function() {
    return translations[currentLang];
};

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage();
});
