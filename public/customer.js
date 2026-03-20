// Remove socket.io: const socket = io();

// Constants
const queryParams = new URLSearchParams(window.location.search);
const TABLE_NUMBER = queryParams.get('table') || '1';
let menuItems = [];
let cart = [];
let activeOrderId = null; // Locks the menu
let trackedOrderId = null; // Updates the banner
let ingredientStock = {};
let sessionOrders = [];
let currentFeedbackOrderId = null;

// translations moved to i18n.js

// Per-tab session using sessionStorage (isolated per browser tab)
// Include table number so different table tabs on the same browser are fully isolated
const sessionKey = 'cafe_session_' + TABLE_NUMBER;
let sessionId = sessionStorage.getItem(sessionKey);

let appliedPromo = null;
let currentDiscountAmount = 0;

window.currentCustomerPhone = null;
window.currentCustomerPoints = 0;
window.loyaltyDiscountApplied = false;
window.upsellShown = false;

// Generate unique session ID for this device/tab if not exists
if (!sessionId) {
    sessionId = 'sess_' + TABLE_NUMBER + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    sessionStorage.setItem(sessionKey, sessionId);
}

// Status Map
const statusMap = {
    'Pending': { text: 'Đang chờ', class: 'text-primary' },
    'Preparing': { text: 'Đang làm', class: 'text-warning font-bold', color: '#ecc94b' },
    'Ready': { text: 'Đã xong', class: 'text-success font-bold' },
    'Completed': { text: 'Hoàn thành', class: 'text-muted' },
    'Cancelled': { text: 'Đã Hủy', class: 'text-danger font-bold' }
};

// DOM Elements
const menuContainer = document.getElementById('menu-container');
const categoryPills = document.querySelectorAll('.pill');
const loader = document.getElementById('loader');

// Cart DOM
const floatingCart = document.getElementById('floating-cart');
const cartItemCount = document.getElementById('cart-item-count');
const cartTotalPrice = document.getElementById('cart-total-price');
const viewCartBtn = document.getElementById('view-cart-btn');

// Modal DOM
const cartModal = document.getElementById('cart-modal');
const closeModalBtn = document.getElementById('close-modal');
const cartItemsContainer = document.getElementById('cart-items-container');
const checkoutTotal = document.getElementById('checkout-total');
const checkoutCashBtn = document.getElementById('checkout-cash-btn');
const checkoutTransferBtn = document.getElementById('checkout-transfer-btn');

// Success / Banner DOM
const liveOrderBanner = document.getElementById('live-order-banner');
const liveStatus = document.getElementById('live-status');

// History DOM
const historyModal = document.getElementById('order-history-modal');
const closeHistoryModalBtn = document.getElementById('close-history-modal');
const historyItemsContainer = document.getElementById('history-items-container');
const myOrdersBtn = document.getElementById('my-orders-btn');

function init() {
    document.getElementById('table-number-display').textContent = TABLE_NUMBER;
    acquireTableLock();
}

// ---- Table Lock (via Supabase table_sessions) ----
async function acquireTableLock() {
    try {
        // Check if table is locked by a different session
        const { data: existing } = await supabase
            .from('table_sessions')
            .select('session_id, last_seen')
            .eq('table_number', TABLE_NUMBER)
            .single();

        if (existing) {
            const lastSeen = new Date(existing.last_seen);
            const ageMs = Date.now() - lastSeen.getTime();
            const STALE_THRESHOLD = 5 * 60 * 1000; // 5 minutes = stale session

            if (existing.session_id !== sessionId && ageMs < STALE_THRESHOLD) {
                // Table is locked by another active session
                showTableLockedOverlay();
                return;
            }

            // Either our own session or a stale one — claim/refresh it
            await supabase.from('table_sessions')
                .update({ session_id: sessionId, last_seen: new Date().toISOString() })
                .eq('table_number', TABLE_NUMBER);
        } else {
            // No lock exists, create one
            await supabase.from('table_sessions').insert([{
                table_number: TABLE_NUMBER,
                session_id: sessionId,
                device_info: navigator.userAgent.slice(0, 100)
            }]);
        }

        // Start heartbeat to keep lock alive (every 60s)
        setInterval(async () => {
            await supabase.from('table_sessions')
                .update({ last_seen: new Date().toISOString() })
                .eq('table_number', TABLE_NUMBER)
                .eq('session_id', sessionId);
        }, 60 * 1000);

        // Release lock when tab closes
        window.addEventListener('beforeunload', releaseTableLock);

        // All good — proceed to load the menu
        fetchMenu();
        attachEventListeners();
        setupRealtimeSubscription();

    } catch (e) {
        // If the table_sessions table doesn't exist yet, just proceed normally
        console.warn('Table lock: table_sessions table may not exist yet, skipping lock.', e.message);
        fetchMenu();
        attachEventListeners();
        setupRealtimeSubscription();
    }
}

async function releaseTableLock() {
    await supabase.from('table_sessions')
        .delete()
        .eq('table_number', TABLE_NUMBER)
        .eq('session_id', sessionId);
}

function showTableLockedOverlay() {
    loader.innerHTML = `
        <div style="text-align:center; padding: 40px 20px;">
            <i class="fa-solid fa-lock" style="font-size: 3rem; color: #e74c3c; margin-bottom: 16px;"></i>
            <h4 style="color: white; margin-bottom: 8px;">Bàn ${TABLE_NUMBER} đang được sử dụng</h4>
            <p style="color: #aaa; margin-bottom: 24px;">Bàn này đang có khách. Vui lòng liên hệ nhân viên hoặc thử lại sau.</p>
            <button onclick="location.reload()" class="pill" style="background: rgba(231,76,60,0.2); border-color: #e74c3c; color: #e74c3c; padding: 10px 24px;">
                <i class="fa-solid fa-rotate-right"></i> Thử lại
            </button>
        </div>
    `;
    loader.style.display = 'flex';
    loader.style.alignItems = 'center';
    loader.style.justifyContent = 'center';
    loader.style.minHeight = '60vh';
}


// Fetch Menu from Backend
async function fetchMenu() {
    try {
        const [prodRes, stockRes, ordersRes] = await Promise.all([
            supabase.from('products').select('*').eq('is_available', true),
            supabase.from('ingredients').select('id, stock'),
            supabase.from('orders').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(10)
        ]);

        if (prodRes.error) throw prodRes.error;
        if (stockRes.error) throw stockRes.error;
        if (ordersRes.error) throw ordersRes.error;

        // Map menu items properly id to _id for backward compatibility with existing UI code
        menuItems = prodRes.data.map(p => ({...p, _id: p.id, imageUrl: p.image_url}));
        
        // Build stock dictionary
        ingredientStock = {};
        stockRes.data.forEach(i => ingredientStock[i.id] = i.stock);
        
        // Restore session orders
        sessionOrders = ordersRes.data.map(o => ({
            ...o, 
            _id: o.id, 
            createdAt: o.created_at,
            totalPrice: o.total_price,
            orderNote: o.order_note
        }));
        console.log("RESTORED SESSION ORDERS FOR TABLE", TABLE_NUMBER, sessionOrders);
        
        // activeOrder blocks placing new orders (Pending)
        // trackedOrder stays on the banner (Pending or Preparing)
        const activeOrder = sessionOrders.find(o => o.status === 'Pending');
        const preparingOrder = sessionOrders.find(o => o.status === 'Preparing');
        
        const displayOrder = activeOrder || preparingOrder;

        if (displayOrder) {
            activeOrderId = activeOrder ? activeOrder._id : null;
            trackedOrderId = displayOrder._id;
            
            liveOrderBanner.style.display = 'block';
            let statusText = statusMap[displayOrder.status] ? statusMap[displayOrder.status].text : displayOrder.status;
            let statusClass = statusMap[displayOrder.status] ? statusMap[displayOrder.status].class : 'text-primary';
            let statusColor = (statusMap[displayOrder.status] && statusMap[displayOrder.status].color) ? statusMap[displayOrder.status].color : '';

            if (displayOrder.status === 'Pending') {
                if (!displayOrder.is_paid) {
                    statusText = 'Chưa thanh toán (Chờ xác nhận)';
                    statusClass = 'text-danger font-bold';
                    statusColor = '#e74c3c';
                } else {
                    statusText = 'Đã thanh toán (Chờ bếp làm)';
                    statusClass = 'text-primary font-bold';
                    statusColor = '#3498db';
                }
            }
            
            liveStatus.textContent = statusText;
            liveStatus.className = statusClass;
            if (statusColor) liveStatus.style.color = statusColor;
        } else {
            activeOrderId = null;
            trackedOrderId = null;
            liveOrderBanner.style.display = 'none';
        }
        
        loader.style.display = 'none';
        renderMenu('All');
        
        // Render history modal early to prepopulate it with fetched orders
        renderHistoryModal();
    } catch (error) {
        console.error("Lỗi khi tải thực đơn:", error);
        loader.textContent = "Không tải được thực đơn. Vui lòng tải lại trang.";
    }
}

// Calculate how many more portions of a product can be added to the cart
function getAvailableToAdd(product) {
    if (!product.recipe || product.recipe.length === 0) return 999;
    
    // Calculate total ingredients used by current cart
    let usedIngredients = {};
    cart.forEach(cartItem => {
        if (cartItem.recipe) {
            cartItem.recipe.forEach(req => {
                usedIngredients[req.ingredientId] = (usedIngredients[req.ingredientId] || 0) + (req.quantity * cartItem.quantity);
            });
        }
    });

    // Find the bottleneck based on remaining global stock
    let additionalAllowed = Infinity;
    product.recipe.forEach(req => {
        let totalStock = ingredientStock[req.ingredientId] || 0;
        let used = usedIngredients[req.ingredientId] || 0;
        let remaining = Math.max(0, totalStock - used);
        
        let possible = Math.floor(remaining / req.quantity);
        if (possible < additionalAllowed) {
            additionalAllowed = possible;
        }
    });

    return additionalAllowed === Infinity ? 999 : additionalAllowed;
}

// Render Menu
function renderMenu(category) {
    menuContainer.innerHTML = '';
    const searchQuery = document.getElementById('menu-search')?.value.toLowerCase() || '';

    const filteredItems = menuItems.filter(item => {
        const matchesCategory = category === 'All' || item.category === category;
        const matchesSearch = !searchQuery || 
                               item.name.toLowerCase().includes(searchQuery) || 
                               item.description.toLowerCase().includes(searchQuery);
        return matchesCategory && matchesSearch;
    });

    if(filteredItems.length === 0) {
        menuContainer.innerHTML = `<p class="text-center text-muted" data-i18n="no_items">${searchQuery ? 'Không tìm thấy món.' : 'Không có món nào.'}</p>`;
        return;
    }

    filteredItems.forEach((item, index) => {
        // Calculate total quantity of this product ID in cart (regardless of options)
        const cartItemTotalQty = cart.filter(c => c._id === item._id).reduce((sum, c) => sum + c.quantity, 0);
        
        const canAddMore = getAvailableToAdd(item) > 0;
        const isOutOfStock = !canAddMore && cartItemTotalQty === 0;
        const hasActiveOrder = activeOrderId !== null;
        const disableAddBtn = isOutOfStock || hasActiveOrder || !canAddMore;

        const card = document.createElement('div');
        card.className = `menu-item ${isOutOfStock ? 'out-of-stock' : ''}`;
        card.style.setProperty('--item-idx', index);
        const isBestSeller = !!item.isBestSeller;
        const hasOptions = item.options && item.options.length > 0;
        
        card.innerHTML = `
            <div style="position: relative;">
                <img class="menu-img" src="${item.imageUrl}" alt="${item.name}" ${isOutOfStock ? "style='filter: grayscale(1); opacity: 0.6'" : ""} onerror="this.style.display='none';this.nextElementSibling.style.display='flex';">
                <div class="img-fallback" style="display:none; width:100%; height:160px; background:linear-gradient(135deg,rgba(212,167,106,0.15) 0%,rgba(22,27,34,0.95) 100%); align-items:center; justify-content:center; flex-direction:column; gap:8px; color:rgba(255,255,255,0.4);"><i class="fa-solid fa-mug-hot" style="font-size:2rem;color:rgba(212,167,106,0.4);"></i><span style="font-size:0.8rem;">${item.name}</span></div>
                ${isOutOfStock ? '<div style="position: absolute; top: 10px; right: 10px; background: var(--danger); color: white; padding: 4px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: bold;">Hết hàng</div>' : ''}
                ${isBestSeller && !isOutOfStock ? '<div style="position: absolute; top: -10px; left: -10px; background: linear-gradient(45deg, #ff416c, #ff4b2b); color: white; padding: 4px 12px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; box-shadow: 0 4px 10px rgba(255, 65, 108, 0.4); z-index: 2; transform: rotate(-5deg);"><i class="fa-solid fa-fire"></i> Bán Chạy</div>' : ''}
            </div>
            <div class="menu-details">
                <div>
                    <div class="menu-title">${item.name}</div>
                    <div class="menu-desc">${item.description}</div>
                    <div class="menu-price">${item.price.toLocaleString('vi-VN')} đ</div>
                </div>
                <div class="qty-controls" style="margin-top: auto; align-self: flex-start;">
                    ${(cartItemTotalQty > 0) ? `<button class="qty-btn" onclick="updateCart('${item._id}', -1)">-</button>` : ''}
                    ${(cartItemTotalQty > 0) ? `<span class="qty-num">${cartItemTotalQty}</span>` : ''}
                    <button class="qty-btn ${hasOptions ? 'btn-primary' : ''}" style="${hasOptions ? 'width: auto; padding: 5px 15px; border-radius: 20px;' : ''}" onclick="updateCart('${item._id}', 1)" ${disableAddBtn ? "disabled style='opacity:0.5;background:#888;cursor:not-allowed;'" : ""}>
                        ${hasOptions ? 'Chọn' : '+'}
                    </button>
                </div>
            </div>
        `;
        menuContainer.appendChild(card);
    });
};

function updateCartUI() {
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => {
        const itemOptionsPrice = (item.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0);
        return sum + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);

    if (totalQty > 0) {
        floatingCart.style.display = 'block';
        cartItemCount.textContent = totalQty;
        cartTotalPrice.textContent = totalPrice.toLocaleString('vi-VN') + ' đ';
    } else {
        floatingCart.style.display = 'none';
        closeModal(); // Close modal if emptying cart
    }

    renderModalCart();
}

function renderModalCart() {
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div class="empty-cart text-center text-muted">Giỏ hàng đang trống.</div>';
        checkoutTotal.textContent = "0";
        if(checkoutCashBtn) checkoutCashBtn.disabled = true;
        if(checkoutTransferBtn) checkoutTransferBtn.disabled = true;
        return;
    }

    cartItemsContainer.innerHTML = '';
    let total = 0;

    cart.forEach(item => {
        const itemBasePrice = item.price;
        const optionsPrice = (item.selectedOptions || []).reduce((sum, opt) => sum + opt.priceExtra, 0);
        const itemTotal = (itemBasePrice + optionsPrice) * item.quantity;
        total += itemTotal;
        
        let optionsHtml = '';
        if (item.selectedOptions && item.selectedOptions.length > 0) {
            optionsHtml = '<div style="font-size: 0.8rem; color: #888; margin-top: 4px;">' + 
                item.selectedOptions.map(o => `+ ${o.choiceName}`).join(', ') + 
                '</div>';
        }

        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title">${item.name}</div>
                <div class="cart-item-price">${(itemBasePrice + optionsPrice).toLocaleString('vi-VN')} đ</div>
                ${optionsHtml}
            </div>
            <div class="qty-controls">
                <button class="qty-btn" onclick="updateCart('${item.cartKey}', -1)">-</button>
                <span class="qty-num">${item.quantity}</span>
                <button class="qty-btn" onclick="updateCart('${item.cartKey}', 1)" ${getAvailableToAdd(item) <= 0 ? 'disabled style="opacity:0.5;background:#888;cursor:not-allowed;"' : ''}>+</button>
            </div>
        `;
        cartItemsContainer.appendChild(row);
    });

    let discountAmount = 0;
    if (appliedPromo) {
        if (appliedPromo.discountType === 'PERCENT') {
            discountAmount = Math.floor(total * (appliedPromo.value / 100));
        } else {
            discountAmount = appliedPromo.value;
        }
        if (discountAmount > total) discountAmount = total;
        
        document.getElementById('cart-subtotal-row').style.display = 'flex';
        document.getElementById('cart-discount-row').style.display = 'flex';
        document.getElementById('checkout-subtotal').textContent = total.toLocaleString('vi-VN') + ' đ';
        document.getElementById('checkout-discount').textContent = discountAmount.toLocaleString('vi-VN') + ' đ';
        
        total -= discountAmount;
        currentDiscountAmount = discountAmount;
    } else {
        document.getElementById('cart-subtotal-row').style.display = 'none';
        document.getElementById('cart-discount-row').style.display = 'none';
        currentDiscountAmount = 0;
    }

    checkoutTotal.textContent = total.toLocaleString('vi-VN') + ' đ';
    if(checkoutCashBtn) checkoutCashBtn.disabled = false;
    if(checkoutTransferBtn) checkoutTransferBtn.disabled = false;
}

const optionsModal = document.getElementById('options-modal');
const closeOptionsBtn = document.getElementById('close-options-modal');
const confirmOptionsBtn = document.getElementById('confirm-options-btn');

// UI Triggers
function openModal() { 
    cartModal.classList.add('active'); 
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}
function closeModal() { 
    cartModal.classList.remove('active'); 
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}

function openPaymentModal(order) {
    const paymentModal = document.getElementById('payment-modal');
    if (!paymentModal) return;
    
    const totalPrice = Math.max(0, order.totalPrice || order.total_price || 0);
    const orderId = order._id || order.id || '';
    const memo = `${orderId.slice(0, 8).toUpperCase()}`;
    
    document.getElementById('payment-total-amount').textContent = totalPrice.toLocaleString('vi-VN') + ' đ';
    document.getElementById('payment-transfer-memo').textContent = memo;
    
    // Update QR Code Image with Dynamic Amount and Memo
    const qrImage = document.getElementById('qr-image');
    const bankId = 'tpbank'; // TPBank
    const accountNo = '89607102002'; 
    qrImage.src = `https://img.vietqr.io/image/${bankId}-${accountNo}-compact2.jpg?amount=${totalPrice}&addInfo=${encodeURIComponent(memo)}&accountName=LE%20ANH%20KHOA`;

    cartModal.classList.remove('active'); // Hide cart
    paymentModal.classList.add('active'); // Show QR
}

function closePaymentModal() {
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal) paymentModal.classList.remove('active');
    cartModal.classList.add('active'); // Back to cart
}
function openHistoryModal() {
    renderHistoryModal();
    historyModal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}
function closeHistoryModal() { 
    historyModal.classList.remove('active'); 
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}

function openOptionsModal(item) {
    currentOptionsItem = item;
    document.getElementById('options-modal-title').textContent = item.name;
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    item.options.forEach((opt, optIndex) => {
        const optName = opt.name || opt.optionName;
        const group = document.createElement('div');
        group.className = 'option-group mb-3';
        group.innerHTML = `<h3 style="font-size: 1.1rem; margin-bottom: 10px;">${optName}</h3>`;
        
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
            
            // Default to first choice if required (for radio)
            const isChecked = choiceIndex === 0 ? 'checked' : '';
            
            row.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <input type="radio" name="opt_${optIndex}" value="${choiceName}" data-price="${choice.priceExtra}" ${isChecked} style="accent-color: var(--primary);">
                    <span>${choiceName}</span>
                </div>
                <span class="text-muted">${choice.priceExtra > 0 ? '+' + choice.priceExtra.toLocaleString('vi-VN') + ' đ' : ''}</span>
            `;
            group.appendChild(row);
        });
        container.appendChild(group);
    });
    
    optionsModal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}

function closeOptionsModal() { 
    optionsModal.classList.remove('active'); 
    currentOptionsItem = null;
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}

// Event Listeners
function attachEventListeners() {
    // Category filtering
    categoryPills.forEach(pill => {
        pill.addEventListener('click', (e) => {
            document.querySelector('.pill.active').classList.remove('active');
            e.target.classList.add('active');
            renderMenu(e.target.dataset.category);
        });
    });

    viewCartBtn.addEventListener('click', openModal);
    closeModalBtn.addEventListener('click', closeModal);
    myOrdersBtn.addEventListener('click', openHistoryModal);
    closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
    closeOptionsBtn.addEventListener('click', closeOptionsModal);

    // Search input listener
    document.getElementById('menu-search').addEventListener('input', () => {
        const activeCategory = document.querySelector('.pill.active').dataset.category;
        renderMenu(activeCategory);
    });

    // Language Toggle
    document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);
    
    confirmOptionsBtn.addEventListener('click', () => {
        if (!currentOptionsItem) return;
        
        const selectedOptions = [];
        const container = document.getElementById('options-container');
        currentOptionsItem.options.forEach((opt, optIndex) => {
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
        
        const cartKey = generateCartKey(currentOptionsItem._id, selectedOptions);
        handleCartUpdate(cartKey, currentOptionsItem, 1, selectedOptions);
        closeOptionsModal();
    });

    // Listeners for new Payment Modal
    const btnClosePayment = document.getElementById('close-payment-modal');
    if (btnClosePayment) btnClosePayment.addEventListener('click', closePaymentModal);

    const btnConfirmPayment = document.getElementById('confirm-payment-btn');
    if (btnConfirmPayment) {
        btnConfirmPayment.addEventListener('click', () => {
            btnConfirmPayment.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác nhận...';
            btnConfirmPayment.disabled = true;
            if (activeOrderId && currentPaymentMethod === 'transfer') {
                // Customer manually confirms transfer fallback
                supabase.from('orders').update({ payment_status: 'paid' }).eq('id', activeOrderId).then(() => {
                    const orderToConfirm = sessionOrders.find(o => o.id === activeOrderId || o._id === activeOrderId) || sessionOrders[0];
                    handleOrderConfirmed(orderToConfirm);
                });
            } else {
                placeOrder('transfer');
            }
        });
    }

    if(checkoutCashBtn) {
        checkoutCashBtn.addEventListener('click', () => {
            checkoutCashBtn.disabled = true;
            checkoutCashBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xử lý...';
            if (checkoutTransferBtn) checkoutTransferBtn.disabled = true;
            placeOrder('cash');
        });
    }
    
    if(checkoutTransferBtn) {
        checkoutTransferBtn.addEventListener('click', () => {
            checkoutTransferBtn.disabled = true;
            checkoutTransferBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang tạo mã QR...';
            if (checkoutCashBtn) checkoutCashBtn.disabled = true;
            placeOrder('transfer');
        });
    }

}

// Setup Supabase Realtime Subscription
function setupRealtimeSubscription() {
    supabase
      .channel('customer-orders')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `session_id=eq.${sessionId}` }, payload => {
          const updatedOrder = payload.new;
          const currentInSession = sessionOrders.find(o => o.id === updatedOrder.id || o._id === updatedOrder.id);
          
          if (currentInSession) {
              if (currentInSession.payment_status === 'unpaid' && updatedOrder.payment_status === 'paid' && currentPaymentMethod === 'transfer') {
                  const paymentModal = document.getElementById('payment-modal');
                  if (paymentModal && paymentModal.classList.contains('active')) {
                       const btnConfirmPayment = document.getElementById('confirm-payment-btn');
                       if(btnConfirmPayment) {
                           btnConfirmPayment.innerHTML = '<i class="fa-solid fa-check-double"></i> Thanh toán thành công!';
                           btnConfirmPayment.classList.replace('btn-primary', 'btn-success');
                       }
                       setTimeout(() => {
                           handleOrderConfirmed({ ...updatedOrder, _id: updatedOrder.id, createdAt: updatedOrder.created_at, totalPrice: updatedOrder.total_price, orderNote: updatedOrder.order_note });
                       }, 1500);
                  }
              }
              currentInSession.payment_status = updatedOrder.payment_status;
              currentInSession.status = updatedOrder.status;
              currentInSession.is_paid = updatedOrder.is_paid;
              
              const currentId = updatedOrder.id || updatedOrder._id;
              if (trackedOrderId === currentId) {
                  let statusText = statusMap[updatedOrder.status] ? statusMap[updatedOrder.status].text : updatedOrder.status;
                  let statusClass = statusMap[updatedOrder.status] ? statusMap[updatedOrder.status].class : 'text-primary';
                  let statusColor = (statusMap[updatedOrder.status] && statusMap[updatedOrder.status].color) ? statusMap[updatedOrder.status].color : '';

                  if (updatedOrder.status === 'Pending') {
                      if (!updatedOrder.is_paid) {
                          statusText = 'Chưa thanh toán (Chờ xác nhận)';
                          statusClass = 'text-danger font-bold';
                          statusColor = '#e74c3c';
                      } else {
                          statusText = 'Đã thanh toán (Chờ bếp làm)';
                          statusClass = 'text-primary font-bold';
                          statusColor = '#3498db';
                      }
                  }
                  
                  if (liveStatus) {
                      liveStatus.textContent = statusText;
                      liveStatus.className = statusClass;
                      if (statusColor) liveStatus.style.color = statusColor;
                  }
              }
          }
          
          // Call global handleOrderStatusUpdate if exists
          if (typeof handleOrderStatusUpdate === 'function') {
              handleOrderStatusUpdate(updatedOrder);
          }
      })
      .subscribe();
}

let currentPaymentMethod = 'cash';

// Supabase Communication
async function placeOrder(method = 'cash') {
    currentPaymentMethod = method;
    const subtotal = cart.reduce((sum, item) => {
        const itemOptionsPrice = (item.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0);
        return sum + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);
    
    const totalPrice = subtotal - currentDiscountAmount;
    
    // Format items for DB schema
    const formattedItems = cart.map(item => ({
        productId: item._id || item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        selectedOptions: item.selectedOptions || []
    }));

    const orderNote = document.getElementById('order-note') ? document.getElementById('order-note').value : '';
    const earnedPts = Math.floor(Math.max(0, totalPrice) / 1000);

    const orderData = {
        table_number: TABLE_NUMBER.toString(),
        session_id: sessionId,
        customer_phone: window.currentCustomerPhone,
        earned_points: earnedPts,
        items: formattedItems,
        total_price: Math.max(0, totalPrice),
        discount_code: appliedPromo ? appliedPromo.code : null,
        discount_amount: currentDiscountAmount,
        order_note: orderNote,
        is_paid: false,
        status: 'Pending',
        payment_method: method,
        payment_status: 'unpaid'
    };

    try {
        const { data, error } = await supabase.from('orders').insert([orderData]).select().single();
        if (error) throw error;
        
        const savedOrder = { ...data, _id: data.id, createdAt: data.created_at, totalPrice: data.total_price, orderNote: data.order_note };
        
        if (method === 'transfer') {
            activeOrderId = savedOrder._id;
            trackedOrderId = savedOrder._id;
            sessionOrders.unshift(savedOrder);
            
            cart = [];
            appliedPromo = null;
            currentDiscountAmount = 0;
            if(document.getElementById('promo-code-input')) document.getElementById('promo-code-input').value = '';
            if(document.getElementById('promo-message')) document.getElementById('promo-message').style.display = 'none';
            updateCartUI();
            
            openPaymentModal(savedOrder);
        } else {
            handleOrderConfirmed(savedOrder);
        }
        
        // Deduct points virtually if they used loyalty promo
        if (window.loyaltyDiscountApplied && window.currentCustomerPhone) {
            supabase.from('customers').select('id, current_points').eq('phone', window.currentCustomerPhone).maybeSingle().then(({data: cust}) => {
                if (cust) {
                    supabase.from('customers').update({ current_points: Math.max(0, cust.current_points - 100) }).eq('id', cust.id).then(() => {
                        supabase.from('point_logs').insert([{
                            customer_id: cust.id,
                            amount: -100,
                            reason: 'Đổi 100 điểm lấy 10.000đ giảm giá cho đơn ' + savedOrder._id.substring(0,8)
                        }]).then();
                    });
                }
            });
        }
        
        // Increment discount used_count
        if (orderData.discount_code && orderData.discount_code !== 'LOYALTY_100' && !orderData.discount_code.startsWith('VIP ')) {
            supabase.from('discounts').select('id, used_count').eq('code', orderData.discount_code).maybeSingle().then(({data: dData}) => {
                if (dData) {
                    supabase.from('discounts').update({ used_count: (dData.used_count || 0) + 1 }).eq('id', dData.id).then();
                }
            });
        }
    } catch (error) {
        console.error("placeOrder ERROR:", error);
        
        // Ngay lập tức Reset UI Buttons để tránh treo
        const btnConfirmPayment = document.getElementById('confirm-payment-btn');
        if (btnConfirmPayment) {
            btnConfirmPayment.innerHTML = '<i class="fa-solid fa-check-circle"></i> Tôi đã chuyển khoản xong';
            btnConfirmPayment.disabled = false;
        }
        if(checkoutCashBtn) {
            checkoutCashBtn.disabled = false;
            checkoutCashBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Thanh toán tại quầy';
        }
        if(checkoutTransferBtn) {
            checkoutTransferBtn.disabled = false;
            checkoutTransferBtn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Chuyển khoản (Duyệt TĐ)';
        }

        // Hiển thị lỗi chi tiết để debug
        const errDetail = error.message || JSON.stringify(error) || 'Lỗi không xác định';
        alert('Xin lỗi, không thể tạo đơn hàng! Mã lỗi: ' + errDetail);
        
        fetchMenu();
    }
}

// Handle confirm after insert
function handleOrderConfirmed(savedOrder) {
    savedOrder._id = savedOrder.id || savedOrder._id; // Compatibility
    cart = [];
    appliedPromo = null;
    currentDiscountAmount = 0;
    if(document.getElementById('promo-code-input')) document.getElementById('promo-code-input').value = '';
    if(document.getElementById('promo-message')) document.getElementById('promo-message').style.display = 'none';
    
    updateCartUI();
    closeModal();
    const paymentModal = document.getElementById('payment-modal');
    if (paymentModal) paymentModal.classList.remove('active');
    
    // Reset payment button state
    const btnConfirmPayment = document.getElementById('confirm-payment-btn');
    if (btnConfirmPayment) {
        btnConfirmPayment.innerHTML = '<i class="fa-solid fa-check-circle"></i> Tôi đã chuyển khoản xong';
        btnConfirmPayment.disabled = false;
        btnConfirmPayment.classList.replace('btn-success', 'btn-primary');
    }
    
    if(checkoutCashBtn) {
        checkoutCashBtn.disabled = false;
        checkoutCashBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Thanh toán tại quầy';
    }
    if(checkoutTransferBtn) {
        checkoutTransferBtn.disabled = false;
        checkoutTransferBtn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Chuyển khoản (Duyệt TĐ)';
    }
    
    // Add to session history if not already there
    if (!sessionOrders.find(o => o.id === savedOrder._id || o._id === savedOrder._id)) {
        sessionOrders.unshift(savedOrder);
    }
    
    // Convert to Tracking Banner
    activeOrderId = savedOrder._id;
    trackedOrderId = savedOrder._id;
    liveOrderBanner.style.display = 'block';
    
    // Reset Timeline
    document.getElementById('live-status').textContent = 'Chưa thanh toán';
    document.getElementById('live-status').className = 'text-danger banner-status';
    document.getElementById('live-status').style.color = '#e74c3c';
    document.querySelectorAll('.timeline-step').forEach(el => el.className = 'timeline-step');
    document.querySelectorAll('.timeline-line').forEach(el => el.className = 'timeline-line');
    document.getElementById('step-pending').classList.add('active');
    
    // Re-render menu so that the '+' buttons get locked out
    const activeCategory = document.querySelector('.pill.active').dataset.category;
    renderMenu(activeCategory);
}

// User Action: Call Staff
async function requestStaffService(type) {
    // Prevent spamming
    if (localStorage.getItem(`last_req_${type}_${sessionId}`)) {
        const lastCall = new Date(localStorage.getItem(`last_req_${type}_${sessionId}`));
        if ((new Date() - lastCall) < 60000) {
            await customerAlert("Vui lòng đợi một lát trước khi gửi yêu cầu mới.");
            return;
        }
    }

    try {
        const { error } = await supabase.from('staff_requests').insert([{
            table_number: TABLE_NUMBER.toString(),
            session_id: sessionId,
            request_type: type,
            status: 'Pending'
        }]);

        if (error) throw error;
        
        localStorage.setItem(`last_req_${type}_${sessionId}`, new Date().toISOString());
        
        let msg = "Đã gọi nhân viên hỗ trợ.";
        if (type === 'water') msg = "Đã gửi yêu cầu thêm nước lọc.";
        if (type === 'checkout') msg = "Đã gửi yêu cầu thanh toán.";
        
        await customerAlert(msg);
        
    } catch (e) {
        console.error("Staff Request Error:", e);
        await customerAlert("Chưa thể gửi yêu cầu. Vui lòng thử lại.");
    }
}

// Custom confirm for customer page (avoid native confirm() which can be blocked)
let customerConfirmModalInstance = null;
function customerConfirm(message) {
    return new Promise((resolve) => {
        if (!customerConfirmModalInstance) {
            customerConfirmModalInstance = new bootstrap.Modal(document.getElementById('confirmModal'));
        }
        document.getElementById('confirmModalBody').textContent = message;

        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');
        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        document.getElementById('confirmModalOk').addEventListener('click', () => {
            customerConfirmModalInstance.hide();
            resolve(true);
        }, { once: true });
        document.getElementById('confirmModalCancel').addEventListener('click', () => {
            resolve(false);
        }, { once: true });
        document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
            resolve(false);
        }, { once: true });

        customerConfirmModalInstance.show();
    });
}

// Custom alert for mobile friendliness
function customerAlert(message) {
    return new Promise((resolve) => {
        if (!customerConfirmModalInstance) {
            customerConfirmModalInstance = new bootstrap.Modal(document.getElementById('confirmModal'));
        }
        document.getElementById('confirmModalBody').textContent = message;
        
        const titleEl = document.getElementById('confirmModalTitle');
        const prevTitleHTML = titleEl.innerHTML;
        titleEl.innerHTML = '<i class="fa-solid fa-circle-info text-primary me-2"></i>Thông báo';

        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');
        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newOk.className = 'btn btn-primary btn-sm';
        newOk.textContent = 'Đóng';
        newCancel.style.display = 'none';

        const cleanup = () => {
            newOk.className = 'btn btn-danger btn-sm';
            newOk.textContent = 'Có, xác nhận';
            newCancel.style.display = 'inline-block';
            titleEl.innerHTML = prevTitleHTML;
            resolve(true);
        };

        document.getElementById('confirmModalOk').addEventListener('click', () => {
            customerConfirmModalInstance.hide();
            cleanup();
        }, { once: true });
        
        document.getElementById('confirmModal').addEventListener('hidden.bs.modal', () => {
            cleanup();
        }, { once: true });

        customerConfirmModalInstance.show();
    });
}

// Cancel Order
window.cancelOrder = async (orderId) => {
    const confirmed = await customerConfirm('Bạn có chắc chắn muốn hủy đơn hàng này?');
    if (confirmed) {
        try {
            const { error } = await supabase.from('orders').update({ status: 'Cancelled' }).eq('id', orderId);
            if (error) throw error;
        } catch (e) {
             console.error("Cancel order error", e);
             await customerAlert("Lỗi khi hủy đơn hàng.");
        }
    }
};

// Handle real-time updates from Supabase
function handleOrderStatusUpdate(updatedOrderData) {
    const updatedOrder = {
        ...updatedOrderData, 
        _id: updatedOrderData.id, 
        createdAt: updatedOrderData.created_at,
        totalPrice: updatedOrderData.total_price,
        orderNote: updatedOrderData.order_note
    }; // Compat

    // Update local history
    const histIdx = sessionOrders.findIndex(o => o._id === updatedOrder._id);
    if(histIdx > -1) {
        sessionOrders[histIdx] = updatedOrder;
        // Rerender history modal if it's open
        const histModalRef = document.getElementById('order-history-modal');
        if(histModalRef && histModalRef.classList.contains('active')) {
            renderHistoryModal();
        }
    }

    // Play notification sound
    const playNotificationSound = (type) => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            
            if (type === 'success') {
                osc.type = 'sine';
                osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
                osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.1); // E5
                gain.gain.setValueAtTime(0, audioCtx.currentTime);
                gain.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
                gain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.3);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.3);
            } else if (type === 'error') {
                osc.type = 'sawtooth';
                osc.frequency.setValueAtTime(150, audioCtx.currentTime);
                osc.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.3);
                gain.gain.setValueAtTime(0.5, audioCtx.currentTime);
                gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                osc.start(audioCtx.currentTime);
                osc.stop(audioCtx.currentTime + 0.3);
            }
        } catch(e) {}
    };

    // Global notifications for this session's orders
    if (updatedOrder.status === 'Cancelled') {
        playNotificationSound('error');
        customerAlert(`❌ Đơn hàng của bạn đã bị Hủy. Bạn có thể đặt món mới!`);
        // Re-render menu to ensure UI is active
        const activeCategory = document.querySelector('.pill.active').dataset.category;
        renderMenu(activeCategory);
    } else if (updatedOrder.status === 'Ready') {
        playNotificationSound('success');
    }

    // Check if this update belongs to the current user's active tracked banner
    if (trackedOrderId === updatedOrder._id) {
        const liveStatusEl = document.getElementById('live-status');
        if (!liveStatusEl) return;
        
        // Sync Payment status immediately if pending
        if (updatedOrder.status === 'Pending') {
            if (updatedOrder.is_paid) {
                liveStatusEl.textContent = 'Đã thanh toán (Chờ bếp làm)';
                liveStatusEl.className = 'text-primary font-bold banner-status';
                liveStatusEl.style.color = '#3498db';
            } else {
                liveStatusEl.textContent = 'Chưa thanh toán (Chờ xác nhận)';
                liveStatusEl.className = 'text-danger font-bold banner-status';
                liveStatusEl.style.color = '#e74c3c';
            }
        }
        
        // Color coding based on status
        if (updatedOrder.status === 'Preparing') {
            liveStatusEl.textContent = 'Đang làm';
            liveStatusEl.className = 'text-warning banner-status';
            
            // Update timeline
            document.getElementById('step-pending').classList.replace('active', 'completed');
            document.getElementById('line-1').classList.add('active');
            document.getElementById('step-preparing').classList.add('active');
            
            // User requested: Unlock the menu for a new order when it hits Preparing
            if (activeOrderId === updatedOrder._id) {
                activeOrderId = null;
                playNotificationSound('success');
                customerAlert(`Bếp đã nhận đơn và đang làm món! Bạn có thể tiếp tục đặt thêm.`);
                const activeCategory = document.querySelector('.pill.active').dataset.category;
                renderMenu(activeCategory);
            }
            
        } else if (updatedOrder.status === 'Ready') {
            liveStatusEl.textContent = 'Đã xong';
            liveStatusEl.className = 'text-success banner-status';
            
            // Update timeline
            document.getElementById('step-preparing').classList.replace('active', 'completed');
            document.getElementById('line-1').classList.add('completed');
            document.getElementById('line-2').classList.add('active');
            document.getElementById('step-ready').classList.add('active');
            
        } else if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
            if (activeOrderId === updatedOrder._id) {
                activeOrderId = null;
            }
            if (trackedOrderId === updatedOrder._id) {
                if(updatedOrder.status === 'Completed') {
                    liveStatusEl.textContent = 'Hoàn thành';
                    liveStatusEl.className = 'text-muted banner-status';
                    
                    document.getElementById('step-ready').classList.replace('active', 'completed');
                    document.getElementById('line-2').classList.add('completed');
                    
                    const bannerContent = document.querySelector('#live-order-banner .banner-content');
                    if (!bannerContent.querySelector('.feedback-btn-container')) {
                        const feedbackHtml = `
                            <div class="feedback-btn-container mt-3" style="display: flex; gap: 8px; justify-content: center; width: 100%;">
                                <button class="btn btn-sm btn-primary" onclick="currentFeedbackOrderId='${updatedOrder._id}'; if(feedbackModal) feedbackModal.show()" style="flex: 1;"><i class="fa-solid fa-star me-2"></i>Đánh giá Trải nghiệm</button>
                            </div>
                        `;
                        bannerContent.insertAdjacentHTML('beforeend', feedbackHtml);
                    }
                    currentFeedbackOrderId = updatedOrder._id;
                    checkAndShowFeedback(updatedOrder);
                } else {
                    trackedOrderId = null;
                    liveOrderBanner.style.display = 'none';
                }
            }
        }
    }
}

// Options state for currently viewed item
let currentOptionsItem = null;

// Add to Cart Logic
window.updateCart = (productIdOrCartKey, change) => {
    // If we're adding from the menu (using raw productId)
    if (!productIdOrCartKey.includes('|')) {
        const item = menuItems.find(i => i._id === productIdOrCartKey);
        if(!item) return;
        
        // If adding and item has options, show modal instead of adding directly
        if (change > 0 && item.options && item.options.length > 0) {
            openOptionsModal(item);
            return;
        }
        
        // Otherwise, it's a simple item with no options, so cartKey is just the ID
        handleCartUpdate(productIdOrCartKey, item, change, []);
    } else {
        // If updating from cart (using cartKey)
        const cartItem = cart.find(c => c.cartKey === productIdOrCartKey);
        if(!cartItem && change < 0) return;
        
        const item = menuItems.find(i => i._id === (cartItem ? cartItem._id : productIdOrCartKey.split('|')[0]));
        handleCartUpdate(productIdOrCartKey, item, change, cartItem ? cartItem.selectedOptions : []);
    }
};

function handleCartUpdate(cartKey, baseItem, change, selectedOptions) {
    const existingIndex = cart.findIndex(c => c.cartKey === cartKey);
    
    if (existingIndex > -1) {
        const newQty = cart[existingIndex].quantity + change;
        if (newQty <= 0) {
            cart.splice(existingIndex, 1);
        } else {
            cart[existingIndex].quantity = newQty;
        }
    } else if (change > 0) {
        cart.push({ 
            ...baseItem, 
            cartKey: cartKey,
            quantity: 1,
            selectedOptions: selectedOptions
        });
    } else if (change < 0) {
        // If user clicks minus on the product ID (not a specific cart key)
        // Remove the LAST added instance of this product from the cart
        for(let i = cart.length - 1; i >= 0; i--) {
            if(cart[i]._id === baseItem._id) {
                if(cart[i].quantity > 1) {
                    cart[i].quantity--;
                } else {
                    cart.splice(i, 1);
                }
                break;
            }
        }
    }

    updateCartUI();
    const activeCategory = document.querySelector('.pill.active').dataset.category;
    renderMenu(activeCategory);

    // Upsell popup logic
    if (change > 0 && !window.upsellShown) {
        const hasDrink = cart.some(c => c.category === 'Coffee' || c.category === 'Tea');
        const hasCroissant = cart.some(c => c.name.includes('Sừng Trâu') || c.name.toLowerCase().includes('croissant'));
        if (hasDrink && !hasCroissant) {
            window.upsellShown = true;
            const um = document.getElementById('upsell-modal');
            if (um) um.classList.add('active');
        }
    }
}

// --- Loyalty & Upsell Functions ---

function getVipTier(totalSpent) {
    if (totalSpent >= 5000000) return { name: 'DIAMOND', pct: 15, class: 'tier-diamond', icon: '💎' };
    if (totalSpent >= 2000000) return { name: 'GOLD', pct: 10, class: 'tier-gold', icon: '👑' };
    if (totalSpent >= 500000) return { name: 'SILVER', pct: 5, class: 'tier-silver', icon: '🥈' };
    return { name: 'BRONZE', pct: 0, class: 'tier-bronze', icon: '🥉' };
}
async function verifyCustomerPhone() {
    const phoneInput = document.getElementById('customer-phone-input').value.trim();
    const msg = document.getElementById('loyalty-message');
    const discountBtn = document.getElementById('loyalty-discount-btn');
    
    if (!phoneInput || !phoneInput.match(/^[0-9]{9,11}$/)) {
        msg.textContent = 'Số điện thoại không hợp lệ!';
        msg.style.display = 'block';
        msg.style.color = 'var(--danger)';
        return;
    }
    
    msg.style.color = '#d35400';
    msg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...';
    msg.style.display = 'block';
    
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('phone', phoneInput).maybeSingle();
        if (error) throw error;
        
        window.currentCustomerPhone = phoneInput;
        
        if (data) {
            window.currentCustomerPoints = data.current_points || 0;
            
            // Render Holographic VIP Card
            const vip = getVipTier(data.total_spent || 0);
            const cardEl = document.getElementById('vip-card-el');
            cardEl.className = `vip-card ${vip.class}`;
            document.getElementById('vip-card-name').textContent = data.name || 'Thành Viên';
            document.getElementById('vip-card-tier-text').textContent = vip.name;
            document.getElementById('vip-card-tier-icon').textContent = vip.icon;
            document.getElementById('vip-card-discount').textContent = `Ưu đãi giảm ${vip.pct}%`;
            document.getElementById('vip-card-container').style.display = 'block';

            if (vip.pct > 0) {
                // Auto Apply VIP Promo
                appliedPromo = { code: `VIP ${vip.name}`, discountType: 'PERCENT', value: vip.pct };
                updateCartUI();
                msg.textContent = `Thẻ VIP tự động giảm ${vip.pct}%!`;
                msg.style.display = 'block';
                msg.style.color = 'var(--success)';
            } else {
                msg.innerHTML = `<i class="fa-solid fa-check-circle"></i> SĐT hợp lệ. Bạn đang có <strong>${window.currentCustomerPoints} điểm</strong>.`;
                msg.style.display = 'block';
            }

            // Exchanger logic
            if (window.currentCustomerPoints >= 100 && !window.loyaltyDiscountApplied) {
                discountBtn.style.display = 'block';
            } else {
                discountBtn.style.display = 'none';
            }
        } else {
            window.currentCustomerPoints = 0;
            document.getElementById('vip-card-container').style.display = 'none';
            msg.innerHTML = `<i class="fa-solid fa-star"></i> SĐT mới! Bạn sẽ đổi hạng thành viên sau khi thanh toán đơn này.`;
            msg.style.display = 'block';
            discountBtn.style.display = 'none';
        }
    } catch (e) {
        msg.textContent = 'Lỗi hệ thống: ' + e.message;
        msg.style.color = 'var(--danger)';
    }
}

window.verifyCustomerPhone = verifyCustomerPhone;

window.applyLoyaltyPoints = function() {
    if (window.currentCustomerPoints >= 100 && !window.loyaltyDiscountApplied) {
        window.currentCustomerPoints -= 100;
        window.loyaltyDiscountApplied = true;
        document.getElementById('loyalty-discount-btn').style.display = 'none';
        document.getElementById('loyalty-message').innerHTML = '<i class="fa-solid fa-check-circle"></i> Đã dùng 100 điểm để đổi Voucher Giảm 10.000đ!';
        
        appliedPromo = { code: 'LOYALTY_100', discountType: 'FIXED', value: 10000 };
        updateCartUI(); 
    }
}

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
    closeUpsellModal();
}

// Generate unique cart key based on options
function generateCartKey(productId, selectedOptions) {
    if (!selectedOptions || selectedOptions.length === 0) return productId;
    const optString = selectedOptions.map(o => `${o.optionName}:${o.choiceName}`).sort().join('|');
    return `${productId}|${optString}`;
}
// Order error handling moved to Supabase inline try/catch in placeOrder()

// Render History Modal
function renderHistoryModal() {
    if (sessionOrders.length === 0) {
        historyItemsContainer.innerHTML = '<div class="empty-cart text-center text-muted mt-4">Bạn chưa đặt đơn hàng nào trong phiên này.</div>';
        return;
    }

    historyItemsContainer.innerHTML = '';
    sessionOrders.forEach(order => {
        const orderTime = new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
        
        let itemsHtml = order.items.map(i => `
            <li style="display: flex; justify-content: space-between; font-size: 0.9rem; padding: 4px 0; border-bottom: 1px dashed var(--border);">
                <div>
                    <div>${i.quantity}x ${i.name}</div>
                    ${i.selectedOptions && i.selectedOptions.length > 0 ? 
                        `<div style="font-size: 0.75rem; color: #888; padding-left: 15px;">+${i.selectedOptions.map(o => o.choiceName).join(', +')}</div>` 
                        : ''}
                </div>
                <span>${((i.price + (i.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0)) * i.quantity).toLocaleString('vi-VN')} đ</span>
            </li>
        `).join('');

        const stAttr = statusMap[order.status] || { text: order.status, class: 'text-muted' };

        const card = document.createElement('div');
        card.className = 'order-card';
        card.style.marginBottom = '16px';
        card.style.borderLeftColor = stAttr.color || (order.status === 'Cancelled' ? 'var(--danger)' : order.status === 'Completed' ? '#8b949e' : 'var(--primary)');
        card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <span class="order-time"><i class="fa-regular fa-clock"></i> ${orderTime}</span>
                <span style="${stAttr.color ? "color: " + stAttr.color + ";" : ""}" class="${stAttr.class}">${stAttr.text}</span>
            </div>
            <ul style="list-style: none; padding: 0; margin-bottom: 12px;">
                ${itemsHtml}
            </ul>
            <div style="text-align: right; font-weight: 700; color: var(--primary);">
                Tổng: ${order.totalPrice.toLocaleString('vi-VN')} đ
            </div>
            ${order.orderNote ? `<div class="mt-2 text-muted" style="font-size: 0.85rem; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;"><i>Ghi chú: ${order.orderNote}</i></div>` : ''}
            ${order.status === 'Pending' ? `<div style="text-align: right; margin-top: 10px;"><button class="btn btn-sm btn-outline text-danger" style="border-color: var(--danger);" onclick="cancelOrder('${order._id}')">Hủy đơn</button></div>` : ''}
        `;
        historyItemsContainer.appendChild(card);
    });
}

// Boot


async function applyPromo() {
    const codeInput = document.getElementById('promo-code-input');
    const msgEl = document.getElementById('promo-message');
    const btn = document.getElementById('apply-promo-btn');
    if(!codeInput || !msgEl) return;
    
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code) {
        appliedPromo = null;
        msgEl.style.display = 'none';
        updateCartUI();
        return;
    }
    
    const subtotal = cart.reduce((sum, item) => {
        const itemOptionsPrice = (item.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0);
        return sum + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);

    msgEl.style.display = 'block';
    msgEl.className = 'text-primary mt-2';
    msgEl.textContent = 'Đang kiểm tra mã...';
    if(btn) btn.disabled = true;
    
    try {
        const { data: discount, error } = await supabase.from('discounts').select('*').eq('code', code).eq('active', true).maybeSingle();
        
        if(btn) btn.disabled = false;
        if (discount) {
            if (discount.usage_limit > 0 && (discount.used_count || 0) >= discount.usage_limit) {
                appliedPromo = null;
                msgEl.className = 'text-danger mt-2';
                msgEl.textContent = 'Mã khuyến mãi đã hết lượt sử dụng!';
                updateCartUI();
                return;
            }
            
            let discountAmount = 0;
            if (discount.discount_type === 'PERCENT') {
                discountAmount = (subtotal * discount.value) / 100;
            } else if (discount.discount_type === 'FIXED') {
                discountAmount = discount.value;
            }
            if (discountAmount > subtotal) discountAmount = subtotal;

            appliedPromo = {
                code: discount.code,
                discountType: discount.discount_type,
                value: discount.value,
                discountAmount: discountAmount
            };
            
            msgEl.className = 'text-success mt-2 font-bold';
            msgEl.textContent = `Áp dụng thành công! Giảm ${discountAmount.toLocaleString('vi-VN')} đ`;
            updateCartUI();
        } else {
            appliedPromo = null;
            msgEl.className = 'text-danger mt-2';
            msgEl.textContent = 'Mã không hợp lệ hoặc đã hết hạn';
            updateCartUI();
        }
    } catch (e) {
        if(btn) btn.disabled = false;
        appliedPromo = null;
        msgEl.className = 'text-danger mt-2';
        msgEl.textContent = 'Lỗi kết nối máy chủ';
        updateCartUI();
    }
}

// --- Feedback Logic ---
let selectedRating = 0;
const feedbackModal = (typeof bootstrap !== 'undefined' && document.getElementById('feedbackModal')) 
    ? new bootstrap.Modal(document.getElementById('feedbackModal')) 
    : null;

document.querySelectorAll('.star-btn').forEach(star => {
    star.addEventListener('mouseover', function() {
        highlightStars(parseInt(this.getAttribute('data-value')));
    });
    star.addEventListener('mouseleave', function() {
        highlightStars(selectedRating);
    });
    star.addEventListener('click', function() {
        selectedRating = parseInt(this.getAttribute('data-value'));
        highlightStars(selectedRating);
    });
});

function highlightStars(count) {
    document.querySelectorAll('.star-btn').forEach(star => {
        const val = parseInt(star.getAttribute('data-value'));
        if (val <= count) {
            star.classList.replace('fa-regular', 'fa-solid');
            star.classList.add('text-gold');
        } else {
            star.classList.replace('fa-solid', 'fa-regular');
            star.classList.remove('text-gold');
        }
    });
}

window.submitFeedback = async () => {
    if (selectedRating === 0) {
        await customerAlert("Vui lòng chọn số sao đánh giá!");
        return;
    }
    const comment = document.getElementById('feedback-comment').value;
    const btn = document.getElementById('submit-feedback-btn');
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang gửi...';
        
        // Submit Feedback to Supabase
        const feedbackData = {
            order_id: currentFeedbackOrderId, 
            rating: selectedRating,
            comment: comment,
            table_number: TABLE_NUMBER.toString()
        };
        
        try {
            const { error } = await supabase.from('feedback').insert([feedbackData]);
            if (error) throw error;
            
            if(feedbackModal) feedbackModal.hide();
            await customerAlert('Cảm ơn bạn đã đánh giá!');
            fetchMenu();
        } catch (error) {
            console.error(error);
            await customerAlert('Có lỗi xảy ra khi gửi đánh giá.');
        }
        selectedRating = 0;
        highlightStars(0);
        document.getElementById('feedback-comment').value = '';
    } catch (e) {
        console.error("Feedback error:", e);
    } finally {
        btn.disabled = false;
        btn.innerHTML = 'Gửi đánh giá';
    }
}

// Auto-show feedback on completed
function checkAndShowFeedback(updatedOrder) {
    if (updatedOrder.status === 'Completed') {
        // Check local sessionOrders array instead of sessionStorage
        if (sessionOrders.some(o => o._id === updatedOrder._id)) {
            setTimeout(() => {
                if(feedbackModal) {
                    // Check if already shown to avoid double prompting
                    if (!document.getElementById('feedbackModal').classList.contains('show')) {
                        feedbackModal.show();
                    }
                }
            }, 3000);
        }
    }
}

// --- Language Support ---
function toggleLanguage() {
    currentLang = currentLang === 'VI' ? 'EN' : 'VI';
    document.getElementById('lang-toggle').innerText = currentLang === 'VI' ? 'EN' : 'VI';
    applyTranslations();
}


function applyTranslations() {
    const t = translations[currentLang];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if (el.tagName === 'INPUT') el.placeholder = t[key];
            else el.innerHTML = t[key];
        }
    });

    // Update search placeholder manually
    document.getElementById('menu-search').placeholder = t.search_placeholder;
    
    // Refresh menu to update dynamic labels
    const activeCategory = document.querySelector('.pill.active').dataset.category;
    renderMenu(activeCategory);
}

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    });
}

// --- Staff Requests ---
window.requestStaffService = async function(type) {
    const messages = {
        'staff': 'Bạn muốn gọi nhân viên phục vụ?',
        'water': 'Bạn muốn yêu cầu thêm nước lọc?',
        'checkout': 'Bạn muốn yêu cầu tính tiền?'
    };
    
    const dbTypes = {
        'staff': 'staff',
        'water': 'staff', // map water to staff
        'checkout': 'bill'
    };
    
    if (!TABLE_NUMBER) {
        await customerAlert("Không xác định được số bàn!");
        return;
    }

    const confirmed = await customerConfirm(messages[type] || 'Bạn có chắc chắn?');
    if (!confirmed) return;
    
    try {
        const { error } = await supabase.from('staff_requests').insert([{
            table_number: TABLE_NUMBER,
            type: dbTypes[type] || 'staff',
            status: 'pending'
        }]);
        if (error) throw error;
        
        const successMsgs = {
             'staff': 'Đã gửi yêu cầu nhân viên!',
             'water': 'Đã yêu cầu thêm nước rọc. NV sẽ lấy ngay!',
             'checkout': 'Đã yêu cầu thanh toán!'
        };
        await customerAlert(successMsgs[type] || "Yêu cầu đã được gửi!");
    } catch(e) {
        console.error(e);
        await customerAlert(`Lỗi: ${e.message || JSON.stringify(e)}`);
    }
};

// Start the app
init();
