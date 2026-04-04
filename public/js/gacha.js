// =============================================
// GACHA.JS — Mystery Box Spin Wheel 🎰
// =============================================

const GACHA_PRICE = 29000;
const GACHA_SEGMENT_COUNT = 8;
const GACHA_MISS_COUNT = 2;
const GACHA_COLORS = [
    '#FF7A00', '#22C55E', '#3B82F6', '#994700',
    '#EC4899', '#8B5CF6', '#F59E0B', '#06B6D4'
];

let gachaSegments = [];
let gachaSpinning = false;
let gachaRotation = 0;
let _gachaWinItem = null;

// --- Build Segments ---
function buildGachaSegments() {
    const available = menuItems.filter(i => i.price > 0 && getAvailableToAdd(i) > 0);
    if (available.length < GACHA_SEGMENT_COUNT - GACHA_MISS_COUNT) return false;

    const shuffled = [...available].sort(() => Math.random() - 0.5);
    gachaSegments = [];

    shuffled.slice(0, GACHA_SEGMENT_COUNT - GACHA_MISS_COUNT).forEach(item => {
        gachaSegments.push({
            name: item.name,
            price: item.price,
            _id: item._id,
            imageUrl: item.imageUrl,
            recipe: item.recipe || [],
            isMiss: false,
            original: item
        });
    });

    for (let i = 0; i < GACHA_MISS_COUNT; i++) {
        const pos = Math.floor(Math.random() * (gachaSegments.length + 1));
        gachaSegments.splice(pos, 0, { name: 'Trượt!', price: 0, isMiss: true });
    }
    return true;
}

// --- Draw Canvas Wheel ---
function drawGachaWheel() {
    const canvas = document.getElementById('gacha-canvas');
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const displaySize = Math.min(320, window.innerWidth - 80);
    canvas.style.width = displaySize + 'px';
    canvas.style.height = displaySize + 'px';
    canvas.width = displaySize * dpr;
    canvas.height = displaySize * dpr;

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const center = displaySize / 2;
    const radius = center - 8;
    const segAngle = (2 * Math.PI) / gachaSegments.length;

    ctx.clearRect(0, 0, displaySize, displaySize);

    // Outer glow ring
    ctx.beginPath();
    ctx.arc(center, center, radius + 5, 0, 2 * Math.PI);
    ctx.strokeStyle = 'rgba(255,122,0,0.3)';
    ctx.lineWidth = 4;
    ctx.stroke();

    gachaSegments.forEach((seg, i) => {
        const start = i * segAngle - Math.PI / 2;
        const end = start + segAngle;

        // Segment fill
        ctx.beginPath();
        ctx.moveTo(center, center);
        ctx.arc(center, center, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = seg.isMiss ? '#1B1C1B' : GACHA_COLORS[i % GACHA_COLORS.length];
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Text
        ctx.save();
        ctx.translate(center, center);
        ctx.rotate(start + segAngle / 2);

        if (seg.isMiss) {
            ctx.fillStyle = '#666';
            ctx.font = 'bold 13px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('💨', radius * 0.6, 0);
            ctx.fillStyle = '#aaa';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.fillText('Trượt', radius * 0.38, 0);
        } else {
            ctx.fillStyle = 'white';
            ctx.font = 'bold 11px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const truncName = seg.name.length > 10 ? seg.name.slice(0, 9) + '…' : seg.name;
            ctx.fillText(truncName, radius * 0.6, -6);
            ctx.font = '10px Inter, sans-serif';
            ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.fillText(seg.price.toLocaleString('vi-VN') + 'đ', radius * 0.6, 8);
        }
        ctx.restore();
    });

    // Center hub
    const grad = ctx.createRadialGradient(center, center, 5, center, center, 28);
    grad.addColorStop(0, '#fff');
    grad.addColorStop(1, '#F0EDEC');
    ctx.beginPath();
    ctx.arc(center, center, 28, 0, 2 * Math.PI);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = '#FF7A00';
    ctx.lineWidth = 3;
    ctx.stroke();

    ctx.fillStyle = '#FF7A00';
    ctx.font = 'bold 11px Inter, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🎰', center, center);
}

// --- Open Modal ---
function openGachaModal() {
    if (activeOrderId) {
        showToast('Đợi đơn hiện tại hoàn thành trước nhé!', 'warning');
        return;
    }

    const ok = buildGachaSegments();
    if (!ok) {
        showToast('Không đủ món trong menu để quay!', 'error');
        return;
    }

    // Reset
    gachaRotation = 0;
    _gachaWinItem = null;
    const wheelEl = document.getElementById('gacha-wheel-wrapper');
    if (wheelEl) {
        wheelEl.style.transition = 'none';
        wheelEl.style.transform = 'rotate(0deg)';
    }
    document.getElementById('gacha-result').classList.add('hidden');
    document.getElementById('gacha-result').innerHTML = '';
    document.getElementById('gacha-confetti').innerHTML = '';

    const btn = document.getElementById('gacha-spin-btn');
    btn.disabled = false;
    btn.innerHTML = '<i class="fa-solid fa-play"></i> QUAY! (29.000đ)';

    drawGachaWheel();
    document.getElementById('gacha-modal').classList.add('active');
}

function closeGachaModal() {
    document.getElementById('gacha-modal').classList.remove('active');
}

// --- Spin ---
function spinGachaWheel() {
    if (gachaSpinning) return;
    gachaSpinning = true;

    const resultIdx = Math.floor(Math.random() * gachaSegments.length);
    const result = gachaSegments[resultIdx];
    _gachaWinItem = result;

    const segAngle = 360 / gachaSegments.length;
    // Pointer is at top (12 o'clock). Segment 0 starts at top.
    // To land on segment `resultIdx`, rotate so that segment's center is at top.
    const targetAngle = 360 - (resultIdx * segAngle + segAngle / 2);
    const spins = 5 + Math.floor(Math.random() * 4); // 5-8 full spins
    const totalRotation = gachaRotation + 360 * spins + targetAngle + (Math.random() * segAngle * 0.4 - segAngle * 0.2);

    const wheelEl = document.getElementById('gacha-wheel-wrapper');
    // Force reflow for transition reset
    void wheelEl.offsetWidth;
    wheelEl.style.transition = 'transform 5s cubic-bezier(0.12, 0.75, 0.08, 1.00)';
    wheelEl.style.transform = `rotate(${totalRotation}deg)`;
    gachaRotation = totalRotation % 360;

    const btn = document.getElementById('gacha-spin-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang quay...';

    // Play tick sound simulation with vibration
    if (navigator.vibrate) navigator.vibrate([50, 30, 50, 30, 50]);

    setTimeout(() => {
        gachaSpinning = false;
        showGachaResult(result);
        if (navigator.vibrate) navigator.vibrate(200);
    }, 5300);
}

// --- Show Result ---
function showGachaResult(result) {
    const el = document.getElementById('gacha-result');

    if (result.isMiss) {
        el.innerHTML = `
            <div class="text-center py-6 gacha-result-anim">
                <div style="font-size:4rem;margin-bottom:12px;">😢</div>
                <h3 style="font-size:1.25rem;font-weight:900;color:var(--text-main,#1b1c1b);margin-bottom:4px;">Trượt rồi!</h3>
                <p style="font-size:0.875rem;color:var(--text-muted,#888);">Hên xui mà, thử lại nhé! 🍀</p>
                <button onclick="resetGachaSpin()" style="margin-top:16px;background:linear-gradient(135deg,#994700,#FF7A00);color:white;padding:12px 32px;border-radius:9999px;font-weight:700;border:none;cursor:pointer;font-size:0.95rem;" class="active-scale">
                    <i class="fa-solid fa-rotate-right"></i> Quay lại
                </button>
            </div>`;
    } else {
        const diff = result.price - GACHA_PRICE;
        const isWin = diff > 0;
        const emoji = isWin ? '🎉' : '😅';
        const label = isWin ? 'LỜI RỒI!' : 'Lỗ nhẹ!';
        const diffColor = isWin ? '#22C55E' : '#EF4444';
        const diffText = isWin ? `Tiết kiệm ${Math.abs(diff).toLocaleString('vi-VN')}đ` : `Chênh ${Math.abs(diff).toLocaleString('vi-VN')}đ`;

        el.innerHTML = `
            <div class="text-center py-4 gacha-result-anim">
                <div style="font-size:4rem;margin-bottom:8px;">${emoji}</div>
                <h3 style="font-size:1.25rem;font-weight:900;color:${isWin ? '#22C55E' : '#EF4444'};margin-bottom:12px;">${label}</h3>
                <div style="background:var(--surface-container-low, #F0EDEC);border-radius:16px;padding:16px;text-align:left;">
                    <p style="font-weight:800;font-size:1rem;color:var(--text-main,#1b1c1b);margin-bottom:6px;">${window.escapeHTML ? window.escapeHTML(result.name) : result.name}</p>
                    <div style="display:flex;justify-content:space-between;font-size:0.85rem;color:var(--text-muted,#888);">
                        <span>Giá gốc: <b style="color:#FF7A00;">${result.price.toLocaleString('vi-VN')}đ</b></span>
                        <span>Bạn trả: <b>${GACHA_PRICE.toLocaleString('vi-VN')}đ</b></span>
                    </div>
                    <div style="margin-top:8px;font-weight:700;font-size:0.85rem;color:${diffColor};">
                        ${isWin ? '🔥' : '📉'} ${diffText}
                    </div>
                </div>
                <button onclick="addGachaToCart()" style="margin-top:16px;width:100%;background:linear-gradient(135deg,#994700,#FF7A00);color:white;padding:14px;border-radius:9999px;font-weight:700;border:none;cursor:pointer;font-size:1rem;box-shadow:0 4px 16px rgba(255,122,0,0.3);" class="active-scale">
                    <i class="fa-solid fa-cart-plus"></i> Thêm vào giỏ
                </button>
                <button onclick="resetGachaSpin()" style="margin-top:8px;width:100%;background:transparent;color:var(--text-muted,#888);padding:10px;border-radius:9999px;font-weight:600;border:none;cursor:pointer;font-size:0.875rem;">
                    Quay lại
                </button>
            </div>`;

        if (isWin) launchGachaConfetti();
    }

    el.classList.remove('hidden');

    const btn = document.getElementById('gacha-spin-btn');
    btn.disabled = true;
    btn.style.opacity = '0.4';
}

// --- Reset for another spin ---
function resetGachaSpin() {
    _gachaWinItem = null;
    document.getElementById('gacha-result').classList.add('hidden');
    document.getElementById('gacha-result').innerHTML = '';
    document.getElementById('gacha-confetti').innerHTML = '';

    // Rebuild segments with new random items
    buildGachaSegments();
    drawGachaWheel();

    // Reset wheel
    const wheelEl = document.getElementById('gacha-wheel-wrapper');
    wheelEl.style.transition = 'none';
    gachaRotation = 0;
    wheelEl.style.transform = 'rotate(0deg)';

    const btn = document.getElementById('gacha-spin-btn');
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.innerHTML = '<i class="fa-solid fa-play"></i> QUAY! (29.000đ)';
}

// --- Add to Cart ---
function addGachaToCart() {
    if (!_gachaWinItem || _gachaWinItem.isMiss) return;

    const cartItem = {
        _id: _gachaWinItem._id,
        name: '🎰 ' + _gachaWinItem.name,
        price: GACHA_PRICE,
        quantity: 1,
        imageUrl: _gachaWinItem.imageUrl || '',
        cartKey: 'gacha_' + Date.now(),
        recipe: _gachaWinItem.recipe || [],
        selectedOptions: [],
        isGacha: true
    };

    cart.push(cartItem);
    updateCartUI();
    closeGachaModal();
    showToast('🎰 Đã thêm món Túi Mù vào giỏ!', 'success');
}

// --- Confetti ---
function launchGachaConfetti() {
    const container = document.getElementById('gacha-confetti');
    if (!container) return;
    container.innerHTML = '';

    const colors = ['#FF7A00', '#22C55E', '#3B82F6', '#EF4444', '#F59E0B', '#EC4899', '#8B5CF6', '#FFD700'];

    for (let i = 0; i < 60; i++) {
        const piece = document.createElement('div');
        const size = Math.random() * 8 + 5;
        const x = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = Math.random() * 1.5 + 1.8;
        const color = colors[Math.floor(Math.random() * colors.length)];
        const shape = Math.random() > 0.5 ? '50%' : '2px';

        piece.style.cssText = `
            position:absolute;width:${size}px;height:${size}px;background:${color};
            left:${x}%;top:-10px;border-radius:${shape};opacity:0;
            animation:gacha-confetti-fall ${duration}s ease-out ${delay}s forwards;
            transform:rotate(${Math.random()*360}deg);
        `;
        container.appendChild(piece);
    }

    setTimeout(() => { container.innerHTML = ''; }, 3500);
}

// --- Inject Mystery Card into Menu ---
function injectGachaCard() {
    const container = document.getElementById('menu-container');
    if (!container) return;

    // Only show if enough items exist
    const available = menuItems.filter(i => i.price > 0);
    if (available.length < GACHA_SEGMENT_COUNT - GACHA_MISS_COUNT) return;

    // Check if already active order
    const disableGacha = activeOrderId !== null;

    const card = document.createElement('article');
    card.id = 'gacha-mystery-card';
    card.className = 'rounded-[24px] overflow-hidden group cursor-pointer active:scale-[0.98] transition-all col-span-2 sm:col-span-2 lg:col-span-2';
    card.onclick = () => { if (!disableGacha) openGachaModal(); };

    card.innerHTML = `
        <div class="gacha-card-inner relative overflow-hidden rounded-[24px]" style="background:linear-gradient(135deg,#1B1C1B 0%,#2A1A14 40%,#994700 100%);min-height:140px;">
            <!-- Animated particles -->
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
                        Quay vòng quay, nhận món ngẫu nhiên. Lời hay lỗ — hên xui!
                    </p>
                    <div class="flex items-center gap-3">
                        <span style="font-size:1.1rem;font-weight:900;color:#FF7A00;">${GACHA_PRICE.toLocaleString('vi-VN')}đ</span>
                        <button style="background:linear-gradient(135deg,#FF7A00,#F59E0B);color:white;padding:8px 20px;border-radius:9999px;font-size:0.8rem;font-weight:700;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(255,122,0,0.4);" ${disableGacha ? 'disabled style="opacity:0.4;"' : ''} class="active-scale">
                            Thử Vận May!
                        </button>
                    </div>
                </div>
                <div class="gacha-icon-wrap shrink-0" style="font-size:3.5rem;filter:drop-shadow(0 4px 12px rgba(255,122,0,0.4));">
                    🎁
                </div>
            </div>
        </div>
    `;

    // Insert as first child
    container.insertBefore(card, container.firstChild);
}
