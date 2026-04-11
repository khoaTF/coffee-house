-- ====================================================
-- v11_saas_upgrade.sql — SaaS Superadmin Features
-- ====================================================

-- 1. Database Schema Updates
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS subscription_end_date timestamptz DEFAULT (now() + interval '14 days');
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_staff int DEFAULT 5;
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS max_items int DEFAULT 50;

CREATE TABLE IF NOT EXISTS public.broadcast_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message TEXT NOT NULL,
    alert_type TEXT NOT NULL DEFAULT 'info',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS and Realtime for broadcasts
ALTER TABLE public.broadcast_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable read access for all" ON public.broadcast_messages;
CREATE POLICY "Enable read access for all" ON public.broadcast_messages FOR SELECT USING (true);

-- Enable realtime for broadcast_messages
BEGIN;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'broadcast_messages') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcast_messages;
    END IF;
END $$;
COMMIT;

-- 2. Update Auth RPCs to return new tenant limits
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
      AND u.pin_hash IS NOT NULL
      AND u.pin_hash = crypt(pin_code, u.pin_hash);

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Invalid PIN' USING ERRCODE = 'P0001';
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


-- 3. Superadmin Business Logic RPCs

-- Analytics
CREATE OR REPLACE FUNCTION public.get_superadmin_analytics(owner_secret text)
RETURNS TABLE(
    total_revenue NUMERIC,
    active_tenants BIGINT,
    total_staff BIGINT
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
        COALESCE((SELECT SUM(o.total_price) FROM public.orders o WHERE o.is_paid = true), 0) AS total_revenue,
        (SELECT COUNT(*) FROM public.tenants WHERE status = 'active')::BIGINT AS active_tenants,
        (SELECT COUNT(*) FROM public.users)::BIGINT AS total_staff;
END;
$$;

-- Get All Tenants (Upgrade)
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
    total_revenue NUMERIC
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
        COALESCE((SELECT SUM(o.total_price) FROM public.orders o WHERE o.tenant_id = t.id AND o.is_paid = true), 0) as total_revenue
    FROM public.tenants t
    ORDER BY t.created_at DESC;
END;
$$;

-- Renew / Upgrade Subscription
CREATE OR REPLACE FUNCTION public.update_tenant_subscription(
    owner_secret text, 
    p_tenant_id uuid, 
    p_end_date timestamptz, 
    p_max_staff int, 
    p_max_items int
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
    SET subscription_end_date = p_end_date,
        max_staff = p_max_staff,
        max_items = p_max_items
    WHERE id = p_tenant_id;

    RETURN TRUE;
END;
$$;

-- Create Broadcast
CREATE OR REPLACE FUNCTION public.create_broadcast(
    owner_secret text, 
    p_message text, 
    p_alert_type text
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    -- Deactivate old broadcasts
    UPDATE public.broadcast_messages SET is_active = false;
    
    INSERT INTO public.broadcast_messages (message, alert_type, is_active)
    VALUES (p_message, p_alert_type, true);

    RETURN TRUE;
END;
$$;

-- Force Reset Admin PIN
CREATE OR REPLACE FUNCTION public.force_reset_pin(
    owner_secret text, 
    p_tenant_id uuid, 
    p_new_pin text
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;
    
    -- Find the 'admin' user for this tenant and update the PIN
    UPDATE public.users 
    SET pin_hash = crypt(p_new_pin, gen_salt('bf'))
    WHERE tenant_id = p_tenant_id AND role = 'admin';

    UPDATE public.users
    SET password_hash = encode(digest(p_new_pin, 'sha256'), 'hex')
    WHERE tenant_id = p_tenant_id AND role = 'admin';
    
    UPDATE auth.users
    SET encrypted_password = crypt(p_new_pin, gen_salt('bf'))
    WHERE id IN (
        SELECT instance_id FROM public.users 
        WHERE tenant_id = p_tenant_id AND role = 'admin'
    );
    
    RETURN TRUE;
END;
$$;
