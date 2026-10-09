import React from 'react';
import { Movie, Order, SystemStatus } from '../types';
import { Film, CheckCircle2, Clock, AlertTriangle, ShieldCheck, ArrowRight, Play, Terminal } from 'lucide-react';

interface OverviewTabProps {
  movies: Movie[];
  orders: Order[];
  status: SystemStatus | null;
  onNavigate: (tab: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({ movies, orders, status, onNavigate }) => {
  const activeMovies = movies.filter(m => m.is_active);
  const pendingOrders = orders.filter(o => o.status === 'pending');
  const deliveredOrders = orders.filter(o => o.status === 'delivered');

  const totalRevenue = orders
    .filter(o => o.status === 'delivered' || o.status === 'paid')
    .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

  return (
    <div className="space-y-8">
      {/* Hero Welcome Banner */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 sm:p-8">
        <div className="max-w-3xl">
          <div className="flex items-center gap-2 text-xs text-neutral-400 mb-2">
            <span>Production Blueprint</span>
            <span aria-hidden="true">·</span>
            <span>Telegraf 4.16</span>
            <span aria-hidden="true">·</span>
            <span>Supabase PostgreSQL</span>
            <span aria-hidden="true">·</span>
            <span>Render Ready</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-3">
            Paid Movie Telegram Bot & Management Hub
          </h1>
          <p className="text-sm sm:text-base text-neutral-400 leading-relaxed mb-6">
            Complete system for selling movies on Telegram with custom UPI QR payments, 
            manual admin payment verification, and automatic video delivery directly through Telegram Bot API. 
            Designed for 24/7 zero-downtime deployment on Render.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNavigate('simulator')}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 text-xs font-semibold rounded-lg transition-colors"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Launch Bot Simulator</span>
            </button>
            <button
              onClick={() => onNavigate('render')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors border border-neutral-700"
            >
              <span>Render Deployment Guide (हिंदी)</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onNavigate('sql')}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium rounded-lg transition-colors border border-neutral-700"
            >
              <span>Copy Supabase SQL</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="text-xs text-neutral-400 mb-1">Total Verified Revenue</div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
            ₹{totalRevenue.toLocaleString()}
          </div>
          <div className="text-xs text-neutral-500 mt-1">From verified UPI receipts</div>
        </div>

        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="text-xs text-neutral-400 mb-1">Active Catalog Movies</div>
          <div className="text-2xl sm:text-3xl font-bold text-white font-mono tabular-nums">
            {activeMovies.length} <span className="text-sm font-normal text-neutral-500">/ {movies.length}</span>
          </div>
          <div className="text-xs text-neutral-500 mt-1">Visible to Telegram users</div>
        </div>

        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="text-xs text-neutral-400 mb-1">Pending Verifications</div>
          <div className="text-2xl sm:text-3xl font-bold text-amber-400 font-mono tabular-nums">
            {pendingOrders.length}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Awaiting Admin approval</div>
        </div>

        <div className="p-5 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="text-xs text-neutral-400 mb-1">Delivered Movies</div>
          <div className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono tabular-nums">
            {deliveredOrders.length}
          </div>
          <div className="text-xs text-neutral-500 mt-1">Delivered via Direct Link</div>
        </div>
      </div>

      {/* Architecture & Workflow Diagram */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
        <h2 className="text-base font-semibold text-white mb-1">Production Workflow Architecture</h2>
        <p className="text-xs text-neutral-400 mb-6">
          How movies, UPI payments, movie links, and Supabase data communicate securely
        </p>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-xs font-mono text-amber-400 mb-1">Step 1 · Customer</div>
            <div className="text-sm font-semibold text-white mb-1">Selects Movie</div>
            <p className="text-xs text-neutral-400">
              Customer types <code className="text-amber-300">/movies</code>, picks a title. Bot creates a pending order in Supabase and generates a dynamic UPI QR code with order ID.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-xs font-mono text-amber-400 mb-1">Step 2 · UPI Payment</div>
            <div className="text-sm font-semibold text-white mb-1">Scans & Pays</div>
            <p className="text-xs text-neutral-400">
              Customer scans QR via GPay/PhonePe/Paytm and taps <i>I Have Paid</i> with UTR/Ref. Payment stays strictly <b>Pending</b> until admin confirms receipt.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-xs font-mono text-amber-400 mb-1">Step 3 · Admin Verification</div>
            <div className="text-sm font-semibold text-white mb-1">Admin Confirms Bank</div>
            <p className="text-xs text-neutral-400">
              Admin receives an alert on Telegram or web panel with UTR. Admin checks banking app and clicks <b>Verify & Deliver</b>.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-neutral-950 border border-neutral-800">
            <div className="text-xs font-mono text-amber-400 mb-1">Step 4 · Auto Delivery</div>
            <div className="text-sm font-semibold text-white mb-1">Instant Link Send</div>
            <p className="text-xs text-neutral-400">
              Bot fetches the saved movie access link from Supabase and sends it directly to customer's chat with an instant watch/download button!
            </p>
          </div>
        </div>
      </div>

      {/* Environment & Configuration Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Environment Security Checklist</span>
            </h3>
            <span className="text-xs text-neutral-500">Render .env requirements</span>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs py-2 border-b border-neutral-800/60">
              <span className="text-neutral-400">TELEGRAM_BOT_TOKEN</span>
              <span className={`font-mono ${status?.env.TELEGRAM_BOT_TOKEN_SET ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.env.TELEGRAM_BOT_TOKEN_SET ? 'Configured' : 'Needs Token from @BotFather'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-neutral-800/60">
              <span className="text-neutral-400">ADMIN_TELEGRAM_ID</span>
              <span className={`font-mono ${status?.env.ADMIN_TELEGRAM_ID_SET ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.env.ADMIN_TELEGRAM_ID_SET ? `ID: ${status.env.ADMIN_TELEGRAM_ID}` : 'Needs ID from @userinfobot'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-neutral-800/60">
              <span className="text-neutral-400">SUPABASE_URL</span>
              <span className={`font-mono ${status?.env.SUPABASE_URL_SET ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.env.SUPABASE_URL_SET ? 'Configured' : 'Needs Project URL'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2 border-b border-neutral-800/60">
              <span className="text-neutral-400">SUPABASE_SERVICE_ROLE_KEY</span>
              <span className={`font-mono ${status?.env.SUPABASE_SERVICE_ROLE_KEY_SET ? 'text-emerald-400' : 'text-amber-400'}`}>
                {status?.env.SUPABASE_SERVICE_ROLE_KEY_SET ? 'Configured (Secret)' : 'Needs Service Role Key'}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs py-2">
              <span className="text-neutral-400">UPI Receiver Details</span>
              <span className="font-mono text-emerald-400">
                {status?.env.UPI_ID} ({status?.env.UPI_NAME})
              </span>
            </div>
          </div>
        </div>

        {/* Telegram 409 Conflict Prevention Alert */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-white mb-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Telegram 409 Conflict & Render Guard</span>
          </div>
          <p className="text-xs text-neutral-400 leading-relaxed mb-4">
            Telegram allows only <b>ONE</b> active polling instance per bot token at any given moment. 
            If you run the bot on your computer while Render is also running, Telegram returns error 409:
          </p>
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-xs text-amber-300 mb-4">
            409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running
          </div>
          <ul className="text-xs text-neutral-400 space-y-1.5 list-disc list-inside">
            <li>Our <code className="text-neutral-200">server.js</code> deletes old webhooks automatically on boot.</li>
            <li>Includes built-in 10-second exponential retry if conflict occurs.</li>
            <li>Handles <code className="text-neutral-200">SIGTERM</code> and <code className="text-neutral-200">SIGINT</code> graceful shutdown on Render.</li>
            <li>Always stop local terminal testing before leaving Render service active!</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
