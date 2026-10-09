import React, { useState, useEffect } from 'react';
import { BotSettings } from '../types';
import { QrCode, Save, Check, RefreshCw, Smartphone } from 'lucide-react';

interface UpiSettingsTabProps {
  settings: BotSettings;
  onRefreshData: () => void;
}

export const UpiSettingsTab: React.FC<UpiSettingsTabProps> = ({ settings, onRefreshData }) => {
  const [upiId, setUpiId] = useState(settings.upi_id);
  const [upiName, setUpiName] = useState(settings.upi_name);
  const [supportHandle, setSupportHandle] = useState(settings.support_handle);
  const [welcomeMessage, setWelcomeMessage] = useState(settings.welcome_message);
  
  const [previewAmount, setPreviewAmount] = useState('49');
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [upiUrl, setUpiUrl] = useState<string>('');
  
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Sync state if settings prop changes
  useEffect(() => {
    setUpiId(settings.upi_id);
    setUpiName(settings.upi_name);
    setSupportHandle(settings.support_handle);
    setWelcomeMessage(settings.welcome_message);
  }, [settings]);

  // Generate live preview QR
  useEffect(() => {
    const fetchQr = async () => {
      try {
        const res = await fetch('/api/generate-qr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            upi_id: upiId,
            upi_name: upiName,
            amount: previewAmount,
            order_code: 'TEST-PREVIEW'
          })
        });
        const data = await res.json();
        if (data.success) {
          setQrDataUrl(data.qrDataUrl);
          setUpiUrl(data.upiUrl);
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchQr();
  }, [upiId, upiName, previewAmount]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSaveSuccess(false);

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          upi_id: upiId,
          upi_name: upiName,
          support_handle: supportHandle,
          welcome_message: welcomeMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onRefreshData();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      {/* Left Column: Settings Form */}
      <div className="lg:col-span-7 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-white">UPI & Payment Configuration</h2>
          <p className="text-xs text-neutral-400">
            Configure the bank Virtual Payment Address (VPA) and display name for movie purchases
          </p>
        </div>

        <form onSubmit={handleSave} className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-4 text-xs">
          <div>
            <label className="block text-neutral-300 font-medium mb-1">
              UPI ID (VPA)
            </label>
            <input
              type="text"
              required
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              placeholder="e.g. merchant@paytm or 9876543210@ibl"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-amber-400"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Money paid by customers will land directly in the bank account tied to this UPI ID.
            </p>
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1">
              Receiver Business / Merchant Name
            </label>
            <input
              type="text"
              required
              value={upiName}
              onChange={(e) => setUpiName(e.target.value)}
              placeholder="e.g. CinePay Movies or Rajesh Sharma"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
            />
            <p className="text-[11px] text-neutral-500 mt-1">
              Displayed on Google Pay, PhonePe, and Paytm payment review screens.
            </p>
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1">
              Admin Support Telegram Handle
            </label>
            <input
              type="text"
              value={supportHandle}
              onChange={(e) => setSupportHandle(e.target.value)}
              placeholder="@CinePayAdmin"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div>
            <label className="block text-neutral-300 font-medium mb-1">
              Bot Start Welcome Message
            </label>
            <textarea
              rows={2}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-amber-400"
            />
          </div>

          <div className="pt-2 flex items-center justify-between">
            {saveSuccess ? (
              <span className="flex items-center gap-1.5 text-emerald-400 text-xs font-medium">
                <Check className="w-4 h-4" />
                <span>UPI Settings saved successfully!</span>
              </span>
            ) : <span />}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-amber-400 hover:bg-amber-300 text-neutral-950 font-semibold rounded-lg transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </form>

        <div className="p-4 rounded-xl border border-neutral-800 bg-neutral-900/20 text-xs text-neutral-400 leading-relaxed">
          <strong className="text-white">Admin UPI Updating on Telegram:</strong><br />
          You can also update this dynamically at any time inside Telegram without restarting the server! 
          As the authorized admin, send <code className="text-amber-300">/admin</code> in the bot, tap <b>⚙️ UPI Settings</b>, 
          and reply with <code className="text-amber-300">new_upi_id | New Name</code>.
        </div>
      </div>

      {/* Right Column: Live QR Preview */}
      <div className="lg:col-span-5 space-y-6">
        <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <QrCode className="w-4 h-4 text-amber-400" />
              <span>Live Generated UPI QR Preview</span>
            </h3>
            <span className="text-xs text-neutral-500 font-mono">Dynamic</span>
          </div>

          {/* QR Display Frame */}
          <div className="flex flex-col items-center p-6 bg-white rounded-2xl shadow-lg border border-neutral-200">
            {qrDataUrl ? (
              <img
                src={qrDataUrl}
                alt="Live UPI QR Code"
                className="w-56 h-56 object-contain"
              />
            ) : (
              <div className="w-56 h-56 flex items-center justify-center text-neutral-400">
                Generating QR...
              </div>
            )}
            <div className="mt-2 text-center text-neutral-900">
              <div className="font-semibold text-sm">{upiName}</div>
              <div className="font-mono text-xs text-neutral-600 mt-0.5">{upiId}</div>
              <div className="text-xs font-bold text-amber-600 mt-1 font-mono">Amount: ₹{previewAmount}</div>
            </div>
          </div>

          {/* Test Amount Slider */}
          <div className="mt-4 pt-4 border-t border-neutral-800 space-y-2">
            <div className="flex justify-between text-xs text-neutral-400">
              <span>Test Price Simulator:</span>
              <span className="text-white font-mono font-semibold">₹{previewAmount}</span>
            </div>
            <div className="flex gap-2">
              {['29', '49', '99', '149', '199'].map((amt) => (
                <button
                  key={amt}
                  type="button"
                  onClick={() => setPreviewAmount(amt)}
                  className={`flex-1 py-1 text-xs rounded border transition-colors font-mono ${
                    previewAmount === amt
                      ? 'bg-amber-400 text-neutral-950 border-amber-400 font-semibold'
                      : 'bg-neutral-950 text-neutral-400 border-neutral-800 hover:text-white'
                  }`}
                >
                  ₹{amt}
                </button>
              ))}
            </div>
          </div>

          {/* UPI Intent URL */}
          <div className="mt-4 p-3 bg-neutral-950 rounded-lg border border-neutral-800">
            <div className="text-[11px] text-neutral-500 mb-1">Standard UPI URI Scheme:</div>
            <code className="text-[10px] text-amber-300 font-mono break-all block">
              {upiUrl}
            </code>
          </div>
        </div>
      </div>
    </div>
  );
};
