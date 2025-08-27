import './globals.css';
import { Layout } from '../components/Layout';
import PWAInstallPrompt from '../components/PWAInstallPrompt';

export const metadata = {
  title: 'Brandon JP Lambert - Educator & Developer',
  description: 'Portfolio of Brandon JP Lambert: Educator, Developer & Language Learning Enthusiast. Explore innovative teaching tools, educational technology, and language learning resources.',
  keywords: 'education, language learning, web development, teaching tools, educational technology',
  authors: [{ name: 'Brandon JP Lambert' }],
  creator: 'Brandon JP Lambert',
  publisher: 'Brandon JP Lambert',
  robots: 'index, follow',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Brandon Lambert Portfolio',
    startupImage: [
      {
        media: '(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2)',
        url: '/images/pwa/apple-launch-640x1136.png',
      },
      {
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
        url: '/images/pwa/apple-launch-750x1334.png',
      },
      {
        media: '(device-width: 414px) and (device-height: 736px) and (-webkit-device-pixel-ratio: 3)',
        url: '/images/pwa/apple-launch-1242x2208.png',
      },
      {
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
        url: '/images/pwa/apple-launch-1125x2436.png',
      },
    ],
  },
  openGraph: {
    title: 'Brandon JP Lambert - Educator & Developer',
    description: 'Portfolio showcasing innovative educational tools and language learning resources.',
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'es_ES',
    siteName: 'Brandon Lambert Portfolio',
    images: [
      {
        url: '/images/pwa/og-image.svg',
        width: 1200,
        height: 630,
        alt: 'Brandon JP Lambert - Educator & Developer Portfolio',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Brandon JP Lambert - Educator & Developer',
    description: 'Portfolio showcasing innovative educational tools and language learning resources.',
    creator: '@brandonjplambert',
    images: ['/images/pwa/og-image.svg'],
  },
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
    userScalable: true,
    viewportFit: 'cover',
  },
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#4A90E2' },
    { media: '(prefers-color-scheme: dark)', color: '#5BA3F5' }
  ],
  icons: {
    icon: [
      { url: '/images/pwa/icon-32x32.svg', sizes: '32x32', type: 'image/svg+xml' },
      { url: '/images/pwa/icon-192x192.svg', sizes: '192x192', type: 'image/svg+xml' },
      { url: '/images/pwa/icon-512x512.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
    apple: [
      { url: '/images/pwa/apple-touch-icon.svg', sizes: '180x180', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Brandon Lambert" />
        <meta name="msapplication-TileColor" content="#4A90E2" />
        <meta name="msapplication-config" content="/browserconfig.xml" />
        
        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        
        {/* Critical CSS inlined */}
        <style dangerouslySetInnerHTML={{
          __html: `
            *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
            html{font-size:16px;line-height:1.5;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
            body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,sans-serif;background-color:#ffffff;color:#0f172a;overflow-x:hidden}
            .layout{min-height:100vh;display:flex;flex-direction:column}
            .header{position:sticky;top:0;z-index:50;background-color:rgba(255,255,255,0.95);backdrop-filter:blur(12px);border-bottom:1px solid #e2e8f0}
            .nav{display:flex;justify-content:space-between;align-items:center;padding:1rem 2rem;max-width:1200px;margin:0 auto;width:100%}
            .hero{display:flex;align-items:center;justify-content:center;min-height:70vh;text-align:center;padding:2rem}
            .btn{display:inline-flex;align-items:center;justify-content:center;padding:0.75rem 1.5rem;font-weight:600;text-decoration:none;border-radius:0.5rem;transition:all 0.15s ease;border:2px solid transparent;cursor:pointer;font-size:1rem}
            .btn-primary{background-color:#2563eb;color:white}
            .btn-primary:hover{background-color:#1d4ed8;transform:translateY(-1px)}
            @media(max-width:768px){.nav{padding:1rem}.hero{min-height:60vh;padding:1rem}}
          `
        }} />
        
        {/* Load fonts asynchronously */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <noscript>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        </noscript>
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      // SW registered successfully
                    })
                    .catch(function(registrationError) {
                      // SW registration failed
                    });
                });
              }
            `,
          }}
        />
        
        {/* Theme flash prevention script */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('theme');
                  var systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                  var isDark = theme === 'dark' || (!theme && systemDark);
                  
                  if (isDark) {
                    document.documentElement.setAttribute('data-theme', 'dark');
                  } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        
        {/* Structured data for SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'Person',
              name: 'Brandon JP Lambert',
              jobTitle: 'Educator & Developer',
              description: 'Language Learning Enthusiast and Educational Technology Developer',
              url: 'https://brandonjplambert.com',
              sameAs: [
                'https://linkedin.com/in/brandonjplambert',
                'https://github.com/brandonjplambert',
                'https://twitter.com/brandonjplambert'
              ],
              knowsAbout: [
                'Education',
                'Language Learning',
                'Web Development',
                'Educational Technology',
                'Teaching Methods'
              ]
            })
          }}
        />
      </head>
      
      <body className="antialiased">
        <Layout>{children}</Layout>
        <PWAInstallPrompt />
        
        {/* PWA Install Prompt and Notifications */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // iOS PWA detection and install prompt
              window.addEventListener('load', function() {
                // Check if running as PWA
                const isStandalone = window.matchMedia('(display-mode: standalone)').matches || 
                                   window.navigator.standalone === true;
                
                if (isStandalone) {
                  document.body.classList.add('pwa-mode');
                  // Running as PWA
                }
                
                // Performance observer for PWA metrics
                if ('PerformanceObserver' in window) {
                  const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.name === 'first-contentful-paint') {
                        // FCP: entry.startTime
                      }
                    }
                  });
                  observer.observe({ entryTypes: ['paint'] });
                }
              });
            `,
          }}
        />
        
        {/* Analytics and tracking scripts can be added here */}
      </body>
    </html>
  )
}