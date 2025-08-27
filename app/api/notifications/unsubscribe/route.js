import { NextResponse } from 'next/server';

// Import the same subscriptions store (in production, use a database)
const subscriptions = new Map();

export async function POST(request) {
  try {
    const { subscription } = await request.json();
    
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json(
        { error: 'Invalid subscription data' },
        { status: 400 }
      );
    }
    
    // Generate the subscription ID to find the stored subscription
    const subscriptionId = Buffer.from(subscription.endpoint).toString('base64').slice(-20);
    
    const existingSubscription = subscriptions.get(subscriptionId);
    
    if (existingSubscription) {
      // Mark as inactive instead of deleting for analytics
      existingSubscription.isActive = false;
      existingSubscription.unsubscribedAt = new Date().toISOString();
      
      subscriptions.set(subscriptionId, existingSubscription);
      
      console.log(`[PWA] Subscription unregistered: ${subscriptionId}`);
      console.log(`[PWA] Active subscriptions: ${Array.from(subscriptions.values()).filter(s => s.isActive).length}`);
      
      return NextResponse.json(
        { 
          message: 'Successfully unsubscribed from notifications',
          subscriptionId 
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        { error: 'Subscription not found' },
        { status: 404 }
      );
    }
    
  } catch (error) {
    console.error('[PWA] Error processing unsubscription:', error);
    
    return NextResponse.json(
      { error: 'Failed to process unsubscription' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  // Alternative method for unsubscription
  return POST(request);
}