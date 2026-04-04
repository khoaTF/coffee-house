// =============================================
// DELIVERY.JS — Customer Delivery Ordering
// =============================================

let deliveryCart = [];
let deliveryProducts = [];
let storeConfig = {};
let selectedCategory = 'all';
let deliveryMap = null;
let deliveryMarker = null;
let storeMarker = null;
let selectedLat = null;
let selectedLng = null;
let calculatedFee = 0;
let calculatedDistance = 0;

// --- Init ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadStoreConfig();
    await loadMenu();
    
    // Restore cart from localStorage
    try {
        const saved = localStorage.getItem('nohope_delivery_cart');
        if (saved) {
            deliveryCart = JSON.parse(saved);
            renderCart();
        }
    } catch(e) {}
});

// --- Load Store Config ---
async function loadStoreConfig() {
    try {
        const { data } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
        if (data) {
            storeConfig = data;
            
            checkStoreHours(data);

            if (!data.delivery_enabled) {
                document.getElementById('delivery-status-badge').textContent = 'Tạm ngừng';
                document.getElementById('delivery-status-badge').closest('.flex').querySelector('.bg-green-400')?.classList.replace('bg-green-400', 'bg-red-400');
            } else {
                document.getElementById('delivery-status-badge').textContent = 'Đang nhận đơn';
                document.getElementById('delivery-status-badge').closest('.flex').querySelector('.bg-red-400')?.classList.replace('bg-red-400', 'bg-green-400');
            }
            if (data.delivery_base_fee) {
                document.getElementById('base-fee-display').textContent = formatVND(data.delivery_base_fee);
            }
        }
    } catch(e) {
        console.error('Error loading store config:', e);
    }
}

// --- Store Open Hours ---
function checkStoreHours(settings) {
    if (settings.is_open_override === true) { removeClosedOverlay(); return; }
    if (settings.is_open_override === false) { showClosedOverlay(settings.store_name || 'Quán', settings.open_time, settings.close_time); return; }

    const openTime = settings.open_time || '07:00';
    const closeTime = settings.close_time || '22:00';

    const now = new Date();
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    const isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    if (!isOpen) showClosedOverlay(settings.store_name || 'Quán', openTime, closeTime);
    else removeClosedOverlay();
}

function showClosedOverlay(storeName, openTime, closeTime) {
    let el = document.getElementById('store-closed-overlay');
    if (!el) {
        el = document.createElement('div');
        el.id = 'store-closed-overlay';
        el.style.cssText = `
            position:fixed; inset:0; z-index:9999; 
            background:rgba(0,0,0,0.85); backdrop-filter:blur(6px);
            display:flex; align-items:center; justify-content:center; flex-direction:column;
            text-align:center; padding:32px; animation:fadeIn 0.5s ease;
        `;
        const style = document.createElement('style');
        style.textContent = '@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }';
        document.head.appendChild(style);
        
        el.innerHTML = `
            <div style="max-width:360px;">
                <div style="font-size:4rem; margin-bottom:16px;">🌙</div>
                <h2 style="color:#fff;font-size:1.6rem;font-weight:800;margin-bottom:8px;">${storeName}</h2>
                <p style="color:#aaa;font-size:1rem;margin-bottom:4px;">Quán hiện đang đóng cửa</p>
                ${openTime ? `<p style="color:#C0A062;font-weight:700;font-size:1.1rem;margin-top:12px;">⏰ Mở cửa lúc ${openTime} – ${closeTime || '?'}</p>` : ''}
                <p style="color:#666;font-size:0.85rem;margin-top:16px;">Vui lòng quay lại trong giờ phục vụ</p>
            </div>
        `;
        document.body.appendChild(el);
    }
}

function removeClosedOverlay() {
    const el = document.getElementById('store-closed-overlay');
    if (el) el.remove();
}

// Realtime Store Config Update
supabase.channel('delivery-store-config')
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'store_settings' }, payload => {
        storeConfig = payload.new;
        checkStoreHours(storeConfig);
        
        if (!storeConfig.delivery_enabled) {
            document.getElementById('delivery-status-badge').textContent = 'Tạm ngừng';
            document.getElementById('delivery-status-badge').closest('.flex').querySelector('.bg-green-400')?.classList.replace('bg-green-400', 'bg-red-400');
            renderMenu();
        } else {
            document.getElementById('delivery-status-badge').textContent = 'Đang nhận đơn';
            document.getElementById('delivery-status-badge').closest('.flex').querySelector('.bg-red-400')?.classList.replace('bg-red-400', 'bg-green-400');
            renderMenu();
        }
        if (storeConfig.delivery_base_fee) {
            document.getElementById('base-fee-display').textContent = formatVND(storeConfig.delivery_base_fee);
        }
    })
    .subscribe();

// --- Load Menu ---
async function loadMenu() {
    try {
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .eq('is_available', true)
            .order('category')
            .order('name');
        
        if (error) throw error;
        deliveryProducts = data || [];
        
        renderCategories();
        renderMenu();
    } catch(e) {
        console.error('Error loading menu:', e);
        document.getElementById('delivery-menu').innerHTML = '<p class="text-center text-red-500 py-4">Lỗi tải thực đơn. Vui lòng tải lại trang.</p>';
    }
}

// --- Render Categories ---
function renderCategories() {
    const cats = [...new Set(deliveryProducts.map(p => p.category).filter(Boolean))];
    const container = document.getElementById('delivery-categories');
    
    let html = `<button onclick="filterCategory('all')" class="shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${selectedCategory === 'all' ? 'bg-[#994700] text-white' : 'bg-[#F6F3F2] dark:bg-[#1B1C1C] text-[#584235] dark:text-[#E0C0AF]'}">Tất cả</button>`;
    
    cats.forEach(cat => {
        const isActive = selectedCategory === cat;
        html += `<button onclick="filterCategory('${escapeAttr(cat)}')" class="shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-colors ${isActive ? 'bg-[#994700] text-white' : 'bg-[#F6F3F2] dark:bg-[#1B1C1C] text-[#584235] dark:text-[#E0C0AF]'}">${escapeHTML(cat)}</button>`;
    });
    
    container.innerHTML = html;
}

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function escapeAttr(str) {
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

window.filterCategory = function(cat) {
    selectedCategory = cat;
    renderCategories();
    renderMenu();
};

// --- Render Menu ---
function renderMenu() {
    const container = document.getElementById('delivery-menu');
    const search = (document.getElementById('delivery-search')?.value || '').toLowerCase();
    
    let filtered = deliveryProducts;
    if (selectedCategory !== 'all') {
        filtered = filtered.filter(p => p.category === selectedCategory);
    }
    if (search) {
        filtered = filtered.filter(p => p.name.toLowerCase().includes(search));
    }
    
    // Check if delivery is disabled
    if (storeConfig && storeConfig.delivery_enabled === false) {
        container.innerHTML = '<div class="col-span-full py-12 text-center text-[#584235] dark:text-[#E0C0AF]"><i class="fa-solid fa-store-slash text-4xl mb-3 opacity-50"></i><p class="font-bold">Quán đang tạm ngừng nhận đơn giao hàng</p><p class="text-sm opacity-70">Rất xin lỗi vì sự bất tiện này, bạn vui lòng quay lại sau nhé!</p></div>';
        const nextBtn = document.getElementById('btn-next-step2');
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    if (filtered.length === 0) {
        container.innerHTML = '<p class="text-center text-[#584235]/60 py-6 text-sm">Không có món nào.</p>';
        return;
    }
    
    container.innerHTML = filtered.map(p => {
        const inCart = deliveryCart.find(c => c.id === p.id);
        const qty = inCart ? inCart.quantity : 0;
        const price = getProductPrice(p);
        const hasPromo = p.promotional_price && p.promotional_price < p.price;
        
        return `
        <div class="menu-item-card flex gap-3 p-3 bg-[#F6F3F2] dark:bg-[#1B1C1C] rounded-xl">
            <img src="${p.image_url || 'https://placehold.co/100x100/2A1A14/F5EFE6?text=N'}" 
                 alt="${escapeHTML(p.name)}" 
                 class="w-20 h-20 rounded-xl object-cover shrink-0"
                 onerror="this.onerror=null;this.src='https://placehold.co/100x100/2A1A14/F5EFE6?text=N'">
            <div class="flex-1 min-w-0">
                <h4 class="font-bold text-sm truncate">${escapeHTML(p.name)}</h4>
                <p class="text-xs text-[#584235]/60 dark:text-[#E0C0AF]/60 truncate">${escapeHTML(p.description || p.category || '')}</p>
                <div class="flex items-center justify-between mt-2">
                    <div>
                        ${hasPromo ? `<span class="text-xs line-through text-[#584235]/40">${formatVND(p.price)}</span> ` : ''}
                        <span class="font-bold text-[#FF7A00]">${formatVND(price)}</span>
                    </div>
                    <div class="flex items-center gap-2">
                        ${qty > 0 ? `
                            <button class="item-qty-btn bg-[#F0EDEC] dark:bg-[#2A2B2B] text-[#994700]" onclick="updateCartQty('${p.id}', -1)">−</button>
                            <span class="font-bold text-sm w-6 text-center">${qty}</span>
                        ` : ''}
                        <button class="item-qty-btn bg-[#994700] text-white" onclick="addToDeliveryCart('${p.id}')">+</button>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');
}

// --- Search ---
document.getElementById('delivery-search')?.addEventListener('input', () => renderMenu());

// --- Cart Logic ---
function getProductPrice(p) {
    if (p.promotional_price && p.promotional_price < p.price) {
        const now = new Date();
        const start = p.promo_start_time ? new Date(p.promo_start_time) : null;
        const end = p.promo_end_time ? new Date(p.promo_end_time) : null;
        if ((!start || now >= start) && (!end || now <= end)) {
            return p.promotional_price;
        }
    }
    return p.price;
}

window.addToDeliveryCart = function(productId) {
    if (storeConfig && storeConfig.delivery_enabled === false) {
        showDeliveryToast('Quán hiện đang tạm ngừng nhận đơn.', 'error');
        return;
    }

    const product = deliveryProducts.find(p => p.id === productId);
    if (!product) return;
    
    const existing = deliveryCart.find(c => c.id === productId);
    if (existing) {
        existing.quantity++;
    } else {
        deliveryCart.push({
            id: product.id,
            name: product.name,
            price: getProductPrice(product),
            quantity: 1,
            image_url: product.image_url,
            recipe: product.recipe || []
        });
    }
    
    saveCart();
    renderCart();
    renderMenu();
};

window.updateCartQty = function(productId, delta) {
    const item = deliveryCart.find(c => c.id === productId);
    if (!item) return;
    
    item.quantity += delta;
    if (item.quantity <= 0) {
        deliveryCart = deliveryCart.filter(c => c.id !== productId);
    }
    
    saveCart();
    renderCart();
    renderMenu();
};

function saveCart() {
    localStorage.setItem('nohope_delivery_cart', JSON.stringify(deliveryCart));
}

function renderCart() {
    const preview = document.getElementById('delivery-cart-preview');
    const itemsContainer = document.getElementById('delivery-cart-items');
    const countBadge = document.getElementById('cart-count-badge');
    const subtotalEl = document.getElementById('delivery-subtotal');
    const nextBtn = document.getElementById('btn-next-step2');
    
    if (deliveryCart.length === 0) {
        preview.style.display = 'none';
        nextBtn.disabled = true;
        return;
    }
    
    preview.style.display = 'block';
    nextBtn.disabled = false;
    
    const totalItems = deliveryCart.reduce((s, c) => s + c.quantity, 0);
    const subtotal = deliveryCart.reduce((s, c) => s + (c.price * c.quantity), 0);
    
    countBadge.textContent = `${totalItems} món`;
    subtotalEl.textContent = formatVND(subtotal);
    
    itemsContainer.innerHTML = deliveryCart.map(item => `
        <div class="flex items-center justify-between py-1.5">
            <div class="flex items-center gap-2 min-w-0">
                <span class="font-bold text-[#FF7A00] text-sm">${item.quantity}x</span>
                <span class="text-sm truncate">${escapeHTML(item.name)}</span>
            </div>
            <span class="text-sm font-semibold shrink-0 ml-2">${formatVND(item.price * item.quantity)}</span>
        </div>
    `).join('');
}

// --- Step Navigation ---
window.goToStep = function(step) {
    // Validation
    if (step === 2 && deliveryCart.length === 0) {
        showDeliveryToast('Vui lòng chọn ít nhất 1 món', 'error');
        return;
    }
    
    if (step === 3) {
        if (!validateDeliveryInfo()) return;
        renderConfirmation();
    }
    
    document.querySelectorAll('.delivery-form-section').forEach(s => s.classList.remove('active'));
    document.getElementById(`step-${step}`).classList.add('active');
    
    document.querySelectorAll('.step-indicator .step').forEach((s, i) => {
        s.classList.toggle('active', i < step);
    });
    
    // Init map on step 2
    if (step === 2 && !deliveryMap) {
        setTimeout(initMap, 100);
    }
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
};

// --- Validation ---
function validateDeliveryInfo() {
    const name = document.getElementById('d-name').value.trim();
    const phone = document.getElementById('d-phone').value.trim();
    const address = document.getElementById('d-address').value.trim();
    
    if (!name) {
        showDeliveryToast('Vui lòng nhập họ tên', 'error');
        document.getElementById('d-name').focus();
        return false;
    }
    if (!phone || phone.length < 9) {
        showDeliveryToast('Vui lòng nhập số điện thoại hợp lệ', 'error');
        document.getElementById('d-phone').focus();
        return false;
    }
    if (!address) {
        showDeliveryToast('Vui lòng nhập hoặc chọn địa chỉ giao hàng', 'error');
        document.getElementById('d-address').focus();
        return false;
    }
    if (!selectedLat || !selectedLng) {
        showDeliveryToast('Vui lòng chọn vị trí trên bản đồ', 'error');
        return false;
    }
    
    const maxRadius = storeConfig.delivery_radius_km || 3;
    if (calculatedDistance > maxRadius) {
        showDeliveryToast(`Địa chỉ ngoài phạm vi giao hàng (${maxRadius}km)`, 'error');
        return false;
    }
    
    // Check min order
    const subtotal = deliveryCart.reduce((s, c) => s + (c.price * c.quantity), 0);
    const minOrder = storeConfig.delivery_min_order || 30000;
    if (subtotal < minOrder) {
        showDeliveryToast(`Đơn tối thiểu ${formatVND(minOrder)} để giao hàng`, 'error');
        return false;
    }
    
    return true;
}

// --- Map ---
function initMap() {
    const storeLat = storeConfig.store_lat || 10.7769;
    const storeLng = storeConfig.store_lng || 106.7009;
    
    deliveryMap = L.map('delivery-map').setView([storeLat, storeLng], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap',
        maxZoom: 19
    }).addTo(deliveryMap);
    
    // Store marker
    const storeIcon = L.divIcon({
        html: '<div style="background:#994700;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white;"><i class="fa-solid fa-store"></i></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: ''
    });
    storeMarker = L.marker([storeLat, storeLng], { icon: storeIcon }).addTo(deliveryMap);
    storeMarker.bindPopup('<b>Nohope Coffee</b>').openPopup();
    
    // Draw delivery radius circle
    const radiusKm = storeConfig.delivery_radius_km || 3;
    L.circle([storeLat, storeLng], {
        radius: radiusKm * 1000,
        color: '#FF7A00',
        fillColor: '#FF7A00',
        fillOpacity: 0.08,
        weight: 2,
        dashArray: '8, 8'
    }).addTo(deliveryMap);
    
    // Click to set delivery location
    deliveryMap.on('click', function(e) {
        setDeliveryLocation(e.latlng.lat, e.latlng.lng);
    });
}

function setDeliveryLocation(lat, lng) {
    selectedLat = lat;
    selectedLng = lng;
    
    // Update or create marker
    const icon = L.divIcon({
        html: '<div style="background:#FF7A00;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;box-shadow:0 2px 8px rgba(0,0,0,0.3);border:3px solid white;"><i class="fa-solid fa-location-dot"></i></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
        className: ''
    });
    
    if (deliveryMarker) {
        deliveryMarker.setLatLng([lat, lng]);
    } else {
        deliveryMarker = L.marker([lat, lng], { icon: icon, draggable: true }).addTo(deliveryMap);
        deliveryMarker.on('dragend', function(e) {
            const pos = e.target.getLatLng();
            setDeliveryLocation(pos.lat, pos.lng);
        });
    }
    
    calculateDeliveryFee();
    
    // Reverse geocode for address
    reverseGeocode(lat, lng);
}

async function reverseGeocode(lat, lng) {
    try {
        const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=vi`);
        const data = await resp.json();
        if (data.display_name) {
            document.getElementById('d-address').value = data.display_name;
        }
    } catch(e) {
        console.warn('Reverse geocode failed:', e);
    }
}

window.useMyLocation = function() {
    if (!navigator.geolocation) {
        showDeliveryToast('Trình duyệt không hỗ trợ GPS', 'error');
        return;
    }
    
    navigator.geolocation.getCurrentPosition(
        (pos) => {
            const { latitude, longitude } = pos.coords;
            setDeliveryLocation(latitude, longitude);
            if (deliveryMap) {
                deliveryMap.setView([latitude, longitude], 15);
            }
        },
        (err) => {
            showDeliveryToast('Không thể lấy vị trí. Hãy cho phép GPS.', 'error');
        },
        { enableHighAccuracy: true }
    );
};

// --- Fee Calculation ---
function calculateDeliveryFee() {
    const storeLat = storeConfig.store_lat || 10.7769;
    const storeLng = storeConfig.store_lng || 106.7009;
    const baseFee = storeConfig.delivery_base_fee || 15000;
    const feePerKm = storeConfig.delivery_fee_per_km || 5000;
    const maxRadius = storeConfig.delivery_radius_km || 3;
    
    calculatedDistance = haversineDistance(storeLat, storeLng, selectedLat, selectedLng);
    
    const distEl = document.getElementById('distance-info');
    const errEl = document.getElementById('distance-error');
    const nextBtn = document.getElementById('btn-next-step3');
    
    if (calculatedDistance > maxRadius) {
        distEl.classList.add('hidden');
        errEl.classList.remove('hidden');
        document.getElementById('distance-error-text').textContent = 
            `Địa chỉ ngoài phạm vi giao hàng (${maxRadius}km). Khoảng cách: ${calculatedDistance.toFixed(1)}km`;
        nextBtn.disabled = true;
        calculatedFee = 0;
        return;
    }
    
    errEl.classList.add('hidden');
    distEl.classList.remove('hidden');
    
    // Fee formula: base + (distance * fee_per_km)
    calculatedFee = baseFee + Math.ceil(calculatedDistance) * feePerKm;
    if (calculatedDistance < 1) calculatedFee = baseFee;
    
    document.getElementById('d-distance').textContent = `${calculatedDistance.toFixed(1)} km`;
    document.getElementById('d-fee').textContent = formatVND(calculatedFee);
    
    nextBtn.disabled = false;
}

// Haversine formula
function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

// --- Render Confirmation ---
function renderConfirmation() {
    const subtotal = deliveryCart.reduce((s, c) => s + (c.price * c.quantity), 0);
    const total = subtotal + calculatedFee;
    
    document.getElementById('confirm-name').textContent = document.getElementById('d-name').value;
    document.getElementById('confirm-phone').textContent = document.getElementById('d-phone').value;
    document.getElementById('confirm-address').textContent = document.getElementById('d-address').value;
    document.getElementById('confirm-subtotal').textContent = formatVND(subtotal);
    document.getElementById('confirm-fee').textContent = formatVND(calculatedFee);
    document.getElementById('confirm-total').textContent = formatVND(total);
    
    document.getElementById('confirm-items-list').innerHTML = deliveryCart.map(item => `
        <div class="flex justify-between items-center">
            <span class="text-sm"><span class="font-bold text-[#FF7A00]">${item.quantity}x</span> ${escapeHTML(item.name)}</span>
            <span class="text-sm font-semibold">${formatVND(item.price * item.quantity)}</span>
        </div>
    `).join('');
}

// --- Place Order ---
window.placeDeliveryOrder = async function() {
    // Re-fetch store config to ensure delivery isn't recently disabled
    try {
        const { data } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
        if (data) {
            storeConfig = data;
        }
    } catch (e) {}

    let isStoreClosed = false;
    if (storeConfig) {
        if (storeConfig.is_open_override === false) {
            isStoreClosed = true;
        } else if (storeConfig.is_open_override !== true) {
            const now = new Date();
            const openTime = storeConfig.open_time || '07:00';
            const closeTime = storeConfig.close_time || '22:00';
            const [openH, openM] = openTime.split(':').map(Number);
            const [closeH, closeM] = closeTime.split(':').map(Number);
            const openMinutes = openH * 60 + openM;
            const closeMinutes = closeH * 60 + closeM;
            const nowMinutes = now.getHours() * 60 + now.getMinutes();
            if (nowMinutes < openMinutes || nowMinutes >= closeMinutes) isStoreClosed = true;
        }
    }
    
    if (!storeConfig || !storeConfig.delivery_enabled) {
        showDeliveryToast("Quán hiện đang tạm ngừng nhận đơn giao hàng. Vui lòng thử lại sau.", "error");
        return;
    }

    if (isStoreClosed) {
        showDeliveryToast('Xin lỗi, quán hiện đang đóng cửa.', 'error');
        return;
    }

    if (storeConfig && storeConfig.delivery_enabled === false) {
        showDeliveryToast('Xin lỗi, quán vừa tạm ngừng nhận đơn giao hàng.', 'error');
        return;
    }

    const btn = document.getElementById('btn-place-order');
    const originalHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang đặt hàng...';

    
    try {
        const subtotal = deliveryCart.reduce((s, c) => s + (c.price * c.quantity), 0);
        const totalPrice = subtotal + calculatedFee;
        const paymentMethod = document.querySelector('input[name="payment"]:checked').value;
        
        // Build reductions map for inventory
        const reductions = {};
        for (const item of deliveryCart) {
            if (Array.isArray(item.recipe)) {
                for (const r of item.recipe) {
                    const ingrId = r.ingredient_id || r.ingredientId;
                    if (!ingrId) continue;
                    const amount = (r.amount || r.quantity || 0) * item.quantity;
                    reductions[ingrId] = (reductions[ingrId] || 0) + amount;
                }
            }
        }
        
        const payload = {
            delivery_name: document.getElementById('d-name').value.trim(),
            delivery_phone: document.getElementById('d-phone').value.trim(),
            delivery_address: document.getElementById('d-address').value.trim(),
            delivery_lat: selectedLat,
            delivery_lng: selectedLng,
            delivery_fee: calculatedFee,
            delivery_note: document.getElementById('d-note').value.trim(),
            items: deliveryCart.map(c => ({
                id: c.id,
                name: c.name,
                price: c.price,
                quantity: c.quantity,
                recipe: c.recipe || []
            })),
            total_price: totalPrice,
            payment_method: paymentMethod,
            order_note: document.getElementById('d-note').value.trim(),
            reductions: Object.keys(reductions).length > 0 ? reductions : undefined
        };
        
        const { data, error } = await supabase.rpc('place_delivery_order', { payload });
        
        if (error) throw error;
        
        // Clear cart
        deliveryCart = [];
        localStorage.removeItem('nohope_delivery_cart');
        
        // Redirect to tracking page
        const trackingToken = data.tracking_token;
        window.location.href = `/tracking?token=${trackingToken}`;
        
    } catch(e) {
        console.error('Error placing delivery order:', e);
        showDeliveryToast(e.message || 'Đặt hàng thất bại. Vui lòng thử lại.', 'error');
        btn.disabled = false;
        btn.innerHTML = originalHTML;
    }
};

// --- Helper ---
function formatVND(amount) {
    if (!amount && amount !== 0) return '0đ';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}

function showDeliveryToast(message, type = 'success') {
    const toast = document.getElementById('delivery-toast');
    const textEl = document.getElementById('delivery-toast-text');
    const icon = toast.querySelector('i');
    
    textEl.textContent = message;
    icon.className = type === 'error' 
        ? 'fa-solid fa-circle-xmark text-red-500' 
        : 'fa-solid fa-circle-check text-green-500';
    
    toast.classList.remove('hidden');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}
