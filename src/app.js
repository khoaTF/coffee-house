const express = require('express');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const apiRoutes = require('./routes/api.routes');

const app = express();

// Security Middleware — helmet handles most headers automatically
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://*.supabase.co"],
            imgSrc: ["'self'", "data:", "https:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "data:", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://*.supabase.co"],
            connectSrc: ["'self'", "https://*.supabase.co", "wss://*.supabase.co"]
        }
    },
    crossOriginEmbedderPolicy: false
}));

// Global Rate Limiter — 100 requests per 15 minutes per IP
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
}));

// Rate limiter for webhook endpoint
const webhookLimiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 30,
    message: { error: 'Webhook rate limit exceeded.' }
});

// JSON parsing
app.use(express.json());

// Health check endpoints for Render
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/ping', (req, res) => res.status(200).send('pong'));

// Serve static frontend files from 'public' directory at root
app.use(express.static(path.join(__dirname, '../public')));

// Explicit HTML Page Routes to support Clean URLs locally and on Vercel
const pages = ['login', 'admin', 'kitchen', 'staff', 'tv', 'delivery', 'driver', 'tracking', 'guide', 'superadmin'];
pages.forEach(page => {
    app.get(`/${page}`, (req, res) => {
        res.sendFile(path.join(__dirname, `../public/pages/${page}.html`));
    });
});
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/pages/index.html'));
});

// API Routes mounting — apply specific rate limiters
app.use('/api/webhook', webhookLimiter);
app.use('/api', apiRoutes);

module.exports = app;

