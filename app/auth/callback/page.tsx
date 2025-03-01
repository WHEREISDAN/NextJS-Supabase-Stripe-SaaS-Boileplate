'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/utils/supabase';
import { getStoredCodeVerifier, clearCodeVerifier } from '@/utils/pkce';
import { handleError, logError } from '@/utils/error-handler';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleRedirect = async () => {
      try {
        // Get URL parameters including hash if present
        const url = new URL(window.location.href);
        const params = Object.fromEntries(url.searchParams.entries());
        const hashParams = window.location.hash
          ? Object.fromEntries(
              new URLSearchParams(
                window.location.hash.substring(1) // Remove the # character
              ).entries()
            )
          : null;

        // Get the code verifier stored during the sign-in process
        const codeVerifier = getStoredCodeVerifier();
        
        // For PKCE OAuth flow, we need both the code from URL and the code verifier
        if (params.code && codeVerifier) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(params.code, {
            codeVerifier,
          });
          
          if (error) throw error;
          
          // Clean up the stored code verifier
          clearCodeVerifier();
        } else if (hashParams?.access_token) {
          // Legacy flow or magic link - set the session with the hash parameters
          const { error } = await supabase.auth.setSession({
            access_token: hashParams.access_token,
            refresh_token: hashParams.refresh_token,
          });
          
          if (error) throw error;
        }

        // Get the user after setting the session
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (user) {
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
        }

        // Redirect to dashboard after successful authentication and profile creation
        router.push('/dashboard');
      } catch (error) {
        const appError = handleError(error);
        logError(appError);
        router.push(`/login?error=${encodeURIComponent(appError.message)}`);
      }
    };

    handleRedirect();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="loading loading-spinner loading-lg mb-4"></div>
        <p className="text-base-content/70">Completing authentication...</p>
      </div>
    </div>
  );
}
