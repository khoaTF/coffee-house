const SUPABASE_URL = 'https://xvghmwfmjxramrsptxfh.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_DWoSSz1TRKd_UBvfE_5FoQ_qnJxLScL';

// The CDN library loads as window.supabase (the module object).
// We must create the client and then OVERWRITE window.supabase with the client instance,
// so that all other scripts (admin.js, kitchen.js, customer.js) which call
// supabase.from(...) / supabase.channel(...) will find the initialized client.
window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
