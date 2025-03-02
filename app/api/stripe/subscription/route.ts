import { NextResponse } from 'next/server';
import { getServerUser } from '@/utils/supabase-server';
import { getUserSubscriptionStatusServer } from '@/utils/stripe-helpers-server';

export async function GET() {
  try {
    // Get authenticated user from server client
    const user = await getServerUser();

    if (!user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get subscription status using server-side helper
    const subscription = await getUserSubscriptionStatusServer(user.id);

    return NextResponse.json({ subscription });
  } catch (error) {
    console.error('Error fetching subscription:', error);
    return NextResponse.json(
      { error: 'Error fetching subscription status' },
      { status: 500 }
    );
  }
}
