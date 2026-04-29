-- ====================================================
-- v26_tenant_feature_permissions.sql
-- Tenant-level Feature Module Permissions
-- Superadmin can enable/disable admin modules per tenant
-- ====================================================

-- 1. Add allowed_modules column to tenants table
-- Default = all modules (Premium-equivalent for backward compatibility)
ALTER TABLE public.tenants 
  ADD COLUMN IF NOT EXISTS allowed_modules JSONB 
  DEFAULT '["dashboard","pos","menu","inventory","restock","promo","history","shifts","delivery","analytics","cashflow","tables","customers","crm","staff","audit","qr","settings"]'::jsonb;

-- 2. Update get_all_tenants to return allowed_modules
DROP FUNCTION IF EXISTS public.get_all_tenants(text);
CREATE OR REPLACE FUNCTION public.get_all_tenants(owner_secret text)
RETURNS TABLE(
    id UUID, 
    name TEXT, 
    slug TEXT, 
    custom_domain TEXT, 
    status TEXT, 
    created_at TIMESTAMPTZ, 
    staff_count BIGINT,
    subscription_end_date TIMESTAMPTZ,
    max_staff INT,
    max_items INT,
    total_revenue NUMERIC,
    primary_color VARCHAR(20),
    logo_url TEXT,
    integrations JSONB,
    allowed_modules JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.custom_domain,
        t.status,
        t.created_at,
        (SELECT COUNT(*)::BIGINT FROM public.users u WHERE u.tenant_id = t.id) as staff_count,
        t.subscription_end_date,
        t.max_staff,
        t.max_items,
        COALESCE((SELECT SUM(o.total_price) FROM public.orders o WHERE o.tenant_id = t.id AND o.is_paid = true), 0) as total_revenue,
        t.primary_color,
        t.logo_url,
        t.integrations,
        t.allowed_modules
    FROM public.tenants t
    ORDER BY t.created_at DESC;
END;
$$;

-- 3. Create RPC to update tenant modules
CREATE OR REPLACE FUNCTION public.update_tenant_modules(
    owner_secret text,
    p_tenant_id uuid,
    p_allowed_modules jsonb
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.tenants
    SET allowed_modules = p_allowed_modules
    WHERE id = p_tenant_id;

    RETURN TRUE;
END;
$$;

-- 4. Update verify_pin to return allowed_modules
-- Preserves the v18 signature: (pin_code, p_tenant_id, p_staff_name)
DROP FUNCTION IF EXISTS public.verify_pin(TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.verify_pin(TEXT);

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
    max_items INTEGER,
    allowed_modules JSONB
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
        t.max_items,
        COALESCE(t.allowed_modules, '["dashboard","pos","menu","inventory","restock","promo","history","shifts","delivery","analytics","cashflow","tables","customers","crm","staff","audit","qr","settings"]'::jsonb) AS allowed_modules
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

-- 5. Update verify_credentials to return allowed_modules
DROP FUNCTION IF EXISTS public.verify_credentials(TEXT, TEXT);
CREATE OR REPLACE FUNCTION public.verify_credentials(p_username TEXT, p_password TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    role TEXT,
    permissions JSONB,
    avatar_url TEXT,
    tenant_id UUID,
    tenant_name TEXT,
    subscription_end_date TIMESTAMPTZ,
    max_staff INT,
    max_items INT,
    allowed_modules JSONB
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
        u.avatar_url,
        u.tenant_id,
        t.name AS tenant_name,
        t.subscription_end_date,
        t.max_staff,
        t.max_items,
        COALESCE(t.allowed_modules, '["dashboard","pos","menu","inventory","restock","promo","history","shifts","delivery","analytics","cashflow","tables","customers","crm","staff","audit","qr","settings"]'::jsonb) AS allowed_modules
    FROM public.users u
    LEFT JOIN public.tenants t ON u.tenant_id = t.id
    WHERE u.is_active = true
      AND (t.id IS NULL OR t.status = 'active')
      AND u.username = p_username
      AND u.password_hash = encode(digest(p_password, 'sha256'), 'hex');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid credentials or Tenant Account Suspended' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT, UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT) TO authenticated;
