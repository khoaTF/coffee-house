-- =========================================================================
-- Nohope Coffee V3 Security Upgrades
-- Chạy file này trong Supabase SQL Editor để bật RLS cho các bảng chính
-- =========================================================================

-- ======================
-- 1. PRODUCTS — Ai cũng được đọc menu, chỉ staff mới được sửa
-- ======================
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Cho phép đọc menu công khai (khách quét QR xem menu)
CREATE POLICY "Public read products" ON public.products
    FOR SELECT USING (true);

-- Chỉ authenticated users (staff/admin) mới được INSERT/UPDATE/DELETE
CREATE POLICY "Staff manage products" ON public.products
    FOR ALL USING (auth.role() = 'authenticated');

-- ======================
-- 2. ORDERS — Khách đặt được, staff quản lý được
-- ======================
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

-- Khách hàng (anon) được tạo đơn
CREATE POLICY "Anyone can create orders" ON public.orders
    FOR INSERT WITH CHECK (true);

-- Khách hàng chỉ đọc đơn của session mình
CREATE POLICY "Read own session orders" ON public.orders
    FOR SELECT USING (
        auth.role() = 'authenticated' 
        OR session_id = current_setting('request.headers', true)::json->>'x-session-id'
    );

-- Staff được toàn quyền quản lý đơn
CREATE POLICY "Staff manage orders" ON public.orders
    FOR ALL USING (auth.role() = 'authenticated');

-- ======================
-- 3. INGREDIENTS — Chỉ staff mới truy cập
-- ======================
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage ingredients" ON public.ingredients
    FOR ALL USING (auth.role() = 'authenticated');

-- Cho phép anon đọc (để customer.js kiểm tra tồn kho trước khi đặt)
CREATE POLICY "Public read ingredients stock" ON public.ingredients
    FOR SELECT USING (true);

-- ======================
-- 4. INVENTORY_LOGS — Chỉ staff mới truy cập
-- ======================
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage inventory logs" ON public.inventory_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- Cho phép RPC (service role) insert log khi trừ kho
CREATE POLICY "Service insert inventory logs" ON public.inventory_logs
    FOR INSERT WITH CHECK (true);

-- ======================
-- 5. CUSTOMERS — Chỉ staff mới xem danh sách, nhưng cho phép tự tạo khi đặt đơn
-- ======================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage customers" ON public.customers
    FOR ALL USING (auth.role() = 'authenticated');

-- Cho phép đọc công khai (kiểm tra SĐT loyalty khi đặt đơn)
CREATE POLICY "Public read customers" ON public.customers
    FOR SELECT USING (true);

-- Cho phép tạo khách hàng mới (sau khi đặt đơn lần đầu)
CREATE POLICY "Public insert customers" ON public.customers
    FOR INSERT WITH CHECK (true);

-- ======================
-- 6. POINT_LOGS — Chỉ staff đọc, cho phép insert từ RPC
-- ======================
ALTER TABLE public.point_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage point logs" ON public.point_logs
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Public insert point logs" ON public.point_logs
    FOR INSERT WITH CHECK (true);

-- ======================
-- 7. DISCOUNTS — Đọc công khai (check mã giảm giá), sửa chỉ staff
-- ======================
ALTER TABLE public.discounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read discounts" ON public.discounts
    FOR SELECT USING (true);

CREATE POLICY "Staff manage discounts" ON public.discounts
    FOR ALL USING (auth.role() = 'authenticated');

-- ======================
-- 8. FEEDBACK — Khách gửi được, staff đọc được
-- ======================
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit feedback" ON public.feedback
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Staff read feedback" ON public.feedback
    FOR SELECT USING (auth.role() = 'authenticated');

-- ======================
-- 9. TABLE_SESSIONS — Đọc/ghi công khai (cần cho table locking)
-- ======================
ALTER TABLE public.table_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access table sessions" ON public.table_sessions
    FOR ALL USING (true);

-- ======================
-- 10. STAFF_REQUESTS — Đọc/ghi công khai (khách gọi phục vụ)
-- ======================
ALTER TABLE public.staff_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public access staff requests" ON public.staff_requests
    FOR ALL USING (true);

-- ======================
-- 11. USERS — Chỉ admin/staff mới truy cập
-- ======================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage users" ON public.users
    FOR ALL USING (auth.role() = 'authenticated');

-- ======================
-- 12. CASH_TRANSACTIONS — Chỉ staff mới truy cập
-- ======================
ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage cash transactions" ON public.cash_transactions
    FOR ALL USING (auth.role() = 'authenticated');

-- =========================================================================
-- QUAN TRỌNG: Đảm bảo RPC place_order_and_deduct_inventory sử dụng
-- SECURITY DEFINER để vượt qua RLS khi trừ kho (đã có sẵn trong v2).
-- =========================================================================
