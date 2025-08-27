import { NextResponse } from 'next/server';

// Store subscriptions (in production, use a database)
const subscriptions = new Map();

export async function POST(request) {
  try {
    const { subscription, userAgent, timestamp } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }
    
    // Generate a unique ID for the subscription
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64').slice(-20);
    
    // Store subscription with metadata
    const subscriptionData = {
      id: subscriptionId,
      subscription,
      userAgent: userAgent || 'Unknown',
      subscribedAt: new Date(timestamp || Date.now()).toISOString(),
      lastNotification: null,
      isActive: true,
    };
    
    subscriptions.set(subscriptionId, subscriptionData);
    
    console.log(`[PWA] New subscription registered: ${subscriptionId}`);
    console.log(`[PWA] Total subscriptions: ${subscriptions.size}`);
    
    return NextResponse.json(
      { 
        message: 'Successfully subscribed to notifications',
        subscriptionId,
        totalSubscriptions: subscriptions.size 
      },
      { status: 201 }
    );
    
  } catch (error) {
    console.error('[PWA] Error processing subscription:', error);
    
    return NextResponse.json(
      { error: 'Failed to process subscription' },
      { status: 500 }
    );
  }
}

export async function GET() {
  // Return subscription statistics
  const stats = {
    totalSubscriptions: subscriptions.size,
    activeSubscriptions: Array.from(subscriptions.values()).filter(s => s.isActive).length,
    lastSubscription: subscriptions.size > 0 ? 
      Math.max(...Array.from(subscriptions.values()).map(s => new Date(s.subscribedAt).getTime())) : null
  };
  
  return NextResponse.json(stats);
}