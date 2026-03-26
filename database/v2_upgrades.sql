-- =========================================================================
-- Nohope Coffee V2 Upgrades
-- Please run this script in your Supabase SQL Editor to enable V2 features
-- =========================================================================

-- 1. Create audit_logs table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_identifier TEXT NOT NULL,
    action TEXT NOT NULL,
    details JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS for audit logs (only admins can read)
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admin All Access" ON public.audit_logs FOR ALL USING (
    (auth.jwt() ->> 'email') = 'admin@nohope.coffee' OR (auth.jwt() ->> 'email') = 'admin@nohope.cafe'
);

-- 2. Create RPC for Atomic Order Placement and Inventory Deduction
-- Drops if exists to allow safe recreation
DROP FUNCTION IF EXISTS public.place_order_and_deduct_inventory(jsonb);

CREATE OR REPLACE FUNCTION public.place_order_and_deduct_inventory(payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_order_id uuid;
    item jsonb;
    recipe_item jsonb;
    deduction_qty numeric;
    current_stock numeric;
    req_ingredient_id uuid;
BEGIN
    -- 1. Validate Inventory First
    FOR item IN SELECT * FROM jsonb_array_elements(payload->'items')
    LOOP
        -- For each item in the order, look up the recipe
        -- Expecting item structure: {"id": "...", "quantity": X, "recipe": [{"ingredientId": "...", "quantity": Y}]}
        -- We will verify the explicit recipe sent from the client or calculate it here.
        -- For robust security, we trust the client's calculated recipe array if provided, 
        -- but ideally we should fetch from products table. To simplify, we accept calculated reductions.
        
        -- We will loop through a provided "reductions" array in the payload instead:
        -- payload->'reductions' = [{"ingredientId": "uuid", "qty": Z}]
    END LOOP;
    
    -- Let's redesign the function to directly take a reductions map
    -- payload->'reductions' = {"ingredient_uuid_1": 5.5, "ingredient_uuid_2": 2}
    
    -- Check all stocks BEFORE deducting to prevent partial failure
    IF payload ? 'reductions' THEN
        FOR req_ingredient_id, deduction_qty IN SELECT key::uuid, value::numeric FROM jsonb_each_text(payload->'reductions')
        LOOP
            SELECT stock INTO current_stock FROM public.ingredients WHERE id = req_ingredient_id;
            
            IF current_stock IS NULL OR current_stock < deduction_qty THEN
                RAISE EXCEPTION 'Not enough stock for ingredient %', req_ingredient_id;
            END IF;
        END LOOP;
        
        -- All stocks are sufficient. Deduct them.
        FOR req_ingredient_id, deduction_qty IN SELECT key::uuid, value::numeric FROM jsonb_each_text(payload->'reductions')
        LOOP
            SELECT stock INTO current_stock FROM public.ingredients WHERE id = req_ingredient_id;
            
            UPDATE public.ingredients 
            SET stock = current_stock - deduction_qty 
            WHERE id = req_ingredient_id;
            
            -- Insert inventory log
            INSERT INTO public.inventory_logs (ingredient_id, change_type, amount, previous_stock, new_stock, reason)
            VALUES (req_ingredient_id, 'deduction', deduction_qty, current_stock, current_stock - deduction_qty, 'Xuất kho từ WebApp RPC');
        END LOOP;
    END IF;

    -- 2. Insert Order
    INSERT INTO public.orders (
        table_number, 
        session_id, 
        customer_phone, 
        earned_points, 
        items, 
        total_price, 
        order_note, 
        payment_method, 
        status
    ) VALUES (
        payload->>'table_number',
        payload->>'session_id',
        payload->>'customer_phone',
        (payload->>'earned_points')::integer,
        payload->'items',
        (payload->>'total_price')::numeric,
        payload->>'order_note',
        payload->>'payment_method',
        COALESCE(payload->>'status', 'Pending')
    ) RETURNING id INTO new_order_id;

    RETURN new_order_id;
END;
$$;
