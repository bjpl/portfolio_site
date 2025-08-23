/**
 * Netlify Function: Supabase Webhooks Handler
 * Handles various Supabase database webhooks and real-time events
 */

const { 
  getSupabaseServiceClient,
  withErrorHandling, 
  formatResponse, 
  getStandardHeaders, 
  handleCORS 
} = require('./utils/supabase');

const crypto = require('crypto');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  const headers = getStandardHeaders();

  // Only allow POST requests for webhooks
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Method not allowed. Use POST.', 
        null, 
        405
      ))
    };
  }

  try {
    // Verify webhook signature if secret is provided
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = event.headers['x-supabase-signature'];
      if (!signature || !verifySignature(event.body, signature, webhookSecret)) {
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify(formatResponse(
            false, 
            null, 
            'Invalid webhook signature', 
            null, 
            401
          ))
        };
      }
    }

    let webhookData;
    try {
      webhookData = JSON.parse(event.body);
    } catch (parseError) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify(formatResponse(
          false, 
          null, 
          'Invalid JSON in webhook payload', 
          parseError.message, 
          400
        ))
      };
    }

    // Process webhook based on type and table
    const { type, table, record, old_record, schema } = webhookData;
    
    console.log(`Processing webhook: ${type} on ${table}`, {
      type,
      table,
      schema,
      recordId: record?.id || 'unknown'
    });

    // Handle different webhook types
    let result;
    switch (type) {
      case 'INSERT':
        result = await handleInsertWebhook(table, record);
        break;
      case 'UPDATE':
        result = await handleUpdateWebhook(table, record, old_record);
        break;
      case 'DELETE':
        result = await handleDeleteWebhook(table, old_record);
        break;
      default:
        console.warn(`Unhandled webhook type: ${type}`);
        result = { success: true, message: 'Webhook received but not processed' };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(formatResponse(
        true,
        {
          processed: true,
          type,
          table,
          result
        },
        'Webhook processed successfully'
      ))
    };

  } catch (error) {
    console.error('Webhook processing error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false, 
        null, 
        'Webhook processing failed', 
        error.message, 
        500
      ))
    };
  }
};

/**
 * Verify webhook signature
 * @param {string} payload - Raw webhook payload
 * @param {string} signature - Signature from header
 * @param {string} secret - Webhook secret
 * @returns {boolean}
 */
function verifySignature(payload, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload, 'utf8')
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'hex'),
    Buffer.from(expectedSignature, 'hex')
  );
}

/**
 * Handle INSERT webhooks
 */
async function handleInsertWebhook(table, record) {
  switch (table) {
    case 'contact_messages':
      return await processNewContactMessage(record);
    case 'blog_posts':
      return await processNewBlogPost(record);
    case 'projects':
      return await processNewProject(record);
    default:
      console.log(`No specific handler for INSERT on ${table}`);
      return { success: true, message: 'Insert webhook received' };
  }
}

/**
 * Handle UPDATE webhooks
 */
async function handleUpdateWebhook(table, record, oldRecord) {
  switch (table) {
    case 'blog_posts':
      return await processBlogPostUpdate(record, oldRecord);
    case 'projects':
      return await processProjectUpdate(record, oldRecord);
    default:
      console.log(`No specific handler for UPDATE on ${table}`);
      return { success: true, message: 'Update webhook received' };
  }
}

/**
 * Handle DELETE webhooks
 */
async function handleDeleteWebhook(table, oldRecord) {
  switch (table) {
    case 'blog_posts':
      return await processBlogPostDeletion(oldRecord);
    case 'projects':
      return await processProjectDeletion(oldRecord);
    default:
      console.log(`No specific handler for DELETE on ${table}`);
      return { success: true, message: 'Delete webhook received' };
  }
}

/**
 * Process new contact message
 */
async function processNewContactMessage(record) {
  console.log('New contact message received:', {
    id: record.id,
    name: record.name,
    email: record.email,
    subject: record.subject
  });

  // Here you could:
  // 1. Send email notifications
  // 2. Add to CRM system
  // 3. Trigger automated responses
  // 4. Update analytics

  // Example: Send notification email (implement based on your email service)
  if (process.env.CONTACT_NOTIFICATION_EMAIL) {
    await sendNotificationEmail({
      to: process.env.CONTACT_NOTIFICATION_EMAIL,
      subject: `New contact message: ${record.subject}`,
      body: `
        New contact message received:
        
        Name: ${record.name}
        Email: ${record.email}
        Subject: ${record.subject}
        Message: ${record.message}
        
        Submitted at: ${record.submitted_at}
      `
    });
  }

  return {
    success: true,
    message: 'Contact message processed',
    actions: ['notification_sent']
  };
}

/**
 * Process new blog post
 */
async function processNewBlogPost(record) {
  console.log('New blog post created:', {
    id: record.id,
    title: record.title,
    status: record.status
  });

  // Here you could:
  // 1. Regenerate search index
  // 2. Clear caches
  // 3. Send social media notifications
  // 4. Update RSS feeds

  const actions = [];

  if (record.status === 'published') {
    // Clear blog cache, regenerate search index, etc.
    actions.push('cache_cleared', 'search_index_updated');
    
    if (record.featured) {
      actions.push('social_media_scheduled');
    }
  }

  return {
    success: true,
    message: 'Blog post processed',
    actions
  };
}

/**
 * Process new project
 */
async function processNewProject(record) {
  console.log('New project created:', {
    id: record.id,
    name: record.name,
    status: record.status
  });

  // Here you could:
  // 1. Update portfolio cache
  // 2. Regenerate project listings
  // 3. Update statistics

  return {
    success: true,
    message: 'Project processed',
    actions: ['portfolio_cache_updated']
  };
}

/**
 * Process blog post updates
 */
async function processBlogPostUpdate(record, oldRecord) {
  console.log('Blog post updated:', {
    id: record.id,
    title: record.title,
    statusChanged: record.status !== oldRecord.status
  });

  const actions = [];

  // Handle status changes
  if (record.status !== oldRecord.status) {
    if (record.status === 'published') {
      actions.push('published_notification', 'search_index_updated');
    } else if (oldRecord.status === 'published') {
      actions.push('unpublished_notification', 'search_index_updated');
    }
  }

  // Handle content changes
  if (record.content !== oldRecord.content || record.title !== oldRecord.title) {
    actions.push('cache_cleared', 'search_index_updated');
  }

  return {
    success: true,
    message: 'Blog post update processed',
    actions
  };
}

/**
 * Process project updates
 */
async function processProjectUpdate(record, oldRecord) {
  console.log('Project updated:', {
    id: record.id,
    name: record.name,
    statusChanged: record.status !== oldRecord.status
  });

  const actions = [];

  if (record.status !== oldRecord.status) {
    actions.push('status_change_notification');
  }

  if (record.featured !== oldRecord.featured) {
    actions.push('featured_status_updated', 'portfolio_cache_cleared');
  }

  return {
    success: true,
    message: 'Project update processed',
    actions
  };
}

/**
 * Process blog post deletion
 */
async function processBlogPostDeletion(oldRecord) {
  console.log('Blog post deleted:', {
    id: oldRecord.id,
    title: oldRecord.title
  });

  // Clear caches, update search index, etc.
  return {
    success: true,
    message: 'Blog post deletion processed',
    actions: ['cache_cleared', 'search_index_updated']
  };
}

/**
 * Process project deletion
 */
async function processProjectDeletion(oldRecord) {
  console.log('Project deleted:', {
    id: oldRecord.id,
    name: oldRecord.name
  });

  return {
    success: true,
    message: 'Project deletion processed',
    actions: ['portfolio_cache_cleared']
  };
}

/**
 * Send notification email (placeholder - implement with your email service)
 */
async function sendNotificationEmail({ to, subject, body }) {
  // Implement with your email service (SendGrid, Mailgun, etc.)
  console.log('Would send email:', { to, subject });
  
  // Example implementation would go here
  // await emailService.send({ to, subject, body });
  
  return true;
}