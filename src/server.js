require('dotenv').config();
const http = require('http');
const app = require('./app');

const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT} (Static Mode for Supabase Migration)`);
    console.log(`Professional Node.js Backend Architecture Loaded.`);
});
