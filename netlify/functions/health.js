/**
 * Netlify Function: Health Check
 * Universal endpoint with Supabase connection monitoring
 */

const { 
  checkSupabaseHealth, 
  formatResponse, 
  getStandardHeaders, 
  handleCORS 
} = require('./utils/supabase');

exports.handler = async (event, context) => {
  // Handle CORS preflight
  const corsResponse = handleCORS(event);
  if (corsResponse) return corsResponse;

  const headers = getStandardHeaders();

  try {
    // Check Supabase health
    const supabaseHealth = await checkSupabaseHealth();
    
    // Determine overall health status
    const isHealthy = supabaseHealth.healthy;
    const statusCode = isHealthy ? 200 : 503;
    
    const healthData = {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      environment: 'netlify',
      version: '2.0.0', // Updated for Supabase integration
      uptime: process.uptime ? Math.floor(process.uptime()) : null,
      region: context.clientContext?.custom?.netlify_region || 'unknown',
      deployment: {
        id: context.clientContext?.custom?.netlify_deploy_id || 'unknown',
        context: context.clientContext?.custom?.netlify_deploy_context || 'unknown'
      },
      services: {
        supabase: {
          healthy: supabaseHealth.healthy,
          latency: supabaseHealth.latency,
          error: supabaseHealth.error || null
        }
      },
      features: {
        cors: true,
        offline: true,
        fallback: true,
        monitoring: true,
        database: supabaseHealth.healthy,
        realtime: supabaseHealth.healthy,
        storage: supabaseHealth.healthy
      },
      checks: {
        database: isHealthy ? 'pass' : 'fail',
        memory: 'pass', // Always pass for serverless
        api: 'pass'
      }
    };

    return {
      statusCode,
      headers,
      body: JSON.stringify(formatResponse(
        isHealthy,
        healthData,
        isHealthy ? 'All systems operational' : 'Some services degraded'
      ))
    };
  } catch (error) {
    console.error('Health check error:', error);
    
    const errorData = {
      status: 'error',
      timestamp: new Date().toISOString(),
      environment: 'netlify',
      version: '2.0.0',
      error: {
        message: 'Health check failed',
        details: error.message
      },
      services: {
        supabase: {
          healthy: false,
          error: 'Connection check failed'
        }
      }
    };
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify(formatResponse(
        false,
        errorData,
        'Health check failed',
        error.message,
        500
      ))
    };
  }
};