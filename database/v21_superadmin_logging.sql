-- v21_superadmin_logging.sql

-- 1. Function to allow Superadmin to log actions securely via owner_secret
CREATE OR REPLACE FUNCTION public.log_superadmin_action(
    owner_secret text,
    p_action text,
    p_details jsonb,
    p_target_tenant_id uuid DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_valid boolean;
BEGIN
    -- Verify owner secret using existing verify_owner_secret function if it exists, or check secrets table
    SELECT EXISTS (
        SELECT 1 FROM owner_secrets WHERE secret_key = owner_secret
    ) INTO v_valid;

    IF NOT v_valid THEN
        RAISE EXCEPTION 'Invalid owner secret';
    END IF;

    -- Insert into audit_logs
    INSERT INTO public.audit_logs (
        tenant_id,
        admin_identifier,
        action,
        details
    ) VALUES (
        p_target_tenant_id,
        'Superadmin (System)',
        p_action,
        p_details
    );
END;
$$;
