'use server';

import { createServerSupabaseClient } from '@/utils/supabase-server';
import { generateCodeVerifier, generateCodeChallenge } from '@/utils/pkce';
import { cookies } from 'next/headers';

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
          access_type: 'offline',
          prompt: 'consent',
        },
        skipBrowserRedirect: true, // Let us handle the redirect
      },
    });

    if (error) throw error;
    if (!data.url) throw new Error('No OAuth URL returned');

    // Store the code verifier in the session
    const cookieStore = await cookies();
    cookieStore.set('code_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Return the URL to redirect to
    return { url: data.url };
  } catch (error) {
    console.error('OAuth sign-in error:', error);
    return { error: 'Failed to initiate authentication' };
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
    
    // Get the code verifier from the session
    const codeVerifier = cookieStore.get('code_verifier')?.value;
    if (!codeVerifier) {
      return { error: 'No code verifier found', url: '/login' };
    }

    // Exchange the authorization code for a session
    const { data: { session, user }, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) throw error;
    if (!session || !user) throw new Error('No session or user returned');

    // Clean up the code verifier
    cookieStore.delete('code_verifier');

    // Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      throw profileError;
    }

    // If profile doesn't exist, create it
    if (!profile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert([
          {
            id: user.id,
            email: user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (insertError) throw insertError;
    }

    // Return the URL to redirect to
    return { url: '/dashboard' };
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