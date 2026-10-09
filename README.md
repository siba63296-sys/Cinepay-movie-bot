# 🎬 CinePay - Paid Movie Telegram Bot & Admin Hub

A production-ready, reliable Telegram Bot built with **Node.js**, **Telegraf**, **Supabase PostgreSQL**, and **Express** for selling movies with instant UPI QR payments, manual receipt verification, and automatic video delivery directly inside Telegram.

Designed for 24/7 zero-downtime hosting on **Render** (or Railway / VPS).

---

## 🌟 Features

1. **Telegram Customer Experience:**
   - `/start` - Welcome message with inline button navigation.
   - `/movies` - Browse catalog of active movies with pricing and description.
   - Instant dynamic UPI QR Code generation with unique Order ID (`ORD-XXXXXX`).
   - `[✅ I Have Paid]` submission for 12-digit UPI UTR or screenshot.
   - Safe cancellation before delivery.

2. **Admin Management & Security:**
   - `/admin` - Restricted strictly to `ADMIN_TELEGRAM_ID`.
   - Add movies by uploading a video directly to the bot: bot captures Telegram `file_id` and saves it to Supabase.
   - Video files stay stored safely on Telegram's servers — **zero storage costs in Supabase**.
   - Manage catalog (activate / deactivate / delete movies).
   - Configure UPI ID and Receiver Name dynamically via bot or web dashboard.

3. **UPI Payment & Verification:**
   - Supports Google Pay, PhonePe, Paytm, BHIM, and any UPI application.
   - Payments remain strictly **Pending** until admin manually verifies the bank credit.
   - One-click `[✅ Verify & Send Movie]` from Telegram or web panel.
   - **Double-delivery prevention:** prevents duplicate video dispatches for already delivered orders.

4. **Render Production Reliability:**
   - Single polling instance guard with automatic cleanup of old webhooks (`deleteWebhook`).
   - Clean handling of **Telegram 409 Conflict** error with automatic retry backoff.
   - Graceful shutdown on `SIGINT` and `SIGTERM`.
   - `/` dashboard and `/health` HTTP endpoint for Render uptime monitoring.

---

## 📁 Project Structure

```text
├── server.js            # Standalone Node.js production bot server for Render
├── server.ts            # Full-stack dev server with Express API & Vite middleware
├── schema.sql           # Complete Supabase PostgreSQL schema with RLS & triggers
├── render.yaml          # Render Blueprint configuration for 1-click deployment
├── package.json         # Scripts and production dependencies
├── .env.example         # Environment variables template
├── src/                 # Interactive Web Dashboard & Telegram Bot Simulator
│   ├── App.tsx          # Main React application
│   ├── components/      # UI components (Simulator, Movies, Orders, UPI, Guide, etc.)
│   └── types.ts         # TypeScript data contracts
└── index.html           # Web app entry point
```

---

## 🚀 Step-by-Step Setup Guide (आसान Hinglish में)

### 1. Telegram Bot Token & Admin ID
1. Telegram open karke **@BotFather** search karein.
2. `/newbot` likhein aur bot ka naam aur username select karein.
3. BotFather jo **HTTP API Token** dega, use copy karein.
4. Ab Telegram me **@userinfobot** ko `/start` karein aur apna **Numeric ID** (jaise `987654321`) note karein. Ye aapka `ADMIN_TELEGRAM_ID` hai.

### 2. Supabase Database Setup
1. [supabase.com](https://supabase.com) par free account banayein aur New Project banayein.
2. Left menu se **SQL Editor** par click karein.
3. Project ki `schema.sql` file ka code copy karke wahan paste karein aur **Run** dabayein.
4. **Project Settings → API** me jaakar `Project URL` aur `service_role` (secret) key copy karein.

### 3. Render par Deploy Karna
1. Apna code GitHub repository me push karein.
2. [render.com](https://render.com) par login karein aur **New + → Web Service** select karein.
3. Settings:
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Health Check Path:** `/health`
4. **Environment Variables** add karein:
   - `TELEGRAM_BOT_TOKEN`
   - `ADMIN_TELEGRAM_ID`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `UPI_ID` (jaise `yourname@paytm`)
   - `UPI_NAME` (jaise `CinePay Movies`)
5. Deploy par click karein. Aapka bot 2-3 minute me live ho jayega!

---

## ⚠️ Telegram 409 Conflict Error Kaise Solve Karein?

Agar aapko ye error dikhe:
```text
409 Conflict: terminated by other getUpdates request; make sure that only one bot instance is running
```

**Kyu hota hai?**
Telegram ek bot token ke liye ek hi active polling runner allow karta hai. Agar aapne local machine par bot chalu rakha hai aur saath me Render par bhi service run ho rahi hai, to conflict aata hai.

**Solution:**
1. Apne laptop/local terminal me `Ctrl + C` dabakar bot ko stop karein.
2. Hamara `server.js` startup par purane webhooks ko auto-delete karta hai aur 10-second retry logic implement karta hai.

---

## 📄 License

Apache-2.0
