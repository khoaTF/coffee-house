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

// --- Banner Ads ---
export async function fetchBanners() {
    try {
        const { data, error } = await supabase
            .from('promotion_banners')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .eq('is_active', true);

        if (error) throw error;
        
        let hasHomeBanner = false;

        data.forEach(banner => {
            if (banner.is_popup) {
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
            } else if (!hasHomeBanner) {
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

// init() — entry point
export async function init() {
    document.getElementById('table-number-display').textContent = TABLE_NUMBER;
    applyAutoDarkMode();
    
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
