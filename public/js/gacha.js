// =============================================
// GACHA.JS v2 — Túi Mù (Mystery Box) Slot Machine
// Flow: Add to cart → Pay → Reveal with slot animation
// =============================================

const GACHA_PRICE = 29000;
const GACHA_PRODUCT_ID = '__mystery_box__';

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

// --- Resolve gacha items BEFORE order placement ---
// Replaces mystery box entries in cart with actual random items (keeping gacha price)
// Returns array of { gachaCartKey, resolvedItem } for animation later
function resolveGachaInCart() {
    const available = menuItems.filter(i => i.price > 0 && !i.isGacha);
    if (available.length === 0) return [];

    const results = [];

    cart.forEach(item => {
        if (!item.isGacha) return;

        const randomItem = available[Math.floor(Math.random() * available.length)];

        results.push({
            cartKey: item.cartKey,
            resolvedItem: randomItem,
            gachaPrice: GACHA_PRICE,
            actualPrice: randomItem.price
        });

        // Replace in cart
        item._id = randomItem._id;
        item.name = '🎰 ' + randomItem.name;
        item.recipe = randomItem.recipe || [];
        // Keep price at GACHA_PRICE
        item._resolvedName = randomItem.name;
        item._resolvedPrice = randomItem.price;
    });

    return results;
}

// --- Slot Machine Animation ---
// Shows a vertical scrolling list of item names, decelerating to reveal result
function showSlotReveal(gachaResults) {
    if (!gachaResults || gachaResults.length === 0) return Promise.resolve();

    return new Promise(resolve => {
        const modal = document.getElementById('gacha-slot-modal');
        if (!modal) { resolve(); return; }

        // Build name pool for scrolling (use all menu items)
        const allNames = menuItems
            .filter(i => i.price > 0)
            .map(i => ({ name: i.name, price: i.price }));

        // For simplicity, we reveal the FIRST gacha result
        // (multiple mystery boxes will queue)
        let currentResultIndex = 0;

        function revealNext() {
            if (currentResultIndex >= gachaResults.length) {
                modal.classList.remove('active');
                resolve();
                return;
            }

            const result = gachaResults[currentResultIndex];
            currentResultIndex++;

            renderSlotMachine(allNames, result, () => {
                // Short pause before next or close
                setTimeout(revealNext, 800);
            });
        }

        modal.classList.add('active');
        revealNext();
    });
}

function renderSlotMachine(allNames, result, onComplete) {
    const reel = document.getElementById('gacha-reel');
    const resultPanel = document.getElementById('gacha-slot-result');
    const reelContainer = document.getElementById('gacha-reel-container');

    if (!reel || !resultPanel || !reelContainer) { onComplete(); return; }

    resultPanel.classList.add('hidden');
    resultPanel.innerHTML = '';
    reelContainer.classList.remove('hidden');

    // Create reel items: many random names, then the winning name at the end
    const REEL_COUNT = 25;
    const shuffled = [...allNames].sort(() => Math.random() - 0.5);
    const reelItems = [];

    for (let i = 0; i < REEL_COUNT; i++) {
        reelItems.push(shuffled[i % shuffled.length]);
    }
    // Winning item is last
    reelItems.push({ name: result.resolvedItem.name, price: result.resolvedItem.price });

    // Render reel
    reel.innerHTML = '';
    reel.style.transition = 'none';
    reel.style.transform = 'translateY(0)';

    const ITEM_HEIGHT = 64;

    reelItems.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'gacha-reel-item';
        const isWinner = index === reelItems.length - 1;
        div.innerHTML = `
            <span class="gacha-reel-name ${isWinner ? 'gacha-winner-name' : ''}">${window.escapeHTML ? window.escapeHTML(item.name) : item.name}</span>
            <span class="gacha-reel-price">${item.price.toLocaleString('vi-VN')}đ</span>
        `;
        reel.appendChild(div);
    });

    // Force reflow
    void reel.offsetHeight;

    // Calculate scroll distance: move reel up so the LAST item is centered
    const totalHeight = reelItems.length * ITEM_HEIGHT;
    const containerHeight = reelContainer.offsetHeight || 200;
    const targetOffset = totalHeight - containerHeight / 2 - ITEM_HEIGHT / 2;

    // Animate
    requestAnimationFrame(() => {
        reel.style.transition = `transform 3.5s cubic-bezier(0.10, 0.80, 0.05, 1.00)`;
        reel.style.transform = `translateY(-${targetOffset}px)`;
    });

    // Vibrate during scroll
    if (navigator.vibrate) {
        setTimeout(() => navigator.vibrate([30, 20, 30, 20, 30]), 200);
        setTimeout(() => navigator.vibrate(100), 3000);
    }

    // Show result after animation
    setTimeout(() => {
        reelContainer.classList.add('hidden');

        const diff = result.actualPrice - result.gachaPrice;
        const isWin = diff > 0;
        const isEven = diff === 0;
        const emoji = isWin ? '🎉' : (isEven ? '😄' : '😅');
        const label = isWin ? 'LỜI RỒI!' : (isEven ? 'Hoà!' : 'Lỗ nhẹ!');
        const diffColor = isWin ? '#22C55E' : (isEven ? '#FF7A00' : '#EF4444');
        const diffText = isWin
            ? `🔥 Tiết kiệm ${Math.abs(diff).toLocaleString('vi-VN')}đ`
            : (isEven ? '➡️ Giá vừa đúng!' : `📉 Chênh ${Math.abs(diff).toLocaleString('vi-VN')}đ`);

        resultPanel.innerHTML = `
            <div class="gacha-result-anim" style="text-align:center;padding:20px 0;">
                <div style="font-size:3.5rem;margin-bottom:8px;">${emoji}</div>
                <h3 style="font-size:1.3rem;font-weight:900;color:${diffColor};margin-bottom:16px;">${label}</h3>
                <div style="background:var(--surface-container-low,#F0EDEC);border-radius:16px;padding:16px;text-align:left;">
                    <p style="font-weight:800;font-size:1.05rem;color:var(--text-main,#1b1c1b);margin-bottom:8px;">
                        ${window.escapeHTML ? window.escapeHTML(result.resolvedItem.name) : result.resolvedItem.name}
                    </p>
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted,#888);">
                        <span>Giá gốc: <b style="color:#FF7A00;">${result.actualPrice.toLocaleString('vi-VN')}đ</b></span>
                        <span>Bạn trả: <b>${result.gachaPrice.toLocaleString('vi-VN')}đ</b></span>
                    </div>
                    <div style="margin-top:8px;font-weight:700;font-size:0.85rem;color:${diffColor};">
                        ${diffText}
                    </div>
                </div>
            </div>`;

        resultPanel.classList.remove('hidden');

        if (isWin) launchGachaConfetti();

        // Auto-close after delay
        setTimeout(onComplete, 3500);
    }, 3800);
}

// --- Confetti ---
function launchGachaConfetti() {
    const container = document.getElementById('gacha-slot-confetti');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['#FF7A00', '#22C55E', '#3B82F6', '#EF4444', '#F59E0B', '#EC4899', '#8B5CF6', '#FFD700'];

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
