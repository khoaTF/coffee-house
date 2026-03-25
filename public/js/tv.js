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
            <div class="w-full xl:w-[calc(50%-0.75rem)] bg-[#1A1814] border-l-4 border-[#D4AF37] border-y border-r border-[#3A3528] rounded-2xl p-4 md:p-5 flex justify-between items-center shadow-soft animate-slideIn">
                <div>
                    <div class="text-[#A89F88] text-xs md:text-sm uppercase tracking-wider font-bold mb-1">Mã Đơn</div>
                    <div class="font-mono text-2xl md:text-3xl font-black text-[#E8DCC4]">#${shortId}</div>
                </div>
                <div class="text-right flex flex-col items-end">
                    <div class="text-[#A89F88] text-xs md:text-sm uppercase tracking-wider font-bold mb-1">Bàn số</div>
                    <div class="bg-[#232018] border border-[#3A3528] text-[#D4AF37] text-3xl md:text-4xl font-black px-4 md:px-5 py-2 rounded-xl min-w-[70px] md:min-w-[80px] text-center">${order.table_number || '?'}</div>
                </div>
            </div>
        `;
    });

    // Render Ready
    readyOrders.forEach(order => {
        const shortId = order.id.substring(0, 4).toUpperCase();
        readyList.innerHTML += `
            <div class="w-full xl:w-[calc(50%-0.75rem)] bg-[#4CAF50]/10 border-l-8 border-[#4CAF50] border-y border-r border-[#4CAF50]/30 rounded-2xl p-5 md:p-6 flex justify-between items-center shadow-[0_8px_30px_rgba(76,175,80,0.2)] animate-slideIn animate-pulseReady">
                <div>
                    <div class="text-[#A89F88] text-sm md:text-base uppercase tracking-wider font-bold mb-1">Mã Đơn</div>
                    <div class="font-mono text-3xl md:text-4xl font-black text-white drop-shadow-md">#${shortId}</div>
                </div>
                <div class="text-right flex flex-col items-end">
                    <div class="text-[#A89F88] text-sm md:text-base uppercase tracking-wider font-bold mb-1">Bàn số</div>
                    <div class="bg-[#4CAF50] text-[#1A1814] text-4xl md:text-5xl font-black px-5 md:px-6 py-2 md:py-3 rounded-2xl min-w-[80px] md:min-w-[90px] text-center shadow-[0_0_20px_rgba(76,175,80,0.5)]">${order.table_number || '?'}</div>
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
