'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/utils/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { z } from 'zod';
import { handleError } from '@/utils/error-handler';
import { signInWithGoogle } from '@/app/actions/auth';

// Define validation schema
const registerSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z
    .string()
    .min(6, 'Password must be at least 6 characters')
    .max(72, 'Password must be less than 72 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number'
    ),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterSchema = z.infer<typeof registerSchema>;

export default function Register() {
  const [formData, setFormData] = useState<RegisterSchema>({
    email: '',
    password: '',
    confirmPassword: '',
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

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setValidationErrors({});

    try {
      // Validate form data
      const validatedData = registerSchema.parse(formData);

      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (authError) throw authError;

      if (!authData.user) {
        throw new Error('Registration failed. Please try again.');
      }

      // Create the profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            email: validatedData.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (profileError) {
        console.error('Profile creation error:', profileError);
        // If profile creation fails, clean up the auth user
        await supabase.auth.signOut();
        throw new Error('Failed to create user profile. Please try again.');
      }

      // Sign in the user immediately after registration
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: validatedData.email,
        password: validatedData.password,
      });

      if (signInError) throw signInError;

      router.push('/dashboard');
      router.refresh();
    } catch (error) {
      if (error instanceof z.ZodError) {
        // Handle validation errors
        const errors = error.errors.reduce((acc: { [key: string]: string[] }, curr) => {
          const key = curr.path[0] as string;
          if (!acc[key]) acc[key] = [];
          acc[key].push(curr.message);
          return acc;
        }, {});
        setValidationErrors(errors);
      } else if (error instanceof Error) {
        setError(error.message);
      } else {
        console.error('Registration error:', error);
        setError('An unexpected error occurred. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthSignIn = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Call the server action
      await signInWithGoogle();
    } catch (error) {
      const appError = handleError(error);
      setError(appError.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-base-100">
      <div className="max-w-md w-full px-6 py-8 bg-base-200 rounded-lg shadow-lg">
        <h2 className="text-3xl font-bold text-center mb-8 text-base-content">Create Account</h2>
        
        {error && (
          <div className="alert alert-error mb-4">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleRegister} className="space-y-4">
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

          <div>
            <label className="label">
              <span className="label-text">Confirm Password</span>
            </label>
            <input
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className={`input input-bordered w-full ${
                validationErrors.confirmPassword ? 'input-error' : ''
              }`}
              required
            />
            {validationErrors.confirmPassword?.map((error, index) => (
              <label key={index} className="label">
                <span className="label-text-alt text-error">{error}</span>
              </label>
            ))}
          </div>

          <div className="mt-2">
            <p className="text-sm text-base-content/70">
              Password must contain:
            </p>
            <ul className="list-disc list-inside mt-1 text-sm text-base-content/70">
              <li>At least 6 characters</li>
              <li>One uppercase letter</li>
              <li>One lowercase letter</li>
              <li>One number</li>
            </ul>
          </div>

          <button
            type="submit"
            className="btn btn-primary w-full mt-6"
            disabled={loading}
          >
            {loading ? <span className="loading loading-spinner" /> : 'Create Account'}
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
            Already have an account?{' '}
            <Link href="/login" className="link link-primary">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
