import Stripe from 'stripe';
// Server-side Stripe instance
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-01-27.acacia', // Use the latest API version
  typescript: true,
});

// Types
export type PriceType = 'one_time' | 'recurring';

export interface CreateCheckoutParams {
  priceId: string;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  client_reference_id?: string;
  mode?: 'payment' | 'subscription';
}

// Helper functions
export async function createCheckoutSession({
  priceId,
  successUrl,
  cancelUrl,
  customerId,
  client_reference_id,
  mode = 'payment',
}: CreateCheckoutParams) {
  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer: customerId,
      client_reference_id,
      allow_promotion_codes: true,
      billing_address_collection: 'required',
    });

    return { sessionId: session.id };
  } catch (error) {
    console.error('Error creating checkout session:', error);
    throw error;
  }
}

export async function createCustomerPortalSession(customerId: string, returnUrl: string) {
  try {
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    });

    return { url: portalSession.url };
  } catch (error) {
    console.error('Error creating customer portal session:', error);
    throw error;
  }
}

export async function getCustomerSubscriptions(customerId: string) {
  try {
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: 'active',
      expand: ['data.default_payment_method'],
    });

    return subscriptions.data;
  } catch (error) {
    console.error('Error fetching customer subscriptions:', error);
    throw error;
  }
}

export async function cancelSubscription(subscriptionId: string) {
  try {
    const canceledSubscription = await stripe.subscriptions.cancel(subscriptionId);
    return canceledSubscription;
  } catch (error) {
    console.error('Error canceling subscription:', error);
    throw error;
  }
}

// Webhook helper function to verify Stripe signatures
export const verifyStripeWebhookSignature = (
  payload: string | Buffer,
  header: string | null,
) => {
  try {
    if (!header) throw new Error('No signature header');
    
    // Use the CLI webhook secret when running locally with stripe listen
    const webhookSecret = process.env.NODE_ENV === 'development' 
      ? process.env.STRIPE_CLI_WEBHOOK_SECRET!
      : process.env.STRIPE_WEBHOOK_SECRET!;
    
    return stripe.webhooks.constructEvent(
      payload,
      header,
      webhookSecret
    );
  } catch (error) {
    console.error('Error verifying webhook signature:', error);
    throw error;
  }
};
