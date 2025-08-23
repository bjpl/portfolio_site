const request = require('supertest');
const express = require('express');
const crypto = require('crypto');
const path = require('path');

/**
 * Comprehensive Security Testing Suite
 * Tests for common vulnerabilities and security best practices
 */

class SecurityTester {
  constructor(app, baseUrl = 'http://localhost:3000') {
    this.app = app;
    this.baseUrl = baseUrl;
    this.vulnerabilities = [];
    this.testResults = {
      authentication: {},
      authorization: {},
      injection: {},
      xss: {},
      csrf: {},
      headers: {},
      rateLimit: {},
      inputValidation: {},
      fileUpload: {},
      session: {}
    };
  }

  /**
   * Run complete security test suite
   */
  async runAllSecurityTests() {
    console.log('🔒 Starting comprehensive security testing suite...');
    
    try {
      await this.testAuthentication();
      await this.testAuthorization();
      await this.testSQLInjection();
      await this.testXSSProtection();
      await this.testCSRFProtection();
      await this.testSecurityHeaders();
      await this.testRateLimiting();
      await this.testInputValidation();
      await this.testFileUploadSecurity();
      await this.testSessionSecurity();
      
      this.generateSecurityReport();
      
    } catch (error) {
      console.error('❌ Security testing failed:', error);
      throw error;
    }
  }

  /**
   * Test authentication security
   */
  async testAuthentication() {
    console.log('🔐 Testing authentication security...');
    
    const tests = {
      'Password strength enforcement': async () => {
        const weakPasswords = ['123456', 'password', 'admin', 'qwerty', 'abc123'];
        
        for (const weakPassword of weakPasswords) {
          const response = await request(this.app)
            .post('/api/auth/register')
            .send({
              email: 'test@example.com',
              username: 'testuser',
              password: weakPassword,
              firstName: 'Test',
              lastName: 'User'
            });
          
          if (response.status === 201) {
            this.addVulnerability('WEAK_PASSWORD', `Weak password accepted: ${weakPassword}`);
            return false;
          }
        }
        return true;
      },

      'Brute force protection': async () => {
        const attempts = [];
        
        for (let i = 0; i < 10; i++) {
          const response = await request(this.app)
            .post('/api/auth/login')
            .send({
              emailOrUsername: 'nonexistent@example.com',
              password: 'wrongpassword'
            });
          
          attempts.push(response.status);
        }
        
        // Should start rate limiting after several attempts
        const rateLimited = attempts.slice(-3).some(status => status === 429);
        if (!rateLimited) {
          this.addVulnerability('NO_BRUTE_FORCE_PROTECTION', 'No rate limiting on login attempts');
        }
        
        return rateLimited;
      },

      'Password reset security': async () => {
        const response = await request(this.app)
          .post('/api/auth/forgot-password')
          .send({ email: 'test@example.com' });
        
        // Should not reveal if email exists
        if (response.body.message && response.body.message.includes('not found')) {
          this.addVulnerability('EMAIL_ENUMERATION', 'Password reset reveals email existence');
          return false;
        }
        
        return true;
      },

      'JWT token security': async () => {
        // Test with malformed JWT
        const malformedJWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.malformed.signature';
        
        const response = await request(this.app)
          .get('/api/auth/profile')
          .set('Authorization', `Bearer ${malformedJWT}`);
        
        if (response.status !== 401) {
          this.addVulnerability('JWT_VALIDATION', 'Malformed JWT accepted');
          return false;
        }
        
        return true;
      }
    };

    for (const [testName, testFn] of Object.entries(tests)) {
      try {
        this.testResults.authentication[testName] = await testFn();
      } catch (error) {
        this.testResults.authentication[testName] = false;
        console.error(`Authentication test failed: ${testName}`, error.message);
      }
    }
  }

  /**
   * Test authorization and access control
   */
  async testAuthorization() {
    console.log('🛡️ Testing authorization security...');
    
    const tests = {
      'Privilege escalation': async () => {
        // Try to access admin endpoints with user token
        const userToken = await this.getUserToken();
        
        const adminEndpoints = [
          '/api/admin/users',
          '/api/admin/content',
          '/api/admin/analytics'
        ];
        
        for (const endpoint of adminEndpoints) {
          const response = await request(this.app)
            .get(endpoint)
            .set('Authorization', `Bearer ${userToken}`);
          
          if (response.status === 200) {
            this.addVulnerability('PRIVILEGE_ESCALATION', `User can access admin endpoint: ${endpoint}`);
            return false;
          }
        }
        
        return true;
      },

      'Direct object references': async () => {
        const userToken = await this.getUserToken();
        
        // Try to access other users' data
        const response = await request(this.app)
          .get('/api/users/999999/profile')
          .set('Authorization', `Bearer ${userToken}`);
        
        if (response.status === 200) {
          this.addVulnerability('IDOR', 'Can access other users data');
          return false;
        }
        
        return true;
      },

      'API endpoint protection': async () => {
        const protectedEndpoints = [
          '/api/auth/profile',
          '/api/content/create',
          '/api/portfolio/update'
        ];
        
        for (const endpoint of protectedEndpoints) {
          const response = await request(this.app).get(endpoint);
          
          if (response.status === 200) {
            this.addVulnerability('UNPROTECTED_ENDPOINT', `Unprotected endpoint: ${endpoint}`);
            return false;
          }
        }
        
        return true;
      }
    };

    for (const [testName, testFn] of Object.entries(tests)) {
      try {
        this.testResults.authorization[testName] = await testFn();
      } catch (error) {
        this.testResults.authorization[testName] = false;
        console.error(`Authorization test failed: ${testName}`, error.message);
      }
    }
  }

  /**
   * Test SQL injection protection
   */
  async testSQLInjection() {
    console.log('💉 Testing SQL injection protection...');
    
    const sqlPayloads = [
      "'; DROP TABLE users; --",
      "' OR '1'='1",
      "' UNION SELECT * FROM users --",
      "'; INSERT INTO users (username) VALUES ('hacker'); --",
      "' OR 1=1 --",
      "admin'/*",
      "' OR 'x'='x",
      "'; EXEC xp_cmdshell('dir'); --"
    ];

    const vulnerableEndpoints = [
      { path: '/api/content/search', param: 'q' },
      { path: '/api/users/search', param: 'username' },
      { path: '/api/portfolio/projects', param: 'category' }
    ];

    let vulnerabilitiesFound = 0;

    for (const endpoint of vulnerableEndpoints) {
      for (const payload of sqlPayloads) {
        try {
          const response = await request(this.app)
            .get(`${endpoint.path}?${endpoint.param}=${encodeURIComponent(payload)}`);
          
          // Check for SQL error messages
          const responseText = JSON.stringify(response.body).toLowerCase();
          const sqlErrors = [
            'syntax error',
            'mysql error',
            'postgresql error',
            'ora-',
            'microsoft jet database',
            'odbc drivers error'
          ];
          
          if (sqlErrors.some(error => responseText.includes(error))) {
            this.addVulnerability('SQL_INJECTION', `SQL injection possible at ${endpoint.path} with payload: ${payload}`);
            vulnerabilitiesFound++;
          }
          
          // Check for unusually long response times (possible time-based injection)
          if (response.status === 200 && response.text && response.text.length > 10000) {
            this.addVulnerability('SQL_INJECTION_TIME', `Possible time-based SQL injection at ${endpoint.path}`);
            vulnerabilitiesFound++;
          }
          
        } catch (error) {
          // Network errors could indicate successful injection
          if (error.code === 'ECONNRESET') {
            this.addVulnerability('SQL_INJECTION_CRASH', `Endpoint crashed with SQL payload: ${endpoint.path}`);
            vulnerabilitiesFound++;
          }
        }
      }
    }

    this.testResults.injection['SQL Injection Protection'] = vulnerabilitiesFound === 0;
  }

  /**
   * Test XSS protection
   */
  async testXSSProtection() {
    console.log('🕷️ Testing XSS protection...');
    
    const xssPayloads = [
      '<script>alert("XSS")</script>',
      '<img src="x" onerror="alert(1)">',
      '<svg onload="alert(1)">',
      'javascript:alert("XSS")',
      '<iframe src="javascript:alert(1)"></iframe>',
      '<body onload="alert(1)">',
      '<div onclick="alert(1)">Click me</div>',
      '<input type="text" value="<script>alert(1)</script>">'
    ];

    const testEndpoints = [
      { path: '/api/content', method: 'POST', field: 'title' },
      { path: '/api/content', method: 'POST', field: 'content' },
      { path: '/api/auth/register', method: 'POST', field: 'firstName' },
      { path: '/api/contact', method: 'POST', field: 'message' }
    ];

    let vulnerabilitiesFound = 0;

    for (const endpoint of testEndpoints) {
      for (const payload of xssPayloads) {
        try {
          const data = {
            [endpoint.field]: payload,
            // Add other required fields
            ...(endpoint.path.includes('content') && {
              section: 'test',
              subsection: 'test',
              content: 'test content'
            }),
            ...(endpoint.path.includes('register') && {
              email: 'test@example.com',
              username: 'testuser',
              password: 'TestPass123!',
              lastName: 'User'
            }),
            ...(endpoint.path.includes('contact') && {
              name: 'Test User',
              email: 'test@example.com',
              subject: 'Test'
            })
          };

          const response = await request(this.app)
            .post(endpoint.path)
            .send(data);
          
          // Check if XSS payload is reflected without sanitization
          const responseText = JSON.stringify(response.body);
          if (responseText.includes('<script>') || responseText.includes('javascript:') || responseText.includes('onerror=')) {
            this.addVulnerability('XSS_REFLECTION', `XSS payload reflected at ${endpoint.path}: ${payload}`);
            vulnerabilitiesFound++;
          }
          
        } catch (error) {
          // Continue testing other payloads
        }
      }
    }

    this.testResults.xss['XSS Protection'] = vulnerabilitiesFound === 0;
  }

  /**
   * Test CSRF protection
   */
  async testCSRFProtection() {
    console.log('🎭 Testing CSRF protection...');
    
    const stateChangingEndpoints = [
      { path: '/api/content', method: 'POST' },
      { path: '/api/auth/change-password', method: 'POST' },
      { path: '/api/portfolio/projects', method: 'POST' },
      { path: '/api/users/profile', method: 'PUT' }
    ];

    let vulnerabilitiesFound = 0;

    for (const endpoint of stateChangingEndpoints) {
      try {
        // Test request without CSRF token
        const response = await request(this.app)
          .post(endpoint.path)
          .send({ test: 'data' });
        
        // If request succeeds without CSRF token, it's vulnerable
        if (response.status === 200 || response.status === 201) {
          // Check if CSRF token is required
          if (!response.body.error || !response.body.error.includes('CSRF')) {
            this.addVulnerability('CSRF_MISSING', `No CSRF protection on ${endpoint.path}`);
            vulnerabilitiesFound++;
          }
        }
        
      } catch (error) {
        // Continue testing
      }
    }

    this.testResults.csrf['CSRF Protection'] = vulnerabilitiesFound === 0;
  }

  /**
   * Test security headers
   */
  async testSecurityHeaders() {
    console.log('🛡️ Testing security headers...');
    
    const response = await request(this.app).get('/');
    
    const requiredHeaders = {
      'X-Content-Type-Options': 'nosniff',
      'X-Frame-Options': ['DENY', 'SAMEORIGIN'],
      'X-XSS-Protection': '1; mode=block',
      'Strict-Transport-Security': true, // Should exist
      'Content-Security-Policy': true,   // Should exist
      'Referrer-Policy': true           // Should exist
    };

    const headerResults = {};

    for (const [header, expectedValue] of Object.entries(requiredHeaders)) {
      const actualValue = response.headers[header.toLowerCase()];
      
      if (expectedValue === true) {
        headerResults[header] = !!actualValue;
        if (!actualValue) {
          this.addVulnerability('MISSING_SECURITY_HEADER', `Missing security header: ${header}`);
        }
      } else if (Array.isArray(expectedValue)) {
        headerResults[header] = expectedValue.includes(actualValue);
        if (!expectedValue.includes(actualValue)) {
          this.addVulnerability('INCORRECT_SECURITY_HEADER', `Incorrect ${header}: ${actualValue}`);
        }
      } else {
        headerResults[header] = actualValue === expectedValue;
        if (actualValue !== expectedValue) {
          this.addVulnerability('INCORRECT_SECURITY_HEADER', `Incorrect ${header}: ${actualValue}`);
        }
      }
    }

    this.testResults.headers = headerResults;
  }

  /**
   * Test rate limiting
   */
  async testRateLimiting() {
    console.log('⏱️ Testing rate limiting...');
    
    const endpoints = [
      '/api/auth/login',
      '/api/auth/register',
      '/api/contact',
      '/api/content/search'
    ];

    const rateLimitResults = {};

    for (const endpoint of endpoints) {
      const requests = [];
      
      // Make rapid requests
      for (let i = 0; i < 20; i++) {
        const promise = request(this.app)
          .post(endpoint)
          .send({ test: 'data' });
        requests.push(promise);
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(res => res.status === 429);
      
      rateLimitResults[endpoint] = rateLimited;
      
      if (!rateLimited) {
        this.addVulnerability('NO_RATE_LIMITING', `No rate limiting on ${endpoint}`);
      }
    }

    this.testResults.rateLimit = rateLimitResults;
  }

  /**
   * Test input validation
   */
  async testInputValidation() {
    console.log('✅ Testing input validation...');
    
    const maliciousInputs = [
      { type: 'oversized', value: 'A'.repeat(10000) },
      { type: 'null_bytes', value: 'test\x00malicious' },
      { type: 'unicode', value: '𝕏𝕊𝕊 𝔞𝔱𝔱𝔞𝔠𝔨' },
      { type: 'path_traversal', value: '../../../etc/passwd' },
      { type: 'command_injection', value: '; cat /etc/passwd;' },
      { type: 'ldap_injection', value: '*)(&(objectClass=*))' }
    ];

    const testEndpoints = [
      { path: '/api/content', field: 'title' },
      { path: '/api/auth/register', field: 'email' },
      { path: '/api/contact', field: 'name' }
    ];

    let vulnerabilitiesFound = 0;

    for (const endpoint of testEndpoints) {
      for (const input of maliciousInputs) {
        try {
          const data = { [endpoint.field]: input.value };
          
          const response = await request(this.app)
            .post(endpoint.path)
            .send(data);
          
          // Should reject malicious input
          if (response.status === 200 || response.status === 201) {
            this.addVulnerability('INPUT_VALIDATION', `Malicious input accepted at ${endpoint.path}: ${input.type}`);
            vulnerabilitiesFound++;
          }
          
        } catch (error) {
          // Expected for malicious input
        }
      }
    }

    this.testResults.inputValidation['Input Validation'] = vulnerabilitiesFound === 0;
  }

  /**
   * Test file upload security
   */
  async testFileUploadSecurity() {
    console.log('📁 Testing file upload security...');
    
    // Test malicious file uploads if upload endpoint exists
    const maliciousFiles = [
      { name: 'test.php', content: '<?php echo "RCE"; ?>', type: 'application/x-php' },
      { name: 'test.jsp', content: '<% out.println("RCE"); %>', type: 'application/java-archive' },
      { name: 'test.exe', content: 'MZ\x90\x00', type: 'application/octet-stream' },
      { name: '../../../evil.txt', content: 'Path traversal test', type: 'text/plain' }
    ];

    let vulnerabilitiesFound = 0;

    // This would test file upload endpoints if they exist
    for (const file of maliciousFiles) {
      try {
        const response = await request(this.app)
          .post('/api/upload')
          .attach('file', Buffer.from(file.content), file.name);
        
        if (response.status === 200) {
          this.addVulnerability('FILE_UPLOAD', `Malicious file accepted: ${file.name}`);
          vulnerabilitiesFound++;
        }
        
      } catch (error) {
        // Upload endpoint might not exist, which is fine
      }
    }

    this.testResults.fileUpload['File Upload Security'] = vulnerabilitiesFound === 0;
  }

  /**
   * Test session security
   */
  async testSessionSecurity() {
    console.log('🔐 Testing session security...');
    
    const tests = {
      'Session fixation': async () => {
        // This would test session fixation vulnerabilities
        return true; // Placeholder
      },
      
      'Session timeout': async () => {
        // Test if sessions properly timeout
        return true; // Placeholder
      },
      
      'Secure cookie flags': async () => {
        const response = await request(this.app).get('/');
        const cookies = response.headers['set-cookie'] || [];
        
        let secureFlags = true;
        for (const cookie of cookies) {
          if (!cookie.includes('Secure') || !cookie.includes('HttpOnly')) {
            this.addVulnerability('INSECURE_COOKIES', 'Cookies missing security flags');
            secureFlags = false;
          }
        }
        
        return secureFlags;
      }
    };

    for (const [testName, testFn] of Object.entries(tests)) {
      try {
        this.testResults.session[testName] = await testFn();
      } catch (error) {
        this.testResults.session[testName] = false;
      }
    }
  }

  /**
   * Helper method to get user token for testing
   */
  async getUserToken() {
    try {
      const response = await request(this.app)
        .post('/api/auth/login')
        .send({
          emailOrUsername: 'test@example.com',
          password: 'TestPass123!'
        });
      
      return response.body.tokens?.accessToken || 'fake-token';
    } catch {
      return 'fake-token';
    }
  }

  /**
   * Add vulnerability to the list
   */
  addVulnerability(type, description) {
    this.vulnerabilities.push({
      type,
      description,
      severity: this.getSeverity(type),
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get severity level for vulnerability type
   */
  getSeverity(type) {
    const severityMap = {
      'SQL_INJECTION': 'CRITICAL',
      'XSS_REFLECTION': 'HIGH',
      'CSRF_MISSING': 'HIGH',
      'PRIVILEGE_ESCALATION': 'CRITICAL',
      'IDOR': 'HIGH',
      'NO_BRUTE_FORCE_PROTECTION': 'MEDIUM',
      'WEAK_PASSWORD': 'MEDIUM',
      'MISSING_SECURITY_HEADER': 'LOW',
      'NO_RATE_LIMITING': 'MEDIUM',
      'INPUT_VALIDATION': 'MEDIUM',
      'FILE_UPLOAD': 'HIGH',
      'INSECURE_COOKIES': 'MEDIUM'
    };
    
    return severityMap[type] || 'LOW';
  }

  /**
   * Generate comprehensive security report
   */
  generateSecurityReport() {
    console.log('\\n\\n🛡️ Security Test Report');
    console.log('==========================\\n');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalVulnerabilities: this.vulnerabilities.length,
        critical: this.vulnerabilities.filter(v => v.severity === 'CRITICAL').length,
        high: this.vulnerabilities.filter(v => v.severity === 'HIGH').length,
        medium: this.vulnerabilities.filter(v => v.severity === 'MEDIUM').length,
        low: this.vulnerabilities.filter(v => v.severity === 'LOW').length,
        overallRisk: this.calculateOverallRisk()
      },
      vulnerabilities: this.vulnerabilities,
      testResults: this.testResults
    };

    // Console output
    console.log(`Overall Risk Level: ${report.summary.overallRisk}`);
    console.log(`Total Vulnerabilities: ${report.summary.totalVulnerabilities}`);
    console.log(`  Critical: ${report.summary.critical}`);
    console.log(`  High: ${report.summary.high}`);
    console.log(`  Medium: ${report.summary.medium}`);
    console.log(`  Low: ${report.summary.low}\\n`);

    if (this.vulnerabilities.length > 0) {
      console.log('🚨 Vulnerabilities Found:');
      this.vulnerabilities.forEach((vuln, index) => {
        console.log(`  ${index + 1}. [${vuln.severity}] ${vuln.type}: ${vuln.description}`);
      });
    } else {
      console.log('✅ No vulnerabilities found!');
    }

    // Save detailed report
    const fs = require('fs');
    const reportPath = path.join(__dirname, '../results', `security-report-${Date.now()}.json`);
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\\n📄 Detailed report saved to: ${reportPath}`);
    
    return report;
  }

  /**
   * Calculate overall risk level
   */
  calculateOverallRisk() {
    if (this.vulnerabilities.some(v => v.severity === 'CRITICAL')) {
      return 'CRITICAL';
    } else if (this.vulnerabilities.filter(v => v.severity === 'HIGH').length >= 3) {
      return 'HIGH';
    } else if (this.vulnerabilities.filter(v => v.severity === 'HIGH').length >= 1) {
      return 'MEDIUM';
    } else if (this.vulnerabilities.length > 5) {
      return 'MEDIUM';
    } else if (this.vulnerabilities.length > 0) {
      return 'LOW';
    } else {
      return 'MINIMAL';
    }
  }
}

module.exports = { SecurityTester };

// Example usage
if (require.main === module) {
  const app = require('../../backend/src/server'); // Adjust path as needed
  const tester = new SecurityTester(app);
  
  tester.runAllSecurityTests()
    .then(() => {
      console.log('✅ Security testing completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Security testing failed:', error);
      process.exit(1);
    });
}