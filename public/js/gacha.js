// =============================================
// GACHA.JS v3 — CS:GO Case Opening Style
// Flow: Add to cart → Pay → Horizontal reel reveal
// =============================================

const GACHA_PRICE = 29000;
const GACHA_PRODUCT_ID = '__mystery_box__';

// --- Rarity tier based on price ---
function getRarityClass(price) {
    if (price <= GACHA_PRICE) return 'rarity-common';        // Blue: ≤29k
    if (price <= GACHA_PRICE * 1.4) return 'rarity-uncommon'; // Teal: ≤40.6k
    if (price <= GACHA_PRICE * 1.75) return 'rarity-rare';    // Pink: ≤50.75k  
    return 'rarity-legendary';                                // Red: >50.75k
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

// --- Add Mystery Box to Cart ---
function addMysteryBoxToCart() {
    if (activeOrderId) {
        showToast('Đợi đơn hiện tại hoàn thành trước nhé!', 'warning');
        return;
    }

    const cartItem = {
        _id: GACHA_PRODUCT_ID,
        name: '🎰 Túi Mù',
        price: GACHA_PRICE,
        quantity: 1,
        cartKey: 'gacha_' + Date.now(),
        recipe: [],
        selectedOptions: [],
        isGacha: true
    };

    cart.push(cartItem);
    updateCartUI();
    showToast('🎰 Đã thêm Túi Mù vào giỏ! Thanh toán để mở túi.', 'success');
}

// --- Check if cart contains gacha items ---
function cartHasGacha() {
    return cart.some(i => i.isGacha);
}

// --- Weighted random: expensive items are rarer ---
function weightedRandomItem(items) {
    const weighted = items.map(item => ({
        item,
        weight: item.price <= GACHA_PRICE ? 3
              : item.price <= GACHA_PRICE * 1.5 ? 2
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

// --- Resolve gacha items BEFORE order placement ---
function resolveGachaInCart() {
    const available = menuItems.filter(i => i.price > 0 && !i.isGacha);
    if (available.length === 0) return [];

    const results = [];

    cart.forEach(item => {
        if (!item.isGacha) return;

        const randomItem = weightedRandomItem(available);

        results.push({
            cartKey: item.cartKey,
            resolvedItem: randomItem,
            gachaPrice: GACHA_PRICE,
            actualPrice: randomItem.price
        });

        item._id = randomItem._id;
        item.name = '🎰 ' + randomItem.name;
        item.recipe = randomItem.recipe || [];
        item._resolvedName = randomItem.name;
        item._resolvedPrice = randomItem.price;
    });

    return results;
}

// --- CS:GO Case Opening Animation ---
function showSlotReveal(gachaResults) {
    if (!gachaResults || gachaResults.length === 0) return Promise.resolve();

    return new Promise(resolve => {
        const modal = document.getElementById('gacha-slot-modal');
        if (!modal) { resolve(); return; }

        const allNames = menuItems
            .filter(i => i.price > 0)
            .map(i => ({ name: i.name, price: i.price }));

        let currentResultIndex = 0;

        function revealNext() {
            if (currentResultIndex >= gachaResults.length) {
                modal.classList.remove('active');
                resolve();
                return;
            }

            const result = gachaResults[currentResultIndex];
            currentResultIndex++;

            renderCaseOpening(allNames, result, () => {
                setTimeout(revealNext, 800);
            });
        }

        // Reset subtitle
        const subtitle = document.getElementById('gacha-slot-subtitle');
        if (subtitle) subtitle.textContent = 'Đang bốc món cho bạn...';

        modal.classList.add('active');
        revealNext();
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

    // CS:GO reel: ~40 items, winner placed at specific index from end
    const REEL_COUNT = 45;
    const ITEM_WIDTH = 120;
    const WINNER_OFFSET = 3; // winner is 3 slots from the end (for suspense)
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

    // Build reel DOM
    reel.innerHTML = '';
    reel.style.transition = 'none';
    reel.style.transform = 'translateX(0)';

    reelItems.forEach((item, index) => {
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

    // Force reflow
    void reel.offsetHeight;

    // Calculate scroll: center the winner item under the indicator
    const containerWidth = reelContainer.offsetWidth || 360;
    const targetOffset = (winnerIndex * ITEM_WIDTH) + (ITEM_WIDTH / 2) - (containerWidth / 2);
    // Add slight random offset for realism (-10 to +10px)
    const jitter = (Math.random() - 0.5) * 20;

    // Animate with CS:GO-style deceleration
    requestAnimationFrame(() => {
        reel.style.transition = `transform 6s cubic-bezier(0.05, 0.85, 0.03, 1.00)`;
        reel.style.transform = `translateX(-${targetOffset + jitter}px)`;
    });

    // Tick vibration during scroll
    if (navigator.vibrate) {
        // Fast ticks at start
        const tickInterval = setInterval(() => {
            navigator.vibrate(10);
        }, 120);
        // Stop ticks and do final vibrate
        setTimeout(() => {
            clearInterval(tickInterval);
            navigator.vibrate([50, 30, 100]);
        }, 5500);
    }

    // Update subtitle during animation
    const subtitle = document.getElementById('gacha-slot-subtitle');
    if (subtitle) {
        subtitle.textContent = 'Đang quay...';
        setTimeout(() => { subtitle.textContent = 'Sắp dừng...'; }, 4000);
    }

    // Show result after animation completes
    setTimeout(() => {
        reelContainer.classList.add('hidden');
        if (subtitle) subtitle.textContent = '🎉 Kết quả!';

        const diff = result.actualPrice - result.gachaPrice;
        const isWin = diff > 0;
        const isEven = diff === 0;
        const emoji = isWin ? '🎉' : (isEven ? '😄' : '😅');
        const label = isWin ? 'LỜI RỒI!' : (isEven ? 'Hoà!' : 'Lỗ nhẹ!');
        const diffColor = isWin ? '#22C55E' : (isEven ? '#FF7A00' : '#EF4444');
        const rarityColor = getRarityClass(result.actualPrice).replace('rarity-', '');
        const tierLabels = { common: 'Phổ thông', uncommon: 'Hiếm', rare: 'Rất hiếm', legendary: 'Huyền thoại' };
        const tierColors = { common: '#4B69FF', uncommon: '#8847FF', rare: '#D32CE6', legendary: '#EB4B4B' };
        const diffText = isWin
            ? `🔥 Tiết kiệm ${Math.abs(diff).toLocaleString('vi-VN')}đ`
            : (isEven ? '➡️ Giá vừa đúng!' : `📉 Chênh ${Math.abs(diff).toLocaleString('vi-VN')}đ`);

        resultPanel.innerHTML = `
            <div class="gacha-result-anim" style="text-align:center;padding:20px 0;">
                <div style="font-size:3.5rem;margin-bottom:8px;">${emoji}</div>
                <h3 style="font-size:1.3rem;font-weight:900;color:${diffColor};margin-bottom:4px;">${label}</h3>
                <span style="display:inline-block;padding:2px 12px;border-radius:999px;font-size:0.65rem;font-weight:700;background:${tierColors[rarityColor]}22;color:${tierColors[rarityColor]};border:1px solid ${tierColors[rarityColor]}44;margin-bottom:14px;">
                    ${tierLabels[rarityColor] || 'Phổ thông'}
                </span>
                <div style="background:#161b22;border-radius:16px;padding:16px;text-align:left;border:1px solid rgba(255,255,255,0.06);">
                    <p style="font-weight:800;font-size:1.05rem;color:#fff;margin-bottom:8px;">
                        ${getItemEmoji(result.resolvedItem.name)} ${window.escapeHTML ? window.escapeHTML(result.resolvedItem.name) : result.resolvedItem.name}
                    </p>
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:rgba(255,255,255,0.5);">
                        <span>Giá gốc: <b style="color:#FF7A00;">${result.actualPrice.toLocaleString('vi-VN')}đ</b></span>
                        <span>Bạn trả: <b style="color:#fff;">${result.gachaPrice.toLocaleString('vi-VN')}đ</b></span>
                    </div>
                    <div style="margin-top:8px;font-weight:700;font-size:0.85rem;color:${diffColor};">
                        ${diffText}
                    </div>
                </div>
            </div>`;

        resultPanel.classList.remove('hidden');

        if (isWin) launchGachaConfetti();

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

// --- Inject Mystery Card into Menu Grid ---
function injectGachaCard() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    const available = menuItems.filter(i => i.price > 0);
    if (available.length < 3) return;

    const card = document.createElement('article');
    card.id = 'gacha-mystery-card';
    card.className = 'rounded-[24px] overflow-hidden group cursor-pointer active:scale-[0.98] transition-all col-span-2 sm:col-span-2 lg:col-span-2';
    card.onclick = () => addMysteryBoxToCart();

    card.innerHTML = `
        <div class="gacha-card-inner relative overflow-hidden rounded-[24px]" style="background:linear-gradient(135deg,#1B1C1B 0%,#2A1A14 40%,#994700 100%);min-height:130px;">
            <div class="gacha-particles">
                <span class="gacha-star" style="top:15%;left:10%;animation-delay:0s;">✦</span>
                <span class="gacha-star" style="top:60%;left:85%;animation-delay:0.4s;">✦</span>
                <span class="gacha-star" style="top:25%;left:70%;animation-delay:0.8s;">⭐</span>
                <span class="gacha-star" style="top:75%;left:25%;animation-delay:1.2s;">✦</span>
                <span class="gacha-star" style="top:40%;left:50%;animation-delay:0.6s;">💫</span>
            </div>
            <div class="relative z-10 flex items-center justify-between p-5 gap-4">
                <div class="flex-1">
                    <div class="flex items-center gap-2 mb-2">
                        <span style="background:linear-gradient(135deg,#FF7A00,#F59E0B);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:0.65rem;font-weight:800;letter-spacing:0.1em;text-transform:uppercase;">✦ Giới hạn ✦</span>
                    </div>
                    <h3 style="font-size:1.25rem;font-weight:900;color:white;line-height:1.2;margin-bottom:4px;font-family:'Plus Jakarta Sans',sans-serif;">
                        🎰 Túi Mù
                    </h3>
                    <p style="font-size:0.75rem;color:rgba(255,255,255,0.6);line-height:1.4;margin-bottom:10px;">
                        Thanh toán trước, mở túi sau! Lời hay lỗ — hên xui!
                    </p>
                    <div class="flex items-center gap-3">
                        <span style="font-size:1.1rem;font-weight:900;color:#FF7A00;">${GACHA_PRICE.toLocaleString('vi-VN')}đ</span>
                        <button style="background:linear-gradient(135deg,#FF7A00,#F59E0B);color:white;padding:8px 20px;border-radius:9999px;font-size:0.8rem;font-weight:700;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(255,122,0,0.4);" class="active-scale">
                            Thêm vào giỏ
                        </button>
                    </div>
                </div>
                <div class="gacha-icon-wrap shrink-0" style="font-size:3.5rem;filter:drop-shadow(0 4px 12px rgba(255,122,0,0.4));">
                    🎁
                </div>
            </div>
        </div>
    `;

    container.insertBefore(card, container.firstChild);
}

// --- Close Slot Modal ---
function closeGachaSlotModal() {
    const modal = document.getElementById('gacha-slot-modal');
    if (modal) modal.classList.remove('active');
}
