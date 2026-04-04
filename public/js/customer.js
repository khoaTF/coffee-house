// Constants
const queryParams = new URLSearchParams(window.location.search);
const TABLE_NUMBER = queryParams.get('table') || '1';
let menuItems = [];
let cart = [];
let activeOrderId = null; // Locks the menu
let trackedOrderId = null; // Updates the banner
let ingredientStock = {};
let sessionOrders = [];
let customerHistoryOrders = [];
let suggestedItems = [];
let currentComboItem = null;
let currentComboSelections = {};
let currentFeedbackOrderId = null;
let currentOptionsItem = null; // Tracks item being configured in options modal

// translations moved to i18n.js

// Per-table session — reused across tabs/devices as long as table hasn't been cleared
// Using localStorage (not sessionStorage) so auto-transfer works across tabs/QR scans
const sessionKey = 'cafe_session_' + TABLE_NUMBER;
let sessionId = localStorage.getItem(sessionKey) || null;
// Will be resolved in acquireTableLock() from table_sessions DB

let appliedPromo = null;
let currentDiscountAmount = 0;

window.currentCustomerPhone = localStorage.getItem('customerPhone') || null;
window.currentCustomerPoints = 0;
window.loyaltyDiscountApplied = false;
window.upsellShown = false;

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
const loader = document.getElementById('loader');

// Cart DOM
const floatingCart = document.getElementById('floating-cart');
const topCartCount = document.getElementById('cart-count'); 
const dockedCartSummary = document.getElementById('docked-cart-summary');
const cartItemCountDocked = document.getElementById('cart-item-count-docked');
const cartTotalPriceDocked = document.getElementById('cart-total-price-docked');
const viewCartBtnDocked = document.getElementById('view-cart-btn-docked');

// Modal DOM
const cartModal = document.getElementById('cart-modal');
const optionsModal = document.getElementById('options-modal');
const closeOptionsBtn = document.getElementById('close-options-modal');
const confirmOptionsBtn = document.getElementById('confirm-options-btn');
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
    applyAutoDarkMode();
    acquireTableLock();
    // Re-verify stored phone for loyalty points and trigger history fetch
    if (window.currentCustomerPhone) {
        document.getElementById('customer-phone-input').value = window.currentCustomerPhone;
        verifyCustomerPhone(false);
    }
    
    // Fetch advertisement banners
    fetchBanners();
}

async function fetchBanners() {
    try {
        const { data, error } = await supabase
            .from('promotion_banners')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        
        let hasHomeBanner = false;

        data.forEach(banner => {
            if (banner.is_popup) {
                // Show Popup
                const popupImage = document.getElementById('adPopupImage');
                const popupLink = document.getElementById('adPopupLink');
                const popupModal = document.getElementById('adPopupModal');
                
                if (popupImage && popupModal && !sessionStorage.getItem('ad_banner_shown_' + banner.id)) {
                    popupImage.src = banner.image_url;
                    if (banner.target_url) {
                        popupLink.href = banner.target_url;
                        if (!banner.target_url.startsWith('#') && !banner.target_url.startsWith(window.location.origin)) {
                            popupLink.target = '_blank';
                        }
                    } else {
                        popupLink.href = 'javascript:void(0)';
                    }

                    // Show Modal
                    popupModal.classList.remove('hidden');
                    popupModal.classList.add('flex');
                    setTimeout(() => {
                        popupModal.classList.remove('opacity-0');
                    }, 50);
                    
                    // Prevent showing again in current session
                    sessionStorage.setItem('ad_banner_shown_' + banner.id, 'true');
                }
            } else if (!hasHomeBanner) {
                // Home Top Banner (use the first active non-popup banner found)
                const heroImg = document.getElementById('hero-banner-image');
                const heroLink = document.getElementById('hero-banner-link');
                if (heroImg) heroImg.src = banner.image_url;
                if (heroLink && banner.target_url) {
                    heroLink.href = banner.target_url;
                    if (!banner.target_url.startsWith('#') && !banner.target_url.startsWith(window.location.origin)) {
                        heroLink.target = '_blank';
                    }
                }
                hasHomeBanner = true;
            }
        });
    } catch (err) {
        console.error("Error fetching banners:", err);
    }
}

window.closeAdPopup = function() {
    const popupModal = document.getElementById('adPopupModal');
    if (popupModal) {
        popupModal.classList.add('opacity-0');
        setTimeout(() => {
            popupModal.classList.add('hidden');
            popupModal.classList.remove('flex');
        }, 300);
    }
}

// D3 — Auto dark/light mode theo giờ hệ thống
function applyAutoDarkMode() {
    // Only auto-apply if user hasn't manually set a preference
    if (localStorage.getItem('theme_manual')) return;
    const hour = new Date().getHours();
    const isDark = hour >= 18 || hour < 6;
    document.documentElement.classList.toggle('dark', isDark);
}
// Recheck every 30 minutes
setInterval(() => {
    if (!localStorage.getItem('theme_manual')) applyAutoDarkMode();
}, 30 * 60 * 1000);

function getActiveCategory() {
    const activeDesktopNode = document.querySelector('.category-pill.bg-white');
    const activeMobileNode = document.querySelector('.category-pill.bg-gradient-to-br');
    const node = activeDesktopNode || activeMobileNode;
    return node && node.dataset ? node.dataset.category : 'All';
}

function renderCategories(activeCategory = 'All') {
    const categories = ['All', ...new Set(menuItems.map(item => item.category).filter(Boolean))];
    
    const desktopContainer = document.getElementById('desktop-category-filters');
    const mobileContainer = document.getElementById('mobile-category-filters');
    
    const generateHTML = (cat, isDesktop) => {
        const isActive = cat === activeCategory;
        if (isDesktop) {
            return `
                <a href="#" data-category="${cat}" class="category-pill flex items-center space-x-3 px-6 py-3 rounded-xl transition-all ${isActive ? 'bg-white shadow-[0_4px_20px_rgba(88,66,53,0.08)] text-[#994700] font-bold' : 'text-[#1B1C1C]/60 hover:text-[#1B1C1C] hover:bg-[#1B1C1C]/5 font-medium'}">
                    <span>${cat === 'All' ? 'Tất cả' : cat}</span>
                </a>
            `;
        } else {
            return `
                <button data-category="${cat}" class="category-pill whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm transition-all ${isActive ? 'bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white font-bold shadow-md shadow-[#FF7A00]/20' : 'bg-[#FCF9F8] dark:bg-[#1B1C1C] text-on-surface-variant font-medium border border-outline-variant/20'}">
                    ${cat === 'All' ? 'Tất cả' : cat}
                </button>
            `;
        }
    };

    if (desktopContainer) {
        desktopContainer.innerHTML = categories.map(cat => generateHTML(cat, true)).join('');
    }
    if (mobileContainer) {
        mobileContainer.innerHTML = categories.map(cat => generateHTML(cat, false)).join('');
    }

    // Render logic for new Category Modal (Mobile)
    const modalContainer = document.getElementById('category-modal-list');
    if (modalContainer) {
        modalContainer.innerHTML = categories.map(cat => {
            const isActive = cat === activeCategory;
            return `
                <button data-category="${cat}" class="category-pill w-full flex items-center justify-between px-6 py-4 rounded-2xl transition-all ${isActive ? 'bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white font-bold shadow-md shadow-[#FF7A00]/20' : 'bg-[#FCF9F8] dark:bg-[#1B1C1C] text-on-surface-variant font-semibold border border-outline-variant/20 hover:border-[#994700]/30'}">
                    <span class="text-lg">${cat === 'All' ? 'Tất cả món' : cat}</span>
                    <span class="material-symbols-outlined ${isActive ? 'text-white' : 'text-on-surface-variant/50'}">chevron_right</span>
                </button>
            `;
        }).join('');
    }

    // Attach listener
    document.querySelectorAll('.category-pill').forEach(pill => {
        pill.addEventListener('click', (e) => {
            e.preventDefault();
            const selectedCat = e.currentTarget.dataset.category || e.currentTarget.getAttribute('data-category');
            renderCategories(selectedCat);
            renderMenu(selectedCat);
            // Close modal if clicked inside category modal
            if (e.currentTarget.closest('#category-modal-list')) {
                closeCategoryModal();
                // Smooth scroll to top of menu
                document.getElementById('menu-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Category Modal Functions
function openCategoryModal() {
    const catModal = document.getElementById('category-modal');
    if (catModal) catModal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}

function closeCategoryModal() {
    const catModal = document.getElementById('category-modal');
    if (catModal) catModal.classList.remove('active');
    // Don't show fab yet if another modal is active, but keeping simple for now
    if (!document.querySelector('.cart-modal.active')) {
        const fab = document.querySelector('.fab-container');
        if (fab) fab.style.display = 'flex';
    }
}

// ---- Table Session (via Supabase table_sessions) ----
// Session is tied to the TABLE, not the browser tab.
// Closing the tab and re-scanning QR will rejoin the same session.
// Only admin "Dọn bàn" clears the session.
async function acquireTableLock() {
    const STALE_THRESHOLD = 2 * 60 * 60 * 1000; // 2 hours = cafe session timeout
    try {
        // --- AUTO-TRANSFER: Detect if customer has an active session at a DIFFERENT table ---
        const transferred = await checkAutoTransfer();
        if (transferred) {
            // Session was transferred to this table — proceed normally
        }

        const { data: existing } = await supabase
            .from('table_sessions')
            .select('session_id, last_seen')
            .eq('table_number', TABLE_NUMBER)
            .maybeSingle();

        if (existing) {
            const lastSeen = new Date(existing.last_seen);
            const ageMs = Date.now() - lastSeen.getTime();

            if (ageMs < STALE_THRESHOLD) {
                // Active session exists — JOIN it (reuse session_id)
                sessionId = existing.session_id;
                localStorage.setItem(sessionKey, sessionId);
                // Refresh heartbeat
                await supabase.from('table_sessions')
                    .update({ last_seen: new Date().toISOString() })
                    .eq('table_number', TABLE_NUMBER);
            } else {
                // Stale session — claim table with new session
                sessionId = 'sess_' + TABLE_NUMBER + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                localStorage.setItem(sessionKey, sessionId);
                await supabase.from('table_sessions')
                    .update({ session_id: sessionId, last_seen: new Date().toISOString() })
                    .eq('table_number', TABLE_NUMBER);
            }
        } else {
            // No session on this table — ALWAYS create fresh
            // (Old localStorage value may be from a transferred/cleared session)
            sessionId = 'sess_' + TABLE_NUMBER + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem(sessionKey, sessionId);
            await supabase.from('table_sessions').insert([{
                table_number: TABLE_NUMBER,
                session_id: sessionId,
                device_info: navigator.userAgent.slice(0, 100)
            }]);
        }

        // Heartbeat every 60s to keep session alive
        setInterval(async () => {
            await supabase.from('table_sessions')
                .update({ last_seen: new Date().toISOString() })
                .eq('table_number', TABLE_NUMBER)
                .eq('session_id', sessionId);
        }, 60 * 1000);

        // Do NOT release lock on tab close — only admin "Dọn bàn" clears session

        // Proceed to load menu
        fetchMenu();
        attachEventListeners();
        setupRealtimeSubscription();

    } catch (e) {
        console.warn('Table session: table_sessions may not exist, skipping.', e.message);
        if (!sessionId) {
            sessionId = 'sess_' + TABLE_NUMBER + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            localStorage.setItem(sessionKey, sessionId);
        }
        fetchMenu();
        attachEventListeners();
        setupRealtimeSubscription();
    }
}

// --- Auto-Transfer: customer scans different table QR while having active session elsewhere ---
async function checkAutoTransfer() {
    try {
        // Scan localStorage for cafe_session_* keys from OTHER tables
        let oldTableNum = null;
        let oldSessionId = null;

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('cafe_session_') && key !== sessionKey) {
                const tNum = key.replace('cafe_session_', '');
                const sId = localStorage.getItem(key);
                if (sId && tNum !== TABLE_NUMBER) {
                    oldTableNum = tNum;
                    oldSessionId = sId;
                    break;
                }
            }
        }

        if (!oldTableNum || !oldSessionId) return false;

        // Check if old session has active (unpaid) orders
        const { data: oldOrders } = await supabase
            .from('orders')
            .select('id, status, is_paid')
            .eq('session_id', oldSessionId)
            .in('status', ['Pending', 'Preparing', 'Ready', 'Completed'])
            .eq('is_paid', false);

        if (!oldOrders || oldOrders.length === 0) {
            // No active orders at old table — just clean up old key
            localStorage.removeItem('cafe_session_' + oldTableNum);
            return false;
        }

        // GAP 1: Check if target table already has an ACTIVE session from someone else
        const { data: targetSession } = await supabase
            .from('table_sessions')
            .select('session_id')
            .eq('table_number', TABLE_NUMBER)
            .maybeSingle();

        if (targetSession && targetSession.session_id !== oldSessionId) {
            // Target table is occupied by another customer
            await customerConfirm(
                `Bàn ${TABLE_NUMBER} đang có người sử dụng.\nVui lòng chọn bàn trống khác hoặc gọi nhân viên để được hỗ trợ.`
            );
            localStorage.removeItem('cafe_session_' + oldTableNum);
            return false;
        }

        // Ask customer if they want to transfer
        const wantTransfer = await customerConfirm(
            `Bạn đang có ${oldOrders.length} đơn hàng ở Bàn ${oldTableNum}.\nChuyển tất cả sang Bàn ${TABLE_NUMBER}?`
        );

        if (wantTransfer) {
            // GAP 5: Batch transfer all orders (not sequential loop)
            const orderIds = oldOrders.map(o => o.id);
            await supabase.from('orders')
                .update({ table_number: TABLE_NUMBER.toString() })
                .in('id', orderIds);
            // Transfer table_session
            await supabase.from('table_sessions')
                .update({ table_number: TABLE_NUMBER.toString(), last_seen: new Date().toISOString() })
                .eq('session_id', oldSessionId);

            // Reuse old session ID at new table
            sessionId = oldSessionId;
            localStorage.setItem(sessionKey, sessionId);
            localStorage.removeItem('cafe_session_' + oldTableNum);

            console.log(`Auto-transferred ${oldOrders.length} orders from Table ${oldTableNum} → Table ${TABLE_NUMBER}`);
            return true;
        } else {
            // Customer chose not to transfer — clean up old key, start fresh
            localStorage.removeItem('cafe_session_' + oldTableNum);
            return false;
        }
    } catch (e) {
        console.warn('Auto-transfer check failed:', e.message);
        return false;
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
            <h4 style="color: var(--text-main); margin-bottom: 8px;">Bàn ${TABLE_NUMBER} đang được sử dụng</h4>
            <p style="color: var(--text-muted); margin-bottom: 24px;">Bàn này đang có khách. Vui lòng liên hệ nhân viên hoặc thử lại sau.</p>
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
        const [prodRes, stockRes, ordersRes, settingsRes] = await Promise.all([
            supabase.from('products').select('*').eq('is_available', true),
            supabase.from('ingredients').select('id, stock'),
            supabase.from('orders').select('*').eq('session_id', sessionId).order('created_at', { ascending: false }).limit(10),
            supabase.from('store_settings').select('open_time, close_time, is_open_override, store_name').eq('id', 1).maybeSingle()
        ]);

        if (prodRes.error) throw prodRes.error;
        if (stockRes.error) throw stockRes.error;
        if (ordersRes.error) throw ordersRes.error;

        // D2 — Kiểm tra giờ mở/đóng cửa
        const storeSettings = settingsRes.data || {};
        checkStoreHours(storeSettings);

        // Map menu items properly id to _id for backward compatibility with existing UI code
        const now = new Date();
        menuItems = prodRes.data.map(p => {
            let activePrice = p.price;
            let isPromo = false;
            if (p.promotional_price && p.promo_start_time && p.promo_end_time) {
                const start = new Date(p.promo_start_time);
                const end = new Date(p.promo_end_time);
                if (now >= start && now <= end) {
                    activePrice = p.promotional_price;
                    isPromo = true;
                }
            }
            return {
                ...p, 
                _id: p.id, 
                imageUrl: p.image_url,
                originalPrice: p.price,
                price: activePrice,
                isPromo: isPromo,
                isBestSeller: p.is_best_seller
            };
        });
        
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
        renderCategories('All');
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
    const sqDesktop = document.getElementById('menu-search-desktop')?.value || '';
    const sqMobile = document.getElementById('menu-search-mobile')?.value || '';
    const searchQuery = (sqDesktop || sqMobile).toLowerCase();

    const filteredItems = menuItems.filter(item => {
        // If user is searching, we should search across ALL categories (ignore category filter)
        const matchesCategory = !!searchQuery || category === 'All' || item.category === category;
        const matchesSearch = !searchQuery || 
                               item.name.toLowerCase().includes(searchQuery) || 
                               (item.description && item.description.toLowerCase().includes(searchQuery));
        return matchesCategory && matchesSearch;
    });

    const emptyState = document.getElementById('empty-state');
    if(filteredItems.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        menuContainer.style.display = 'none';
        return;
    } else {
        if (emptyState) emptyState.style.display = 'none';
        menuContainer.style.display = 'grid';
    }

    filteredItems.forEach((item, index) => {
        // Calculate total quantity of this product ID in cart (regardless of options)
        const cartItemTotalQty = cart.filter(c => c._id === item._id).reduce((sum, c) => sum + c.quantity, 0);
        
        const canAddMore = getAvailableToAdd(item) > 0;
        const isOutOfStock = !canAddMore && cartItemTotalQty === 0;
        const hasActiveOrder = activeOrderId !== null;
        const disableAddBtn = isOutOfStock || hasActiveOrder || !canAddMore;

        const card = document.createElement('article');
        card.setAttribute('data-product-id', item._id);
        card.className = `bg-[#FCF9F8] dark:bg-[#1B1C1B] rounded-[24px] overflow-hidden group cursor-pointer active:scale-[0.98] transition-all hover:bg-white dark:hover:bg-[#2A2B2B] ${isOutOfStock ? 'opacity-60 saturate-50' : ''}`;
        
        const isBestSeller = !!item.isBestSeller;
        const hasOptions = item.options && item.options.length > 0;
        const hasPromo = !!item.isPromo;

        card.innerHTML = `
            <div class="img-wrap aspect-[4/3] bg-[#F0EDEC] dark:bg-slate-800 relative overflow-hidden">
                <img src="${item.imageUrl}" alt="${window.escapeHTML(item.name)}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-full h-full flex items-center justify-center p-6 bg-[#F0EDEC] dark:bg-slate-800\\'><img src=\\'/images/bunny_logo.png\\' alt=\\'\\' class=\\'w-full h-full object-contain opacity-30 group-hover:scale-105 transition-transform duration-500\\'></div>';">
                ${isOutOfStock ? '<div class="oos-overlay absolute inset-0 bg-black/40 flex items-center justify-center z-10"><span class="bg-[#ba1a1a] text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">Hết hàng</span></div>' : ''}
                ${isBestSeller && !isOutOfStock ? `
                <div class="absolute top-3 left-3 bg-white/90 dark:bg-[#1B1C1B]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-[#FF7A00] shadow-sm flex items-center gap-1 z-10">
                    <i class="fa-solid fa-fire text-[#FF7A00] text-[12px]"></i> Bán chạy
                </div>` : ''}
                ${hasPromo && !isOutOfStock ? `
                <div class="absolute bottom-3 right-3 bg-[#4ade80]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1 z-10">
                    <i class="fa-solid fa-tag text-[12px]"></i> KM
                </div>` : ''}
            </div>
            <div class="p-4 flex flex-col h-[calc(100%-75%)] min-h-[150px]">
                <div class="flex justify-between items-start gap-2 mb-1">
                    <h3 class="font-bold text-[#1b1c1b] dark:text-[#fcf9f8] leading-tight">${window.escapeHTML(item.name)}</h3>
                </div>
                <div class="mb-3">
                    ${hasPromo ? `
                        <span class="text-sm line-through text-[#8b949e] mr-1">${item.originalPrice.toLocaleString('vi-VN')}đ</span>
                        <span class="font-bold text-[#FF7A00] whitespace-nowrap">${item.price.toLocaleString('vi-VN')}đ</span>
                    ` : `
                        <span class="font-bold text-[#FF7A00] whitespace-nowrap">${item.price.toLocaleString('vi-VN')}đ</span>
                    `}
                </div>
                <p class="text-sm text-[#584235] dark:text-[#E0C0AF] line-clamp-2 mb-4 leading-relaxed flex-grow">${window.escapeHTML(item.description)}</p>
                
                <div class="action-btn-container flex items-center justify-between mt-auto">
                    ${(cartItemTotalQty > 0) ? `
                    <div class="flex items-center gap-3 bg-white dark:bg-[#2A2B2B] rounded-full p-1 w-full shadow-sm" onclick="event.stopPropagation()">
                      <button class="w-10 h-10 rounded-full bg-[#F0EDEC] dark:bg-[#1B1C1B] text-[#1b1c1b] dark:text-white flex items-center justify-center active:scale-95 transition-transform" onclick="updateCart('${item._id}', -1)">
                        <i class="fa-solid fa-minus text-[16px]"></i>
                      </button>
                      <input type="number" min="0" 
                             class="font-bold text-[#1b1c1b] dark:text-white text-base flex-grow text-center bg-transparent w-full focus:outline-none rounded no-spinners" 
                             style="-moz-appearance: textfield; appearance: textfield;" 
                             value="${cartItemTotalQty}" 
                             ${hasOptions ? `readonly onclick="openOptionsModal('${item._id}')"` : ''}
                             onchange="if(!${hasOptions}) setCartQuantity('${item._id}', this.value)" 
                             onfocus="this.select()" />
                      <button class="w-10 h-10 rounded-full bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform" ${disableAddBtn ? "disabled style='opacity:0.5;'" : ""} onclick="updateCart('${item._id}', 1)">
                        <i class="fa-solid fa-plus text-[16px]"></i>
                      </button>
                    </div>
                    ` : `
                    <button class="w-full bg-[#1b1c1b] dark:bg-[#F0EDEC] text-white dark:text-[#1b1c1b] font-bold py-2.5 rounded-full hover:bg-black active:scale-95 transition-transform flex items-center justify-center gap-2" 
                        onclick="event.stopPropagation(); updateCart('${item._id}', 1)" ${disableAddBtn ? "disabled style='opacity:0.5;background:#888;cursor:not-allowed;color:white;'" : ""}>
                      <i class="fa-solid ${hasOptions ? 'fa-sliders' : 'fa-plus'} text-[16px]"></i>
                      ${hasOptions ? 'Tùy chọn' : 'Thêm vào giỏ'}
                    </button>
                    `}
                </div>
            </div>
        `;
        
        // Also make card clicking add to cart if not optioned and not already out of stock
        card.onclick = () => {
             const currentCartItemTotalQty = cart.filter(c => c._id === item._id).reduce((sum, c) => sum + c.quantity, 0);
             const currentCanAddMore = getAvailableToAdd(item) > 0;
             const currentIsOutOfStock = !currentCanAddMore && currentCartItemTotalQty === 0;
             const currentHasActiveOrder = activeOrderId !== null;
             const currentDisableAddBtn = currentIsOutOfStock || currentHasActiveOrder || !currentCanAddMore;

             if (currentDisableAddBtn) return;
             if (hasOptions) openOptionsModal(item);
             else updateCart(item._id, 1);
        };

        menuContainer.appendChild(card);
    });
};

function updateMenuCardsUI() {
    const cards = document.querySelectorAll('article[data-product-id]');
    cards.forEach(card => {
        const id = card.getAttribute('data-product-id');
        const item = menuItems.find(i => i._id === id);
        if (!item) return;

        const cartItemTotalQty = cart.filter(c => c._id === item._id).reduce((sum, c) => sum + c.quantity, 0);
        const canAddMore = getAvailableToAdd(item) > 0;
        const isOutOfStock = !canAddMore && cartItemTotalQty === 0;
        const hasActiveOrder = activeOrderId !== null;
        const disableAddBtn = isOutOfStock || hasActiveOrder || !canAddMore;
        const hasOptions = item.options && item.options.length > 0;

        const lastQty = parseInt(card.getAttribute('data-last-qty') || '-1');
        const lastState = card.getAttribute('data-last-state');
        const currentState = `${isOutOfStock}-${hasActiveOrder}-${canAddMore}`;
        
        if (lastQty === cartItemTotalQty && lastState === currentState) {
            return; // Skip DOM reflow if state is unchanged!
        }
        card.setAttribute('data-last-qty', cartItemTotalQty);
        card.setAttribute('data-last-state', currentState);

        // Update card styling
        if (isOutOfStock) {
            card.classList.add('opacity-60', 'saturate-50');
            let oosOverlay = card.querySelector('.oos-overlay');
            if(!oosOverlay) {
                const imgWrap = card.querySelector('.img-wrap');
                if(imgWrap) {
                    imgWrap.insertAdjacentHTML('beforeend', '<div class="oos-overlay absolute inset-0 bg-black/40 flex items-center justify-center z-10"><span class="bg-[#ba1a1a] text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">Hết hàng</span></div>');
                }
            }
        } else {
            card.classList.remove('opacity-60', 'saturate-50');
            let oosOverlay = card.querySelector('.oos-overlay');
            if(oosOverlay) oosOverlay.remove();
        }

        // Update button container
        const actionBtnContainer = card.querySelector('.action-btn-container');
        if (actionBtnContainer) {
            if (cartItemTotalQty > 0) {
                actionBtnContainer.innerHTML = `
                    <div class="flex items-center gap-3 bg-white dark:bg-[#2A2B2B] rounded-full p-1 w-full shadow-sm" onclick="event.stopPropagation()">
                      <button class="w-10 h-10 rounded-full bg-[#F0EDEC] dark:bg-[#1B1C1B] text-[#1b1c1b] dark:text-white flex items-center justify-center active:scale-95 transition-transform" onclick="updateCart('${item._id}', -1)">
                        <i class="fa-solid fa-minus text-[16px]"></i>
                      </button>
                      <input type="number" min="0" 
                             class="font-bold text-[#1b1c1b] dark:text-white text-base flex-grow text-center bg-transparent w-full focus:outline-none rounded no-spinners" 
                             style="-moz-appearance: textfield; appearance: textfield;" 
                             value="${cartItemTotalQty}" 
                             ${hasOptions ? `readonly onclick="openOptionsModal('${item._id}')"` : ''}
                             onchange="if(!${hasOptions}) setCartQuantity('${item._id}', this.value)" 
                             onfocus="this.select()" />
                      <button class="w-10 h-10 rounded-full bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white flex items-center justify-center shadow-md active:scale-95 transition-transform" ${disableAddBtn ? "disabled style='opacity:0.5;'" : ""} onclick="updateCart('${item._id}', 1)">
                        <i class="fa-solid fa-plus text-[16px]"></i>
                      </button>
                    </div>
                `;
            } else {
                actionBtnContainer.innerHTML = `
                    <button class="w-full bg-[#1b1c1b] dark:bg-[#F0EDEC] text-white dark:text-[#1b1c1b] font-bold py-2.5 rounded-full hover:bg-black active:scale-95 transition-transform flex items-center justify-center gap-2" 
                        onclick="event.stopPropagation(); updateCart('${item._id}', 1)" ${disableAddBtn ? "disabled style='opacity:0.5;background:#888;cursor:not-allowed;color:white;'" : ""}>
                      <i class="fa-solid ${hasOptions ? 'fa-sliders' : 'fa-plus'} text-[16px]"></i>
                      ${hasOptions ? 'Tùy chọn' : 'Thêm vào giỏ'}
                    </button>
                `;
            }
        }
    });
}

function updateCartUI() {
    updateMenuCardsUI();
    const totalQty = cart.reduce((sum, item) => sum + item.quantity, 0);
    const totalPrice = cart.reduce((sum, item) => {
        const itemOptionsPrice = (item.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0);
        return sum + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);

    // Update Top App Bar Cart
    if (topCartCount) {
        if (totalQty > 0) {
            topCartCount.textContent = totalQty;
            topCartCount.classList.remove('hidden');
        } else {
            topCartCount.classList.add('hidden');
        }
    }

    // Update Docked Cart
    if (dockedCartSummary) {
        if (totalQty > 0) {
            dockedCartSummary.classList.remove('hidden');
            if (cartItemCountDocked) cartItemCountDocked.textContent = totalQty;
            if (cartTotalPriceDocked) cartTotalPriceDocked.textContent = totalPrice.toLocaleString('vi-VN') + 'đ';
        } else {
            dockedCartSummary.classList.add('hidden');
            closeModal(); // Close modal if emptying cart
        }
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
                item.selectedOptions.map(o => `+ ${window.escapeHTML(o.choiceName)}`).join(', ') + 
                '</div>';
        }

        const row = document.createElement('div');
        row.className = 'cart-item';
        row.innerHTML = `
            <div class="cart-item-info">
                <div class="cart-item-title leading-tight mb-1" style="font-family: 'Plus Jakarta Sans', sans-serif;">${window.escapeHTML(item.name)}</div>
                ${optionsHtml}
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



// UI Triggers
function openModal() { 
    cartModal.classList.add('active'); 
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
        
    // Scroll cart modal body to the top (order summary)
    const modalBody = cartModal.querySelector('.cart-modal-body');
    if (modalBody) {
        modalBody.scrollTop = 0;
    }
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

function isComboItem(item) {
    return item.is_combo === true && Array.isArray(item.combo_items) && item.combo_items.length > 0;
}

function openOptionsModal(itemOrId) {
    const item = typeof itemOrId === 'string' ? menuItems.find(i => i._id === itemOrId || i.id === itemOrId) : itemOrId;
    if (!item) return;

    if (isComboItem(item)) {
        openComboModal(item);
        return;
    }

    currentOptionsItem = item;
    document.getElementById('options-modal-title').textContent = item.name;
    const container = document.getElementById('options-container');
    container.innerHTML = '';
    
    item.options.forEach((opt, optIndex) => {
        const optName = opt.name || opt.optionName;
        const group = document.createElement('div');
        group.className = 'option-group mb-3';
        group.innerHTML = `<h3 style="font-size: 1.1rem; margin-bottom: 10px; font-weight: bold; color: var(--text-main);">${window.escapeHTML(optName)}</h3>`;
        
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
                    <input type="radio" name="opt_${optIndex}" value="${window.escapeHTML(choiceName)}" data-price="${choice.priceExtra}" ${isChecked} style="accent-color: var(--primary);">
                    <span>${window.escapeHTML(choiceName)}</span>
                </div>
                <span class="text-muted">${choice.priceExtra > 0 ? '+' + choice.priceExtra.toLocaleString('vi-VN') + ' đ' : ''}</span>
            `;
            group.appendChild(row);
        });
        container.appendChild(group);
    });
    
    if (optionsModal) optionsModal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}

function closeOptionsModal() { 
    if (optionsModal) optionsModal.classList.remove('active'); 
    currentOptionsItem = null;
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}


// Event Listeners
function attachEventListeners() {
    if (floatingCart) floatingCart.addEventListener('click', openModal);
    if (viewCartBtnDocked) viewCartBtnDocked.addEventListener('click', openModal);

    const mobileMyOrdersBtn = document.getElementById('mobile-my-orders-btn');
    if (mobileMyOrdersBtn) mobileMyOrdersBtn.addEventListener('click', openHistoryModal);

    closeModalBtn.addEventListener('click', closeModal);
    myOrdersBtn.addEventListener('click', openHistoryModal);
    closeHistoryModalBtn.addEventListener('click', closeHistoryModal);
    closeOptionsBtn.addEventListener('click', closeOptionsModal);

    // Search input listener
    const searchHandler = () => {
        const activeCategory = getActiveCategory();
        renderMenu(activeCategory);
    };
    const sDesktop = document.getElementById('menu-search-desktop');
    const sMobile = document.getElementById('menu-search-mobile');
    if (sDesktop) sDesktop.addEventListener('input', searchHandler);
    if (sMobile) sMobile.addEventListener('input', searchHandler);

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
        selectedOptions: item.selectedOptions || [],
        recipe: item.recipe || []
    }));
    
    // Calculate inventory reductions based on cart items and their recipes
    const reductions = {};
    cart.forEach(item => {
        if (item.recipe && Array.isArray(item.recipe)) {
            item.recipe.forEach(ri => {
                const iId = ri.ingredientId || ri.ingredient_id;
                if (!reductions[iId]) reductions[iId] = 0;
                reductions[iId] += (ri.quantity * item.quantity);
            });
        }
    });

    const orderNote = document.getElementById('order-note') ? document.getElementById('order-note').value : '';
    const earnedPts = Math.floor(Math.max(0, totalPrice) / 1000);

    const orderData = {
        table_number: TABLE_NUMBER.toString(),
        session_id: sessionId,
        customer_phone: window.currentCustomerPhone,
        earned_points: earnedPts,
        items: formattedItems,
        reductions: reductions,
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
        // ✅ STOCK PRE-CHECK: Fetch fresh stock from DB to avoid race conditions
        const ingredientIds = [...new Set(
            cart.flatMap(item => (item.recipe || []).map(r => r.ingredientId || r.ingredient_id).filter(Boolean))
        )];
        if (ingredientIds.length > 0) {
            const { data: freshStock } = await supabase.from('ingredients').select('id, name, stock').in('id', ingredientIds);
            if (freshStock && freshStock.length > 0) {
                // Update local cache
                freshStock.forEach(i => { ingredientStock[i.id] = i.stock; });
                // Validate each cart item
                const outOfStockItems = [];
                for (const item of cart) {
                    const recipe = item.recipe || [];
                    for (const req of recipe) {
                        const ingrId = req.ingredientId || req.ingredient_id;
                        const needed = (req.quantity || req.amount || 0) * item.quantity;
                        const available = ingredientStock[ingrId] || 0;
                        if (needed > available) {
                            const ingrInfo = freshStock.find(i => i.id === ingrId);
                            outOfStockItems.push(`• ${item.name} (thiếu: ${ingrInfo?.name || 'nguyên liệu'})`);
                            break;
                        }
                    }
                }
                if (outOfStockItems.length > 0) {
                    // Reset buttons
                    if(checkoutCashBtn) { checkoutCashBtn.disabled = false; checkoutCashBtn.innerHTML = '<i class="fa-solid fa-money-bill-wave"></i> Thanh toán tại quầy'; }
                    if(checkoutTransferBtn) { checkoutTransferBtn.disabled = false; checkoutTransferBtn.innerHTML = '<i class="fa-solid fa-qrcode"></i> Chuyển khoản (Duyệt TĐ)'; }
                    const btnConfirmPayment = document.getElementById('confirm-payment-btn');
                    if(btnConfirmPayment) { btnConfirmPayment.innerHTML = '<i class="fa-solid fa-check-circle"></i> Tôi đã chuyển khoản xong'; btnConfirmPayment.disabled = false; }
                    // Update menu UI
                    renderMenu(getActiveCategory());
                    await customerAlert(`❌ Một số món đã hết nguyên liệu:\n${outOfStockItems.join('\n')}\n\nVui lòng cập nhật lại giỏ hàng.`);
                    return;
                }
            }
        }

        const { data: newOrderId, error } = await supabase.rpc('place_order_and_deduct_inventory', { payload: orderData });
        if (error) throw error;
        
        const savedOrder = { ...orderData, id: newOrderId, _id: newOrderId, createdAt: new Date().toISOString(), totalPrice: orderData.total_price, orderNote: orderData.order_note };
        
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
        showRetryToast('Xin lỗi, không thể tạo đơn hàng! Mã lỗi: ' + errDetail, 'error');
        
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
    document.getElementById('step-pending')?.classList.add('active');
    
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
        let dbType = type === 'checkout' ? 'bill' : 'staff';
        const { error } = await supabase.from('staff_requests').insert([{
            table_number: TABLE_NUMBER.toString(),
            type: dbType,
            status: 'pending'
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
function customerConfirm(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const body = document.getElementById('confirmModalBody');
        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');

        if (!modal || !body || !okBtn || !cancelBtn) { console.error("Confirm modal not found"); return resolve(false); }

        body.textContent = message;
        // Show modal natively
        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        const closeModal = (result) => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            resolve(result);
        };

        newOk.addEventListener('click', () => closeModal(true), { once: true });
        newCancel.addEventListener('click', () => closeModal(false), { once: true });
    });
}

function closeConfirmModal() {
    const modal = document.getElementById('confirmModal');
    if(modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// Custom alert for mobile friendliness
function customerAlert(message) {
    return new Promise((resolve) => {
        const modal = document.getElementById('confirmModal');
        const body = document.getElementById('confirmModalBody');
        const okBtn = document.getElementById('confirmModalOk');
        const cancelBtn = document.getElementById('confirmModalCancel');
        
        if (!modal || !body || !okBtn || !cancelBtn) return resolve(true);

        body.textContent = message;
        
        const titleEl = modal.querySelector('h5');
        const prevTitleHTML = titleEl.innerHTML;
        titleEl.innerHTML = '<i class="fa-solid fa-circle-info text-[#FF7A00] mr-2"></i>Thông báo';

        modal.classList.remove('hidden');
        modal.classList.add('flex');

        const newOk = okBtn.cloneNode(true);
        const newCancel = cancelBtn.cloneNode(true);
        okBtn.parentNode.replaceChild(newOk, okBtn);
        cancelBtn.parentNode.replaceChild(newCancel, cancelBtn);

        newOk.className = 'bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white py-2.5 rounded-full font-bold active:scale-95 transition-transform shadow-lg shadow-[#FF7A00]/20 col-span-2';
        newOk.textContent = 'Đóng';
        newCancel.style.display = 'none';

        const closeModal = () => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
            newOk.className = 'bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white py-2.5 rounded-full font-bold active:scale-95 transition-transform shadow-lg shadow-[#FF7A00]/20';
            newOk.textContent = 'Đồng ý';
            newCancel.style.display = 'block';
            titleEl.innerHTML = prevTitleHTML;
            resolve(true);
        };

        newOk.addEventListener('click', () => closeModal(), { once: true });
    });
}

// Cancel Order (Khách hủy — chỉ cho phép khi Pending)
window.cancelOrder = async (orderId) => {
    const confirmed = await customerConfirm('Hủy đơn hàng này?\nNguyên liệu sẽ được hoàn lại kho tự động.');
    if (!confirmed) return;
    try {
        // Fetch order items + recipe to restore inventory
        const { data: orderRow } = await supabase.from('orders').select('items, status').eq('id', orderId).maybeSingle();
        if (!orderRow || orderRow.status !== 'Pending') {
            await customerAlert('Đơn hàng đang được xử lý, không thể hủy.');
            return;
        }
        const { error } = await supabase.from('orders').update({ status: 'Cancelled' }).eq('id', orderId);
        if (error) throw error;

        // Restore inventory
        const items = orderRow.items || [];
        for (const item of items) {
            const recipe = item.recipe || [];
            if (!Array.isArray(recipe) || recipe.length === 0) continue;
            const qty = item.quantity || 1;
            for (const ingr of recipe) {
                const ingrId = ingr.ingredient_id || ingr.id;
                if (!ingrId) continue;
                const restoreAmt = (ingr.amount || ingr.quantity || 0) * qty;
                if (restoreAmt <= 0) continue;
                const { data: cur } = await supabase.from('ingredients').select('stock').eq('id', ingrId).maybeSingle();
                if (cur) await supabase.from('ingredients').update({ stock: (cur.stock || 0) + restoreAmt }).eq('id', ingrId);
            }
        }

        // Update local session
        const idx = sessionOrders.findIndex(o => o._id === orderId || o.id === orderId);
        if (idx > -1) { sessionOrders[idx].status = 'Cancelled'; }
        renderHistoryModal();
        await customerAlert('Đã hủy đơn hàng thành công.');
    } catch (e) {
        console.error('Cancel order error', e);
        await customerAlert('Lỗi khi hủy đơn hàng. Vui lòng thử lại.');
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
        const activeCategory = getActiveCategory();
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
            // D5 — Show estimated wait time if kitchen set it
            const estMins = updatedOrder.estimated_minutes;
            liveStatusEl.textContent = estMins ? `Đang làm — khoảng ${estMins} phút` : 'Đang làm';
            liveStatusEl.className = 'text-warning banner-status';
            
            // Update timeline
            document.getElementById('step-pending')?.classList.replace('active', 'completed');
            document.getElementById('line-1')?.classList.add('active');
            document.getElementById('step-preparing')?.classList.add('active');
            
            // User requested: Unlock the menu for a new order when it hits Preparing
            if (activeOrderId === updatedOrder._id) {
                activeOrderId = null;
                playNotificationSound('success');
                customerAlert(`Bếp đã nhận đơn và đang làm món! Bạn có thể tiếp tục đặt thêm.`);
                const activeCategory = getActiveCategory();
                renderMenu(activeCategory);
            }
            
        } else if (updatedOrder.status === 'Ready') {
            liveStatusEl.textContent = 'Đã xong';
            liveStatusEl.className = 'text-success banner-status';
            
            // Update timeline
            document.getElementById('step-preparing')?.classList.replace('active', 'completed');
            document.getElementById('line-1')?.classList.add('completed');
            document.getElementById('line-2')?.classList.add('active');
            document.getElementById('step-ready')?.classList.add('active');
            
        } else if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Cancelled') {
            if (activeOrderId === updatedOrder._id) {
                activeOrderId = null;
                // Re-render menu to unlock + buttons
                const activeCategory = getActiveCategory();
                renderMenu(activeCategory);
            }
            if (trackedOrderId === updatedOrder._id) {
                if(updatedOrder.status === 'Completed') {
                    liveStatusEl.textContent = 'Hoàn thành';
                    liveStatusEl.className = 'text-muted banner-status';
                    
                    document.getElementById('step-ready')?.classList.replace('active', 'completed');
                    document.getElementById('line-2')?.classList.add('completed');
                    
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

// Add to Cart Logic
window.setCartQuantity = (productIdOrCartKey, newQty) => {
    newQty = parseInt(newQty);
    if (isNaN(newQty) || newQty < 0) return;

    if (!productIdOrCartKey.includes('|')) {
        const item = menuItems.find(i => i._id === productIdOrCartKey);
        if(!item) return;
        
        if (item.options && item.options.length > 0) {
            updateCartUI();
            return; 
        }

        const existingIndex = cart.findIndex(c => c._id === productIdOrCartKey);
        const currentQty = existingIndex > -1 ? cart[existingIndex].quantity : 0;
        const available = getAvailableToAdd(item);
        
        if (newQty > currentQty + available) {
            newQty = currentQty + available;
            customerAlert("Đã đạt giới hạn tối đa có thể đặt cho món này!");
        }

        if (existingIndex > -1) {
            if (newQty === 0) {
                cart.splice(existingIndex, 1);
            } else {
                cart[existingIndex].quantity = newQty;
            }
        } else if (newQty > 0) {
            cart.push({ ...item, cartKey: productIdOrCartKey, quantity: newQty, selectedOptions: [] });
        }
    } else {
        const existingIndex = cart.findIndex(c => c.cartKey === productIdOrCartKey);
        if (existingIndex > -1) {
            const currentItemFromCart = cart[existingIndex];
            const item = menuItems.find(i => i._id === currentItemFromCart._id);
            const available = getAvailableToAdd(item);
            
            if (newQty > currentItemFromCart.quantity + available) {
                newQty = currentItemFromCart.quantity + available;
                customerAlert("Đã đạt giới hạn tối đa có thể đặt cho món này!");
            }
            
            if (newQty === 0) {
                cart.splice(existingIndex, 1);
            } else {
                cart[existingIndex].quantity = newQty;
            }
        }
    }

    updateCartUI();
};

window.updateCart = (productIdOrCartKey, change) => {
    // If we're adding from the menu (using raw productId)
    if (!productIdOrCartKey.includes('|')) {
        const item = menuItems.find(i => i._id === productIdOrCartKey);
        if(!item) return;
        
        if (change > 0 && getAvailableToAdd(item) <= 0) {
            customerAlert("Món này đã hết nguyên liệu, không thể thêm nữa!");
            return;
        }
        
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
        
        if (change > 0 && getAvailableToAdd(item) <= 0) {
            customerAlert("Món này đã hết nguyên liệu, không thể thêm nữa!");
            return;
        }
        
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
            const cardEl = document.querySelector('.vip-card') || document.getElementById('vip-card-el');
            if (cardEl) cardEl.className = `vip-card ${vip.class}`;
            const nameEl = document.getElementById('vip-card-name');
            if (nameEl) nameEl.textContent = data.name || 'Thành Viên';
            const tierTextEl = document.getElementById('vip-card-tier-text');
            if (tierTextEl) tierTextEl.textContent = vip.name;
            const tierIconEl = document.getElementById('vip-card-tier-icon');
            if (tierIconEl) tierIconEl.textContent = vip.icon;
            const discountEl = document.getElementById('vip-card-discount');
            if (discountEl) discountEl.textContent = `Ưu đãi giảm ${vip.pct}%`;
            const containerEl = document.getElementById('vip-card-container');
            if (containerEl) containerEl.style.display = 'block';

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
            
            // Show history button
            document.getElementById('view-history-btn').classList.remove('hidden');
            fetchCustomerHistory(phoneInput);
        } else {
            window.currentCustomerPoints = 0;
            document.getElementById('vip-card-container').style.display = 'none';
            msg.innerHTML = `<i class="fa-solid fa-star"></i> SĐT mới! Bạn sẽ đổi hạng thành viên sau khi thanh toán đơn này.`;
            msg.style.display = 'block';
            discountBtn.style.display = 'none';
            
            // Show history button
            document.getElementById('view-history-btn').classList.remove('hidden');
            fetchCustomerHistory(phoneInput);
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
                    <div>${i.quantity}x ${window.escapeHTML(i.name)}</div>
                    ${i.selectedOptions && i.selectedOptions.length > 0 ? 
                        `<div style="font-size: 0.75rem; color: #888; padding-left: 15px;">+${i.selectedOptions.map(o => window.escapeHTML(o.choiceName)).join(', +')}</div>` 
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
            ${order.orderNote ? `<div class="mt-2 text-muted" style="font-size: 0.85rem; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 6px;"><i>Ghi chú: ${window.escapeHTML(order.orderNote)}</i></div>` : ''}
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
// --- Feedback Logic ---
let selectedRating = 0;

function showFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    const content = document.getElementById('feedbackModalContent');
    if(modal && content) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        setTimeout(() => {
            content.classList.remove('opacity-0', 'scale-95');
            content.classList.add('opacity-100', 'scale-100');
        }, 10);
    }
}

function closeFeedbackModal() {
    const modal = document.getElementById('feedbackModal');
    const content = document.getElementById('feedbackModalContent');
    if(modal && content) {
        content.classList.add('opacity-0', 'scale-95');
        content.classList.remove('opacity-100', 'scale-100');
        setTimeout(() => {
            modal.classList.add('hidden');
            modal.classList.remove('flex');
        }, 300);
    }
}

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
            
            closeFeedbackModal();
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

// D4 — Auto-show feedback on completed with "Thank You" celebration
function checkAndShowFeedback(updatedOrder) {
    if (updatedOrder.status !== 'Completed') return;
    if (!sessionOrders.some(o => o._id === updatedOrder._id)) return;

    // Show a "Thank You" toast first, then open feedback modal
    setTimeout(() => {
        showThankYouCelebration(() => {
            currentFeedbackOrderId = updatedOrder._id;
            showFeedbackModal();
        });
    }, 1500);
}

function showThankYouCelebration(callback) {
    // Create floating thank you overlay
    const el = document.createElement('div');
    el.id = 'thank-you-overlay';
    el.style.cssText = `
        position:fixed; inset:0; z-index:10000;
        background:rgba(0,0,0,0.7); backdrop-filter:blur(4px);
        display:flex; align-items:center; justify-content:center;
        animation:fadeIn 0.4s ease;
    `;
    el.innerHTML = `
        <div style="
            background:linear-gradient(135deg,#232018,#2d2a1e);
            border:1px solid #C0A062; border-radius:24px;
            padding:40px 32px; text-align:center; max-width:340px; width:90%;
            animation:slideUp 0.4s ease;
        ">
            <div style="font-size:3.5rem; margin-bottom:12px; animation:bounce 0.6s ease;">☕</div>
            <h2 style="color:#E8DCC4; font-size:1.6rem; font-weight:800; margin-bottom:8px;">Cảm ơn bạn!</h2>
            <p style="color:#C0A062; font-weight:700; font-size:1.05rem; margin-bottom:6px;">Đơn hàng đã hoàn thành</p>
            <p style="color:#A89F88; font-size:0.9rem; margin-bottom:24px;">Chúc bạn thưởng thức ngon miệng 🙏</p>
            <div style="display:flex; gap:10px; justify-content:center;">
                <button id="ty-skip-btn" style="
                    background:transparent; border:1px solid #3A3528;
                    color:#A89F88; border-radius:12px; padding:10px 20px;
                    font-size:0.9rem; cursor:pointer;
                ">Bỏ qua</button>
                <button id="ty-rate-btn" style="
                    background:linear-gradient(135deg,#994700,#FF7A00);
                    border:none; color:#fff; border-radius:12px; padding:10px 24px;
                    font-size:0.9rem; font-weight:700; cursor:pointer;
                ">⭐ Đánh giá ngay</button>
            </div>
        </div>
    `;
    document.body.appendChild(el);

    const closeEl = () => { el.style.animation = 'fadeOut 0.3s ease forwards'; setTimeout(() => el.remove(), 300); };

    document.getElementById('ty-skip-btn').onclick = closeEl;
    document.getElementById('ty-rate-btn').onclick = () => { closeEl(); setTimeout(callback, 400); };

    // Auto-close after 8 seconds and open feedback
    setTimeout(() => { if (document.getElementById('thank-you-overlay')) { closeEl(); setTimeout(callback, 400); } }, 8000);
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
    const searchEl = document.getElementById('menu-search');
    if (searchEl) searchEl.placeholder = t.search_placeholder;
    const searchDesktop = document.getElementById('menu-search-desktop');
    if (searchDesktop) searchDesktop.placeholder = t.search_placeholder;
    const searchMobile = document.getElementById('menu-search-mobile');
    if (searchMobile) searchMobile.placeholder = t.search_placeholder;
    
    // Refresh menu to update dynamic labels
    const activeCategory = getActiveCategory();
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
        let dbType = type === 'checkout' ? 'bill' : 'staff';
        const { error } = await supabase.from('staff_requests').insert([{
            table_number: TABLE_NUMBER.toString(),
            type: dbType,
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

// --- FAB Logic ---
window.toggleFabMenu = function() {
    const fabMenu = document.getElementById('fab-menu');
    const fabMainBtn = document.getElementById('fab-main-btn');
    if (fabMenu && fabMainBtn) {
        fabMenu.classList.toggle('active');
        fabMainBtn.classList.toggle('active');
    }
}

// Auto close menu when an action is clicked
document.querySelectorAll('.fab-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const fabMenu = document.getElementById('fab-menu');
        if (fabMenu && fabMenu.classList.contains('active')) {
            window.toggleFabMenu();
        }
    });
});

// ============================================
// FEEDBACK SYSTEM — Đánh giá sau khi nhận món
// ============================================
const feedbackShownOrders = new Set();

window.handleOrderStatusUpdate = function(updatedOrder) {
    // Hiện popup feedback khi đơn Ready hoặc Completed
    if ((updatedOrder.status === 'Ready' || updatedOrder.status === 'Completed') 
        && !feedbackShownOrders.has(updatedOrder.id)) {
        feedbackShownOrders.add(updatedOrder.id);
        currentFeedbackOrderId = updatedOrder.id;
        
        // Delay 2s để khách kịp thấy trạng thái mới trước khi hiện feedback
        setTimeout(() => showFeedbackPopup(updatedOrder.id), 2000);
    }
};

function showFeedbackPopup(orderId) {
    // Kiểm tra đã feedback chưa
    if (sessionStorage.getItem('feedback_' + orderId)) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'feedback-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s ease;backdrop-filter:blur(4px);';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:24px;max-width:380px;width:100%;padding:32px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.3);animation:slideUp 0.4s ease;">
            <div style="font-size:48px;margin-bottom:12px;">☕</div>
            <h3 style="font-size:20px;font-weight:800;color:#1A1814;margin-bottom:8px;">Đánh giá trải nghiệm</h3>
            <p style="font-size:14px;color:#666;margin-bottom:20px;">Bạn cảm thấy thế nào về đơn hàng này?</p>
            
            <div id="feedback-stars" style="display:flex;justify-content:center;gap:8px;margin-bottom:20px;cursor:pointer;">
                ${[1,2,3,4,5].map(i => `
                    <span class="fb-star" data-rating="${i}" style="font-size:36px;color:#ddd;transition:all 0.2s;cursor:pointer;" 
                          onclick="selectFeedbackRating(${i})" 
                          onmouseenter="hoverFeedbackRating(${i})" 
                          onmouseleave="resetFeedbackHover()">★</span>
                `).join('')}
            </div>
            
            <textarea id="feedback-comment" placeholder="Góp ý thêm (tùy chọn)..." 
                      style="width:100%;border:2px solid #eee;border-radius:16px;padding:14px;font-size:14px;resize:none;height:80px;outline:none;transition:border 0.2s;font-family:inherit;"
                      onfocus="this.style.borderColor='#C0A062'" onblur="this.style.borderColor='#eee'"></textarea>
            
            <div style="display:flex;gap:10px;margin-top:16px;">
                <button onclick="closeFeedbackPopup()" style="flex:1;padding:14px;border-radius:14px;border:2px solid #eee;background:#fff;color:#666;font-weight:700;font-size:14px;cursor:pointer;transition:all 0.2s;">Bỏ qua</button>
                <button id="submit-feedback-btn" onclick="submitFeedback('${orderId}')" style="flex:1;padding:14px;border-radius:14px;border:none;background:linear-gradient(135deg,#C0A062,#D4AF37);color:#fff;font-weight:700;font-size:14px;cursor:pointer;box-shadow:0 4px 15px rgba(192,160,98,0.3);transition:all 0.2s;">Gửi đánh giá</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

let popupSelectedRating = 0;

window.selectFeedbackRating = function(rating) {
    popupSelectedRating = rating;
    const stars = document.querySelectorAll('.fb-star');
    stars.forEach((star, idx) => {
        star.style.color = idx < rating ? '#D4AF37' : '#ddd';
        star.style.transform = idx < rating ? 'scale(1.15)' : 'scale(1)';
    });
};

window.hoverFeedbackRating = function(rating) {
    const stars = document.querySelectorAll('.fb-star');
    stars.forEach((star, idx) => {
        star.style.color = idx < rating ? '#EAC87D' : '#ddd';
    });
};

window.resetFeedbackHover = function() {
    const stars = document.querySelectorAll('.fb-star');
    stars.forEach((star, idx) => {
        star.style.color = idx < popupSelectedRating ? '#D4AF37' : '#ddd';
    });
};

window.submitFeedback = async function(orderId) {
    if (popupSelectedRating === 0) {
        const stars = document.getElementById('feedback-stars');
        if (stars) stars.style.animation = 'shake 0.4s ease';
        setTimeout(() => { if (stars) stars.style.animation = ''; }, 400);
        return;
    }
    
    const comment = document.getElementById('feedback-comment')?.value || '';
    const btn = document.getElementById('submit-feedback-btn');
    if (btn) { btn.textContent = 'Đang gửi...'; btn.disabled = true; }
    
    try {
        await supabase.from('feedback').insert([{
            order_id: orderId,
            table_number: TABLE_NUMBER.toString(),
            rating: popupSelectedRating,
            comment: comment,
            customer_phone: window.currentCustomerPhone || null
        }]);
        
        sessionStorage.setItem('feedback_' + orderId, 'true');
        
        // Hiệu ứng thành công
        const overlay = document.getElementById('feedback-overlay');
        if (overlay) {
            overlay.querySelector('div').innerHTML = `
                <div style="font-size:64px;margin-bottom:16px;">🎉</div>
                <h3 style="font-size:20px;font-weight:800;color:#1A1814;margin-bottom:8px;">Cảm ơn bạn!</h3>
                <p style="font-size:14px;color:#666;">Đánh giá của bạn giúp chúng mình cải thiện dịch vụ.</p>
            `;
            setTimeout(() => overlay.remove(), 2000);
        }
    } catch(e) {
        console.error('Feedback error:', e);
        if (btn) { btn.textContent = 'Thử lại'; btn.disabled = false; }
    }
    
    popupSelectedRating = 0;
};

window.closeFeedbackPopup = function() {
    const overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.remove();
};

// CSS animations cho feedback
const feedbackStyles = document.createElement('style');
feedbackStyles.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
    @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
`;
document.head.appendChild(feedbackStyles);

// D2 — Kiểm tra giờ mở/đóng cửa quán
function checkStoreHours(settings) {
    // is_open_override: true = force open, false = force closed, null = auto
    if (settings.is_open_override === true) { removeClosedOverlay(); return; }
    if (settings.is_open_override === false) { showClosedOverlay(settings.store_name || 'Quán'); return; }

    const openTime = settings.open_time || '07:00';
    const closeTime = settings.close_time || '22:00';

    const now = new Date();
    const [openH, openM] = openTime.split(':').map(Number);
    const [closeH, closeM] = closeTime.split(':').map(Number);

    const openMinutes = openH * 60 + openM;
    const closeMinutes = closeH * 60 + closeM;
    const nowMinutes = now.getHours() * 60 + now.getMinutes();

    let isOpen = false;
    if (closeMinutes < openMinutes) {
        isOpen = nowMinutes >= openMinutes || nowMinutes < closeMinutes;
    } else {
        isOpen = nowMinutes >= openMinutes && nowMinutes < closeMinutes;
    }
    
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

// D3 — Patch nút toggle dark mode thủ công để lưu preference
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtns = document.querySelectorAll('[onclick*="dark"]');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme_manual', isDark ? 'light' : 'dark');
        });
    });
});

// Start the app
init();
