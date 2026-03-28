-- Database Schema for Cafe QR Ordering System

-- Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    category TEXT,
    price NUMERIC NOT NULL,
    promotional_price NUMERIC,
    promo_start_time TIMESTAMP WITH TIME ZONE,
    promo_end_time TIMESTAMP WITH TIME ZONE,
    description TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_best_seller BOOLEAN DEFAULT false,
    recipe JSONB DEFAULT '[]',
    options JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Ingredients Table
CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    unit TEXT,
    stock NUMERIC DEFAULT 0,
    low_stock_threshold NUMERIC DEFAULT 50,
    supplier_name TEXT,
    supplier_contact TEXT,
    last_restock_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- NOTE: If upgrading existing database, run these commands manually:
-- ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS supplier_name TEXT;
-- ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS supplier_contact TEXT;
-- ALTER TABLE ingredients ADD COLUMN IF NOT EXISTS last_restock_date TIMESTAMP WITH TIME ZONE;

-- Inventory Logs Table for strict audit trails
CREATE TABLE IF NOT EXISTS inventory_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ingredient_id UUID REFERENCES ingredients(id),
    change_type TEXT CHECK (change_type IN ('deduction', 'restock', 'spoilage', 'adjustment')),
    amount NUMERIC NOT NULL,
    previous_stock NUMERIC NOT NULL,
    new_stock NUMERIC NOT NULL,
    reference_id TEXT, -- To link to order ID or PO
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customers Table (Loyalty Program)
CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone TEXT UNIQUE NOT NULL,
    name TEXT,
    tier TEXT DEFAULT 'Bronze',
    current_points INTEGER DEFAULT 0,
    total_spent NUMERIC DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Point Logs Table
CREATE TABLE IF NOT EXISTS point_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    amount INTEGER NOT NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Orders Table
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number TEXT,
    session_id TEXT,
    customer_phone TEXT,
    earned_points INTEGER DEFAULT 0,
    items JSONB DEFAULT '[]',
    total_price NUMERIC,
    discount_code TEXT,
    discount_amount NUMERIC DEFAULT 0,
    order_note TEXT,
    is_paid BOOLEAN DEFAULT false,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'unpaid',
    status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Discounts/Promo Codes Table
CREATE TABLE IF NOT EXISTS discounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code TEXT UNIQUE NOT NULL,
    discount_type TEXT CHECK (discount_type IN ('PERCENT', 'FIXED')),
    value NUMERIC NOT NULL,
    usage_limit INTEGER DEFAULT 0,
    used_count INTEGER DEFAULT 0,
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Customer Feedback Table
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    table_number TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Table Locking Sessions
CREATE TABLE IF NOT EXISTS table_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number TEXT UNIQUE NOT NULL,
    session_id TEXT NOT NULL,
    device_info TEXT,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Staff Requests (Call Staff / Call Bill)
CREATE TABLE IF NOT EXISTS staff_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_number TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('staff', 'bill')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Users Table (for Staff & Admin Auth)
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    pin TEXT UNIQUE NOT NULL,
    role TEXT DEFAULT 'staff' CHECK (role IN ('staff', 'admin', 'kitchen', 'manager')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Khởi tạo tài khoản nhân viên mặc định (Mã PIN: 1234)
-- Bỏ comment dòng dưới để chạy:
-- INSERT INTO users (name, pin, role) VALUES ('Nhân viên Lễ Tân', '1234', 'staff');

-- Enable Row Level Security (RLS) - Optional but recommended
-- By default, for simplicity during initial fix, we assume public access or already configured RLS.
-- ALTER TABLE staff_requests ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Public Access" ON staff_requests FOR ALL USING (true);

-- Ca làm việc (Shifts)
CREATE TABLE IF NOT EXISTS shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    opened_by TEXT NOT NULL,
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    closed_by TEXT,
    closed_at TIMESTAMP WITH TIME ZONE,
    start_balance NUMERIC DEFAULT 0,
    end_balance_expected NUMERIC DEFAULT 0,
    end_balance_actual NUMERIC DEFAULT 0,
    total_revenue NUMERIC DEFAULT 0,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'closed')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Nhật ký hoạt động Admin (Audit Logs)
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_identifier TEXT,
    action TEXT NOT NULL,
    details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
