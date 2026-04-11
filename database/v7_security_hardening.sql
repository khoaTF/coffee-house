-- =========================================================================
-- V7 Security Hardening
-- Chạy trong Supabase SQL Editor để vá các lỗ hổng RLS
-- =========================================================================

-- ======================
-- 1. POINT_LOGS — Chặn public INSERT (tránh tự cộng điểm loyalty)
-- ======================
DROP POLICY IF EXISTS "Public insert point logs" ON public.point_logs;
-- Chỉ RPC (SECURITY DEFINER) mới được insert point_logs
-- Nếu cần cho khách tích điểm khi đặt hàng, hãy tạo RPC riêng

-- ======================
-- 2. CUSTOMERS — Chặn public xem tất cả thông tin khách hàng
-- ======================
DROP POLICY IF EXISTS "Public read customers" ON public.customers;

-- Chỉ cho phép đọc theo SĐT cụ thể (để kiểm tra loyalty khi đặt đơn)
CREATE POLICY "Public read own customer by phone" ON public.customers
    FOR SELECT USING (
        auth.role() = 'authenticated'
        OR phone = current_setting('request.headers', true)::json->>'x-customer-phone'
    );

-- ======================
-- 3. TABLE_SESSIONS — Giới hạn quyền ghi
-- ======================
DROP POLICY IF EXISTS "Public access table sessions" ON public.table_sessions;

-- Cho phép đọc (để kiểm tra session)
CREATE POLICY "Public read table sessions" ON public.table_sessions
    FOR SELECT USING (true);

-- Cho phép INSERT (tạo session mới khi quét QR)
CREATE POLICY "Public insert table sessions" ON public.table_sessions
    FOR INSERT WITH CHECK (true);

-- Cho phép UPDATE chỉ session của mình (cập nhật last_seen)
CREATE POLICY "Public update own table sessions" ON public.table_sessions
    FOR UPDATE USING (
        session_id = current_setting('request.headers', true)::json->>'x-session-id'
    );

-- Staff có toàn quyền (xóa session khi clear bàn)
CREATE POLICY "Staff manage table sessions" ON public.table_sessions
    FOR ALL USING (auth.role() = 'authenticated');

-- ======================
-- 4. STAFF_REQUESTS — Giới hạn quyền
-- ======================
DROP POLICY IF EXISTS "Public access staff requests" ON public.staff_requests;

-- Cho phép khách INSERT (gọi phục vụ)
CREATE POLICY "Public insert staff requests" ON public.staff_requests
    FOR INSERT WITH CHECK (true);

-- Cho phép đọc (để hiện trạng thái)
CREATE POLICY "Public read staff requests" ON public.staff_requests
    FOR SELECT USING (true);

-- Chỉ staff được UPDATE/DELETE
CREATE POLICY "Staff manage staff requests" ON public.staff_requests
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Staff delete staff requests" ON public.staff_requests
    FOR DELETE USING (auth.role() = 'authenticated');

-- ======================
-- 5. INVENTORY_LOGS — Chặn public INSERT
-- ======================
DROP POLICY IF EXISTS "Service insert inventory logs" ON public.inventory_logs;
-- Chỉ RPC (SECURITY DEFINER) insert, không cho public insert trực tiếp

-- ======================
-- 6. DISCOUNTS — Giới hạn thông tin hiển thị cho public
-- ======================
-- Giữ nguyên SELECT policy nhưng đảm bảo chỉ active discounts
DROP POLICY IF EXISTS "Public read discounts" ON public.discounts;
CREATE POLICY "Public read active discounts" ON public.discounts
    FOR SELECT USING (active = true);

-- ======================
-- 7. ORDERS — Thắt chặt INSERT
-- ======================
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
-- Chuyển sang dùng RPC place_order_and_deduct_inventory() cho mọi đặt hàng
-- Nếu vẫn cần direct INSERT, thêm validation:
CREATE POLICY "Validated order insert" ON public.orders
    FOR INSERT WITH CHECK (
        status = 'Pending'
        AND is_paid = false
        AND payment_status = 'unpaid'
        AND total_price >= 0
    );

-- =========================================================================
-- GHI CHÚ QUAN TRỌNG:
-- Sau khi chạy file này, kiểm tra:
-- 1. Customer app vẫn đặt hàng được (qua RPC)
-- 2. Tích điểm loyalty hoạt động (qua RPC, không direct insert)
-- 3. Admin panel vẫn quản lý được tất cả (authenticated = full access)
-- =========================================================================
