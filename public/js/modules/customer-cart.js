// ====================================================
// customer-cart.js — Cart CRUD, UI updates
// ====================================================
import { state, dom } from './customer-config.js';
import { getAvailableToAdd, updateMenuCardsUI } from './customer-menu.js';
import { customerAlert } from './customer-ui.js';

// Generate unique cart key based on options
export function generateCartKey(productId, selectedOptions) {
    if (!selectedOptions || selectedOptions.length === 0) return productId;
    const optString = selectedOptions.map(o => `${o.optionName}:${o.choiceName}`).sort().join('|');
    return `${productId}|${optString}`;
}

export function handleCartUpdate(cartKey, baseItem, change, selectedOptions) {
    const existingIndex = state.cart.findIndex(c => c.cartKey === cartKey);
    
    if (existingIndex > -1) {
        const newQty = state.cart[existingIndex].quantity + change;
        if (newQty <= 0) {
            state.cart.splice(existingIndex, 1);
        } else {
            state.cart[existingIndex].quantity = newQty;
        }
    } else if (change > 0) {
        state.cart.push({ 
            ...baseItem, 
            cartKey: cartKey,
            quantity: 1,
            selectedOptions: selectedOptions
        });
    } else if (change < 0) {
        for(let i = state.cart.length - 1; i >= 0; i--) {
            if(state.cart[i]._id === baseItem._id) {
                if(state.cart[i].quantity > 1) {
                    state.cart[i].quantity--;
                } else {
                    state.cart.splice(i, 1);
                }
                break;
            }
        }
    }

    updateCartUI();

    // Upsell popup logic
    if (change > 0 && !window.upsellShown) {
        const hasDrink = state.cart.some(c => c.category === 'Coffee' || c.category === 'Tea');
        const hasCroissant = state.cart.some(c => c.name.includes('Sừng Trâu') || c.name.toLowerCase().includes('croissant'));
        if (hasDrink && !hasCroissant) {
            window.upsellShown = true;
            const um = document.getElementById('upsell-modal');
            if (um) um.classList.add('active');
        }
    }
}

window.setCartQuantity = (productIdOrCartKey, newQty) => {
    newQty = parseInt(newQty);
    if (isNaN(newQty) || newQty < 0) return;

    if (!productIdOrCartKey.includes('|')) {
        const item = state.menuItems.find(i => i._id === productIdOrCartKey);
        if(!item) return;
        
        if (item.options && item.options.length > 0) {
            updateCartUI();
            return; 
        }

        const existingIndex = state.cart.findIndex(c => c._id === productIdOrCartKey);
        const currentQty = existingIndex > -1 ? state.cart[existingIndex].quantity : 0;
        const available = getAvailableToAdd(item);
        
        if (newQty > currentQty + available) {
            newQty = currentQty + available;
            customerAlert("Đã đạt giới hạn tối đa có thể đặt cho món này!");
        }

        if (existingIndex > -1) {
            if (newQty === 0) {
                state.cart.splice(existingIndex, 1);
            } else {
                state.cart[existingIndex].quantity = newQty;
            }
        } else if (newQty > 0) {
            state.cart.push({ ...item, cartKey: productIdOrCartKey, quantity: newQty, selectedOptions: [] });
        }
    } else {
        const existingIndex = state.cart.findIndex(c => c.cartKey === productIdOrCartKey);
        if (existingIndex > -1) {
            const currentItemFromCart = state.cart[existingIndex];
            const item = state.menuItems.find(i => i._id === currentItemFromCart._id);
            const available = getAvailableToAdd(item);
            
            if (newQty > currentItemFromCart.quantity + available) {
                newQty = currentItemFromCart.quantity + available;
                customerAlert("Đã đạt giới hạn tối đa có thể đặt cho món này!");
            }
            
            if (newQty === 0) {
                state.cart.splice(existingIndex, 1);
            } else {
                state.cart[existingIndex].quantity = newQty;
            }
        }
    }

    updateCartUI();
};

window.updateCart = (productIdOrCartKey, change) => {
    if (!productIdOrCartKey.includes('|')) {
        const item = state.menuItems.find(i => i._id === productIdOrCartKey);
        if(!item) return;
        
        if (change > 0 && getAvailableToAdd(item) <= 0) {
            customerAlert("Món này đã hết nguyên liệu, không thể thêm nữa!");
            return;
        }
        
        if (change > 0 && item.options && item.options.length > 0) {
            import('./customer-modal.js').then(m => m.openOptionsModal(item));
            return;
        }
        
        handleCartUpdate(productIdOrCartKey, item, change, []);
    } else {
        const cartItem = state.cart.find(c => c.cartKey === productIdOrCartKey);
        if(!cartItem && change < 0) return;
        
        const item = state.menuItems.find(i => i._id === (cartItem ? cartItem._id : productIdOrCartKey.split('|')[0]));
        
        if (change > 0 && getAvailableToAdd(item) <= 0) {
            customerAlert("Món này đã hết nguyên liệu, không thể thêm nữa!");
            return;
        }
        
        handleCartUpdate(productIdOrCartKey, item, change, cartItem ? cartItem.selectedOptions : []);
    }
};

window.closeUpsellModal = function() {
    const um = document.getElementById('upsell-modal');
    if (um) um.classList.remove('active');
}

window.addUpsellItem = function() {
    const dummyCroissant = {
        id: 'upsell-croissant', _id: 'upsell-croissant', name: 'Bánh Sừng Trâu', price: 15000, category: 'Food', options: [], imageUrl: 'https://images.unsplash.com/photo-1555507036-ab1f40ce88cb?auto=format&fit=crop&w=300&q=80'
    };
    const cartKey = generateCartKey(dummyCroissant.id, []);
    handleCartUpdate(cartKey, dummyCroissant, 1, []);
    window.closeUpsellModal();
}

export function updateCartUI() {
    updateMenuCardsUI();
    const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = state.cart.reduce((sum, item) => {
        const itemOptionsPrice = (item.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0);
        return sum + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);

    if (dom.topCartCount) {
        if (totalQty > 0) {
            dom.topCartCount.textContent = totalQty;
            dom.topCartCount.classList.remove('hidden');
        } else {
            dom.topCartCount.classList.add('hidden');
        }
    }

    if (dom.dockedCartSummary) {
        if (totalQty > 0) {
            dom.dockedCartSummary.classList.remove('hidden');
            if (dom.cartItemCountDocked) dom.cartItemCountDocked.textContent = totalQty;
            if (dom.cartTotalPriceDocked) dom.cartTotalPriceDocked.textContent = totalPrice.toLocaleString('vi-VN') + 'đ';
        } else {
            dom.dockedCartSummary.classList.add('hidden');
            import('./customer-modal.js').then(m => m.closeModal());
        }
    }

    renderModalCart();
}

export function renderModalCart() {
    if (state.cart.length === 0) {
        dom.cartItemsContainer.innerHTML = '<div class="empty-cart text-center text-muted">Giỏ hàng đang trống.</div>';
        dom.checkoutTotal.textContent = "0";
        if(dom.checkoutCashBtn) dom.checkoutCashBtn.disabled = true;
        if(dom.checkoutTransferBtn) dom.checkoutTransferBtn.disabled = true;
        return;
    }

    dom.cartItemsContainer.innerHTML = '';
    let total = 0;

    state.cart.forEach(item => {
        const itemBasePrice = item.price;
        const optionsPrice = (item.selectedOptions || []).reduce((sum, opt) => sum + opt.priceExtra, 0);
        const itemTotal = (itemBasePrice + optionsPrice) * item.quantity;
        total += itemTotal;
        
        let optionsHtml = '';
        if (item.selectedOptions && item.selectedOptions.length > 0) {
            optionsHtml = '<div style="font-size: 0.8rem; color: #888; margin-top: 4px;">' + 
                item.selectedOptions.map(o => `+ ${window.escapeHTML(o.choiceName)}`).join(', ') + 
                '</div>';
        }

        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title leading-tight mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">${window.escapeHTML(item.name)}</div>
                ${optionsHtml}
                <div class="cart-item-price" style="color: #994700;">${(itemBasePrice + optionsPrice).toLocaleString('vi-VN')} đ</div>
            </div>
            <div class="qty-controls ml-4 shrink-0">
                <button class="w-8 h-8 rounded-full bg-surface-container-high text-on-surface-variant flex items-center justify-center active:scale-95 transition-transform" onclick="updateCart('${item.cartKey}', -1)">
                    <span class="material-symbols-outlined text-[18px]">remove</span>
                </button>
                <input type="number" min="0" 
                       class="w-10 text-center font-bold text-lg leading-none bg-transparent focus:outline-none focus:ring-1 focus:ring-[#994700] rounded py-1 no-spinners" 
                       style="-moz-appearance: textfield; appearance: textfield;" 
                       value="${item.quantity}" 
                       onchange="setCartQuantity('${item.cartKey}', this.value)" 
                       onfocus="this.select()" />
                <button class="w-8 h-8 rounded-full bg-[#994700] text-white flex items-center justify-center active:scale-95 transition-transform shadow-sm" onclick="updateCart('${item.cartKey}', 1)" ${getAvailableToAdd(item) <= 0 ? 'disabled style="opacity:0.5;background:#888;cursor:not-allowed;"' : ''}>
                    <span class="material-symbols-outlined text-[18px]">add</span>
                </button>
            </div>
        `;
        dom.cartItemsContainer.appendChild(row);
    });

    let discountAmount = 0;
    if (state.appliedPromo) {
        if (state.appliedPromo.discountType === 'PERCENT') {
            discountAmount = Math.floor(total * (state.appliedPromo.value / 100));
        } else {
            discountAmount = state.appliedPromo.value;
        }
        if (discountAmount > total) discountAmount = total;
        
        document.getElementById('cart-subtotal-row').style.display = 'flex';
        document.getElementById('cart-discount-row').style.display = 'flex';
        document.getElementById('checkout-subtotal').textContent = total.toLocaleString('vi-VN') + ' đ';
        document.getElementById('checkout-discount').textContent = discountAmount.toLocaleString('vi-VN') + ' đ';
        
        total -= discountAmount;
        state.currentDiscountAmount = discountAmount;
    } else {
        document.getElementById('cart-subtotal-row').style.display = 'none';
        document.getElementById('cart-discount-row').style.display = 'none';
        state.currentDiscountAmount = 0;
    }

    dom.checkoutTotal.textContent = total.toLocaleString('vi-VN') + ' đ';
    if(dom.checkoutCashBtn) dom.checkoutCashBtn.disabled = false;
    if(dom.checkoutTransferBtn) dom.checkoutTransferBtn.disabled = false;
}
