require('dotenv').config();
const http = require('http');
const app = require('./app');

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

console.log(`[INIT] Starting to bind server on port: ${PORT}`);

process.on('uncaughtException', (err) => {
    console.error('[FATAL] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('[FATAL] Unhandled Rejection at:', promise, 'reason:', reason);
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT} (Static Mode for Supabase Migration) bound to 0.0.0.0`);
    console.log(`Professional Node.js Backend Architecture Loaded.`);
}).on('error', (err) => {
    console.error('[ERROR] Failed to bind server:', err);
});
