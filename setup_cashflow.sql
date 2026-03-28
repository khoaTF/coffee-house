-- ==========================================
-- SCRIPT TẠO BẢNG SỔ QUỸ (cash_transactions)
-- Chạy trên tính năng SQL Editor của Supabase
-- ==========================================

-- 1. Tạo bảng
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    type TEXT NOT NULL CHECK (type IN ('income', 'expense')),
    amount NUMERIC NOT NULL CHECK (amount > 0),
    category TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    created_by TEXT NOT NULL
);

-- 2. Tắt Row Level Security (RLS) để phù hợp với config nội bộ hiện tại
-- LƯU Ý: RLS có thể được bật lại nếu hệ thống của bạn yêu cầu cao về phân quyền cấp độ DB.
ALTER TABLE public.cash_transactions DISABLE ROW LEVEL SECURITY;

-- 3. Tạo Index để truy vấn theo ngày nhanh hơn
CREATE INDEX IF NOT EXISTS idx_cash_transactions_date ON public.cash_transactions(created_at);
