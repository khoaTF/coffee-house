-- ====================================================
-- v12_superadmin_features.sql - Superadmin Improvements
-- ====================================================

-- 1. Update Authentication RPCs to block suspended tenants
DROP FUNCTION IF EXISTS public.verify_pin(TEXT);
DROP FUNCTION IF EXISTS public.verify_credentials(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_pin(pin_code TEXT)
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
    max_items INT
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
        t.max_items
    FROM public.users u
    LEFT JOIN public.tenants t ON u.tenant_id = t.id
    WHERE u.is_active = true
      AND (t.id IS NULL OR t.status = 'active') -- Block if tenant is suspended
      AND u.pin_hash IS NOT NULL
      AND u.pin_hash = crypt(pin_code, u.pin_hash);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid PIN or Tenant Account Suspended' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

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
    max_items INT
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
        t.max_items
    FROM public.users u
    LEFT JOIN public.tenants t ON u.tenant_id = t.id
    WHERE u.is_active = true
      AND (t.id IS NULL OR t.status = 'active') -- Block if tenant is suspended
      AND u.username = p_username
      AND u.password_hash = encode(digest(p_password, 'sha256'), 'hex');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid credentials or Tenant Account Suspended' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT) TO authenticated;

-- 2. Delete Tenant RCP (Hard Delete)
CREATE OR REPLACE FUNCTION public.delete_tenant(
    owner_secret TEXT,
    p_tenant_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Before deleting, ensure auth instances from Supabase Auth are cleaned up 
    -- Alternatively rely on cascade if mapped, but Supabase Auth requires its own delete.
    -- Delete from auth.users (this would cascade to public.users if fk exists)
    DELETE FROM auth.users 
    WHERE id IN (
        SELECT instance_id FROM public.users WHERE tenant_id = p_tenant_id
    );

    -- Delete the tenant (this will cascade delete users, products, categories, orders because of ON DELETE CASCADE, assuming fks are setup, 
    -- otherwise we delete them manually just to be safe)
    DELETE FROM public.users WHERE tenant_id = p_tenant_id;
    DELETE FROM public.orders WHERE tenant_id = p_tenant_id;
    DELETE FROM public.products WHERE tenant_id = p_tenant_id;
    DELETE FROM public.categories WHERE tenant_id = p_tenant_id;
    DELETE FROM public.tables WHERE tenant_id = p_tenant_id;
    DELETE FROM public.ingredients WHERE tenant_id = p_tenant_id;
    
    DELETE FROM public.tenants WHERE id = p_tenant_id;

    RETURN TRUE;
END;
$$;
