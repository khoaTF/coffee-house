-- ====================================================
-- v14_staff_timesheets.sql — Staff Timesheets & Operations
-- ====================================================

CREATE TABLE IF NOT EXISTS public.staff_timesheets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE,
    staff_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    check_in TIMESTAMPTZ NOT NULL DEFAULT now(),
    check_out TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.staff_timesheets ENABLE ROW LEVEL SECURITY;

-- Tenant isolation policies
CREATE POLICY tenant_isolation_timesheets ON public.staff_timesheets USING (tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid()));

-- RPC to check-in
CREATE OR REPLACE FUNCTION public.staff_check_in(p_staff_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if already checked in without checking out
    IF EXISTS (
        SELECT 1 FROM public.staff_timesheets 
        WHERE staff_id = p_staff_id AND tenant_id = p_tenant_id AND check_out IS NULL
    ) THEN
        RETURN FALSE; -- Already checked in
    END IF;

    INSERT INTO public.staff_timesheets (tenant_id, staff_id, check_in)
    VALUES (p_tenant_id, p_staff_id, now());

    RETURN TRUE;
END;
$$;

-- RPC to check-out
CREATE OR REPLACE FUNCTION public.staff_check_out(p_staff_id UUID, p_tenant_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.staff_timesheets
    SET check_out = now()
    WHERE staff_id = p_staff_id AND tenant_id = p_tenant_id AND check_out IS NULL;

    RETURN FOUND;
END;
$$;

-- View to get timesheet summary for current tenant
CREATE OR REPLACE VIEW public.vw_staff_timesheets AS
SELECT 
    t.id,
    t.tenant_id,
    t.staff_id,
    u.name as staff_name,
    u.role as staff_role,
    t.check_in,
    t.check_out,
    EXTRACT(EPOCH FROM (COALESCE(t.check_out, now()) - t.check_in))/3600 as hours_worked
FROM 
    public.staff_timesheets t
JOIN 
    public.users u ON t.staff_id = u.id;
