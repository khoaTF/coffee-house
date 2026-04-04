-- =============================================
-- V4: DELIVERY & GPS TRACKING SYSTEM
-- Run this migration on Supabase SQL Editor
-- =============================================

-- 1. Mở rộng bảng orders cho delivery
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type TEXT DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_name TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_phone TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lat DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_lng DOUBLE PRECISION;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee NUMERIC DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_status TEXT DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS assigned_driver_id UUID;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_note TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_token TEXT;

-- Add CHECK constraints
DO $$ BEGIN
    ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
    ALTER TABLE orders ADD CONSTRAINT orders_status_check
        CHECK (status IN ('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled', 'Delivering'));
EXCEPTION WHEN others THEN NULL;
END $$;

-- Index for tracking token lookups
CREATE INDEX IF NOT EXISTS idx_orders_tracking_token ON orders(tracking_token) WHERE tracking_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_order_type ON orders(order_type);
CREATE INDEX IF NOT EXISTS idx_orders_delivery_status ON orders(delivery_status) WHERE order_type = 'delivery';

-- 2. Bảng Shipper/Driver
CREATE TABLE IF NOT EXISTS delivery_drivers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    phone TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    current_lat DOUBLE PRECISION,
    current_lng DOUBLE PRECISION,
    last_location_update TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Mở rộng store_settings cho delivery config
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS delivery_enabled BOOLEAN DEFAULT false;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS delivery_radius_km NUMERIC DEFAULT 3;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS delivery_base_fee NUMERIC DEFAULT 15000;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS delivery_fee_per_km NUMERIC DEFAULT 5000;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_lat DOUBLE PRECISION;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS store_lng DOUBLE PRECISION;
ALTER TABLE store_settings ADD COLUMN IF NOT EXISTS delivery_min_order NUMERIC DEFAULT 30000;

-- 4. RPC: Đặt đơn giao hàng (reuse inventory deduction logic)
DROP FUNCTION IF EXISTS public.place_delivery_order(jsonb);

CREATE OR REPLACE FUNCTION public.place_delivery_order(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_order_id uuid;
    new_tracking_token text;
    req_ingredient_id uuid;
    deduction_qty numeric;
    current_stock numeric;
    item jsonb;
BEGIN
    -- Generate short tracking token
    new_tracking_token := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8));

    -- Inventory check & deduction (same as place_order_and_deduct_inventory)
    IF payload ? 'reductions' THEN
        FOR req_ingredient_id, deduction_qty IN 
            SELECT key::uuid, value::numeric FROM jsonb_each_text(payload->'reductions')
        LOOP
            SELECT stock INTO current_stock FROM public.ingredients WHERE id = req_ingredient_id;
            IF current_stock IS NULL OR current_stock < deduction_qty THEN
                RAISE EXCEPTION 'Not enough stock for ingredient %', req_ingredient_id;
            END IF;
        END LOOP;
        
        FOR req_ingredient_id, deduction_qty IN 
            SELECT key::uuid, value::numeric FROM jsonb_each_text(payload->'reductions')
        LOOP
            SELECT stock INTO current_stock FROM public.ingredients WHERE id = req_ingredient_id;
            UPDATE public.ingredients SET stock = current_stock - deduction_qty WHERE id = req_ingredient_id;
            INSERT INTO public.inventory_logs (ingredient_id, change_type, amount, previous_stock, new_stock, reason)
            VALUES (req_ingredient_id, 'deduction', deduction_qty, current_stock, current_stock - deduction_qty, 'Xuất kho đơn giao hàng');
        END LOOP;
    END IF;

    -- Insert delivery order
    INSERT INTO public.orders (
        order_type, table_number, session_id,
        delivery_name, delivery_phone, delivery_address,
        delivery_lat, delivery_lng, delivery_fee, delivery_note,
        tracking_token, delivery_status,
        customer_phone, earned_points,
        items, total_price, order_note,
        payment_method, status
    ) VALUES (
        'delivery',
        'DELIVERY',
        'delivery-' || new_tracking_token,
        payload->>'delivery_name',
        payload->>'delivery_phone',
        payload->>'delivery_address',
        (payload->>'delivery_lat')::double precision,
        (payload->>'delivery_lng')::double precision,
        COALESCE((payload->>'delivery_fee')::numeric, 0),
        payload->>'delivery_note',
        new_tracking_token,
        'pending',
        payload->>'delivery_phone',
        COALESCE((payload->>'earned_points')::integer, 0),
        payload->'items',
        (payload->>'total_price')::numeric,
        payload->>'order_note',
        COALESCE(payload->>'payment_method', 'cash'),
        'Pending'
    ) RETURNING id INTO new_order_id;

    RETURN jsonb_build_object('order_id', new_order_id, 'tracking_token', new_tracking_token);
END;
$$;

-- 5. RLS Policies cho delivery_drivers
ALTER TABLE delivery_drivers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read delivery_drivers" ON delivery_drivers
    FOR SELECT USING (true);

CREATE POLICY "Allow authenticated insert delivery_drivers" ON delivery_drivers
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow authenticated update delivery_drivers" ON delivery_drivers
    FOR UPDATE USING (true);

-- 6. RLS cho orders tracking (public read by token)
CREATE POLICY "Allow public read orders by tracking_token" ON orders
    FOR SELECT USING (tracking_token IS NOT NULL);

-- 7. Enable realtime for delivery_drivers
ALTER PUBLICATION supabase_realtime ADD TABLE delivery_drivers;
