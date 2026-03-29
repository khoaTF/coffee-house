// =============================================
// ADMIN-POS — Point of Sale: Staff/Admin order for table
// =============================================
// Dependencies: admin-core.js (products, supabase, showAdminToast, logAudit)

let posCart = [];
let posSelectedTable = 'POS';
let posProductsList = [];
let posCurrentOptionsItem = null;

window.initPOS = async function() {
    const container = document.getElementById('pos-content');
    if (!container) return;

    // Render layout first
    container.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
            <div>
                <h2 class="font-noto text-2xl font-bold text-[#F2E8D5] mb-1 flex items-center gap-2">
                    <i class="fa-solid fa-cash-register text-[#C0A062]"></i> POS Bán hàng
                </h2>
                <p class="text-sm text-[#A89F88] mb-0">Đặt hàng nhanh thay khách từ quầy thu ngân.</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <!-- Menu Panel -->
            <div class="lg:col-span-2">
                <!-- Table selector + search -->
                <div class="flex gap-3 mb-4">
                    <div class="flex items-center gap-2 bg-[#232018] border border-[#3A3528] rounded-xl px-4 py-2 flex-shrink-0">
                        <i class="fa-solid fa-chair text-[#C0A062]"></i>
                        <label class="text-sm text-[#A89F88] font-semibold">Đơn:</label>
                        <select id="pos-table-select" class="bg-transparent text-[#E8DCC4] font-bold text-sm focus:outline-none" onchange="posSelectTable(this.value)">
                            <option value="POS" class="bg-[#232018] text-[#E8DCC4]" selected>Mang đi (POS)</option>
                            ${Array.from({length:20}, (_,i) => `<option value="${i+1}" class="bg-[#232018] text-[#E8DCC4]">Bàn ${i+1}</option>`).join('')}
                        </select>
                    </div>
                    <div class="relative flex-1">
                        <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-[#A89F88]"></i>
                        <input id="pos-search" type="search" placeholder="Tìm món..." class="w-full pl-9 pr-4 py-2.5 bg-[#232018] border border-[#3A3528] rounded-xl text-[#E8DCC4] placeholder-[#A89F88] focus:outline-none focus:border-[#C0A062] text-sm" oninput="posFilterProducts(this.value)">
                    </div>
                </div>

                <!-- Category tabs -->
                <div id="pos-category-tabs" class="flex gap-2 overflow-x-auto pb-2 mb-4 custom-scrollbar"></div>

                <!-- Products grid -->
                <div id="pos-products-grid" class="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div class="col-span-full text-center py-10 text-[#A89F88]"><i class="fa-solid fa-spinner fa-spin me-2"></i>Đang tải thực đơn...</div>
                </div>
            </div>

            <!-- Cart Panel -->
            <div class="lg:col-span-1">
                <div class="card bg-[#232018] border border-[#3A3528] rounded-2xl overflow-hidden sticky top-4">
                    <div class="p-4 border-b border-[#3A3528] flex justify-between items-center">
                        <h5 class="font-bold text-[#F2E8D5] mb-0 flex items-center gap-2">
                            <i class="fa-solid fa-cart-shopping text-[#C0A062]"></i> Giỏ hàng
                            <span id="pos-cart-count" class="text-xs font-bold bg-[#1A1814] bg-[#C0A062] rounded-full px-2 py-0.5" style="background-color: #C0A062;">0</span>
                        </h5>
                        <button class="text-xs text-[#A89F88] hover:text-red-400 transition-colors border-0 bg-transparent" onclick="posClearCart()">
                            <i class="fa-solid fa-trash"></i> Xóa
                        </button>
                    </div>

                    <div id="pos-cart-items" class="p-4 space-y-3 max-h-[320px] overflow-y-auto custom-scrollbar">
                        <div class="text-center py-8 text-[#A89F88] text-sm">Chưa có món nào</div>
                    </div>

                    <div class="border-t border-[#3A3528] p-4">
                        <div class="flex justify-between items-center mb-4">
                            <span class="text-[#A89F88] font-semibold">Tổng cộng:</span>
                            <span id="pos-cart-total" class="text-xl font-bold text-[#C0A062]">0 đ</span>
                        </div>
                        <div class="mb-3">
                            <input id="pos-order-note" type="text" placeholder="Ghi chú đơn hàng (nếu có)..." class="w-full px-3 py-2 bg-[#1A1814] border border-[#3A3528] rounded-xl text-[#E8DCC4] placeholder-[#A89F88] text-sm focus:outline-none focus:border-[#C0A062]">
                        </div>
                        <button id="pos-submit-btn" class="w-full py-3 rounded-xl font-bold text-[#1A1814] text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2" style="background:#C0A062;" onclick="posSubmitOrder()">
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
            <div class="bg-[#232018] border border-[#3A3528] rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
                <div class="px-5 py-4 border-b border-[#3A3528] flex justify-between items-center">
                    <h3 id="pos-options-modal-title" class="font-bold text-[#E8DCC4] text-lg">Tùy chọn</h3>
                    <button class="text-[#A89F88] hover:text-[#E8DCC4] bg-transparent border-none" onclick="posCloseOptionsModal()">
                        <i class="fa-solid fa-xmark text-xl"></i>
                    </button>
                </div>
                <div id="pos-options-container" class="p-5 overflow-y-auto custom-scrollbar flex-1 space-y-4">
                </div>
                <div class="px-5 py-4 border-t border-[#3A3528] bg-[#1A1814]">
                    <button class="w-full py-3 rounded-xl font-bold flex justify-center items-center gap-2 hover:opacity-90 transition-opacity text-[#1A1814]" style="background:#C0A062;" onclick="posConfirmOptions()">
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
        const { data, error } = await supabase.from('products').select('*').eq('is_available', true).order('category');
        if (error) throw error;
        posProductsList = data || [];
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
        <button class="pos-cat-btn flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${i === 0 ? 'bg-[#C0A062] text-[#1A1814]' : 'bg-[#232018] border border-[#3A3528] text-[#A89F88] hover:text-[#E8DCC4]'}"
            onclick="posFilterByCategory('${window.escapeHTML(cat)}', this)">
            ${window.escapeHTML(cat)}
        </button>
    `).join('');
}

window.posFilterByCategory = function(cat, btn) {
    document.querySelectorAll('.pos-cat-btn').forEach(b => {
        b.className = 'pos-cat-btn flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-[#232018] border border-[#3A3528] text-[#A89F88] hover:text-[#E8DCC4]';
    });
    btn.className = 'pos-cat-btn flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-all bg-[#C0A062] text-[#1A1814]';
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
        grid.innerHTML = '<div class="col-span-full text-center py-10 text-[#A89F88]">Không tìm thấy món phù hợp.</div>';
        return;
    }
    grid.innerHTML = list.map(p => {
        const price = p.promotional_price && isPromoActive(p) ? p.promotional_price : p.price;
        return `
            <div class="card bg-[#232018] border border-[#3A3528] rounded-2xl overflow-hidden cursor-pointer hover:border-[#C0A062] transition-all active:scale-95 group" onclick="posAddToCart('${p.id}')">
                ${p.image_url ? `<img src="${window.escapeHTML(p.image_url)}" alt="" class="w-full h-24 object-cover" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-full h-24 bg-[#3A3528] flex items-center justify-center p-4\\'><img src=\\'/images/bunny_logo.png\\' alt=\\'\\' class=\\'w-full h-full object-contain opacity-30\\'></div>';">` : '<div class="w-full h-24 bg-[#3A3528] flex items-center justify-center"><i class="fa-solid fa-mug-hot text-[#A89F88] text-2xl"></i></div>'}
                <div class="p-3">
                    <div class="text-sm font-bold text-[#E8DCC4] line-clamp-1 group-hover:text-[#C0A062] transition-colors">${window.escapeHTML(p.name)}</div>
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

window.posAddToCart = function(productId) {
    const p = posProductsList.find(x => x.id === productId);
    if (!p) return;
    
    // Check if it has options (skip combos for POS for simplicity, or handle similarly later if needed)
    if (p.options && p.options.length > 0) {
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
    
    item.options.forEach((opt, optIndex) => {
        const optName = opt.name || opt.optionName;
        const group = document.createElement('div');
        group.className = 'mb-3';
        group.innerHTML = `<h3 class="text-[#E8DCC4] font-bold mb-2">${window.escapeHTML(optName)}</h3>`;
        
        opt.choices.forEach((choice, choiceIndex) => {
            const choiceName = choice.name || choice.choiceName;
            const isChecked = choiceIndex === 0 ? 'checked' : '';
            const priceExtraText = choice.priceExtra > 0 ? `+${choice.priceExtra.toLocaleString('vi-VN')}đ` : '';
            
            group.innerHTML += `
                <label class="flex items-center justify-between p-3 border border-[#3A3528] rounded-xl mb-2 cursor-pointer hover:border-[#C0A062] transition-colors">
                    <div class="flex items-center gap-3">
                        <input type="radio" name="pos_opt_${optIndex}" value="${window.escapeHTML(choiceName)}" data-price="${choice.priceExtra}" ${isChecked} class="accent-[#C0A062] w-4 h-4">
                        <span class="text-[#E8DCC4] text-sm">${window.escapeHTML(choiceName)}</span>
                    </div>
                    <span class="text-[#C0A062] text-sm">${priceExtraText}</span>
                </label>
            `;
        });
        container.appendChild(group);
    });
    
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
    posCurrentOptionsItem.options.forEach((opt, optIndex) => {
        const optName = opt.name || opt.optionName;
        const selectedRadio = container.querySelector(`input[name="pos_opt_${optIndex}"]:checked`);
        if (selectedRadio) {
            selectedOptions.push({
                optionName: optName,
                choiceName: selectedRadio.value,
                priceExtra: parseInt(selectedRadio.dataset.price) || 0
            });
        }
    });
    
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
    if (item.quantity <= 0) posCart = posCart.filter(c => c.cartKey !== item.cartKey && c.id !== item.id);
    posRenderCart();
};

window.posClearCart = function() {
    posCart = [];
    posRenderCart();
};

function posRenderCart() {
    const el = document.getElementById('pos-cart-items');
    const countEl = document.getElementById('pos-cart-count');
    const totalEl = document.getElementById('pos-cart-total');
    if (!el) return;

    const totalQty = posCart.reduce((s, c) => s + c.quantity, 0);
    const totalPrice = posCart.reduce((s, c) => {
        const optionsPrice = (c.selectedOptions || []).reduce((sum, o) => sum + o.priceExtra, 0);
        return s + (c.price + optionsPrice) * c.quantity;
    }, 0);

    if (countEl) countEl.textContent = totalQty;
    if (totalEl) totalEl.textContent = totalPrice.toLocaleString('vi-VN') + ' đ';

    if (posCart.length === 0) {
        el.innerHTML = '<div class="text-center py-8 text-[#A89F88] text-sm">Chưa có món nào</div>';
        return;
    }

    el.innerHTML = posCart.map(c => {
        const optionsPrice = (c.selectedOptions || []).reduce((sum, o) => sum + o.priceExtra, 0);
        const itemTotal = (c.price + optionsPrice) * c.quantity;
        const optionsHtml = (c.selectedOptions && c.selectedOptions.length > 0) 
            ? `<div class="text-xs text-[#A89F88] mt-1">+ ${c.selectedOptions.map(o => window.escapeHTML(o.choiceName)).join(', ')}</div>` 
            : '';
            
        return `
        <div class="flex items-center justify-between gap-2 py-2 border-b border-[#3A3528] last:border-0">
            <div class="flex-1 min-w-0">
                <div class="text-sm font-semibold text-[#E8DCC4] truncate">${window.escapeHTML(c.name)}</div>
                ${optionsHtml}
                <div class="text-xs text-[#C0A062] mt-1">${itemTotal.toLocaleString('vi-VN')} đ</div>
            </div>
            <div class="flex items-center gap-1 flex-shrink-0">
                <button class="w-6 h-6 rounded-lg bg-[#3A3528] text-[#E8DCC4] text-xs hover:bg-red-900/40 transition-colors flex items-center justify-center" onclick="posUpdateQty('${c.cartKey || c.id}', -1)">−</button>
                <span class="w-6 text-center text-sm font-bold text-[#E8DCC4]">${c.quantity}</span>
                <button class="w-6 h-6 rounded-lg bg-[#3A3528] text-[#E8DCC4] text-xs hover:bg-green-900/40 transition-colors flex items-center justify-center" onclick="posUpdateQty('${c.cartKey || c.id}', 1)">+</button>
            </div>
        </div>
        `;
    }).join('');
}

window.posSubmitOrder = async function() {
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

    const totalPrice = posCart.reduce((s, c) => {
        const optionsPrice = (c.selectedOptions || []).reduce((sum, o) => sum + o.priceExtra, 0);
        return s + (c.price + optionsPrice) * c.quantity;
    }, 0);
    const note = (document.getElementById('pos-order-note')?.value || '').trim();
    const staffName = sessionStorage.getItem('nohope_staff_name') || localStorage.getItem('nohope_staff_name') || 'POS';

    const reductions = {};
    posCart.forEach(item => {
        if (item.recipe && Array.isArray(item.recipe)) {
            item.recipe.forEach(ri => {
                const iId = ri.ingredientId || ri.ingredient_id;
                if (!reductions[iId]) reductions[iId] = 0;
                reductions[iId] += (ri.quantity * item.quantity);
            });
        }
    });

    const items = posCart.map(c => ({ 
        id: c.id, 
        name: c.name, 
        price: c.price, 
        quantity: c.quantity, 
        recipe: c.recipe,
        selectedOptions: c.selectedOptions || []
    }));

    const orderPayload = {
        table_number: String(posSelectedTable),
        items: items,
        reductions: reductions,
        total_price: totalPrice,
        order_note: note || null,
        status: 'Completed',     // POS orders are immediately completed
        payment_method: 'cash',  // POS orders default to cash
        payment_status: 'paid'   // POS orders default to paid
    };

    try {
        const { data: newOrderId, error } = await supabase.rpc('place_order_and_deduct_inventory', { payload: orderPayload });
        if (error) throw error;

        logAudit('POS Đặt hàng', `Bàn ${posSelectedTable} — ${posCart.length} món — ${totalPrice.toLocaleString('vi-VN')}đ bởi ${staffName}`);
        
        // Print bill popup
        posPrintBill({ id: newOrderId, table_number: posSelectedTable, items: items, total_price: totalPrice, order_note: note });
        
        showAdminToast(`Đã gửi đơn bàn ${posSelectedTable} thành công! 🎉`, 'success');
        posCart = [];
        posRenderCart();
        if (document.getElementById('pos-order-note')) document.getElementById('pos-order-note').value = '';
    } catch(e) {
        console.error('POS submit error:', e);
        showAdminToast('Lỗi gửi đơn hàng!', 'error');
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
