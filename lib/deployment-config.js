/**
 * Deployment Configuration for Static Sites
 * Platform-specific configurations for deploying static Next.js sites
 */

/**
 * Netlify deployment configuration
 */
export const netlifyConfig = {
  build: {
    command: "npm run build:deploy",
    publish: "out"
  },
  
  headers: [
    {
      for: "/*",
      values: {
        "X-Frame-Options": "DENY",
        "X-Content-Type-Options": "nosniff",
        "X-XSS-Protection": "1; mode=block",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()"
      }
    },
    {
      for: "/_next/static/*",
      values: {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      for: "/images/*",
      values: {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      for: "/*.js",
      values: {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    },
    {
      for: "/*.css",
      values: {
        "Cache-Control": "public, max-age=31536000, immutable"
      }
    }
  ],
  
  redirects: [
    {
      from: "/make/*",
      to: "/writing/:splat",
      status: 301
    },
    {
      from: "/learn/*",
      to: "/tools/:splat",
      status: 301
    },
    {
      from: "/posts/*",
      to: "/blog/:splat",
      status: 301
    }
  ]
};

/**
 * Vercel deployment configuration
 */
export const vercelConfig = {
  buildCommand: "npm run build:deploy",
  outputDirectory: "out",
  installCommand: "npm install",
  
  headers: [
    {
      source: "/(.*)",
      headers: [
        {
          key: "X-Frame-Options",
          value: "DENY"
        },
        {
          key: "X-Content-Type-Options", 
          value: "nosniff"
        },
        {
          key: "X-XSS-Protection",
          value: "1; mode=block"
        },
        {
          key: "Referrer-Policy",
          value: "strict-origin-when-cross-origin"
        }
      ]
    },
    {
      source: "/_next/static/(.*)",
      headers: [
        {
          key: "Cache-Control",
          value: "public, max-age=31536000, immutable"
        }
      ]
    }
  ],
  
  redirects: [
    {
      source: "/make/:path*",
      destination: "/writing/:path*",
      permanent: true
    },
    {
      source: "/learn/:path*",
      destination: "/tools/:path*", 
      permanent: true
    }
  ]
};

/**
 * GitHub Pages deployment configuration
 */
export const githubPagesConfig = {
  buildCommand: "npm run build:deploy",
  outputDirectory: "out",
  
  // GitHub Pages specific files
  additionalFiles: [
    {
      name: ".nojekyll",
      content: ""
    },
    {
      name: "404.html",
      content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <title>Page Not Found</title>
    <script type="text/javascript">
        // GitHub Pages SPA redirect
        const path = window.location.pathname.slice(1);
        if (path) {
            window.location.replace(\`/\${window.location.search || ''}\#/\${path}\`);
        }
    </script>
</head>
<body>
    <noscript>
        <p>This site requires JavaScript to be enabled.</p>
    </noscript>
</body>
</html>`
    }
  ]
};

/**
 * AWS S3 + CloudFront configuration
 */
export const awsConfig = {
  s3: {
    bucket: "your-portfolio-bucket",
    region: "us-east-1",
    publicRead: true,
    
    website: {
      indexDocument: "index.html",
      errorDocument: "404.html"
    }
  },
  
  cloudFront: {
    priceClass: "PriceClass_100",
    compress: true,
    
    cacheBehaviors: [
      {
        pathPattern: "/_next/static/*",
        cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad", // CachingOptimized
        ttl: 31536000
      },
      {
        pathPattern: "/images/*",
        cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        ttl: 31536000
      },
      {
        pathPattern: "*.js",
        cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        ttl: 31536000
      },
      {
        pathPattern: "*.css",
        cachePolicyId: "4135ea2d-6df8-44a3-9df3-4b5a84be39ad",
        ttl: 31536000
      }
    ],
    
    customErrorResponses: [
      {
        errorCode: 404,
        responsePagePath: "/404.html",
        responseCode: 404
      }
    ]
  }
};

/**
 * Generate platform-specific deployment files
 */
export function generateDeploymentFiles(platform = 'netlify', outputDir = 'out') {
  switch (platform.toLowerCase()) {
    case 'netlify':
      return generateNetlifyFiles(outputDir);
    case 'vercel':
      return generateVercelFiles(outputDir);
    case 'github':
    case 'github-pages':
      return generateGitHubPagesFiles(outputDir);
    default:
      console.warn(`Unknown platform: ${platform}`);
      return false;
  }
}

function generateNetlifyFiles(outputDir) {
  const fs = await import('fs');
  const path = await import('path');
  
  // Generate _headers file
  const headers = netlifyConfig.headers
    .map(header => `${header.for}\n${Object.entries(header.values).map(([k,v]) => `  ${k}: ${v}`).join('\n')}`)
    .join('\n\n');
  
  fs.writeFileSync(path.join(outputDir, '_headers'), headers);
  
  // Generate _redirects file  
  const redirects = netlifyConfig.redirects
    .map(r => `${r.from} ${r.to} ${r.status}`)
    .join('\n');
    
  fs.writeFileSync(path.join(outputDir, '_redirects'), redirects);
  
  console.log('✅ Generated Netlify deployment files');
  return true;
}

function generateVercelFiles(outputDir) {
  const fs = await import('fs');
  const path = await import('path');
  
  fs.writeFileSync(
    path.join(outputDir, 'vercel.json'),
    JSON.stringify(vercelConfig, null, 2)
  );
  
  console.log('✅ Generated Vercel deployment files');
  return true;
}

function generateGitHubPagesFiles(outputDir) {
  const fs = await import('fs');
  const path = await import('path');
  
  githubPagesConfig.additionalFiles.forEach(file => {
    fs.writeFileSync(path.join(outputDir, file.name), file.content);
  });
  
  console.log('✅ Generated GitHub Pages deployment files');
  return true;
}