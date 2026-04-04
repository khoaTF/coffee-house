-- Thêm các RPC cần thiết cho driver.js

-- 1. driver_claim_order: Shipper nhận đơn (khi đơn đang chờ người nhận)
CREATE OR REPLACE FUNCTION public.driver_claim_order(p_order_id uuid, p_driver_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.orders
    SET assigned_driver_id = p_driver_id
    WHERE id = p_order_id 
      AND assigned_driver_id IS NULL
      AND order_type = 'delivery';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order already claimed or not found';
    END IF;
END;
$$;


-- 2. driver_update_status: Shipper cập nhật trạng thái đơn hàng (Đang giao, Đã giao)
CREATE OR REPLACE FUNCTION public.driver_update_status(p_order_id uuid, p_driver_id uuid, p_delivery_status text, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    UPDATE public.orders
    SET delivery_status = p_delivery_status,
        status = p_status
    WHERE id = p_order_id 
      AND assigned_driver_id = p_driver_id
      AND order_type = 'delivery';

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not assigned to this driver or not found';
    END IF;
END;
$$;
