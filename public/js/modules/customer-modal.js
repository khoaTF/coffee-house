// ====================================================
// customer-modal.js — Modal open/close, event listeners
// ====================================================
import { state, dom, TABLE_NUMBER, statusMap, sessionId } from './customer-config.js';
import { updateCartUI, renderModalCart, generateCartKey, handleCartUpdate } from './customer-cart.js';
import { getActiveCategory, renderMenu, getAvailableToAdd, openCategoryModal, closeCategoryModal } from './customer-menu.js';
import { customerAlert, customerConfirm } from './customer-ui.js';

function isComboItem(item) {
    return item.is_combo === true && Array.isArray(item.combo_items) && item.combo_items.length > 0;
}

// Modal open/close
export function openModal() { 
    dom.cartModal.classList.add('active'); 
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
    const modalBody = dom.cartModal.querySelector('.cart-modal-body');
    if (modalBody) modalBody.scrollTop = 0;
}

export function closeModal() { 
    dom.cartModal.classList.remove('active'); 
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}

export function openPaymentModal(order) {
    const paymentModal = document.getElementById('payment-modal');
    if (!paymentModal) return;
    
    const totalPrice = Math.max(0, order.totalPrice || order.total_price || 0);
    const orderId = order._id || order.id || '';
    const memo = `${orderId.slice(0, 8).toUpperCase()}`;
    
    document.getElementById('payment-total-amount').textContent = totalPrice.toLocaleString('vi-VN') + ' đ';
    document.getElementById('payment-transfer-memo').textContent = memo;
    
    const qrImage = document.getElementById('qr-image');
    const bankId = 'tpbank';
    const accountNo = '89607102002'; 
    qrImage.src = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.jpg?amount=${totalPrice}&addInfo=${encodeURIComponent(memo)}&accountName=LE%20ANH%20KHOA`;

    dom.cartModal.classList.remove('active');
    paymentModal.classList.add('active');
}

export function closePaymentModal() {
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal) paymentModal.classList.remove('active');
    dom.cartModal.classList.add('active');
}

export function openHistoryModal() {
    import('./customer-order.js').then(m => m.renderHistoryModal());
    dom.historyModal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}

export function closeHistoryModal() { 
    dom.historyModal.classList.remove('active'); 
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}

export function openOptionsModal(itemOrId) {
    const item = typeof itemOrId === 'string' ? state.menuItems.find(i => i._id === itemOrId || i.id === itemOrId) : itemOrId;
    if (!item) return;

    if (isComboItem(item)) {
        // Combo modal — currently a stub (feature was referenced but not implemented)
        console.warn('Combo modal not implemented for item:', item.name);
        return;
    }

    state.currentOptionsItem = item;
    document.getElementById('options-modal-title').textContent = item.name;
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    item.options.forEach((opt, optIndex) => {
        const optName = opt.name || opt.optionName;
        const group = document.createElement('div');
        group.className = 'option-group mb-3';
        group.innerHTML = `<h3 style="font-size: 1.1rem; margin-bottom: 10px; font-weight: bold; color: var(--text-main);">${window.escapeHTML(optName)}</h3>`;
        
        opt.choices.forEach((choice, choiceIndex) => {
            const choiceName = choice.name || choice.choiceName;
            const row = document.createElement('label');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.padding = '10px';
            row.style.border = '1px solid var(--border)';
            row.style.borderRadius = '8px';
            row.style.marginBottom = '5px';
            row.style.cursor = 'pointer';
            
            const isChecked = choiceIndex === 0 ? 'checked' : '';
            
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="radio" name="opt_${optIndex}" value="${window.escapeHTML(choiceName)}" data-price="${choice.priceExtra}" ${isChecked} style="accent-color: var(--primary);">
                    <span>${window.escapeHTML(choiceName)}</span>
                </div>
                <span class="text-muted">${choice.priceExtra > 0 ? '+' + choice.priceExtra.toLocaleString('vi-VN') + ' đ' : ''}</span>
            `;
            group.appendChild(row);
        });
        container.appendChild(group);
    });
    
    if (dom.optionsModal) dom.optionsModal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}
window.openOptionsModal = openOptionsModal;

export function closeOptionsModal() { 
    if (dom.optionsModal) dom.optionsModal.classList.remove('active'); 
    state.currentOptionsItem = null;
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}

// Attach all event listeners
export function attachEventListeners() {
    if (dom.floatingCart) dom.floatingCart.addEventListener('click', openModal);
    if (dom.viewCartBtnDocked) dom.viewCartBtnDocked.addEventListener('click', openModal);

    const mobileMyOrdersBtn = document.getElementById('mobile-my-orders-btn');
    if (mobileMyOrdersBtn) mobileMyOrdersBtn.addEventListener('click', openHistoryModal);

    dom.closeModalBtn.addEventListener('click', closeModal);
    dom.myOrdersBtn.addEventListener('click', openHistoryModal);
    dom.closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
    dom.closeOptionsBtn.addEventListener('click', closeOptionsModal);

    // Search input listener
    const searchHandler = () => {
        const activeCategory = getActiveCategory();
        renderMenu(activeCategory);
    };
    const sDesktop = document.getElementById('menu-search-desktop');
    const sMobile = document.getElementById('menu-search-mobile');
    if (sDesktop) sDesktop.addEventListener('input', searchHandler);
    if (sMobile) sMobile.addEventListener('input', searchHandler);

    dom.confirmOptionsBtn.addEventListener('click', () => {
        if (!state.currentOptionsItem) return;
        
        const selectedOptions = [];
        const container = document.getElementById('options-container');
        state.currentOptionsItem.options.forEach((opt, optIndex) => {
            const optName = opt.name || opt.optionName;
            const selectedRadio = container.querySelector(`input[name="opt_${optIndex}"]:checked`);
            if (selectedRadio) {
                selectedOptions.push({
                    optionName: optName,
                    choiceName: selectedRadio.value,
                    priceExtra: parseInt(selectedRadio.dataset.price) || 0
                });
            }
        });
        
        const cartKey = generateCartKey(state.currentOptionsItem._id, selectedOptions);
        handleCartUpdate(cartKey, state.currentOptionsItem, 1, selectedOptions);
        closeOptionsModal();
    });

    // Payment Modal Listeners
    const btnClosePayment = document.getElementById('close-payment-modal');
    if (btnClosePayment) btnClosePayment.addEventListener('click', closePaymentModal);

    const btnConfirmPayment = document.getElementById('confirm-payment-btn');
    if (btnConfirmPayment) {
        btnConfirmPayment.addEventListener('click', () => {
            btnConfirmPayment.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác nhận...';
            btnConfirmPayment.disabled = true;
            if (state.activeOrderId && state.currentPaymentMethod === 'transfer') {
                supabase.from('orders').update({ payment_status: 'paid' }).eq('tenant_id', state.tenantId).eq('id', state.activeOrderId).then(() => {
                    const orderToConfirm = state.sessionOrders.find(o => o.id === state.activeOrderId || o._id === state.activeOrderId) || state.sessionOrders[0];
                    import('./customer-order.js').then(m => m.handleOrderConfirmed(orderToConfirm));
                });
            } else {
                import('./customer-order.js').then(m => m.placeOrder('transfer'));
            }
        });
    }

    if(dom.checkoutCashBtn) {
        dom.checkoutCashBtn.addEventListener('click', () => {
            dom.checkoutCashBtn.disabled = true;
            dom.checkoutCashBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
            if (dom.checkoutTransferBtn) dom.checkoutTransferBtn.disabled = true;
            requestAnimationFrame(() => setTimeout(() => {
                import('./customer-order.js').then(m => m.placeOrder('cash'));
            }, 0));
        });
    }
    
    if(dom.checkoutTransferBtn) {
        dom.checkoutTransferBtn.addEventListener('click', () => {
            dom.checkoutTransferBtn.disabled = true;
            dom.checkoutTransferBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo mã QR...';
            if (dom.checkoutCashBtn) dom.checkoutCashBtn.disabled = true;
            requestAnimationFrame(() => setTimeout(() => {
                import('./customer-order.js').then(m => m.placeOrder('transfer'));
            }, 0));
        });
    }

    // Category Modal
    const catModalBtn = document.getElementById('open-category-modal');
    if (catModalBtn) catModalBtn.addEventListener('click', openCategoryModal);
    const closeCatModalBtn = document.getElementById('close-category-modal');
    if (closeCatModalBtn) closeCatModalBtn.addEventListener('click', closeCategoryModal);

    // Promo Code
    const applyPromoBtn = document.getElementById('apply-promo-btn');
    if (applyPromoBtn) {
        applyPromoBtn.addEventListener('click', () => {
            import('./customer-loyalty.js').then(m => m.applyPromo());
        });
    }
}
