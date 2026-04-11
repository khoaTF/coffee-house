-- ====================================================
-- v10_tenant_name_rpcs.sql — Include tenant_name in Auth RPCs 
-- ====================================================

BEGIN;

-- Drop old functions with old signature
DROP FUNCTION IF EXISTS public.verify_pin(TEXT);
DROP FUNCTION IF EXISTS public.verify_credentials(TEXT, TEXT);

-- Re-create verify_pin with tenant_name returned
CREATE OR REPLACE FUNCTION public.verify_pin(pin_code TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    role TEXT,
    permissions JSONB,
    avatar_url TEXT,
    tenant_id UUID,
    tenant_name TEXT
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
        t.name AS tenant_name
    FROM public.users u
    LEFT JOIN public.tenants t ON u.tenant_id = t.id
    WHERE u.is_active = true
      AND u.pin_hash IS NOT NULL
      AND u.pin_hash = crypt(pin_code, u.pin_hash);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid PIN' USING ERRCODE = 'P0001';
    END IF;
END;
$$;

-- Re-create verify_credentials with tenant_name returned
CREATE OR REPLACE FUNCTION public.verify_credentials(p_username TEXT, p_password TEXT)
RETURNS TABLE(
    id UUID,
    name TEXT,
    role TEXT,
    permissions JSONB,
    avatar_url TEXT,
    tenant_id UUID,
    tenant_name TEXT
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
        t.name AS tenant_name
    FROM public.users u
    LEFT JOIN public.tenants t ON u.tenant_id = t.id
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

COMMIT;
