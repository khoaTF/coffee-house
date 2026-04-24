// ====================================================
// customer-cart.js — Cart CRUD, UI updates
// ====================================================
import { state, dom } from './customer-config.js';
import { getAvailableToAdd, updateMenuCardsUI } from './customer-menu.js';
import { customerAlert } from './customer-ui.js';

// Expose cart to standalone scripts (gacha.js)
window.cart = state.cart;
window.updateCartUI = null; // Will be set after updateCartUI is defined

// Generate unique cart key based on options
export function generateCartKey(productId, selectedOptions) {
    if (!selectedOptions || selectedOptions.length === 0) return productId;
    const optString = selectedOptions.map(o => `${o.optionName}:${o.choiceName}`).sort().join('|');
    return `${productId}|${optString}`;
}

export function handleCartUpdate(cartKey, baseItem, change, selectedOptions, itemNote) {
    const existingIndex = state.cart.findIndex(c => c.cartKey === cartKey);
    
    if (existingIndex > -1) {
        const newQty = state.cart[existingIndex].quantity + change;
        if (newQty <= 0) {
            state.cart.splice(existingIndex, 1);
        } else {
            state.cart[existingIndex].quantity = newQty;
            // Update note if provided
            if (itemNote !== undefined && itemNote !== '') {
                state.cart[existingIndex].note = itemNote;
            }
        }
    } else if (change > 0) {
        state.cart.push({ 
            ...baseItem, 
            cartKey: cartKey,
            quantity: 1,
            selectedOptions: selectedOptions,
            note: itemNote || ''
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
    // Keep window.cart in sync (gacha.js uses it)
    window.cart = state.cart;
    const totalQty = state.cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = state.cart.reduce((sum, item) => {
        const itemOptionsPrice = (item.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0);
        return sum + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);

    // Update loyalty slider max based on subtotal
    const slider = document.getElementById('loyalty-points-slider');
    if (slider && !window.loyaltyDiscountApplied && window.currentCustomerPoints > 0) {
        const maxPointsFromPrice = Math.floor(totalPrice / 100); // 1 point = 100 VND
        const maxSliderValue = Math.min(window.currentCustomerPoints, maxPointsFromPrice);
        slider.max = maxSliderValue;
        
        if (parseInt(slider.value) > maxSliderValue) {
            slider.value = maxSliderValue;
            if (typeof window.updateLoyaltySlider === 'function') {
                window.updateLoyaltySlider(maxSliderValue);
            }
        }
    }

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
window.updateCartUI = updateCartUI;

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

        let noteHtml = '';
        if (item.note) {
            noteHtml = `<div style="font-size:0.78rem;color:#D97531;margin-top:4px;display:flex;align-items:center;gap:4px;"><i class="fa-solid fa-pen-to-square" style="font-size:10px"></i> ${window.escapeHTML(item.note)}</div>`;
        }

        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title leading-tight mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">${window.escapeHTML(item.name)}</div>
                ${optionsHtml}
                ${noteHtml}
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

    renderCartUpsells();
}

function renderCartUpsells() {
    const container = document.getElementById('cart-upsell-container');
    const itemsContainer = document.getElementById('cart-upsell-items');
    const titleEl = container?.querySelector('.smart-upsell-title');
    if (!container || !itemsContainer) return;
    
    if (state.cart.length === 0) {
        container.classList.add('hidden');
        return;
    }
    
    const cartIds = state.cart.map(c => c._id || c.id);
    const cartCategories = [...new Set(state.cart.map(c => (c.category || '').toLowerCase()))];
    const availableUpsells = state.menuItems.filter(i => !cartIds.includes(i._id) && getAvailableToAdd(i) > 0);
    
    if (availableUpsells.length === 0) {
        container.classList.add('hidden');
        return;
    }

    // --- Phase 8: Smart Upsell & Cross-sell Engine ---
    const hour = new Date().getHours();
    const isBreakfast = hour >= 6 && hour < 10;
    const isLunch = hour >= 10 && hour < 14;
    const isAfternoon = hour >= 14 && hour < 18;

    // 1) Personal history scoring
    const itemFreqs = {};
    if (state.customerHistoryOrders?.length > 0) {
        state.customerHistoryOrders.forEach(order => {
            (order.items || []).forEach(item => {
                const id = item._id || item.productId || item.id;
                if (id) itemFreqs[id] = (itemFreqs[id] || 0) + (item.quantity || 1);
            });
        });
    }

    // 2) Community co-purchase patterns (items frequently bought together with current cart items)
    const coPurchaseScores = {};
    if (state.customerHistoryOrders?.length > 0) {
        state.customerHistoryOrders.forEach(order => {
            const orderItemIds = (order.items || []).map(i => i._id || i.productId || i.id);
            const hasCartOverlap = cartIds.some(cid => orderItemIds.includes(cid));
            if (hasCartOverlap) {
                orderItemIds.forEach(oid => {
                    if (!cartIds.includes(oid)) {
                        coPurchaseScores[oid] = (coPurchaseScores[oid] || 0) + 1;
                    }
                });
            }
        });
    }

    // 3) Multi-factor scoring
    const scored = availableUpsells.map(item => {
        let score = 0;
        const cat = (item.category || '').toLowerCase();

        // Personal history boost (max ~40 pts)
        score += Math.min((itemFreqs[item._id] || 0) * 5, 40);

        // Community co-purchase boost (max ~30 pts)
        score += Math.min((coPurchaseScores[item._id] || 0) * 10, 30);

        // Cross-category boost: if cart has drinks → suggest food and vice versa (+20)
        const drinkCats = ['coffee', 'tea', 'trà', 'cà phê', 'nước ép', 'juice', 'smoothie', 'drinks', 'đồ uống'];
        const foodCats = ['food', 'đồ ăn', 'bánh', 'snack', 'bakery'];
        const cartHasDrink = cartCategories.some(c => drinkCats.some(d => c.includes(d)));
        const cartHasFood = cartCategories.some(c => foodCats.some(f => c.includes(f)));
        const itemIsDrink = drinkCats.some(d => cat.includes(d));
        const itemIsFood = foodCats.some(f => cat.includes(f));

        if (cartHasDrink && !cartHasFood && itemIsFood) score += 20;
        if (cartHasFood && !cartHasDrink && itemIsDrink) score += 20;

        // Time-context boost (+15)
        if (isBreakfast && (cat.includes('coffee') || cat.includes('cà phê') || cat.includes('bánh') || cat.includes('bread'))) score += 15;
        if (isLunch && (cat.includes('food') || cat.includes('đồ ăn'))) score += 15;
        if (isAfternoon && (cat.includes('tea') || cat.includes('trà') || cat.includes('juice') || cat.includes('nước ép'))) score += 15;

        // Affordable items boost (under 30k) for impulse buy
        if (item.price <= 30000) score += 5;

        return { item, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const selected = scored.slice(0, 4);

    // Determine contextual title
    let upsellTitle = '<i class="fa-solid fa-sparkles text-[#FF7A00] mr-1"></i> Gợi ý dùng kèm:';
    const topItem = selected[0];
    if (topItem && coPurchaseScores[topItem.item._id] > 0) {
        upsellTitle = '<i class="fa-solid fa-users text-[#FF7A00] mr-1"></i> Khách khác hay gọi thêm:';
    } else if (topItem && itemFreqs[topItem.item._id] > 0) {
        upsellTitle = '<i class="fa-solid fa-heart text-[#FF7A00] mr-1"></i> Bạn thường dùng kèm:';
    } else if (isBreakfast) {
        upsellTitle = '<i class="fa-solid fa-sun text-[#FF7A00] mr-1"></i> Sáng nay dùng thêm:';
    } else if (isAfternoon) {
        upsellTitle = '<i class="fa-solid fa-mug-hot text-[#FF7A00] mr-1"></i> Chiều nay thử thêm:';
    }

    if (titleEl) titleEl.innerHTML = upsellTitle;

    itemsContainer.innerHTML = '';
    selected.forEach(({ item, score }) => {
        const isCoPurchase = coPurchaseScores[item._id] > 0;
        const isPersonal = itemFreqs[item._id] > 0;
        let badgeHtml = '';
        if (isCoPurchase) badgeHtml = '<div class="absolute top-1 left-1 bg-[#FF7A00]/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">🔥 Hot</div>';
        else if (isPersonal) badgeHtml = '<div class="absolute top-1 left-1 bg-[#994700]/90 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-full backdrop-blur-sm">❤️ Yêu thích</div>';

        const div = document.createElement('div');
        div.className = 'upsell-item shrink-0 w-[110px] bg-white dark:bg-[#1B1C1B] rounded-xl overflow-hidden border border-outline-variant/30 active:scale-95 transition-transform flex flex-col shadow-sm cursor-pointer hover:shadow-md';
        div.onclick = () => window.updateCart(item._id, 1);
        div.innerHTML = `
            <div class="h-[70px] bg-gray-200 dark:bg-gray-800 relative">
                <img src="${item.imageUrl || ''}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/300x300?text=Food'" loading="lazy">
                ${badgeHtml}
                <div class="absolute bottom-1 right-1 w-6 h-6 bg-[#FF7A00] text-white rounded-full flex items-center justify-center shadow-md">
                    <i class="fa-solid fa-plus text-xs"></i>
                </div>
            </div>
            <div class="p-2 flex-1 flex flex-col justify-between">
                <div class="text-[0.7rem] font-bold leading-tight line-clamp-2 text-[#1b1c1b] dark:text-[#fcf9f8]">${window.escapeHTML(item.name)}</div>
                <div class="text-[#994700] text-xs font-black mt-1">${item.price.toLocaleString('vi-VN')}đ</div>
            </div>
        `;
        itemsContainer.appendChild(div);
    });
    
    container.classList.remove('hidden');
}
