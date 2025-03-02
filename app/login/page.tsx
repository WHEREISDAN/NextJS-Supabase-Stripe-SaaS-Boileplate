'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { handleError } from '@/utils/error-handler';
import { signInWithGoogle } from '@/app/actions/auth';
import { signInWithPassword } from '@/app/actions/auth-client';

// Define validation schema
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginSchema = z.infer<typeof loginSchema>;

export default function Login() {
  const [formData, setFormData] = useState<LoginSchema>({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    [key: string]: string[];
  }>({});
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Get error from URL if present
  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const errorMessage = searchParams.get('error');
    if (errorMessage) {
      setError(decodeURIComponent(errorMessage));
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    
    // Clear validation error when user starts typing
    if (validationErrors[name]) {
      setValidationErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      // Call the server action to sign in
      const result = await signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (result.error) {
        if (result.fieldErrors) {
          setValidationErrors(result.fieldErrors);
        } else {
          setError(result.error);
        }
        return;
      }

      // Redirect to dashboard on success
      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      const appError = handleError(error);
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the server action
      const result = await signInWithGoogle();
      
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        // Client-side redirect to the OAuth provider
        window.location.href = result.url;
      }
    } catch (error) {
      const appError = handleError(error);
      setError(appError.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="max-w-md w-full px-6 py-8 bg-base-200 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-8 text-base-content">Welcome Back</h2>
        
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="label">
              <span className="label-text">Email</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`input input-bordered w-full ${
                validationErrors.email ? 'input-error' : ''
              }`}
              required
            />
            {validationErrors.email?.map((error, index) => (
              <label key={index} className="label">
                <span className="label-text-alt text-error">{error}</span>
              </label>
            ))}
          </div>

          <div>
            <label className="label">
              <span className="label-text">Password</span>
            </label>
            <input
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={`input input-bordered w-full ${
                validationErrors.password ? 'input-error' : ''
              }`}
              required
            />
            {validationErrors.password?.map((error, index) => (
              <label key={index} className="label">
                <span className="label-text-alt text-error">{error}</span>
              </label>
            ))}
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full"
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Sign In'}
          </button>
        </form>

        <div className="divider text-base-content/70">OR</div>

        <button
          onClick={handleOAuthSignIn}
          className="btn btn-outline w-full"
          disabled={loading}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Sign in with Google
        </button>

        <div className="mt-6 text-center">
          <p className="text-sm text-base-content/70">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="link link-primary">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
