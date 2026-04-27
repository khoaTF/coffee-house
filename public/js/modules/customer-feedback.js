// ====================================================
// customer-feedback.js — Feedback, FAB, PWA, dark mode patch
// ====================================================
import { TABLE_NUMBER, state } from './customer-config.js';
import { customerAlert, customerConfirm } from './customer-ui.js';
import { fetchMenu } from './customer-menu.js';

// --- Feedback Logic ---
let selectedRating = 0;
const feedbackShownOrders = new Set();

export function showFeedbackModal() {
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
window.showFeedbackModal = showFeedbackModal;

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
window.closeFeedbackModal = closeFeedbackModal;

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

// Bind star listeners
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

window.submitFeedback = async (orderId) => {
    // Popup feedback system
    if (orderId) {
        let popupSelectedRating = state.popupSelectedRating || 0;
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
                tenant_id: state.tenantId,
                order_id: orderId,
                table_number: TABLE_NUMBER.toString(),
                rating: popupSelectedRating,
                comment: comment,
                customer_phone: window.currentCustomerPhone || null,
                category_ratings: getCategoryRatings()
            }]);
            
            sessionStorage.setItem('feedback_' + orderId, 'true');
            
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
        
        state.popupSelectedRating = 0;
        return;
    }

    // Modal-based feedback (old system)
    if (selectedRating === 0) {
        await customerAlert("Vui lòng chọn số sao đánh giá!");
        return;
    }
    const comment = document.getElementById('feedback-comment').value;
    const btn = document.getElementById('submit-feedback-btn');
    
    try {
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin me-2"></i>Đang gửi...';
        
        const feedbackData = {
            tenant_id: state.tenantId,
            order_id: state.currentFeedbackOrderId, 
            rating: selectedRating,
            comment: comment,
            table_number: TABLE_NUMBER.toString()
        };
        
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
    btn.disabled = false;
    btn.innerHTML = 'Gửi đánh giá';
};

// Auto-show feedback on completed
export function checkAndShowFeedback(updatedOrder) {
    if (updatedOrder.status !== 'Completed') return;
    if (!state.sessionOrders.some(o => o._id === updatedOrder._id)) return;

    setTimeout(() => {
        showThankYouCelebration(() => {
            state.currentFeedbackOrderId = updatedOrder._id;
            showFeedbackModal();
        });
    }, 1500);
}

function showThankYouCelebration(callback) {
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

    setTimeout(() => { if (document.getElementById('thank-you-overlay')) { closeEl(); setTimeout(callback, 400); } }, 8000);
}

// Popup feedback system
function showFeedbackPopup(orderId) {
    if (sessionStorage.getItem('feedback_' + orderId)) return;
    
    const overlay = document.createElement('div');
    overlay.id = 'feedback-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:99999;display:flex;align-items:center;justify-content:center;padding:20px;animation:fadeIn 0.3s ease;backdrop-filter:blur(4px);';
    
    overlay.innerHTML = `
        <div style="background:#fff;border-radius:24px;max-width:400px;width:100%;padding:32px;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.3);animation:slideUp 0.4s ease;">
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

            <!-- Category Ratings -->
            <div id="feedback-categories" style="display:flex;gap:8px;margin-bottom:16px;justify-content:center;">
                <div class="fb-cat" data-cat="drinks" onclick="toggleFeedbackCat(this)" style="flex:1;padding:10px 6px;border-radius:14px;border:2px solid #eee;background:#fafafa;cursor:pointer;transition:all 0.2s;text-align:center;">
                    <div style="font-size:24px;margin-bottom:4px;">🍹</div>
                    <div style="font-size:11px;font-weight:700;color:#999;">Đồ uống</div>
                    <div class="fb-cat-stars" style="font-size:12px;color:#ddd;margin-top:4px;">☆☆☆☆☆</div>
                    <input type="hidden" name="cat-drinks" value="0">
                </div>
                <div class="fb-cat" data-cat="service" onclick="toggleFeedbackCat(this)" style="flex:1;padding:10px 6px;border-radius:14px;border:2px solid #eee;background:#fafafa;cursor:pointer;transition:all 0.2s;text-align:center;">
                    <div style="font-size:24px;margin-bottom:4px;">🤝</div>
                    <div style="font-size:11px;font-weight:700;color:#999;">Phục vụ</div>
                    <div class="fb-cat-stars" style="font-size:12px;color:#ddd;margin-top:4px;">☆☆☆☆☆</div>
                    <input type="hidden" name="cat-service" value="0">
                </div>
                <div class="fb-cat" data-cat="ambiance" onclick="toggleFeedbackCat(this)" style="flex:1;padding:10px 6px;border-radius:14px;border:2px solid #eee;background:#fafafa;cursor:pointer;transition:all 0.2s;text-align:center;">
                    <div style="font-size:24px;margin-bottom:4px;">🏠</div>
                    <div style="font-size:11px;font-weight:700;color:#999;">Không gian</div>
                    <div class="fb-cat-stars" style="font-size:12px;color:#ddd;margin-top:4px;">☆☆☆☆☆</div>
                    <input type="hidden" name="cat-ambiance" value="0">
                </div>
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

window.selectFeedbackRating = function(rating) {
    state.popupSelectedRating = rating;
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
        star.style.color = idx < (state.popupSelectedRating || 0) ? '#D4AF37' : '#ddd';
    });
};

window.closeFeedbackPopup = function() {
    const overlay = document.getElementById('feedback-overlay');
    if (overlay) overlay.remove();
};

// Category rating toggle: each click cycles 0→1→2→3→4→5→0
window.toggleFeedbackCat = function(el) {
    const input = el.querySelector('input[type="hidden"]');
    const starsDiv = el.querySelector('.fb-cat-stars');
    let val = parseInt(input.value || 0);
    val = val >= 5 ? 0 : val + 1;
    input.value = val;
    starsDiv.textContent = '★'.repeat(val) + '☆'.repeat(5 - val);
    starsDiv.style.color = val > 0 ? '#D4AF37' : '#ddd';
    el.style.borderColor = val > 0 ? '#D4AF37' : '#eee';
    el.style.background = val > 0 ? '#FFFBF0' : '#fafafa';
};

// Helper to collect category ratings
function getCategoryRatings() {
    const cats = {};
    document.querySelectorAll('.fb-cat').forEach(el => {
        const cat = el.dataset.cat;
        const val = parseInt(el.querySelector('input[type="hidden"]')?.value || 0);
        if (val > 0) cats[cat] = val;
    });
    return Object.keys(cats).length > 0 ? cats : null;
};

// --- Staff Requests ---
window.requestStaffService = async function(type) {
    const messages = {
        'staff': 'Bạn muốn gọi nhân viên phục vụ?',
        'water': 'Bạn muốn yêu cầu thêm nước lọc?',
        'checkout': 'Bạn muốn yêu cầu tính tiền?'
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
            tenant_id: state.tenantId,
            table_number: TABLE_NUMBER.toString(),
            type: dbType,
            status: 'pending'
        }]);
        if (error) throw error;
        
        const successMsgs = {
             'staff': 'Đã gửi yêu cầu nhân viên!',
             'water': 'Đã yêu cầu thêm nước lọc. NV sẽ lấy ngay!',
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

document.querySelectorAll('.fab-item').forEach(btn => {
    btn.addEventListener('click', () => {
        const fabMenu = document.getElementById('fab-menu');
        if (fabMenu && fabMenu.classList.contains('active')) {
            window.toggleFabMenu();
        }
    });
});

// --- CSS animations for feedback ---
const feedbackStyles = document.createElement('style');
feedbackStyles.textContent = `
    @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
    @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
    @keyframes slideUp { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
    @keyframes shake { 0%,100% { transform: translateX(0); } 25% { transform: translateX(-8px); } 75% { transform: translateX(8px); } }
    @keyframes bounce { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-12px); } }
`;
document.head.appendChild(feedbackStyles);

// --- PWA Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    });
}

// --- Dark Mode Manual Toggle Patch ---
document.addEventListener('DOMContentLoaded', () => {
    const toggleBtns = document.querySelectorAll('[onclick*="dark"]');
    toggleBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const isDark = document.documentElement.classList.contains('dark');
            localStorage.setItem('theme_manual', isDark ? 'light' : 'dark');
        });
    });
});
