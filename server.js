/**
 * CinePay - Production-Ready Paid Movie Telegram Bot
 * Built with Node.js, Telegraf, Supabase PostgreSQL, and Express
 * Designed for 24/7 deployment on Render (or Railway / VPS)
 */

import express from 'express';
import { Telegraf, Markup } from 'telegraf';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// ============================================================================
// 1. CONFIGURATION & ENVIRONMENT VALIDATION
// ============================================================================
const PORT = process.env.PORT || 3000;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEFAULT_UPI_ID = process.env.UPI_ID || 'cinepay@upi';
const DEFAULT_UPI_NAME = process.env.UPI_NAME || 'CinePay Movies';

console.log('----------------------------------------------------');
console.log('🎬 CinePay Telegram Bot Server Starting...');
console.log(`Port: ${PORT}`);
console.log(`Telegram Bot Token: ${TELEGRAM_BOT_TOKEN ? 'CONFIGURED (' + TELEGRAM_BOT_TOKEN.slice(0, 6) + '...)' : 'MISSING'}`);
console.log(`Admin Telegram ID: ${ADMIN_TELEGRAM_ID || 'MISSING'}`);
console.log(`Supabase URL: ${SUPABASE_URL || 'MISSING'}`);
console.log(`Supabase Service Key: ${SUPABASE_SERVICE_ROLE_KEY ? 'CONFIGURED' : 'MISSING'}`);
console.log('----------------------------------------------------');

// ============================================================================
// 2. SUPABASE DATABASE CLIENT INITIALIZATION
// ============================================================================
let supabase = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    console.log('✅ Supabase Client initialized with Service Role');
  } catch (err) {
    console.error('❌ Error initializing Supabase client:', err.message);
  }
} else {
  console.warn('⚠️ SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY missing. Database operations will fail until set.');
}

// In-memory admin state tracker for multi-step conversations (uploading movies, setting UPI, etc.)
// Key: telegram_id -> { action, data, timestamp }
const adminSessions = new Map();
const customerSessions = new Map();

// Helper to check if a user is the authorized admin
function isAdmin(ctx) {
  if (!ADMIN_TELEGRAM_ID) return false;
  const senderId = String(ctx.from?.id);
  return senderId === String(ADMIN_TELEGRAM_ID).trim();
}

// Helper to sanitize text for Telegram Markdown
function escapeMarkdown(text) {
  if (!text) return '';
  return String(text).replace(/([_*\[\]()~`>#+\-=|{}.!])/g, '\\$1');
}

// ============================================================================
// 3. DATABASE ACCESS HELPERS (SUPABASE)
// ============================================================================

// Upsert Telegram Customer
async function upsertCustomer(user) {
  if (!supabase || !user) return null;
  try {
    const { data, error } = await supabase
      .from('customers')
      .upsert({
        telegram_id: user.id,
        username: user.username || null,
        first_name: user.first_name || 'Customer',
        last_name: user.last_name || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'telegram_id' })
      .select()
      .single();
    if (error) console.error('Error upserting customer:', error.message);
    return data;
  } catch (err) {
    console.error('Exception upserting customer:', err.message);
    return null;
  }
}

// Fetch active movies for customers
async function getActiveMovies() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching active movies:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exception fetching active movies:', err.message);
    return [];
  }
}

// Fetch all movies (for admin)
async function getAllMovies() {
  if (!supabase) return [];
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) {
      console.error('Error fetching all movies:', error.message);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error('Exception fetching all movies:', err.message);
    return [];
  }
}

// Get Movie by ID
async function getMovieById(id) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('movies')
      .select('*')
      .eq('id', id)
      .single();
    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
}

// Get Bot Settings (e.g., dynamic UPI ID & name)
async function getBotSetting(key, defaultValue) {
  if (!supabase) return defaultValue;
  try {
    const { data, error } = await supabase
      .from('bot_settings')
      .select('value')
      .eq('key', key)
      .single();
    if (error || !data) return defaultValue;
    return data.value;
  } catch (err) {
    return defaultValue;
  }
}

// Set Bot Setting
async function setBotSetting(key, value, description = '') {
  if (!supabase) return false;
  try {
    const { error } = await supabase
      .from('bot_settings')
      .upsert({
        key,
        value,
        description,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' });
    return !error;
  } catch (err) {
    console.error('Error saving setting:', err.message);
    return false;
  }
}

// Create a new order
async function createOrder(customerTelegramId, movieId, amount) {
  if (!supabase) throw new Error('Database client not configured');
  
  // Unique human-readable order code (e.g., ORD-734891)
  const orderCode = `ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
  const upiIdUsed = await getBotSetting('upi_id', DEFAULT_UPI_ID);

  const { data, error } = await supabase
    .from('orders')
    .insert({
      order_code: orderCode,
      customer_telegram_id: customerTelegramId,
      movie_id: movieId,
      amount: amount,
      status: 'pending',
      payment_method: 'UPI',
      upi_id_used: upiIdUsed
    })
    .select('*, movies(*), customers(*)')
    .single();

  if (error) throw error;
  return data;
}

// Fetch Order by Code
async function getOrderByCode(orderCode) {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*, movies(*), customers(*)')
      .eq('order_code', orderCode)
      .single();
    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
}

// ============================================================================
// 4. TELEGRAF BOT SETUP & ROUTING
// ============================================================================
let bot = null;
let isPollingActive = false;

if (TELEGRAM_BOT_TOKEN) {
  bot = new Telegraf(TELEGRAM_BOT_TOKEN);

  // Global Error Handler for Telegraf
  bot.catch((err, ctx) => {
    console.error(`❌ Bot runtime error for update ${ctx.updateType}:`, err);
    try {
      ctx.reply('⚠️ Something went wrong processing your request. Please try again.');
    } catch (e) {
      // ignore reply errors
    }
  });

  // --------------------------------------------------------------------------
  // COMMAND: /start
  // --------------------------------------------------------------------------
  bot.command('start', async (ctx) => {
    const user = ctx.from;
    await upsertCustomer(user);

    const welcomeMsg = await getBotSetting('welcome_message', '🎬 Welcome to CinePay! Buy and watch premium movies instantly.');
    const userIsAdmin = isAdmin(ctx);

    const buttons = [
      [Markup.button.callback('🎬 Browse Movies', 'menu_movies')],
      [Markup.button.callback('📋 My Orders', 'menu_my_orders'), Markup.button.callback('ℹ️ How to Buy', 'menu_guide')],
      [Markup.button.callback('📞 Support & Help', 'menu_support')]
    ];

    if (userIsAdmin) {
      buttons.unshift([Markup.button.callback('⚡ Admin Control Panel', 'admin_dashboard')]);
    }

    const greeting = `👋 *Namaste ${user.first_name || 'Friend'}!*\n\n${welcomeMsg}\n\nSelect an option below to get started:`;
    await ctx.replyWithMarkdown(greeting, Markup.inlineKeyboard(buttons));
  });

  // --------------------------------------------------------------------------
  // COMMAND: /movies
  // --------------------------------------------------------------------------
  bot.command('movies', async (ctx) => {
    await renderMoviesList(ctx);
  });

  // --------------------------------------------------------------------------
  // COMMAND: /admin
  // --------------------------------------------------------------------------
  bot.command('admin', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔ Access Denied. Only the authorized Admin can access this menu.');
    }
    await renderAdminDashboard(ctx);
  });

  // --------------------------------------------------------------------------
  // COMMAND: /addmovie (Direct command for admin to add movie with link)
  // --------------------------------------------------------------------------
  bot.command('addmovie', async (ctx) => {
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔ Access Denied. Admin only.');
    }
    const rawText = ctx.message.text.replace(/^\/addmovie\s*/i, '').trim();
    if (!rawText) {
      adminSessions.set(ctx.from.id, { action: 'awaiting_movie_link_details' });
      return ctx.replyWithMarkdown(
`➕ *Add New Movie (With Link):*

Reply with:
\`Title | Price | Movie Link | Description\`

👉 *Example:*
\`Pushpa 2 | 49 | https://t.me/yourchannel/123 | 1080p Full HD Hindi Dubbed\``,
        Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'admin_dashboard')]])
      );
    }

    const parts = rawText.split('|').map(s => s.trim());
    if (parts.length < 3) {
      return ctx.reply('⚠️ Format: `/addmovie Title | Price | Movie Link | Description`', { parse_mode: 'Markdown' });
    }

    const title = parts[0];
    const price = parseFloat(parts[1]);
    const movieLink = parts[2];
    const description = parts[3] || 'Full HD Movie';

    if (isNaN(price) || price < 0) {
      return ctx.reply('⚠️ Invalid price! Please enter a valid number (e.g. 49).');
    }

    if (!supabase) {
      return ctx.reply('❌ Supabase database is not connected.');
    }

    try {
      const insertData = {
        title,
        price,
        description,
        telegram_file_id: movieLink,
        file_type: 'link',
        is_active: true
      };

      let { data, error } = await supabase
        .from('movies')
        .insert({ ...insertData, movie_link: movieLink })
        .select()
        .single();

      if (error && error.message && error.message.includes('movie_link')) {
        const retry = await supabase
          .from('movies')
          .insert(insertData)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;

      return ctx.replyWithMarkdown(
`🎉 *Movie Added Successfully!*

🎬 *Title:* ${data.title}
💰 *Price:* ₹${data.price}
🔗 *Link:* ${movieLink}
📝 *Description:* ${data.description}
🟢 *Status:* Active for all customers!

Customers will now receive this link automatically after payment verification!`,
        Markup.inlineKeyboard([
          [Markup.button.callback('🎞️ Manage Movies', 'adm_manage_movies')],
          [Markup.button.callback('⚡ Admin Panel', 'admin_dashboard')]
        ])
      );
    } catch (e) {
      return ctx.reply(`❌ Failed to add movie: ${e.message}`);
    }
  });

  // --------------------------------------------------------------------------
  // CUSTOMER MENU HANDLERS
  // --------------------------------------------------------------------------
  bot.action('menu_movies', async (ctx) => {
    await ctx.answerCbQuery();
    await renderMoviesList(ctx);
  });

  bot.action('menu_my_orders', async (ctx) => {
    await ctx.answerCbQuery();
    if (!supabase) {
      return ctx.reply('⚠️ Database connection unavailable.');
    }

    const customerId = ctx.from.id;
    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, movies(title)')
      .eq('customer_telegram_id', customerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error || !orders || orders.length === 0) {
      return ctx.reply('📭 You have no purchase orders yet.\nUse /movies to find and buy a movie!',
        Markup.inlineKeyboard([[Markup.button.callback('🎬 Browse Movies', 'menu_movies')]])
      );
    }

    let text = '📋 *Your Recent Orders:*\n\n';
    orders.forEach((ord, idx) => {
      const statusIcon = ord.status === 'delivered' ? '✅ Delivered' :
                         ord.status === 'paid' ? '⏳ Paid (Verifying)' :
                         ord.status === 'cancelled' ? '❌ Cancelled' : '⏳ Pending Payment';
      text += `${idx + 1}. *${ord.movies?.title || 'Movie'}*\n` +
              `   • Order: \`${ord.order_code}\`\n` +
              `   • Price: ₹${ord.amount}\n` +
              `   • Status: ${statusIcon}\n` +
              `   • Date: ${new Date(ord.created_at).toLocaleDateString()}\n\n`;
    });

    await ctx.replyWithMarkdown(text, Markup.inlineKeyboard([
      [Markup.button.callback('🎬 Browse More Movies', 'menu_movies')],
      [Markup.button.callback('🔙 Main Menu', 'back_to_main')]
    ]));
  });

  bot.action('menu_guide', async (ctx) => {
    await ctx.answerCbQuery();
    const upiId = await getBotSetting('upi_id', DEFAULT_UPI_ID);
    const guideText = 
`ℹ️ *How to Buy Movies on CinePay (Step-by-Step):*

1️⃣ *Choose Movie:* Click on *Browse Movies* and select your favorite title.
2️⃣ *Scan & Pay:* You will receive a unique Order ID and a dynamic UPI QR Code.
3️⃣ *Payment:* Pay using Google Pay, PhonePe, Paytm, or any UPI app to:
   \`${upiId}\`
4️⃣ *Confirm:* Click the *[I Have Paid]* button and send your 12-digit UTR/Ref number or screenshot.
5️⃣ *Instant Delivery:* As soon as our admin confirms payment, the bot sends the movie link directly to this chat! 🍿

*Note:* You can watch or download the movie anytime using the access link!`;

    await ctx.replyWithMarkdown(guideText, Markup.inlineKeyboard([
      [Markup.button.callback('🎬 Browse Movies Now', 'menu_movies')],
      [Markup.button.callback('🔙 Main Menu', 'back_to_main')]
    ]));
  });

  bot.action('menu_support', async (ctx) => {
    await ctx.answerCbQuery();
    const supportHandle = await getBotSetting('support_handle', '@CinePaySupport');
    await ctx.replyWithMarkdown(
      `📞 *Need Help or Support?*\n\nIf you face any issues with payment or video delivery, reach out to our admin directly:\n\n👉 Contact: ${supportHandle}\n\nPlease have your *Order Code* ready for fast assistance.`,
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu', 'back_to_main')]])
    );
  });

  bot.action('back_to_main', async (ctx) => {
    await ctx.answerCbQuery();
    const buttons = [
      [Markup.button.callback('🎬 Browse Movies', 'menu_movies')],
      [Markup.button.callback('📋 My Orders', 'menu_my_orders'), Markup.button.callback('ℹ️ How to Buy', 'menu_guide')],
      [Markup.button.callback('📞 Support', 'menu_support')]
    ];
    if (isAdmin(ctx)) {
      buttons.unshift([Markup.button.callback('⚡ Admin Control Panel', 'admin_dashboard')]);
    }
    await ctx.reply('🎬 *CinePay Main Menu*', Markup.inlineKeyboard(buttons));
  });

  // --------------------------------------------------------------------------
  // MOVIE SELECTION & UPI ORDER GENERATION
  // --------------------------------------------------------------------------
  bot.action(/^buy_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const movieId = ctx.match[1];

    if (!supabase) {
      return ctx.reply('⚠️ Database is currently connecting. Please try again shortly.');
    }

    try {
      const movie = await getMovieById(movieId);
      if (!movie || !movie.is_active) {
        return ctx.reply('❌ Sorry, this movie is no longer active or available.');
      }

      await upsertCustomer(ctx.from);
      const order = await createOrder(ctx.from.id, movie.id, movie.price);
      const upiId = await getBotSetting('upi_id', DEFAULT_UPI_ID);
      const upiName = await getBotSetting('upi_name', DEFAULT_UPI_NAME);

      // Generate standard UPI Payment Intent URL
      // upi://pay?pa=VPA&pn=NAME&am=AMOUNT&cu=INR&tn=NOTE
      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(upiName)}&am=${movie.price}&cu=INR&tn=${encodeURIComponent('Order ' + order.order_code)}`;

      // Generate QR Code buffer
      const qrBuffer = await QRCode.toBuffer(upiUrl, {
        width: 380,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' }
      });

      const orderCaption = 
`🎟️ *ORDER CREATED: ${order.order_code}*

🎬 *Movie:* ${movie.title}
💰 *Amount:* ₹${movie.price}
🏷️ *Status:* ⏳ Pending Payment Verification

━━━━━━━━━━━━━━━━━━━━
💳 *Payment Instructions:*
1. Scan the QR code above with Google Pay, PhonePe, Paytm, or BHIM.
2. Or pay manually to UPI ID:
   \`${upiId}\` (Tap to copy)
3. Name: *${upiName}*
4. Important: Put \`${order.order_code}\` in the payment note/remarks.
━━━━━━━━━━━━━━━━━━━━

After paying, tap the *[✅ I Have Paid]* button below:`;

      await ctx.replyWithPhoto(
        { source: qrBuffer },
        {
          caption: orderCaption,
          parse_mode: 'Markdown',
          ...Markup.inlineKeyboard([
            [Markup.button.callback('✅ I Have Paid (Submit Proof)', `paid_${order.order_code}`)],
            [Markup.button.callback('❌ Cancel Order', `cancel_order_${order.order_code}`)]
          ])
        }
      );

      // Notify Admin about new pending order
      if (ADMIN_TELEGRAM_ID) {
        try {
          const adminNotice = 
`🔔 *New Order Created!*
Order: \`${order.order_code}\`
Customer: ${ctx.from.first_name || 'User'} (@${ctx.from.username || 'none'}, ID: \`${ctx.from.id}\`)
Movie: *${movie.title}*
Amount: ₹${movie.price}
Status: ⏳ Pending Payment`;

          await bot.telegram.sendMessage(ADMIN_TELEGRAM_ID, adminNotice, {
            parse_mode: 'Markdown',
            ...Markup.inlineKeyboard([
              [Markup.button.callback('🔍 View Order', `adm_view_${order.order_code}`)],
              [Markup.button.callback('✅ Verify & Deliver', `adm_verify_${order.order_code}`)]
            ])
          });
        } catch (adminErr) {
          console.error('Failed to notify admin about new order:', adminErr.message);
        }
      }

    } catch (err) {
      console.error('Error initiating movie purchase:', err);
      await ctx.reply('❌ Failed to create order. Please try again or contact support.');
    }
  });

  // Customer clicks "I Have Paid"
  bot.action(/^paid_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const orderCode = ctx.match[1];
    const order = await getOrderByCode(orderCode);

    if (!order) {
      return ctx.reply('❌ Order not found.');
    }

    if (order.status === 'delivered') {
      return ctx.reply('✅ This order has already been verified and delivered to you!');
    }

    // Set customer session to expect UTR / screenshot
    customerSessions.set(ctx.from.id, {
      action: 'waiting_for_utr',
      orderCode: orderCode,
      timestamp: Date.now()
    });

    await ctx.replyWithMarkdown(
`📝 *Payment Proof Submission:*

Order: \`${orderCode}\`
Amount: ₹${order.amount}

👉 *Please reply to this message now* with your 12-digit UPI Reference Number / UTR, or send a payment screenshot.
Our admin will verify it and release your movie immediately!`
    );
  });

  // Customer cancels order
  bot.action(/^cancel_order_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const orderCode = ctx.match[1];
    const order = await getOrderByCode(orderCode);

    if (!order) {
      return ctx.reply('❌ Order not found.');
    }

    if (order.status === 'delivered') {
      return ctx.reply('⛔ This order has already been delivered and cannot be cancelled.');
    }

    if (order.status === 'cancelled') {
      return ctx.reply('ℹ️ This order is already cancelled.');
    }

    // Update order status in Supabase
    if (supabase) {
      await supabase
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: 'Cancelled by customer'
        })
        .eq('order_code', orderCode);
    }

    customerSessions.delete(ctx.from.id);
    await ctx.reply(`❌ Order \`${orderCode}\` has been cancelled.`, { parse_mode: 'Markdown' });
  });

  // --------------------------------------------------------------------------
  // ADMIN DASHBOARD & CONTROLS
  // --------------------------------------------------------------------------
  bot.action('admin_dashboard', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔ Unauthorized.');
    }
    await renderAdminDashboard(ctx);
  });

  // Admin: Pending Orders
  bot.action('adm_pending_orders', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx) || !supabase) return;

    const { data: orders, error } = await supabase
      .from('orders')
      .select('*, movies(title), customers(username, first_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !orders || orders.length === 0) {
      return ctx.reply('🎉 No pending orders right now!', 
        Markup.inlineKeyboard([[Markup.button.callback('🔙 Admin Panel', 'admin_dashboard')]])
      );
    }

    let msg = `⏳ *Pending Orders (${orders.length}):*\n\n`;
    const buttons = [];

    orders.forEach((ord) => {
      msg += `• \`${ord.order_code}\` | *${ord.movies?.title || 'Movie'}* | ₹${ord.amount}\n` +
             `  User: ${ord.customers?.first_name || 'User'} (@${ord.customers?.username || 'none'}) [ID: \`${ord.customer_telegram_id}\`]\n` +
             `  Proof: ${ord.customer_notes || 'Pending submission'}\n\n`;

      buttons.push([
        Markup.button.callback(`✅ Verify ${ord.order_code}`, `adm_verify_${ord.order_code}`),
        Markup.button.callback(`❌ Cancel`, `adm_cancel_${ord.order_code}`)
      ]);
    });

    buttons.push([Markup.button.callback('🔙 Admin Panel', 'admin_dashboard')]);
    await ctx.replyWithMarkdown(msg, Markup.inlineKeyboard(buttons));
  });

  // Admin: View Order
  bot.action(/^adm_view_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) return;

    const orderCode = ctx.match[1];
    const order = await getOrderByCode(orderCode);

    if (!order) {
      return ctx.reply('❌ Order not found.');
    }

    const detailText = 
`📦 *Order Details:* \`${order.order_code}\`

🎬 *Movie:* ${order.movies?.title || 'N/A'}
💰 *Amount:* ₹${order.amount}
📊 *Status:* ${order.status.toUpperCase()}
👤 *Customer ID:* \`${order.customer_telegram_id}\`
📅 *Created:* ${new Date(order.created_at).toLocaleString()}
📝 *Customer Note/UTR:* ${order.customer_notes || 'None'}
🏷️ *UPI ID Used:* ${order.upi_id_used || 'Default'}`;

    const buttons = [];
    if (order.status === 'pending') {
      buttons.push([
        Markup.button.callback('✅ Verify & Deliver Movie', `adm_verify_${order.order_code}`),
        Markup.button.callback('❌ Reject Order', `adm_cancel_${order.order_code}`)
      ]);
    }
    buttons.push([Markup.button.callback('🔙 Admin Panel', 'admin_dashboard')]);

    await ctx.replyWithMarkdown(detailText, Markup.inlineKeyboard(buttons));
  });

  // Admin: VERIFY PAYMENT & AUTOMATIC MOVIE DELIVERY
  bot.action(/^adm_verify_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) {
      return ctx.reply('⛔ Unauthorized.');
    }

    const orderCode = ctx.match[1];
    const order = await getOrderByCode(orderCode);

    if (!order) {
      return ctx.reply('❌ Order not found.');
    }

    // Guard against duplicate delivery
    if (order.status === 'delivered') {
      return ctx.reply(`⚠️ Order \`${orderCode}\` has ALREADY been delivered! Prevented duplicate delivery dispatch.`, { parse_mode: 'Markdown' });
    }

    const movie = order.movies;
    const movieLink = movie?.movie_link || movie?.telegram_file_id;
    if (!movieLink) {
      return ctx.reply(`❌ Cannot deliver: Movie does not have a valid link saved in Supabase!`);
    }

    // Step 1: Update order status to paid first
    await supabase
      .from('orders')
      .update({
        status: 'paid',
        verified_at: new Date().toISOString(),
        verified_by: ctx.from.id,
        admin_notes: `Payment verified by Admin ${ctx.from.id}`
      })
      .eq('order_code', orderCode);

    // Step 2: Deliver movie link directly to Customer's Telegram
    try {
      await ctx.reply(`⏳ Sending movie link to customer (ID: \`${order.customer_telegram_id}\`)...`, { parse_mode: 'Markdown' });

      let webLink = movieLink.trim();
      if (webLink.startsWith('t.me/')) {
        webLink = `https://${webLink}`;
      }
      const isHttpUrl = webLink.startsWith('http://') || webLink.startsWith('https://');

      const deliveryMessage = 
`🍿 *Enjoy Your Movie!*

🎬 *Movie:* ${movie.title}
💰 *Paid:* ₹${order.amount}
🔖 *Order Code:* \`${order.order_code}\`

━━━━━━━━━━━━━━━━━━━━
🔗 *Your Movie Access Link:*
${movieLink}
━━━━━━━━━━━━━━━━━━━━

✅ Your payment has been verified by admin!
Tap the link above or click the button below to watch or download your movie anytime. 🍿`;

      const buttons = isHttpUrl
        ? [[Markup.button.url('🍿 Open / Watch Movie Link', webLink)]]
        : [];

      await bot.telegram.sendMessage(order.customer_telegram_id, deliveryMessage, {
        parse_mode: 'Markdown',
        ...Markup.inlineKeyboard(buttons)
      });

      // Step 3: Record delivered status in Supabase
      await supabase
        .from('orders')
        .update({
          status: 'delivered',
          delivered_at: new Date().toISOString()
        })
        .eq('order_code', orderCode);

      // Step 4: Confirm to Admin
      await ctx.replyWithMarkdown(
`🎉 *Success! Order Verified & Delivered*

• Order: \`${orderCode}\`
• Movie: *${movie.title}*
• Customer ID: \`${order.customer_telegram_id}\`
• Delivered At: ${new Date().toLocaleTimeString()}

The movie link has been sent directly to the customer's Telegram.`
      );

      // Audit log in admin_logs
      await supabase.from('admin_logs').insert({
        admin_telegram_id: ctx.from.id,
        action: 'VERIFY_AND_DELIVER',
        target_id: orderCode,
        details: { customer_id: order.customer_telegram_id, movie_title: movie.title, amount: order.amount }
      });

    } catch (deliveryErr) {
      console.error('Failed to deliver movie link to customer:', deliveryErr);
      await ctx.reply(
`⚠️ *Delivery Warning:* Payment was marked verified, but sending the message failed!
Reason: ${deliveryErr.message}

*Common causes:*
1. Customer has blocked the bot or deleted chat.
Please contact customer directly: \`${order.customer_telegram_id}\``,
        { parse_mode: 'Markdown' }
      );
    }
  });

  // Admin: Cancel / Reject Order
  bot.action(/^adm_cancel_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) return;

    const orderCode = ctx.match[1];
    const order = await getOrderByCode(orderCode);

    if (!order) return ctx.reply('❌ Order not found.');
    if (order.status === 'delivered') {
      return ctx.reply('⛔ Cannot cancel an order that was already delivered!');
    }

    await supabase
      .from('orders')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString(),
        cancel_reason: 'Cancelled by Admin'
      })
      .eq('order_code', orderCode);

    await ctx.reply(`❌ Order \`${orderCode}\` marked as Cancelled.`, { parse_mode: 'Markdown' });

    // Notify customer
    try {
      await bot.telegram.sendMessage(
        order.customer_telegram_id,
        `⚠️ *Order Cancelled:* Your order \`${orderCode}\` for *${order.movies?.title || 'Movie'}* has been cancelled by admin. If you already paid, please reach out to support.`,
        { parse_mode: 'Markdown' }
      );
    } catch (e) {
      // customer might have blocked bot
    }
  });

  // Admin: Manage Movies
  bot.action('adm_manage_movies', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) return;

    const movies = await getAllMovies();
    if (!movies || movies.length === 0) {
      return ctx.reply('📭 No movies found in database.\nClick below to upload your first movie!',
        Markup.inlineKeyboard([
          [Markup.button.callback('➕ Upload Video / Add Movie', 'adm_add_movie')],
          [Markup.button.callback('🔙 Admin Panel', 'admin_dashboard')]
        ])
      );
    }

    let text = `🎞️ *Movie Catalog (${movies.length} Total):*\n\n`;
    const buttons = [];

    movies.forEach((m, idx) => {
      const statusBadge = m.is_active ? '🟢 Active' : '🔴 Inactive';
      text += `${idx + 1}. *${m.title}* (₹${m.price}) — ${statusBadge}\n` +
              `   ID: \`${m.id}\`\n\n`;

      buttons.push([
        Markup.button.callback(`${m.is_active ? '⏸️ Deactivate' : '▶️ Activate'} ${m.title.slice(0, 14)}`, `adm_toggle_${m.id}`),
        Markup.button.callback(`🗑️ Delete`, `adm_del_${m.id}`)
      ]);
    });

    buttons.push([
      Markup.button.callback('➕ Add New Movie', 'adm_add_movie'),
      Markup.button.callback('🔙 Admin Panel', 'admin_dashboard')
    ]);

    await ctx.replyWithMarkdown(text, Markup.inlineKeyboard(buttons));
  });

  // Admin: Toggle Movie Status
  bot.action(/^adm_toggle_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx) || !supabase) return;

    const movieId = ctx.match[1];
    const movie = await getMovieById(movieId);
    if (!movie) return ctx.reply('❌ Movie not found.');

    const newStatus = !movie.is_active;
    await supabase.from('movies').update({ is_active: newStatus }).eq('id', movieId);

    await ctx.reply(`Movie *${movie.title}* is now ${newStatus ? '🟢 Active' : '🔴 Inactive'}!`, {
      parse_mode: 'Markdown',
      ...Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Movies', 'adm_manage_movies')]])
    });
  });

  // Admin: Delete Movie with Safe Confirmation
  bot.action(/^adm_del_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) return;

    const movieId = ctx.match[1];
    const movie = await getMovieById(movieId);
    if (!movie) return ctx.reply('❌ Movie not found.');

    await ctx.replyWithMarkdown(
`⚠️ *Are you sure you want to delete this movie?*

Title: *${movie.title}*
Price: ₹${movie.price}

This action cannot be undone. Any existing orders referencing this movie will be preserved.`,
      Markup.inlineKeyboard([
        [Markup.button.callback('⚠️ Yes, Delete Permanently', `adm_confirm_del_${movieId}`)],
        [Markup.button.callback('❌ No, Cancel', 'adm_manage_movies')]
      ])
    );
  });

  bot.action(/^adm_confirm_del_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx) || !supabase) return;

    const movieId = ctx.match[1];
    const { error } = await supabase.from('movies').delete().eq('id', movieId);

    if (error) {
      return ctx.reply(`❌ Cannot delete: ${error.message} (It may have attached orders; deactivate instead).`);
    }

    await ctx.reply('🗑️ Movie deleted successfully from Supabase!',
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Back to Movies', 'adm_manage_movies')]])
    );
  });

  // Admin: Add Movie Prompt
  bot.action('adm_add_movie', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) return;

    adminSessions.set(ctx.from.id, { action: 'awaiting_movie_link_details' });

    await ctx.replyWithMarkdown(
`➕ *Add New Movie (With Link):*

Please reply to this message with:
\`Title | Price | Movie Link | Description\`

👉 *Example:*
\`Pushpa 2 | 49 | https://t.me/yourchannel/123 | 1080p Full HD Hindi Dubbed\`

*(Note: Link can be any Telegram post/file link, Google Drive, Mega, or streaming link)*`,
      Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'admin_dashboard')]])
    );
  });

  // Admin: UPI Settings
  bot.action('adm_upi_settings', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx)) return;

    const upiId = await getBotSetting('upi_id', DEFAULT_UPI_ID);
    const upiName = await getBotSetting('upi_name', DEFAULT_UPI_NAME);

    adminSessions.set(ctx.from.id, { action: 'awaiting_upi_update' });

    await ctx.replyWithMarkdown(
`⚙️ *Current UPI Configuration:*

• *UPI ID:* \`${upiId}\`
• *Receiver Name:* \`${upiName}\`

To update, reply in this exact format:
\`UPI_ID | Receiver Name\`

Example:
\`9876543210@paytm | Rahul Sharma\`

Or click Cancel:`,
      Markup.inlineKeyboard([[Markup.button.callback('❌ Cancel', 'admin_dashboard')]])
    );
  });

  // Admin: Revenue Stats
  bot.action('adm_stats', async (ctx) => {
    await ctx.answerCbQuery();
    if (!isAdmin(ctx) || !supabase) return;

    const { data: orders } = await supabase.from('orders').select('amount, status, created_at');
    const { data: movies } = await supabase.from('movies').select('id, is_active');
    const { data: customers } = await supabase.from('customers').select('telegram_id');

    let totalRevenue = 0;
    let deliveredCount = 0;
    let pendingCount = 0;
    let cancelledCount = 0;

    (orders || []).forEach(o => {
      if (o.status === 'delivered' || o.status === 'paid') totalRevenue += Number(o.amount);
      if (o.status === 'delivered') deliveredCount++;
      if (o.status === 'pending') pendingCount++;
      if (o.status === 'cancelled') cancelledCount++;
    });

    const statsText = 
`📊 *CinePay Business Performance Summary:*

💰 *Total Verified Revenue:* ₹${totalRevenue.toLocaleString()}
👥 *Total Registered Customers:* ${(customers || []).length}
🎬 *Active Movies:* ${(movies || []).filter(m => m.is_active).length} / ${(movies || []).length} Total

📦 *Order Breakdown:*
• ✅ Delivered: ${deliveredCount}
• ⏳ Pending Verification: ${pendingCount}
• ❌ Cancelled: ${cancelledCount}
• 📊 Total Orders: ${(orders || []).length}`;

    await ctx.replyWithMarkdown(statsText, Markup.inlineKeyboard([
      [Markup.button.callback('🔙 Admin Panel', 'admin_dashboard')]
    ]));
  });

  // --------------------------------------------------------------------------
  // INCOMING MESSAGE & MEDIA HANDLER (Video uploads & text replies)
  // --------------------------------------------------------------------------
  bot.on(['message', 'video', 'document', 'photo'], async (ctx) => {
    const senderId = ctx.from?.id;

    // 1. Check if Admin is in the middle of an action
    if (isAdmin(ctx) && adminSessions.has(senderId)) {
      const session = adminSessions.get(senderId);

      // Step A: Admin adds movie with Link: Title | Price | Movie Link | Description
      if (session.action === 'awaiting_movie_link_details' && ctx.message.text) {
        const parts = ctx.message.text.split('|').map(s => s.trim());
        if (parts.length < 3) {
          return ctx.reply('⚠️ Invalid format. Please use:\n`Title | Price | Movie Link | Description`');
        }

        const title = parts[0];
        const price = parseFloat(parts[1]);
        const movieLink = parts[2];
        const description = parts[3] || 'Full HD Movie';

        if (isNaN(price) || price < 0) {
          return ctx.reply('⚠️ Invalid price! Please enter a valid number (e.g., 49 or 99).');
        }

        if (!movieLink) {
          return ctx.reply('⚠️ Movie link is required.');
        }

        if (!supabase) {
          return ctx.reply('❌ Supabase database is not connected.');
        }

        try {
          const insertData = {
            title,
            price,
            description,
            telegram_file_id: movieLink,
            file_type: 'link',
            is_active: true
          };

          let { data, error } = await supabase
            .from('movies')
            .insert({ ...insertData, movie_link: movieLink })
            .select()
            .single();

          if (error && error.message && error.message.includes('movie_link')) {
            const retry = await supabase
              .from('movies')
              .insert(insertData)
              .select()
              .single();
            data = retry.data;
            error = retry.error;
          }

          if (error) throw error;

          adminSessions.delete(senderId);

          return ctx.replyWithMarkdown(
`🎉 *Movie Added Successfully!*

🎬 *Title:* ${data.title}
💰 *Price:* ₹${data.price}
🔗 *Link:* ${movieLink}
📝 *Description:* ${data.description}
🟢 *Status:* Active for all customers!

Customers will now receive this link automatically after payment verification!`,
            Markup.inlineKeyboard([
              [Markup.button.callback('🎞️ Manage Movies', 'adm_manage_movies')],
              [Markup.button.callback('⚡ Admin Panel', 'admin_dashboard')]
            ])
          );
        } catch (dbErr) {
          console.error('Error saving movie to Supabase:', dbErr);
          return ctx.reply(`❌ Failed to save movie to database: ${dbErr.message}`);
        }
      }

      // Step C: Admin updates UPI settings
      if (session.action === 'awaiting_upi_update' && ctx.message.text) {
        const parts = ctx.message.text.split('|').map(s => s.trim());
        if (parts.length < 2) {
          return ctx.reply('⚠️ Invalid format. Format must be: `UPI_ID | Receiver Name`');
        }

        const newUpiId = parts[0];
        const newUpiName = parts[1];

        await setBotSetting('upi_id', newUpiId, 'Admin UPI ID');
        await setBotSetting('upi_name', newUpiName, 'Admin Receiver Name');
        adminSessions.delete(senderId);

        return ctx.replyWithMarkdown(
`✅ *UPI Details Updated Successfully!*

• *UPI ID:* \`${newUpiId}\`
• *Receiver Name:* \`${newUpiName}\`

All new orders will now generate QR codes with these payment details.`,
          Markup.inlineKeyboard([[Markup.button.callback('🔙 Admin Panel', 'admin_dashboard')]])
        );
      }
    }

    // 2. Check if Customer is submitting UTR or screenshot
    if (customerSessions.has(senderId)) {
      const session = customerSessions.get(senderId);

      if (session.action === 'waiting_for_utr') {
        const orderCode = session.orderCode;
        let proofText = '';

        if (ctx.message.text) {
          proofText = `UTR/Text: ${ctx.message.text}`;
        } else if (ctx.message.photo) {
          proofText = `Screenshot sent (Photo File ID: ${ctx.message.photo[ctx.message.photo.length - 1].file_id})`;
        } else {
          proofText = 'Payment proof submitted';
        }

        // Update order in Supabase
        if (supabase) {
          await supabase
            .from('orders')
            .update({ customer_notes: proofText })
            .eq('order_code', orderCode);
        }

        customerSessions.delete(senderId);

        await ctx.replyWithMarkdown(
`✅ *Thank You! Payment Proof Received.*

Order: \`${orderCode}\`
Proof: _${proofText}_

Our admin is verifying your payment. Once confirmed, your movie will be sent directly to this chat! 🍿`
        );

        // Notify Admin with quick verification button
        if (ADMIN_TELEGRAM_ID) {
          try {
            const adminAlert = 
`🔔 *Payment Proof Submitted!*

Order: \`${orderCode}\`
Customer: ${ctx.from.first_name || 'User'} (@${ctx.from.username || 'none'}, ID: \`${ctx.from.id}\`)
Proof Details: *${proofText}*

Please check your bank/UPI app and verify:`;

            await bot.telegram.sendMessage(ADMIN_TELEGRAM_ID, adminAlert, {
              parse_mode: 'Markdown',
              ...Markup.inlineKeyboard([
                [Markup.button.callback('✅ Verify & Send Movie', `adm_verify_${orderCode}`)],
                [Markup.button.callback('❌ Reject Payment', `adm_cancel_${orderCode}`)]
              ])
            });
          } catch (e) {
            console.error('Failed to send admin payment alert:', e.message);
          }
        }
      }
    }
  });
}

// ----------------------------------------------------------------------------
// UI RENDER HELPERS (TELEGRAM BOT)
// ----------------------------------------------------------------------------
async function renderMoviesList(ctx) {
  const movies = await getActiveMovies();

  if (!movies || movies.length === 0) {
    return ctx.reply('🎬 No movies are available right now. Please check back later!',
      Markup.inlineKeyboard([[Markup.button.callback('🔙 Main Menu', 'back_to_main')]])
    );
  }

  await ctx.reply(`🎬 *Available Movies (${movies.length})*\nSelect any movie to view details and buy:`, { parse_mode: 'Markdown' });

  for (const movie of movies) {
    const cardText = 
`🍿 *${movie.title}*
💰 *Price:* ₹${movie.price}
📝 ${movie.description || 'Full HD Movie'}
🔗 *Access:* Direct Watch / Download Link`;

    await ctx.replyWithMarkdown(cardText, Markup.inlineKeyboard([
      [Markup.button.callback(`💳 Buy Now (₹${movie.price})`, `buy_${movie.id}`)]
    ]));
  }
}

async function renderAdminDashboard(ctx) {
  const upiId = await getBotSetting('upi_id', DEFAULT_UPI_ID);
  const upiName = await getBotSetting('upi_name', DEFAULT_UPI_NAME);

  const adminMenu = 
`⚡ *CinePay Admin Control Panel*

Manage movies, verify customer UPI payments, and configure your bot.
Current UPI: \`${upiId}\` (${upiName})`;

  const buttons = [
    [Markup.button.callback('➕ Upload / Add Movie', 'adm_add_movie'), Markup.button.callback('🎞️ Manage Movies', 'adm_manage_movies')],
    [Markup.button.callback('⏳ Pending Orders', 'adm_pending_orders'), Markup.button.callback('📊 Revenue & Stats', 'adm_stats')],
    [Markup.button.callback('⚙️ UPI Settings', 'adm_upi_settings'), Markup.button.callback('🔙 Main Menu', 'back_to_main')]
  ];

  await ctx.replyWithMarkdown(adminMenu, Markup.inlineKeyboard(buttons));
}

// ============================================================================
// 5. EXPRESS HTTP SERVER (RENDER COMPLIANT WITH / AND /health)
// ============================================================================
const app = express();
app.use(express.json());

// Root endpoint: Status dashboard
app.get('/', (req, res) => {
  res.type('html').send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>CinePay Telegram Bot Service</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0b0f19; color: #f3f4f6; padding: 40px 20px; line-height: 1.6; }
        .card { max-width: 640px; margin: 0 auto; background: #111827; border: 1px solid #1f2937; border-radius: 12px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { margin-top: 0; color: #f59e0b; display: flex; align-items: center; gap: 10px; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 6px; font-size: 13px; font-weight: 600; }
        .badge-green { background: #065f46; color: #34d399; }
        .badge-amber { background: #78350f; color: #fbbf24; }
        .kv { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #1f2937; font-size: 14px; }
        .kv span:first-child { color: #9ca3af; }
        code { background: #1f2937; padding: 2px 6px; border-radius: 4px; font-family: monospace; color: #60a5fa; }
        .guide { margin-top: 24px; padding-top: 20px; border-top: 1px solid #374151; font-size: 13px; color: #9ca3af; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>🎬 CinePay Bot Service</h1>
        <p>Production-ready Paid Movie Telegram Bot backend running smoothly on Render.</p>
        
        <div class="kv">
          <span>Server Status</span>
          <span class="badge badge-green">RUNNING</span>
        </div>
        <div class="kv">
          <span>Telegram Polling</span>
          <span class="badge ${isPollingActive ? 'badge-green' : 'badge-amber'}">${isPollingActive ? 'ACTIVE' : 'IDLE / NOT CONFIGURED'}</span>
        </div>
        <div class="kv">
          <span>Supabase Database</span>
          <span class="badge ${supabase ? 'badge-green' : 'badge-amber'}">${supabase ? 'CONNECTED' : 'KEY MISSING'}</span>
        </div>
        <div class="kv">
          <span>Uptime</span>
          <span>${Math.floor(process.uptime())} seconds</span>
        </div>
        <div class="kv">
          <span>Port</span>
          <code>${PORT}</code>
        </div>
        <div class="kv">
          <span>Health Endpoint</span>
          <code><a href="/health" style="color:#60a5fa;text-decoration:none;">/health</a></code>
        </div>

        <div class="guide">
          <strong>Quick Setup Checklist:</strong><br>
          1. Run <code>schema.sql</code> in your Supabase SQL Editor.<br>
          2. Set <code>TELEGRAM_BOT_TOKEN</code>, <code>ADMIN_TELEGRAM_ID</code>, <code>SUPABASE_URL</code>, and <code>SUPABASE_SERVICE_ROLE_KEY</code> in Render Environment Variables.<br>
          3. Open your bot on Telegram and send <code>/start</code>.
        </div>
      </div>
    </body>
    </html>
  `);
});

// Health check endpoint for Render monitoring
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      botPolling: isPollingActive,
      telegramTokenConfigured: Boolean(TELEGRAM_BOT_TOKEN),
      adminConfigured: Boolean(ADMIN_TELEGRAM_ID),
      supabaseConfigured: Boolean(supabase)
    }
  });
});

// JSON API endpoint to check movies count
app.get('/api/movies', async (req, res) => {
  try {
    const movies = await getActiveMovies();
    res.json({ success: true, count: movies.length, movies });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// 6. SINGLE POLLING RUNNER WITH 409 CONFLICT HANDLING
// ============================================================================
async function startBotPolling() {
  if (!bot) {
    console.warn('⚠️ Bot not started: TELEGRAM_BOT_TOKEN is not set.');
    return;
  }

  if (isPollingActive) {
    console.log('ℹ️ Bot polling is already active.');
    return;
  }

  try {
    // Crucial step: Delete any existing webhook before starting long-polling.
    // This prevents the common Telegram 409 Conflict error.
    console.log('🔄 Cleaning up any existing Telegram webhooks before polling...');
    await bot.telegram.deleteWebhook({ drop_pending_updates: false });

    // Launch bot
    await bot.launch({
      dropPendingUpdates: false,
      allowedUpdates: ['message', 'callback_query']
    });

    isPollingActive = true;
    console.log('🚀 CinePay Telegram Bot is successfully POLLING for updates!');
    console.log(`🤖 Send /start to your bot to test it.`);

    if (ADMIN_TELEGRAM_ID) {
      bot.telegram.sendMessage(
        ADMIN_TELEGRAM_ID,
        `🚀 *CinePay Bot Started!*\n\nServer has rebooted and is listening for orders on Render.\nSend /admin for dashboard.`,
        { parse_mode: 'Markdown' }
      ).catch(() => {});
    }

  } catch (err) {
    isPollingActive = false;
    const errMsg = err?.message || '';

    // Handle Telegram 409 Conflict specifically
    if (errMsg.includes('409') || errMsg.includes('Conflict')) {
      console.error('❌ TELEGRAM 409 CONFLICT DETECTED:');
      console.error('Another instance of this bot is already running or a previous polling session did not terminate.');
      console.error('Waiting 10 seconds before attempting to reconnect polling...');
      setTimeout(() => {
        startBotPolling();
      }, 10000);
    } else {
      console.error('❌ Failed to launch Telegram Bot:', errMsg);
    }
  }
}

// ============================================================================
// 7. START HTTP SERVER & TELEGRAF RUNNER
// ============================================================================
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Web server running on http://0.0.0.0:${PORT}`);
  // Start bot polling after server binds
  startBotPolling();
});

// ============================================================================
// 8. GRACEFUL SHUTDOWN (SIGINT / SIGTERM)
// ============================================================================
const shutdown = (signal) => {
  console.log(`\n🛑 Received ${signal}. Shutting down CinePay cleanly...`);
  if (bot && isPollingActive) {
    console.log('Stopping Telegram polling...');
    bot.stop(signal);
    isPollingActive = false;
  }
  server.close(() => {
    console.log('HTTP Server closed. Process terminating safely.');
    process.exit(0);
  });
};

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));

export default app;
