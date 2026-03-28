/**
 * Retry Helper — Tự động retry khi Supabase thất bại do mất mạng
 * Sử dụng: const result = await supabaseRetry(() => supabase.from('orders').select('*'));
 */

// Toast notification container
(function initRetryHelper() {
    if (document.getElementById('retry-toast-container')) return;
    const container = document.createElement('div');
    container.id = 'retry-toast-container';
    container.style.cssText = 'position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;';
    document.body.appendChild(container);
})();

function showRetryToast(message, type = 'warning') {
    const container = document.getElementById('retry-toast-container');
    if (!container) return;
    
    const colors = {
        warning: { bg: '#FFA500', text: '#fff' },
        error: { bg: '#e74c3c', text: '#fff' },
        success: { bg: '#2ecc71', text: '#fff' },
        info: { bg: '#3498db', text: '#fff' }
    };
    const c = colors[type] || colors.info;
    
    const toast = document.createElement('div');
    toast.style.cssText = `background:${c.bg};color:${c.text};padding:12px 20px;border-radius:12px;font-size:14px;font-weight:600;box-shadow:0 4px 15px rgba(0,0,0,0.2);animation:slideInRight 0.3s ease;max-width:350px;`;
    toast.textContent = message;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transition = 'opacity 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

/**
 * Retry wrapper cho Supabase operations
 * @param {Function} fn — Hàm async trả về kết quả Supabase
 * @param {number} maxRetries — Số lần retry tối đa (default: 3)
 * @param {number} baseDelay — Delay cơ bản (ms) giữa mỗi lần retry (default: 1000)
 * @returns {Promise} — Kết quả từ Supabase
 */
async function supabaseRetry(fn, maxRetries = 3, baseDelay = 1000) {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const result = await fn();
            
            // Supabase trả error trong body (không throw)
            if (result.error) {
                // Nếu là lỗi mạng hoặc timeout, retry
                const errMsg = result.error.message || '';
                const isRetryable = errMsg.includes('Failed to fetch') || 
                                    errMsg.includes('NetworkError') ||
                                    errMsg.includes('timeout') ||
                                    errMsg.includes('ECONNREFUSED') ||
                                    result.error.code === 'PGRST301';
                
                if (isRetryable && attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt); // Exponential backoff
                    showRetryToast(`⚠️ Mất kết nối, thử lại lần ${attempt + 1}/${maxRetries}...`, 'warning');
                    await new Promise(resolve => setTimeout(resolve, delay));
                    continue;
                }
            }
            
            return result;
        } catch (err) {
            lastError = err;
            
            if (attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt);
                showRetryToast(`⚠️ Lỗi kết nối, thử lại sau ${delay/1000}s...`, 'warning');
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }
    
    showRetryToast('❌ Không thể kết nối máy chủ. Vui lòng kiểm tra WiFi.', 'error');
    throw lastError || new Error('Supabase request failed after retries');
}

// Online/Offline detection
window.addEventListener('online', () => {
    showRetryToast('✅ Đã kết nối lại Internet!', 'success');
});

window.addEventListener('offline', () => {
    showRetryToast('📡 Mất kết nối Internet. Một số tính năng có thể không hoạt động.', 'error');
});

// CSS animation
const retryStyles = document.createElement('style');
retryStyles.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
`;
document.head.appendChild(retryStyles);

// Export for use
window.supabaseRetry = supabaseRetry;
window.showRetryToast = showRetryToast;
