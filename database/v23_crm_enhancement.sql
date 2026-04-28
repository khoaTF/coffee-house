-- v23_crm_enhancement.sql
-- Upgrade customer_rfm_segments view to include customer name

DROP VIEW IF EXISTS public.customer_rfm_segments;

CREATE VIEW public.customer_rfm_segments AS
WITH customer_stats AS (
    SELECT 
        c.id AS customer_id,
        c.tenant_id,
        c.phone,
        c.name,
        c.current_points,
        c.created_at,
        COUNT(o.id) AS total_orders,
        COALESCE(SUM(o.total_price), 0) AS total_spent,
        MAX(o.created_at) AS last_order_date
    FROM public.customers c
    LEFT JOIN public.orders o ON o.customer_phone = c.phone AND o.tenant_id = c.tenant_id AND o.status != 'cancelled'
    GROUP BY c.id, c.tenant_id, c.phone, c.name, c.current_points, c.created_at
)
SELECT 
    customer_id,
    tenant_id,
    phone,
    name,
    current_points,
    created_at,
    total_orders,
    total_spent,
    last_order_date,
    CASE 
        WHEN total_spent >= 1000000 THEN 'VVIP'
        WHEN total_orders >= 3 AND last_order_date >= (now() - interval '30 days') THEN 'Loyal'
        WHEN total_orders > 0 AND last_order_date < (now() - interval '30 days') THEN 'At Risk'
        WHEN total_orders = 0 THEN 'New'
        ELSE 'Regular'
    END AS rfm_segment
FROM customer_stats;

GRANT SELECT ON public.customer_rfm_segments TO authenticated;
