'use server';

import { createCustomerPortalSession } from '@/utils/stripe';
import { createServerSupabaseClient, getServerUser } from '@/utils/supabase-server';

/**
 * Server action to create a Stripe customer portal session
 */
export async function createStripePortalSession() {
  try {
    // Get authenticated user
    const user = await getServerUser();

    if (!user) {
      return { error: 'Unauthorized' };
    }

    // Get user's Stripe customer ID
    const supabase = await createServerSupabaseClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return { error: 'No associated Stripe customer found' };
    }

    // Create customer portal session
    const { url } = await createCustomerPortalSession(
      profile.stripe_customer_id,
      new URL('/dashboard', process.env.NEXT_PUBLIC_APP_URL!).toString()
    );

    return { url };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    return { error: 'Error creating customer portal session' };
  }
}
