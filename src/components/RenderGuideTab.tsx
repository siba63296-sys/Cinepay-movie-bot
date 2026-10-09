import React from 'react';
import { Server, AlertTriangle, CheckCircle2, Terminal, Shield, Key, ArrowRight } from 'lucide-react';

export const RenderGuideTab: React.FC = () => {
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Intro Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-neutral-400 mb-1">
          <span>Deployment Tutorial</span>
          <span aria-hidden="true">·</span>
          <span>आसान हिंदी / Hinglish गाइड</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
          Render par 24/7 Telegram Bot Deploy Karne Ka Complete Guide
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 mt-1">
          Ye guide bilkul beginner-friendly hai. Ek-ek step follow karke aapka bot Render par life-long bina band huye chalega.
        </p>
      </div>

      {/* Step 1: BotFather & Admin ID */}
      <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs">
            1
          </span>
          <h3 className="text-base font-semibold text-white">
            Telegram Bot Token & Admin ID Nikalna
          </h3>
        </div>
        <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
          <p>
            1. Telegram kholein aur <b>@BotFather</b> search karein.<br />
            2. <code>/newbot</code> command bhejein. Apne bot ka naam aur username (jo <code>bot</code> par khatam ho) select karein.<br />
            3. BotFather aapko ek <b>HTTP API Token</b> dega (jaise: <code>7123456789:AAH...</code>). Ise copy karke sambhal lein.<br />
            4. Ab Telegram me <b>@userinfobot</b> par click karke <code>/start</code> karein. Wo aapki <b>Id</b> (numeric number, jaise: <code>987654321</code>) batayega. Ye aapka <code>ADMIN_TELEGRAM_ID</code> banega.
          </p>
        </div>
      </div>

      {/* Step 2: Supabase Database Setup */}
      <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs">
            2
          </span>
          <h3 className="text-base font-semibold text-white">
            Supabase Database Setup Karna
          </h3>
        </div>
        <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
          <p>
            1. <a href="https://supabase.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">supabase.com</a> par free account banakar <b>New Project</b> create karein.<br />
            2. Project create hone ke baad left panel me <b>SQL Editor</b> par click karein.<br />
            3. Hamare <b>Supabase SQL</b> tab se pura <code>schema.sql</code> copy karke wahan paste karein aur <b>Run</b> button dabayein.<br />
            4. Sabhi 5 tables (<code>movies</code>, <code>orders</code>, <code>customers</code>, <code>bot_settings</code>, <code>admin_logs</code>) create ho jayengi.<br />
            5. Ab <b>Project Settings → API</b> me jayein aur 2 cheezein copy karein:
          </p>
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-[11px] space-y-1">
            <div><span className="text-neutral-500">Project URL:</span> <span className="text-amber-300">https://xxxx.supabase.co</span></div>
            <div><span className="text-neutral-500">Service Role Secret Key:</span> <span className="text-amber-300">eyJhbGciOiJIUzI1NiIsInR5...</span></div>
          </div>
          <p className="text-amber-400 text-[11px]">
            ⚠️ Dhyaan dein: Server backend ke liye hamesha <code>service_role</code> (secret) key use karein, <code>anon</code> key nahi.
          </p>
        </div>
      </div>

      {/* Step 3: Render Deployment */}
      <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs">
            3
          </span>
          <h3 className="text-base font-semibold text-white">
            Render par Web Service Create Karna
          </h3>
        </div>
        <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
          <p>
            1. <a href="https://render.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">render.com</a> par login karein aur <b>New + → Web Service</b> chunein.<br />
            2. Apna GitHub repository connect karein.<br />
            3. Form me ye exact settings bharein:
          </p>
          <div className="p-3 bg-neutral-950 rounded-lg border border-neutral-800 font-mono text-[11px] space-y-1.5">
            <div><span className="text-neutral-500">Name:</span> <span className="text-white">cinepay-telegram-bot</span></div>
            <div><span className="text-neutral-500">Environment:</span> <span className="text-white">Node</span></div>
            <div><span className="text-neutral-500">Region:</span> <span className="text-white">Singapore (Fastest for India)</span></div>
            <div><span className="text-neutral-500">Branch:</span> <span className="text-white">main</span></div>
            <div><span className="text-neutral-500">Build Command:</span> <span className="text-emerald-400 font-bold">npm install</span></div>
            <div><span className="text-neutral-500">Start Command:</span> <span className="text-emerald-400 font-bold">node server.js</span></div>
            <div><span className="text-neutral-500">Plan Type:</span> <span className="text-white">Free</span></div>
          </div>
        </div>
      </div>

      {/* Step 4: Environment Variables */}
      <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs">
            4
          </span>
          <h3 className="text-base font-semibold text-white">
            Render Environment Variables Set Karna
          </h3>
        </div>
        <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
          <p>
            Render Web Service ke <b>Environment</b> tab me jayein aur ye variables add karein:
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-neutral-800 rounded-lg overflow-hidden">
              <thead className="bg-neutral-950 text-neutral-400">
                <tr>
                  <th className="py-2 px-3">Variable Key</th>
                  <th className="py-2 px-3">Value</th>
                  <th className="py-2 px-3">Purpose</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-800 text-neutral-300 font-mono text-[11px]">
                <tr>
                  <td className="py-2 px-3 text-amber-400">TELEGRAM_BOT_TOKEN</td>
                  <td className="py-2 px-3">BotFather ka Token</td>
                  <td className="py-2 px-3 text-neutral-400 font-sans">Bot ko Telegram se connect karega</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">ADMIN_TELEGRAM_ID</td>
                  <td className="py-2 px-3">Aapka Numeric ID (e.g. 987654321)</td>
                  <td className="py-2 px-3 text-neutral-400 font-sans">Admin verification aur video upload rights</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">SUPABASE_URL</td>
                  <td className="py-2 px-3">https://xxxx.supabase.co</td>
                  <td className="py-2 px-3 text-neutral-400 font-sans">Supabase database URL</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">SUPABASE_SERVICE_ROLE_KEY</td>
                  <td className="py-2 px-3">eyJhbGciOi... (Secret Key)</td>
                  <td className="py-2 px-3 text-neutral-400 font-sans">Database read/write permissions</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">UPI_ID</td>
                  <td className="py-2 px-3">yourname@upi</td>
                  <td className="py-2 px-3 text-neutral-400 font-sans">Customer payment lene ke liye</td>
                </tr>
                <tr>
                  <td className="py-2 px-3 text-amber-400">UPI_NAME</td>
                  <td className="py-2 px-3">CinePay Movies</td>
                  <td className="py-2 px-3 text-neutral-400 font-sans">UPI apps par dikhane ke liye naam</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-neutral-400 text-[11px]">
            Render par <b>Deploy</b> button dabayein. 1-2 minute me build complete ho jayega aur bot live ho jayega!
          </p>
        </div>
      </div>

      {/* Step 5: Telegram 409 Conflict Problem & Solution */}
      <div className="p-6 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-3">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <h3 className="text-base font-semibold text-white">
            Telegram 409 Conflict Error Kaise Solve Karein?
          </h3>
        </div>
        <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
          <p>
            <b>Error kya hoti hai?</b><br />
            <code>409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running</code>
          </p>
          <p>
            <b>Kyu aati hai?</b><br />
            Telegram ek bot token ke liye ek waqt me <b>sirf ek hi polling program</b> allow karta hai. Agar aapne apne laptop/VS Code me <code>node server.js</code> chalu rakha hai aur saath me Render par bhi service chalu kar di, toh dono aapas me takrayenge aur 409 error aayega.
          </p>
          <p>
            <b>Solution (Kaise theek karein):</b><br />
            1. Apne computer me chal rahe purane terminal ko <b>Ctrl + C</b> dabakar band karein.<br />
            2. Hamara <code>server.js</code> boot hote hi Telegram se purane webhook ko saaf karta hai (<code>deleteWebhook</code>) aur agar 409 aaye to 10 seconds wait karke clean reconnect karta hai.<br />
            3. Agar Render par 2 deploys ek saath chal rahe hain, to Render dashboard me purane deploy ko cancel karein.
          </p>
        </div>
      </div>

      {/* Step 6: How Admin Uploads Movies */}
      <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs">
            5
          </span>
          <h3 className="text-base font-semibold text-white">
            Bot me Movie Video Upload Karke Sell Kaise Karein?
          </h3>
        </div>
        <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
          <p>
            1. Telegram me apne bot ko open karein.<br />
            2. <code>/admin</code> command bhejein.<br />
            3. <b>[➕ Upload / Add Movie]</b> button par click karein.<br />
            4. Apni movie video file ko bot me send karein.<br />
            5. Bot video ka Telegram <code>file_id</code> pakad lega aur aapse metadata maangega.<br />
            6. Is format me reply karein:<br />
            <code className="text-amber-300">Pushpa 2 | 49 | 1080p Full HD Hindi Dubbed Movie</code><br />
            7. Bot data Supabase me save kar dega aur movie turant sabhi customers ke liye active ho jayegi!
          </p>
        </div>
      </div>

      {/* Step 7: Zero-Downtime Keep Alive */}
      <div className="p-6 rounded-xl border border-neutral-800 bg-neutral-900/40 space-y-3">
        <div className="flex items-center gap-2">
          <span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 font-bold flex items-center justify-center text-xs">
            6
          </span>
          <h3 className="text-base font-semibold text-white">
            Render Free Tier ko Sone Se Kaise Bachayein (24/7 Active)
          </h3>
        </div>
        <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
          <p>
            Render free web service 15 minute bina traffic ke sleep mode me chali jaati hai.<br />
            Ise 24/7 active rakhne ke liye:<br />
            1. Free tool jaise <a href="https://uptimerobot.com" target="_blank" rel="noreferrer" className="text-amber-400 underline">UptimeRobot.com</a> ya <b>Cron-Job.org</b> par account banayein.<br />
            2. New Monitor add karein:<br />
            &nbsp;&nbsp;• URL: <code>https://your-app-name.onrender.com/health</code><br />
            &nbsp;&nbsp;• Interval: Har 5 minute<br />
            3. Ab Render service kabhi sleep nahi hogi aur aapka Telegram bot 24 ghante customers ko deliver karega!
          </p>
        </div>
      </div>
    </div>
  );
};
