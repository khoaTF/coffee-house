-- =========================================================================
-- V8 RPC: Fix place_order_and_deduct_inventory Race Condition
-- Lock ingredient rows FOR UPDATE before checking and deducting
-- =========================================================================

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
    product_recipe jsonb;
    deduction_qty numeric;
    current_stock numeric;
    req_ingredient_id uuid;
    item_quantity integer;
    total_reductions jsonb := '{}'::jsonb;
BEGIN
    -- 1. Calculate reductions SERVER-SIDE from product recipes
    -- Do NOT trust client-sent 'reductions' — compute from product.recipe × item.quantity
    FOR item IN SELECT * FROM jsonb_array_elements(payload->'items')
    LOOP
        item_quantity := COALESCE((item->>'quantity')::integer, 1);
        
        -- Fetch the REAL recipe from products table
        SELECT recipe INTO product_recipe 
        FROM public.products 
        WHERE id = (item->>'id')::uuid;
        
        IF product_recipe IS NOT NULL AND jsonb_array_length(product_recipe) > 0 THEN
            FOR recipe_item IN SELECT * FROM jsonb_array_elements(product_recipe)
            LOOP
                req_ingredient_id := (recipe_item->>'ingredientId')::uuid;
                deduction_qty := (recipe_item->>'quantity')::numeric * item_quantity;
                
                -- Accumulate reductions
                IF total_reductions ? req_ingredient_id::text THEN
                    total_reductions := jsonb_set(
                        total_reductions,
                        ARRAY[req_ingredient_id::text],
                        to_jsonb((total_reductions->>req_ingredient_id::text)::numeric + deduction_qty)
                    );
                ELSE
                    total_reductions := total_reductions || jsonb_build_object(req_ingredient_id::text, deduction_qty);
                END IF;
            END LOOP;
        END IF;
    END LOOP;

    -- 2. Validate AND deduct stocks atomically
    -- Order by ingredient_id to prevent deadlocks when locking multiple rows
    FOR req_ingredient_id, deduction_qty IN 
        SELECT key::uuid, value::numeric FROM jsonb_each_text(total_reductions) ORDER BY key::uuid
    LOOP
        -- Lock the row for update to prevent race conditions
        SELECT stock INTO current_stock FROM public.ingredients WHERE id = req_ingredient_id FOR UPDATE;
        
        IF current_stock IS NULL THEN
            RAISE EXCEPTION 'Ingredient % not found', req_ingredient_id;
        END IF;
        
        IF current_stock < deduction_qty THEN
            RAISE EXCEPTION 'Not enough stock for ingredient % (have: %, need: %)', 
                req_ingredient_id, current_stock, deduction_qty;
        END IF;
        
        -- Deduct stock safely
        UPDATE public.ingredients 
        SET stock = stock - deduction_qty 
        WHERE id = req_ingredient_id;
        
        -- Insert audit log
        INSERT INTO public.inventory_logs (ingredient_id, change_type, amount, previous_stock, new_stock, reason)
        VALUES (req_ingredient_id, 'deduction', deduction_qty, current_stock, current_stock - deduction_qty, 'Xuất kho từ đặt hàng (server-validated)');
    END LOOP;

    -- 3. Insert Order
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
        COALESCE((payload->>'earned_points')::integer, 0),
        payload->'items',
        (payload->>'total_price')::numeric,
        payload->>'order_note',
        payload->>'payment_method',
        'Pending'  -- Always start as Pending, ignore client status
    ) RETURNING id INTO new_order_id;

    RETURN new_order_id;
END;
$$;
