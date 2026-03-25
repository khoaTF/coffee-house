-- QUẢN LÝ NHÂN VIÊN & KHÁCH HÀNG (MODULE DỮ LIỆU)
-- Anh copy toàn bộ nội dung này và paste vào mục "SQL Editor" trên trang quản trị Supabase rồi nhấn "Run" nhé.

-- 1. TẠO BẢNG TÀI KHOẢN NHÂN VIÊN (USERS)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'staff', 'kitchen')),
    name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Mở khóa chính sách bảo mật cho bảng users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cho phép đọc dữ liệu (Anon)" ON public.users FOR SELECT USING (true);
CREATE POLICY "Cho phép Insert dữ liệu (Anon)" ON public.users FOR INSERT WITH CHECK (true);
CREATE POLICY "Cho phép Update dữ liệu (Anon)" ON public.users FOR UPDATE USING (true);
CREATE POLICY "Cho phép Delete dữ liệu (Anon)" ON public.users FOR DELETE USING (true);

-- Tạo sẵn một tài khoản admin mặc định (Mật khẩu: admin123)
-- (Mã Hash chuẩn SHA-256 của 'admin123' là: 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9)
INSERT INTO public.users (username, password_hash, role, name)
VALUES ('admin', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', 'admin', 'Quản trị viên')
ON CONFLICT (username) DO NOTHING;


-- 2. CẬP NHẬT BẢNG ĐƠN HÀNG (ORDERS)
-- Thêm cột processed_by (id chuyên của người chốt đơn) để tính KPI
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL;


-- 3. CẬP NHẬT BẢNG KHÁCH HÀNG (CUSTOMERS)
-- Đảm bảo có cờ chặn những khách "boom hàng"
ALTER TABLE public.customers
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false;


-- 4. LOG ĐIỂM KHÁCH HÀNG (POINT_LOGS)
-- Nếu chưa có bảng này thì tạo luôn (lưu lại lịch sử thao tác điểm thủ công)
CREATE TABLE IF NOT EXISTS public.point_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_phone TEXT NOT NULL,
    points_change INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "All access policy for logs" ON public.point_logs FOR ALL USING (true);
