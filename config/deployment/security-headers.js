/**
 * Security Headers Configuration
 * 
 * This module provides comprehensive security headers configuration
 * for different deployment platforms and environments
 */

// Base security headers for all environments
const BASE_SECURITY_HEADERS = {
  // Prevent clickjacking attacks
  'X-Frame-Options': 'DENY',
  
  // Prevent MIME type sniffing
  'X-Content-Type-Options': 'nosniff',
  
  // Enable XSS protection (legacy browsers)
  'X-XSS-Protection': '1; mode=block',
  
  // Control referrer information
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  
  // Force HTTPS connections
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  
  // Cross-Origin policies
  'Cross-Origin-Embedder-Policy': 'require-corp',
  'Cross-Origin-Opener-Policy': 'same-origin',
  
  // Disable potentially harmful features
  'Permissions-Policy': [
    'accelerometer=()',
    'camera=()',
    'geolocation=()',
    'gyroscope=()',
    'magnetometer=()',
    'microphone=()',
    'payment=()',
    'usb=()',
    'interest-cohort=()'
  ].join(', ')
};

// Content Security Policy configuration
const CSP_DIRECTIVES = {
  'default-src': "'self'",
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for inline scripts in Hugo templates
    "'unsafe-eval'", // Required for some third-party libraries
    'https:',
    // Add specific domains for analytics, etc.
    'https://www.google-analytics.com',
    'https://www.googletagmanager.com',
    'https://static.hotjar.com',
    'https://script.hotjar.com'
  ].join(' '),
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for inline styles in Hugo
    'https:',
    // Add specific domains for fonts, etc.
    'https://fonts.googleapis.com',
    'https://cdnjs.cloudflare.com'
  ].join(' '),
  'img-src': [
    "'self'",
    'data:',
    'https:',
    // Add specific domains for images
    'https://images.unsplash.com',
    'https://via.placeholder.com'
  ].join(' '),
  'connect-src': [
    "'self'",
    'https:',
    // Add API endpoints
    'https://api.supabase.co',
    'https://*.supabase.co'
  ].join(' '),
  'font-src': [
    "'self'",
    'data:',
    'https:',
    'https://fonts.gstatic.com'
  ].join(' '),
  'form-action': "'self'",
  'base-uri': "'self'",
  'object-src': "'none'",
  'frame-ancestors': "'none'",
  'upgrade-insecure-requests': true
};

// Build CSP header value
const buildCSP = (directives) => {
  return Object.entries(directives)
    .map(([directive, value]) => {
      if (typeof value === 'boolean' && value) {
        return directive;
      }
      return `${directive} ${value}`;
    })
    .join('; ');
};

// Environment-specific configurations
const ENVIRONMENTS = {
  development: {
    ...BASE_SECURITY_HEADERS,
    'Content-Security-Policy': buildCSP({
      ...CSP_DIRECTIVES,
      'script-src': CSP_DIRECTIVES['script-src'] + " 'unsafe-eval' http://localhost:*",
      'connect-src': CSP_DIRECTIVES['connect-src'] + " http://localhost:* ws://localhost:*"
    })
  },
  
  staging: {
    ...BASE_SECURITY_HEADERS,
    'Content-Security-Policy': buildCSP({
      ...CSP_DIRECTIVES,
      'script-src': CSP_DIRECTIVES['script-src'] + " https://staging.yourdomain.com",
      'connect-src': CSP_DIRECTIVES['connect-src'] + " https://staging-api.yourdomain.com"
    })
  },
  
  production: {
    ...BASE_SECURITY_HEADERS,
    'Content-Security-Policy': buildCSP(CSP_DIRECTIVES)
  }
};

// Admin panel specific headers (more restrictive)
const ADMIN_HEADERS = {
  ...BASE_SECURITY_HEADERS,
  'X-Frame-Options': 'DENY',
  'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0, private',
  'Pragma': 'no-cache',
  'Expires': '0',
  'ETag': 'false',
  'Last-Modified': '',
  'Vary': '*',
  'Content-Security-Policy': buildCSP({
    'default-src': "'self'",
    'script-src': [
      "'self'",
      "'unsafe-inline'",
      'https://*.supabase.co'
    ].join(' '),
    'style-src': "'self' 'unsafe-inline' https:",
    'img-src': "'self' data: https:",
    'connect-src': "'self' https://*.supabase.co https:",
    'font-src': "'self' data: https:",
    'form-action': "'self'",
    'base-uri': "'self'",
    'object-src': "'none'",
    'frame-ancestors': "'none'"
  })
};

// Platform-specific header formats

/**
 * Generate Netlify headers format
 */
function generateNetlifyHeaders(environment = 'production') {
  const headers = ENVIRONMENTS[environment];
  
  const netlifyConfig = [];
  
  // General headers
  netlifyConfig.push({
    for: '/*',
    values: headers
  });
  
  // Admin panel headers
  netlifyConfig.push({
    for: '/admin/*',
    values: ADMIN_HEADERS
  });
  
  // API headers
  netlifyConfig.push({
    for: '/api/*',
    values: {
      'X-Robots-Tag': 'noindex, nofollow',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Origin': process.env.CORS_ORIGIN || "'self'"
    }
  });
  
  // Static asset headers
  netlifyConfig.push({
    for: '*.js',
    values: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
  
  netlifyConfig.push({
    for: '*.css',
    values: {
      'Cache-Control': 'public, max-age=3600, must-revalidate'
    }
  });
  
  netlifyConfig.push({
    for: '*.{jpg,jpeg,png,gif,svg,webp,avif}',
    values: {
      'Cache-Control': 'public, max-age=31536000, immutable'
    }
  });
  
  return netlifyConfig;
}

/**
 * Generate Vercel headers format
 */
function generateVercelHeaders(environment = 'production') {
  const headers = ENVIRONMENTS[environment];
  
  return [
    {
      source: '/(.*)',
      headers: Object.entries(headers).map(([key, value]) => ({
        key,
        value
      }))
    },
    {
      source: '/admin/(.*)',
      headers: Object.entries(ADMIN_HEADERS).map(([key, value]) => ({
        key,
        value
      }))
    },
    {
      source: '/api/(.*)',
      headers: [
        {
          key: 'X-Robots-Tag',
          value: 'noindex, nofollow'
        },
        {
          key: 'Access-Control-Allow-Methods',
          value: 'GET, POST, PUT, DELETE, OPTIONS'
        },
        {
          key: 'Access-Control-Allow-Headers',
          value: 'Content-Type, Authorization'
        }
      ]
    },
    {
      source: '/(.*\\.(js|css|ico|svg|webp|avif|jpg|jpeg|png))',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable'
        }
      ]
    }
  ];
}

/**
 * Generate Apache .htaccess format
 */
function generateApacheHeaders(environment = 'production') {
  const headers = ENVIRONMENTS[environment];
  
  let htaccess = `# Security Headers\n`;
  
  Object.entries(headers).forEach(([header, value]) => {
    htaccess += `Header always set "${header}" "${value}"\n`;
  });
  
  htaccess += `\n# Admin Panel Headers\n`;
  htaccess += `<Location "/admin">\n`;
  Object.entries(ADMIN_HEADERS).forEach(([header, value]) => {
    htaccess += `  Header always set "${header}" "${value}"\n`;
  });
  htaccess += `</Location>\n`;
  
  htaccess += `\n# Caching Headers\n`;
  htaccess += `<FilesMatch "\\.(js|css|ico|svg|webp|avif|jpg|jpeg|png)$">\n`;
  htaccess += `  Header set Cache-Control "public, max-age=31536000, immutable"\n`;
  htaccess += `</FilesMatch>\n`;
  
  return htaccess;
}

/**
 * Generate Nginx configuration format
 */
function generateNginxHeaders(environment = 'production') {
  const headers = ENVIRONMENTS[environment];
  
  let nginxConfig = `# Security Headers\n`;
  
  Object.entries(headers).forEach(([header, value]) => {
    nginxConfig += `add_header ${header} "${value}" always;\n`;
  });
  
  nginxConfig += `\n# Admin Panel Headers\n`;
  nginxConfig += `location /admin {\n`;
  Object.entries(ADMIN_HEADERS).forEach(([header, value]) => {
    nginxConfig += `  add_header ${header} "${value}" always;\n`;
  });
  nginxConfig += `}\n`;
  
  nginxConfig += `\n# Static Asset Headers\n`;
  nginxConfig += `location ~* \\.(js|css|ico|svg|webp|avif|jpg|jpeg|png)$ {\n`;
  nginxConfig += `  add_header Cache-Control "public, max-age=31536000, immutable" always;\n`;
  nginxConfig += `}\n`;
  
  return nginxConfig;
}

/**
 * Validate security headers implementation
 */
async function validateSecurityHeaders(url) {
  try {
    const https = require('https');
    const http = require('http');
    const urlObj = new URL(url);
    const client = urlObj.protocol === 'https:' ? https : http;
    
    return new Promise((resolve) => {
      const req = client.request(url, { method: 'HEAD' }, (res) => {
        const headers = res.headers;
        const requiredHeaders = Object.keys(BASE_SECURITY_HEADERS);
        
        const validation = {
          url,
          timestamp: new Date().toISOString(),
          headers: headers,
          security: {
            present: [],
            missing: [],
            score: 0
          }
        };
        
        requiredHeaders.forEach(header => {
          const headerKey = header.toLowerCase();
          if (headers[headerKey]) {
            validation.security.present.push(header);
          } else {
            validation.security.missing.push(header);
          }
        });
        
        validation.security.score = Math.round(
          (validation.security.present.length / requiredHeaders.length) * 100
        );
        
        resolve(validation);
      });
      
      req.on('error', (error) => {
        resolve({
          url,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
      
      req.end();
    });
  } catch (error) {
    return {
      url,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = {
  BASE_SECURITY_HEADERS,
  CSP_DIRECTIVES,
  ADMIN_HEADERS,
  ENVIRONMENTS,
  generateNetlifyHeaders,
  generateVercelHeaders,
  generateApacheHeaders,
  generateNginxHeaders,
  validateSecurityHeaders,
  buildCSP
};