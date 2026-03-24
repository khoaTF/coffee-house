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
        qr_transfer_memo: "Nội dung CK bắt buộc:"
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
        qr_transfer_memo: "Mandatory Transfer Memo:"
    }
};

let currentLang = localStorage.getItem('lang') || 'vi';

window.toggleLanguage = function() {
    currentLang = currentLang === 'vi' ? 'en' : 'vi';
    localStorage.setItem('lang', currentLang);
    applyLanguage();
}

function applyLanguage() {
    const t = translations[currentLang];
    
    // Update Toggle Button text
    const langBtn = document.getElementById('lang-toggle');
    if (langBtn) langBtn.textContent = currentLang === 'vi' ? 'EN' : 'VI';
    if (document.documentElement) document.documentElement.lang = currentLang;

    // We replace strings systematically
    const map = {
        '[data-i18n="app_title"]': { html: `<i class="fa-solid fa-mug-hot"></i> ${t.app_title}` },
        '[data-i18n="my_orders"]': { html: t.my_orders },
        '#menu-search': { placeholder: t.search_placeholder },
        '.banner-title': { html: `<i class="fa-solid fa-clock pulse-icon text-primary me-2"></i> ${t.order_status}` },
        [`button[onclick="requestStaffService('staff')"]`]: { html: `<i class="fa-solid fa-bell text-primary"></i> ${t.call_staff}` },
        [`button[onclick="requestStaffService('water')"]`]: { html: `<i class="fa-solid fa-glass-water text-primary"></i> ${t.water}` },
        [`button[onclick="requestStaffService('checkout')"]`]: { html: `<i class="fa-solid fa-money-bill text-danger"></i> ${t.checkout}` },
        'button[data-category="All"]': { text: t.filter_all },
        'button[data-category="Coffee"]': { text: t.filter_coffee },
        'button[data-category="Tea"]': { text: t.filter_tea },
        'button[data-category="Food"]': { text: t.filter_food },
        '#view-cart-btn': { text: t.view_cart },
        '#loader': { text: t.loading_menu },
        '.empty-cart': { text: t.cart_empty },
        'label[for="order-note"]': { text: t.cart_note },
        '#payment-modal h2': { text: t.modal_checkout_title },
        '#order-history-modal h2': { text: t.modal_history_title },
        '#options-modal h2': { text: t.options_title },
        '#checkout-cash-btn': { html: `<i class="fa-solid fa-money-bill-wave"></i> ${t.btn_cash}` },
        '#checkout-transfer-btn': { html: `<i class="fa-solid fa-qrcode"></i> ${t.btn_transfer}` },
        '#confirm-payment-btn': { html: `<i class="fa-solid fa-check-circle"></i> ${t.payment_done}` },
        '#confirm-options-btn': { text: t.confirm_options },
        '#confirmModalTitle': { html: `<i class="fa-solid fa-triangle-exclamation text-accent me-2"></i>${t.modal_confirm_title}` },
        '#confirmModalCancel': { text: t.btn_cancel },
        '#confirmModalOk': { text: t.btn_confirm }
    };
    
    for (const selector in map) {
        document.querySelectorAll(selector).forEach(el => {
            if (map[selector].html) el.innerHTML = map[selector].html;
            else if (map[selector].text) el.textContent = map[selector].text;
            else if (map[selector].placeholder) el.placeholder = map[selector].placeholder;
        });
    }
    
    // Custom fine-grained replacements
    const historyEmpty = document.querySelector('#history-items-container .empty-cart');
    if (historyEmpty) historyEmpty.textContent = t.history_empty;

    const qrScanPrompt = document.querySelector('#payment-modal .cart-modal-body p');
    if (qrScanPrompt) qrScanPrompt.innerHTML = t.qr_scan_prompt;

    const qrMemo = document.querySelector('#payment-modal .cart-modal-body .mb-2 span.text-muted');
    if (qrMemo) qrMemo.textContent = t.qr_transfer_memo;

    const cartTotalLabel = document.querySelector('.cart-modal-footer .flex-between.mb-2 span:first-child');
    if (cartTotalLabel) cartTotalLabel.textContent = t.cart_total;
    
    const yourOrderLabel = document.querySelector('#cart-modal h2');
    if (yourOrderLabel && !yourOrderLabel.id) yourOrderLabel.textContent = t.cart_empty === 'Cart is empty.' ? 'Your Order' : 'Đơn hàng của bạn';

    // Re-render menu to update inner HTML built texts (like add to cart buttons)
    if (typeof renderMenu === 'function' && document.querySelector('.pill.active')) {
        renderMenu(document.querySelector('.pill.active').dataset.category);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    applyLanguage();
});
