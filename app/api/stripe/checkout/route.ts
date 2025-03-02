import { NextResponse } from 'next/server';
import { createCheckoutSession } from '@/utils/stripe';
import { createServerSupabaseClient } from '@/utils/supabase-server';
import { getOrCreateStripeCustomerServer } from '@/utils/stripe-helpers-server';

export async function POST(req: Request) {
  try {
    const { priceId, mode = 'payment' } = await req.json();

    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      );
    }

    // Extract token and create server client
    const token = authHeader.split(' ')[1];
    const supabase = await createServerSupabaseClient();
    
    // Verify the token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get or create Stripe customer using server-side helper
    const customerId = await getOrCreateStripeCustomerServer(
      user.id,
      user.email!
    );

    console.log('Creating checkout session with:', {
      priceId,
      mode,
      customerId,
      client_reference_id: user.id,
      successUrl: new URL('/dashboard?session_id={CHECKOUT_SESSION_ID}', process.env.NEXT_PUBLIC_APP_URL).toString(),
      cancelUrl: new URL('/pricing', process.env.NEXT_PUBLIC_APP_URL).toString(),
    });

    // Create checkout session with client_reference_id
    const checkoutSession = await createCheckoutSession({
      priceId,
      mode,
      customerId,
      client_reference_id: user.id,
      successUrl: new URL('/dashboard?session_id={CHECKOUT_SESSION_ID}', process.env.NEXT_PUBLIC_APP_URL).toString(),
      cancelUrl: new URL('/pricing', process.env.NEXT_PUBLIC_APP_URL).toString(),
    });

    if (!checkoutSession?.sessionId) {
      console.error('No session ID in checkout response:', checkoutSession);
      throw new Error('Failed to create checkout session');
    }

    return NextResponse.json(checkoutSession);
  } catch (error) {
    console.error('Error in checkout route:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    return NextResponse.json(
      { error: 'Error creating checkout session' },
      { status: 500 }
    );
  }
}
