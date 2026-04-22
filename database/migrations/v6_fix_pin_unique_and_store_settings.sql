-- Migration v6: Fix PIN uniqueness + store_settings schema
-- Date: 2026-04-22
-- Status: APPLIED

-- Problem 1: PIN was globally unique, blocking different branches
-- from having staff with the same PIN code.
-- Fix: Make PIN unique per tenant (branch) instead.

ALTER TABLE public.users DROP CONSTRAINT users_pin_key;
ALTER TABLE public.users ADD CONSTRAINT users_pin_tenant_unique UNIQUE (tenant_id, pin);

-- Problem 2: store_settings table had no 'id' column, causing
-- PostgREST schema cache error: "Could not find the 'id' column of 'store_settings'"
-- Fix: Add 'id' column as serial for PostgREST compatibility.

ALTER TABLE public.store_settings ADD COLUMN IF NOT EXISTS id serial;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
