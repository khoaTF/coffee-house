-- ====================================================
-- v17_fix_duplicate_pin.sql - Fix duplicate PIN across tenants
-- ====================================================
-- Problem: verify_pin() matches PINs globally across ALL tenants.
-- If 2 branches have staff with the same PIN, login fails or
-- returns the wrong tenant's user.
-- Solution: Add p_tenant_id parameter to scope PIN lookup per tenant.

-- 1. Public RPC to list active tenants (for login dropdown)
CREATE OR REPLACE FUNCTION public.list_active_tenants()
RETURNS TABLE(
    id UUID,
    name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
    RETURN QUERY
    SELECT t.id, t.name
    FROM public.tenants t
    WHERE t.status = 'active'
    ORDER BY t.name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.list_active_tenants() TO anon;
GRANT EXECUTE ON FUNCTION public.list_active_tenants() TO authenticated;

-- 2. Drop old verify_pin and recreate with tenant scoping
DROP FUNCTION IF EXISTS public.verify_pin(TEXT);

CREATE OR REPLACE FUNCTION public.verify_pin(pin_code TEXT, p_tenant_id UUID DEFAULT NULL)
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
      AND (p_tenant_id IS NULL OR u.tenant_id = p_tenant_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid PIN or Tenant Account Suspended' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_pin(TEXT, UUID) TO authenticated;

-- 3. Also update verify_credentials with tenant scoping
DROP FUNCTION IF EXISTS public.verify_credentials(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.verify_credentials(p_username TEXT, p_password TEXT, p_tenant_id UUID DEFAULT NULL)
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
      AND u.username = p_username
      AND u.password_hash = encode(extensions.digest(p_password, 'sha256'), 'hex')
      AND (p_tenant_id IS NULL OR u.tenant_id = p_tenant_id);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid credentials or Tenant Account Suspended' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.verify_credentials(TEXT, TEXT, UUID) TO authenticated;
