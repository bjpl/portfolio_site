import { NextResponse } from 'next/server';

/**
 * Dynamic Robots.txt Generator
 * Generates robots.txt based on environment and configuration
 */

const SITE_URL = process.env.SITE_URL || 'https://vocal-pony-24e3de.netlify.app';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Robots.txt configuration
const ROBOTS_CONFIG = {
  production: {
    allowAll: true,
    disallowPaths: [
      '/admin/*',
      '/api/*',
      '/_next/*',
      '/static/*',
      '/.well-known/*',
      '/test-*',
      '/*.json',
      '/logs/*',
      '/uploads/temp/*'
    ],
    crawlDelay: null,
    sitemap: `${SITE_URL}/sitemap.xml`
  },
  development: {
    allowAll: false,
    disallowPaths: ['/'],
    crawlDelay: 10,
    sitemap: null
  },
  staging: {
    allowAll: false, 
    disallowPaths: ['/'],
    crawlDelay: 10,
    sitemap: `${SITE_URL}/sitemap.xml`
  }
};

// User agents to specifically configure
const USER_AGENTS = {
  googlebot: {
    crawlDelay: null,
    allowPaths: ['/'],
    disallowPaths: ['/admin/*', '/api/*']
  },
  bingbot: {
    crawlDelay: 1,
    allowPaths: ['/'],
    disallowPaths: ['/admin/*', '/api/*']
  },
  '*': 'default' // Use default config
};

export async function GET() {
  try {
    const robotsTxt = generateRobotsTxt();
    
    return new NextResponse(robotsTxt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Cache-Control': 'public, max-age=86400, must-revalidate', // Cache for 24 hours
      },
    });
  } catch (error) {
    console.error('Error generating robots.txt:', error);
    return new NextResponse('Error generating robots.txt', { status: 500 });
  }
}

function generateRobotsTxt() {
  const env = NODE_ENV === 'production' ? 'production' : 
              NODE_ENV === 'staging' ? 'staging' : 'development';
  
  const config = ROBOTS_CONFIG[env];
  let robotsTxt = '';
  
  // Generate rules for each user agent
  for (const [userAgent, agentConfig] of Object.entries(USER_AGENTS)) {
    robotsTxt += `User-agent: ${userAgent}\n`;
    
    if (agentConfig === 'default') {
      // Use default configuration
      if (config.allowAll) {
        robotsTxt += 'Allow: /\n';
      }
      
      for (const path of config.disallowPaths) {
        robotsTxt += `Disallow: ${path}\n`;
      }
      
      if (config.crawlDelay) {
        robotsTxt += `Crawl-delay: ${config.crawlDelay}\n`;
      }
    } else {
      // Use specific user agent configuration
      for (const path of agentConfig.allowPaths || []) {
        robotsTxt += `Allow: ${path}\n`;
      }
      
      for (const path of agentConfig.disallowPaths || []) {
        robotsTxt += `Disallow: ${path}\n`;
      }
      
      if (agentConfig.crawlDelay) {
        robotsTxt += `Crawl-delay: ${agentConfig.crawlDelay}\n`;
      }
    }
    
    robotsTxt += '\n';
  }
  
  // Add sitemap URL if available
  if (config.sitemap) {
    robotsTxt += `Sitemap: ${config.sitemap}\n`;
  }
  
  // Add additional directives for production
  if (env === 'production') {
    robotsTxt += `\n# Additional directives\n`;
    robotsTxt += `# Host: ${SITE_URL}\n`;
    robotsTxt += `# Last updated: ${new Date().toISOString()}\n`;
  }
  
  return robotsTxt;
}

// Export configuration for use in tests
export { ROBOTS_CONFIG, USER_AGENTS };
