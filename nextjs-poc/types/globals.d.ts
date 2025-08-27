// Global type definitions for the Next.js application

export {};

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Auth0 Environment Variables
      AUTH0_SECRET: string;
      AUTH0_BASE_URL: string;
      AUTH0_ISSUER_BASE_URL: string;
      AUTH0_CLIENT_ID: string;
      AUTH0_CLIENT_SECRET: string;
      
      // Supabase Environment Variables
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      SUPABASE_SERVICE_ROLE_KEY?: string;
      
      // Application Environment Variables
      NEXT_PUBLIC_APP_ENV: 'development' | 'staging' | 'production';
      NEXT_PUBLIC_APP_URL: string;
      
      // Database
      DATABASE_URL?: string;
      
      // Analytics
      NEXT_PUBLIC_GA_MEASUREMENT_ID?: string;
    }
  }

  // Extend Window interface if needed
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

// Type definitions for custom props
export interface BasePageProps {
  params: {
    locale: string;
  };
}

export interface BaseLayoutProps {
  children: React.ReactNode;
  params: {
    locale: string;
  };
}

// Common utility types
export type Locale = 'en' | 'es';

export interface TranslationNamespace {
  common: any;
  navigation: any;
  auth: any;
  home: any;
  about: any;
  projects: any;
  admin: any;
  errors: any;
}