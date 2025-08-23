/**
 * Netlify Function: Supabase Realtime WebSocket Bridge
 * Provides WebSocket-like functionality over HTTP for real-time features
 */

const { 
  getSupabaseServiceClient,
  withErrorHandling, 
  formatResponse, 
  getStandardHeaders, 
  handleCORS,
  validateRequiredFields,
  sanitizeInput,
  checkRateLimit
} = require('./utils/supabase');

// In-memory store for subscriptions (in production, use Redis or similar)
const subscriptions = new Map();
const connectionStore = new Map();

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  const headers = getStandardHeaders({
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive'
  });

  const { httpMethod, path } = event;
  const pathSegments = path.split('/').filter(Boolean);
  const action = pathSegments[pathSegments.length - 1];

  try {
    switch (httpMethod) {
      case 'POST':
        if (action === 'subscribe') {
          return await handleSubscribe(event, headers);
        } else if (action === 'unsubscribe') {
          return await handleUnsubscribe(event, headers);
        } else if (action === 'broadcast') {
          return await handleBroadcast(event, headers);
        }
        break;
      case 'GET':
        if (action === 'poll') {
          return await handlePoll(event, headers);
        } else if (action === 'status') {
          return await handleStatus(event, headers);
        }
        break;
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify(formatResponse(
            false, 
            null, 
            `Method ${httpMethod} not allowed`, 
            null, 
            405
          ))
        };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        `Unknown action: ${action}`, 
        null, 
        400
      ))
    };

  } catch (error) {
    console.error('Realtime API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Realtime operation failed', 
        error.message, 
        500
      ))
    };
  }
};

/**
 * Handle subscription to realtime events
 */
async function handleSubscribe(event, headers) {
  // Rate limiting
  const clientIP = event.headers['client-ip'] || event.headers['x-forwarded-for'] || 'unknown';
  if (!checkRateLimit(clientIP, 20, 300000)) { // 20 subscriptions per 5 minutes
    return {
      statusCode: 429,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Too many subscription requests. Please try again later.', 
        null, 
        429
      ))
    };
  }

  let subscribeData;
  try {
    subscribeData = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Invalid JSON in request body', 
        parseError.message, 
        400
      ))
    };
  }

  const validation = validateRequiredFields(subscribeData, ['table', 'clientId']);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        `Missing required fields: ${validation.missing.join(', ')}`, 
        null, 
        400
      ))
    };
  }

  const { table, clientId, filter, event: eventType } = subscribeData;
  const safeTable = sanitizeInput(table);
  const safeClientId = sanitizeInput(clientId);
  const safeEventType = eventType ? sanitizeInput(eventType) : '*';

  // Generate subscription ID
  const subscriptionId = `${safeClientId}_${safeTable}_${Date.now()}`;
  
  // Store subscription
  const subscription = {
    id: subscriptionId,
    clientId: safeClientId,
    table: safeTable,
    filter: filter || {},
    eventType: safeEventType,
    createdAt: new Date().toISOString(),
    lastActivity: new Date().toISOString(),
    active: true
  };

  subscriptions.set(subscriptionId, subscription);

  // Initialize connection store for client if not exists
  if (!connectionStore.has(safeClientId)) {
    connectionStore.set(safeClientId, {
      clientId: safeClientId,
      subscriptions: new Set(),
      messages: [],
      lastPoll: new Date().toISOString(),
      connected: true
    });
  }

  const clientConnection = connectionStore.get(safeClientId);
  clientConnection.subscriptions.add(subscriptionId);

  console.log(`New subscription created: ${subscriptionId} for table: ${safeTable}`);

  // Set up realtime listener with Supabase (if available)
  await setupSupabaseListener(subscription);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      {
        subscriptionId,
        table: safeTable,
        eventType: safeEventType,
        clientId: safeClientId,
        status: 'subscribed'
      },
      'Successfully subscribed to realtime events'
    ))
  };
}

/**
 * Handle unsubscription from realtime events
 */
async function handleUnsubscribe(event, headers) {
  let unsubscribeData;
  try {
    unsubscribeData = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Invalid JSON in request body', 
        parseError.message, 
        400
      ))
    };
  }

  const { subscriptionId, clientId } = unsubscribeData;
  
  if (!subscriptionId && !clientId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Either subscriptionId or clientId is required', 
        null, 
        400
      ))
    };
  }

  let removed = 0;

  if (subscriptionId) {
    // Remove specific subscription
    if (subscriptions.has(subscriptionId)) {
      const subscription = subscriptions.get(subscriptionId);
      subscription.active = false;
      subscriptions.delete(subscriptionId);
      
      // Remove from client connection
      const clientConnection = connectionStore.get(subscription.clientId);
      if (clientConnection) {
        clientConnection.subscriptions.delete(subscriptionId);
      }
      
      removed = 1;
      console.log(`Subscription removed: ${subscriptionId}`);
    }
  } else if (clientId) {
    // Remove all subscriptions for client
    const clientConnection = connectionStore.get(clientId);
    if (clientConnection) {
      for (const subId of clientConnection.subscriptions) {
        if (subscriptions.has(subId)) {
          subscriptions.get(subId).active = false;
          subscriptions.delete(subId);
          removed++;
        }
      }
      clientConnection.subscriptions.clear();
      clientConnection.connected = false;
      console.log(`All subscriptions removed for client: ${clientId}, count: ${removed}`);
    }
  }

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      {
        removedSubscriptions: removed,
        subscriptionId,
        clientId
      },
      `Successfully unsubscribed ${removed} subscription(s)`
    ))
  };
}

/**
 * Handle broadcasting messages to subscribers
 */
async function handleBroadcast(event, headers) {
  let broadcastData;
  try {
    broadcastData = JSON.parse(event.body);
  } catch (parseError) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Invalid JSON in request body', 
        parseError.message, 
        400
      ))
    };
  }

  const validation = validateRequiredFields(broadcastData, ['table', 'event', 'payload']);
  if (!validation.valid) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        `Missing required fields: ${validation.missing.join(', ')}`, 
        null, 
        400
      ))
    };
  }

  const { table, event: eventType, payload, filter } = broadcastData;
  const message = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    table,
    eventType,
    payload,
    timestamp: new Date().toISOString()
  };

  // Find matching subscriptions
  let deliveredCount = 0;
  for (const [subId, subscription] of subscriptions.entries()) {
    if (!subscription.active) continue;
    
    // Check if subscription matches
    if (subscription.table === table && 
        (subscription.eventType === '*' || subscription.eventType === eventType)) {
      
      // Check filter if provided
      if (filter && !matchesFilter(payload, subscription.filter)) {
        continue;
      }

      // Deliver message to client
      const clientConnection = connectionStore.get(subscription.clientId);
      if (clientConnection && clientConnection.connected) {
        clientConnection.messages.push({
          ...message,
          subscriptionId: subId
        });
        
        // Keep only last 100 messages per client
        if (clientConnection.messages.length > 100) {
          clientConnection.messages = clientConnection.messages.slice(-100);
        }
        
        deliveredCount++;
      }
    }
  }

  console.log(`Broadcast message delivered to ${deliveredCount} subscribers`);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      {
        messageId: message.id,
        deliveredTo: deliveredCount,
        table,
        eventType
      },
      `Message broadcast to ${deliveredCount} subscribers`
    ))
  };
}

/**
 * Handle polling for new messages
 */
async function handlePoll(event, headers) {
  const params = new URLSearchParams(event.queryString || '');
  const clientId = params.get('clientId');
  const since = params.get('since'); // ISO timestamp
  const limit = parseInt(params.get('limit')) || 50;

  if (!clientId) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'clientId parameter is required', 
        null, 
        400
      ))
    };
  }

  const clientConnection = connectionStore.get(clientId);
  if (!clientConnection) {
    return {
      statusCode: 404,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Client connection not found', 
        null, 
        404
      ))
    };
  }

  // Update last poll time
  clientConnection.lastPoll = new Date().toISOString();
  clientConnection.connected = true;

  // Filter messages
  let messages = clientConnection.messages;
  
  if (since) {
    const sinceDate = new Date(since);
    messages = messages.filter(msg => new Date(msg.timestamp) > sinceDate);
  }

  // Limit messages
  if (messages.length > limit) {
    messages = messages.slice(-limit);
  }

  // Clear delivered messages
  clientConnection.messages = clientConnection.messages.filter(msg => 
    !messages.find(delivered => delivered.id === msg.id)
  );

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      {
        clientId,
        messages,
        hasMore: clientConnection.messages.length > 0,
        timestamp: new Date().toISOString()
      },
      `Retrieved ${messages.length} messages`
    ))
  };
}

/**
 * Handle connection status
 */
async function handleStatus(event, headers) {
  const params = new URLSearchParams(event.queryString || '');
  const clientId = params.get('clientId');

  if (clientId) {
    const clientConnection = connectionStore.get(clientId);
    if (!clientConnection) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          'Client connection not found', 
          null, 
          404
        ))
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formatResponse(
        true,
        {
          clientId,
          connected: clientConnection.connected,
          subscriptions: Array.from(clientConnection.subscriptions),
          pendingMessages: clientConnection.messages.length,
          lastPoll: clientConnection.lastPoll
        },
        'Client status retrieved'
      ))
    };
  }

  // Global status
  const activeSubscriptions = Array.from(subscriptions.values())
    .filter(sub => sub.active);
  
  const activeConnections = Array.from(connectionStore.values())
    .filter(conn => conn.connected);

  return {
    statusCode: 200,
    headers,
    body: JSON.stringify(formatResponse(
      true,
      {
        totalSubscriptions: activeSubscriptions.length,
        activeConnections: activeConnections.length,
        tables: [...new Set(activeSubscriptions.map(sub => sub.table))],
        uptime: process.uptime ? Math.floor(process.uptime()) : null
      },
      'Realtime service status'
    ))
  };
}

/**
 * Setup Supabase realtime listener (placeholder for actual implementation)
 */
async function setupSupabaseListener(subscription) {
  // In a real implementation, you would set up Supabase realtime listeners
  // and forward events to the subscription system
  console.log(`Setting up Supabase listener for: ${subscription.table}`);
  
  // Example:
  // const supabase = getSupabaseServiceClient();
  // supabase
  //   .channel(`realtime:${subscription.table}`)
  //   .on('*', { table: subscription.table }, (payload) => {
  //     // Forward to broadcast system
  //     handleBroadcast({
  //       body: JSON.stringify({
  //         table: subscription.table,
  //         event: payload.eventType,
  //         payload: payload.new || payload.old || payload
  //       })
  //     }, {});
  //   })
  //   .subscribe();
}

/**
 * Check if payload matches subscription filter
 */
function matchesFilter(payload, filter) {
  if (!filter || Object.keys(filter).length === 0) {
    return true;
  }

  for (const [key, value] of Object.entries(filter)) {
    if (payload[key] !== value) {
      return false;
    }
  }

  return true;
}

// Cleanup inactive connections periodically
setInterval(() => {
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);

  for (const [clientId, connection] of connectionStore.entries()) {
    if (new Date(connection.lastPoll) < fiveMinutesAgo) {
      console.log(`Cleaning up inactive connection: ${clientId}`);
      
      // Remove subscriptions
      for (const subId of connection.subscriptions) {
        subscriptions.delete(subId);
      }
      
      // Remove connection
      connectionStore.delete(clientId);
    }
  }
}, 300000); // Run every 5 minutes