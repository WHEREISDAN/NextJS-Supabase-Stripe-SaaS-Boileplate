import { stripe } from './stripe';
import { createServerSupabaseClient, createServiceRoleClient } from './supabase-server';

export async function getOrCreateStripeCustomerServer(userId: string, email: string) {
  // Use service role client to bypass RLS for writing to profiles
  const serviceClient = createServiceRoleClient();
  // Use regular server client for reading (which respects RLS)
  const supabase = await createServerSupabaseClient();
  
  // Check if user already has a Stripe customer ID
  const { data: profile } = await supabase
    .from('profiles')
    .select('stripe_customer_id')
    .eq('id', userId)
    .single();

  if (profile?.stripe_customer_id) {
    return profile.stripe_customer_id;
  }

  // Create new Stripe customer
  const customer = await stripe.customers.create({
    email,
    metadata: {
      supabaseUUID: userId,
    },
  });

  // Update user profile with Stripe customer ID using service role client
  const { error: updateError } = await serviceClient
    .from('profiles')
    .update({ stripe_customer_id: customer.id })
    .eq('id', userId);

  if (updateError) {
    console.error('Error updating user profile with Stripe customer ID:', updateError);
    throw updateError;
  }

  return customer.id;
}

export async function getUserSubscriptionStatusServer(userId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data: subscription } = await supabase
    .from('user_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('status', 'active')
    .single();

  return subscription;
}

export async function getUserPurchasesServer(userId: string) {
  const supabase = await createServerSupabaseClient();
  
  const { data: purchases } = await supabase
    .from('user_purchases')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  return purchases;
}

/**
 * Create a subscription record in the database
 * This function uses the service role client to bypass RLS policies
 */
export async function createSubscriptionRecord(
  userId: string,
  customerId: string,
  subscriptionId: string,
  priceId: string,
  status: string,
  currentPeriodEnd: Date
) {
  const supabase = createServiceRoleClient();
  
  const { error } = await supabase
    .from('user_subscriptions')
    .upsert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      stripe_price_id: priceId,
      status,
      current_period_end: currentPeriodEnd,
    });

  if (error) {
    console.error('Error creating subscription record:', error);
    throw error;
  }
}

/**
 * Create a purchase record in the database
 * This function uses the service role client to bypass RLS policies
 */
export async function createPurchaseRecord(
  userId: string,
  customerId: string,
  checkoutSessionId: string,
  amountTotal: number,
  paymentStatus: string
) {
  const supabase = createServiceRoleClient();
  
  const { error } = await supabase
    .from('user_purchases')
    .insert({
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_checkout_session_id: checkoutSessionId,
      amount_total: amountTotal,
      payment_status: paymentStatus,
    });

  if (error) {
    console.error('Error creating purchase record:', error);
    throw error;
  }
}
