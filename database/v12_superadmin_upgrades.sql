-- ====================================================
-- v12_superadmin_upgrades.sql — SaaS Superadmin Features
-- ====================================================

-- 1. Create System Logs Table
CREATE TABLE IF NOT EXISTS public.system_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Superadmin access only" ON public.system_logs;
CREATE POLICY "Superadmin access only" ON public.system_logs FOR ALL USING (false);

-- 2. Create RPC for Fetching System Logs
CREATE OR REPLACE FUNCTION public.get_global_activity_logs(owner_secret text, p_limit int DEFAULT 50)
RETURNS TABLE (
    id UUID,
    tenant_name TEXT,
    action TEXT,
    details JSONB,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    SELECT 
        l.id,
        COALESCE(t.name, 'System') AS tenant_name,
        l.action,
        l.details,
        l.created_at
    FROM public.system_logs l
    LEFT JOIN public.tenants t ON l.tenant_id = t.id
    ORDER BY l.created_at DESC
    LIMIT p_limit;
END;
$$;

-- 3. Create RPC for Revenue Chart
CREATE OR REPLACE FUNCTION public.get_superadmin_revenue_chart(owner_secret text, p_days int DEFAULT 7)
RETURNS TABLE (
    date_label TEXT,
    revenue NUMERIC
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    RETURN QUERY
    SELECT 
        to_char(date_trunc('day', o.created_at), 'DD/MM') as date_label,
        SUM(o.total_price) as revenue
    FROM public.orders o
    WHERE o.is_paid = true AND o.created_at >= NOW() - (p_days || ' days')::INTERVAL
    GROUP BY date_trunc('day', o.created_at)
    ORDER BY date_trunc('day', o.created_at) ASC;
END;
$$;

-- 4. Helper Function to Insert Logs
CREATE OR REPLACE FUNCTION public.log_system_activity(p_tenant_id UUID, p_action TEXT, p_details JSONB DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
    INSERT INTO public.system_logs (tenant_id, action, details)
    VALUES (p_tenant_id, p_action, p_details);
END;
$$;

-- 5. Quick Extend Subscription
CREATE OR REPLACE FUNCTION public.quick_extend_tenant(owner_secret text, p_tenant_id UUID, p_days INT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    current_end TIMESTAMPTZ;
    new_end TIMESTAMPTZ;
BEGIN
    IF owner_secret != 'nohope_admin_999' THEN
        RAISE EXCEPTION 'Unauthorized' USING ERRCODE = 'P0001';
    END IF;

    SELECT subscription_end_date INTO current_end FROM public.tenants WHERE id = p_tenant_id;
    
    IF current_end IS NULL OR current_end < NOW() THEN
        new_end := NOW() + (p_days || ' days')::INTERVAL;
    ELSE
        new_end := current_end + (p_days || ' days')::INTERVAL;
    END IF;

    UPDATE public.tenants
    SET subscription_end_date = new_end,
        status = 'active'
    WHERE id = p_tenant_id;

    -- Log action
    PERFORM public.log_system_activity(p_tenant_id, 'SUBSCRIPTION_EXTENDED', jsonb_build_object('days', p_days, 'new_expiry', new_end));

    RETURN TRUE;
END;
$$;

-- 6. Triggers for logging
CREATE OR REPLACE FUNCTION public.trigger_log_tenant_creation()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM public.log_system_activity(NEW.id, 'TENANT_CREATED', jsonb_build_object('name', NEW.name));
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_tenant_creation_trigger ON public.tenants;
CREATE TRIGGER log_tenant_creation_trigger
AFTER INSERT ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.trigger_log_tenant_creation();

CREATE OR REPLACE FUNCTION public.trigger_log_tenant_suspension()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.status != NEW.status AND NEW.status = 'suspended' THEN
        PERFORM public.log_system_activity(NEW.id, 'TENANT_SUSPENDED', jsonb_build_object('name', NEW.name));
    ELSIF OLD.status != NEW.status AND NEW.status = 'active' THEN
        PERFORM public.log_system_activity(NEW.id, 'TENANT_ACTIVATED', jsonb_build_object('name', NEW.name));
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS log_tenant_suspension_trigger ON public.tenants;
CREATE TRIGGER log_tenant_suspension_trigger
AFTER UPDATE ON public.tenants
FOR EACH ROW EXECUTE FUNCTION public.trigger_log_tenant_suspension();
