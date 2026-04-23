-- ====================================================
-- v17b_unique_tenant_name.sql - Prevent duplicate tenant names
-- ====================================================

-- 1. Add UNIQUE constraint on tenant name
ALTER TABLE public.tenants ADD CONSTRAINT tenants_name_key UNIQUE (name);

-- 2. Update create_new_client to check for duplicate names before inserting
CREATE OR REPLACE FUNCTION public.create_new_client(client_name TEXT, admin_pin TEXT, owner_secret TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public', 'extensions'
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

    -- Check duplicate name (case-insensitive)
    IF EXISTS (SELECT 1 FROM public.tenants WHERE lower(name) = lower(client_name)) THEN
        RAISE EXCEPTION 'Tên chi nhánh "%" đã tồn tại. Vui lòng chọn tên khác.', client_name USING ERRCODE = 'P0002';
    END IF;

    -- Generate basic slug from client_name
    new_slug := lower(regexp_replace(client_name, '[^a-zA-Z0-9]', '', 'g')) || '-' || substring(md5(random()::text) from 1 for 4);

    -- Create tenant
    INSERT INTO public.tenants (name, slug, status)
    VALUES (client_name, new_slug, 'active')
    RETURNING id INTO new_tenant_id;

    -- Create default store settings
    INSERT INTO public.store_settings (tenant_id, is_open_override, wifi_pass)
    VALUES (new_tenant_id, true, '12345678');

    -- Create default admin account
    INSERT INTO public.users (tenant_id, name, role, pin)
    VALUES (new_tenant_id, 'Admin', 'admin', admin_pin)
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
