-- ====================================================================
-- CinePay: Paid Movie Telegram Bot - Complete PostgreSQL Database Schema
-- Compatible with Supabase SQL Editor
-- ====================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. TABLE: customers
-- Tracks all Telegram users interacting with the bot
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    telegram_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.customers IS 'Stores Telegram customers who interact with the bot';

-- ====================================================================
-- 3. TABLE: movies
-- Stores movies catalog with Telegram file_ids (files stay on Telegram)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    telegram_file_id TEXT NOT NULL,
    file_type TEXT DEFAULT 'video' NOT NULL CHECK (file_type IN ('video', 'document')),
    duration INTEGER, -- duration in seconds if available
    file_size BIGINT, -- file size in bytes
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.movies IS 'Catalog of movies with telegram video file_id and active status';

-- ====================================================================
-- 4. TABLE: orders
-- Stores purchase orders, UPI tracking, verification & delivery state
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_code TEXT UNIQUE NOT NULL,
    customer_telegram_id BIGINT NOT NULL REFERENCES public.customers(telegram_id) ON DELETE RESTRICT,
    movie_id UUID NOT NULL REFERENCES public.movies(id) ON DELETE RESTRICT,
    amount NUMERIC(10, 2) NOT NULL CHECK (amount >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'delivered', 'cancelled')),
    payment_method TEXT DEFAULT 'UPI' NOT NULL,
    upi_id_used TEXT,
    customer_notes TEXT,
    admin_notes TEXT,
    verified_at TIMESTAMPTZ,
    verified_by BIGINT,
    delivered_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancel_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.orders IS 'Customer movie purchase orders and payment verification ledger';

-- ====================================================================
-- 5. TABLE: bot_settings
-- Key-value configurations including dynamic UPI details
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.bot_settings IS 'Dynamic bot configuration including UPI ID and receiver name';

-- ====================================================================
-- 6. TABLE: admin_logs
-- Audit trail for payment verifications, movie additions, and cancellations
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_telegram_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

COMMENT ON TABLE public.admin_logs IS 'Audit trail of administrative actions';

-- ====================================================================
-- 7. PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_movies_is_active ON public.movies (is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON public.admin_logs (created_at DESC);

-- ====================================================================
-- 8. TRIGGER FOR AUTOMATIC updated_at
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_customers_updated_at ON public.customers;
CREATE TRIGGER set_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_movies_updated_at ON public.movies;
CREATE TRIGGER set_movies_updated_at
    BEFORE UPDATE ON public.movies
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_orders_updated_at ON public.orders;
CREATE TRIGGER set_orders_updated_at
    BEFORE UPDATE ON public.orders
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS set_bot_settings_updated_at ON public.bot_settings;
CREATE TRIGGER set_bot_settings_updated_at
    BEFORE UPDATE ON public.bot_settings
    FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
-- Enable RLS on all tables
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Note: The Node.js bot backend connects via SUPABASE_SERVICE_ROLE_KEY
-- which automatically bypasses RLS for trusted server-side execution.
-- The policies below restrict direct anonymous access from the web or public client.

-- Public Read for Active Movies (e.g., if a web storefront is ever added)
CREATE POLICY "Public can view active movies only"
    ON public.movies FOR SELECT
    USING (is_active = true);

-- Public cannot view orders or customers directly
CREATE POLICY "Deny anonymous access to orders"
    ON public.orders FOR ALL
    TO anon
    USING (false);

CREATE POLICY "Deny anonymous access to customers"
    ON public.customers FOR ALL
    TO anon
    USING (false);

CREATE POLICY "Deny anonymous access to admin logs"
    ON public.admin_logs FOR ALL
    TO anon
    USING (false);

CREATE POLICY "Public can read general bot settings"
    ON public.bot_settings FOR SELECT
    USING (key IN ('upi_id', 'upi_name', 'welcome_message', 'support_handle'));

-- ====================================================================
-- 10. INITIAL SEED CONFIGURATION
-- ====================================================================
INSERT INTO public.bot_settings (key, value, description)
VALUES 
    ('upi_id', 'cinepay@upi', 'Default UPI ID for customer payments'),
    ('upi_name', 'CinePay Movies', 'Receiver Name displayed on UPI payment apps'),
    ('welcome_message', '🎬 Welcome to CinePay! Buy & watch premium movies instantly on Telegram.', 'Bot start welcome message'),
    ('support_handle', '@CinePaySupport', 'Support Telegram username or contact')
ON CONFLICT (key) DO NOTHING;

-- Sample movie for testing (replace file_id with your real Telegram video file_id)
INSERT INTO public.movies (title, description, price, telegram_file_id, file_type, is_active)
VALUES (
    'Inception (2010) [Sample Demo]', 
    'A thief who steals corporate secrets through dream-sharing technology. 1080p Full HD Hindi + English Dual Audio.',
    49.00,
    'BAACAgUAAxkBAAIBv2e...', -- Replace with real Telegram file_id upon upload
    'video',
    true
)
ON CONFLICT DO NOTHING;
