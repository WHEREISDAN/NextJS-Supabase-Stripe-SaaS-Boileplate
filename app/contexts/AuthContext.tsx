'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { User, Session } from '@supabase/supabase-js';
import { Profile } from '@/types/supabase';
import { handleError, logError } from '@/utils/error-handler';
import { signOut as serverSignOut } from '@/app/actions/auth';
import { getCurrentProfile } from '@/app/actions/auth-client';
import { createBrowserClient } from '@supabase/ssr';

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
  const [state, setState] = useState<AuthState>(initialState);
  const router = useRouter();
  
  // Add a timeout to prevent infinite loading
  useEffect(() => {
    // If still loading after 8 seconds, force set isLoading to false
    const timeout = setTimeout(() => {
      if (state.isLoading) {
        console.log('Auth loading timeout reached, forcing state update');
        setState(prev => ({ ...prev, isLoading: false }));
      }
    }, 8000);
    
    return () => clearTimeout(timeout);
  }, [state.isLoading]);
  
  // Initialize Supabase client for auth state changes only
  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'pkce',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      },
    }
  );

  // Fetch user profile using server action
  const fetchProfile = async () => {
    try {
      const { profile } = await getCurrentProfile();
      
      if (profile) {
        setState(prev => ({ 
          ...prev, 
          profile,
          isLoading: false
        }));
      } else {
        setState(prev => ({ ...prev, isLoading: false }));
      }
    } catch (error) {
      const appError = handleError(error);
      logError(appError);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  // Refresh profile data
  const refreshProfile = async () => {
    await fetchProfile();
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
    let retryCount = 0;
    const maxRetries = 3;
    
    const initializeAuth = async () => {
      try {
        // Get initial session
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          // First update session and user, but keep isAuthenticated false until we have the profile
          setState(prev => ({
            ...prev,
            session,
            user: session.user,
            isLoading: true, // Keep loading while we fetch profile
          }));
          
          // Fetch profile using server action
          try {
            const { profile } = await getCurrentProfile();
            if (profile) {
              // Only set isAuthenticated once we have the profile
              setState(prev => ({
                ...prev,
                profile,
                isAuthenticated: true,
                isLoading: false,
              }));
            } else {
              console.error('No profile found during initialization');
              setState(prev => ({ ...prev, isLoading: false }));
            }
          } catch (profileError) {
            console.error('Error fetching profile:', profileError);
            setState(prev => ({ ...prev, isLoading: false }));
          }
        } else {
          setState(prev => ({ ...prev, isLoading: false }));
        }

        // Listen for auth changes
        const {
          data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
          console.log('Auth state change:', event);
          
          if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
            if (session) {
              // First update session and user, but keep isAuthenticated false until we have the profile
              setState(prev => ({
                ...prev,
                session,
                user: session.user,
                isLoading: true, // Keep loading while we fetch profile
              }));
              
              // Fetch profile using server action
              try {
                const { profile } = await getCurrentProfile();
                if (profile) {
                  // Only set isAuthenticated once we have the profile
                  setState(prev => ({
                    ...prev,
                    profile,
                    isAuthenticated: true,
                    isLoading: false,
                  }));
                } else {
                  console.error('No profile found after sign in');
                  setState(prev => ({ ...prev, isLoading: false }));
                }
              } catch (profileError) {
                console.error('Error fetching profile on auth change:', profileError);
                setState(prev => ({ ...prev, isLoading: false }));
              }
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
        
        // If we've reached max retries, give up
        if (retryCount >= maxRetries) {
          setState(prev => ({ ...prev, isLoading: false }));
        } else {
          // Otherwise, retry after a delay
          retryCount++;
          console.log(`Auth initialization error, retrying (${retryCount}/${maxRetries})...`);
          
          setTimeout(() => {
            initializeAuth();
          }, 1000); // Retry after 1 second
        }
      }
    };

    initializeAuth();
  }, [router]);

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
