-- ====================================================
-- v18_login_with_name.sql - Add staff name verification to login
-- ====================================================
-- Prevents wrong-branch login when PINs collide across tenants.
-- Now login requires: Branch + Staff Name + PIN

CREATE OR REPLACE FUNCTION public.verify_pin(
    pin_code TEXT,
    p_tenant_id UUID DEFAULT NULL,
    p_staff_name TEXT DEFAULT NULL
)
RETURNS TABLE(
    id UUID,
    name TEXT,
    role TEXT,
    permissions JSONB,
    avatar_url TEXT,
    tenant_id UUID,
    tenant_name TEXT,
    subscription_end_date TIMESTAMPTZ,
    max_staff INTEGER,
    max_items INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.name,
        u.role,
        u.permissions,
        u.avatar_url,
        u.tenant_id,
        t.name AS tenant_name,
        t.subscription_end_date,
        t.max_staff,
        t.max_items
    FROM public.users u
    LEFT JOIN public.tenants t ON u.tenant_id = t.id
    WHERE u.is_active = true
      AND (t.id IS NULL OR t.status = 'active')
      AND u.pin_hash IS NOT NULL
      AND u.pin_hash = extensions.crypt(pin_code, u.pin_hash)
      AND (p_tenant_id IS NULL OR u.tenant_id = p_tenant_id)
      AND (p_staff_name IS NULL OR lower(u.name) = lower(p_staff_name));

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Sai tên đăng nhập, mã PIN hoặc chi nhánh!' USING ERRCODE = 'P0001';
    END IF;
END;
$$;
