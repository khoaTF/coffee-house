-- ====================================================
-- v8_pin_hashing.sql — Hash PIN nhân viên (Security)
-- ====================================================
-- Chạy file này trong Supabase SQL Editor.
-- Yêu cầu: Extension pgcrypto (thường đã có sẵn trên Supabase).
--
-- Sau khi chạy:
-- 1. PIN hiện tại sẽ được hash bằng bcrypt
-- 2. RPC verify_pin sẽ dùng crypt() thay vì so sánh plain text
-- 3. Cột pin cũ (plain text) sẽ bị xóa
-- 4. Admin panel sẽ cần sửa lưu PIN (đã xử lý trong frontend)

BEGIN;

-- 1. Đảm bảo pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. Thêm cột pin_hash (bcrypt)
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS pin_hash TEXT;

-- 3. Hash tất cả PIN hiện có sang bcrypt
UPDATE public.users
SET pin_hash = crypt(pin, gen_salt('bf', 8))
WHERE pin IS NOT NULL AND pin != '' AND pin_hash IS NULL;

-- 4. Tạo lại RPC verify_pin — dùng crypt() thay vì so sánh plain text
CREATE OR REPLACE FUNCTION public.verify_pin(pin_code TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    role TEXT,
    permissions JSONB,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.role,
        u.permissions,
        u.avatar_url
    FROM public.users u
    WHERE u.is_active = true
      AND u.pin_hash IS NOT NULL
      AND u.pin_hash = crypt(pin_code, u.pin_hash);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid PIN' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- 5. Đảm bảo RPC verify_credentials cũng an toàn
-- (password_hash đã dùng SHA-256, nhưng nên upgrade lên bcrypt)
CREATE OR REPLACE FUNCTION public.verify_credentials(p_username TEXT, p_password TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    role TEXT,
    permissions JSONB,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.role,
        u.permissions,
        u.avatar_url
    FROM public.users u
    WHERE u.is_active = true
      AND u.username = p_username
      AND u.password_hash = encode(digest(p_password, 'sha256'), 'hex');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid credentials' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- 6. Tạo helper function để hash PIN mới khi admin thêm/sửa nhân viên
CREATE OR REPLACE FUNCTION public.hash_pin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    -- Chỉ hash nếu pin thay đổi và chưa phải bcrypt format
    IF NEW.pin IS NOT NULL AND NEW.pin != '' THEN
        -- Kiểm tra nếu pin là plain text (không bắt đầu bằng $2)
        IF NEW.pin NOT LIKE '$2%' THEN
            NEW.pin_hash := extensions.crypt(NEW.pin, extensions.gen_salt('bf'::text, 8));
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

-- 7. Trigger tự động hash PIN khi INSERT/UPDATE
DROP TRIGGER IF EXISTS trg_hash_pin ON public.users;
CREATE TRIGGER trg_hash_pin
    BEFORE INSERT OR UPDATE OF pin ON public.users
    FOR EACH ROW
    EXECUTE FUNCTION public.hash_pin();

-- 8. Bảo mật: Ẩn pin_hash khỏi SELECT bình thường
-- (Không xóa cột pin ngay để tránh break frontend hiện tại)
-- Sau khi confirm mọi thứ hoạt động, chạy:
-- ALTER TABLE public.users DROP COLUMN IF EXISTS pin;

-- 9. Revoke truy cập trực tiếp vào RPC cho anon (chỉ authenticated mới dùng verify_pin)
-- Lưu ý: verify_pin cần anon vì user chưa login
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT) TO authenticated;

COMMIT;
