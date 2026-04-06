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
        gacha_title: "🎰 Túi Mù",
        gacha_subtitle: "Thanh toán trước, mở túi sau! Lời hay lỗ — hên xui!",
        gacha_add_btn: "Thêm vào giỏ",
        gacha_limited: "✦ Giới hạn ✦",
        gacha_added_toast: "🎰 Đã thêm Túi Mù vào giỏ! Thanh toán để mở túi.",
        gacha_wait_toast: "Đợi đơn hiện tại hoàn thành trước nhé!",
        gacha_win: "LỜI RỒI!", gacha_even: "Hoà!", gacha_lose: "Lỗ nhẹ!",
        gacha_save: "🔥 Tiết kiệm", gacha_exact: "➡️ Giá vừa đúng!",
        gacha_diff: "📉 Chênh", gacha_original_price: "Giá gốc:", gacha_you_paid: "Bạn trả:",
        filter_milk_tea: "Trà sữa", filter_smoothie: "Đá xay",
        filter_fruit_tea: "Trà trái cây", filter_pastry: "Bánh ngọt",
        delivery_btn: "Đặt món trực tuyến", delivery_address: "Địa chỉ giao hàng",
        delivery_phone: "Số điện thoại", delivery_note: "Ghi chú giao hàng"
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
        gacha_title: "🎰 Mystery Box",
        gacha_subtitle: "Pay first, reveal after! Win or lose — it's a gamble!",
        gacha_add_btn: "Add to Cart",
        gacha_limited: "✦ Limited ✦",
        gacha_added_toast: "🎰 Mystery Box added! Checkout to reveal.",
        gacha_wait_toast: "Wait for your current order to complete first!",
        gacha_win: "YOU WON!", gacha_even: "Even!", gacha_lose: "Slight loss!",
        gacha_save: "🔥 You saved", gacha_exact: "➡️ Exact price!",
        gacha_diff: "📉 Diff", gacha_original_price: "Original:", gacha_you_paid: "You paid:",
        filter_milk_tea: "Milk Tea", filter_smoothie: "Smoothie",
        filter_fruit_tea: "Fruit Tea", filter_pastry: "Pastry",
        delivery_btn: "Order Online", delivery_address: "Delivery Address",
        delivery_phone: "Phone Number", delivery_note: "Delivery Note"
    }
};

// ─── State ───────────────────────────────────────────────────────────────────
let currentLang = localStorage.getItem('lang') || 'vi';

// ─── Global helpers ───────────────────────────────────────────────────────────
/** Translate a key. Usage: window.t('add_to_cart') */
window.t = function(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
};

/** Toggle VI ↔ EN. Called by onclick in HTML. */
window.toggleLanguage = function() {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    localStorage.setItem('lang', currentLang);
    applyLanguage();
};

/** Get current lang code externally */
window.getCurrentLang = function() { return currentLang; };

// Map of DB category names (any language) → translations
const categoryMap = {
    'All':          { vi: 'Tất cả',       en: 'All' },
    'Tất cả':      { vi: 'Tất cả',       en: 'All' },
    'Cà phê':      { vi: 'Cà phê',       en: 'Coffee' },
    'Coffee':      { vi: 'Cà phê',       en: 'Coffee' },
    'Trà':         { vi: 'Trà',          en: 'Tea' },
    'Tea':         { vi: 'Trà',          en: 'Tea' },
    'Trà sữa':     { vi: 'Trà sữa',      en: 'Milk Tea' },
    'Milk Tea':    { vi: 'Trà sữa',      en: 'Milk Tea' },
    'Đá xay':      { vi: 'Đá xay',       en: 'Smoothie' },
    'Smoothie':    { vi: 'Đá xay',       en: 'Smoothie' },
    'Sinh tố':     { vi: 'Sinh tố',      en: 'Smoothie' },
    'Trà trái cây':{ vi: 'Trà trái cây', en: 'Fruit Tea' },
    'Fruit Tea':   { vi: 'Trà trái cây', en: 'Fruit Tea' },
    'Bánh ngọt':   { vi: 'Bánh ngọt',    en: 'Pastry' },
    'Pastry':      { vi: 'Bánh ngọt',    en: 'Pastry' },
    'Đồ ăn':       { vi: 'Đồ ăn',        en: 'Food' },
    'Food':        { vi: 'Đồ ăn',        en: 'Food' },
};

/**
 * Translates a database category name to the current language.
 * Usage in renderCategories: window.translateCategory(cat)
 */
window.translateCategory = function(cat) {
    const entry = categoryMap[cat];
    return entry ? (entry[currentLang] || cat) : cat;
};

// ─── Apply all translations to DOM ───────────────────────────────────────────
function applyLanguage() {
    const tr = translations[currentLang];
    if (!tr) return;

    // 1. html[lang]
    document.documentElement.lang = currentLang;

    // 2. Lang toggle button — only update the non-icon text span
    safeUpdate('#lang-toggle', btn => {
        const textSpan = btn.querySelector('span:not(.material-symbols-outlined)');
        if (textSpan) {
            textSpan.textContent = currentLang === 'vi' ? 'EN / VI' : 'VI / EN';
        }
    });

    // 3. data-i18n attributes (simplest approach — always works)
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (!tr[key]) return;
        if (el.tagName === 'INPUT') el.placeholder = tr[key];
        else el.innerHTML = tr[key];
    });

    // 4. Specific selectors — each wrapped individually so one failure won't block others
    const updates = [
        ['[data-i18n="app_title"]',       el => el.innerHTML = `<i class="fa-solid fa-mug-hot"></i> ${tr.app_title}`],
        ['[data-i18n="my_orders"]',        el => el.innerHTML = tr.my_orders],
        ['#menu-search',                   el => el.placeholder = tr.search_placeholder],
        ['#menu-search-desktop',           el => el.placeholder = tr.search_placeholder],
        ['#menu-search-mobile',            el => el.placeholder = tr.search_placeholder],
        ['.banner-title',                  el => el.innerHTML = `<i class="fa-solid fa-clock pulse-icon text-primary me-2"></i> ${tr.order_status}`],
        ['#checkout-cash-btn',             el => el.innerHTML = `<i class="fa-solid fa-money-bill-wave"></i> ${tr.btn_cash}`],
        ['#checkout-transfer-btn',         el => el.innerHTML = `<i class="fa-solid fa-qrcode"></i> ${tr.btn_transfer}`],
        ['#confirm-payment-btn',           el => el.innerHTML = `<i class="fa-solid fa-check-circle"></i> ${tr.payment_done}`],
        ['#confirm-options-btn',           el => el.textContent = tr.confirm_options],
        ['#payment-modal h2',              el => el.textContent = tr.modal_checkout_title],
        ['#order-history-modal h2',        el => el.textContent = tr.modal_history_title],
        ['#options-modal-title',           el => el.textContent = tr.options_title],
        ['#options-modal h2',              el => el.textContent = tr.options_title],
        ['#confirmModalTitle',             el => el.innerHTML = `<i class="fa-solid fa-triangle-exclamation text-accent me-2"></i>${tr.modal_confirm_title}`],
        ['#confirmModalCancel',            el => el.textContent = tr.btn_cancel],
        ['#confirmModalOk',                el => el.textContent = tr.btn_confirm],
        ['label[for="order-note"]',        el => el.textContent = tr.cart_note],
        ['.empty-cart',                    el => el.textContent = tr.cart_empty],
        ['#cart-modal h2',                 el => el.textContent = tr.your_order],
    ];

    updates.forEach(([selector, fn]) => {
        try {
            document.querySelectorAll(selector).forEach(fn);
        } catch(e) {
            console.warn('[i18n] selector failed:', selector, e.message);
        }
    });

    // 5. Staff buttons — find by data attribute to avoid fragile onclick selectors
    document.querySelectorAll('[data-service]').forEach(btn => {
        const svc = btn.getAttribute('data-service');
        const icon = btn.querySelector('i') ? btn.querySelector('i').outerHTML : '';
        if (svc === 'staff')    btn.innerHTML = `<i class="fa-solid fa-bell text-primary"></i> ${tr.call_staff}`;
        else if (svc === 'water')    btn.innerHTML = `<i class="fa-solid fa-glass-water text-primary"></i> ${tr.water}`;
        else if (svc === 'checkout') btn.innerHTML = `<i class="fa-solid fa-money-bill text-danger"></i> ${tr.checkout}`;
    });

    // 6. Fine-grained
    try {
        const historyEmpty = document.querySelector('#history-items-container .empty-cart');
        if (historyEmpty) historyEmpty.textContent = tr.history_empty;

        const qrPrompt = document.querySelector('#payment-modal .cart-modal-body p');
        if (qrPrompt) qrPrompt.innerHTML = tr.qr_scan_prompt;

        const cartTotal = document.querySelector('.cart-modal-footer .flex-between.mb-2 span:first-child');
        if (cartTotal) cartTotal.textContent = tr.cart_total;
    } catch(e) {
        console.warn('[i18n] fine-grained update failed:', e.message);
    }

    // 7. Patch card buttons in-place (no full menu re-render)
    try {
        document.querySelectorAll('article[data-product-id] .action-btn-container > button:not(.w-10)').forEach(btn => {
            const icon = btn.querySelector('i');
            if (!icon) return;
            const isOptions = icon.classList.contains('fa-sliders');
            Array.from(btn.childNodes).forEach(node => {
                if (node.nodeType === Node.TEXT_NODE) node.remove();
            });
            btn.append(document.createTextNode(' ' + (isOptions ? tr.options_label : tr.add_to_cart)));
        });
    } catch(e) {
        console.warn('[i18n] card patch failed:', e.message);
    }

    // 9. Patch category pills in-place (no re-render needed)
    try {
        document.querySelectorAll('[data-category]').forEach(el => {
            const raw = el.getAttribute('data-category');
            const entry = categoryMap[raw];
            if (!entry) return;
            const textNode = el.querySelector('span:not(.material-symbols-outlined)') || el;
            const target = textNode.tagName === 'SPAN' ? textNode : null;
            if (target) {
                target.textContent = entry[currentLang] || raw;
            } else {
                // button without span — set textContent directly
                el.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
                        node.textContent = ' ' + (entry[currentLang] || raw) + ' ';
                    }
                });
            }
        });
    } catch(e) {
        console.warn('[i18n] category pill patch failed:', e.message);
    }

    // 10. Notify other modules
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang: currentLang, t: tr } }));
}

// Helper: safely update a single element by selector
function safeUpdate(selector, fn) {
    try {
        const el = document.querySelector(selector);
        if (el) fn(el);
    } catch(e) {
        console.warn('[i18n] safeUpdate failed for:', selector, e.message);
    }
}

window.getCurrentTranslations = function() { return translations[currentLang]; };

document.addEventListener('DOMContentLoaded', () => { applyLanguage(); });
