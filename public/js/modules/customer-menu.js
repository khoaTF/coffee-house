// ====================================================
// customer-menu.js — Menu fetching, rendering, categories
// ====================================================
import { TABLE_NUMBER, state, dom, sessionId, statusMap } from './customer-config.js';
import { updateCartUI } from './customer-cart.js';
import { customerAlert } from './customer-ui.js';

// Favorites management
const FAVORITES_KEY = 'customer_favorites';
function getFavorites() {
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)) || []; } catch { return []; }
}
function toggleFavorite(productId) {
    const favs = getFavorites();
    const idx = favs.indexOf(productId);
    if (idx > -1) favs.splice(idx, 1); else favs.push(productId);
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favs));
    // Update heart icons on page
    document.querySelectorAll(`[data-fav-id="${productId}"]`).forEach(el => {
        el.classList.toggle('is-fav', favs.includes(productId));
        el.innerHTML = favs.includes(productId) ? '<i class="fa-solid fa-heart"></i>' : '<i class="fa-regular fa-heart"></i>';
    });
}
window.toggleFavorite = toggleFavorite;

export function getActiveCategory() {
    const activeDesktopNode = document.querySelector('.category-pill.bg-white');
    const activeMobileNode = document.querySelector('.category-pill.bg-gradient-to-br');
    const node = activeDesktopNode || activeMobileNode;
    return node && node.dataset ? node.dataset.category : 'All';
}
window.getActiveCategory = getActiveCategory;

export function renderCategories(activeCategory = 'All') {
    const categories = ['All', ...new Set(state.menuItems.map(item => item.category).filter(Boolean))];
    // Add favorites pill if any exist
    const favs = getFavorites();
    const hasFavItems = favs.some(fId => state.menuItems.find(m => m._id === fId));
    if (hasFavItems) categories.splice(1, 0, '❤️ Yêu thích');
    
    const desktopContainer = document.getElementById('desktop-category-filters');
    const mobileContainer = document.getElementById('mobile-category-filters');
    
    const generateHTML = (cat, isDesktop) => {
        const isActive = cat === activeCategory;
        if (isDesktop) {
            return `
                <a href="#" data-category="${cat}" class="category-pill flex items-center space-x-3 px-6 py-3 rounded-xl transition-all ${isActive ? 'bg-white shadow-[0_4px_20px_rgba(88,66,53,0.12)] text-[#994700] font-bold' : 'text-white/70 hover:text-white hover:bg-white/10 font-medium'}">
                    <span>${window.translateCategory ? window.translateCategory(cat) : cat}</span>
                </a>
            `;
        } else {
            return `
                <button data-category="${cat}" class="category-pill whitespace-nowrap px-5 py-2.5 rounded-2xl text-sm transition-all ${isActive ? 'bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white font-bold shadow-md shadow-[#FF7A00]/20' : 'bg-[#FCF9F8] dark:bg-[#1B1C1C] text-on-surface-variant font-medium border border-outline-variant/20'}">
                    ${window.translateCategory ? window.translateCategory(cat) : cat}
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

    // Render logic for Category Modal (Mobile)
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
            if (e.currentTarget.closest('#category-modal-list')) {
                closeCategoryModal();
                document.getElementById('menu-container').scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

// Category Modal Functions
export function openCategoryModal() {
    const catModal = document.getElementById('category-modal');
    if (catModal) catModal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}

export function closeCategoryModal() {
    const catModal = document.getElementById('category-modal');
    if (catModal) catModal.classList.remove('active');
    if (!document.querySelector('.cart-modal.active')) {
        const fab = document.querySelector('.fab-container');
        if (fab) fab.style.display = 'flex';
    }
}

// Check store hours
function checkStoreHours(settings) {
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

// Calculate how many more portions of a product can be added to the cart
export function getAvailableToAdd(product) {
    if (!product.recipe || product.recipe.length === 0) return 999;
    
    let usedIngredients = {};
    state.cart.forEach(cartItem => {
        if (cartItem.recipe) {
            cartItem.recipe.forEach(req => {
                let actualId = req.ingredientId || req.ingredient_id;
                usedIngredients[actualId] = (usedIngredients[actualId] || 0) + (req.quantity * cartItem.quantity);
            });
        }
    });

    let additionalAllowed = Infinity;
    product.recipe.forEach(req => {
        let actualId = req.ingredientId || req.ingredient_id;
        let totalStock = state.ingredientStock[actualId] || 0;
        let used = usedIngredients[actualId] || 0;
        let remaining = Math.max(0, totalStock - used);
        
        let possible = Math.floor(remaining / req.quantity);
        if (possible < additionalAllowed) {
            additionalAllowed = possible;
        }
    });

    return additionalAllowed === Infinity ? 999 : additionalAllowed;
}

// Show skeleton loading placeholders while menu loads
function showMenuSkeleton() {
    if (!dom.menuContainer) return;
    dom.menuContainer.style.display = 'grid';
    const skeletonCount = 6;
    dom.menuContainer.innerHTML = Array.from({ length: skeletonCount }, (_, i) => `
        <div class="skeleton-card" style="animation-delay: ${i * 80}ms">
            <div class="skeleton-img"></div>
            <div style="padding: 12px;">
                <div class="skeleton skeleton-text medium"></div>
                <div class="skeleton skeleton-text price"></div>
                <div class="skeleton skeleton-text short" style="margin-top:12px; height:36px; border-radius:50px;"></div>
            </div>
        </div>
    `).join('');
}

// Fetch Menu from Backend
export async function fetchMenu() {
    showMenuSkeleton();
    try {
        const [prodRes, stockRes, ordersRes, settingsRes] = await Promise.all([
            supabase.from('products').select('*').eq('tenant_id', state.tenantId).eq('is_available', true),
            supabase.from('ingredients').select('id, stock').eq('tenant_id', state.tenantId),
            supabase.from('orders').select('*').eq('tenant_id', state.tenantId).eq('session_id', sessionId).order('created_at', { ascending: false }).limit(10),
            supabase.from('store_settings').select('open_time, close_time, is_open_override, store_name').eq('tenant_id', state.tenantId).maybeSingle()
        ]);

        if (prodRes.error) throw prodRes.error;
        if (stockRes.error) throw stockRes.error;
        if (ordersRes.error) throw ordersRes.error;

        const storeSettings = settingsRes.data || {};
        checkStoreHours(storeSettings);

        const now = new Date();
        state.menuItems = prodRes.data.map(p => {
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
        // Expose to gacha.js (standalone script)
        window.menuItems = state.menuItems;
        
        state.ingredientStock = {};
        stockRes.data.forEach(i => state.ingredientStock[i.id] = i.stock);
        
        state.sessionOrders = ordersRes.data.map(o => ({
            ...o, 
            _id: o.id, 
            createdAt: o.created_at,
            totalPrice: o.total_price,
            orderNote: o.order_note
        }));
        
        const activeOrder = state.sessionOrders.find(o => o.status === 'Pending');
        const preparingOrder = state.sessionOrders.find(o => o.status === 'Preparing');
        
        const displayOrder = activeOrder || preparingOrder;

        if (displayOrder) {
            state.activeOrderId = activeOrder ? activeOrder._id : null;
            state.trackedOrderId = displayOrder._id;
            
            dom.liveOrderBanner.style.display = 'block';
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
            
            dom.liveStatus.textContent = statusText;
            dom.liveStatus.className = statusClass;
            if (statusColor) dom.liveStatus.style.color = statusColor;
        } else {
            state.activeOrderId = null;
            state.trackedOrderId = null;
            dom.liveOrderBanner.style.display = 'none';
        }
        
        dom.loader.style.display = 'none';
        renderCategories('All');
        renderMenu('All');
        
        // Render history modal early
        const { renderHistoryModal } = await import('./customer-order.js');
        renderHistoryModal();
    } catch (error) {
        console.error("Lỗi khi tải thực đơn:", error);
        dom.loader.textContent = "Không tải được thực đơn. Vui lòng tải lại trang.";
    }
}

// Render Menu
export function renderMenu(category) {
    dom.menuContainer.innerHTML = '';
    const sqDesktop = document.getElementById('menu-search-desktop')?.value || '';
    const sqMobile = document.getElementById('menu-search-mobile')?.value || '';
    const searchQuery = (sqDesktop || sqMobile).toLowerCase();

    const filteredItems = state.menuItems.filter(item => {
        if (category === '❤️ Yêu thích') {
            const favs = getFavorites();
            const matchesFav = favs.includes(item._id);
            const matchesSearch = !searchQuery || 
                                   item.name.toLowerCase().includes(searchQuery) || 
                                   (item.description && item.description.toLowerCase().includes(searchQuery));
            return matchesFav && matchesSearch;
        }
        const matchesCategory = !!searchQuery || category === 'All' || item.category === category;
        const matchesSearch = !searchQuery || 
                               item.name.toLowerCase().includes(searchQuery) || 
                               (item.description && item.description.toLowerCase().includes(searchQuery));
        return matchesCategory && matchesSearch;
    });

    const emptyState = document.getElementById('empty-state');
    if(filteredItems.length === 0) {
        if (emptyState) emptyState.style.display = 'flex';
        dom.menuContainer.style.display = 'none';
        return;
    } else {
        if (emptyState) emptyState.style.display = 'none';
        dom.menuContainer.style.display = 'grid';
    }

    filteredItems.forEach((item, index) => {
        const cartItemTotalQty = state.cart.filter(c => c._id === item._id).reduce((sum, c) => sum + c.quantity, 0);
        
        const canAddMore = getAvailableToAdd(item) > 0;
        const isOutOfStock = !canAddMore && cartItemTotalQty === 0;
        const hasActiveOrder = state.activeOrderId !== null;
        const disableAddBtn = isOutOfStock || hasActiveOrder || !canAddMore;

        const card = document.createElement('article');
        card.setAttribute('data-product-id', item._id);
        card.className = `bg-[#FCF9F8] dark:bg-[#1B1C1B] rounded-[24px] overflow-hidden group cursor-pointer active:scale-[0.98] transition-all hover:bg-white dark:hover:bg-[#2A2B2B] ${isOutOfStock ? 'opacity-60 saturate-50' : ''}`;
        
        const isBestSeller = !!item.isBestSeller;
        const hasOptions = item.options && item.options.length > 0;
        const hasPromo = !!item.isPromo;

        card.innerHTML = `
            <div class="img-wrap aspect-[4/3] bg-[#F0EDEC] dark:bg-slate-800 relative overflow-hidden">
                <img src="${item.imageUrl}" alt="${window.escapeHTML(item.name)}" loading="lazy" decoding="async" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onerror="this.onerror=null; this.outerHTML='<div class=\\'w-full h-full flex items-center justify-center p-6 bg-[#F0EDEC] dark:bg-slate-800\\'><img src=\\'/images/bunny_logo.png\\' alt=\\'\\'  class=\\'w-full h-full object-contain opacity-30 group-hover:scale-105 transition-transform duration-500\\'></div>';">
                ${isOutOfStock ? '<div class="oos-overlay absolute inset-0 bg-black/40 flex items-center justify-center z-10"><span class="bg-[#ba1a1a] text-white px-3 py-1 rounded-full text-sm font-bold shadow-lg">Hết hàng</span></div>' : ''}
                ${isBestSeller && !isOutOfStock ? `
                <div class="absolute top-3 left-3 bg-white/90 dark:bg-[#1B1C1B]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-[#FF7A00] shadow-sm flex items-center gap-1 z-10">
                    <i class="fa-solid fa-fire text-[#FF7A00] text-[12px]"></i> Bán chạy
                </div>` : ''}
                ${hasPromo && !isOutOfStock ? `
                <div class="absolute bottom-3 right-3 bg-[#4ade80]/90 backdrop-blur-sm px-2.5 py-1 rounded-full text-xs font-bold text-white shadow-sm flex items-center gap-1 z-10">
                    <i class="fa-solid fa-tag text-[12px]"></i> KM
                </div>` : ''}
                <button data-fav-id="${item._id}" class="fav-heart-btn ${getFavorites().includes(item._id) ? 'is-fav' : ''}" onclick="event.stopPropagation(); toggleFavorite('${item._id}')" aria-label="Yêu thích">
                    <i class="fa-${getFavorites().includes(item._id) ? 'solid' : 'regular'} fa-heart"></i>
                </button>
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
                    <button class="w-full bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white font-bold py-2.5 rounded-full hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm" 
                        onclick="event.stopPropagation(); updateCart('${item._id}', 1)" ${disableAddBtn ? "disabled style='opacity:0.45;cursor:not-allowed;'" : ""}>
                      <i class="fa-solid ${hasOptions ? 'fa-sliders' : 'fa-plus'} text-[16px]"></i>
                      ${hasOptions ? (window.t ? window.t('options_label') : 'Tùy chọn') : (window.t ? window.t('add_to_cart') : 'Thêm vào giỏ')}
                    </button>
                    `}
                </div>
            </div>
        `;
        
        card.onclick = () => {
             const currentCartItemTotalQty = state.cart.filter(c => c._id === item._id).reduce((sum, c) => sum + c.quantity, 0);
             const currentCanAddMore = getAvailableToAdd(item) > 0;
             const currentIsOutOfStock = !currentCanAddMore && currentCartItemTotalQty === 0;
             const currentHasActiveOrder = state.activeOrderId !== null;
             const currentDisableAddBtn = currentIsOutOfStock || currentHasActiveOrder || !currentCanAddMore;

             if (currentDisableAddBtn) return;
             if (hasOptions) {
                 import('./customer-modal.js').then(m => m.openOptionsModal(item));
             }
             else window.updateCart(item._id, 1);
        };

        dom.menuContainer.appendChild(card);
    });
}
window.renderMenu = renderMenu;

export function updateMenuCardsUI() {
    const cards = document.querySelectorAll('article[data-product-id]');
    cards.forEach(card => {
        const id = card.getAttribute('data-product-id');
        const item = state.menuItems.find(i => i._id === id);
        if (!item) return;

        const cartItemTotalQty = state.cart.filter(c => c._id === item._id).reduce((sum, c) => sum + c.quantity, 0);
        const canAddMore = getAvailableToAdd(item) > 0;
        const isOutOfStock = !canAddMore && cartItemTotalQty === 0;
        const hasActiveOrder = state.activeOrderId !== null;
        const disableAddBtn = isOutOfStock || hasActiveOrder || !canAddMore;
        const hasOptions = item.options && item.options.length > 0;

        const lastQty = parseInt(card.getAttribute('data-last-qty') || '-1');
        const lastState = card.getAttribute('data-last-state');
        const currentState = `${isOutOfStock}-${hasActiveOrder}-${canAddMore}`;
        
        if (lastQty === cartItemTotalQty && lastState === currentState) {
            return;
        }
        card.setAttribute('data-last-qty', cartItemTotalQty);
        card.setAttribute('data-last-state', currentState);

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
                    <button class="w-full bg-gradient-to-br from-[#994700] to-[#FF7A00] text-white font-bold py-2.5 rounded-full hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-sm" 
                        onclick="event.stopPropagation(); updateCart('${item._id}', 1)" ${disableAddBtn ? "disabled style='opacity:0.45;cursor:not-allowed;'" : ""}>
                      <i class="fa-solid ${hasOptions ? 'fa-sliders' : 'fa-plus'} text-[16px]"></i>
                      ${hasOptions ? (window.t ? window.t('options_label') : 'Tùy chọn') : (window.t ? window.t('add_to_cart') : 'Thêm vào giỏ')}
                    </button>
                `;
            }
        }
    });
}
