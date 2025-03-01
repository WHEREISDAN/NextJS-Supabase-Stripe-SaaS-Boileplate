'use client';

import { handleOAuthCallback } from '@/app/actions/auth';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    async function handleCallback() {
      const code = searchParams.get('code');
      const error = searchParams.get('error');
      const error_description = searchParams.get('error_description');

      // Handle OAuth errors
      if (error) {
        console.error('OAuth error:', error, error_description);
        router.push(`/login?error=${encodeURIComponent(error_description?.toString() || 'Authentication failed')}`);
        return;
      }

      // Validate authorization code
      if (!code) {
        console.error('No code provided in OAuth callback');
        router.push('/login?error=Missing authorization code');
        return;
      }

      // Handle the callback with our server action
      const result = await handleOAuthCallback(code);
      
      if (result.error) {
        router.push(`/login?error=${encodeURIComponent(result.error)}`);
      } else if (result.url) {
        router.push(result.url);
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="loading loading-spinner loading-lg"></div>
    </div>
  );
}
