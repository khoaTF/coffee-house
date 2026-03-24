const supabase = require('../config/supabase');
const { hashPassword } = require('./auth.controller');

// GET /api/users
const getUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id, username, role, name, is_active, created_at')
            .order('created_at', { ascending: false });

        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// POST /api/users
const createUser = async (req, res) => {
    try {
        const { username, password, role, name } = req.body;
        if (!username || !password || !role || !name) {
            return res.status(400).json({ error: 'Thiếu thông tin bắt buộc' });
        }

        const hashed = hashPassword(password);
        
        const { data, error } = await supabase
            .from('users')
            .insert([{ username, password_hash: hashed, role, name, is_active: true }])
            .select('id, username, role, name, is_active')
            .single();

        if (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
            throw error;
        }
        res.status(201).json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

// PUT /api/users/:id/status
const toggleUserStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { is_active } = req.body;

        const { data, error } = await supabase
            .from('users')
            .update({ is_active })
            .eq('id', id)
            .select('id, is_active')
            .single();

        if (error) throw error;
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
};

module.exports = {
    getUsers,
    createUser,
    toggleUserStatus
};
