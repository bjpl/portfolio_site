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
        
        {/* Preload critical fonts */}
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        <link
          rel="preload"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap"
          as="style"
          onLoad="this.onload=null;this.rel='stylesheet'"
        />
        
        {/* Service Worker Registration */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js')
                    .then(function(registration) {
                      console.log('SW registered: ', registration);
                    })
                    .catch(function(registrationError) {
                      console.log('SW registration failed: ', registrationError);
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
                  console.log('Running as PWA');
                }
                
                // Performance observer for PWA metrics
                if ('PerformanceObserver' in window) {
                  const observer = new PerformanceObserver((list) => {
                    for (const entry of list.getEntries()) {
                      if (entry.name === 'first-contentful-paint') {
                        console.log('FCP:', entry.startTime);
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