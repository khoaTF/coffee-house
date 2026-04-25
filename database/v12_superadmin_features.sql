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

    -- Delete ALL child tables with tenant_id FK (order matters for inter-table FKs)
    DELETE FROM public.audit_logs WHERE tenant_id = p_tenant_id;
    DELETE FROM public.cash_transactions WHERE tenant_id = p_tenant_id;
    DELETE FROM public.customer_rfm_segments WHERE tenant_id = p_tenant_id;
    DELETE FROM public.point_logs WHERE tenant_id = p_tenant_id;
    DELETE FROM public.feedback WHERE tenant_id = p_tenant_id;
    DELETE FROM public.inventory_logs WHERE tenant_id = p_tenant_id;
    DELETE FROM public.staff_timesheets WHERE tenant_id = p_tenant_id;
    DELETE FROM public.staff_requests WHERE tenant_id = p_tenant_id;
    DELETE FROM public.shifts WHERE tenant_id = p_tenant_id;
    DELETE FROM public.delivery_drivers WHERE tenant_id = p_tenant_id;
    DELETE FROM public.table_sessions WHERE tenant_id = p_tenant_id;
    DELETE FROM public.promotion_banners WHERE tenant_id = p_tenant_id;
    DELETE FROM public.discounts WHERE tenant_id = p_tenant_id;
    DELETE FROM public.store_settings WHERE tenant_id = p_tenant_id;
    DELETE FROM public.customers WHERE tenant_id = p_tenant_id;
    DELETE FROM public.orders WHERE tenant_id = p_tenant_id;
    DELETE FROM public.products WHERE tenant_id = p_tenant_id;
    DELETE FROM public.categories WHERE tenant_id = p_tenant_id;
    DELETE FROM public.ingredients WHERE tenant_id = p_tenant_id;
    DELETE FROM public.users WHERE tenant_id = p_tenant_id;

    -- Finally delete the tenant itself
    DELETE FROM public.tenants WHERE id = p_tenant_id;

    RETURN TRUE;
END;
$$;
