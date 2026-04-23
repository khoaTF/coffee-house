-- ====================================================
-- v19_security_audit_fixes.sql - P0 + P1 fixes from system audit
-- ====================================================

-- P0-1: Drop old verify_pin(text, uuid) overload (keep only 3-arg version with staff name)
DROP FUNCTION IF EXISTS public.verify_pin(text, uuid);

-- P0-2: Drop unused verify_credentials (sha256 hash - weak, not used by any frontend)
DROP FUNCTION IF EXISTS public.verify_credentials(text, text, uuid);

-- P0-3: Drop overly permissive cash_transactions policy (allows cross-tenant access)
DROP POLICY IF EXISTS "Allow authenticated access on cash_transactions" ON public.cash_transactions;

-- P1-1: Fix table_sessions UNIQUE constraint
-- OLD: UNIQUE(table_number) blocks same table numbers across tenants
-- NEW: UNIQUE(tenant_id, table_number) allows per-tenant table numbers
ALTER TABLE public.table_sessions DROP CONSTRAINT IF EXISTS table_sessions_table_number_key;
ALTER TABLE public.table_sessions ADD CONSTRAINT table_sessions_tenant_table_unique UNIQUE (tenant_id, table_number);

-- P1-2: Add composite index for analytics date-range queries
CREATE INDEX IF NOT EXISTS idx_orders_tenant_created ON public.orders (tenant_id, created_at DESC);

-- P1-3: Add missing index on staff_timesheets for RLS performance
CREATE INDEX IF NOT EXISTS idx_staff_timesheets_tenant ON public.staff_timesheets (tenant_id);
