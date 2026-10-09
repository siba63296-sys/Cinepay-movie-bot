export interface Movie {
  id: string;
  title: string;
  description: string;
  price: number;
  telegram_file_id: string;
  movie_link?: string;
  file_type?: string;
  file_size?: number;
  duration?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Order {
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

export interface BotSettings {
  upi_id: string;
  upi_name: string;
  support_handle: string;
  welcome_message: string;
}

export interface SystemStatus {
  env: {
    TELEGRAM_BOT_TOKEN_SET: boolean;
    ADMIN_TELEGRAM_ID_SET: boolean;
    ADMIN_TELEGRAM_ID: string | null;
    SUPABASE_URL_SET: boolean;
    SUPABASE_SERVICE_ROLE_KEY_SET: boolean;
    UPI_ID: string;
    UPI_NAME: string;
  };
  services: {
    supabaseConnected: boolean;
    supabaseError: string | null;
    isSimulationMode: boolean;
  };
}
