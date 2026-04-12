// =============================================
// DRIVER.JS — Shipper Mobile Interface
// =============================================

let driverData = null;
let driverMap = null;
let driverMarker = null;
let accuracyCircle = null;
let routeLines = [];
let locationWatchId = null;
let ordersChannel = null;
let currentOrders = [];
let availableOrders = []; // Add array for unassigned orders

// --- Init ---
document.addEventListener('DOMContentLoaded', () => {
    const savedId = localStorage.getItem('nohope_driver_id');
    if (savedId) {
        loginWithId(savedId);
    }
});

// --- Login ---
window.driverLogin = async function () {
    const code = document.getElementById('driver-code').value.trim().toUpperCase();
    if (!code) return;

    const errEl = document.getElementById('login-error');
    errEl.classList.add('hidden');

    try {
        const { data, error } = await supabase
            .from('delivery_drivers')
            .select('*')
            .eq('driver_code', code)
            .eq('is_active', true)
            .maybeSingle();

        if (error) throw error;
        if (!data) {
            errEl.textContent = 'Mã shipper không hợp lệ hoặc tài khoản bị khóa.';
            errEl.classList.remove('hidden');
            return;
        }

        localStorage.setItem('nohope_driver_id', data.id);
        driverData = data;
        showDriverUI();

    } catch (e) {
        errEl.textContent = 'Lỗi đăng nhập. Vui lòng thử lại.';
        errEl.classList.remove('hidden');
    }
};

async function loginWithId(id) {
    try {
        const { data, error } = await supabase
            .from('delivery_drivers')
            .select('*')
            .eq('id', id)
            .eq('is_active', true)
            .maybeSingle();

        if (!data) {
            localStorage.removeItem('nohope_driver_id');
            return;
        }

        driverData = data;
        showDriverUI();
    } catch (e) {
        localStorage.removeItem('nohope_driver_id');
    }
}

window.driverLogout = function () {
    if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);
    if (ordersChannel) supabase.removeChannel(ordersChannel);
    localStorage.removeItem('nohope_driver_id');
    driverData = null;
    document.getElementById('driver-main').classList.add('hidden');
    document.getElementById('driver-login').style.display = 'flex';
};

// --- Main UI ---
function showDriverUI() {
    document.getElementById('driver-login').style.display = 'none';
    document.getElementById('driver-main').classList.remove('hidden');

    document.getElementById('driver-greeting').textContent = `Xin chào, ${driverData.name || 'Shipper'}!`;

    // Auto set online on login
    setDriverStatus(true);

    initDriverMap();
    startLocationTracking();
    loadAssignedOrders();
    setupOrdersRealtime();
    loadTodayStats();
}

// --- Map ---
function initDriverMap() {
    const lat = driverData.current_lat || 10.7769;
    const lng = driverData.current_lng || 106.7009;

    driverMap = L.map('driver-map', { zoomControl: false }).setView([lat, lng], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM',
        maxZoom: 19
    }).addTo(driverMap);
}

// --- GPS Tracking ---
function startLocationTracking() {
    if (!navigator.geolocation) {
        console.warn('Geolocation not supported');
        return;
    }

    const driverIcon = L.divIcon({
        html: `<div style="background:linear-gradient(135deg,#22C55E,#16A34A);color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.4)"><i class="fa-solid fa-motorcycle"></i></div>`,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: ''
    });

    locationWatchId = navigator.geolocation.watchPosition(
        async (pos) => {
            const { latitude, longitude, accuracy } = pos.coords;

            // Update or create marker
            if (driverMarker) {
                driverMarker.setLatLng([latitude, longitude]);
            } else {
                driverMarker = L.marker([latitude, longitude], { icon: driverIcon })
                    .addTo(driverMap)
                    .bindPopup(`<b>${driverData.name}</b><br>Vị trí hiện tại`);
            }

            // Accuracy circle
            if (accuracyCircle) {
                accuracyCircle.setLatLng([latitude, longitude]).setRadius(accuracy);
            } else {
                accuracyCircle = L.circle([latitude, longitude], {
                    radius: accuracy,
                    color: '#22C55E',
                    fillColor: '#22C55E',
                    fillOpacity: 0.1,
                    weight: 1
                }).addTo(driverMap);
            }

            // Center map
            if (driverMap) {
                driverMap.setView([latitude, longitude], driverMap.getZoom());
            }

            // Update DB
            try {
                await supabase
                    .from('delivery_drivers')
                    .update({
                        current_lat: latitude,
                        current_lng: longitude,
                        last_location_update: new Date().toISOString()
                    })
                    .eq('id', driverData.id);
            } catch (e) {
                console.warn('Failed to update location:', e);
            }
        },
        (err) => {
            console.warn('GPS error:', err);
        },
        {
            enableHighAccuracy: true,
            maximumAge: 5000,
            timeout: 15000
        }
    );
}

// --- Load Orders ---
async function loadAssignedOrders() {
    try {
        const { data: myOrders, error: err1 } = await supabase
            .from('orders')
            .select('*')
            .eq('assigned_driver_id', driverData.id)
            .in('delivery_status', ['Ready', 'Delivering'])
            .order('created_at', { ascending: true });

        if (err1) throw err1;
        currentOrders = myOrders || [];

        const { data: availOrders, error: err2 } = await supabase
            .from('orders')
            .select('*')
            .is('assigned_driver_id', null)
            .eq('delivery_status', 'Ready')
            .order('created_at', { ascending: true });

        if (err2) throw err2;
        availableOrders = availOrders || [];

        renderOrders();
        renderOrderMarkers();
    } catch (e) {
        console.error('Error loading orders:', e);
    }
}

function renderOrders() {
    const container = document.getElementById('driver-orders');

    if (currentOrders.length === 0 && availableOrders.length === 0) {
        container.innerHTML = '<p class="text-center text-gray-600 text-sm py-6">Chưa có đơn nào.</p>';
        return;
    }

    let html = '';

    if (currentOrders.length > 0) {
        html += '<h3 class="font-bold mb-3 text-white">Đơn của bạn</h3>';
        html += currentOrders.map(order => buildOrderCard(order, true)).join('');
    }

    if (availableOrders.length > 0) {
        html += '<h3 class="font-bold mt-4 mb-3 text-white border-t border-gray-700 pt-3">Đơn chờ nhận</h3>';
        html += availableOrders.map(order => buildOrderCard(order, false)).join('');
    }

    container.innerHTML = html;
}

function buildOrderCard(order, isAssigned) {
    const items = order.items || [];
    const itemsText = items.map(i => `${i.quantity}x ${i.name}`).join(', ');
    const displayId = String(order.id).slice(-6).toUpperCase();
    const isDelivering = order.delivery_status === 'Delivering';

    let actionsHtml = '';
    if (!isAssigned) {
        actionsHtml = `
            <button class="action-btn flex-1 bg-[#22C55E] hover:bg-green-600 text-white font-bold" onclick="claimOrder('${order.id}')">
                <i class="fa-solid fa-hand-holding-hand"></i> Nhận đơn
            </button>
        `;
    } else {
        if (isDelivering) {
            actionsHtml = `
                <button class="action-btn success flex-1" onclick="completeDelivery('${order.id}')">
                    <i class="fa-solid fa-check-double"></i> Đã giao
                </button>
            `;
        } else {
            actionsHtml = `
                <button class="action-btn primary flex-1" onclick="startDelivery('${order.id}')">
                    <i class="fa-solid fa-motorcycle"></i> Bắt đầu giao
                </button>
            `;
        }
    }

    return `
    <div class="order-card" style="border-left-color: ${!isAssigned ? '#14B8A6' : (isDelivering ? '#22C55E' : '#FF7A00')}">
        <div class="flex justify-between items-start mb-2">
            <div>
                <span class="text-xs font-bold px-2 py-0.5 rounded-full ${!isAssigned ? 'bg-teal-500/20 text-teal-400' : (isDelivering ? 'bg-green-500/20 text-green-400' : 'bg-[#FF7A00]/20 text-[#FF7A00]')}">${!isAssigned ? 'ĐƠN MỚI' : (isDelivering ? 'ĐANG GIAO' : 'SẴN SÀNG')}</span>
                <h4 class="font-bold mt-1">#${displayId}</h4>
            </div>
            <span class="text-xs text-gray-500">${new Date(order.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        <p class="text-sm text-gray-400 mb-2 truncate">${itemsText}</p>
        
        <div class="flex items-center gap-2 text-sm mb-3">
            <i class="fa-solid fa-map-pin text-[#FF7A00]"></i>
            <span class="text-gray-300 truncate">${order.delivery_address || '---'}</span>
        </div>
        
        <div class="flex items-center gap-2 text-sm mb-3">
            <i class="fa-solid fa-phone text-green-400"></i>
            <a href="tel:${order.delivery_phone}" class="text-white font-semibold">${order.delivery_phone || '---'}</a>
            <span class="text-gray-500">• ${order.delivery_name || ''}</span>
        </div>
        
        <div class="flex items-center justify-between mb-3">
            <span class="font-bold text-[#FF7A00]">${formatVND(order.total_price)}</span>
            <span class="text-xs text-gray-500">${order.payment_method === 'cash' ? '💵 COD' : '📱 Đã CK'}</span>
        </div>
        
        <div class="flex gap-2">
            ${actionsHtml}
            <a href="https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}&travelmode=driving" target="_blank" class="action-btn flex-1" style="background:#3B82F6;color:white">
                <i class="fa-solid fa-diamond-turn-right"></i> Chỉ đường
            </a>
        </div>
        ${isAssigned ? `
        <div class="flex gap-2 mt-2">
            <a href="tel:${order.delivery_phone}" class="action-btn flex-1" style="background:#2A2B2B;color:#22C55E;border:1px solid #333">
                <i class="fa-solid fa-phone"></i> Gọi khách
            </a>
            <button class="action-btn flex-1" style="background:#2A2B2B;color:#FF7A00;border:1px solid #333" onclick="focusOrderOnMap(${order.delivery_lat}, ${order.delivery_lng})">
                <i class="fa-solid fa-crosshairs"></i> Xem trên map
            </button>
        </div>` : ''}
    </div>`;
}

let orderMarkers = [];

function renderOrderMarkers() {
    if (!driverMap) return;

    // Clear old markers and routes
    orderMarkers.forEach(m => driverMap.removeLayer(m));
    orderMarkers = [];
    routeLines.forEach(l => driverMap.removeLayer(l));
    routeLines = [];

    const bounds = [];
    if (driverMarker) bounds.push(driverMarker.getLatLng());

    currentOrders.forEach((order, idx) => {
        if (order.delivery_lat && order.delivery_lng) {
            const destLatLng = [order.delivery_lat, order.delivery_lng];
            bounds.push(L.latLng(destLatLng));

            // Destination marker
            const icon = L.divIcon({
                html: `<div style="background:#FF7A00;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.4)">${idx + 1}</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                className: ''
            });
            const marker = L.marker(destLatLng, { icon })
                .addTo(driverMap)
                .bindPopup(`<b>#${String(order.id).slice(-6)}</b><br>${order.delivery_address || ''}<br><a href="https://www.google.com/maps/dir/?api=1&destination=${order.delivery_lat},${order.delivery_lng}&travelmode=driving" target="_blank" style="color:#3B82F6;font-weight:bold">🧭 Mở Google Maps</a>`);
            orderMarkers.push(marker);

            // Draw route line from driver to destination
            if (driverMarker) {
                const line = L.polyline(
                    [driverMarker.getLatLng(), destLatLng],
                    { color: '#FF7A00', weight: 3, opacity: 0.7, dashArray: '8, 8' }
                ).addTo(driverMap);
                routeLines.push(line);
            }
        }
    });

    // Draw markers for available orders as well
    availableOrders.forEach((order, idx) => {
        if (order.delivery_lat && order.delivery_lng) {
            const destLatLng = [order.delivery_lat, order.delivery_lng];
            bounds.push(L.latLng(destLatLng));
            
            const icon = L.divIcon({
                html: `<div style="background:#14B8A6;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:900;border:3px solid white;box-shadow:0 2px 10px rgba(0,0,0,0.4)">!</div>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                className: ''
            });
            const marker = L.marker(destLatLng, { icon })
                .addTo(driverMap)
                .bindPopup(`<b>#${String(order.id).slice(-6).toUpperCase()}</b><br>Đơn chờ giao (chưa nhận)`);
            orderMarkers.push(marker);
        }
    });

    // Fit map to show all points
    if (bounds.length > 1) {
        driverMap.fitBounds(L.latLngBounds(bounds), { padding: [40, 40] });
    }
}

// Focus map on a specific order
window.focusOrderOnMap = function (lat, lng) {
    if (driverMap && lat && lng) {
        driverMap.setView([lat, lng], 16);
    }
};

window.claimOrder = async function(orderId) {
    try {
        const { error } = await supabase.rpc('driver_claim_order', {
            p_order_id: orderId,
            p_driver_id: driverData.id
        });

        if (error) throw error;
        
        await loadAssignedOrders();
    } catch(e) {
        alert('Đơn đã có người nhận hoặc bị lỗi.');
        await loadAssignedOrders();
    }
};

window.startDelivery = async function (orderId) {
    try {
        const { error } = await supabase.rpc('driver_update_status', {
            p_order_id: orderId,
            p_driver_id: driverData.id,
            p_delivery_status: 'Delivering',
            p_status: 'Ready'
        });
        
        if (error) throw error;

        // Refresh
        await loadAssignedOrders();
    } catch (e) {
        alert('Lỗi: ' + e.message);
    }
};

window.completeDelivery = async function (orderId) {
    if (!confirm('Xác nhận đã giao thành công?')) return;

    try {
        const { error } = await supabase.rpc('driver_update_status', {
            p_order_id: orderId,
            p_driver_id: driverData.id,
            p_delivery_status: 'Completed',
            p_status: 'Completed'
        });
        
        if (error) throw error;

        // Refresh
        await loadAssignedOrders();
        await loadTodayStats();
    } catch (e) {
        alert('Lỗi: ' + e.message);
    }
};

// --- Online/Offline ---
window.setDriverStatus = async function (online) {
    try {
        await supabase
            .from('delivery_drivers')
            .update({ status: online ? 'available' : 'offline' })
            .eq('id', driverData.id);

        document.getElementById('btn-online').classList.toggle('active', online);
        document.getElementById('btn-offline').classList.toggle('active', !online);

        if (!online && locationWatchId) {
            navigator.geolocation.clearWatch(locationWatchId);
            locationWatchId = null;
        } else if (online && !locationWatchId) {
            startLocationTracking();
        }
    } catch (e) { }
};

// --- Stats ---
async function loadTodayStats() {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const { data } = await supabase
            .from('orders')
            .select('total_price, delivery_fee')
            .eq('assigned_driver_id', driverData.id)
            .eq('delivery_status', 'Completed')
            .gte('created_at', today.toISOString());

        const count = data ? data.length : 0;
        const earnings = data ? data.reduce((s, o) => s + (o.delivery_fee || 0), 0) : 0;

        document.getElementById('stat-today').textContent = count;
        document.getElementById('stat-earnings').textContent = formatVND(earnings);
        document.getElementById('driver-stats-text').textContent = `${count} đơn hôm nay`;
    } catch (e) { }
}

// --- Realtime ---
function setupOrdersRealtime() {
    ordersChannel = supabase
        .channel(`driver-orders-${driverData.id}`)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'orders',
            filter: `order_type=eq.delivery` // Listen to all delivery orders to catch new unassigned ones
        }, () => {
            loadAssignedOrders();
        })
        .subscribe();
}

// --- Cleanup ---
window.addEventListener('beforeunload', () => {
    if (locationWatchId) navigator.geolocation.clearWatch(locationWatchId);
    if (ordersChannel) supabase.removeChannel(ordersChannel);
    // Set offline when leaving
    if (driverData) {
        supabase.from('delivery_drivers').update({ status: 'offline' }).eq('id', driverData.id);
    }
});

// --- Helper ---
function formatVND(amount) {
    if (!amount && amount !== 0) return '0đ';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}
