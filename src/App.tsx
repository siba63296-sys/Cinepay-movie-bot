import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OverviewTab } from './components/OverviewTab';
import { BotSimulatorTab } from './components/BotSimulatorTab';
import { MoviesTab } from './components/MoviesTab';
import { OrdersTab } from './components/OrdersTab';
import { UpiSettingsTab } from './components/UpiSettingsTab';
import { SqlSchemaTab } from './components/SqlSchemaTab';
import { RenderGuideTab } from './components/RenderGuideTab';
import { CodeViewerTab } from './components/CodeViewerTab';
import { Movie, Order, BotSettings, SystemStatus } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [movies, setMovies] = useState<Movie[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [settings, setSettings] = useState<BotSettings>({
    upi_id: 'cinepay@upi',
    upi_name: 'CinePay Movies',
    support_handle: '@CinePaySupport',
    welcome_message: '🎬 Welcome to CinePay! Buy and watch premium movies instantly on Telegram.'
  });
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Load all app data from server API
  const refreshData = async () => {
    try {
      // 1. Fetch Status
      const statusRes = await fetch('/api/status');
      if (statusRes.ok) {
        const statusData = await statusRes.json();
        setStatus(statusData);
      }

      // 2. Fetch Movies
      const moviesRes = await fetch('/api/movies');
      if (moviesRes.ok) {
        const moviesData = await moviesRes.json();
        setMovies(moviesData.movies || []);
      }

      // 3. Fetch Orders
      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData.orders || []);
      }

      // 4. Fetch Settings
      const settingsRes = await fetch('/api/settings');
      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        if (settingsData.settings) {
          setSettings(settingsData.settings);
        }
      }
    } catch (err) {
      console.error('Error fetching data from server:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshData();
  }, []);

  const isSupabaseConnected = Boolean(status?.services.supabaseConnected);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 flex flex-col font-sans selection:bg-amber-400 selection:text-neutral-950">
      {/* Top Navigation Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isSupabaseConnected={isSupabaseConnected}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8">
        {loading ? (
          <div className="h-64 flex flex-col items-center justify-center text-xs text-neutral-500 gap-2">
            <div className="w-6 h-6 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <span>Connecting to CinePay Hub...</span>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && (
              <OverviewTab
                movies={movies}
                orders={orders}
                status={status}
                onNavigate={setActiveTab}
              />
            )}

            {activeTab === 'simulator' && (
              <BotSimulatorTab
                movies={movies}
                orders={orders}
                settings={settings}
                onRefreshData={refreshData}
              />
            )}

            {activeTab === 'movies' && (
              <MoviesTab
                movies={movies}
                onRefreshData={refreshData}
              />
            )}

            {activeTab === 'orders' && (
              <OrdersTab
                orders={orders}
                onRefreshData={refreshData}
              />
            )}

            {activeTab === 'upi' && (
              <UpiSettingsTab
                settings={settings}
                onRefreshData={refreshData}
              />
            )}

            {activeTab === 'sql' && (
              <SqlSchemaTab />
            )}

            {activeTab === 'render' && (
              <RenderGuideTab />
            )}

            {activeTab === 'code' && (
              <CodeViewerTab />
            )}
          </>
        )}
      </main>

      {/* Quiet, Standard Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-6 text-xs text-neutral-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>CinePay Telegram Bot Engine</span>
            <span className="mx-2" aria-hidden="true">·</span>
            <span>Node.js Telegraf & Supabase PostgreSQL</span>
          </div>
          <div className="flex items-center gap-4 text-neutral-400">
            <button onClick={() => setActiveTab('render')} className="hover:text-amber-400 transition-colors">
              Render Deployment
            </button>
            <button onClick={() => setActiveTab('sql')} className="hover:text-amber-400 transition-colors">
              Database Schema
            </button>
            <button onClick={() => setActiveTab('code')} className="hover:text-amber-400 transition-colors">
              Source Code
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
