// =============================================
// TRACKING.JS — Real-time Order Tracking
// =============================================

let trackingMap = null;
let driverMarker = null;
let storeMarker = null;
let customerMarker = null;
let orderData = null;
let realtimeChannel = null;
let driverChannel = null;

const STATUS_MAP = {
    'Pending': { label: 'Chờ xác nhận', color: '#F59E0B', bg: '#FEF3C7', step: 0 },
    'Confirmed': { label: 'Đã xác nhận', color: '#3B82F6', bg: '#DBEAFE', step: 0 },
    'Preparing': { label: 'Đang chế biến', color: '#994700', bg: '#FFF4E8', step: 1 },
    'Ready': { label: 'Sẵn sàng giao', color: '#8B5CF6', bg: '#EDE9FE', step: 2 },
    'Delivering': { label: 'Đang giao hàng', color: '#FF7A00', bg: '#FFF4E8', step: 3 },
    'Completed': { label: 'Đã giao', color: '#22C55E', bg: '#DCFCE7', step: 4 },
    'Cancelled': { label: 'Đã hủy', color: '#EF4444', bg: '#FEE2E2', step: -1 }
};

document.addEventListener('DOMContentLoaded', () => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    
    if (!token) {
        showLookupModal();
        return;
    }
    
    loadOrder(token);
});

async function loadOrder(token) {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('tracking_token', token.toUpperCase())
            .eq('order_type', 'delivery')
            .maybeSingle();
        
        if (error) throw error;
        
        if (!data) {
            showNotFound();
            return;
        }
        
        orderData = data;
        renderOrder(data);
        setupRealtime(data.id, data.assigned_driver_id);
        
    } catch(e) {
        console.error('Error loading order:', e);
        showNotFound();
    }
}

function showLookupModal() {
    document.getElementById('tracking-map').style.display = 'none';
    document.getElementById('tracking-sheet').style.display = 'none';
    document.getElementById('lookup-modal').classList.remove('hidden');
}

function showNotFound() {
    document.getElementById('tracking-loading').classList.add('hidden');
    document.getElementById('tracking-not-found').classList.remove('hidden');
}

window.lookupOrder = function() {
    const token = document.getElementById('lookup-token').value.trim();
    if (!token) return;
    window.location.href = `/tracking?token=${encodeURIComponent(token)}`;
};

// --- Render Order ---
function renderOrder(order) {
    document.getElementById('tracking-loading').classList.add('hidden');
    document.getElementById('tracking-content').classList.remove('hidden');
    
    const displayId = String(order.id).slice(-6).toUpperCase();
    document.getElementById('t-order-id').textContent = displayId;
    document.getElementById('t-order-time').textContent = new Date(order.created_at).toLocaleString('vi-VN');
    
    // Status badge
    const statusInfo = STATUS_MAP[order.delivery_status || order.status] || STATUS_MAP['Pending'];
    const badge = document.getElementById('t-status-badge');
    badge.textContent = statusInfo.label;
    badge.style.background = statusInfo.bg;
    badge.style.color = statusInfo.color;
    
    // Stepper
    updateStepper(order.delivery_status || order.status);
    
    // Items
    const items = order.items || [];
    document.getElementById('t-order-items').innerHTML = items.map(item => `
        <div class="flex justify-between items-center text-sm">
            <span><span class="font-bold text-[#FF7A00]">${item.quantity}x</span> ${item.name || 'Món'}</span>
            <span class="font-semibold">${formatVND(item.price * item.quantity)}</span>
        </div>
    `).join('');
    
    // Prices
    const subtotal = items.reduce((s, i) => s + (i.price * i.quantity), 0);
    document.getElementById('t-subtotal').textContent = formatVND(subtotal);
    document.getElementById('t-fee').textContent = formatVND(order.delivery_fee || 0);
    document.getElementById('t-total').textContent = formatVND(order.total_price || (subtotal + (order.delivery_fee || 0)));
    
    // Address
    document.getElementById('t-address').textContent = order.delivery_address || 'Không có địa chỉ';
    
    // Init map
    initTrackingMap(order);
    
    // Load driver info if assigned
    if (order.assigned_driver_id) {
        loadDriverInfo(order.assigned_driver_id);
    }
}

function updateStepper(status) {
    const steps = document.querySelectorAll('#order-stepper .step-item');
    const progressBar = document.getElementById('stepper-progress');
    const currentStep = STATUS_MAP[status]?.step ?? 0;
    
    if (currentStep === -1) {
        // Cancelled
        steps.forEach(s => {
            s.classList.remove('active', 'completed');
            s.classList.add('failed');
        });
        progressBar.style.width = '0%';
        return;
    }
    
    steps.forEach((step, i) => {
        step.classList.remove('active', 'completed', 'failed');
        if (i < currentStep) {
            step.classList.add('completed');
        } else if (i === currentStep) {
            step.classList.add('active');
        }
    });
    
    const totalSteps = steps.length - 1;
    progressBar.style.width = `${(currentStep / totalSteps) * 100}%`;
}

// --- Map ---
function initTrackingMap(order) {
    const lat = order.delivery_lat || 10.7769;
    const lng = order.delivery_lng || 106.7009;
    
    trackingMap = L.map('tracking-map', { zoomControl: false }).setView([lat, lng], 14);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OSM',
        maxZoom: 19
    }).addTo(trackingMap);
    
    // Customer marker
    const custIcon = L.divIcon({
        html: '<div style="background:#FF7A00;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><i class="fa-solid fa-house"></i></div>',
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        className: ''
    });
    customerMarker = L.marker([lat, lng], { icon: custIcon }).addTo(trackingMap);
    customerMarker.bindPopup('<b>Địa chỉ giao hàng</b>');
    
    // Try to add store marker
    loadStoreLocation();
}

async function loadStoreLocation() {
    try {
        const { data } = await supabase.from('store_settings').select('store_lat, store_lng, name').eq('id', 1).maybeSingle();
        if (data && data.store_lat && data.store_lng) {
            const storeIcon = L.divIcon({
                html: '<div style="background:#994700;color:white;width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:14px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);"><i class="fa-solid fa-store"></i></div>',
                iconSize: [32, 32],
                iconAnchor: [16, 16],
                className: ''
            });
            storeMarker = L.marker([data.store_lat, data.store_lng], { icon: storeIcon }).addTo(trackingMap);
            storeMarker.bindPopup(`<b>${data.name || 'Nohope Coffee'}</b>`);
            
            // Fit bounds
            if (customerMarker) {
                const group = L.featureGroup([customerMarker, storeMarker]);
                trackingMap.fitBounds(group.getBounds().pad(0.3));
            }
        }
    } catch(e) {}
}

// --- Driver Info ---
async function loadDriverInfo(driverId) {
    try {
        const { data } = await supabase.from('delivery_drivers').select('*').eq('id', driverId).maybeSingle();
        if (data) {
            document.getElementById('driver-info').classList.remove('hidden');
            document.getElementById('t-driver-name').textContent = data.name || 'Shipper';
            document.getElementById('t-driver-phone').textContent = data.phone || '';
            
            if (data.phone) {
                document.getElementById('t-call-driver').href = `tel:${data.phone}`;
            }
            
            // Show driver on map
            if (data.current_lat && data.current_lng) {
                updateDriverOnMap(data.current_lat, data.current_lng);
            }
        }
    } catch(e) {}
}

function updateDriverOnMap(lat, lng) {
    const driverIcon = L.divIcon({
        html: '<div style="background:#22C55E;color:white;width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;border:3px solid white;box-shadow:0 2px 12px rgba(0,0,0,0.3);animation:pulse 2s infinite;"><i class="fa-solid fa-motorcycle"></i></div>',
        iconSize: [36, 36],
        iconAnchor: [18, 18],
        className: ''
    });
    
    if (driverMarker) {
        driverMarker.setLatLng([lat, lng]);
    } else {
        driverMarker = L.marker([lat, lng], { icon: driverIcon }).addTo(trackingMap);
        driverMarker.bindPopup('<b>Shipper</b>');
    }
    
    // Adjust map bounds to include driver
    const markers = [customerMarker, driverMarker];
    if (storeMarker) markers.push(storeMarker);
    const group = L.featureGroup(markers.filter(Boolean));
    trackingMap.fitBounds(group.getBounds().pad(0.2));
}

// --- Realtime ---
function setupRealtime(orderId, driverId) {
    // Listen for order status changes
    realtimeChannel = supabase
        .channel(`tracking-order-${orderId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'orders',
            filter: `id=eq.${orderId}`
        }, payload => {
            orderData = { ...orderData, ...payload.new };
            const status = orderData.delivery_status || orderData.status;
            
            // Update stepper
            updateStepper(status);
            
            // Update badge
            const statusInfo = STATUS_MAP[status] || STATUS_MAP['Pending'];
            const badge = document.getElementById('t-status-badge');
            badge.textContent = statusInfo.label;
            badge.style.background = statusInfo.bg;
            badge.style.color = statusInfo.color;
            
            // Load driver info if newly assigned
            if (payload.new.assigned_driver_id && !driverId) {
                driverId = payload.new.assigned_driver_id;
                loadDriverInfo(driverId);
                setupDriverTracking(driverId);
            }
        })
        .subscribe();
    
    // If driver already assigned, track driver location
    if (driverId) {
        setupDriverTracking(driverId);
    }
}

function setupDriverTracking(driverId) {
    driverChannel = supabase
        .channel(`tracking-driver-${driverId}`)
        .on('postgres_changes', {
            event: 'UPDATE',
            schema: 'public',
            table: 'delivery_drivers',
            filter: `id=eq.${driverId}`
        }, payload => {
            const { current_lat, current_lng } = payload.new;
            if (current_lat && current_lng) {
                updateDriverOnMap(current_lat, current_lng);
            }
        })
        .subscribe();
}

// --- Cleanup ---
window.addEventListener('beforeunload', () => {
    if (realtimeChannel) supabase.removeChannel(realtimeChannel);
    if (driverChannel) supabase.removeChannel(driverChannel);
});

// --- Helper ---
function formatVND(amount) {
    if (!amount && amount !== 0) return '0đ';
    return Number(amount).toLocaleString('vi-VN') + 'đ';
}
