-- ==========================================
-- SCRIPT TẠO BẢNG CA LÀM VIỆC (shifts)
-- ==========================================

CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_at TIMESTAMPTZ DEFAULT now(),
    closed_at TIMESTAMPTZ,
    start_balance NUMERIC DEFAULT 0,
    end_balance_expected NUMERIC,
    end_balance_actual NUMERIC,
    total_revenue NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    opened_by TEXT,
    closed_by TEXT,
    notes TEXT
);

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff manage shifts" ON public.shifts
    FOR ALL USING (auth.role() = 'authenticated');

-- Create an Index on status to quickly find open shifts
CREATE INDEX IF NOT EXISTS idx_shifts_status ON public.shifts(status);
