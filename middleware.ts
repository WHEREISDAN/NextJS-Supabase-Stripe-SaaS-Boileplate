import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Validate environment variables
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase environment variables');
    return NextResponse.redirect(new URL('/error?message=Server%20configuration%20error', req.url));
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          res.cookies.set({
            name,
            value,
            ...options,
          });
        },
        remove(name: string, options: CookieOptions) {
          res.cookies.delete({
            name,
            ...options,
          });
        },
      },
    }
  );

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Protected routes that require authentication
  const protectedRoutes = ['/dashboard'];
  const isProtectedRoute = protectedRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // Auth pages (login/register) should redirect to dashboard if user is already logged in
  const authRoutes = ['/login', '/register'];
  const isAuthRoute = authRoutes.includes(req.nextUrl.pathname);

  // Subscription required routes
  const subscriptionRequiredRoutes = ['/dashboard/premium'];
  const isSubscriptionRequiredRoute = subscriptionRequiredRoutes.some(route => 
    req.nextUrl.pathname.startsWith(route)
  );

  // Handle authentication checks
  if (!session && isProtectedRoute) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  if (session && isAuthRoute) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Check subscription status for premium routes
  if (session && isSubscriptionRequiredRoute) {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('subscription_status')
        .eq('id', session.user.id)
        .single();

      if (error) throw error;

      if (!profile || profile.subscription_status !== 'active') {
        return NextResponse.redirect(new URL('/pricing', req.url));
      }
    } catch (error) {
      console.error('Error checking subscription status:', error);
      // Continue anyway to avoid blocking access completely on error
    }
  }

  return res;
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/login',
    '/register',
    '/auth/callback',
    '/pricing',
  ],
};
