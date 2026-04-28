-- v20_audit_logging.sql
-- Ensure audit_logs is multi-tenant capable and uses JSONB for details.

-- 1. Create table if not exists (handling both schema.sql and v2_upgrades.sql possibilities)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    admin_identifier TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Add tenant_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'tenant_id') THEN
        ALTER TABLE public.audit_logs ADD COLUMN tenant_id UUID;
    END IF;
END $$;

-- 3. Change details column to JSONB if it is currently TEXT
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'details' AND data_type = 'text') THEN
        ALTER TABLE public.audit_logs ALTER COLUMN details TYPE JSONB USING details::jsonb;
    END IF;
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Failed to convert details to JSONB directly.';
END $$;

-- 4. Enable RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 5. Create Policies
DROP POLICY IF EXISTS "Superadmin All Access on Audit Logs" ON public.audit_logs;
CREATE POLICY "Superadmin All Access on Audit Logs" ON public.audit_logs 
FOR ALL USING (
    auth.jwt() ->> 'email' IN ('admin@nohope.coffee', 'admin@nohope.cafe') 
    OR auth.jwt() ->> 'role' = 'superadmin'
);

DROP POLICY IF EXISTS "Tenant Admin Read Audit Logs" ON public.audit_logs;
CREATE POLICY "Tenant Admin Read Audit Logs" ON public.audit_logs
FOR SELECT USING (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);

DROP POLICY IF EXISTS "Tenant Admin Insert Audit Logs" ON public.audit_logs;
CREATE POLICY "Tenant Admin Insert Audit Logs" ON public.audit_logs
FOR INSERT WITH CHECK (
    tenant_id = (auth.jwt() ->> 'tenant_id')::uuid
);

-- Note: We generally don't want admins to UPDATE or DELETE audit logs.
