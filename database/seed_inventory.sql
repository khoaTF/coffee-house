-- =========================================================================================
-- SCRIPT THIẾT LẬP DỮ LIỆU KHO (INGREDIENTS) VÀ CÔNG THỨC MÓN ĂN (RECIPES)
-- Hướng dẫn: Mở Supabase Dashboard -> SQL Editor -> Dán toàn bộ nội dung này và nhấn RUN
-- =========================================================================================

-- 1. XOÁ DỮ LIỆU KHO HIỆN TẠI (NẾU CÓ) ĐỂ TRÁNH TRÙNG LẶP
TRUNCATE TABLE public.ingredients CASCADE;

-- 2. INSERT DANH SÁCH NGUYÊN LIỆU VỚI UUID CỐ ĐỊNH (ĐỂ DỄ RÀNG BUỘC)
INSERT INTO public.ingredients (id, name, unit, stock, low_stock_threshold) VALUES
('11111111-1111-1111-1111-111111111111', 'Cà phê hạt Phối trộn', 'gram', 5000, 1000),
('22222222-2222-2222-2222-222222222222', 'Cà phê Cold Brew (Ủ sẵn)', 'ml', 5000, 2000),
('33333333-3333-3333-3333-333333333333', 'Trà Đào (Ủ sẵn)', 'ml', 5000, 2000),
('44444444-4444-4444-4444-444444444444', 'Trà Oolong Nướng (Ủ sẵn)', 'ml', 5000, 2000),
('55555555-5555-5555-5555-555555555555', 'Trà Vải (Ủ sẵn)', 'ml', 5000, 2000),
('66666666-6666-6666-6666-666666666666', 'Sữa tươi thanh trùng', 'ml', 5000, 2000),
('77777777-7777-7777-7777-777777777777', 'Sữa đặc', 'ml', 5000, 1000),
('88888888-8888-8888-8888-888888888888', 'Bột Matcha', 'gram', 5000, 500),
('99999999-9999-9999-9999-999999999999', 'Nước cốt dừa', 'ml', 5000, 1000),
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Xoài tươi', 'gram', 5000, 1000),
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Cam tươi', 'gram', 5000, 1000),
('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Chanh dây (Nước cốt)', 'ml', 5000, 500),
('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Syrup Đào', 'ml', 5000, 500),
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'Syrup Vải', 'ml', 5000, 500),
('ffffffff-ffff-ffff-ffff-ffffffffffff', 'Đường nước', 'ml', 5000, 2000),
('00000000-0000-0000-0000-000000000001', 'Bánh Croissant Bơ Tỏi', 'cái', 50, 5),
('00000000-0000-0000-0000-000000000002', 'Bánh Tiramisu', 'cái', 50, 5),
('00000000-0000-0000-0000-000000000003', 'Ly bao bì (Kèm nắp, ống hút)', 'bộ', 500, 100);

-- 3. CẬP NHẬT CÔNG THỨC (RECIPES) CHO CÁC MÓN ĂN VÀO BẢNG PRODUCTS 
-- Sử dụng lại đúng UUID của từng nguyên liệu vừa Insert ở trên

UPDATE public.products 
SET recipe = '[{"ingredientId": "11111111-1111-1111-1111-111111111111", "quantity": 18}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Espresso';

UPDATE public.products 
SET recipe = '[{"ingredientId": "11111111-1111-1111-1111-111111111111", "quantity": 15}, {"ingredientId": "77777777-7777-7777-7777-777777777777", "quantity": 40}, {"ingredientId": "66666666-6666-6666-6666-666666666666", "quantity": 60}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Bạc Xỉu';

UPDATE public.products 
SET recipe = '[{"ingredientId": "22222222-2222-2222-2222-222222222222", "quantity": 120}, {"ingredientId": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb", "quantity": 40}, {"ingredientId": "ffffffff-ffff-ffff-ffff-ffffffffffff", "quantity": 20}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Cold Brew Cam Vàng';

UPDATE public.products 
SET recipe = '[{"ingredientId": "33333333-3333-3333-3333-333333333333", "quantity": 120}, {"ingredientId": "dddddddd-dddd-dddd-dddd-dddddddddddd", "quantity": 20}, {"ingredientId": "ffffffff-ffff-ffff-ffff-ffffffffffff", "quantity": 20}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Trà Đào Cam Sả';

UPDATE public.products 
SET recipe = '[{"ingredientId": "55555555-5555-5555-5555-555555555555", "quantity": 120}, {"ingredientId": "eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee", "quantity": 20}, {"ingredientId": "ffffffff-ffff-ffff-ffff-ffffffffffff", "quantity": 20}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Trà Vải Nhiệt Đới';

UPDATE public.products 
SET recipe = '[{"ingredientId": "44444444-4444-4444-4444-444444444444", "quantity": 120}, {"ingredientId": "77777777-7777-7777-7777-777777777777", "quantity": 40}, {"ingredientId": "66666666-6666-6666-6666-666666666666", "quantity": 20}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Trà Sữa Oolong Nướng';

UPDATE public.products 
SET recipe = '[{"ingredientId": "88888888-8888-8888-8888-888888888888", "quantity": 10}, {"ingredientId": "77777777-7777-7777-7777-777777777777", "quantity": 40}, {"ingredientId": "66666666-6666-6666-6666-666666666666", "quantity": 60}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Matcha Đá Xay';

UPDATE public.products 
SET recipe = '[{"ingredientId": "11111111-1111-1111-1111-111111111111", "quantity": 15}, {"ingredientId": "99999999-9999-9999-9999-999999999999", "quantity": 40}, {"ingredientId": "77777777-7777-7777-7777-777777777777", "quantity": 30}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Cà phê Dừa Đá Xay';

UPDATE public.products 
SET recipe = '[{"ingredientId": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "quantity": 80}, {"ingredientId": "cccccccc-cccc-cccc-cccc-cccccccccccc", "quantity": 20}, {"ingredientId": "66666666-6666-6666-6666-666666666666", "quantity": 30}, {"ingredientId": "77777777-7777-7777-7777-777777777777", "quantity": 30}, {"ingredientId": "00000000-0000-0000-0000-000000000003", "quantity": 1}]'::jsonb
WHERE name = 'Sinh Tố Xoài Chanh Dây';

UPDATE public.products 
SET recipe = '[{"ingredientId": "00000000-0000-0000-0000-000000000001", "quantity": 1}]'::jsonb
WHERE name = 'Bánh Croissant Bơ Tỏi';

UPDATE public.products 
SET recipe = '[{"ingredientId": "00000000-0000-0000-0000-000000000002", "quantity": 1}]'::jsonb
WHERE name = 'Bánh Tiramisu';

-- HOÀN TẤT!
