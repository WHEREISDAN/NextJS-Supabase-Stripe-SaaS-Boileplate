'use client';

import { handleOAuthCallback } from '@/app/actions/auth';
import { useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

export default function AuthCallback() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const processingRef = useRef(false);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 5;
    const minErrorRetry = 3; // Only show errors after this many retries
    
    async function handleCallback() {
      // Prevent double processing
      if (processingRef.current) return;
      processingRef.current = true;

      const code = searchParams.get('code');
      const errorParam = searchParams.get('error');
      const error_description = searchParams.get('error_description');

      // Handle OAuth errors silently unless we've hit minErrorRetry
      if (errorParam) {
        if (retryCount >= minErrorRetry) {
          console.error('OAuth error:', errorParam, error_description);
        }
        if (retryCount >= maxRetries) {
          router.push('/dashboard');
          return;
        }
        // Retry
        retryCount++;
        setTimeout(() => {
          processingRef.current = false;
          handleCallback();
        }, 2000);
        return;
      }

      // Validate authorization code silently unless we've hit minErrorRetry
      if (!code) {
        if (retryCount >= minErrorRetry) {
          console.error('No code provided in OAuth callback');
        }
        if (retryCount >= maxRetries) {
          router.push('/dashboard');
          return;
        }
        // Retry
        retryCount++;
        setTimeout(() => {
          processingRef.current = false;
          handleCallback();
        }, 2000);
        return;
      }

      try {
        // Handle the callback with our server action
        const result = await handleOAuthCallback(code);
        
        if (result.error) {
          // Only log error if we've hit minErrorRetry
          if (retryCount >= minErrorRetry) {
            console.error('Error from handleOAuthCallback:', result.error);
          }
          
          // If we've reached max retries, redirect to dashboard
          if (retryCount >= maxRetries) {
            router.push('/dashboard');
          } else {
            // Otherwise, retry after a delay
            retryCount++;
            if (retryCount >= minErrorRetry) {
              console.log(`Authentication retry ${retryCount}/${maxRetries}...`);
            }
            
            setTimeout(() => {
              processingRef.current = false;
              handleCallback();
            }, 2000);
          }
        } else if (result.url) {
          router.push(result.url);
        }
      } catch (error) {
        // Only log error if we've hit minErrorRetry
        if (retryCount >= minErrorRetry) {
          console.error('Error in OAuth callback:', error);
        }
        
        // If we've reached max retries, redirect to dashboard
        if (retryCount >= maxRetries) {
          router.push('/dashboard');
        } else {
          // Otherwise, retry after a delay
          retryCount++;
          if (retryCount >= minErrorRetry) {
            console.log(`Authentication retry ${retryCount}/${maxRetries}...`);
          }
          
          setTimeout(() => {
            processingRef.current = false;
            handleCallback();
          }, 2000);
        }
      }
    }

    handleCallback();
  }, [searchParams, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center">
      <div className="loading loading-spinner loading-lg"></div>
      <div className="mt-4 text-base-content/70 text-center">
        <div>Completing authentication...</div>
        <div className="text-sm mt-2 opacity-75">Performing security checks</div>
      </div>
    </div>
  );
}
