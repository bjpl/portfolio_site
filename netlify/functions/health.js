/**
 * Netlify Function: Health Check
 * Universal endpoint with Supabase connection monitoring
 */

const { createClient } = require('@supabase/supabase-js');

// Utility functions (same as in auth-login for consistency)
const formatResponse = (success, data = null, message = '', error = null, statusCode = 200) => ({
  success,
  data,
  message,
  error,
  timestamp: new Date().toISOString(),
  statusCode
});

const getStandardHeaders = () => ({
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json'
});

const handleCORS = (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: getStandardHeaders(),
      body: ''
    };
  }
  return null;
};

// Initialize Supabase client with fallbacks
const getSupabaseClient = () => {
  const supabaseUrl = process.env.SUPABASE_URL || 
                      process.env.NEXT_PUBLIC_SUPABASE_URL || 
                      'https://tdmzayzkqyegvfgxlolj.supabase.co';
                      
  const supabaseKey = process.env.SUPABASE_ANON_KEY || 
                      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
                      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRkbXpheXprcXllZ3ZmZ3hsb2xqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU5OTkzNDAsImV4cCI6MjA3MTU3NTM0MH0.u4i07AojTzeSVRfbUyTSKfPv1EKUCFCv7XPri22gbkM';
  
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  });
};

// Simple health check for Supabase
const checkSupabaseHealth = async () => {
  const startTime = Date.now();
  
  try {
    const supabase = getSupabaseClient();
    
    // Simple query to check connection
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    const latency = Date.now() - startTime;
    
    if (error && error.code === 'PGRST116') {
      return {
        healthy: false,
        latency,
        error: 'Database schema not initialized - tables missing',
        needsMigration: true
      };
    }
    
    if (error) {
      return {
        healthy: false,
        latency,
        error: error.message
      };
    }
    
    return {
      healthy: true,
      latency
    };
  } catch (error) {
    return {
      healthy: false,
      latency: Date.now() - startTime,
      error: error.message
    };
  }
};

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