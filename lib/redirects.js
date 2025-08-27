/**
 * Centralized URL Redirect Configuration
 * Manages all Hugo to Next.js URL mappings and redirects
 */

// Main redirect configuration exported for use across the application
export const REDIRECT_CONFIG = {
  // Static URL mappings (Hugo -> Next.js)
  staticMappings: {
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
    
    // Specific content redirects
    '/tools/built/react-dashboard-project': '/projects/react-dashboard',
    '/tools/built/vocab-tool': '/tools/vocabulary',
    '/tools/built/langtool': '/tools/language',
    '/tools/built/subjunctive-practice': '/tools/grammar',
    '/tools/built/conjugation-gui': '/tools/conjugation',
    '/me/work': '/work',
    '/me/work/portfolio-case-study': '/work/portfolio-study',
    '/me/weekly-links-roundup': '/links',
    '/teaching-learning/about-me': '/about/teaching',
    '/teaching-learning/links': '/teaching/resources'
  },
  
  // Dynamic redirect patterns
  dynamicPatterns: [
    {
      source: /^\/tools\/built\/(.+)$/,
      destination: '/projects/$1',
      permanent: true,
      description: 'Hugo tools/built -> Next.js projects'
    },
    {
      source: /^\/tools\/strategies\/(.+)$/,
      destination: '/tools/strategy/$1', 
      permanent: true,
      description: 'Hugo strategies -> Next.js strategy'
    },
    {
      source: /^\/tools\/what-i-use\/(.+)$/,
      destination: '/tools/resources/$1',
      permanent: true,
      description: 'Hugo what-i-use -> Next.js resources'
    },
    {
      source: /^\/writing\/poetry\/(.+)$/,
      destination: '/poetry/$1',
      permanent: true,
      description: 'Hugo poetry paths -> simplified poetry'
    },
    {
      source: /^\/teaching-learning\/sla-theory\/(.+)$/,
      destination: '/teaching/theory/$1',
      permanent: true,
      description: 'Hugo SLA theory -> Next.js teaching theory'
    },
    {
      source: /^\/blog\/(.+)$/,
      destination: '/posts/$1',
      permanent: false,
      description: 'Blog posts routing flexibility'
    },
    {
      source: /^\/es\/(.+)$/,
      destination: '/es/$1',
      permanent: false,
      description: 'Spanish content preservation'
    }
  ],
  
  // Trailing slash configuration
  trailingSlash: {
    addTrailingSlash: false,
    removeTrailingSlash: true,
    exceptions: ['/admin/', '/api/']
  },
  
  // Status codes for different redirect types
  statusCodes: {
    permanent: 301,
    temporary: 302,
    seeOther: 303
  }
};

// SEO-friendly redirect metadata
export const REDIRECT_METADATA = {
  '/tools': {
    title: 'Language Learning Tools & Resources',
    description: 'Comprehensive collection of language learning tools and strategies',
    canonical: '/tools'
  },
  '/writing': {
    title: 'Writing & Creative Work',
    description: 'Collection of creative writing, poetry, and linguistic analysis',
    canonical: '/writing'
  },
  '/teaching': {
    title: 'Teaching & Learning Philosophy', 
    description: 'Educational philosophy and second language acquisition theory',
    canonical: '/teaching'
  },
  '/about': {
    title: 'About Brandon JP Lambert',
    description: 'Language educator, developer, and creative professional',
    canonical: '/about'
  },
  '/gallery': {
    title: 'Photography & Visual Art',
    description: 'Photography portfolio and visual creative work',
    canonical: '/gallery'
  },
  '/projects': {
    title: 'Development Projects & Tools',
    description: 'Software development projects and educational tools',
    canonical: '/projects'
  }
};

// Utility functions for redirect handling
export const redirectUtils = {
  /**
   * Check if a path should be redirected
   * @param {string} pathname - The current pathname
   * @returns {Object|null} Redirect information or null
   */
  getRedirect(pathname) {
    // Check static mappings first
    const staticRedirect = REDIRECT_CONFIG.staticMappings[pathname];
    if (staticRedirect && staticRedirect !== pathname) {
      return {
        destination: staticRedirect,
        permanent: true,
        type: 'static'
      };
    }
    
    // Check dynamic patterns
    for (const pattern of REDIRECT_CONFIG.dynamicPatterns) {
      const match = pathname.match(pattern.source);
      if (match) {
        const destination = pattern.destination.replace(/\$([0-9]+)/g, (_, num) => {
          return match[parseInt(num)] || '';
        });
        
        return {
          destination,
          permanent: pattern.permanent,
          type: 'dynamic',
          pattern: pattern.description
        };
      }
    }
    
    return null;
  },
  
  /**
   * Normalize trailing slashes
   * @param {string} pathname - The current pathname
   * @returns {string} Normalized pathname
   */
  normalizeTrailingSlash(pathname) {
    const config = REDIRECT_CONFIG.trailingSlash;
    
    // Check exceptions
    const isException = config.exceptions.some(exception => 
      pathname.startsWith(exception)
    );
    
    if (isException) {
      return pathname;
    }
    
    // Remove trailing slash (except root)
    if (config.removeTrailingSlash && pathname.length > 1 && pathname.endsWith('/')) {
      return pathname.slice(0, -1);
    }
    
    // Add trailing slash if configured
    if (config.addTrailingSlash && !pathname.endsWith('/') && !pathname.includes('.')) {
      return pathname + '/';
    }
    
    return pathname;
  },
  
  /**
   * Get metadata for a redirected path
   * @param {string} pathname - The pathname
   * @returns {Object|null} Metadata object or null
   */
  getMetadata(pathname) {
    return REDIRECT_METADATA[pathname] || null;
  },
  
  /**
   * Generate redirect report for testing
   * @returns {Object} Redirect configuration report
   */
  generateReport() {
    return {
      staticRedirectCount: Object.keys(REDIRECT_CONFIG.staticMappings).length,
      dynamicPatternCount: REDIRECT_CONFIG.dynamicPatterns.length,
      metadataCount: Object.keys(REDIRECT_METADATA).length,
      trailingSlashConfig: REDIRECT_CONFIG.trailingSlash,
      lastUpdated: new Date().toISOString()
    };
  }
};

// Export individual components for specific use cases
export const {
  staticMappings,
  dynamicPatterns,
  trailingSlash,
  statusCodes
} = REDIRECT_CONFIG;

export default REDIRECT_CONFIG;
