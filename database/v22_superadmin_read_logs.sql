-- v22_superadmin_read_logs.sql

-- Function to allow Superadmin to read audit logs securely via owner_secret
CREATE OR REPLACE FUNCTION public.get_superadmin_audit_logs(
    owner_secret text,
    limit_count integer DEFAULT 50
) RETURNS SETOF public.audit_logs
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valid boolean;
BEGIN
    -- Verify owner secret
    SELECT EXISTS (
        SELECT 1 FROM owner_secrets WHERE secret_key = owner_secret
    ) INTO v_valid;

    IF NOT v_valid THEN
        RAISE EXCEPTION 'Invalid owner secret';
    END IF;

    -- Return logs, ordering by newest first
    RETURN QUERY 
    SELECT * FROM public.audit_logs 
    ORDER BY created_at DESC 
    LIMIT limit_count;
END;
$$;
