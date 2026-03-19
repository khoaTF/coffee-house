const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_key_123';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';
const KITCHEN_PASSWORD = process.env.KITCHEN_PASSWORD || 'bep123';

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
