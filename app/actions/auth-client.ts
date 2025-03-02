'use server';

import { createServerSupabaseClient } from '@/utils/supabase-server';
import { z } from 'zod';
import { cookies } from 'next/headers';

// Define validation schemas
const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

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
});

/**
 * Server action to sign in with email and password
 */
export async function signInWithPassword(formData: { email: string; password: string }) {
  try {
    // Validate form data
    const validatedData = loginSchema.parse(formData);
    
    const supabase = await createServerSupabaseClient();
    
    const { data, error } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (error) {
      return { error: error.message };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors
      const fieldErrors = error.errors.reduce((acc: Record<string, string[]>, curr) => {
        const key = curr.path[0] as string;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr.message);
        return acc;
      }, {});
      
      return { error: 'Validation error', fieldErrors };
    }
    
    console.error('Sign in error:', error);
    return { error: 'Failed to sign in. Please try again.' };
  }
}

/**
 * Server action to register with email and password
 */
export async function registerWithPassword(formData: { email: string; password: string }) {
  try {
    // Validate form data
    const validatedData = registerSchema.parse(formData);
    
    const supabase = await createServerSupabaseClient();
    
    // Sign up the user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (authError) {
      return { error: authError.message };
    }

    if (!authData.user) {
      return { error: 'Registration failed. Please try again.' };
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
      return { error: 'Failed to create user profile. Please try again.' };
    }

    // Sign in the user immediately after registration
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: validatedData.email,
      password: validatedData.password,
    });

    if (signInError) {
      return { error: signInError.message };
    }

    return { success: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors
      const fieldErrors = error.errors.reduce((acc: Record<string, string[]>, curr) => {
        const key = curr.path[0] as string;
        if (!acc[key]) acc[key] = [];
        acc[key].push(curr.message);
        return acc;
      }, {});
      
      return { error: 'Validation error', fieldErrors };
    }
    
    console.error('Registration error:', error);
    return { error: 'Failed to register. Please try again.' };
  }
}

/**
 * Server action to get the current user profile
 */
export async function getCurrentProfile() {
  try {
    const supabase = await createServerSupabaseClient();
    
    // Get the current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError || !session) {
      return { profile: null };
    }
    
    // Get the user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    
    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return { profile: null };
    }
    
    return { profile };
  } catch (error) {
    console.error('Error getting profile:', error);
    return { profile: null };
  }
}
