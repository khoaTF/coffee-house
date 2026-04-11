-- ==============================================================================
-- DATABASE MIGRATION SCRIPT: Single-Tenant to Multi-Tenant (SaaS)
-- ==============================================================================
-- WARNING: 
-- 1. Backup your database via Supabase Dashboard before running this script.
-- 2. Running this script WILL BREAK your existing app until you update 
--    the frontend codebase to query by `tenant_id` instead of hardcoded logic.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. CREATE CORE TENANTS TABLE
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.tenants (
    id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    plan_id TEXT DEFAULT 'free',
    timezone TEXT DEFAULT 'Asia/Ho_Chi_Minh',
    custom_domain TEXT UNIQUE,
    created_at TIMESTAMPTZ DEFAULT timezone('utc', now()),
    updated_at TIMESTAMPTZ DEFAULT timezone('utc', now())
);

ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active tenants" 
    ON public.tenants FOR SELECT 
    USING (status = 'active');

-- ==============================================================================
-- 2. CREATE DEFAULT TENANT (LEGACY DATA MIGRATION)
-- ==============================================================================
-- We use a deterministic UUID for the default tenant so we can easily attach
-- all existing records to it in the subsequent steps.
INSERT INTO public.tenants (id, name, slug, plan_id) 
VALUES ('00000000-0000-0000-0000-000000000001', 'Legacy Coffee House', 'legacy', 'pro')
ON CONFLICT (id) DO NOTHING;


-- ==============================================================================
-- 3. MACRO: ATTACH TENANT_ID TO EXISTING TABLES
-- ==============================================================================
-- We execute a DO block to loop through all target tables and dynamically add
-- the `tenant_id` column, populate it with the legacy UUID, and enforce NOT NULL.

DO $$
DECLARE
    target_table TEXT;
    target_tables TEXT[] := ARRAY[
        'products', 'ingredients', 'discounts', 'orders', 'feedback', 
        'table_sessions', 'staff_requests', 'users', 'customers', 
        'inventory_logs', 'point_logs', 'cash_transactions', 'shifts', 
        'audit_logs', 'promotion_banners', 'delivery_drivers'
    ];
BEGIN
    FOREACH target_table IN ARRAY target_tables
    LOOP
        -- Add column
        EXECUTE format('ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);', target_table);
        
        -- Migrate old data to default tenant
        EXECUTE format('UPDATE public.%I SET tenant_id = %L WHERE tenant_id IS NULL;', target_table, '00000000-0000-0000-0000-000000000001');
        
        -- Enforce NOT NULL
        EXECUTE format('ALTER TABLE public.%I ALTER COLUMN tenant_id SET NOT NULL;', target_table);
        
        -- Create Index for performance
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_tenant_id ON public.%I(tenant_id);', target_table, target_table);
    END LOOP;
END $$;


-- ==============================================================================
-- 4. SPECIAL CASE: STORE_SETTINGS TABLE
-- ==============================================================================
-- 'store_settings' currently enforces `id = 1` via a check constraint.
-- We will transition it to use `tenant_id` as the unique identifier.

-- Drop the old constraint that forces id=1
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'store_settings_id_check' AND table_name = 'store_settings' AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.store_settings DROP CONSTRAINT store_settings_id_check;
    END IF;
END $$;

-- Add tenant_id (unlike other tables, here it should be UNIQUE since 1 tenant = 1 setting)
ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id) UNIQUE;

-- Migrate data
UPDATE public.store_settings SET tenant_id = '00000000-0000-0000-0000-000000000001' WHERE tenant_id IS NULL;

-- Enforce NOT NULL
ALTER TABLE public.store_settings ALTER COLUMN tenant_id SET NOT NULL;

-- Drop old Primary Key 'id' and set 'tenant_id' as Primary Key
ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_pkey;
ALTER TABLE public.store_settings DROP COLUMN IF EXISTS id;
ALTER TABLE public.store_settings ADD PRIMARY KEY (tenant_id);

COMMIT;

-- Print success message
DO $$
BEGIN
    RAISE NOTICE 'Migration fully successful. Default tenant ID used: 00000000-0000-0000-0000-000000000001';
END $$;
