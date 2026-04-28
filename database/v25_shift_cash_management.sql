-- ====================================================
-- v25_shift_cash_management.sql — Shift & Cash Management
-- ====================================================

-- 1. Ensure shifts table has tenant_id
ALTER TABLE public.shifts ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id);

-- Update RLS for shifts to enforce tenant isolation
DROP POLICY IF EXISTS "Staff manage shifts" ON public.shifts;
CREATE POLICY "tenant_isolation_shifts" ON public.shifts 
    FOR ALL USING (
        tenant_id IS NULL OR 
        tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    );

-- 2. Create cash_transactions table
CREATE TABLE IF NOT EXISTS public.cash_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id),
    shift_id UUID REFERENCES public.shifts(id) ON DELETE CASCADE,
    amount NUMERIC NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('in', 'out')),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    created_by TEXT
);

ALTER TABLE public.cash_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation_cash" ON public.cash_transactions 
    FOR ALL USING (
        tenant_id = (SELECT tenant_id FROM public.users WHERE id = auth.uid())
    );

-- Enable Realtime for cash_transactions
BEGIN;
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'cash_transactions') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.cash_transactions;
    END IF;
END $$;
COMMIT;

-- 3. Shift Management RPCs
-- Open Shift
CREATE OR REPLACE FUNCTION public.open_shift(
    p_tenant_id UUID,
    p_opened_by TEXT,
    p_start_balance NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_shift_id UUID;
BEGIN
    -- Check if there is already an open shift for this tenant
    IF EXISTS (SELECT 1 FROM public.shifts WHERE tenant_id = p_tenant_id AND status = 'open') THEN
        RAISE EXCEPTION 'A shift is already open for this tenant' USING ERRCODE = 'P0001';
    END IF;

    INSERT INTO public.shifts (tenant_id, opened_by, start_balance, notes, status)
    VALUES (p_tenant_id, p_opened_by, p_start_balance, p_notes, 'open')
    RETURNING id INTO new_shift_id;

    RETURN new_shift_id;
END;
$$;

-- Close Shift
CREATE OR REPLACE FUNCTION public.close_shift(
    p_tenant_id UUID,
    p_shift_id UUID,
    p_closed_by TEXT,
    p_end_balance_actual NUMERIC,
    p_notes TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_start_balance NUMERIC;
    v_total_revenue NUMERIC;
    v_cash_in NUMERIC;
    v_cash_out NUMERIC;
    v_expected_balance NUMERIC;
BEGIN
    -- Verify shift belongs to tenant and is open
    SELECT start_balance INTO v_start_balance
    FROM public.shifts 
    WHERE id = p_shift_id AND tenant_id = p_tenant_id AND status = 'open';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Shift not found, already closed, or invalid tenant' USING ERRCODE = 'P0001';
    END IF;

    -- Calculate total revenue during this shift (from orders paid during shift)
    -- Using opened_at from shift to now
    SELECT COALESCE(SUM(total_price), 0) INTO v_total_revenue
    FROM public.orders 
    WHERE tenant_id = p_tenant_id 
      AND is_paid = true 
      AND created_at >= (SELECT opened_at FROM public.shifts WHERE id = p_shift_id)
      AND payment_method = 'cash'; -- Assuming we only track cash revenue for the drawer

    -- Calculate cash in/out from cash_transactions
    SELECT COALESCE(SUM(amount), 0) INTO v_cash_in
    FROM public.cash_transactions
    WHERE shift_id = p_shift_id AND transaction_type = 'in';

    SELECT COALESCE(SUM(amount), 0) INTO v_cash_out
    FROM public.cash_transactions
    WHERE shift_id = p_shift_id AND transaction_type = 'out';

    -- Expected balance = start + cash_in - cash_out + cash_revenue
    v_expected_balance := v_start_balance + v_cash_in - v_cash_out + v_total_revenue;

    -- Update the shift
    UPDATE public.shifts
    SET closed_at = now(),
        closed_by = p_closed_by,
        end_balance_expected = v_expected_balance,
        end_balance_actual = p_end_balance_actual,
        total_revenue = v_total_revenue,
        status = 'closed',
        notes = CONCAT_WS(E'\n', notes, p_notes)
    WHERE id = p_shift_id AND tenant_id = p_tenant_id;

    RETURN TRUE;
END;
$$;
