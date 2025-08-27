# Domain and DNS Configuration Guide

## Overview

This guide covers complete domain and DNS configuration for the portfolio site deployment across multiple platforms (Netlify, Vercel, custom domains).

## Domain Setup Options

### Option 1: Netlify Domain Configuration

#### 1. Custom Domain Setup
1. Go to Netlify Dashboard → Site Settings → Domain management
2. Click "Add custom domain"
3. Enter your domain (e.g., `yourportfolio.com`)
4. Verify domain ownership

#### 2. DNS Configuration
```
# Add these DNS records to your domain provider:

# Primary domain (A records)
Type: A
Host: @
Value: 75.2.60.5

# Subdomain (CNAME)
Type: CNAME  
Host: www
Value: your-site-name.netlify.app

# Additional A records for IPv6 (optional)
Type: AAAA
Host: @
Value: 2600:1f14:e22:d200::2

# Email forwarding (if needed)
Type: MX
Host: @
Value: 10 mail.your-provider.com
```

#### 3. SSL Certificate
- Automatic SSL certificate provision via Let's Encrypt
- Force HTTPS redirect in Netlify settings
- HSTS headers configured in netlify.toml

### Option 2: Vercel Domain Configuration

#### 1. Custom Domain Setup
1. Go to Vercel Dashboard → Project Settings → Domains
2. Add your domain
3. Configure DNS records as provided

#### 2. DNS Configuration
```
# Add these DNS records to your domain provider:

# Primary domain
Type: A
Host: @
Value: 76.76.19.61

# Subdomain
Type: CNAME
Host: www  
Value: cname.vercel-dns.com

# Alternative CNAME setup (if using Vercel nameservers)
Type: CNAME
Host: @
Value: alias.vercel-dns.com
```

#### 3. SSL Certificate
- Automatic SSL certificate provision
- Built-in HTTPS enforcement
- HTTP/2 support enabled

### Option 3: Custom Domain Provider Configuration

#### Popular Domain Providers Setup

##### Cloudflare DNS
```
# Cloudflare DNS Records
Type: A
Name: @
Content: 75.2.60.5 (Netlify) or 76.76.19.61 (Vercel)
Proxy: Enabled (Orange cloud)

Type: CNAME
Name: www
Content: your-site.netlify.app or your-site.vercel.app
Proxy: Enabled (Orange cloud)

# Additional Cloudflare settings:
- SSL/TLS: Full (strict)
- Always Use HTTPS: On
- Minimum TLS Version: 1.2
- HSTS: Enabled
```

##### Namecheap DNS
```
Type: A Record
Host: @
Value: 75.2.60.5
TTL: Automatic

Type: CNAME Record
Host: www
Value: your-site.netlify.app
TTL: Automatic
```

##### Google Domains DNS
```
Type: A
Name: @
Data: 75.2.60.5
TTL: 3600

Type: CNAME
Name: www
Data: your-site.netlify.app
TTL: 3600
```

## DNS Propagation and Verification

### Checking DNS Propagation
```bash
# Check DNS propagation globally
dig +short yourportfolio.com
nslookup yourportfolio.com

# Check specific DNS servers
dig @8.8.8.8 yourportfolio.com
dig @1.1.1.1 yourportfolio.com

# Online tools for DNS propagation checking:
# - https://dnschecker.org/
# - https://whatsmydns.net/
# - https://www.whatsmydns.com/
```

### DNS Verification Script
```javascript
// scripts/verify-dns.js
const dns = require('dns');
const util = require('util');

const lookup = util.promisify(dns.lookup);
const resolve4 = util.promisify(dns.resolve4);
const resolveCname = util.promisify(dns.resolveCname);

async function verifyDNS(domain) {
  console.log(`Verifying DNS for ${domain}...`);
  
  try {
    // Check A record
    const aRecords = await resolve4(domain);
    console.log(`A Records: ${aRecords.join(', ')}`);
    
    // Check CNAME for www
    try {
      const cnameRecords = await resolveCname(`www.${domain}`);
      console.log(`CNAME Records (www): ${cnameRecords.join(', ')}`);
    } catch (error) {
      console.log('No CNAME record found for www subdomain');
    }
    
    // Check IP resolution
    const result = await lookup(domain);
    console.log(`Resolved IP: ${result.address}`);
    
  } catch (error) {
    console.error(`DNS verification failed: ${error.message}`);
  }
}

// Usage: node scripts/verify-dns.js yourportfolio.com
if (require.main === module) {
  const domain = process.argv[2];
  if (domain) {
    verifyDNS(domain);
  } else {
    console.log('Usage: node verify-dns.js <domain>');
  }
}
```

## Subdomain Configuration

### Admin Panel Subdomain
```
# Option 1: admin.yourportfolio.com
Type: CNAME
Host: admin
Value: your-site.netlify.app

# Option 2: Use main domain with /admin path
# Already configured in netlify.toml redirects
```

### API Subdomain
```
# api.yourportfolio.com (if separating API)
Type: CNAME
Host: api
Value: your-api-deployment.herokuapp.com
```

### Blog Subdomain
```
# blog.yourportfolio.com (if using separate blog platform)
Type: CNAME
Host: blog
Value: your-blog-platform.com
```

## Email Configuration

### Email Forwarding Setup
```
# MX Records for email forwarding
Type: MX
Host: @
Value: 10 mx1.forwardemail.net
Priority: 10

Type: MX
Host: @
Value: 20 mx2.forwardemail.net
Priority: 20

# TXT Record for SPF
Type: TXT
Host: @
Value: "v=spf1 include:spf.forwardemail.net ~all"

# DMARC Record
Type: TXT
Host: _dmarc
Value: "v=DMARC1; p=quarantine; rua=mailto:admin@yourportfolio.com"
```

### Contact Form Email Configuration
```javascript
// In netlify/functions/contact.js or equivalent
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'admin@yourportfolio.com';
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: true,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  }
};
```

## CDN and Performance Optimization

### Cloudflare Integration
```
# Cloudflare optimizations:
1. Enable "Auto Minify" for HTML, CSS, JS
2. Enable "Rocket Loader" for JS optimization
3. Set "Browser Cache TTL" to 4 hours
4. Enable "Always Online"
5. Configure "Page Rules" for static assets:
   - yourportfolio.com/css/* → Cache Everything
   - yourportfolio.com/js/* → Cache Everything
   - yourportfolio.com/images/* → Cache Everything
```

### Custom CDN Configuration
```
# If using custom CDN (AWS CloudFront, etc.)
CNAME: cdn.yourportfolio.com → d123456.cloudfront.net

# Update Hugo configuration
baseURL = "https://yourportfolio.com"
canonifyURLs = true

# Asset URLs in templates
{{ $css := resources.Get "css/main.css" | minify | fingerprint }}
<link rel="stylesheet" href="{{ $css.RelPermalink }}">
```

## SSL/TLS Configuration

### Let's Encrypt Certificate
```
# Automatic certificate renewal (handled by platform)
# Verify SSL certificate
openssl s_client -connect yourportfolio.com:443 -servername yourportfolio.com

# Check SSL certificate details
curl -I https://yourportfolio.com
```

### Custom SSL Certificate
```
# If using custom certificate:
1. Generate CSR (Certificate Signing Request)
2. Purchase SSL certificate from CA
3. Upload certificate to hosting platform
4. Configure HTTPS redirect
```

## Domain Monitoring

### DNS Monitoring Script
```javascript
// scripts/monitor-dns.js
const dns = require('dns');
const https = require('https');

class DNSMonitor {
  constructor(domain) {
    this.domain = domain;
    this.expectedIPs = ['75.2.60.5']; // Netlify IPs
  }
  
  async checkDNS() {
    try {
      const ips = await dns.promises.resolve4(this.domain);
      const isCorrect = this.expectedIPs.some(ip => ips.includes(ip));
      
      return {
        domain: this.domain,
        resolvedIPs: ips,
        expectedIPs: this.expectedIPs,
        isCorrect,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        domain: this.domain,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
  
  async checkSSL() {
    return new Promise((resolve) => {
      const options = {
        host: this.domain,
        port: 443,
        method: 'HEAD',
        rejectUnauthorized: false
      };
      
      const req = https.request(options, (res) => {
        const cert = res.socket.getPeerCertificate(true);
        const expiryDate = new Date(cert.valid_to);
        const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
        
        resolve({
          domain: this.domain,
          valid: res.socket.authorized,
          issuer: cert.issuer?.CN,
          expiryDate: cert.valid_to,
          daysUntilExpiry,
          timestamp: new Date().toISOString()
        });
      });
      
      req.on('error', (error) => {
        resolve({
          domain: this.domain,
          error: error.message,
          timestamp: new Date().toISOString()
        });
      });
      
      req.end();
    });
  }
}

module.exports = DNSMonitor;
```

## Troubleshooting Common Issues

### DNS Not Propagating
```
1. Check TTL values (lower = faster propagation)
2. Clear local DNS cache:
   - Windows: ipconfig /flushdns
   - macOS: sudo dscacheutil -flushcache
   - Linux: sudo systemctl restart systemd-resolved

3. Check with different DNS servers:
   - Google: 8.8.8.8, 8.8.4.4
   - Cloudflare: 1.1.1.1, 1.0.0.1
   - OpenDNS: 208.67.222.222, 208.67.220.220
```

### SSL Certificate Issues
```
1. Check certificate chain:
   openssl s_client -connect yourportfolio.com:443 -showcerts

2. Verify certificate matches domain:
   openssl x509 -in certificate.crt -text -noout

3. Check mixed content issues:
   - Ensure all resources load over HTTPS
   - Update hardcoded HTTP links
   - Use relative URLs where possible
```

### Email Not Working
```
1. Verify MX records:
   dig MX yourportfolio.com

2. Check SPF record:
   dig TXT yourportfolio.com

3. Test email delivery:
   - Use online tools like mail-tester.com
   - Check spam folders
   - Verify SMTP credentials
```

## Environment-Specific Configurations

### Development
```
# Local development with custom hosts
# /etc/hosts (Linux/macOS) or C:\Windows\System32\drivers\etc\hosts (Windows)
127.0.0.1 local.yourportfolio.com
127.0.0.1 admin.local.yourportfolio.com
```

### Staging
```
# Staging subdomain
Type: CNAME
Host: staging
Value: staging-branch--your-site.netlify.app
```

### Production
```
# Production configuration
Type: A
Host: @
Value: 75.2.60.5

Type: CNAME
Host: www
Value: your-site.netlify.app
```

## Security Considerations

### DNS Security
```
1. Enable DNSSEC if supported by domain provider
2. Use reputable DNS providers (Cloudflare, Google, AWS Route53)
3. Monitor for DNS hijacking
4. Implement CAA records:
   Type: CAA
   Host: @
   Value: 0 issue "letsencrypt.org"
```

### Domain Protection
```
1. Enable domain lock at registrar
2. Use strong passwords for domain account
3. Enable two-factor authentication
4. Set up domain expiration alerts
5. Consider domain privacy protection
```

This comprehensive guide covers all aspects of domain and DNS configuration for your portfolio site deployment. Update the specific values (domains, IPs, etc.) according to your actual setup.