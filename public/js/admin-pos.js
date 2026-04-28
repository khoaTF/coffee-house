// =============================================
// ADMIN-POS — Point of Sale: Staff/Admin order for table
// =============================================
// Dependencies: admin-core.js (products, supabase, showAdminToast, logAudit)

let posCart = [];
let posSelectedTable = 'POS';
let posProductsList = [];
let posCurrentOptionsItem = null;
let posIngredientStock = {};
let posAppliedVoucher = null;

window.initPOS = async function() {
    const container = document.getElementById('pos-content');
    if (!container) return;

    // Render layout first
    container.innerHTML = `
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
            <div>
                <h2 class="font-noto text-2xl font-bold text-[#F2E8D5] mb-1 flex items-center gap-2">
                    <i class="fa-solid fa-cash-register text-[#C0A062]"></i> POS Bán hàng
                    <span id="pos-offline-badge" class="${navigator.onLine ? 'hidden' : ''} bg-warning text-dark text-xs px-2 py-1 rounded ms-2 font-bold"><i class="fa-solid fa-wifi-slash"></i> OFFLINE</span>
                </h2>
                <p class="text-sm text-slate-500 mb-0">Đặt hàng nhanh thay khách từ quầy thu ngân.</p>
            </div>
            
            <div class="flex items-center gap-2 bg-slate-100 px-4 py-2 rounded-xl border border-slate-200 shadow-soft">
                <div id="pos-header-avatar" class="w-8 h-8 rounded-full border border-[#C0A062] flex items-center justify-center overflow-hidden bg-white">
                    ${sessionStorage.getItem('nohope_staff_avatar') ? `<img src="${(window.escapeHTML||String)(sessionStorage.getItem('nohope_staff_avatar'))}" class="w-full h-full object-cover">` : `<i class="fa-solid fa-user text-[#C0A062] text-xs"></i>`}
                </div>
                <div class="flex flex-col justify-center">
                    <span class="text-slate-800 text-sm font-bold leading-none">${(window.escapeHTML||String)(sessionStorage.getItem('nohope_staff_name') || 'Cashier')}</span>
                    <span class="text-slate-500 text-[10px] leading-tight font-semibold mt-1 uppercase tracking-wider">Thu ngân v2.0</span>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Menu Panel -->
            <div class="lg:col-span-2">
                <!-- Table selector + search -->
                <div class="flex gap-3 mb-4">
                    <div class="flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-2 flex-shrink-0">
                        <i class="fa-solid fa-chair text-[#C0A062]"></i>
                        <label class="text-sm text-slate-500 font-semibold">Đơn:</label>
                        <select id="pos-table-select" class="bg-transparent text-slate-800 font-bold text-sm focus:outline-none" onchange="posSelectTable(this.value)">
                            <option value="POS" class="bg-white text-slate-800" selected>Mang đi (POS)</option>
                            ${Array.from({length:20}, (_,i) => `<option value="${i+1}" class="bg-white text-slate-800">Bàn ${i+1}</option>`).join('')}
                        </select>
                    </div>
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"></i>
                        <input id="pos-search" type="search" placeholder="Tìm món..." class="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-[#64748b] focus:outline-none focus:border-[#C0A062] text-sm" oninput="posFilterProducts(this.value)">
                    </div>
                </div>

                <!-- Category tabs -->
                <div id="pos-category-tabs" class="flex gap-2 overflow-x-auto pb-2 mb-4 custom-scrollbar"></div>

                <!-- Products grid -->
                <div id="pos-products-grid" class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div class="col-span-full text-center py-10 text-slate-500"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải thực đơn...</div>
                </div>
            </div>

            <!-- Cart Panel -->
            <div class="lg:col-span-1">
                <div class="card bg-white border border-slate-200 rounded-2xl overflow-hidden sticky top-4">
                    <div class="p-4 border-b border-slate-200 flex justify-between items-center">
                        <h5 class="font-bold text-[#F2E8D5] mb-0 flex items-center gap-2">
                            <i class="fa-solid fa-cart-shopping text-[#C0A062]"></i> Giỏ hàng
                            <span id="pos-cart-count" class="text-xs font-bold bg-slate-100 bg-[#C0A062] rounded-full px-2 py-0.5" style="background-color: #C0A062;">0</span>
                        </h5>
                        <button class="text-xs text-slate-500 hover:text-red-400 transition-colors border-0 bg-transparent" onclick="posClearCart()">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    </div>

                    <div id="pos-cart-items" class="p-4 space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar">
                        <div class="text-center py-8 text-slate-500 text-sm">Chưa có món nào</div>
                    </div>

                    <div class="border-t border-slate-200 p-4">
                        <div class="mb-3 flex gap-2">
                            <input id="pos-voucher-code" type="text" placeholder="Mã giảm giá (tuỳ chọn)" class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 placeholder-[#64748b] text-sm focus:outline-none focus:border-[#C0A062] uppercase">
                            <button id="pos-apply-voucher-btn" class="px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors bg-slate-800 hover:bg-slate-700 whitespace-nowrap" onclick="posApplyVoucher()">Áp dụng</button>
                        </div>
                        <div id="pos-voucher-info" class="text-sm text-green-600 font-semibold hidden mb-3 flex justify-between items-center bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                            <span id="pos-voucher-msg"></span>
                            <button class="text-rose-500 hover:text-rose-600 border-none bg-transparent" onclick="posRemoveVoucher()"><i class="fa-solid fa-xmark"></i></button>
                        </div>
                        <div class="flex justify-between items-center mb-4">
                            <span class="text-slate-500 font-semibold">Tổng cộng:</span>
                            <span id="pos-cart-total" class="text-xl font-bold text-[#C0A062]">0 đ</span>
                        </div>
                        <div class="mb-3">
                            <input id="pos-order-note" type="text" placeholder="Ghi chú đơn hàng (nếu có)..." class="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-800 placeholder-[#64748b] text-sm focus:outline-none focus:border-[#C0A062]">
                        </div>
                        <button id="pos-submit-btn" class="w-full py-3 rounded-xl font-bold text-[#f1f5f9] text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style="background:#C0A062;" onclick="posSubmitOrder()">
                            <i class="fa-solid fa-paper-plane"></i> Gửi đơn hàng
                        </button>
                    </div>
                </div>
            </div>
                </div>
            </div>
        </div>

        <!-- POS Options Modal -->
        <div id="pos-options-modal" class="hidden fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4">
            <div class="bg-white border border-slate-200 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div class="px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 id="pos-options-modal-title" class="font-bold text-slate-800 text-lg">Tùy chọn</h3>
                    <button class="text-slate-500 hover:text-slate-800 bg-transparent border-none" onclick="posCloseOptionsModal()">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div id="pos-options-container" class="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                </div>
                <div class="px-5 py-4 border-t border-slate-200 bg-slate-100">
                    <button class="w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:opacity-90 transition-opacity text-[#f1f5f9]" style="background:#C0A062;" onclick="posConfirmOptions()">
                        <i class="fa-solid fa-check"></i> Xác nhận
                    </button>
                </div>
            </div>
        </div>
    `;

    await posLoadProducts();
};

async function posLoadProducts() {
    try {
        const [prodRes, stockRes] = await Promise.all([
            supabase.from('products').select('*').eq('tenant_id', window.AdminState.tenantId).eq('is_available', true).order('category'),
            supabase.from('ingredients').select('id, stock').eq('tenant_id', window.AdminState.tenantId)
        ]);
        if (prodRes.error) throw prodRes.error;
        if (stockRes.error) console.error('POS load stock error:', stockRes.error);
        
        posProductsList = prodRes.data || [];
        posIngredientStock = {};
        if (stockRes.data) {
            stockRes.data.forEach(i => posIngredientStock[i.id] = i.stock);
        }

        posRenderCategories();
        posRenderProducts(posProductsList);
    } catch(e) {
        console.error('POS load products error:', e);
        document.getElementById('pos-products-grid').innerHTML = '<div class="col-span-full text-center text-red-400 py-10">Lỗi tải thực đơn.</div>';
    }
}

function posRenderCategories() {
    const categoriesEl = document.getElementById('pos-category-tabs');
    if (!categoriesEl) return;
    const cats = ['Tất cả', ...new Set(posProductsList.map(p => p.category).filter(Boolean))];
    categoriesEl.innerHTML = cats.map((cat, i) => `
        <button class="pos-cat-btn flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${i === 0 ? 'bg-[#C0A062] text-[#f1f5f9]' : 'bg-white border border-slate-200 text-slate-500 hover:text-slate-800'}"
            onclick="posFilterByCategory('${window.escapeHTML(cat)}', this)">
            ${window.escapeHTML(cat)}
        </button>
    `).join('');
}

window.posFilterByCategory = function(cat, btn) {
    document.querySelectorAll('.pos-cat-btn').forEach(b => {
        b.className = 'pos-cat-btn flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-white border border-slate-200 text-slate-500 hover:text-slate-800';
    });
    btn.className = 'pos-cat-btn flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-[#C0A062] text-[#f1f5f9]';
    const filtered = cat === 'Tất cả' ? posProductsList : posProductsList.filter(p => p.category === cat);
    posRenderProducts(filtered);
};

window.posFilterProducts = function(query) {
    const q = (query || '').trim().toLowerCase();
    const filtered = q ? posProductsList.filter(p => p.name.toLowerCase().includes(q)) : posProductsList;
    posRenderProducts(filtered);
};

function posRenderProducts(list) {
    const grid = document.getElementById('pos-products-grid');
    if (!grid) return;
    if (list.length === 0) {
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-slate-500">Không tìm thấy món phù hợp.</div>';
        return;
    }
    grid.innerHTML = list.map(p => {
        const price = p.promotional_price && isPromoActive(p) ? p.promotional_price : p.price;
        const canAddMore = posGetAvailableToAdd(p) > 0;
        const isOutOfStock = !canAddMore;

        return `
            <div class="card bg-white border border-slate-200 rounded-2xl overflow-hidden cursor-pointer hover:border-[#C0A062] transition-all active:scale-95 group ${isOutOfStock ? 'opacity-50 saturate-50' : ''}" onclick="posAddToCart('${p.id}')">
                <div class="relative w-full h-24 bg-[#e2e8f0] flex items-center justify-center">
                    ${p.image_url ? `<img src="${window.escapeHTML(p.image_url)}" alt="" class="w-full h-full object-cover" onerror="this.onerror=null; this.outerHTML='<i class=\\'fa-solid fa-mug-hot text-slate-500 text-2xl\\'></i>';">` : '<i class="fa-solid fa-mug-hot text-slate-500 text-2xl"></i>'}
                    ${isOutOfStock ? '<div class="absolute inset-0 bg-black/50 flex items-center justify-center z-10"><span class="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg">Hết hàng</span></div>' : ''}
                </div>
                <div class="p-3">
                    <div class="text-sm font-bold text-slate-800 line-clamp-1 group-hover:text-[#C0A062] transition-colors">${window.escapeHTML(p.name)}</div>
                    <div class="text-sm font-bold text-[#C0A062] mt-1">${price.toLocaleString('vi-VN')} đ</div>
                </div>
            </div>
        `;
    }).join('');
}

function isPromoActive(p) {
    if (!p.promotional_price) return false;
    const now = new Date();
    if (p.promo_start_time && new Date(p.promo_start_time) > now) return false;
    if (p.promo_end_time && new Date(p.promo_end_time) < now) return false;
    return true;
}

window.posSelectTable = function(val) {
    posSelectedTable = val || null;
};

function posGetAvailableToAdd(product) {
    if (!product.recipe || product.recipe.length === 0) return 999;
    
    let usedIngredients = {};
    posCart.forEach(cartItem => {
        if (cartItem.recipe) {
            cartItem.recipe.forEach(req => {
                const iId = req.ingredientId || req.ingredient_id;
                usedIngredients[iId] = (usedIngredients[iId] || 0) + (req.quantity * cartItem.quantity);
            });
        }
        if (cartItem.selectedOptions && Array.isArray(cartItem.selectedOptions)) {
            cartItem.selectedOptions.forEach(opt => {
                if (opt.recipe && Array.isArray(opt.recipe)) {
                    opt.recipe.forEach(req => {
                        const iId = req.ingredientId || req.ingredient_id;
                        usedIngredients[iId] = (usedIngredients[iId] || 0) + (req.quantity * cartItem.quantity);
                    });
                }
            });
        }
    });

    let additionalAllowed = Infinity;
    product.recipe.forEach(req => {
        const iId = req.ingredientId || req.ingredient_id;
        let totalStock = posIngredientStock[iId] || 0;
        let used = usedIngredients[iId] || 0;
        let remaining = Math.max(0, totalStock - used);
        
        let possible = Math.floor(remaining / req.quantity);
        if (possible < additionalAllowed) {
            additionalAllowed = possible;
        }
    });

    return additionalAllowed === Infinity ? 999 : additionalAllowed;
}

window.posAddToCart = function(productId) {
    const p = posProductsList.find(x => x.id === productId);
    if (!p) return;
    
    if (posGetAvailableToAdd(p) <= 0) {
        showAdminToast('Món này đã hết nguyên liệu!', 'warning');
        return;
    }
    
    if ((p.options && p.options.length > 0) || (p.is_combo && p.combo_items && p.combo_items.length > 0)) {
        posOpenOptionsModal(p);
        return;
    }

    const price = p.promotional_price && isPromoActive(p) ? p.promotional_price : p.price;
    const cartKey = productId;
    const existing = posCart.find(c => c.cartKey === cartKey || c.id === cartKey);
    if (existing) {
        existing.quantity += 1;
    } else {
        posCart.push({ id: p.id, cartKey, name: p.name, price, quantity: 1, recipe: p.recipe || [], selectedOptions: [] });
    }
    posRenderCart();
};

window.posGenerateCartKey = function(id, options) {
    if (!options || options.length === 0) return id;
    const sorted = options.slice().sort((a,b) => a.optionName.localeCompare(b.optionName));
    return id + '|' + sorted.map(o => o.choiceName).join('|');
};

window.posOpenOptionsModal = function(item) {
    posCurrentOptionsItem = item;
    document.getElementById('pos-options-modal-title').textContent = item.name;
    const container = document.getElementById('pos-options-container');
    container.innerHTML = '';
    
    if (item.is_combo && item.combo_items && item.combo_items.length > 0) {
        item.combo_items.forEach((group, groupIndex) => {
            const groupName = group.name;
            const containerDiv = document.createElement('div');
            containerDiv.className = 'mb-3';
            containerDiv.innerHTML = `<h3 class="text-slate-800 font-bold mb-2">${window.escapeHTML(groupName)}</h3>`;
            
            group.items.forEach((cItem, itemIndex) => {
                const p = posProductsList.find(x => x.id === cItem.id);
                if (!p) return;
                const choiceName = p.name;
                const isChecked = itemIndex === 0 ? 'checked' : '';
                const priceExtraText = cItem.priceExtra > 0 ? `+${cItem.priceExtra.toLocaleString('vi-VN')}đ` : '';
                
                containerDiv.innerHTML += `
                    <label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl mb-2 cursor-pointer hover:border-[#C0A062] transition-colors">
                        <div class="flex items-center gap-3">
                            <input type="radio" name="pos_combo_${groupIndex}" value="${window.escapeHTML(cItem.id)}" data-name="${window.escapeHTML(choiceName)}" data-price="${cItem.priceExtra}" ${isChecked} class="accent-[#C0A062] w-4 h-4">
                            <span class="text-slate-800 text-sm">${window.escapeHTML(choiceName)}</span>
                        </div>
                        <span class="text-[#C0A062] text-sm">${priceExtraText}</span>
                    </label>
                `;
            });
            container.appendChild(containerDiv);
        });
    } else {
        item.options.forEach((opt, optIndex) => {
            const optName = opt.name || opt.optionName;
            const group = document.createElement('div');
            group.className = 'mb-3';
            group.innerHTML = `<h3 class="text-slate-800 font-bold mb-2">${window.escapeHTML(optName)}</h3>`;
            
            opt.choices.forEach((choice, choiceIndex) => {
                const choiceName = choice.name || choice.choiceName;
                const isChecked = choiceIndex === 0 ? 'checked' : '';
                const priceExtraText = choice.priceExtra > 0 ? `+${choice.priceExtra.toLocaleString('vi-VN')}đ` : '';
                const recipeData = choice.recipe ? encodeURIComponent(JSON.stringify(choice.recipe)) : '';
                
                group.innerHTML += `
                    <label class="flex items-center justify-between p-3 border border-slate-200 rounded-xl mb-2 cursor-pointer hover:border-[#C0A062] transition-colors">
                        <div class="flex items-center gap-3">
                            <input type="radio" name="pos_opt_${optIndex}" value="${window.escapeHTML(choiceName)}" data-price="${choice.priceExtra}" data-recipe="${recipeData}" ${isChecked} class="accent-[#C0A062] w-4 h-4">
                            <span class="text-slate-800 text-sm">${window.escapeHTML(choiceName)}</span>
                        </div>
                        <span class="text-[#C0A062] text-sm">${priceExtraText}</span>
                    </label>
                `;
            });
            container.appendChild(group);
        });
    }
    
    document.getElementById('pos-options-modal').classList.remove('hidden');
};

window.posCloseOptionsModal = function() {
    document.getElementById('pos-options-modal').classList.add('hidden');
    posCurrentOptionsItem = null;
};

window.posConfirmOptions = function() {
    if (!posCurrentOptionsItem) return;
    
    const selectedOptions = [];
    const container = document.getElementById('pos-options-container');
    
    if (posCurrentOptionsItem.is_combo && posCurrentOptionsItem.combo_items) {
        posCurrentOptionsItem.combo_items.forEach((group, groupIndex) => {
            const selectedRadio = container.querySelector(`input[name="pos_combo_${groupIndex}"]:checked`);
            if (selectedRadio) {
                const p = posProductsList.find(x => x.id === selectedRadio.value);
                selectedOptions.push({
                    optionName: group.name,
                    choiceName: selectedRadio.dataset.name,
                    priceExtra: parseInt(selectedRadio.dataset.price) || 0,
                    recipe: p ? p.recipe : []
                });
            }
        });
    } else {
        posCurrentOptionsItem.options.forEach((opt, optIndex) => {
            const optName = opt.name || opt.optionName;
            const selectedRadio = container.querySelector(`input[name="pos_opt_${optIndex}"]:checked`);
            if (selectedRadio) {
                let recipe = [];
                if (selectedRadio.dataset.recipe) {
                    try { recipe = JSON.parse(decodeURIComponent(selectedRadio.dataset.recipe)); } catch(e){}
                }
                selectedOptions.push({
                    optionName: optName,
                    choiceName: selectedRadio.value,
                    priceExtra: parseInt(selectedRadio.dataset.price) || 0,
                    recipe: recipe
                });
            }
        });
    }
    
    const price = posCurrentOptionsItem.promotional_price && isPromoActive(posCurrentOptionsItem) ? posCurrentOptionsItem.promotional_price : posCurrentOptionsItem.price;
    const cartKey = posGenerateCartKey(posCurrentOptionsItem.id, selectedOptions);
    
    const existing = posCart.find(c => c.cartKey === cartKey);
    if (existing) {
        existing.quantity += 1;
    } else {
        posCart.push({ 
            id: posCurrentOptionsItem.id, 
            cartKey, 
            name: posCurrentOptionsItem.name, 
            price, 
            quantity: 1, 
            recipe: posCurrentOptionsItem.recipe || [],
            selectedOptions
        });
    }
    
    posRenderCart();
    posCloseOptionsModal();
};

window.posUpdateQty = function(cartKey, delta) {
    const item = posCart.find(c => c.cartKey === cartKey || c.id === cartKey);
    if (!item) return;
    item.quantity += delta;
    if (item.quantity <= 0) posCart = posCart.filter(c => c !== item);
    posRenderCart();
};

window.posClearCart = function() {
    posCart = [];
    posRenderCart();
};

window.posApplyVoucher = async function() {
    const code = document.getElementById('pos-voucher-code')?.value.trim().toUpperCase();
    if (!code) return;
    
    try {
        const { data: voucher, error } = await supabase.from('vouchers')
            .select('*')
            .eq('code', code)
            .eq('tenant_id', window.AdminState.tenantId)
            .eq('is_active', true)
            .single();
            
        if (error || !voucher) {
            showAdminToast('Mã không hợp lệ hoặc đã tắt.', 'error');
            return;
        }
        
        const now = new Date();
        if (voucher.start_date && new Date(voucher.start_date) > now) {
            showAdminToast('Mã chưa đến thời gian áp dụng.', 'error');
            return;
        }
        if (voucher.end_date && new Date(voucher.end_date) < now) {
            showAdminToast('Mã đã hết hạn.', 'error');
            return;
        }
        if (voucher.usage_limit && voucher.used_count >= voucher.usage_limit) {
            showAdminToast('Mã đã hết lượt sử dụng.', 'error');
            return;
        }
        
        posAppliedVoucher = voucher;
        document.getElementById('pos-voucher-code').value = '';
        showAdminToast('Đã áp dụng mã giảm giá!', 'success');
        posRenderCart();
    } catch(err) {
        showAdminToast('Lỗi khi kiểm tra mã giảm giá.', 'error');
    }
};

window.posRemoveVoucher = function() {
    posAppliedVoucher = null;
    posRenderCart();
};

function posRenderCart() {
    const el = document.getElementById('pos-cart-items');
    const countEl = document.getElementById('pos-cart-count');
    const totalEl = document.getElementById('pos-cart-total');
    if (!el) return;

    const totalQty = posCart.reduce((s, c) => s + c.quantity, 0);
    const subtotal = posCart.reduce((s, c) => {
        const optionsPrice = (c.selectedOptions || []).reduce((sum, o) => sum + o.priceExtra, 0);
        return s + (c.price + optionsPrice) * c.quantity;
    }, 0);

    let discount = 0;
    const infoEl = document.getElementById('pos-voucher-info');
    const msgEl = document.getElementById('pos-voucher-msg');
    
    if (posAppliedVoucher) {
        if (posAppliedVoucher.min_order_value && subtotal < posAppliedVoucher.min_order_value) {
            if (infoEl) infoEl.classList.add('hidden');
        } else {
            if (posAppliedVoucher.discount_type === 'percent') {
                discount = subtotal * (posAppliedVoucher.discount_value / 100);
                if (posAppliedVoucher.max_discount && discount > posAppliedVoucher.max_discount) {
                    discount = posAppliedVoucher.max_discount;
                }
            } else {
                discount = posAppliedVoucher.discount_value;
            }
            if (discount > subtotal) discount = subtotal;
            
            if (infoEl && msgEl) {
                infoEl.classList.remove('hidden');
                msgEl.textContent = `Giảm: ${discount.toLocaleString('vi-VN')} đ (${posAppliedVoucher.code})`;
            }
        }
    } else {
        if (infoEl) infoEl.classList.add('hidden');
    }

    const totalPrice = subtotal - discount;

    if (countEl) countEl.textContent = totalQty;
    if (totalEl) totalEl.textContent = totalPrice.toLocaleString('vi-VN') + ' đ';

    posRenderProducts(posProductsList.filter(p => document.getElementById('pos-search')?.value ? p.name.toLowerCase().includes(document.getElementById('pos-search').value.toLowerCase()) : true));

    if (posCart.length === 0) {
        el.innerHTML = '<div class="text-center py-8 text-slate-500 text-sm">Chưa có món nào</div>';
        return;
    }

    el.innerHTML = posCart.map(c => {
        const optionsPrice = (c.selectedOptions || []).reduce((sum, o) => sum + o.priceExtra, 0);
        const itemTotal = (c.price + optionsPrice) * c.quantity;
        const optionsHtml = (c.selectedOptions && c.selectedOptions.length > 0) 
            ? `<div class="text-xs text-slate-500 mt-1">+ ${c.selectedOptions.map(o => window.escapeHTML(o.choiceName)).join(', ')}</div>` 
            : '';
            
        return `
        <div class="flex items-center justify-between gap-2 py-2 border-b border-slate-200 last:border-0">
            <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-slate-800 truncate">${window.escapeHTML(c.name)}</div>
                ${optionsHtml}
                <div class="text-xs text-[#C0A062] mt-1">${itemTotal.toLocaleString('vi-VN')} đ</div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <button class="w-6 h-6 rounded-lg bg-[#e2e8f0] text-slate-800 text-xs hover:bg-red-900/40 transition-colors flex items-center justify-center" onclick="posUpdateQty('${c.cartKey || c.id}', -1)">−</button>
                <span class="w-6 text-center text-sm font-bold text-slate-800">${c.quantity}</span>
                <button class="w-6 h-6 rounded-lg bg-[#e2e8f0] text-slate-800 text-xs hover:bg-green-900/40 transition-colors flex items-center justify-center" onclick="posUpdateQty('${c.cartKey || c.id}', 1)">+</button>
            </div>
        </div>
        `;
    }).join('');
}

const dbName = "NohopePOSOfflineDB";
const storeName = "OfflineOrders";
let idb = null;

function initIndexedDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(dbName, 1);
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(storeName)) {
                db.createObjectStore(storeName, { keyPath: "id", autoIncrement: true });
            }
        };
        request.onsuccess = (e) => {
            idb = e.target.result;
            resolve(idb);
            syncOfflineOrders(); // try to sync if online
        };
        request.onerror = (e) => reject(e.target.error);
    });
}

initIndexedDB();
window.addEventListener('online', () => {
    document.getElementById('pos-offline-badge')?.classList.add('hidden');
    syncOfflineOrders();
});
window.addEventListener('offline', () => {
    document.getElementById('pos-offline-badge')?.classList.remove('hidden');
    showAdminToast('Mất kết nối mạng! Chuyển sang chế độ Chờ đồng bộ (Offline).', 'warning');
});

async function saveOrderToIDB(orderPayload) {
    if (!idb) await initIndexedDB();
    return new Promise((resolve, reject) => {
        const tx = idb.transaction(storeName, "readwrite");
        const store = tx.objectStore(storeName);
        store.add({ payload: orderPayload, timestamp: Date.now() });
        tx.oncomplete = () => resolve();
        tx.onerror = (e) => reject(e.target.error);
    });
}

async function syncOfflineOrders() {
    if (!idb || !navigator.onLine) return;
    const tx = idb.transaction(storeName, "readwrite");
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onsuccess = async () => {
        const offlineOrders = request.result;
        if (offlineOrders.length > 0) {
            showAdminToast(`Đang đồng bộ ${offlineOrders.length} đơn hàng Offline...`, 'info');
            for (const order of offlineOrders) {
                try {
                    const { data: newOrderId, error } = await supabase.rpc('place_order_and_deduct_inventory', { payload: order.payload });
                    if (!error) {
                        await supabase.from('orders').update({ is_paid: true, payment_status: 'paid' }).eq('id', newOrderId);
                        
                        // Audit log for offline synced orders
                        const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'POS';
                        logAudit('Đồng bộ Offline', `Đồng bộ đơn bàn ${order.payload.table_number} — ${order.payload.total_price.toLocaleString('vi-VN')}đ`);
                        if (order.payload.discount_code && order.payload.discount_amount > 0) {
                            logAudit('POS Giảm giá (Offline)', `Sử dụng mã ${order.payload.discount_code} giảm ${order.payload.discount_amount.toLocaleString('vi-VN')}đ cho Bàn ${order.payload.table_number} bởi ${staffName}`);
                        }

                        // delete from IDB
                        const delTx = idb.transaction(storeName, "readwrite");
                        delTx.objectStore(storeName).delete(order.id);
                    }
                } catch(e) {
                    console.error("Sync error:", e);
                }
            }
            showAdminToast('Đồng bộ dữ liệu Offline hoàn tất!', 'success');
        }
    };
}

function posCalculateReductions(cartItems) {
    const reductions = {};
    cartItems.forEach(item => {
        if (item.recipe && Array.isArray(item.recipe)) {
            item.recipe.forEach(ri => {
                const iId = ri.ingredientId || ri.ingredient_id;
                if (!iId) return;
                if (!reductions[iId]) reductions[iId] = 0;
                reductions[iId] += ((ri.quantity || 0) * item.quantity);
            });
        }
        if (item.selectedOptions && Array.isArray(item.selectedOptions)) {
            item.selectedOptions.forEach(opt => {
                if (opt.recipe && Array.isArray(opt.recipe)) {
                    opt.recipe.forEach(ri => {
                        const iId = ri.ingredientId || ri.ingredient_id;
                        if (!iId) return;
                        if (!reductions[iId]) reductions[iId] = 0;
                        reductions[iId] += ((ri.quantity || 0) * item.quantity);
                    });
                }
            });
        }
    });
    return reductions;
}

async function posCheckOnlineStock(reductions) {
    if (!navigator.onLine) return [];
    
    const ingredientIds = Object.keys(reductions);
    if (ingredientIds.length === 0) return [];
    
    const { data: freshStock, error: stockErr } = await supabase.from('ingredients')
        .select('id, name, stock')
        .in('id', ingredientIds)
        .eq('tenant_id', window.AdminState.tenantId);
        
    if (!stockErr && freshStock && freshStock.length > 0) {
        const stockMap = {};
        freshStock.forEach(i => stockMap[i.id] = i.stock);
        
        const outOfStockNames = [];
        for (const iId of ingredientIds) {
            if ((stockMap[iId] || 0) < reductions[iId]) {
                const ingInfo = freshStock.find(i => i.id === iId);
                outOfStockNames.push(ingInfo ? ingInfo.name : 'Vật tư');
            }
        }
        return outOfStockNames;
    }
    return [];
}

window.posSubmitOrder = async function() {
    if (typeof window.checkCurrentShift === 'function' && !window.currentShift) {
        showAdminToast('Vui lòng mở ca làm việc trước khi tạo đơn hàng!', 'warning');
        if (typeof window.showOpenShiftModal === 'function') {
            window.showOpenShiftModal();
        }
        return;
    }

    if (posCart.length === 0) {
        showAdminToast('Giỏ hàng trống!', 'warning');
        return;
    }
    if (!posSelectedTable) {
        showAdminToast('Vui lòng chọn bàn trước khi đặt hàng!', 'warning');
        return;
    }
    const btn = document.getElementById('pos-submit-btn');
    if (btn) { btn.disabled = true; btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang gửi...'; }

    const subtotal = posCart.reduce((s, c) => {
        const optionsPrice = (c.selectedOptions || []).reduce((sum, o) => sum + o.priceExtra, 0);
        return s + (c.price + optionsPrice) * c.quantity;
    }, 0);
    
    let discount = 0;
    if (posAppliedVoucher && (!posAppliedVoucher.min_order_value || subtotal >= posAppliedVoucher.min_order_value)) {
        if (posAppliedVoucher.discount_type === 'percent') {
            discount = subtotal * (posAppliedVoucher.discount_value / 100);
            if (posAppliedVoucher.max_discount && discount > posAppliedVoucher.max_discount) discount = posAppliedVoucher.max_discount;
        } else {
            discount = posAppliedVoucher.discount_value;
        }
        if (discount > subtotal) discount = subtotal;
    }
    
    const totalPrice = subtotal - discount;
    const note = (document.getElementById('pos-order-note')?.value || '').trim();
    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'POS';

    const reductions = posCalculateReductions(posCart);

    const tableNum = posSelectedTable === 'POS' ? 'POS' : String(posSelectedTable);
    const tableLetter = tableNum === 'POS' ? 'P' : String.fromCharCode(64 + Math.min(parseInt(tableNum) || 1, 26));

    const items = posCart.map((c, idx) => ({ 
        id: c.id, 
        name: c.name, 
        price: c.price, 
        quantity: c.quantity, 
        recipe: c.recipe,
        selectedOptions: c.selectedOptions || [],
        item_code: `${tableLetter}${idx + 1}`,
        is_done: false
    }));

    let paymentMethod = 'cash';
    const pmRadio = document.querySelector('input[name="pos_payment"]:checked');
    if (pmRadio) {
        paymentMethod = pmRadio.value;
    }

    try {
        const outOfStockNames = await posCheckOnlineStock(reductions);
        if (outOfStockNames.length > 0) {
            showAdminToast(`Hết nguyên liệu: ${outOfStockNames.join(', ')}`, 'error');
            if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đơn hàng'; }
            return;
        }

        // Check voucher limit right before submission to prevent race conditions
        if (posAppliedVoucher && discount > 0 && navigator.onLine) {
            const { data: vCheck } = await supabase.from('vouchers')
                .select('used_count, usage_limit, is_active, start_date, end_date')
                .eq('code', posAppliedVoucher.code)
                .eq('tenant_id', window.AdminState.tenantId)
                .single();
                
            if (vCheck) {
                if (!vCheck.is_active) {
                    showAdminToast(`Mã giảm giá ${posAppliedVoucher.code} đã bị vô hiệu hóa!`, 'error');
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đơn hàng'; }
                    return;
                }
                const now = new Date();
                if (vCheck.start_date && new Date(vCheck.start_date) > now) {
                    showAdminToast(`Mã giảm giá ${posAppliedVoucher.code} chưa đến thời gian áp dụng!`, 'error');
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đơn hàng'; }
                    return;
                }
                if (vCheck.end_date && new Date(vCheck.end_date) < now) {
                    showAdminToast(`Mã giảm giá ${posAppliedVoucher.code} đã hết hạn!`, 'error');
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đơn hàng'; }
                    return;
                }
                if (vCheck.usage_limit && vCheck.used_count >= vCheck.usage_limit) {
                    showAdminToast(`Mã giảm giá ${posAppliedVoucher.code} đã hết lượt sử dụng!`, 'error');
                    if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đơn hàng'; }
                    return;
                }
            }
        }

        const orderPayload = {
            tenant_id: window.AdminState.tenantId,
            table_number: String(posSelectedTable),
            session_id: 'POS_' + Date.now(),
            items: items,
            reductions: reductions,
            total_price: totalPrice,
            discount_code: posAppliedVoucher && discount > 0 ? posAppliedVoucher.code : null,
            discount_amount: discount > 0 ? discount : 0,
            order_note: note || null,
            status: 'Pending',     
            payment_method: paymentMethod,  
            payment_status: 'paid'   
        };

        if (navigator.onLine) {
            const { data: newOrderId, error } = await supabase.rpc('place_order_and_deduct_inventory', { payload: orderPayload });
            if (error) {
                console.error("RPC Error Details:", error);
                if (error.message && error.message.includes("Failed to fetch")) {
                    await saveOrderToIDB(orderPayload);
                    showAdminToast(`Lỗi mạng. Đã lưu Offline đơn bàn ${posSelectedTable}! (Sẽ đồng bộ sau) 🟡`, 'warning');
                } else {
                    throw new Error(error.message || 'Lỗi gửi đơn (Database)');
                }
            } else {
                const { error: updateErr } = await supabase.from('orders')
                    .update({ is_paid: true, payment_status: 'paid' })
                    .eq('id', newOrderId)
                    .eq('tenant_id', window.AdminState.tenantId);
                    
                if (updateErr) console.warn("Lỗi cập nhật trạng thái thanh toán POS:", updateErr);
                logAudit('POS Đặt hàng', `Bàn ${posSelectedTable} — ${posCart.length} món — ${totalPrice.toLocaleString('vi-VN')}đ bởi ${staffName}`);
                if (posAppliedVoucher && discount > 0) {
                    logAudit('POS Giảm giá', `Sử dụng mã ${posAppliedVoucher.code} giảm ${discount.toLocaleString('vi-VN')}đ cho Bàn ${posSelectedTable} bởi ${staffName}`);
                }
                showAdminToast(`Đã gửi đơn bàn ${posSelectedTable} thành công! 🎉`, 'success');
            }
        } else {
            await saveOrderToIDB(orderPayload);
            showAdminToast(`Mạng ngoại tuyến. LƯU OFFLINE đơn bàn ${posSelectedTable}! (Sẽ đồng bộ sau) 🟡`, 'warning');
        }
        
        posPrintBill({ id: 'OFFLINE_PENDING_' + Date.now(), table_number: posSelectedTable, items: items, total_price: totalPrice, order_note: note, discount_amount: discount > 0 ? discount : 0 });
        
        posCart = [];
        posAppliedVoucher = null;
        posRenderCart();
        if (document.getElementById('pos-order-note')) document.getElementById('pos-order-note').value = '';
        if (document.getElementById('pos-voucher-code')) document.getElementById('pos-voucher-code').value = '';
    } catch(e) {
        console.error('POS submit error:', e);
        showAdminToast(e.message || 'Lỗi gửi đơn hàng!', 'error');
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-paper-plane"></i> Gửi đơn hàng'; }
    }
};

window.posPrintBill = function(order) {
    const printWindow = window.open('', '_blank', 'width=400,height=600');
    if (!printWindow) {
        showAdminToast('Vui lòng cho phép popup để in bill!', 'warning');
        return;
    }
    const d = new Date();
    const html = `
        <html>
        <head>
            <title>In Bill</title>
            <style>
                body { font-family: monospace; padding: 20px; text-align: center; }
                h2 { margin: 0 0 10px; font-size: 20px; }
                p { margin: 5px 0; font-size: 14px; }
                .divider { border-bottom: 1px dashed #000; margin: 15px 0; }
                table { width: 100%; border-collapse: collapse; text-align: left; }
                th { border-bottom: 1px dashed #000; padding: 5px 0; font-size: 12px;}
                td { padding: 5px 0; font-size: 14px; }
                .text-right { text-align: right; }
                .total { font-weight: bold; font-size: 16px; margin-top: 15px; text-align: right; }
            </style>
        </head>
        <body>
            <h2>Nohope Coffee</h2>
            <p>123 Đường ABC, Quận X, TP.HCM</p>
            <p>SĐT: 0123 456 789</p>
            <div class="divider"></div>
            <p><strong>Ngày:</strong> ${d.toLocaleDateString('vi-VN')} ${d.toLocaleTimeString('vi-VN')}</p>
            <p><strong>Số/Bàn:</strong> ${window.escapeHTML(order.table_number || 'POS')}</p>
            <p><strong>Mã đơn:</strong> ${order.id}</p>
            <div class="divider"></div>
            <table>
                <thead><tr><th>Tên món</th><th style="width:50px; text-align:center;">SL</th><th class="text-right">T.Tiền</th></tr></thead>
                <tbody>
                    ${order.items.map(item => {
                        const optionsStr = (item.selectedOptions && item.selectedOptions.length > 0) 
                            ? `<br><span style="font-size:11px; color:#555;">+ ${item.selectedOptions.map(o => window.escapeHTML(o.choiceName)).join(', ')}</span>` 
                            : '';
                        const optionsPrice = (item.selectedOptions || []).reduce((sum, o) => sum + o.priceExtra, 0);
                        const itemTotal = (item.price + optionsPrice) * item.quantity;
                        return `
                        <tr>
                            <td>${window.escapeHTML(item.name)}${optionsStr}</td>
                            <td style="text-align:center;">${item.quantity}</td>
                            <td class="text-right">${itemTotal.toLocaleString('vi-VN')}đ</td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            ${order.discount_amount > 0 ? `
            <div class="divider" style="margin: 5px 0; border-bottom: 1px dashed #ddd;"></div>
            <div style="text-align: right; font-size: 14px; margin-top: 5px; color: #555;">Giảm giá: -${(order.discount_amount || 0).toLocaleString('vi-VN')}đ</div>
            ` : ''}
            <div class="divider"></div>
            <div class="total">Tổng cộng: ${(order.total_price || 0).toLocaleString('vi-VN')}đ</div>
            <div class="divider"></div>
            <p style="font-size:12px;">Cảm ơn quý khách và hẹn gặp lại!</p>
            <p style="font-size:12px;">Mật khẩu Wifi: <i>nohopecoffee</i></p>
            <script>
                window.onload = function() { window.print(); window.setTimeout(window.close, 500); };
            </script>
        </body>
        </html>
    `;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
};
