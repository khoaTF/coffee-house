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
        openComboSelectionModal(item);
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

    // Item note textarea
    let noteGroup = document.getElementById('options-item-note-group');
    if (!noteGroup) {
        noteGroup = document.createElement('div');
        noteGroup.id = 'options-item-note-group';
        noteGroup.className = 'option-group mb-3';
        noteGroup.innerHTML = `
            <h3 style="font-size: 1.1rem; margin-bottom: 10px; font-weight: bold; color: var(--text-main);">
                <i class="fa-solid fa-pen-to-square" style="color: var(--primary); margin-right: 6px;"></i>Ghi chú cho món
            </h3>
            <textarea id="options-item-note" rows="2" maxlength="200"
                placeholder="VD: Ít đường, không hành, thêm đá..."
                style="width:100%;padding:10px 12px;border:1px solid var(--border);border-radius:10px;font-size:0.95rem;
                background:var(--surface-container);color:var(--text-main);resize:none;font-family:inherit;
                transition:border-color 0.2s;"
                onfocus="this.style.borderColor='var(--primary)'"
                onblur="this.style.borderColor='var(--border)'"></textarea>
        `;
        container.appendChild(noteGroup);
    } else {
        container.appendChild(noteGroup);
        document.getElementById('options-item-note').value = '';
    }
    
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
        
        // Capture item note
        const itemNoteEl = document.getElementById('options-item-note');
        const itemNote = itemNoteEl ? itemNoteEl.value.trim() : '';
        
        const cartKey = generateCartKey(state.currentOptionsItem._id, selectedOptions);
        handleCartUpdate(cartKey, state.currentOptionsItem, 1, selectedOptions, itemNote);
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

// --- Combo Selection Modal ---
function openComboSelectionModal(item) {
    state.currentComboItem = item;
    state.currentComboSelections = {};
    
    const modal = document.getElementById('combo-selection-modal');
    const titleEl = document.getElementById('combo-modal-title');
    const container = document.getElementById('combo-items-container');
    const confirmBtn = document.getElementById('confirm-combo-btn');
    
    if (!modal || !container) return;
    
    titleEl.textContent = item.name;
    container.innerHTML = '';
    
    item.combo_items.forEach((group, groupIndex) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'mb-4';
        groupDiv.innerHTML = `
            <h4 style="font-size:1rem;font-weight:700;color:var(--text-main);margin-bottom:10px;display:flex;align-items:center;gap:6px;">
                <span style="width:24px;height:24px;border-radius:50%;background:var(--primary);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;">${groupIndex + 1}</span>
                ${window.escapeHTML(group.name)}
            </h4>
        `;
        
        group.items.forEach((cItem, itemIndex) => {
            const menuItem = state.menuItems.find(m => m._id === cItem.id || m.id === cItem.id);
            const displayName = menuItem ? menuItem.name : (cItem.name || 'Món ' + (itemIndex + 1));
            const imgUrl = menuItem?.image_url || '';
            const priceExtra = cItem.priceExtra || 0;
            const isDefault = itemIndex === 0;
            
            if (isDefault) state.currentComboSelections[groupIndex] = { id: cItem.id, name: displayName, priceExtra, recipe: menuItem?.recipe || [] };
            
            const choiceEl = document.createElement('label');
            choiceEl.style.cssText = 'display:flex;align-items:center;gap:12px;padding:12px;border:2px solid var(--border);border-radius:14px;margin-bottom:8px;cursor:pointer;transition:all 0.2s;';
            choiceEl.innerHTML = `
                <input type="radio" name="combo_group_${groupIndex}" value="${cItem.id}" ${isDefault ? 'checked' : ''} style="accent-color:var(--primary);width:18px;height:18px;flex-shrink:0;">
                ${imgUrl ? `<img src="${window.escapeHTML(imgUrl)}" style="width:40px;height:40px;border-radius:10px;object-fit:cover;flex-shrink:0;" onerror="this.style.display='none'">` : ''}
                <span style="flex:1;font-weight:600;font-size:0.9rem;color:var(--text-main);">${window.escapeHTML(displayName)}</span>
                ${priceExtra > 0 ? `<span style="font-size:0.85rem;font-weight:700;color:var(--primary);white-space:nowrap;">+${priceExtra.toLocaleString('vi-VN')}đ</span>` : ''}
            `;
            
            const radio = choiceEl.querySelector('input[type="radio"]');
            radio.addEventListener('change', () => {
                state.currentComboSelections[groupIndex] = { id: cItem.id, name: displayName, priceExtra, recipe: menuItem?.recipe || [] };
                // Update active state visuals
                groupDiv.querySelectorAll('label').forEach(l => l.style.borderColor = 'var(--border)');
                choiceEl.style.borderColor = 'var(--primary)';
            });
            
            if (isDefault) choiceEl.style.borderColor = 'var(--primary)';
            groupDiv.appendChild(choiceEl);
        });
        
        container.appendChild(groupDiv);
    });
    
    modal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
    
    // Attach confirm
    if (confirmBtn) {
        confirmBtn.onclick = () => {
            const selections = Object.values(state.currentComboSelections);
            const selectedOptions = selections.map((sel, idx) => ({
                optionName: item.combo_items[idx]?.name || `Nhóm ${idx + 1}`,
                choiceName: sel.name,
                priceExtra: sel.priceExtra || 0,
                recipe: sel.recipe || []
            }));
            
            const cartKey = generateCartKey(item._id || item.id, selectedOptions);
            handleCartUpdate(cartKey, item, 1, selectedOptions);
            
            modal.classList.remove('active');
            const fabEl = document.querySelector('.fab-container');
            if (fabEl) fabEl.style.display = 'flex';
            state.currentComboItem = null;
            state.currentComboSelections = {};
        };
    }
}

window.closeComboModal = function() {
    const modal = document.getElementById('combo-selection-modal');
    if (modal) modal.classList.remove('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
};
