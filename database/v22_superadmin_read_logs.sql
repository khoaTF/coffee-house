-- v22_superadmin_read_logs.sql

-- Function to allow Superadmin to read audit logs securely via owner_secret
CREATE OR REPLACE FUNCTION public.get_superadmin_audit_logs(
    owner_secret text,
    limit_count integer DEFAULT 50
) RETURNS SETOF public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $fn$
BEGIN
    -- Verify owner secret (consistent with get_all_tenants pattern)
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Invalid owner secret' USING ERRCODE = 'P0001';
    END IF;

    -- Return logs, ordering by newest first
    RETURN QUERY 
    SELECT * FROM public.audit_logs 
    ORDER BY created_at DESC 
    LIMIT limit_count;
END;
$fn$;
