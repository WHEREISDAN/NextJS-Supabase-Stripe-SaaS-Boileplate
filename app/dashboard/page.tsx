'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import ThemeSwitcher from '../components/ThemeSwitcher';
import Calendar from '../components/Calendar';
import { getUserSubscription } from '@/app/actions/stripe';
import { createStripePortalSession } from '@/app/actions/stripe-portal';

interface Subscription {
  id: string;
  status: string;
  current_period_end: string;
  stripe_price_id: string;
}

export default function Dashboard() {
  const { profile, isLoading, signOut } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [managingSubscription, setManagingSubscription] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      try {
        const { subscription: subscriptionData, error } = await getUserSubscription();
        
        if (error) {
          console.error('Error fetching subscription:', error);
          return;
        }
        
        setSubscription(subscriptionData);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

    if (profile) {
      fetchSubscription();
    }
  }, [profile]);

  const handleManageSubscription = async () => {
    try {
      setManagingSubscription(true);
      
      // Use server action to create portal session
      const result = await createStripePortalSession();
      
      if (result.error) {
        throw new Error(result.error);
      }
      
      if (result.url) {
        window.location.href = result.url;
      } else {
        throw new Error('No portal URL returned');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setManagingSubscription(false);
    }
  };

  // Set a maximum loading time to prevent infinite spinner
  useEffect(() => {
    let loadingTimeout: NodeJS.Timeout;
    
    if (isLoading) {
      // If still loading after 5 seconds, force render the dashboard anyway
      loadingTimeout = setTimeout(() => {
        console.log('Loading timeout reached, forcing dashboard render');
        // This will cause a re-render without the profile data
        // The profile data will be loaded when it's available
      }, 5000);
    }
    
    return () => {
      if (loadingTimeout) clearTimeout(loadingTimeout);
    };
  }, [isLoading]);
  
  // Show loading spinner, but only for a reasonable amount of time
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-base-100">
        <span className="loading loading-spinner loading-lg text-base-content"></span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-base-100 flex">
      {/* Sidebar */}
      <aside className="w-16 bg-base-200 min-h-screen flex flex-col items-center py-4 gap-6">
        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Tz</div>
        <nav className="flex flex-col gap-4">
          <button className="btn btn-ghost btn-square text-base-content">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          <button className="btn btn-ghost btn-square text-base-content">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </button>
          <button className="btn btn-ghost btn-square text-base-content">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </button>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Dashboard</h1>
          <div className="flex items-center gap-4">
            <ThemeSwitcher />
            <div className="dropdown dropdown-end">
              <div tabIndex={0} role="button" className="btn btn-ghost btn-circle avatar placeholder">
                <div className="bg-gradient-to-r from-primary to-secondary text-primary-content rounded-full w-10">
                  <span className="text-xl">{profile?.email?.[0].toUpperCase()}</span>
                </div>
              </div>
              <ul tabIndex={0} className="mt-3 z-[1] p-2 shadow menu menu-sm dropdown-content bg-base-200 rounded-box w-52">
                <li>
                  <button onClick={signOut} className="text-error">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sign out
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </header>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Column - Project Overview */}
          <div className="lg:col-span-3 space-y-6">
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Project Overview</h2>
                <div className="card bg-base-100 shadow-xl">
                  <div className="card-body">
                    <div className="flex items-center gap-2">
                      <div className={`badge ${subscription?.status === 'active' ? 'badge-success' : 'badge-warning'} gap-1`}>
                        <span className="inline-block w-2 h-2 rounded-full bg-current"></span>
                        {subscription?.status || 'No active subscription'}
                      </div>
                    </div>
                    {subscription?.current_period_end && (
                      <p className="text-sm text-base-content/70">
                        Next Billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                      </p>
                    )}
                    <div className="card-actions justify-end mt-4">
                      {subscription?.status === 'active' ? (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={handleManageSubscription}
                          disabled={managingSubscription}
                        >
                          {managingSubscription ? (
                            <span className="loading loading-spinner loading-sm" />
                          ) : (
                            'Manage'
                          )}
                        </button>
                      ) : (
                        <a href="/pricing" className="btn btn-primary btn-sm">View Plans</a>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Status */}
            <div className="card bg-base-200">
              <div className="card-body">
                <h2 className="card-title mb-4 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Subscription Status</h2>
                <div className="flex justify-center">
                  <div className="w-48 h-48 relative">
                    <div className="w-full h-full rounded-full border-8 border-base-300"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                          {subscription?.status === 'active' ? 'Active' : 'Inactive'}
                        </div>
                        <div className="text-sm text-base-content/70">Subscription</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Calendar */}
          <div className="lg:col-span-1">
            <Calendar />
          </div>
        </div>
      </main>
    </div>
  );
}
