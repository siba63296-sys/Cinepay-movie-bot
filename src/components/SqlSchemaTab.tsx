import React, { useState } from 'react';
import { Copy, Check, Database, Shield, Key } from 'lucide-react';

export const SqlSchemaTab: React.FC = () => {
  const [copied, setCopied] = useState(false);

  const sqlCode = `-- ====================================================================
-- CinePay: Paid Movie Telegram Bot - Complete PostgreSQL Database Schema
-- Compatible with Supabase SQL Editor
-- ====================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ====================================================================
-- 2. TABLE: customers
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.customers (
    telegram_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 3. TABLE: movies
-- Storing movie title, price, description, movie_link, active status
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    movie_link TEXT, -- direct movie link or channel file link
    telegram_file_id TEXT, -- backwards compatibility
    file_type TEXT DEFAULT 'link' NOT NULL,
    duration INTEGER,
    file_size BIGINT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Safe migration if table already exists in Supabase:
ALTER TABLE public.movies ADD COLUMN IF NOT EXISTS movie_link TEXT;
ALTER TABLE public.movies ALTER COLUMN telegram_file_id DROP NOT NULL;

-- ====================================================================
-- 4. TABLE: orders
-- Customer movie purchase orders, UPI tracking & verification ledger
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

-- ====================================================================
-- 5. TABLE: bot_settings
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 6. TABLE: admin_logs
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_telegram_id BIGINT NOT NULL,
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 7. PERFORMANCE INDEXES
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_movies_is_active ON public.movies (is_active);
CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders (customer_telegram_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders (status);
CREATE INDEX IF NOT EXISTS idx_orders_order_code ON public.orders (order_code);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders (created_at DESC);

-- ====================================================================
-- 8. TRIGGER FOR AUTO updated_at
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_movies_updated_at BEFORE UPDATE ON public.movies FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_bot_settings_updated_at BEFORE UPDATE ON public.bot_settings FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ====================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view active movies only" ON public.movies FOR SELECT USING (is_active = true);
CREATE POLICY "Deny anonymous access to orders" ON public.orders FOR ALL TO anon USING (false);
CREATE POLICY "Deny anonymous access to customers" ON public.customers FOR ALL TO anon USING (false);
CREATE POLICY "Public can read general bot settings" ON public.bot_settings FOR SELECT USING (key IN ('upi_id', 'upi_name', 'welcome_message', 'support_handle'));

-- ====================================================================
-- 10. INITIAL SEED CONFIGURATION
-- ====================================================================
INSERT INTO public.bot_settings (key, value, description)
VALUES 
    ('upi_id', 'cinepay@upi', 'Default UPI ID for customer payments'),
    ('upi_name', 'CinePay Movies', 'Receiver Name displayed on UPI payment apps'),
    ('welcome_message', '🎬 Welcome to CinePay! Buy & watch premium movies instantly on Telegram.', 'Bot start welcome message'),
    ('support_handle', '@CinePaySupport', 'Support Telegram username')
ON CONFLICT (key) DO NOTHING;`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Title & Copy CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Supabase PostgreSQL Database Schema</h2>
          <p className="text-xs text-neutral-400">
            Paste this directly into the Supabase SQL Editor to set up all tables, indexes, triggers & RLS.
          </p>
        </div>

        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-neutral-950" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied to Clipboard!' : 'Copy SQL Schema'}</span>
        </button>
      </div>

      {/* Supabase Setup Steps in Hinglish */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="text-xs font-mono text-amber-400 mb-1">Step 1</div>
          <div className="text-sm font-semibold text-white mb-1">Supabase Account & Project</div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            supabase.com par free account banayein aur ek naya project create karein (Region: Singapore recommended for India).
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="text-xs font-mono text-amber-400 mb-1">Step 2</div>
          <div className="text-sm font-semibold text-white mb-1">SQL Editor me Run karein</div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Left menu se <b>SQL Editor</b> par click karein, upar diya hua SQL code paste karein aur <b>Run</b> button dabayein.
          </p>
        </div>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="text-xs font-mono text-amber-400 mb-1">Step 3</div>
          <div className="text-sm font-semibold text-white mb-1">API Keys Copy karein</div>
          <p className="text-xs text-neutral-400 leading-relaxed">
            <b>Project Settings → API</b> me jayein. <code>Project URL</code> aur <code>service_role (secret)</code> key copy karein.
          </p>
        </div>
      </div>

      {/* SQL Code Block */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl">
        <div className="bg-neutral-900 px-4 py-2.5 border-b border-neutral-800 flex items-center justify-between text-xs">
          <span className="font-mono text-neutral-400">schema.sql (PostgreSQL DDL)</span>
          <button
            onClick={copyToClipboard}
            className="text-neutral-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
        <pre className="p-4 text-xs font-mono text-neutral-300 overflow-x-auto leading-relaxed max-h-[500px] scrollbar-thin scrollbar-thumb-neutral-800">
          <code>{sqlCode}</code>
        </pre>
      </div>
    </div>
  );
};
