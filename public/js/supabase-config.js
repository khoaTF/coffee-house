const SUPABASE_URL = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';

// The CDN library loads as window.supabase (the module object).
// We must create the client and then OVERWRITE window.supabase with the client instance,
// so that all other scripts (admin.js, kitchen.js, customer.js) which call
// supabase.from(...) / supabase.channel(...) will find the initialized client.
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: {
        fetch: async (url, options) => {
            const timeout = 15000; // 15 seconds global timeout
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), timeout);
            try {
                const response = await fetch(url, { ...options, signal: controller.signal });
                clearTimeout(id);
                return response;
            } catch (error) {
                clearTimeout(id);
                if (error.name === 'AbortError') {
                    console.error('Supabase Request Timeout (15s)');
                    if (typeof showToast === 'function') {
                        showToast('Kết nối quá hạn. Vui lòng kiểm tra mạng và thử lại!', 'danger');
                    }
                    // Throw a standard error object that Supabase JS expects so it doesn't crash
                    throw new Error('Request timeout after 15 seconds');
                }
                throw error;
            }
        }
    }
});

// Global XSS Prevention Utility
window.escapeHTML = (str) => {
    if (str === null || str === undefined) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
};

// Global Cleanup for Realtime Channels
window.addEventListener('beforeunload', async () => {
    if (window.supabase) {
        try {
            await window.supabase.removeAllChannels();
        } catch (e) {
            console.error('Error cleaning up channels:', e);
        }
    }
});
