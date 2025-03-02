'use client';

import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/supabase';
import { SupabaseClient } from '@supabase/supabase-js';

// Singleton pattern for browser client
let browserInstance: SupabaseClient<Database> | null = null;

export const createBrowserSupabaseClient = () => {
  if (browserInstance) return browserInstance;

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  browserInstance = createBrowserClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      flowType: 'pkce',
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
      debug: false, // Turn off debug messages
      storage: {
        getItem: (key) => {
          const cookie = document.cookie
            .split('; ')
            .find((row) => row.startsWith(`${key}=`));
          return cookie ? decodeURIComponent(cookie.split('=')[1]) : null;
        },
        setItem: (key, value) => {
          // Let the server handle setting cookies
        },
        removeItem: (key) => {
          // Let the server handle removing cookies
        },
      },
    },
  });
  
  return browserInstance;
};

// Initialize the client
export const supabase = createBrowserSupabaseClient();
