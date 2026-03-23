const express = require('express');
const path = require('path');
const apiRoutes = require('./routes/api.routes');

const app = express();

// Security Middleware
app.use((req, res, next) => {
    res.setHeader('Content-Security-Policy', "default-src 'self' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://*.supabase.co; img-src 'self' data: https:; style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://fonts.googleapis.com; font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://*.supabase.co; connect-src 'self' https://*.supabase.co wss://*.supabase.co;");
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// JSON parsing
app.use(express.json());

// Health check endpoints for Render
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/ping', (req, res) => res.status(200).send('pong'));

// Serve static frontend files from 'public' directory at root
app.use(express.static(path.join(__dirname, '../public')));

// API Routes mounting
app.use('/api', apiRoutes);

module.exports = app;
