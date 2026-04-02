-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;

-- 1. Create a function to run the AI Best Seller logic
CREATE OR REPLACE FUNCTION public.update_ai_best_sellers()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Bước 1: Reset tất cả sản phẩm về không phải là best_seller
  UPDATE products SET is_best_seller = false WHERE id != 'dummy';

  -- Bước 2: Tìm và gán top 4 sản phẩm bán chạy nhất trong 30 ngày qua
  WITH top_products AS (
    SELECT 
       (item->>'productId')::uuid AS product_id,
       SUM((item->>'quantity')::int) AS total_sold
    FROM orders,
         jsonb_array_elements(
             CASE 
               WHEN jsonb_typeof(items) = 'array' THEN items
               ELSE '[]'::jsonb 
             END
         ) AS item
    WHERE created_at >= (now() - interval '30 days')
      AND payment_status = 'paid'
      AND status != 'Cancelled'
    GROUP BY product_id
    ORDER BY total_sold DESC NULLS LAST
    LIMIT 4
  )
  UPDATE products
  SET is_best_seller = true
  WHERE id IN (SELECT product_id FROM top_products);
END;
$$;

-- 2. Schedule the cron job to run every day at Midnight (00:00) UTC
-- Unschedule first if it exists to avoid duplicates
SELECT cron.unschedule('daily_ai_best_seller_update');

SELECT cron.schedule(
    'daily_ai_best_seller_update',
    '0 0 * * *', -- At 00:00 every day
    $$ SELECT public.update_ai_best_sellers(); $$
);
