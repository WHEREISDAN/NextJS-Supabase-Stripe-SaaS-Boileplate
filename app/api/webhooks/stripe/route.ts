import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import { stripe, verifyStripeWebhookSignature } from '@/utils/stripe';
import { createServiceRoleClient } from '@/utils/supabase-server';
import { createSubscriptionRecord, createPurchaseRecord } from '@/utils/stripe-helpers-server';

export async function POST(req: Request) {
  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get('stripe-signature');

  try {
    // Create service role client to bypass RLS policies
    const supabase = createServiceRoleClient();
    
    const event = verifyStripeWebhookSignature(body, signature);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerId = session.customer as string;
        const subscriptionId = session.subscription as string;

        // Ensure we have a client_reference_id (user_id)
        const userId = session.client_reference_id;
        if (!userId) {
          console.error('No client_reference_id found in session:', session.id);
          throw new Error('Missing client_reference_id in checkout session');
        }

        if (session.mode === 'subscription' && subscriptionId) {
          // Fetch subscription details
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          const priceId = subscription.items.data[0].price.id;

          // Create subscription record using helper function
          await createSubscriptionRecord(
            userId,
            customerId,
            subscriptionId,
            priceId,
            subscription.status,
            new Date(subscription.current_period_end * 1000)
          );
        }

        if (session.mode === 'payment') {
          // Ensure we have an amount_total
          const amountTotal = session.amount_total ?? 0;
          
          // Handle one-time payment completion using helper function
          await createPurchaseRecord(
            userId,
            customerId,
            session.id,
            amountTotal,
            session.payment_status || 'unknown'
          );
        }
        break;
      }

      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        
        // Update subscription status in database
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: subscription.status,
            current_period_end: new Date(subscription.current_period_end * 1000),
          })
          .eq('stripe_subscription_id', subscription.id);

        if (updateError) throw updateError;
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        
        // Handle failed payment (e.g., notify user, update status)
        const { error: updateError } = await supabase
          .from('user_subscriptions')
          .update({
            status: 'past_due',
          })
          .eq('stripe_subscription_id', invoice.subscription);

        if (updateError) throw updateError;
        break;
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error('Stripe webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 400 }
    );
  }
}
