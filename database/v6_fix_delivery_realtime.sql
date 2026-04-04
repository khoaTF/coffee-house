-- =====================================================
-- V6: Fix Delivery Realtime Sync
-- =====================================================
-- Fixes:
-- 1. Case mismatch: RPC used 'pending' (lowercase) for delivery_status
--    while all JS code uses 'Pending' (PascalCase)
-- 2. Recreate place_delivery_order with correct PascalCase
-- 3. Fix any existing orders with lowercase delivery_status

CREATE OR REPLACE FUNCTION place_delivery_order(payload JSONB)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    new_order_id UUID;
    new_tracking_token TEXT;
    item JSONB;
    recipe JSONB;
    ingredient JSONB;
    req_ingredient_id UUID;
    deduction_qty NUMERIC;
    current_stock NUMERIC;
BEGIN
    -- Generate tracking token
    new_tracking_token := UPPER(SUBSTR(MD5(RANDOM()::TEXT || NOW()::TEXT), 1, 8));

    -- Process inventory deduction per item
    IF payload->'items' IS NOT NULL THEN
        FOR item IN SELECT * FROM jsonb_array_elements(payload->'items')
        LOOP
            recipe := item->'recipe';
            IF recipe IS NOT NULL AND jsonb_array_length(recipe) > 0 THEN
                FOR ingredient IN SELECT * FROM jsonb_array_elements(recipe)
                LOOP
                    req_ingredient_id := (ingredient->>'ingredient_id')::UUID;
                    deduction_qty := (ingredient->>'amount')::NUMERIC * COALESCE((item->>'quantity')::NUMERIC, 1);
                    SELECT stock INTO current_stock FROM public.ingredients WHERE id = req_ingredient_id;
                    UPDATE public.ingredients SET stock = current_stock - deduction_qty WHERE id = req_ingredient_id;
                    INSERT INTO public.inventory_logs (ingredient_id, change_type, amount, previous_stock, new_stock, reason)
                    VALUES (req_ingredient_id, 'deduction', deduction_qty, current_stock, current_stock - deduction_qty, 'Xuất kho đơn giao hàng');
                END LOOP;
            END IF;
        END LOOP;
    END IF;

    -- Insert delivery order with CORRECT PascalCase delivery_status
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
        'Pending',  -- FIX: was 'pending' (lowercase)
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

-- Fix any existing orders with lowercase delivery_status
UPDATE orders SET delivery_status = 'Pending' WHERE delivery_status = 'pending';
UPDATE orders SET delivery_status = 'Preparing' WHERE delivery_status = 'preparing';
UPDATE orders SET delivery_status = 'Ready' WHERE delivery_status = 'ready';
