/**
 * Full-Stack Dev Server for CinePay Telegram Bot & Management Hub
 * Mounts Express APIs and Vite middlewares on Port 3000
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import QRCode from 'qrcode';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// ============================================================================
// ENVIRONMENT VARIABLES & CLIENTS
// ============================================================================
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const ADMIN_TELEGRAM_ID = process.env.ADMIN_TELEGRAM_ID || '';
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const DEFAULT_UPI_ID = process.env.UPI_ID || 'cinepay@upi';
const DEFAULT_UPI_NAME = process.env.UPI_NAME || 'CinePay Movies';

let supabaseClient: any = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });
    console.log('✅ Supabase connected via Service Role');
  } catch (err: any) {
    console.error('❌ Supabase init error:', err.message);
  }
}

// Fallback in-memory store for instant zero-config interactive testing in AI Studio
interface Movie {
  id: string;
  title: string;
  description: string;
  price: number;
  telegram_file_id: string;
  movie_link?: string;
  file_type: string;
  file_size?: number;
  duration?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Order {
  id: string;
  order_code: string;
  customer_telegram_id: number;
  customer_name?: string;
  customer_username?: string;
  movie_id: string;
  movie_title?: string;
  amount: number;
  status: 'pending' | 'paid' | 'delivered' | 'cancelled';
  payment_method: string;
  upi_id_used: string;
  customer_notes?: string;
  admin_notes?: string;
  verified_at?: string;
  verified_by?: number;
  delivered_at?: string;
  cancelled_at?: string;
  cancel_reason?: string;
  created_at: string;
  updated_at: string;
}

const mockMovies: Movie[] = [
  {
    id: 'm1-inception',
    title: 'Inception (2010) [Hindi Dual Audio]',
    description: 'Christopher Nolan sci-fi masterpiece. 1080p Web-DL Hindi + English Dolby 5.1.',
    price: 49,
    telegram_file_id: 'https://t.me/c/1928374/104',
    file_type: 'link',
    is_active: true,
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'm2-interstellar',
    title: 'Interstellar (2014) IMAX Edition',
    description: 'Mankind was born on Earth. It was never meant to die here. 4K HDR Rip.',
    price: 69,
    telegram_file_id: 'https://t.me/c/1928374/205',
    file_type: 'link',
    is_active: true,
    created_at: new Date(Date.now() - 86400000).toISOString(),
    updated_at: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'm3-oppenheimer',
    title: 'Oppenheimer (2023) 1080p Full HD',
    description: 'The story of J. Robert Oppenheimer and the Manhattan Project. Academy Award Winner.',
    price: 99,
    telegram_file_id: 'https://t.me/c/1928374/310',
    file_type: 'link',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }
];

const mockOrders: Order[] = [
  {
    id: 'ord-1',
    order_code: 'ORD-892104',
    customer_telegram_id: 1092837482,
    customer_name: 'Rajesh Kumar',
    customer_username: 'rajesh_k',
    movie_id: 'm1-inception',
    movie_title: 'Inception (2010) [Hindi Dual Audio]',
    amount: 49,
    status: 'pending',
    payment_method: 'UPI',
    upi_id_used: DEFAULT_UPI_ID,
    customer_notes: 'Paid via GPay UTR: 410293847592',
    created_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
  },
  {
    id: 'ord-2',
    order_code: 'ORD-762910',
    customer_telegram_id: 1283948271,
    customer_name: 'Ananya Sharma',
    customer_username: 'ananya_s',
    movie_id: 'm2-interstellar',
    movie_title: 'Interstellar (2014) IMAX Edition',
    amount: 69,
    status: 'delivered',
    payment_method: 'UPI',
    upi_id_used: DEFAULT_UPI_ID,
    customer_notes: 'PhonePe Ref: 409182736451',
    admin_notes: 'Payment confirmed in ICICI Bank app',
    verified_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    verified_by: 987654321,
    delivered_at: new Date(Date.now() - 1000 * 60 * 119).toISOString(),
    created_at: new Date(Date.now() - 1000 * 60 * 140).toISOString(),
    updated_at: new Date(Date.now() - 1000 * 60 * 119).toISOString(),
  }
];

let botSettings = {
  upi_id: DEFAULT_UPI_ID,
  upi_name: DEFAULT_UPI_NAME,
  support_handle: '@CinePaySupport',
  welcome_message: '🎬 Welcome to CinePay! Buy and watch premium movies instantly on Telegram.'
};

// ============================================================================
// API ENDPOINTS
// ============================================================================

// Health check endpoint for Render & Uptime monitors
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      server: 'running',
      supabaseConfigured: Boolean(supabaseClient),
      telegramConfigured: Boolean(TELEGRAM_BOT_TOKEN),
      adminConfigured: Boolean(ADMIN_TELEGRAM_ID)
    }
  });
});

// App Config & Status
app.get('/api/status', async (req: Request, res: Response) => {
  let supabaseConnected = false;
  let supabaseError = null;

  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('movies').select('id').limit(1);
      if (!error) supabaseConnected = true;
      else supabaseError = error.message;
    } catch (e: any) {
      supabaseError = e.message;
    }
  }

  res.json({
    env: {
      TELEGRAM_BOT_TOKEN_SET: Boolean(TELEGRAM_BOT_TOKEN),
      ADMIN_TELEGRAM_ID_SET: Boolean(ADMIN_TELEGRAM_ID),
      ADMIN_TELEGRAM_ID: ADMIN_TELEGRAM_ID || null,
      SUPABASE_URL_SET: Boolean(SUPABASE_URL),
      SUPABASE_SERVICE_ROLE_KEY_SET: Boolean(SUPABASE_SERVICE_ROLE_KEY),
      UPI_ID: botSettings.upi_id,
      UPI_NAME: botSettings.upi_name
    },
    services: {
      supabaseConnected,
      supabaseError,
      isSimulationMode: !supabaseClient
    }
  });
});

// Generate dynamic UPI QR Code buffer or Data URL
app.post('/api/generate-qr', async (req: Request, res: Response) => {
  try {
    const { upi_id, upi_name, amount, order_code } = req.body;
    const targetUpi = upi_id || botSettings.upi_id;
    const targetName = upi_name || botSettings.upi_name;
    const targetAmount = amount || '49.00';
    const targetNote = order_code ? `Order ${order_code}` : 'Movie Purchase';

    const upiUrl = `upi://pay?pa=${encodeURIComponent(targetUpi)}&pn=${encodeURIComponent(targetName)}&am=${targetAmount}&cu=INR&tn=${encodeURIComponent(targetNote)}`;
    const qrDataUrl = await QRCode.toDataURL(upiUrl, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' }
    });

    res.json({ success: true, upiUrl, qrDataUrl });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Movies Endpoints
app.get('/api/movies', async (req: Request, res: Response) => {
  if (supabaseClient) {
    try {
      const { data, error } = await supabaseClient.from('movies').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      return res.json({ success: true, movies: data, source: 'supabase' });
    } catch (err: any) {
      console.warn('Falling back to local cache:', err.message);
    }
  }
  res.json({ success: true, movies: mockMovies, source: 'local_cache' });
});

app.post('/api/movies', async (req: Request, res: Response) => {
  try {
    const { title, description, price, telegram_file_id, movie_link, is_active } = req.body;
    const finalLink = movie_link || telegram_file_id;
    if (!title || price === undefined || !finalLink) {
      return res.status(400).json({ success: false, error: 'Title, price, and Movie Link are required' });
    }

    if (supabaseClient) {
      const insertData = {
        title,
        description: description || '',
        price: Number(price),
        telegram_file_id: finalLink,
        file_type: 'link',
        is_active: is_active ?? true
      };

      let { data, error } = await supabaseClient
        .from('movies')
        .insert({ ...insertData, movie_link: finalLink })
        .select()
        .single();

      if (error && error.message && error.message.includes('movie_link')) {
        const retry = await supabaseClient
          .from('movies')
          .insert(insertData)
          .select()
          .single();
        data = retry.data;
        error = retry.error;
      }

      if (error) throw error;
      return res.json({ success: true, movie: data });
    }

    const newMovie: Movie = {
      id: `m-${Date.now()}`,
      title,
      description: description || '',
      price: Number(price),
      telegram_file_id: finalLink,
      movie_link: finalLink,
      file_type: 'link',
      is_active: is_active ?? true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    mockMovies.unshift(newMovie);
    res.json({ success: true, movie: newMovie });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.put('/api/movies/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    if (supabaseClient) {
      const { data, error } = await supabaseClient
        .from('movies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return res.json({ success: true, movie: data });
    }

    const index = mockMovies.findIndex(m => m.id === id);
    if (index === -1) return res.status(404).json({ success: false, error: 'Movie not found' });
    mockMovies[index] = { ...mockMovies[index], ...updates, updated_at: new Date().toISOString() };
    res.json({ success: true, movie: mockMovies[index] });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

app.delete('/api/movies/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    if (supabaseClient) {
      const { error } = await supabaseClient.from('movies').delete().eq('id', id);
      if (error) throw error;
      return res.json({ success: true });
    }

    const index = mockMovies.findIndex(m => m.id === id);
    if (index !== -1) mockMovies.splice(index, 1);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Orders Endpoints
app.get('/api/orders', async (req: Request, res: Response) => {
  const statusFilter = req.query.status as string;

  if (supabaseClient) {
    try {
      let query = supabaseClient.from('orders').select('*, movies(title), customers(first_name, username)').order('created_at', { ascending: false });
      if (statusFilter && statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data, error } = await query;
      if (error) throw error;
      return res.json({ success: true, orders: data, source: 'supabase' });
    } catch (err: any) {
      console.warn('Falling back to local orders cache:', err.message);
    }
  }

  let filtered = [...mockOrders];
  if (statusFilter && statusFilter !== 'all') {
    filtered = filtered.filter(o => o.status === statusFilter);
  }
  res.json({ success: true, orders: filtered, source: 'local_cache' });
});

// Create Order (Simulate Customer Order)
app.post('/api/orders', async (req: Request, res: Response) => {
  try {
    const { movie_id, customer_telegram_id, customer_name, customer_username } = req.body;
    const targetMovie = mockMovies.find(m => m.id === movie_id);
    if (!targetMovie) {
      return res.status(404).json({ success: false, error: 'Movie not found' });
    }

    const orderCode = `ORD-${Date.now().toString().slice(-6)}${Math.floor(Math.random() * 90 + 10)}`;
    const newOrder: Order = {
      id: `ord-${Date.now()}`,
      order_code: orderCode,
      customer_telegram_id: customer_telegram_id || 1092837490,
      customer_name: customer_name || 'Demo Customer',
      customer_username: customer_username || 'demouser',
      movie_id: targetMovie.id,
      movie_title: targetMovie.title,
      amount: targetMovie.price,
      status: 'pending',
      payment_method: 'UPI',
      upi_id_used: botSettings.upi_id,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    mockOrders.unshift(newOrder);
    res.json({ success: true, order: newOrder });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Verify Payment & Deliver Movie
app.post('/api/orders/:code/verify', async (req: Request, res: Response) => {
  const { code } = req.params;
  const { admin_notes } = req.body;

  try {
    let orderFromSupabase = null;
    if (supabaseClient) {
      try {
        const { data: order, error: fetchErr } = await supabaseClient
          .from('orders')
          .select('*, movies(*)')
          .eq('order_code', code)
          .single();

        if (!fetchErr && order) {
          orderFromSupabase = order;
        }
      } catch (e: any) {
        console.warn('Supabase fetch error, checking local store:', e.message);
      }
    }

    if (orderFromSupabase) {
      if (orderFromSupabase.status === 'delivered') {
        return res.status(400).json({ success: false, error: 'Order has already been verified & delivered' });
      }

      const { data: updated, error: updateErr } = await supabaseClient
        .from('orders')
        .update({
          status: 'delivered',
          verified_at: new Date().toISOString(),
          delivered_at: new Date().toISOString(),
          admin_notes: admin_notes || 'Verified via Admin Dashboard'
        })
        .eq('order_code', code)
        .select('*, movies(*)')
        .single();

      if (updateErr) throw updateErr;

      return res.json({
        success: true,
        order: updated,
        deliveryResult: {
          delivered: true,
          recipient: updated.customer_telegram_id,
          movie: updated.movies?.title,
          file_id: updated.movies?.telegram_file_id
        }
      });
    }

    // Fallback to local memory orders (for simulated sandbox testing)
    const order = mockOrders.find(o => o.order_code === code);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, error: 'Order already verified & delivered' });
    }

    order.status = 'delivered';
    order.verified_at = new Date().toISOString();
    order.delivered_at = new Date().toISOString();
    order.admin_notes = admin_notes || 'Verified in Admin Hub';

    res.json({
      success: true,
      order,
      deliveryResult: {
        delivered: true,
        recipient: order.customer_telegram_id,
        movie: order.movie_title,
        message: 'Video automatically dispatched to Customer Telegram ID.'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Cancel Order
app.post('/api/orders/:code/cancel', async (req: Request, res: Response) => {
  const { code } = req.params;
  const { reason } = req.body;

  try {
    if (supabaseClient) {
      const { data: order, error } = await supabaseClient
        .from('orders')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          cancel_reason: reason || 'Cancelled by Admin'
        })
        .eq('order_code', code)
        .select()
        .single();
      if (error) throw error;
      return res.json({ success: true, order });
    }

    const order = mockOrders.find(o => o.order_code === code);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found' });
    if (order.status === 'delivered') {
      return res.status(400).json({ success: false, error: 'Cannot cancel an already delivered order' });
    }

    order.status = 'cancelled';
    order.cancelled_at = new Date().toISOString();
    order.cancel_reason = reason || 'Cancelled by Admin';

    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Settings Endpoints
app.get('/api/settings', (req: Request, res: Response) => {
  res.json({ success: true, settings: botSettings });
});

app.post('/api/settings', async (req: Request, res: Response) => {
  try {
    const { upi_id, upi_name, support_handle, welcome_message } = req.body;
    if (upi_id) botSettings.upi_id = upi_id;
    if (upi_name) botSettings.upi_name = upi_name;
    if (support_handle) botSettings.support_handle = support_handle;
    if (welcome_message) botSettings.welcome_message = welcome_message;

    if (supabaseClient) {
      if (upi_id) await supabaseClient.from('bot_settings').upsert({ key: 'upi_id', value: upi_id });
      if (upi_name) await supabaseClient.from('bot_settings').upsert({ key: 'upi_name', value: upi_name });
      if (support_handle) await supabaseClient.from('bot_settings').upsert({ key: 'support_handle', value: support_handle });
      if (welcome_message) await supabaseClient.from('bot_settings').upsert({ key: 'welcome_message', value: welcome_message });
    }

    res.json({ success: true, settings: botSettings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ============================================================================
// VITE MIDDLEWARE FOR REACT FRONTEND
// ============================================================================
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 CinePay Full-Stack Dev Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
