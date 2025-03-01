import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from '@/types/supabase';
import { ResponseCookie } from 'next/dist/compiled/@edge-runtime/cookies';

// Default cookie options for auth
const AUTH_COOKIE_OPTIONS: Partial<ResponseCookie> = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  path: '/',
};

export async function createServerSupabaseClient() {
  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }

  return createServerClient<Database>(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookies();
          const cookie = cookieStore.get(name);
          return cookie?.value ?? '';
        },
        async set(name: string, value: string, options: CookieOptions) {
          const cookieStore = await cookies();
          cookieStore.set({
            name,
            value,
            ...AUTH_COOKIE_OPTIONS,
            ...options,
          } as ResponseCookie);
        },
        async remove(name: string, options: CookieOptions) {
          const cookieStore = await cookies();
          cookieStore.delete(name);
        },
      },
      auth: {
        detectSessionInUrl: false,
        flowType: 'pkce',
        debug: process.env.NODE_ENV === 'development',
        autoRefreshToken: true,
        persistSession: true,
      },
    }
  );
}

/**
 * Get the current session from the server-side client
 * Useful in server components and API routes
 */
export async function getServerSession() {
  const supabase = await createServerSupabaseClient();
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  } catch (error) {
    console.error('Error getting session:', error);
    return null;
  }
}

/**
 * Get the current user from the server-side client
 * Useful in server components and API routes
 */
export async function getServerUser() {
  const session = await getServerSession();
  return session?.user ?? null;
}
