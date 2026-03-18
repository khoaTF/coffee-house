require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

// Supabase Setup
const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const app = express();
const server = http.createServer(app);

// Middleware
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://*.supabase.co; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co;");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD || 'bep123';

// --- Auth Routes ---
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    let role = null;

    if (username === 'admin' && password === ADMIN_PASSWORD) {
        role = 'admin';
    } else if (username === 'kitchen' && password === KITCHEN_PASSWORD) {
        role = 'kitchen';
    }

    if (role) {
        const token = jwt.sign({ role }, JWT_SECRET, { expiresIn: '24h' });
        res.json({ token, role });
    } else {
        res.status(401).json({ error: 'Tài khoản hoặc mật khẩu không đúng' });
    }
});

// --- Auto Payment Webhook (SePay / Casso) ---
app.post('/api/webhook/payment', async (req, res) => {
    try {
        const payload = req.body;
        // SePay format usually puts list of transactions in 'data' array
        const txs = payload.data ? (Array.isArray(payload.data) ? payload.data : [payload.data]) : [payload];
        let processedCount = 0;

        for (let tx of txs) {
            const desc = (tx.description || tx.content || '').toUpperCase();
            const amount = parseFloat(tx.amount || tx.transferAmount || 0);

            // Assuming user transfers with memo containing the first 8 characters of Order ID
            // For example: "Thanh toan NHP 3f2a1b4c"
            const match = desc.match(/[A-F0-9]{8}/);

            if (match) {
                const shortId = match[0].toLowerCase();
                
                // Fetch unpaid orders and filter in JS (PostgreSQL UUID ilike throws error)
                const { data: unpaidOrders, error: fetchErr } = await supabase
                    .from('orders')
                    .select('id, total_price, is_paid')
                    .eq('is_paid', false);
                    
                if (!fetchErr && unpaidOrders && unpaidOrders.length > 0) {
                    const order = unpaidOrders.find(o => o.id.toLowerCase().startsWith(shortId));
                    
                    if (order && amount >= order.total_price) {
                        // Mark as paid
                        const { error: updateErr } = await supabase
                            .from('orders')
                            .update({ payment_status: 'paid', is_paid: true })
                            .eq('id', order.id);
                            
                        if (!updateErr) {
                            processedCount++;
                            // Thích hợp để tích điểm Loyalty lúc này
                        } else {
                            console.error("Webhook Update Error:", updateErr);
                        }
                    } else if (!order) {
                        console.log("No matching unpaid order found for shortId:", shortId);
                    }
                } else if (fetchErr) {
                    console.error("Webhook Fetch Error:", fetchErr);
                }
            }
        }
        res.status(200).json({ success: true, processed: processedCount });
    } catch (e) {
        console.error('Webhook Error:', e);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Since all database interactions now happen client-side via Supabase,
// this simple server merely serves the static HTML/JS/CSS files,
// handles basic admin/kitchen login, and returns 404 for any other API route.

app.all('/api/*path', (req, res) => {
    res.status(404).json({ error: 'Legacy API route. Database operations moved to Supabase.' });
});

// --- Server Startup ---
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (Static Mode for Supabase Migration)`);
});
