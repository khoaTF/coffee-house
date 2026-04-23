// =============================================
// GACHA.JS v4 — Loyalty Spin Wheel (Points-based)
// Flow: Earn 500 pts → Spin → Win a free drink
// =============================================

const GACHA_SPIN_COST = 500; // Points needed per spin

// --- Rarity tier based on price ---
function getRarityClass(price) {
    if (price <= 30000) return 'rarity-common';
    if (price <= 45000) return 'rarity-uncommon';
    if (price <= 60000) return 'rarity-rare';
    return 'rarity-legendary';
}

// --- Item emoji based on name ---
function getItemEmoji(name) {
    const n = name.toLowerCase();
    if (n.includes('cà phê') || n.includes('coffee') || n.includes('espresso') || n.includes('latte') || n.includes('cappuccino')) return '☕';
    if (n.includes('trà') || n.includes('tea')) return '🍵';
    if (n.includes('sinh tố') || n.includes('smoothie')) return '🥤';
    if (n.includes('nước ép') || n.includes('juice')) return '🧃';
    if (n.includes('sữa') || n.includes('milk')) return '🥛';
    if (n.includes('đá xay') || n.includes('frapp')) return '🧊';
    if (n.includes('bánh') || n.includes('cake')) return '🍰';
    if (n.includes('matcha')) return '🍃';
    if (n.includes('chocolate') || n.includes('cacao') || n.includes('sô-cô-la')) return '🍫';
    return '🥤';
}

// --- Weighted random: expensive items are rarer ---
function weightedRandomItem(items) {
    const weighted = items.map(item => ({
        item,
        weight: item.price <= 30000 ? 4
              : item.price <= 45000 ? 3
              : item.price <= 60000 ? 2
              : 1
    }));
    const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
    let roll = Math.random() * totalWeight;
    for (const w of weighted) {
        roll -= w.weight;
        if (roll <= 0) return w.item;
    }
    return weighted[weighted.length - 1].item;
}

// --- Check and show/hide the floating spin button ---
function updateGachaFAB() {
    const fab = document.getElementById('gacha-spin-fab');
    if (!fab) return;

    const pts = window.currentCustomerPoints || 0;
    const phone = window.currentCustomerPhone;

    if (phone && pts >= GACHA_SPIN_COST) {
        fab.classList.add('visible');
        fab.querySelector('.gacha-fab-pts').textContent = `${pts} đ`;
    } else {
        fab.classList.remove('visible');
    }
}
window.updateGachaFAB = updateGachaFAB;

// --- Main spin action ---
async function startGachaSpin() {
    const pts = window.currentCustomerPoints || 0;
    const phone = window.currentCustomerPhone;

    if (!phone) {
        if (typeof showToast === 'function') showToast('Vui lòng nhập SĐT trước khi quay!', 'warning');
        return;
    }
    if (pts < GACHA_SPIN_COST) {
        if (typeof showToast === 'function') showToast(`Bạn cần ${GACHA_SPIN_COST} điểm để quay. Hiện có ${pts} điểm.`, 'warning');
        return;
    }

    // Get menu items for prize pool
    const available = (window.menuItems || []).filter(i => i.price > 0 && !i.isGacha && i.is_available !== false);
    if (available.length < 3) {
        if (typeof showToast === 'function') showToast('Menu chưa đủ món để quay thưởng!', 'warning');
        return;
    }

    // Pick winner
    const winner = weightedRandomItem(available);

    // Deduct points in DB
    try {
        const tenantId = window.__tenantId || localStorage.getItem('tenantId');
        const { data: cust } = await supabase
            .from('customers')
            .select('id, current_points')
            .eq('tenant_id', tenantId)
            .eq('phone', phone)
            .maybeSingle();

        if (!cust || cust.current_points < GACHA_SPIN_COST) {
            if (typeof showToast === 'function') showToast('Điểm không đủ hoặc tài khoản không tìm thấy!', 'error');
            return;
        }

        // Deduct points
        await supabase
            .from('customers')
            .update({ current_points: cust.current_points - GACHA_SPIN_COST })
            .eq('id', cust.id);

        // Log the point deduction
        await supabase
            .from('point_logs')
            .insert([{
                tenant_id: tenantId,
                customer_id: cust.id,
                amount: -GACHA_SPIN_COST,
                reason: `🎰 Quay thưởng: Đổi ${GACHA_SPIN_COST} điểm → ${winner.name}`
            }]);

        // Update local state
        window.currentCustomerPoints = cust.current_points - GACHA_SPIN_COST;
        updateGachaFAB();

    } catch (e) {
        console.error('Gacha deduct error:', e);
        if (typeof showToast === 'function') showToast('Lỗi khi trừ điểm. Vui lòng thử lại!', 'error');
        return;
    }

    // Show the reel animation
    const gachaResult = {
        resolvedItem: winner,
        gachaPrice: 0,
        actualPrice: winner.price
    };

    await showSpinReveal(available, gachaResult);

    // Add the won item to cart for FREE
    const freeItem = {
        _id: winner._id || winner.id,
        name: '🎁 ' + winner.name,
        price: 0,
        quantity: 1,
        cartKey: 'gacha_reward_' + Date.now(),
        recipe: winner.recipe || [],
        selectedOptions: [],
        isGachaReward: true,
        _originalPrice: winner.price
    };

    if (window.cart && Array.isArray(window.cart)) {
        window.cart.push(freeItem);
        if (typeof updateCartUI === 'function') updateCartUI();
    }

    if (typeof showToast === 'function') {
        showToast(`🎉 Bạn nhận được ${winner.name} MIỄN PHÍ! Đã thêm vào giỏ.`, 'success');
    }
}
window.startGachaSpin = startGachaSpin;

// --- Spin Reel Animation ---
function showSpinReveal(allItems, result) {
    return new Promise(resolve => {
        const modal = document.getElementById('gacha-slot-modal');
        if (!modal) { resolve(); return; }

        const allNames = allItems.map(i => ({ name: i.name, price: i.price }));

        // Update header for reward mode
        const titleEl = modal.querySelector('h2');
        if (titleEl) titleEl.textContent = '🎰 Vòng Quay May Mắn';

        const subtitle = document.getElementById('gacha-slot-subtitle');
        if (subtitle) subtitle.textContent = 'Đang quay cho bạn...';

        modal.classList.add('active');
        renderCaseOpening(allNames, result, () => {
            setTimeout(() => {
                modal.classList.remove('active');
                resolve();
            }, 3500);
        });
    });
}

function renderCaseOpening(allNames, result, onComplete) {
    const reel = document.getElementById('gacha-reel');
    const resultPanel = document.getElementById('gacha-slot-result');
    const reelContainer = document.getElementById('gacha-reel-container');

    if (!reel || !resultPanel || !reelContainer) { onComplete(); return; }

    resultPanel.classList.add('hidden');
    resultPanel.innerHTML = '';
    reelContainer.classList.remove('hidden');

    const REEL_COUNT = 45;
    const ITEM_WIDTH = 120;
    const WINNER_OFFSET = 3;
    const shuffled = [...allNames].sort(() => Math.random() - 0.5);
    const reelItems = [];
    const winnerIndex = REEL_COUNT - WINNER_OFFSET;

    for (let i = 0; i < REEL_COUNT; i++) {
        if (i === winnerIndex) {
            reelItems.push({ name: result.resolvedItem.name, price: result.resolvedItem.price, isWinner: true });
        } else {
            reelItems.push(shuffled[i % shuffled.length]);
        }
    }

    reel.innerHTML = '';
    reel.style.transition = 'none';
    reel.style.transform = 'translateX(0)';

    reelItems.forEach(item => {
        const div = document.createElement('div');
        const rarity = getRarityClass(item.price);
        div.className = `gacha-reel-item ${rarity}`;

        const emoji = getItemEmoji(item.name);
        const esc = window.escapeHTML ? window.escapeHTML(item.name) : item.name;

        div.innerHTML = `
            <span class="item-emoji">${emoji}</span>
            <span class="gacha-reel-name">${esc}</span>
            <span class="gacha-reel-price">${item.price.toLocaleString('vi-VN')}đ</span>
        `;
        reel.appendChild(div);
    });

    void reel.offsetHeight;

    const containerWidth = reelContainer.offsetWidth || 360;
    const targetOffset = (winnerIndex * ITEM_WIDTH) + (ITEM_WIDTH / 2) - (containerWidth / 2);
    const jitter = (Math.random() - 0.5) * 20;

    requestAnimationFrame(() => {
        reel.style.transition = `transform 6s cubic-bezier(0.05, 0.85, 0.03, 1.00)`;
        reel.style.transform = `translateX(-${targetOffset + jitter}px)`;
    });

    if (navigator.vibrate) {
        const tickInterval = setInterval(() => { navigator.vibrate(10); }, 120);
        setTimeout(() => {
            clearInterval(tickInterval);
            navigator.vibrate([50, 30, 100]);
        }, 5500);
    }

    const subtitle = document.getElementById('gacha-slot-subtitle');
    if (subtitle) {
        subtitle.textContent = 'Đang quay...';
        setTimeout(() => { subtitle.textContent = 'Sắp dừng...'; }, 4000);
    }

    setTimeout(() => {
        reelContainer.classList.add('hidden');
        if (subtitle) subtitle.textContent = '🎉 Kết quả!';

        const rarityColor = getRarityClass(result.actualPrice).replace('rarity-', '');
        const tierLabels = { common: 'Phổ thông', uncommon: 'Hiếm', rare: 'Rất hiếm', legendary: 'Huyền thoại' };
        const tierColors = { common: '#4B69FF', uncommon: '#8847FF', rare: '#D32CE6', legendary: '#EB4B4B' };

        resultPanel.innerHTML = `
            <div class="gacha-result-anim" style="text-align:center;padding:20px 0;">
                <div style="font-size:3.5rem;margin-bottom:8px;">🎉</div>
                <h3 style="font-size:1.3rem;font-weight:900;color:#22C55E;margin-bottom:4px;">CHÚC MỪNG!</h3>
                <span style="display:inline-block;padding:2px 12px;border-radius:999px;font-size:0.65rem;font-weight:700;background:${tierColors[rarityColor]}22;color:${tierColors[rarityColor]};border:1px solid ${tierColors[rarityColor]}44;margin-bottom:14px;">
                    ${tierLabels[rarityColor] || 'Phổ thông'}
                </span>
                <div style="background:#161b22;border-radius:16px;padding:16px;text-align:left;border:1px solid rgba(255,255,255,0.06);">
                    <p style="font-weight:800;font-size:1.05rem;color:#fff;margin-bottom:8px;">
                        ${getItemEmoji(result.resolvedItem.name)} ${window.escapeHTML ? window.escapeHTML(result.resolvedItem.name) : result.resolvedItem.name}
                    </p>
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:rgba(255,255,255,0.5);">
                        <span>Giá gốc: <b style="color:#FF7A00;">${result.actualPrice.toLocaleString('vi-VN')}đ</b></span>
                        <span>Bạn trả: <b style="color:#22C55E;">MIỄN PHÍ</b></span>
                    </div>
                    <div style="margin-top:8px;font-weight:700;font-size:0.85rem;color:#22C55E;">
                        🔥 Tiết kiệm ${result.actualPrice.toLocaleString('vi-VN')}đ
                    </div>
                </div>
            </div>`;

        resultPanel.classList.remove('hidden');
        launchGachaConfetti();

        setTimeout(onComplete, 3500);
    }, 6300);
}

// --- Confetti ---
function launchGachaConfetti() {
    const container = document.getElementById('gacha-slot-confetti');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['#FF7A00', '#22C55E', '#3B82F6', '#EF4444', '#F59E0B', '#EC4899', '#14B8A6', '#FFD700'];

    for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        const size = Math.random() * 8 + 5;
        const x = Math.random() * 100;
        const delay = Math.random() * 0.5;
        const duration = Math.random() * 1.5 + 1.8;
        const color = colors[Math.floor(Math.random() * colors.length)];

        piece.style.cssText = `
            position:absolute;width:${size}px;height:${size}px;background:${color};
            left:${x}%;top:-10px;border-radius:${Math.random() > 0.5 ? '50%' : '2px'};opacity:0;
            animation:gacha-confetti-fall ${duration}s ease-out ${delay}s forwards;
            transform:rotate(${Math.random() * 360}deg);
        `;
        container.appendChild(piece);
    }

    setTimeout(() => { container.innerHTML = ''; }, 3500);
}

// --- Close Slot Modal ---
function closeGachaSlotModal() {
    const modal = document.getElementById('gacha-slot-modal');
    if (modal) modal.classList.remove('active');
}
window.closeGachaSlotModal = closeGachaSlotModal;
