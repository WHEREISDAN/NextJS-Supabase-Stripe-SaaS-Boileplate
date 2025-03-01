'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserSupabaseClient } from '@/utils/supabase';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';
import { handleError, logError } from '@/utils/error-handler';
import { signOut as serverSignOut } from '@/app/actions/auth';

interface AuthState {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextType extends AuthState {
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const initialState: AuthState = {
  user: null,
  profile: null,
  session: null,
  isLoading: true,
  isAuthenticated: false,
};

const AuthContext = createContext<AuthContextType>({
  ...initialState,
  signOut: async () => {},
  refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const supabase = createBrowserSupabaseClient();
  const [state, setState] = useState<AuthState>(initialState);
  const router = useRouter();

  // Fetch user profile
  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      setState(prev => ({ 
        ...prev, 
        profile: data as Profile,
        isLoading: false
      }));
    } catch (error) {
      const appError = handleError(error);
      logError(appError);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Ensure a profile exists for the user
  const ensureProfile = async (user: User) => {
    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // If profile doesn't exist, create it
      if (!existingProfile) {
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

      // Fetch the complete profile after ensuring it exists
      await fetchProfile(user.id);
    } catch (error) {
      const appError = handleError(error);
      logError(appError);
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    if (state.user) {
      await fetchProfile(state.user.id);
    }
  };

  // Handle sign out
  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      // Call the server action to sign out
      const result = await serverSignOut();
      
      if (result.error) {
        throw new Error(result.error);
      }

      // Clear client-side state
      setState({
        ...initialState,
        isLoading: false,
      });

      // Redirect to login page
      if (result.url) {
        router.push(result.url);
      }
    } catch (error) {
      const appError = handleError(error);
      logError(appError);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Initialize auth state and set up listeners
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setState(prev => ({
            ...prev,
            session,
            user: session.user,
            isAuthenticated: true,
          }));
          
          await ensureProfile(session.user);
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) {
              setState(prev => ({
                ...prev,
                session,
                user: session.user,
                isAuthenticated: true,
              }));
              
              await ensureProfile(session.user);
            }
          } else if (event === 'SIGNED_OUT') {
            setState({
              ...initialState,
              isLoading: false,
            });
            router.push('/login');
          }
        });

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        const appError = handleError(error);
        logError(appError);
        setState(prev => ({ ...prev, isLoading: false }));
      }
    };

    initializeAuth();
  }, []);

  return (
    <AuthContext.Provider 
      value={{ 
        ...state, 
        signOut,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
