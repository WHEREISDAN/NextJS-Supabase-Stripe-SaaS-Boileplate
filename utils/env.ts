import { z } from 'zod';

// Define schema for environment variables
const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url('Invalid Supabase URL'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase anon key is required'),
  
  // App
  NEXT_PUBLIC_APP_URL: z.string().url('Invalid app URL'),
  
  // Stripe
  STRIPE_SECRET_KEY: z.string().optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
});

// Validate the environment variables
export function validateEnv() {
  try {
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Invalid environment variables:', result.error.format());
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error validating environment variables:', error);
    return false;
  }
}

// Get an environment variable with validation
export function getEnv<K extends keyof z.infer<typeof envSchema>>(
  key: K
): z.infer<typeof envSchema>[K] {
  const value = process.env[key] as z.infer<typeof envSchema>[K];
  
  if (value === undefined) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  
  return value;
}

// Initialize environment validation on app start
// This function should be called in the layout.tsx file
export function initEnv() {
  if (typeof window !== 'undefined') {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      const isValid = validateEnv();
      if (isValid) {
        console.log('✅ Environment validation passed');
      }
    }
  }
} 