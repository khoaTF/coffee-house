-- ====================================================
-- v13_saas_whitelabel.sql — SaaS Whitelabel & Realtime Settings
-- ====================================================

ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS primary_color VARCHAR(20) DEFAULT '#c084fc';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS logo_url TEXT DEFAULT '/images/bunny_logo.png';
ALTER TABLE public.tenants ADD COLUMN IF NOT EXISTS integrations JSONB DEFAULT '{}'::jsonb;

-- Update the get_all_tenants function to include the new columns
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
    integrations JSONB
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
        t.integrations
    FROM public.tenants t
    ORDER BY t.created_at DESC;
END;
$$;

-- Function to update tenant brand and integrations
CREATE OR REPLACE FUNCTION public.update_tenant_brand(
    owner_secret text, 
    p_tenant_id uuid,
    p_custom_domain text,
    p_primary_color varchar,
    p_logo_url text,
    p_integrations jsonb
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
    SET custom_domain = p_custom_domain,
        primary_color = p_primary_color,
        logo_url = p_logo_url,
        integrations = p_integrations
    WHERE id = p_tenant_id;

    RETURN TRUE;
END;
$$;
