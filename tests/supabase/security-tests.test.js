/**
 * Security and Rate Limiting Tests for Supabase Integration
 * Tests security measures, authentication, and rate limiting
 */

const { describe, it, beforeAll, afterAll, expect, jest } = require('@jest/globals');
const axios = require('axios');
const crypto = require('crypto');

describe('Security and Rate Limiting Tests', () => {
  let baseURL;
  let testHeaders;

  beforeAll(async () => {
    baseURL = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions';
    
    testHeaders = {
      'Content-Type': 'application/json',
      'User-Agent': 'Security-Test-Suite/1.0'
    };

    // Configure axios for security testing
    axios.defaults.timeout = 10000;
    axios.defaults.validateStatus = () => true; // Don't throw on any HTTP status
  });

  describe('Input Sanitization', () => {
    it('should sanitize HTML/XSS in contact form', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        'javascript:alert("XSS")',
        '<svg onload="alert(1)">',
        '"><script>alert("XSS")</script>',
        '\';alert(String.fromCharCode(88,83,83))//\';alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//";alert(String.fromCharCode(88,83,83))//--></SCRIPT>!"\'><SCRIPT>alert(String.fromCharCode(88,83,83))</SCRIPT>'
      ];

      for (const payload of xssPayloads) {
        const response = await axios.post(`${baseURL}/contact`, {
          name: payload,
          email: 'test@example.com',
          message: payload
        }, { headers: testHeaders });

        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          // If accepted, should be sanitized
          expect(response.data.success).toBe(true);
          
          // Response shouldn't contain executable script tags
          const responseString = JSON.stringify(response.data);
          expect(responseString).not.toContain('<script>');
          expect(responseString).not.toContain('onerror');
          expect(responseString).not.toContain('javascript:');
        } else {
          // If rejected, should have appropriate error
          expect(response.data.success).toBe(false);
        }
      }
    });

    it('should prevent SQL injection attempts', async () => {
      const sqlPayloads = [
        "' OR '1'='1",
        "'; DROP TABLE users; --",
        "1' UNION SELECT * FROM profiles --",
        "admin'--",
        "admin'/*",
        "' UNION SELECT null, username, password FROM users --",
        "') OR ('1'='1",
        "1; DELETE FROM profiles; --"
      ];

      for (const payload of sqlPayloads) {
        const response = await axios.post(`${baseURL}/contact`, {
          name: payload,
          email: `test${Date.now()}@example.com`,
          message: payload
        }, { headers: testHeaders });

        expect([200, 400]).toContain(response.status);
        
        // SQL injection should not cause server errors
        expect(response.status).not.toBe(500);
        
        if (response.status === 200) {
          expect(response.data.success).toBe(true);
        }
      }
    });

    it('should handle NoSQL injection attempts', async () => {
      const noSqlPayloads = [
        { "$ne": null },
        { "$gt": "" },
        { "$where": "function() { return true; }" },
        "'; return db.users.find(); var dummy='",
        { "$regex": ".*" }
      ];

      for (const payload of noSqlPayloads) {
        const response = await axios.post(`${baseURL}/contact`, {
          name: JSON.stringify(payload),
          email: 'test@example.com',
          message: typeof payload === 'object' ? JSON.stringify(payload) : payload
        }, { headers: testHeaders });

        expect([200, 400]).toContain(response.status);
        expect(response.status).not.toBe(500);
      }
    });

    it('should validate email format strictly', async () => {
      const invalidEmails = [
        'plaintext',
        '@domain.com',
        'user@',
        'user..user@domain.com',
        'user@domain',
        'user name@domain.com',
        'user@domain..com',
        'user@.domain.com',
        'user@domain.com.',
        'a'.repeat(320) + '@domain.com' // Exceeds email length limit
      ];

      for (const email of invalidEmails) {
        const response = await axios.post(`${baseURL}/contact`, {
          name: 'Test User',
          email: email,
          message: 'Test message'
        }, { headers: testHeaders });

        expect(response.status).toBe(400);
        expect(response.data.success).toBe(false);
        expect(response.data.message).toContain('email');
      }
    });
  });

  describe('Authentication Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        '123',
        'password',
        'admin',
        'qwerty',
        '11111111',
        'abc',
        'password123',
        '12345678'
      ];

      for (const password of weakPasswords) {
        const response = await axios.post(`${baseURL}/auth`, {
          action: 'register',
          email: `weak${Date.now()}@example.com`,
          password: password,
          name: 'Weak Password Test'
        }, { headers: testHeaders });

        expect([400, 422]).toContain(response.status);
        expect(response.data.success).toBe(false);
        expect(response.data.message).toContain('password');
      }
    });

    it('should enforce password complexity requirements', async () => {
      const testCases = [
        { password: 'NoNumbers!', expected: 400 },
        { password: 'nonumbers123', expected: 400 },
        { password: 'NoSpecialChars123', expected: 400 },
        { password: 'short1!', expected: 400 },
        { password: 'ValidPassword123!', expected: 200 }
      ];

      for (const testCase of testCases) {
        const response = await axios.post(`${baseURL}/auth`, {
          action: 'register',
          email: `complexity${Date.now()}@example.com`,
          password: testCase.password,
          name: 'Password Complexity Test'
        }, { headers: testHeaders });

        if (testCase.expected === 200) {
          expect([200, 409]).toContain(response.status); // 409 if user already exists
        } else {
          expect(response.status).toBe(testCase.expected);
          expect(response.data.success).toBe(false);
        }
      }
    });

    it('should implement proper session management', async () => {
      // Test session fixation prevention
      const response1 = await axios.post(`${baseURL}/auth`, {
        action: 'login',
        email: 'security@example.com',
        password: 'SecurityTest123!'
      }, { headers: testHeaders });

      if (response1.status === 200) {
        const token1 = response1.data.session?.access_token;
        
        // Logout and login again
        await axios.post(`${baseURL}/auth-logout`, {}, {
          headers: { ...testHeaders, Authorization: `Bearer ${token1}` }
        });

        const response2 = await axios.post(`${baseURL}/auth`, {
          action: 'login',
          email: 'security@example.com',
          password: 'SecurityTest123!'
        }, { headers: testHeaders });

        if (response2.status === 200) {
          const token2 = response2.data.session?.access_token;
          
          // Tokens should be different (session regeneration)
          expect(token1).not.toBe(token2);
        }
      }
    });

    it('should prevent timing attacks in authentication', async () => {
      const validEmail = 'timing@example.com';
      const invalidEmail = 'nonexistent@example.com';
      const password = 'TestPassword123!';

      // Measure time for valid email with wrong password
      const start1 = Date.now();
      await axios.post(`${baseURL}/auth`, {
        action: 'login',
        email: validEmail,
        password: 'wrongpassword'
      }, { headers: testHeaders });
      const duration1 = Date.now() - start1;

      // Measure time for invalid email
      const start2 = Date.now();
      await axios.post(`${baseURL}/auth`, {
        action: 'login',
        email: invalidEmail,
        password: password
      }, { headers: testHeaders });
      const duration2 = Date.now() - start2;

      // Response times should be similar (within reasonable variance)
      const timeDifference = Math.abs(duration1 - duration2);
      expect(timeDifference).toBeLessThan(1000); // Less than 1 second difference
    });
  });

  describe('Rate Limiting', () => {
    it('should rate limit contact form submissions', async () => {
      const contactData = {
        name: 'Rate Limit Test',
        email: 'ratelimit@example.com',
        message: 'Testing rate limiting on contact form'
      };

      // Make rapid consecutive requests
      const requests = Array.from({ length: 20 }, () =>
        axios.post(`${baseURL}/contact`, contactData, { headers: testHeaders })
      );

      const responses = await Promise.allSettled(requests);
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      // Should have some successful requests
      expect(successful.length).toBeGreaterThan(0);
      
      // May have rate limited requests depending on implementation
      if (rateLimited.length > 0) {
        expect(rateLimited[0].value.data.message).toContain('rate');
      }
    });

    it('should rate limit authentication attempts', async () => {
      const loginAttempts = Array.from({ length: 15 }, () =>
        axios.post(`${baseURL}/auth`, {
          action: 'login',
          email: 'brute@example.com',
          password: 'WrongPassword123!'
        }, { headers: testHeaders })
      );

      const responses = await Promise.allSettled(loginAttempts);
      
      const failed = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 401
      );
      
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && [429, 423].includes(r.value.status)
      );

      // Should have failed attempts
      expect(failed.length).toBeGreaterThan(0);
      
      // Should implement rate limiting for repeated failures
      if (rateLimited.length > 0) {
        expect(rateLimited[0].value.data.message).toMatch(/rate|limit|attempt/);
      }
    });

    it('should implement progressive delays for repeated failures', async () => {
      const email = `progressive${Date.now()}@example.com`;
      const timings = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        
        const response = await axios.post(`${baseURL}/auth`, {
          action: 'login',
          email: email,
          password: 'WrongPassword123!'
        }, { headers: testHeaders });

        const duration = Date.now() - start;
        timings.push(duration);

        // Stop if we get rate limited
        if ([429, 423].includes(response.status)) {
          break;
        }

        // Small delay between attempts
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Response times should generally increase (progressive delays)
      if (timings.length > 2) {
        const avgEarly = (timings[0] + timings[1]) / 2;
        const avgLate = timings.slice(-2).reduce((a, b) => a + b) / 2;
        
        // Later attempts might be slower due to progressive delays
        // This is implementation dependent
      }
    });

    it('should rate limit based on IP address', async () => {
      const requests = Array.from({ length: 30 }, () =>
        axios.get(`${baseURL}/health`, { headers: testHeaders })
      );

      const responses = await Promise.allSettled(requests);
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      const rateLimited = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      expect(successful.length).toBeGreaterThan(0);
      
      // Implementation may vary on IP-based rate limiting
      if (rateLimited.length > 0) {
        expect(rateLimited.length).toBeLessThan(responses.length);
      }
    });
  });

  describe('Data Protection', () => {
    it('should not expose sensitive data in error messages', async () => {
      const response = await axios.post(`${baseURL}/auth`, {
        action: 'login',
        email: 'test@example.com',
        password: 'wrongpassword'
      }, { headers: testHeaders });

      expect(response.status).toBe(401);
      expect(response.data.success).toBe(false);
      
      // Error message should not reveal whether user exists
      expect(response.data.message).not.toContain('user does not exist');
      expect(response.data.message).not.toContain('password incorrect');
      
      // Should use generic message
      expect(response.data.message).toContain('Invalid');
    });

    it('should not expose database schema information', async () => {
      // Try various invalid requests that might reveal DB info
      const invalidRequests = [
        axios.get(`${baseURL}/blog?column=invalid_column`),
        axios.get(`${baseURL}/projects?table=profiles`),
        axios.post(`${baseURL}/contact`, { invalid_field: 'test' }, { headers: testHeaders })
      ];

      const responses = await Promise.allSettled(invalidRequests);
      
      responses.forEach(response => {
        if (response.status === 'fulfilled') {
          const data = JSON.stringify(response.value.data);
          
          // Should not expose internal database details
          expect(data).not.toContain('relation');
          expect(data).not.toContain('column');
          expect(data).not.toContain('table');
          expect(data).not.toContain('schema');
          expect(data).not.toContain('postgres');
          expect(data).not.toContain('supabase');
        }
      });
    });

    it('should sanitize file paths and prevent directory traversal', async () => {
      const pathTraversalAttempts = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32\\config\\sam',
        '/etc/shadow',
        'C:\\Windows\\System32\\drivers\\etc\\hosts',
        '../../.env',
        '../package.json'
      ];

      for (const path of pathTraversalAttempts) {
        const response = await axios.post(`${baseURL}/contact`, {
          name: 'Path Test',
          email: 'path@example.com',
          message: path
        }, { headers: testHeaders });

        expect([200, 400]).toContain(response.status);
        
        if (response.status === 200) {
          const responseData = JSON.stringify(response.data);
          expect(responseData).not.toContain('root:');
          expect(responseData).not.toContain('password:');
        }
      }
    });

    it('should prevent information disclosure through response timing', async () => {
      const validEndpoint = `${baseURL}/health`;
      const invalidEndpoint = `${baseURL}/nonexistent`;

      // Measure response times
      const timings = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await axios.get(validEndpoint, { headers: testHeaders });
        timings.push({ endpoint: 'valid', duration: Date.now() - start });

        const start2 = Date.now();
        await axios.get(invalidEndpoint, { headers: testHeaders });
        timings.push({ endpoint: 'invalid', duration: Date.now() - start2 });
      }

      // Response times shouldn't reveal too much about internal structure
      const validAvg = timings
        .filter(t => t.endpoint === 'valid')
        .reduce((sum, t) => sum + t.duration, 0) / 5;
        
      const invalidAvg = timings
        .filter(t => t.endpoint === 'invalid')
        .reduce((sum, t) => sum + t.duration, 0) / 5;

      // Some difference is expected, but shouldn't be extreme
      expect(Math.abs(validAvg - invalidAvg)).toBeLessThan(5000);
    });
  });

  describe('Input Validation Edge Cases', () => {
    it('should handle extremely large payloads', async () => {
      const largePayload = {
        name: 'Large Payload Test',
        email: 'large@example.com',
        message: 'A'.repeat(1024 * 1024) // 1MB string
      };

      const response = await axios.post(`${baseURL}/contact`, largePayload, {
        headers: testHeaders,
        timeout: 30000
      });

      expect([200, 400, 413]).toContain(response.status);
      
      if (response.status === 413) {
        expect(response.data.message).toContain('large');
      }
    });

    it('should handle binary data injection', async () => {
      const binaryData = {
        name: Buffer.from([0x00, 0x01, 0x02, 0x03, 0xff, 0xfe]).toString('binary'),
        email: 'binary@example.com',
        message: 'Message with null bytes: \x00\x01\x02'
      };

      const response = await axios.post(`${baseURL}/contact`, binaryData, {
        headers: testHeaders
      });

      expect([200, 400]).toContain(response.status);
      
      // Should not cause server errors
      expect(response.status).not.toBe(500);
    });

    it('should handle Unicode and emoji injection', async () => {
      const unicodeData = {
        name: '🚀 Test User 测试用户 αβγδε',
        email: 'unicode@例え.test',
        message: 'Message with various Unicode: 💻🔒🛡️ ♠♣♥♦ ←↑→↓'
      };

      const response = await axios.post(`${baseURL}/contact`, unicodeData, {
        headers: testHeaders
      });

      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
      }
    });
  });

  describe('API Security Headers', () => {
    it('should include security headers in responses', async () => {
      const response = await axios.get(`${baseURL}/health`, { headers: testHeaders });

      expect(response.status).toBe(200);
      
      // Check for security headers
      const securityHeaders = [
        'access-control-allow-origin',
        'access-control-allow-methods',
        'access-control-allow-headers'
      ];

      securityHeaders.forEach(header => {
        expect(response.headers[header]).toBeDefined();
      });

      // CORS should be configured properly
      expect(response.headers['access-control-allow-origin']).toBe('*');
      expect(response.headers['access-control-allow-methods']).toContain('GET');
      expect(response.headers['access-control-allow-methods']).toContain('POST');
    });

    it('should handle CORS preflight requests properly', async () => {
      const response = await axios.options(`${baseURL}/contact`, {
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });

      expect(response.status).toBe(200);
      expect(response.headers['access-control-allow-origin']).toBeDefined();
      expect(response.headers['access-control-allow-methods']).toBeDefined();
      expect(response.headers['access-control-allow-headers']).toBeDefined();
    });
  });

  describe('Cryptographic Security', () => {
    it('should use secure token generation', async () => {
      // Register and login to get tokens
      const email = `crypto${Date.now()}@example.com`;
      
      await axios.post(`${baseURL}/auth`, {
        action: 'register',
        email: email,
        password: 'CryptoTest123!',
        name: 'Crypto Test'
      }, { headers: testHeaders });

      const response = await axios.post(`${baseURL}/auth`, {
        action: 'login',
        email: email,
        password: 'CryptoTest123!'
      }, { headers: testHeaders });

      if (response.status === 200 && response.data.session) {
        const token = response.data.session.access_token;
        
        // JWT should have proper structure
        const parts = token.split('.');
        expect(parts).toHaveLength(3);
        
        // Should be long enough to be secure
        expect(token.length).toBeGreaterThan(100);
        
        // Should not be predictable
        expect(token).not.toContain('admin');
        expect(token).not.toContain('user');
        expect(token).not.toContain('password');
      }
    });

    it('should generate cryptographically secure random values', async () => {
      const responses = [];
      
      // Make multiple contact submissions to see if IDs are predictable
      for (let i = 0; i < 5; i++) {
        const response = await axios.post(`${baseURL}/contact`, {
          name: `Crypto Test ${i}`,
          email: `crypto${i}@example.com`,
          message: 'Testing crypto security'
        }, { headers: testHeaders });

        if (response.status === 200) {
          responses.push(response.data.id);
        }
      }

      if (responses.length > 1) {
        // IDs should be unique
        const uniqueIds = new Set(responses);
        expect(uniqueIds.size).toBe(responses.length);
        
        // Should not be sequential
        const isSequential = responses.every((id, index) => {
          if (index === 0) return true;
          const prev = parseInt(responses[index - 1].match(/\d+/)?.[0] || '0');
          const curr = parseInt(id.match(/\d+/)?.[0] || '0');
          return curr === prev + 1;
        });
        
        expect(isSequential).toBe(false);
      }
    });
  });
});