'use server';

import { createServerSupabaseClient } from '@/utils/supabase-server';
import { generateCodeVerifier, generateCodeChallenge } from '@/utils/pkce';
import { cookies } from 'next/headers';
import { User, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';

/**
 * Server action to initiate OAuth sign-in with Google
 * Returns the URL to redirect to
 */
export async function signInWithGoogle(): Promise<{ error?: string; url?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Generate PKCE code verifier and challenge
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    // Validate environment variable
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return { error: 'Missing NEXT_PUBLIC_APP_URL environment variable' };
    }

    // Get the OAuth sign-in URL with PKCE
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${appUrl}/auth/callback`,
        queryParams: {
          code_challenge: codeChallenge,
          code_challenge_method: 'S256',
        },
        skipBrowserRedirect: true, // Let us handle the redirect
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    // Store the code verifier in a cookie with appropriate settings
    const cookieStore = await cookies();
    cookieStore.set('code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 10, // 10 minutes - increased to allow more time for the flow
    });

    // Return the URL to redirect to
    return { url: data.url };
  } catch (error) {
    console.error('OAuth sign-in error:', error);
    return { error: 'Failed to initiate authentication' };
  }
}

/**
 * Helper function to ensure a user profile exists
 */
async function ensureUserProfile(
  supabase: SupabaseClient<Database>, 
  user: User
): Promise<void> {
  // Check if profile exists
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  if (profileError && profileError.code !== 'PGRST116') {
    console.error('Profile check error:', profileError);
    throw profileError;
  }

  // If profile doesn't exist, create it
  if (!profile) {
    const { error: insertError } = await supabase
      .from('profiles')
      .insert([
        {
          id: user.id,
          email: user.email!,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
      ]);

    if (insertError) {
      console.error('Profile creation error:', insertError);
      throw insertError;
    }
  }
}

/**
 * Server action to handle OAuth callback
 * Returns the URL to redirect to
 */
export async function handleOAuthCallback(code: string): Promise<{ error?: string; url?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    const cookieStore = await cookies();
    
    // Get the code verifier from the cookie
    const codeVerifier = cookieStore.get('code_verifier')?.value;
    if (!codeVerifier) {
      console.error('No code verifier found in cookies');
      
      // If no code verifier is found, try to get the session directly
      // This is a fallback for when the cookie is lost but the user is still authenticated
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        // User is already authenticated, just redirect to dashboard
        console.log('User already has a valid session, redirecting to dashboard');
        return { url: '/dashboard' };
      }
      
      return { error: 'Authentication failed - session expired', url: '/login' };
    }

    try {
      // Exchange the authorization code for a session
      const { data: { session, user }, error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        console.error('Session exchange error:', error);
        
        // Check if user already has a session despite the error
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        if (existingSession) {
          console.log('User already has a valid session despite exchange error');
          return { url: '/dashboard' };
        }
        
        return { error: 'Authentication failed', url: '/login' };
      }
      
      if (!session || !user) {
        console.error('No session or user returned');
        return { error: 'Authentication failed - no session', url: '/login' };
      }
      
      // Continue with profile check and creation
      await ensureUserProfile(supabase, user);
      
      // Clean up the code verifier cookie
      cookieStore.delete('code_verifier');
      
      return { url: '/dashboard' };
    } catch (exchangeError) {
      console.error('Error exchanging code for session:', exchangeError);
      
      // Check if user already has a session despite the error
      const { data: { session: fallbackSession } } = await supabase.auth.getSession();
      if (fallbackSession) {
        console.log('User has a valid session despite exchange error');
        return { url: '/dashboard' };
      }
      
      return { error: 'Authentication failed', url: '/login' };
    }
  } catch (error) {
    console.error('OAuth callback error:', error);
    return { error: 'Authentication failed. Please try again.', url: '/login' };
  }
}

/**
 * Server action to sign out the user
 * Returns the URL to redirect to
 */
export async function signOut(): Promise<{ error?: string; url?: string }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Sign out on the server
    const { error } = await supabase.auth.signOut();
    if (error) throw error;

    // Return the URL to redirect to
    return { url: '/login' };
  } catch (error) {
    console.error('Sign out error:', error);
    return { error: 'Failed to sign out' };
  }
}
