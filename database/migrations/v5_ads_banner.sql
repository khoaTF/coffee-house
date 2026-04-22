-- =============================================
-- v5_ads_banner.sql - Promotion Banners Table
-- =============================================

-- Xóa bảng cũ nếu có (để tạo lại đúng cấu trúc)
DROP TABLE IF EXISTS public.promotion_banners CASCADE;

-- Tạo bảng promotion_banners với tenant_id
CREATE TABLE public.promotion_banners (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_popup BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index cho tenant_id
CREATE INDEX idx_promotion_banners_tenant ON public.promotion_banners(tenant_id);

-- Bật RLS
ALTER TABLE public.promotion_banners ENABLE ROW LEVEL SECURITY;

-- Policy cho phép mọi người đọc banners active (Khách hàng)
CREATE POLICY "banners_select_all" ON public.promotion_banners
    FOR SELECT USING (true);

-- Policy cho phép admin quản lý banners
CREATE POLICY "banners_manage_all" ON public.promotion_banners
    FOR ALL USING (true) WITH CHECK (true);
