// ====================================================
// customer-session.js — Table session, auto-transfer, heartbeat
// ====================================================
import { TABLE_NUMBER, STORE_SLUG, sessionKey, sessionId, setSessionId, state, dom } from './customer-config.js';
import { fetchMenu } from './customer-menu.js';
import { attachEventListeners } from './customer-modal.js';
import { setupRealtimeSubscription } from './customer-order.js';
import { customerConfirm } from './customer-ui.js';

// D3 — Auto dark/light mode theo giờ hệ thống
export function applyAutoDarkMode() {
    if (localStorage.getItem('theme_manual')) return;
    const hour = new Date().getHours();
    const isDark = hour >= 18 || hour < 6;
    document.documentElement.classList.toggle('dark', isDark);
}
// Recheck every 30 minutes
setInterval(() => {
    if (!localStorage.getItem('theme_manual')) applyAutoDarkMode();
}, 30 * 60 * 1000);

export async function initTenant() {
    try {
        const { data, error } = await supabase
            .from('tenants')
            .select('id, name, branding, primary_color, logo_url, custom_domain')
            .eq('slug', STORE_SLUG)
            .eq('status', 'active')
            .maybeSingle();

        if (data && data.id) {
            state.tenantId = data.id;
            applyBranding(data);
            return true;
        } else {
            dom.loader.innerHTML = `
                <div style="text-align:center; padding: 40px 20px;">
                    <i class="fa-solid fa-store-slash" style="font-size: 3rem; color: #e74c3c; margin-bottom: 16px;"></i>
                    <h4 style="color: var(--text-main); margin-bottom: 8px;">Quán không tồn tại</h4>
                    <p style="color: var(--text-muted); margin-bottom: 24px;">Đường dẫn hoặc mã QR của quán không hợp lệ hoặc quán đang tạm đóng cửa.</p>
                </div>
            `;
            dom.loader.style.display = 'flex';
            dom.loader.style.alignItems = 'center';
            dom.loader.style.justifyContent = 'center';
            dom.loader.style.minHeight = '60vh';
            return false;
        }
    } catch (e) {
        console.error('Tenant Init Error:', e);
        return false;
    }
}

function applyBranding(tenantData) {
    if (!tenantData) return;

    // Apply Store Name
    if (tenantData.name) {
        // Find existing text elements
        const html = document.documentElement.innerHTML;
        const mainTitles = document.querySelectorAll('h3.font-headline');
        mainTitles.forEach(el => {
            if (el.textContent.includes('Nohope Coffee')) {
                el.textContent = tenantData.name;
            }
        });
        
        const sidebarTitle = document.querySelector('h1.tracking-tight');
        if (sidebarTitle && sidebarTitle.textContent === 'Nohope') {
            sidebarTitle.textContent = tenantData.name.split(' ')[0] || tenantData.name;
        }
        
        document.title = `${tenantData.name} - Thực đơn & Đặt món QR`;
    }

    if (tenantData.primary_color || tenantData.branding?.primary_color) {
        const root = document.documentElement;
        const color = tenantData.primary_color || tenantData.branding.primary_color;
        root.style.setProperty('--primary', color);
    }
    if (tenantData.branding && tenantData.branding.accent_color) {
        document.documentElement.style.setProperty('--accent', tenantData.branding.accent_color);
    }

    // Images
    const logoSrc = tenantData.logo_url || tenantData.branding?.logo;
    if (logoSrc) {
        document.querySelectorAll('img[src*="bunny_logo.png"]').forEach(img => {
            img.src = logoSrc;
        });
        const favicons = document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]');
        favicons.forEach(link => { link.href = logoSrc; });
    }
    
    if (tenantData.branding && tenantData.branding.banner) {
        const heroImg = document.getElementById('hero-banner-image');
        if (heroImg) {
            heroImg.src = tenantData.branding.banner;
        }
    }
}

// --- Banner Ads (Dynamic Carousel + Popup) ---
const BANNER_GRADIENTS = [
    'from-[#FF6B35] via-[#F7931E] to-[#FFD700]',
    'from-[#6C63FF] via-[#9B59B6] to-[#E91E63]',
    'from-[#00B894] via-[#00CEC9] to-[#0984E3]',
    'from-[#994700] via-[#CC6600] to-[#FF7A00]',
    'from-[#E74C3C] via-[#C0392B] to-[#8E44AD]',
    'from-[#2ECC71] via-[#27AE60] to-[#16A085]',
];

export async function fetchBanners() {
    try {
        const { data, error } = await supabase
            .from('promotion_banners')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .eq('is_active', true)
            .order('created_at', { ascending: false });

        if (error) throw error;
        if (!data || data.length === 0) return;

        const sliderBanners = data.filter(b => !b.is_popup);
        const popupBanners = data.filter(b => b.is_popup);

        // Render slider carousel
        if (sliderBanners.length > 0) {
            renderBannerCarousel(sliderBanners);
        }

        // Show first unseen popup
        popupBanners.forEach(banner => {
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

                popupModal.classList.remove('hidden');
                popupModal.classList.add('flex');
                setTimeout(() => {
                    popupModal.classList.remove('opacity-0');
                }, 50);
                
                sessionStorage.setItem('ad_banner_shown_' + banner.id, 'true');
            }
        });
    } catch (err) {
        console.error("Error fetching banners:", err);
    }
}

function renderBannerCarousel(banners) {
    const section = document.getElementById('promo-carousel-section');
    const carousel = document.getElementById('promo-carousel');
    const dotsContainer = document.getElementById('promo-carousel-dots');
    if (!section || !carousel) return;

    // Render banner cards
    carousel.innerHTML = banners.map((banner, i) => {
        const gradient = BANNER_GRADIENTS[i % BANNER_GRADIENTS.length];
        const targetAttr = banner.target_url 
            ? `onclick="window.open('${banner.target_url}', '_blank')"` 
            : '';
        
        return `
        <div class="snap-center shrink-0 w-[85%] sm:w-[45%] lg:w-[32%] rounded-2xl overflow-hidden relative cursor-pointer group" ${targetAttr}>
            <div class="bg-gradient-to-br ${gradient} h-32 flex items-center relative overflow-hidden">
                <div class="absolute inset-0 bg-black/10"></div>
                <img src="${banner.image_url}" alt="${banner.title}" class="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60" onerror="this.style.display='none'">
                <div class="relative z-10 flex-1 p-5">
                    <span class="bg-white/25 backdrop-blur-sm text-white text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Khuyến mãi ⚡</span>
                    <h4 class="text-white font-black text-lg mt-2 leading-tight font-['Plus_Jakarta_Sans'] drop-shadow-md">${banner.title}</h4>
                </div>
            </div>
        </div>`;
    }).join('');

    // Show section
    section.classList.remove('hidden');

    // Render dots
    if (dotsContainer && banners.length > 1) {
        dotsContainer.innerHTML = banners.map((_, i) => 
            `<div class="${i === 0 ? 'w-5 h-1.5' : 'w-1.5 h-1.5'} rounded-full ${i === 0 ? 'bg-[#994700]' : 'bg-[#994700]/30'} transition-all duration-300"></div>`
        ).join('');
    }

    // Auto-scroll logic
    if (banners.length > 1) {
        initCarouselAutoScroll(carousel, dotsContainer);
    }
}

function initCarouselAutoScroll(carousel, dotsContainer) {
    let currentIndex = 0;
    let autoScrollTimer;

    function updateDots(index) {
        if (!dotsContainer) return;
        const dots = dotsContainer.querySelectorAll('div');
        dots.forEach((dot, i) => {
            dot.className = i === index
                ? 'w-5 h-1.5 rounded-full bg-[#994700] transition-all duration-300'
                : 'w-1.5 h-1.5 rounded-full bg-[#994700]/30 transition-all duration-300';
        });
    }

    function scrollToIndex(index) {
        const items = carousel.querySelectorAll('.snap-center');
        if (items[index]) {
            const scrollLeft = items[index].offsetLeft - carousel.offsetLeft - 8;
            carousel.scrollTo({ left: scrollLeft, behavior: 'smooth' });
            currentIndex = index;
            updateDots(index);
        }
    }

    function startAutoScroll() {
        clearInterval(autoScrollTimer);
        autoScrollTimer = setInterval(() => {
            const items = carousel.querySelectorAll('.snap-center');
            currentIndex = (currentIndex + 1) % items.length;
            scrollToIndex(currentIndex);
        }, 4000);
    }

    carousel.addEventListener('touchstart', () => clearInterval(autoScrollTimer));
    carousel.addEventListener('touchend', () => {
        const items = carousel.querySelectorAll('.snap-center');
        const scrollPos = carousel.scrollLeft;
        let closestIndex = 0;
        let closestDist = Infinity;
        items.forEach((item, i) => {
            const dist = Math.abs(item.offsetLeft - carousel.offsetLeft - scrollPos);
            if (dist < closestDist) { closestDist = dist; closestIndex = i; }
        });
        currentIndex = closestIndex;
        updateDots(currentIndex);
        startAutoScroll();
    });

    startAutoScroll();
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

// --- Auto-Transfer ---
async function checkAutoTransfer() {
    try {
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

        const { data: oldOrders } = await supabase
            .from('orders')
            .select('id, status, is_paid')
            .eq('tenant_id', state.tenantId)
            .eq('session_id', oldSessionId)
            .in('status', ['Pending', 'Preparing', 'Ready', 'Completed'])
            .eq('is_paid', false);

        if (!oldOrders || oldOrders.length === 0) {
            localStorage.removeItem('cafe_session_' + oldTableNum);
            return false;
        }

        const { data: targetSession } = await supabase
            .from('table_sessions')
            .select('session_id')
            .eq('tenant_id', state.tenantId)
            .eq('table_number', TABLE_NUMBER)
            .maybeSingle();

        if (targetSession && targetSession.session_id !== oldSessionId) {
            await customerConfirm(
                `Bàn ${TABLE_NUMBER} đang có người sử dụng.\nVui lòng chọn bàn trống khác hoặc gọi nhân viên để được hỗ trợ.`
            );
            localStorage.removeItem('cafe_session_' + oldTableNum);
            return false;
        }

        const wantTransfer = await customerConfirm(
            `Bạn đang có ${oldOrders.length} đơn hàng ở Bàn ${oldTableNum}.\nChuyển tất cả sang Bàn ${TABLE_NUMBER}?`
        );

        if (wantTransfer) {
            const orderIds = oldOrders.map(o => o.id);
            await supabase.from('orders')
                .update({ table_number: TABLE_NUMBER.toString() })
                .eq('tenant_id', state.tenantId)
                .in('id', orderIds);
            await supabase.from('table_sessions')
                .update({ table_number: TABLE_NUMBER.toString(), last_seen: new Date().toISOString() })
                .eq('tenant_id', state.tenantId)
                .eq('session_id', oldSessionId);

            setSessionId(oldSessionId);
            localStorage.removeItem('cafe_session_' + oldTableNum);
            console.log(`Auto-transferred ${oldOrders.length} orders from Table ${oldTableNum} → Table ${TABLE_NUMBER}`);
            return true;
        } else {
            localStorage.removeItem('cafe_session_' + oldTableNum);
            return false;
        }
    } catch (e) {
        console.warn('Auto-transfer check failed:', e.message);
        return false;
    }
}

// --- Table Session Lock ---
export async function acquireTableLock() {
    const STALE_THRESHOLD = 2 * 60 * 60 * 1000;
    try {
        const transferred = await checkAutoTransfer();
        if (transferred) { /* session was transferred */ }

        const { data: existing } = await supabase
            .from('table_sessions')
            .select('session_id, last_seen')
            .eq('tenant_id', state.tenantId)
            .eq('table_number', TABLE_NUMBER)
            .maybeSingle();

        if (existing) {
            const lastSeen = new Date(existing.last_seen);
            const ageMs = Date.now() - lastSeen.getTime();

            if (ageMs < STALE_THRESHOLD) {
                setSessionId(existing.session_id);
                await supabase.from('table_sessions')
                    .update({ last_seen: new Date().toISOString() })
                    .eq('tenant_id', state.tenantId)
                    .eq('table_number', TABLE_NUMBER);
            } else {
                const newId = 'sess_' + TABLE_NUMBER + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
                setSessionId(newId);
                await supabase.from('table_sessions')
                    .update({ session_id: newId, last_seen: new Date().toISOString() })
                    .eq('tenant_id', state.tenantId)
                    .eq('table_number', TABLE_NUMBER);
            }
        } else {
            const newId = 'sess_' + TABLE_NUMBER + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            setSessionId(newId);
            await supabase.from('table_sessions').insert([{
                tenant_id: state.tenantId,
                table_number: TABLE_NUMBER,
                session_id: newId,
                device_info: navigator.userAgent.slice(0, 100)
            }]);
        }

        // Heartbeat every 60s
        setInterval(async () => {
            await supabase.from('table_sessions')
                .update({ last_seen: new Date().toISOString() })
                .eq('tenant_id', state.tenantId)
                .eq('table_number', TABLE_NUMBER)
                .eq('session_id', sessionId);
        }, 60 * 1000);

        fetchMenu();
        attachEventListeners();
        setupRealtimeSubscription();

    } catch (e) {
        console.warn('Table session: table_sessions may not exist, skipping.', e.message);
        if (!sessionId) {
            const newId = 'sess_' + TABLE_NUMBER + '_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            setSessionId(newId);
        }
        fetchMenu();
        attachEventListeners();
        setupRealtimeSubscription();
    }
}

export async function releaseTableLock() {
    await supabase.from('table_sessions')
        .delete()
        .eq('tenant_id', state.tenantId)
        .eq('table_number', TABLE_NUMBER)
        .eq('session_id', sessionId);
}

export function showTableLockedOverlay() {
    dom.loader.innerHTML = `
        <div style="text-align:center; padding: 40px 20px;">
            <i class="fa-solid fa-lock" style="font-size: 3rem; color: #e74c3c; margin-bottom: 16px;"></i>
            <h4 style="color: var(--text-main); margin-bottom: 8px;">Bàn ${TABLE_NUMBER} đang được sử dụng</h4>
            <p style="color: var(--text-muted); margin-bottom: 24px;">Bàn này đang có khách. Vui lòng liên hệ nhân viên hoặc thử lại sau.</p>
            <button onclick="location.reload()" class="pill" style="background: rgba(231,76,60,0.2); border-color: #e74c3c; color: #e74c3c; padding: 10px 24px;">
                <i class="fa-solid fa-rotate-right"></i> Thử lại
            </button>
        </div>
    `;
    dom.loader.style.display = 'flex';
    dom.loader.style.alignItems = 'center';
    dom.loader.style.justifyContent = 'center';
    dom.loader.style.minHeight = '60vh';
}

// --- Kiosk Mode ---
export const isKioskMode = new URLSearchParams(window.location.search).get('kiosk') === '1';
let kioskIdleTimer = null;
const KIOSK_IDLE_TIMEOUT = 60 * 1000; // 60s idle
const KIOSK_WARNING_TIMEOUT = 10 * 1000; // 10s warning

function resetKioskTimer() {
    clearTimeout(kioskIdleTimer);
    kioskIdleTimer = setTimeout(showKioskWarning, KIOSK_IDLE_TIMEOUT);
}

function showKioskWarning() {
    import('./customer-ui.js').then(m => {
        // Auto-refresh after WARNING timeout if no interaction
        kioskIdleTimer = setTimeout(() => {
            m.closeConfirmModal();
            import('./customer-cart.js').then(c => {
                // Ignore if cart has orders placed but we are just clearing local state
                c.clearCart();
                location.reload();
            });
        }, KIOSK_WARNING_TIMEOUT);

        m.customerConfirm("Phiên giao dịch Kiosk sẽ kết thúc. Bạn có muốn tiếp tục không?").then(wantsToContinue => {
            if (wantsToContinue) {
                clearTimeout(kioskIdleTimer);
                resetKioskTimer();
            } else {
                clearTimeout(kioskIdleTimer);
                import('./customer-cart.js').then(c => {
                    c.clearCart();
                    location.reload();
                });
            }
        });
    });
}

// init() — entry point
export async function init() {
    document.getElementById('table-number-display').textContent = TABLE_NUMBER;
    applyAutoDarkMode();
    
    // Kiosk Mode Setup
    if (isKioskMode) {
        document.body.classList.add('kiosk-mode');
        const style = document.createElement('style');
        style.textContent = `
            .kiosk-mode button[onclick="openStaffModal()"] { display: none !important; }
            .kiosk-mode .hero-section { min-height: 100px; }
        `;
        document.head.appendChild(style);
        
        ['touchstart', 'mousemove', 'click', 'scroll', 'keypress'].forEach(evt => 
            document.addEventListener(evt, resetKioskTimer, { passive: true })
        );
        resetKioskTimer();
    }

    // Init Tenant dynamically from URL
    const tenantOk = await initTenant();
    if (!tenantOk) return;

    acquireTableLock();
    if (window.currentCustomerPhone) {
        document.getElementById('customer-phone-input').value = window.currentCustomerPhone;
        import('./customer-loyalty.js').then(m => m.verifyCustomerPhone(false));
    }
    fetchBanners();
}
