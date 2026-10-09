import React from 'react';
import { Film, Terminal, Database, Server, Smartphone, ShoppingBag, QrCode, FileText } from 'lucide-react';

interface HeaderProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isSupabaseConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab, isSupabaseConnected }) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: Film },
    { id: 'simulator', label: 'Bot Simulator', icon: Smartphone },
    { id: 'movies', label: 'Movie Catalog', icon: Film },
    { id: 'orders', label: 'Orders & Payments', icon: ShoppingBag },
    { id: 'upi', label: 'UPI Config', icon: QrCode },
    { id: 'sql', label: 'Supabase SQL', icon: Database },
    { id: 'render', label: 'Render Guide (हिंदी)', icon: Server },
    { id: 'code', label: 'Source Files', icon: FileText },
  ];

  return (
    <header className="border-b border-neutral-800 bg-neutral-950/80 backdrop-blur sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0 cursor-pointer" onClick={() => setActiveTab('overview')}>
          <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold">
            🎬
          </div>
          <span className="text-lg font-semibold tracking-tight text-white whitespace-nowrap">
            CinePay Bot
          </span>
        </div>

        {/* Zone 2: Navigation Links */}
        <nav className="hidden lg:flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md whitespace-nowrap shrink-0 transition-colors ${
                  isActive
                    ? 'bg-neutral-800 text-amber-400 font-semibold'
                    : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action / Status */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden sm:flex items-center gap-2 text-xs text-neutral-400">
            <span>DB:</span>
            <span className={`font-mono text-xs ${isSupabaseConnected ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isSupabaseConnected ? 'Supabase Live' : 'Local Sandbox'}
            </span>
          </div>

          <button
            onClick={() => setActiveTab('simulator')}
            className="px-3.5 py-1.5 text-xs font-medium text-neutral-950 bg-amber-400 hover:bg-amber-300 rounded-md transition-colors whitespace-nowrap shrink-0 font-medium"
          >
            Test Bot Simulator
          </button>
        </div>
      </div>

      {/* Mobile nav scroll strip */}
      <div className="lg:hidden flex items-center gap-1 px-4 py-2 overflow-x-auto border-t border-neutral-900 bg-neutral-950">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md whitespace-nowrap shrink-0 transition-colors ${
                isActive
                  ? 'bg-neutral-800 text-amber-400 font-medium'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </header>
  );
};
