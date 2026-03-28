const jwt = require('jsonwebtoken');

// BẮT BUỘC phải cấu hình env vars — không dùng fallback mặc định
const JWT_SECRET = process.env.JWT_SECRET;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD;

if (!JWT_SECRET || !ADMIN_PASSWORD) {
    console.error('❌ FATAL: Missing required environment variables: JWT_SECRET, ADMIN_PASSWORD');
    console.error('   Set them in .env or hosting platform environment settings.');
    console.warn('⚠️  Auth routes will return 500 errors until variables are configured.');
}

const login = (req, res) => {
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
};

module.exports = { login };
