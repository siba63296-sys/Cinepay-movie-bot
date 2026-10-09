import React, { useState } from 'react';
import { Movie, Order, BotSettings } from '../types';
import { Send, Smartphone, Shield, User, Copy, Check, CheckCircle2, Film, RefreshCw } from 'lucide-react';

interface BotSimulatorTabProps {
  movies: Movie[];
  orders: Order[];
  settings: BotSettings;
  onRefreshData: () => void;
}

interface ChatMessage {
  id: string;
  sender: 'bot' | 'user' | 'admin_notify';
  text: string;
  qrDataUrl?: string;
  buttons?: Array<{ label: string; action: () => void; variant?: 'primary' | 'secondary' | 'danger' }>;
  videoCard?: { title: string; price: number; fileId: string };
  timestamp: string;
}

export const BotSimulatorTab: React.FC<BotSimulatorTabProps> = ({ movies, orders, settings, onRefreshData }) => {
  const [role, setRole] = useState<'customer' | 'admin'>('customer');
  const [inputText, setInputText] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [activeOrderCode, setActiveOrderCode] = useState<string | null>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'msg-1',
      sender: 'bot',
      text: `👋 Namaste Friend!\n\n${settings.welcome_message}\n\nSelect an option below to get started:`,
      buttons: [
        { label: '🎬 Browse Movies', action: () => handleCommand('/movies') },
        { label: '📋 My Orders', action: () => handleMyOrders() },
        { label: 'ℹ️ How to Buy', action: () => handleGuide() }
      ],
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  const addMessage = (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    const newMsg: ChatMessage = {
      ...msg,
      id: `m-${Date.now()}-${Math.random()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages(prev => [...prev, newMsg]);
  };

  const handleCommand = (cmd: string) => {
    if (cmd === '/start') {
      addMessage({ sender: 'user', text: '/start' });
      setTimeout(() => {
        addMessage({
          sender: 'bot',
          text: `👋 *Namaste Friend!*\n\n${settings.welcome_message}`,
          buttons: [
            { label: '🎬 Browse Movies', action: () => handleCommand('/movies') },
            { label: '📋 My Orders', action: () => handleMyOrders() },
            { label: 'ℹ️ How to Buy', action: () => handleGuide() }
          ]
        });
      }, 300);
    } else if (cmd === '/movies') {
      addMessage({ sender: 'user', text: '/movies' });
      setTimeout(() => {
        const active = movies.filter(m => m.is_active);
        if (active.length === 0) {
          addMessage({ sender: 'bot', text: '🎬 No movies are available right now. Please check back later!' });
          return;
        }

        addMessage({
          sender: 'bot',
          text: `🎬 *Available Movies (${active.length})*\nSelect any movie to view details and generate your instant UPI QR payment:`
        });

        active.forEach(m => {
          addMessage({
            sender: 'bot',
            text: `🍿 *${m.title}*\n💰 Price: ₹${m.price}\n📝 ${m.description}\n🎥 Format: Telegram Streaming Video`,
            buttons: [
              {
                label: `💳 Buy Now (₹${m.price})`,
                action: () => handleBuyMovie(m),
                variant: 'primary'
              }
            ]
          });
        });
      }, 400);
    } else if (cmd === '/admin') {
      addMessage({ sender: 'user', text: '/admin' });
      setTimeout(() => {
        addMessage({
          sender: 'bot',
          text: `⚡ *CinePay Admin Control Panel*\n\nManage movies, verify customer UPI receipts, and configure bot settings.\nCurrent UPI: \`${settings.upi_id}\` (${settings.upi_name})`,
          buttons: [
            { label: '⏳ Pending Orders', action: () => handleAdminPendingOrders() },
            { label: '🎞️ Manage Movies', action: () => handleAdminMoviesList() },
            { label: '📤 Upload Movie Video', action: () => handleAdminUploadPrompt() }
          ]
        });
      }, 300);
    }
  };

  const handleMyOrders = () => {
    addMessage({ sender: 'user', text: '📋 My Orders' });
    setTimeout(() => {
      addMessage({
        sender: 'bot',
        text: `📋 *Your Recent Orders:*\n\n1. *Inception (2010)*\n   • Order: \`ORD-892104\`\n   • Amount: ₹49\n   • Status: ⏳ Pending Verification\n   • Date: Today\n\nUse /movies to buy another title!`,
        buttons: [{ label: '🎬 Browse Movies', action: () => handleCommand('/movies') }]
      });
    }, 300);
  };

  const handleGuide = () => {
    addMessage({ sender: 'user', text: 'ℹ️ How to Buy' });
    setTimeout(() => {
      addMessage({
        sender: 'bot',
        text: `ℹ️ *How to Buy Movies on CinePay (Step-by-Step):*\n\n1️⃣ Click *Browse Movies* and select your movie.\n2️⃣ A unique Order ID and dynamic UPI QR Code will be generated.\n3️⃣ Pay to UPI ID: \`${settings.upi_id}\`\n4️⃣ Tap *[I Have Paid]* and submit your 12-digit UTR/Ref.\n5️⃣ As soon as admin verifies, the bot sends the video right into this chat! 🍿`
      });
    }, 300);
  };

  const handleBuyMovie = async (movie: Movie) => {
    addMessage({ sender: 'user', text: `Buying: ${movie.title}` });

    try {
      // Create order via API
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          movie_id: movie.id,
          customer_name: 'Simulated Customer',
          customer_username: 'telegram_user'
        })
      });
      const data = await res.json();
      const order: Order = data.order;
      setActiveOrderCode(order.order_code);
      onRefreshData();

      // Generate dynamic QR
      const qrRes = await fetch('/api/generate-qr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upi_id: settings.upi_id,
          upi_name: settings.upi_name,
          amount: movie.price,
          order_code: order.order_code
        })
      });
      const qrData = await qrRes.json();

      setTimeout(() => {
        addMessage({
          sender: 'bot',
          qrDataUrl: qrData.qrDataUrl,
          text: `🎟️ *ORDER CREATED: ${order.order_code}*\n\n🎬 *Movie:* ${movie.title}\n💰 *Amount:* ₹${movie.price}\n🏷️ *Status:* ⏳ Pending Payment Verification\n\n━━━━━━━━━━━━━━━━━━━━\n💳 *Payment Instructions:*\n1. Scan the QR code above with Google Pay, PhonePe, or Paytm.\n2. Or pay manually to UPI ID:\n   \`${settings.upi_id}\`\n3. Remarks: \`${order.order_code}\`\n━━━━━━━━━━━━━━━━━━━━\n\nAfter paying, tap the *[✅ I Have Paid]* button below:`,
          buttons: [
            {
              label: '✅ I Have Paid (Submit Proof)',
              action: () => handleClaimPaid(order.order_code),
              variant: 'primary'
            },
            {
              label: '❌ Cancel Order',
              action: () => handleCancelOrder(order.order_code),
              variant: 'danger'
            }
          ]
        });

        // Trigger admin notification preview in simulator
        setTimeout(() => {
          addMessage({
            sender: 'admin_notify',
            text: `🚨 *[ADMIN TELEGRAM ALERT]*\nNew Order Created: \`${order.order_code}\`\nCustomer: Simulated Customer (@telegram_user)\nMovie: *${movie.title}*\nAmount: ₹${movie.price}\nStatus: ⏳ Pending Payment`,
            buttons: [
              {
                label: `✅ Verify & Send Movie (${order.order_code})`,
                action: () => handleAdminVerifyOrder(order.order_code, movie.title),
                variant: 'primary'
              }
            ]
          });
        }, 1200);

      }, 400);

    } catch (err) {
      addMessage({ sender: 'bot', text: '❌ Error generating order.' });
    }
  };

  const handleClaimPaid = (orderCode: string) => {
    addMessage({ sender: 'user', text: `Submitted Payment for ${orderCode}` });
    setTimeout(() => {
      addMessage({
        sender: 'bot',
        text: `📝 *Payment Proof Received!*\n\nOrder: \`${orderCode}\`\nUTR / Ref: \`410293849182\` (Auto-simulated)\n\nOur admin is verifying the receipt in our bank account. Once verified, your movie will be sent directly to this chat!`
      });
    }, 400);
  };

  const handleCancelOrder = async (orderCode: string) => {
    await fetch(`/api/orders/${orderCode}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: 'Cancelled in Simulator' })
    });
    onRefreshData();
    addMessage({ sender: 'user', text: `Cancel Order: ${orderCode}` });
    setTimeout(() => {
      addMessage({ sender: 'bot', text: `❌ Order \`${orderCode}\` has been cancelled.` });
    }, 300);
  };

  const handleAdminVerifyOrder = async (orderCode: string, movieTitle: string) => {
    try {
      const res = await fetch(`/api/orders/${orderCode}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ admin_notes: 'Verified via Bot Simulator' })
      });
      const data = await res.json();
      onRefreshData();

      if (!data.success) {
        addMessage({ sender: 'bot', text: `⚠️ ${data.error}` });
        return;
      }

      // 1. Admin confirmation
      addMessage({
        sender: 'admin_notify',
        text: `🎉 *[ADMIN ACTION COMPLETED]*\nOrder \`${orderCode}\` verified!\nVideo successfully dispatched to Customer via \`sendVideo()\`.`
      });

      // 2. Customer receives movie video!
      setTimeout(() => {
        addMessage({
          sender: 'bot',
          text: `🍿 *Enjoy Your Movie!*\n\n🎬 *Title:* ${movieTitle}\n🔖 *Order Code:* \`${orderCode}\`\n\n✅ Payment verified by admin! The full streaming video has been attached below. Tap play to watch anytime!`,
          videoCard: {
            title: movieTitle,
            price: 49,
            fileId: 'BAACAgUAAxkBAAIBv2eK3b7yX9wQ09qR92x... (Saved Telegram file_id)'
          }
        });
      }, 600);

    } catch (err) {
      addMessage({ sender: 'bot', text: '❌ Failed to verify order.' });
    }
  };

  const handleAdminPendingOrders = () => {
    const pending = orders.filter(o => o.status === 'pending');
    if (pending.length === 0) {
      addMessage({ sender: 'bot', text: '🎉 No pending orders right now!' });
      return;
    }
    let text = `⏳ *Pending Orders (${pending.length}):*\n\n`;
    pending.forEach(o => {
      text += `• \`${o.order_code}\` | ₹${o.amount} | ${o.movie_title || 'Movie'}\n  Proof: ${o.customer_notes || 'Pending'}\n\n`;
    });
    addMessage({
      sender: 'bot',
      text,
      buttons: pending.slice(0, 2).map(o => ({
        label: `✅ Verify ${o.order_code}`,
        action: () => handleAdminVerifyOrder(o.order_code, o.movie_title || 'Movie'),
        variant: 'primary' as const
      }))
    });
  };

  const handleAdminMoviesList = () => {
    let text = `🎞️ *Movie Catalog (${movies.length} Total):*\n\n`;
    movies.forEach((m, idx) => {
      text += `${idx + 1}. *${m.title}* (₹${m.price}) — ${m.is_active ? '🟢 Active' : '🔴 Inactive'}\n`;
    });
    addMessage({ sender: 'bot', text });
  };

  const handleAdminUploadPrompt = () => {
    addMessage({
      sender: 'bot',
      text: `📤 *Upload Movie Video:*\n\nSend or forward the video file directly to this bot.\nThe bot captures the Telegram \`file_id\` automatically.\nThen it asks for Title, Price, and Description.`
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    const text = inputText.trim();
    setInputText('');

    if (text.startsWith('/')) {
      handleCommand(text);
    } else {
      addMessage({ sender: 'user', text });
      setTimeout(() => {
        addMessage({
          sender: 'bot',
          text: `ℹ️ Received: "${text}".\nUse commands /start or /movies to browse catalog.`
        });
      }, 400);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Phone Simulator Frame */}
      <div className="lg:col-span-7 flex flex-col items-center">
        {/* Device Header Bar */}
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
          {/* Mock Telegram Header */}
          <div className="bg-neutral-950 px-4 py-3 border-b border-neutral-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-amber-500/20 text-amber-400 font-bold flex items-center justify-center text-sm">
                🎬
              </div>
              <div>
                <div className="text-sm font-semibold text-white leading-tight">CinePay Bot</div>
                <div className="text-xs text-neutral-400">bot · online</div>
              </div>
            </div>

            {/* Quick role toggle */}
            <div className="flex items-center gap-1 bg-neutral-900 p-1 rounded-lg border border-neutral-800">
              <button
                onClick={() => setRole('customer')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  role === 'customer' ? 'bg-amber-400 text-neutral-950' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <User className="w-3 h-3" />
                <span>Customer</span>
              </button>
              <button
                onClick={() => setRole('admin')}
                className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                  role === 'admin' ? 'bg-amber-400 text-neutral-950' : 'text-neutral-400 hover:text-white'
                }`}
              >
                <Shield className="w-3 h-3" />
                <span>Admin</span>
              </button>
            </div>
          </div>

          {/* Messages Scroll Area */}
          <div className="p-4 h-[480px] overflow-y-auto space-y-4 bg-neutral-950/60 scrollbar-thin scrollbar-thumb-neutral-800">
            {messages.map((msg) => {
              const isUser = msg.sender === 'user';
              const isAdminNotify = msg.sender === 'admin_notify';

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isUser ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                      isUser
                        ? 'bg-amber-500 text-neutral-950 rounded-br-xs font-medium'
                        : isAdminNotify
                        ? 'bg-neutral-900 border border-amber-500/40 text-neutral-200 rounded-bl-xs'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-bl-xs'
                    }`}
                  >
                    {/* Optional QR Code Display */}
                    {msg.qrDataUrl && (
                      <div className="mb-3 p-2 bg-white rounded-lg flex flex-col items-center">
                        <img
                          src={msg.qrDataUrl}
                          alt="UPI QR Code"
                          className="w-48 h-48 object-contain"
                        />
                        <div className="text-[10px] text-neutral-900 font-mono mt-1 font-semibold">
                          Scan with PhonePe / GPay / Paytm
                        </div>
                      </div>
                    )}

                    {/* Optional Video Delivery Card */}
                    {msg.videoCard && (
                      <div className="mb-3 p-3 bg-neutral-950 border border-neutral-800 rounded-xl">
                        <div className="flex items-center gap-2 text-amber-400 font-semibold mb-1">
                          <Film className="w-4 h-4" />
                          <span>{msg.videoCard.title}</span>
                        </div>
                        <div className="text-[11px] text-neutral-400 mb-2">
                          1080p Full HD Video Stream · Stored on Telegram
                        </div>
                        <div className="p-2 bg-neutral-900 rounded font-mono text-[10px] text-neutral-400 break-all">
                          file_id: {msg.videoCard.fileId}
                        </div>
                        <div className="mt-2 flex items-center justify-between text-[11px] text-emerald-400 font-medium">
                          <span>✅ Delivered to Your Chat</span>
                          <span>Instant Play ▶</span>
                        </div>
                      </div>
                    )}

                    {/* Text formatted */}
                    <div className="whitespace-pre-wrap">{msg.text}</div>

                    {/* Timestamp */}
                    <div
                      className={`text-[9px] mt-1 text-right ${
                        isUser ? 'text-neutral-900/70' : 'text-neutral-500'
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {/* Inline Action Buttons (Telegram Inline Keyboard) */}
                  {msg.buttons && msg.buttons.length > 0 && (
                    <div className="mt-1.5 flex flex-col gap-1 w-[88%]">
                      {msg.buttons.map((btn, bIdx) => (
                        <button
                          key={bIdx}
                          onClick={btn.action}
                          className={`w-full py-2 px-3 text-xs font-medium rounded-lg text-center transition-colors ${
                            btn.variant === 'primary'
                              ? 'bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold'
                              : btn.variant === 'danger'
                              ? 'bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800/50'
                              : 'bg-neutral-800 hover:bg-neutral-700 text-neutral-200 border border-neutral-700'
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Quick command pills */}
          <div className="px-3 py-2 bg-neutral-950 border-t border-neutral-900 flex items-center gap-1.5 overflow-x-auto scrollbar-none text-[11px]">
            <button
              onClick={() => handleCommand('/start')}
              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-md border border-neutral-800 whitespace-nowrap"
            >
              /start
            </button>
            <button
              onClick={() => handleCommand('/movies')}
              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-md border border-neutral-800 whitespace-nowrap"
            >
              /movies
            </button>
            <button
              onClick={() => handleCommand('/admin')}
              className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 rounded-md border border-neutral-800 whitespace-nowrap"
            >
              /admin
            </button>
            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'reset',
                    sender: 'bot',
                    text: 'Chat reset. Type /start or click below:',
                    buttons: [{ label: '🎬 /start', action: () => handleCommand('/start') }],
                    timestamp: new Date().toLocaleTimeString()
                  }
                ]);
              }}
              className="px-2 py-1 text-neutral-500 hover:text-neutral-300 ml-auto whitespace-nowrap"
            >
              Clear
            </button>
          </div>

          {/* Input Box */}
          <form onSubmit={handleSendMessage} className="p-3 bg-neutral-950 border-t border-neutral-800 flex items-center gap-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Send command (e.g. /movies or UTR)..."
              className="flex-1 bg-neutral-900 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-amber-400"
            />
            <button
              type="submit"
              className="w-8 h-8 rounded-lg bg-amber-400 text-neutral-950 flex items-center justify-center hover:bg-amber-300 transition-colors shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: Interactive Test Controls & State Inspector */}
      <div className="lg:col-span-5 space-y-6">
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <h3 className="text-sm font-semibold text-white mb-2">How Simulator Works</h3>
          <p className="text-xs text-neutral-400 leading-relaxed mb-4">
            This simulator reproduces the real Telegraf bot conversation flow, including UPI QR generation, 
            instant order creation in Supabase, Admin verification push alert, and automatic video delivery.
          </p>

          <div className="space-y-3">
            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
              <span className="font-semibold text-amber-400">1. Customer Journey:</span>
              <p className="text-neutral-400 mt-0.5">
                Click <b>🎬 Browse Movies</b> in the phone screen. Pick any movie and tap <b>Buy Now</b>. 
                Watch the dynamic UPI QR code generate with the unique Order Code.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
              <span className="font-semibold text-amber-400">2. Admin Verification:</span>
              <p className="text-neutral-400 mt-0.5">
                The bot pushes an Admin Alert with <b>[Verify & Send Movie]</b>. Tap it to test the 
                server delivery routine and see the video delivered to the customer.
              </p>
            </div>

            <div className="p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-xs">
              <span className="font-semibold text-amber-400">3. Safe Duplicate Prevention:</span>
              <p className="text-neutral-400 mt-0.5">
                Once an order is marked <b>delivered</b>, clicking verify again is blocked with a security warning to prevent double movie dispatch.
              </p>
            </div>
          </div>
        </div>

        {/* Live UPI Details Card */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-white">Active UPI Settings</h3>
            <span className="text-xs text-emerald-400 font-mono">Live in Bot</span>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between p-2.5 rounded bg-neutral-950 border border-neutral-800">
              <span className="text-neutral-400">UPI ID:</span>
              <div className="flex items-center gap-2">
                <span className="font-mono text-white">{settings.upi_id}</span>
                <button
                  onClick={() => copyToClipboard(settings.upi_id)}
                  className="text-neutral-400 hover:text-white"
                >
                  {copiedText === settings.upi_id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 rounded bg-neutral-950 border border-neutral-800">
              <span className="text-neutral-400">Receiver Name:</span>
              <span className="font-mono text-white">{settings.upi_name}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
