// tv.js
let preparingOrders = [];
let readyOrders = [];
let previousReadyIds = new Set();
let tenantId = null;

// Start TV Mode (Fullscreen + Audio Perms)
function startTVMode() {
    tenantId = new URLSearchParams(window.location.search).get('store') || sessionStorage.getItem('tenant_id') || localStorage.getItem('tenant_id');
    if (!tenantId) {
        alert("Không tìm thấy thông tin cửa hàng. Vui lòng đăng nhập lại.");
        window.location.href = '/login';
        return;
    }
    sessionStorage.setItem('tenant_id', tenantId);
    localStorage.setItem('tenant_id', tenantId);

    document.getElementById('setup-prompt').style.display = 'none';
    
    // Request fullscreen viewing
    const elem = document.documentElement;
    if (elem.requestFullscreen) {
        elem.requestFullscreen().catch(e => console.log(e));
    }
    
    // Play sound dummy once to unlock browser audio policy
    const audio = document.getElementById('ding-dong-sound');
    audio.volume = 0;
    audio.play().then(() => {
        audio.pause();
        audio.currentTime = 0;
        audio.volume = 1; // Restore volume for actual alerts
    }).catch(e => console.log('Audio init skipped:', e));

    // Fetch initial data
    fetchActiveOrders();
    setupRealtimeSubscription();
}

// Update Clock
setInterval(() => {
    const now = new Date();
    document.getElementById('tv-clock').textContent = now.toLocaleTimeString('vi-VN', { hour12: false });
}, 1000);

// Fetch Initial Active Orders
async function fetchActiveOrders() {
    try {
        const { data, error } = await supabase
            .from('orders')
            .select('id, table_number, status, created_at')
            .eq('tenant_id', tenantId)
            .in('status', ['Preparing', 'Ready'])
            .order('created_at', { ascending: true }); // Mới nhất ở dưới, cũ nhất ở trên

        if (error) throw error;
        
        preparingOrders = data.filter(o => o.status === 'Preparing');
        readyOrders = data.filter(o => o.status === 'Ready');
        
        readyOrders.forEach(o => previousReadyIds.add(o.id));
        
        renderLists();
    } catch (e) {
        console.error('Error fetching orders:', e);
    }
}

function playDingDong() {
    const audio = document.getElementById('ding-dong-sound');
    if(audio) {
        audio.currentTime = 0;
        audio.play().catch(e => console.log("Audio play blocked by browser:", e));
    }
}

// Render Lists to DOM
function renderLists() {
    const prepList = document.getElementById('preparing-list');
    const readyList = document.getElementById('ready-list');
    
    prepList.innerHTML = '';
    readyList.innerHTML = '';

    // Render Preparing
    preparingOrders.forEach(order => {
        const shortId = order.id.substring(0, 4).toUpperCase();
        prepList.innerHTML += `
            <div class="w-full xl:w-[calc(50%-0.75rem)] bg-surface-variant/10 border-l-4 border-tertiary border-y border-r border-surface-variant/10 rounded-3xl p-5 md:p-6 flex justify-between items-center shadow-soft animate-slideIn backdrop-blur-md">
                <div>
                    <div class="text-outline-variant text-xs md:text-sm uppercase tracking-wider font-bold mb-1">Mã Đơn</div>
                    <div class="font-mono text-3xl md:text-4xl font-black text-surface">#${shortId}</div>
                </div>
                <div class="text-right flex flex-col items-end border-l border-surface-variant/20 pl-6">
                    <div class="text-outline-variant text-xs md:text-sm uppercase tracking-wider font-bold mb-1">Bàn số</div>
                    <div class="bg-primary border border-tertiary/30 text-tertiary text-4xl md:text-5xl font-black px-5 py-2 rounded-2xl min-w-[80px] text-center shadow-inner">${window.escapeHTML(order.table_number || '?')}</div>
                </div>
            </div>
        `;
    });

    // Render Ready
    readyOrders.forEach(order => {
        const shortId = order.id.substring(0, 4).toUpperCase();
        readyList.innerHTML += `
            <div class="w-full xl:w-[calc(50%-0.75rem)] bg-secondary/10 border-l-8 border-secondary border-y border-r border-secondary/30 rounded-3xl p-6 md:p-8 flex justify-between items-center shadow-[0_8px_30px_rgba(217,117,49,0.2)] animate-slideIn animate-pulseReady backdrop-blur-md">
                <div>
                    <div class="text-secondary/80 text-sm md:text-base uppercase tracking-wider font-bold mb-1">Mã Đơn</div>
                    <div class="font-mono text-4xl md:text-5xl font-black text-on-primary drop-shadow-md">#${shortId}</div>
                </div>
                <div class="text-right flex flex-col items-end border-l border-secondary/30 pl-6 md:pl-8">
                    <div class="text-secondary/80 text-sm md:text-base uppercase tracking-wider font-bold mb-1">Bàn số</div>
                    <div class="bg-secondary text-on-secondary text-5xl md:text-6xl font-black px-6 md:px-8 py-3 rounded-2xl min-w-[90px] text-center shadow-[0_0_25px_rgba(217,117,49,0.5)]">${window.escapeHTML(order.table_number || '?')}</div>
                </div>
            </div>
        `;
    });
}

// Supabase Real-time Sync
function setupRealtimeSubscription() {
    supabase.channel(`tv-screen-orders-${tenantId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `tenant_id=eq.${tenantId}` }, payload => {
            const eventType = payload.eventType;
            const newRecord = payload.new;
            const oldRecord = payload.old;
            
            if (eventType === 'INSERT' || eventType === 'UPDATE') {
                if (newRecord.status === 'Preparing' || newRecord.status === 'Ready') {
                    // Remove from both lists to cleanly re-add
                    preparingOrders = preparingOrders.filter(o => o.id !== newRecord.id);
                    readyOrders = readyOrders.filter(o => o.id !== newRecord.id);
                    
                    if (newRecord.status === 'Preparing') {
                        preparingOrders.push(newRecord);
                    } else if (newRecord.status === 'Ready') {
                        readyOrders.push(newRecord);
                        
                        // If it wasn't ready before, it just became ready -> DING DONG
                        if (!previousReadyIds.has(newRecord.id)) {
                            playDingDong();
                            previousReadyIds.add(newRecord.id);
                        }
                    }
                } else {
                    // Completed or Cancelled -> Remove from UI completely
                    preparingOrders = preparingOrders.filter(o => o.id !== newRecord.id);
                    readyOrders = readyOrders.filter(o => o.id !== newRecord.id);
                    previousReadyIds.delete(newRecord.id);
                }
            } else if (eventType === 'DELETE') {
                preparingOrders = preparingOrders.filter(o => o.id !== oldRecord.id);
                readyOrders = readyOrders.filter(o => o.id !== oldRecord.id);
                previousReadyIds.delete(oldRecord.id);
            }
            
            // Sort by created_at
            preparingOrders.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));
            readyOrders.sort((a,b) => new Date(b.created_at) - new Date(a.created_at)); // Recent ready at top
            
            renderLists();
        })
        .subscribe();
}
