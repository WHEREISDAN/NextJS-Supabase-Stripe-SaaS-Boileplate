'use server';

import { createServerSupabaseClient, getServerUser } from '@/utils/supabase-server';
import { getOrCreateStripeCustomerServer } from '@/utils/stripe-helpers-server';
import { createCheckoutSession } from '@/utils/stripe';

/**
 * Server action to create a Stripe checkout session
 */
export async function createStripeCheckout(priceId: string, mode: 'payment' | 'subscription' = 'payment') {
  try {
    // Get the current user
    const user = await getServerUser();
    
    if (!user) {
      return { error: 'You must be logged in to make a purchase' };
    }

    // Get or create Stripe customer
    const customerId = await getOrCreateStripeCustomerServer(
      user.id,
      user.email!
    );

    // Validate environment variable
    const appUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (!appUrl) {
      return { error: 'Missing NEXT_PUBLIC_APP_URL environment variable' };
    }

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      priceId,
      mode,
      customerId,
      client_reference_id: user.id,
      successUrl: new URL('/dashboard?session_id={CHECKOUT_SESSION_ID}', appUrl).toString(),
      cancelUrl: new URL('/pricing', appUrl).toString(),
    });

    if (!checkoutSession?.sessionId) {
      console.error('No session ID in checkout response:', checkoutSession);
      return { error: 'Failed to create checkout session' };
    }

    return { sessionId: checkoutSession.sessionId };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    return { error: 'Failed to create checkout session' };
  }
}

/**
 * Server action to get the current user's subscription status
 */
export async function getUserSubscription() {
  try {
    // Get the current user
    const user = await getServerUser();
    
    if (!user) {
      return { subscription: null };
    }

    // Get the user's subscription from the database
    const supabase = await createServerSupabaseClient();
    const { data: subscription, error } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching subscription:', error);
      return { error: 'Failed to fetch subscription status' };
    }

    return { subscription };
  } catch (error) {
    console.error('Error getting subscription:', error);
    return { error: 'Failed to get subscription status' };
  }
}
