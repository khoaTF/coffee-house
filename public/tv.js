// tv.js
let preparingOrders = [];
let readyOrders = [];
let previousReadyIds = new Set();

// Start TV Mode (Fullscreen + Audio Perms)
function startTVMode() {
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
            <div class="queue-item new-item">
                <div>
                    <div style="font-size: 0.9rem; color: #aaa; text-transform: uppercase;">Mã Đơn</div>
                    <div class="order-id-badge">#${shortId}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9rem; color: #aaa; text-transform: uppercase;">Bàn số</div>
                    <div class="table-badge">${order.table_number || '?'}</div>
                </div>
            </div>
        `;
    });

    // Render Ready
    readyOrders.forEach(order => {
        const shortId = order.id.substring(0, 4).toUpperCase();
        readyList.innerHTML += `
            <div class="queue-item new-item">
                <div>
                    <div style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-transform: uppercase;">Mã Đơn</div>
                    <div class="order-id-badge" style="color: #fff;">#${shortId}</div>
                </div>
                <div style="text-align: right;">
                    <div style="font-size: 0.9rem; color: rgba(255,255,255,0.7); text-transform: uppercase;">Bàn số</div>
                    <div class="table-badge">${order.table_number || '?'}</div>
                </div>
            </div>
        `;
    });
}

// Supabase Real-time Sync
function setupRealtimeSubscription() {
    supabase.channel('tv-screen-orders')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, payload => {
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
