-- ====================================================
-- v9_superadmin_rpcs.sql — Multi-tenant RPCs & Fixes
-- ====================================================

BEGIN;

-- 1. DROP old verify_pin & verify_credentials because we're changing the return table structure
DROP FUNCTION IF EXISTS public.verify_pin(TEXT);
DROP FUNCTION IF EXISTS public.verify_credentials(TEXT, TEXT);

-- 1b. DROP old SUPERADMIN RPCs if they exist with different signatures
DROP FUNCTION IF EXISTS public.get_all_tenants(TEXT);
DROP FUNCTION IF EXISTS public.create_new_client(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.update_tenant_status(UUID, TEXT, TEXT);

-- 2. Re-create verify_pin with tenant_id returned
CREATE OR REPLACE FUNCTION public.verify_pin(pin_code TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    role TEXT,
    permissions JSONB,
    avatar_url TEXT,
    tenant_id UUID
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
        u.tenant_id
    FROM public.users u
    WHERE u.is_active = true
      AND u.pin_hash IS NOT NULL
      AND u.pin_hash = crypt(pin_code, u.pin_hash);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid PIN' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- 3. Re-create verify_credentials with tenant_id returned
CREATE OR REPLACE FUNCTION public.verify_credentials(p_username TEXT, p_password TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    role TEXT,
    permissions JSONB,
    avatar_url TEXT,
    tenant_id UUID
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
        u.tenant_id
    FROM public.users u
    WHERE u.is_active = true
      AND u.username = p_username
      AND u.password_hash = encode(digest(p_password, 'sha256'), 'hex');

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid credentials' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT) TO authenticated;

-- ====================================================
-- SUPERADMIN RPCS
-- ====================================================

-- 4. Get all tenants (Dashboard)
CREATE OR REPLACE FUNCTION public.get_all_tenants(owner_secret TEXT)
RETURNS TABLE (
    id UUID,
    name TEXT,
    slug TEXT,
    custom_domain TEXT,
    status TEXT,
    created_at TIMESTAMPTZ,
    staff_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized: Invalid owner secret' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    SELECT 
        t.id,
        t.name,
        t.slug,
        t.custom_domain,
        t.status,
        t.created_at,
        (SELECT COUNT(*)::BIGINT FROM public.users u WHERE u.tenant_id = t.id) as staff_count
    FROM public.tenants t
    ORDER BY t.created_at DESC;
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_all_tenants(TEXT) TO anon, authenticated;

-- 5. Create new client (Provisioning)
CREATE OR REPLACE FUNCTION public.create_new_client(client_name TEXT, admin_pin TEXT, owner_secret TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_tenant_id UUID;
    new_slug TEXT;
    admin_id UUID;
    result JSONB;
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized: Invalid owner secret' USING ERRCODE = 'P0001';
    END IF;

    -- Generate basic slug from client_name (keep only alphanumeric and lower case)
    new_slug := lower(regexp_replace(client_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || substring(md5(random()::text) from 1 for 4);

    -- Create tenant
    INSERT INTO public.tenants (name, slug, status)
    VALUES (client_name, new_slug, 'ACTIVE')
    RETURNING id INTO new_tenant_id;

    -- Create default store settings
    INSERT INTO public.store_settings (tenant_id, is_store_open, wifi_password)
    VALUES (new_tenant_id, true, '12345678');

    -- Create default admin account
    INSERT INTO public.users (tenant_id, name, role, username, pin)
    VALUES (new_tenant_id, 'Admin ' || client_name, 'admin', new_slug || '_admin', admin_pin)
    RETURNING id INTO admin_id;

    result := jsonb_build_object(
        'success', true,
        'tenant_id', new_tenant_id,
        'slug', new_slug,
        'admin_id', admin_id
    );

    RETURN result;
END;
$$;
GRANT EXECUTE ON FUNCTION public.create_new_client(TEXT, TEXT, TEXT) TO anon, authenticated;

-- 6. Update tenant status (Suspend/Activate)
CREATE OR REPLACE FUNCTION public.update_tenant_status(target_tenant_id UUID, new_status TEXT, owner_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized: Invalid owner secret' USING ERRCODE = 'P0001';
    END IF;

    IF new_status NOT IN ('ACTIVE', 'SUSPENDED') THEN
        RAISE EXCEPTION 'Invalid status' USING ERRCODE = 'P0001';
    END IF;

    UPDATE public.tenants
    SET status = new_status
    WHERE id = target_tenant_id;

    RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.update_tenant_status(UUID, TEXT, TEXT) TO anon, authenticated;

COMMIT;
