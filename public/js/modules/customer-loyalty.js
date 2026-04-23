// ====================================================
// customer-loyalty.js — VIP tiers, loyalty points, promos
// ====================================================
import { state } from './customer-config.js';
import { updateCartUI } from './customer-cart.js';
import { customerAlert } from './customer-ui.js';

export function getVipTier(totalSpent) {
    if (totalSpent >= 5000000) return { name: 'DIAMOND', pct: 15, class: 'tier-diamond', icon: '💎' };
    if (totalSpent >= 2000000) return { name: 'GOLD', pct: 10, class: 'tier-gold', icon: '👑' };
    if (totalSpent >= 500000) return { name: 'SILVER', pct: 5, class: 'tier-silver', icon: '🥈' };
    return { name: 'BRONZE', pct: 0, class: 'tier-bronze', icon: '🥉' };
}

export async function verifyCustomerPhone(showLoading = true) {
    const phoneInput = document.getElementById('customer-phone-input').value.trim();
    const msg = document.getElementById('loyalty-message');
    const discountBtn = document.getElementById('loyalty-discount-btn');
    
    if (!phoneInput || !phoneInput.match(/^[0-9]{9,11}$/)) {
        msg.textContent = 'Số điện thoại không hợp lệ!';
        msg.style.display = 'block';
        msg.style.color = 'var(--danger)';
        return;
    }
    
    if (showLoading) {
        msg.style.color = '#d35400';
        msg.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang kiểm tra...';
        msg.style.display = 'block';
    }
    
    try {
        const { data, error } = await supabase.from('customers').select('*').eq('tenant_id', state.tenantId).eq('phone', phoneInput).maybeSingle();
        if (error) throw error;
        
        window.currentCustomerPhone = phoneInput;
        localStorage.setItem('customerPhone', phoneInput);
        
        if (data) {
            window.currentCustomerPoints = data.current_points || 0;
            if (typeof window.updateGachaFAB === 'function') window.updateGachaFAB();
            
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
                state.appliedPromo = { code: `VIP ${vip.name}`, discountType: 'PERCENT', value: vip.pct };
                updateCartUI();
                msg.textContent = `Thẻ VIP tự động giảm ${vip.pct}%!`;
                msg.style.display = 'block';
                msg.style.color = 'var(--success)';
            } else {
                msg.innerHTML = `<i class="fa-solid fa-check-circle"></i> SĐT hợp lệ. Bạn đang có <strong>${window.currentCustomerPoints} điểm</strong>.`;
                msg.style.display = 'block';
            }

            if (window.currentCustomerPoints >= 10 && !window.loyaltyDiscountApplied) {
                discountBtn.style.display = 'block';
                const slider = document.getElementById('loyalty-points-slider');
                if (slider) {
                    slider.value = 0;
                    if (typeof window.updateLoyaltySlider === 'function') window.updateLoyaltySlider(0);
                }
            } else {
                discountBtn.style.display = 'none';
            }
            
            document.getElementById('view-history-btn').classList.remove('hidden');
            fetchCustomerHistory(phoneInput);
        } else {
            window.currentCustomerPoints = 0;
            if (typeof window.updateGachaFAB === 'function') window.updateGachaFAB();
            document.getElementById('vip-card-container').style.display = 'none';
            msg.innerHTML = `<i class="fa-solid fa-star"></i> SĐT mới! Bạn sẽ đổi hạng thành viên sau khi thanh toán đơn này.`;
            msg.style.display = 'block';
            discountBtn.style.display = 'none';
            
            document.getElementById('view-history-btn').classList.remove('hidden');
            fetchCustomerHistory(phoneInput);
        }
    } catch (e) {
        msg.textContent = 'Lỗi hệ thống: ' + e.message;
        msg.style.color = 'var(--danger)';
    }
}
window.verifyCustomerPhone = verifyCustomerPhone;

window.updateLoyaltySlider = function(val) {
    const pts = parseInt(val) || 0;
    const valEl = document.getElementById('loyalty-slider-val');
    const discountEl = document.getElementById('loyalty-discount-val');
    const btn = document.getElementById('loyalty-apply-btn');
    
    if(valEl) valEl.textContent = pts + ' điểm';
    if(discountEl) discountEl.textContent = (pts * 100).toLocaleString('vi-VN');
    
    if(btn) {
        if(pts > 0) {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    }
}

window.applyLoyaltyPoints = function() {
    const slider = document.getElementById('loyalty-points-slider');
    const pts = parseInt(slider?.value) || 0;

    if (window.currentCustomerPoints >= pts && pts > 0 && !window.loyaltyDiscountApplied) {
        window.currentCustomerPoints -= pts;
        window.loyaltyDiscountApplied = true;
        document.getElementById('loyalty-discount-btn').style.display = 'none';
        document.getElementById('loyalty-message').innerHTML = `<i class="fa-solid fa-check-circle"></i> Đã dùng ${pts} điểm để đổi Giảm ${(pts*100).toLocaleString('vi-VN')} đ!`;
        
        state.appliedPromo = { code: 'LOYALTY_PTS', discountType: 'FIXED', value: pts * 100, originalPointsUsed: pts };
        updateCartUI(); 
    }
}

// Apply promo code
export async function applyPromo() {
    const codeInput = document.getElementById('promo-code-input');
    const msgEl = document.getElementById('promo-message');
    const btn = document.getElementById('apply-promo-btn');
    if(!codeInput || !msgEl) return;
    
    const code = codeInput.value.trim().toUpperCase();
    
    if (!code) {
        state.appliedPromo = null;
        msgEl.style.display = 'none';
        updateCartUI();
        return;
    }
    
    const subtotal = state.cart.reduce((sum, item) => {
        const itemOptionsPrice = (item.selectedOptions || []).reduce((s, o) => s + o.priceExtra, 0);
        return sum + ((item.price + itemOptionsPrice) * item.quantity);
    }, 0);

    msgEl.style.display = 'block';
    msgEl.className = 'text-primary mt-2';
    msgEl.textContent = 'Đang kiểm tra mã...';
    if(btn) btn.disabled = true;
    
    try {
        const { data: discount, error } = await supabase.from('discounts').select('*').eq('tenant_id', state.tenantId).eq('code', code).eq('active', true).maybeSingle();
        
        if(btn) btn.disabled = false;
        if (discount) {
            if (discount.usage_limit > 0 && (discount.used_count || 0) >= discount.usage_limit) {
                state.appliedPromo = null;
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

            state.appliedPromo = {
                code: discount.code,
                discountType: discount.discount_type,
                value: discount.value,
                discountAmount: discountAmount
            };
            
            msgEl.className = 'text-success mt-2 font-bold';
            msgEl.textContent = `Áp dụng thành công! Giảm ${discountAmount.toLocaleString('vi-VN')} đ`;
            updateCartUI();
        } else {
            state.appliedPromo = null;
            msgEl.className = 'text-danger mt-2';
            msgEl.textContent = 'Mã không hợp lệ hoặc đã hết hạn';
            updateCartUI();
        }
    } catch (e) {
        if(btn) btn.disabled = false;
        state.appliedPromo = null;
        msgEl.className = 'text-danger mt-2';
        msgEl.textContent = 'Lỗi kết nối máy chủ';
        updateCartUI();
    }
}
window.applyPromo = applyPromo;

// Fetch customer purchase history
async function fetchCustomerHistory(phone) {
    try {
        const { data: orders } = await supabase
            .from('orders')
            .select('*')
            .eq('tenant_id', state.tenantId)
            .eq('customer_phone', phone)
            .order('created_at', { ascending: false })
            .limit(20);
        
        state.customerHistoryOrders = (orders || []).map(o => ({
            ...o, _id: o.id, createdAt: o.created_at, totalPrice: o.total_price, orderNote: o.order_note
        }));
    } catch(e) {
        console.warn('Failed to fetch customer history:', e.message);
    }
}

window.openCustomerHistoryModal = function() {
    const modal = document.getElementById('customer-history-modal');
    const container = document.getElementById('customer-history-items-container');
    if (!modal || !container) return;

    if (state.customerHistoryOrders.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-4">Chưa có lịch sử mua hàng.</div>';
    } else {
        container.innerHTML = state.customerHistoryOrders.map(order => {
            const dateStr = new Date(order.createdAt).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
            const itemsList = (order.items || []).map(i => `${i.quantity}x ${window.escapeHTML(i.name)}`).join(', ');
            return `
                <div style="padding:12px 0; border-bottom:1px solid var(--border);">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span style="font-size:0.8rem; color:var(--text-muted);"><i class="fa-regular fa-clock"></i> ${dateStr}</span>
                        <span style="font-weight:700; color:var(--primary);">${(order.totalPrice || 0).toLocaleString('vi-VN')}đ</span>
                    </div>
                    <div style="font-size:0.85rem; color:var(--text-main);">${itemsList}</div>
                </div>
            `;
        }).join('');
    }
    
    modal.classList.add('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'none';
}

window.closeCustomerHistoryModal = function() {
    const modal = document.getElementById('customer-history-modal');
    if (modal) modal.classList.remove('active');
    const fab = document.querySelector('.fab-container');
    if (fab) fab.style.display = 'flex';
}
