require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const jwt = require('jsonwebtoken');

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
