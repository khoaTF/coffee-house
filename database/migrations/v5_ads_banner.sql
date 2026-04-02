CREATE TABLE IF NOT EXISTS public.promotion_banners (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_url TEXT,
    is_active BOOLEAN DEFAULT true,
    is_popup BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Bật RLS
ALTER TABLE public.promotion_banners ENABLE ROW LEVEL SECURITY;

-- Policy cho phép mọi người đọc banners (Khách hàng)
CREATE POLICY "Cho phép tất cả đọc banners" ON public.promotion_banners
    FOR SELECT USING (true);

-- Policy cho phép anon/admin được quản lý (Tuỳ the setup hiên tại, mình thường để anon insert do chưa setup auth phức tạp)
CREATE POLICY "Cho phép quản trị quản lý banners" ON public.promotion_banners
    FOR ALL USING (true) WITH CHECK (true);
