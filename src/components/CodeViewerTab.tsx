import React, { useState } from 'react';
import { Copy, Check, FileCode, FileText } from 'lucide-react';

export const CodeViewerTab: React.FC = () => {
  const [activeFile, setActiveFile] = useState<string>('server.js');
  const [copied, setCopied] = useState(false);

  const fileContents: Record<string, string> = {
    'server.js': `/**
 * CinePay - Production-Ready Paid Movie Telegram Bot
 * Built with Node.js, Telegraf, Supabase PostgreSQL, and Express
 * Designed for 24/7 deployment on Render (or Railway / VPS)
 */

import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEFAULT_UPI_ID = process.env.UPI_ID || 'cinepay@upi';
const DEFAULT_UPI_NAME = process.env.UPI_NAME || 'CinePay Movies';

// Supabase client initialization
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
}

const adminSessions = new Map();
const customerSessions = new Map();

function isAdmin(ctx) {
  if (!ADMIN_TELEGRAM_ID) return false;
  return String(ctx.from?.id) === String(ADMIN_TELEGRAM_ID).trim();
}

// Bot instance
const bot = new Telegraf(TELEGRAM_BOT_TOKEN);

// /start command
bot.command('start', async (ctx) => {
  // upsert customer
  const buttons = [
    [Markup.button.callback('🎬 Browse Movies', 'menu_movies')],
    [Markup.button.callback('📋 My Orders', 'menu_my_orders'), Markup.button.callback('ℹ️ How to Buy', 'menu_guide')],
    [Markup.button.callback('📞 Support', 'menu_support')]
  ];
  if (isAdmin(ctx)) {
    buttons.unshift([Markup.button.callback('⚡ Admin Control Panel', 'admin_dashboard')]);
  }
  await ctx.reply('🎬 Welcome to CinePay!', Markup.inlineKeyboard(buttons));
});

// Full implementation provided in server.js ...
// See the project files tree for complete 650+ lines.`,

    'schema.sql': `-- PostgreSQL Database Schema for Supabase
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE public.customers (
    telegram_id BIGINT PRIMARY KEY,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.movies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    movie_link TEXT,
    telegram_file_id TEXT,
    file_type TEXT DEFAULT 'link' NOT NULL,
    duration INTEGER,
    file_size BIGINT,
    is_active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.orders (
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

CREATE TABLE public.bot_settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_movies_is_active ON public.movies (is_active);
CREATE INDEX idx_orders_customer_id ON public.orders (customer_telegram_id);
CREATE INDEX idx_orders_status ON public.orders (status);
CREATE INDEX idx_orders_order_code ON public.orders (order_code);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bot_settings ENABLE ROW LEVEL SECURITY;`,

    'package.json': `{
  "name": "cinepay-telegram-bot",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node server.js",
    "dev": "tsx server.ts"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.117.3",
    "dotenv": "^17.2.3",
    "express": "^4.21.2",
    "qrcode": "^1.5.4",
    "telegraf": "^4.16.3"
  }
}`,

    '.env.example': `# Telegram Bot Token from @BotFather
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"

# Numeric Telegram ID from @userinfobot
ADMIN_TELEGRAM_ID="987654321"

# Supabase Project Credentials
SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."

# Default UPI Payment Settings
UPI_ID="merchant@upi"
UPI_NAME="CinePay Official"

PORT=3000`,

    'render.yaml': `services:
  - type: web
    name: cinepay-movie-bot
    env: node
    plan: free
    region: singapore
    buildCommand: npm install
    startCommand: node server.js
    healthCheckPath: /health
    autoDeploy: true
    envVars:
      - key: NODE_VERSION
        value: 20.x
      - key: TELEGRAM_BOT_TOKEN
        sync: false
      - key: ADMIN_TELEGRAM_ID
        sync: false
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_SERVICE_ROLE_KEY
        sync: false
      - key: UPI_ID
        value: cinepay@upi
      - key: UPI_NAME
        value: CinePay Movies`
  };

  const currentCode = fileContents[activeFile] || '';

  const copyToClipboard = () => {
    navigator.clipboard.writeText(currentCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Production Source Files</h2>
          <p className="text-xs text-neutral-400">
            Export or copy these files directly to your GitHub repository for Render deployment
          </p>
        </div>

        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap"
        >
          {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
          <span>{copied ? 'Copied Content!' : `Copy ${activeFile}`}</span>
        </button>
      </div>

      {/* File Selector Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-none border-b border-neutral-800">
        {Object.keys(fileContents).map((fileName) => (
          <button
            key={fileName}
            onClick={() => setActiveFile(fileName)}
            className={`px-3 py-1.5 text-xs font-mono rounded-t-lg transition-colors border-t border-x ${
              activeFile === fileName
                ? 'bg-neutral-900 text-amber-400 border-neutral-800 font-semibold'
                : 'text-neutral-500 border-transparent hover:text-neutral-300'
            }`}
          >
            {fileName}
          </button>
        ))}
      </div>

      {/* Code Viewer Area */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-950 overflow-hidden shadow-2xl">
        <div className="bg-neutral-900 px-4 py-2 border-b border-neutral-800 flex items-center justify-between text-xs">
          <span className="font-mono text-neutral-400">{activeFile}</span>
          <span className="text-[11px] text-neutral-500">{currentCode.split('\n').length} lines</span>
        </div>
        <pre className="p-4 text-xs font-mono text-neutral-300 overflow-x-auto leading-relaxed max-h-[520px] scrollbar-thin scrollbar-thumb-neutral-800">
          <code>{currentCode}</code>
        </pre>
      </div>
    </div>
  );
};
