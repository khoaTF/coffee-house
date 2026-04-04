-- Fix Supabase Realtime filtering for non-primary keys (order_type)
-- This ensures that UPDATE events carry the full payload (e.g. order_type, delivery_status).
-- Without this, driver app and tracking app will drop events because the filter columns aren't in the WAL.
ALTER TABLE public.orders REPLICA IDENTITY FULL;
