-- =========================================================================
-- V7 RPC: Fix place_order_and_deduct_inventory
-- Validate reductions server-side instead of trusting client
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
    product_row record;
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

    -- 2. Validate ALL stocks BEFORE deducting (atomic check)
    FOR req_ingredient_id, deduction_qty IN 
        SELECT key::uuid, value::numeric FROM jsonb_each_text(total_reductions)
    LOOP
        SELECT stock INTO current_stock FROM public.ingredients WHERE id = req_ingredient_id;
        
        IF current_stock IS NULL THEN
            RAISE EXCEPTION 'Ingredient % not found', req_ingredient_id;
        END IF;
        
        IF current_stock < deduction_qty THEN
            RAISE EXCEPTION 'Not enough stock for ingredient % (have: %, need: %)', 
                req_ingredient_id, current_stock, deduction_qty;
        END IF;
    END LOOP;
    
    -- 3. Deduct stocks (all validated, safe to proceed)
    FOR req_ingredient_id, deduction_qty IN 
        SELECT key::uuid, value::numeric FROM jsonb_each_text(total_reductions)
    LOOP
        SELECT stock INTO current_stock FROM public.ingredients WHERE id = req_ingredient_id;
        
        UPDATE public.ingredients 
        SET stock = current_stock - deduction_qty 
        WHERE id = req_ingredient_id;
        
        -- Insert audit log
        INSERT INTO public.inventory_logs (ingredient_id, change_type, amount, previous_stock, new_stock, reason)
        VALUES (req_ingredient_id, 'deduction', deduction_qty, current_stock, current_stock - deduction_qty, 'Xuất kho từ đặt hàng (server-validated)');
    END LOOP;

    -- 4. Insert Order
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
