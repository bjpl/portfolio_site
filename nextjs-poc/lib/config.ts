// Configuration settings for the Next.js application

export const config = {
  // Application settings
  app: {
    name: 'Portfolio',
    description: 'Full-stack developer portfolio showcasing modern web development projects',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    env: process.env.NEXT_PUBLIC_APP_ENV || 'development',
  },
  
  // Internationalization settings
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'es'],
    localeDetection: true,
  },
  
  // Authentication settings
  auth: {
    provider: 'auth0',
    protectedRoutes: ['/admin', '/dashboard'],
    redirectAfterLogin: '/admin',
    redirectAfterLogout: '/',
  },
  
  // Database settings
  database: {
    provider: 'supabase',
    url: process.env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  },
  
  // API settings
  api: {
    baseUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    timeout: 10000,
    retries: 3,
  },
  
  // Feature flags
  features: {
    analytics: Boolean(process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID),
    darkMode: true,
    multiLanguage: true,
    adminPanel: true,
    blog: true,
    projects: true,
  },
  
  // UI settings
  ui: {
    theme: {
      colors: {
        primary: '#0066cc',
        secondary: '#6366f1',
        accent: '#f59e0b',
        neutral: '#64748b',
      },
      fonts: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Cal Sans', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Consolas', 'monospace'],
      },
    },
    animations: {
      enabled: true,
      duration: 300,
    },
  },
} as const;

// Environment validation
export function validateEnvironment() {
  const requiredEnvVars = [
    'AUTH0_SECRET',
    'AUTH0_BASE_URL',
    'AUTH0_ISSUER_BASE_URL',
    'AUTH0_CLIENT_ID',
    'AUTH0_CLIENT_SECRET',
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env.local file and ensure all required variables are set.'
    );
  }
}

// Development helper
export const isDevelopment = config.app.env === 'development';
export const isProduction = config.app.env === 'production';
export const isStaging = config.app.env === 'staging';