import { NextResponse } from 'next/server';

/**
 * Next.js Middleware for URL Redirects and Rewriting
 * Handles Hugo to Next.js PWA URL mapping with 301 redirects
 */

// Hugo to Next.js URL mappings
const URL_MAPPINGS = {
  // Main sections
  '/tools': '/tools',
  '/writing': '/writing', 
  '/teaching-learning': '/teaching',
  '/me': '/about',
  '/photography': '/gallery',
  '/blog': '/blog',
  '/cv': '/resume',
  '/services': '/services',
  '/projects': '/projects',
  '/admin': '/admin',
  '/contact': '/contact',
  
  // Legacy Hugo paths
  '/make': '/writing',
  '/learn': '/tools',
  '/letratos': '/gallery',
  '/servicios': '/services',
  '/poetry': '/writing/poetry',
  '/posts': '/blog',
  
  // Spanish language paths
  '/es': '/es',
  '/es/hacer': '/es/writing',
  '/es/aprender': '/es/tools',
  '/es/me': '/es/about',
  '/es/cv': '/es/resume',
  '/es/servicios': '/es/services',
  '/es/photography': '/es/gallery',
  '/es/poetry': '/es/writing/poetry',
  '/es/teaching-learning': '/es/teaching',
  '/es/contact': '/es/contact',
  
  // Specific tool redirects
  '/tools/built/react-dashboard-project': '/projects/react-dashboard',
  '/tools/built/vocab-tool': '/tools/vocabulary',
  '/tools/built/langtool': '/tools/language',
  '/tools/built/subjunctive-practice': '/tools/grammar',
  '/tools/built/conjugation-gui': '/tools/conjugation',
  
  // Writing redirects
  '/writing/poetry': '/writing/poetry',
  '/teaching-learning/sla-theory': '/teaching/theory',
  '/teaching-learning/about-me': '/about/teaching',
  '/teaching-learning/links': '/teaching/resources',
  
  // Work and portfolio
  '/me/work': '/work',
  '/me/work/portfolio-case-study': '/work/portfolio-study',
  '/me/weekly-links-roundup': '/links',
  
  // API redirects (preserve existing API routes)
  '/api/translate': '/api/translate',
  '/api/portfolio': '/api/portfolio', 
  '/api/auth': '/api/auth',
  '/api/contact': '/api/contact',
  '/api/health': '/api/health',
  '/api/backup': '/api/backup'
};

// Additional path patterns for dynamic redirects
const PATTERN_REDIRECTS = [
  {
    source: /^\/tools\/built\/(.+)$/,
    destination: '/projects/$1',
    permanent: true
  },
  {
    source: /^\/tools\/strategies\/(.+)$/,
    destination: '/tools/strategy/$1',
    permanent: true
  },
  {
    source: /^\/tools\/what-i-use\/(.+)$/,
    destination: '/tools/resources/$1',
    permanent: true
  },
  {
    source: /^\/writing\/poetry\/(.+)$/,
    destination: '/poetry/$1',
    permanent: true
  },
  {
    source: /^\/teaching-learning\/sla-theory\/(.+)$/,
    destination: '/teaching/theory/$1',
    permanent: true
  },
  {
    source: /^\/blog\/(.+)$/,
    destination: '/posts/$1',
    permanent: false
  },
  {
    source: /^\/es\/(.+)$/,
    destination: '/es/$1',
    permanent: false
  }
];

// Trailing slash configuration
const TRAILING_SLASH_CONFIG = {
  addTrailingSlash: false, // Next.js default behavior
  removeTrailingSlash: true, // Remove trailing slashes for consistency
  exceptions: ['/admin/', '/api/'] // Keep trailing slashes for these paths
};

export function middleware(request) {
  const { pathname, search } = request.nextUrl;
  const url = request.nextUrl.clone();
  
  // Handle trailing slash normalization
  const normalizedPath = normalizeTrailingSlash(pathname);
  if (normalizedPath !== pathname) {
    url.pathname = normalizedPath;
    return NextResponse.redirect(url, 301);
  }
  
  // Check direct URL mappings first
  const directMapping = URL_MAPPINGS[pathname];
  if (directMapping && directMapping !== pathname) {
    url.pathname = directMapping;
    return NextResponse.redirect(url, 301);
  }
  
  // Check pattern-based redirects
  for (const pattern of PATTERN_REDIRECTS) {
    const match = pathname.match(pattern.source);
    if (match) {
      const destination = pattern.destination.replace(/\$([0-9]+)/g, (_, num) => {
        return match[parseInt(num)] || '';
      });
      
      url.pathname = destination;
      const status = pattern.permanent ? 301 : 302;
      return NextResponse.redirect(url, status);
    }
  }
  
  // Handle sitemap.xml generation
  if (pathname === '/sitemap.xml') {
    return handleSitemap(request);
  }
  
  // Handle robots.txt
  if (pathname === '/robots.txt') {
    return handleRobotsTxt(request);
  }
  
  // Handle admin panel routing
  if (pathname.startsWith('/admin') && !pathname.includes('.')) {
    // Ensure admin routes are handled by the admin app
    if (pathname === '/admin') {
      url.pathname = '/admin/dashboard';
      return NextResponse.redirect(url, 302);
    }
  }
  
  // Continue to Next.js routing
  return NextResponse.next();
}

/**
 * Normalize trailing slashes based on configuration
 */
function normalizeTrailingSlash(pathname) {
  // Check exceptions first
  const isException = TRAILING_SLASH_CONFIG.exceptions.some(exception => 
    pathname.startsWith(exception)
  );
  
  if (isException) {
    return pathname;
  }
  
  // Remove trailing slash (except root)
  if (TRAILING_SLASH_CONFIG.removeTrailingSlash && pathname.length > 1 && pathname.endsWith('/')) {
    return pathname.slice(0, -1);
  }
  
  // Add trailing slash if configured
  if (TRAILING_SLASH_CONFIG.addTrailingSlash && !pathname.endsWith('/') && !pathname.includes('.')) {
    return pathname + '/';
  }
  
  return pathname;
}

/**
 * Handle dynamic sitemap.xml generation
 */
function handleSitemap(request) {
  // This will be handled by the sitemap generator API route
  const url = request.nextUrl.clone();
  url.pathname = '/api/sitemap';
  return NextResponse.rewrite(url);
}

/**
 * Handle robots.txt generation
 */
function handleRobotsTxt(request) {
  // This will be handled by the robots API route
  const url = request.nextUrl.clone();
  url.pathname = '/api/robots';
  return NextResponse.rewrite(url);
}

// Configure middleware to run on specific paths
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public (public files)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|public|static|images|fonts|media).*)',
    '/sitemap.xml',
    '/robots.txt'
  ],
};
