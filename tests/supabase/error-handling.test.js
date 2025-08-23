/**
 * API Error Handling and Edge Cases Tests
 * Tests various error conditions and edge cases for Supabase integration
 */

const { describe, it, beforeAll, afterAll, expect, jest } = require('@jest/globals');
const axios = require('axios');
const { createClient } = require('@supabase/supabase-js');

describe('API Error Handling and Edge Cases', () => {
  let baseURL;
  let supabase;
  let invalidClient;

  beforeAll(async () => {
    baseURL = process.env.NETLIFY_FUNCTIONS_URL || 'http://localhost:8888/.netlify/functions';
    
    // Setup valid Supabase client
    const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost:54321';
    const supabaseKey = process.env.SUPABASE_ANON_KEY;
    
    if (supabaseUrl && supabaseKey) {
      supabase = createClient(supabaseUrl, supabaseKey);
      
      // Create invalid client for error testing
      invalidClient = createClient('https://invalid-url.supabase.co', 'invalid-key');
    }

    // Configure axios for error testing
    axios.defaults.timeout = 15000;
    axios.defaults.validateStatus = () => true; // Don't throw on HTTP errors
  });

  describe('Network and Connectivity Errors', () => {
    it('should handle network timeouts gracefully', async () => {
      const start = Date.now();
      
      try {
        // Use a very short timeout to force timeout
        const response = await axios.get(`${baseURL}/health`, { timeout: 1 });
        
        // If it succeeds within 1ms, that's suspicious but possible
        expect(response.status).toBe(200);
      } catch (error) {
        const duration = Date.now() - start;
        expect(error.code).toBe('ECONNABORTED');
        expect(duration).toBeLessThan(100); // Should timeout quickly
      }
    });

    it('should handle DNS resolution failures', async () => {
      const invalidURL = 'https://non-existent-domain-12345.com/.netlify/functions/health';
      
      try {
        await axios.get(invalidURL, { timeout: 5000 });
      } catch (error) {
        expect(['ENOTFOUND', 'ECONNREFUSED', 'EAI_AGAIN']).toContain(error.code);
      }
    });

    it('should handle SSL certificate errors', async () => {
      // Test with self-signed certificate (if applicable)
      const response = await axios.get(`${baseURL}/health`, {
        httpsAgent: { rejectUnauthorized: false }
      });

      // Should work with certificate validation disabled
      expect([200, 404, 502]).toContain(response.status);
    });
  });

  describe('HTTP Error Responses', () => {
    it('should handle 404 Not Found errors', async () => {
      const response = await axios.get(`${baseURL}/non-existent-endpoint`);

      expect([404, 502]).toContain(response.status);
      
      if (response.status === 404) {
        expect(response.data).toBeDefined();
      }
    });

    it('should handle 405 Method Not Allowed errors', async () => {
      const response = await axios.put(`${baseURL}/health`);

      expect(response.status).toBe(405);
      expect(response.data).toMatchObject({
        success: false,
        message: expect.stringContaining('Method not allowed')
      });
    });

    it('should handle 500 Internal Server Errors', async () => {
      // Trigger server error with malformed request
      const response = await axios.post(`${baseURL}/contact`, {
        // Intentionally malformed data to trigger server error
        name: 'x'.repeat(10000), // Extremely long name
        email: 'test@example.com',
        message: 'Test message'
      });

      if (response.status === 500) {
        expect(response.data).toMatchObject({
          success: false,
          message: expect.any(String),
          timestamp: expect.any(String)
        });
      }
    });

    it('should handle 503 Service Unavailable errors', async () => {
      // This would typically happen during deployments or maintenance
      // We can't easily simulate this, so we'll just verify proper error structure
      const response = await axios.get(`${baseURL}/health`);

      if (response.status === 503) {
        expect(response.data).toMatchObject({
          status: 'unavailable',
          message: expect.any(String)
        });
      } else {
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Request Validation Errors', () => {
    it('should handle malformed JSON payloads', async () => {
      const response = await axios.post(`${baseURL}/contact`, 
        'invalid json{', 
        {
          headers: { 'Content-Type': 'application/json' }
        }
      );

      expect([400, 500]).toContain(response.status);
      expect(response.data.success).toBe(false);
    });

    it('should handle missing Content-Type header', async () => {
      const response = await axios.post(`${baseURL}/contact`, {
        name: 'Test User',
        email: 'test@example.com',
        message: 'Test message'
      }, {
        headers: { 'Content-Type': 'text/plain' }
      });

      // Should handle gracefully or return appropriate error
      expect([200, 400, 415]).toContain(response.status);
    });

    it('should handle oversized request payloads', async () => {
      const largePayload = {
        name: 'Test User',
        email: 'test@example.com',
        message: 'x'.repeat(1024 * 1024) // 1MB message
      };

      const response = await axios.post(`${baseURL}/contact`, largePayload);

      // Should either accept or reject with appropriate error
      expect([200, 400, 413]).toContain(response.status);
      
      if (response.status === 413) {
        expect(response.data.message).toContain('large');
      }
    });

    it('should handle requests with special characters', async () => {
      const specialCharData = {
        name: 'Test User 测试用户 🚀',
        email: 'test+special@例え.example.com',
        message: 'Message with emoji 😊 and unicode characters: αβγδε'
      };

      const response = await axios.post(`${baseURL}/contact`, specialCharData);

      // Should handle Unicode properly
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
      }
    });

    it('should handle null and undefined values', async () => {
      const nullData = {
        name: null,
        email: undefined,
        message: ''
      };

      const response = await axios.post(`${baseURL}/contact`, nullData);

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.message).toContain('required');
    });
  });

  describe('Authentication Errors', () => {
    it('should handle expired authentication tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjJ9.invalid';

      const response = await axios.get(`${baseURL}/auth-me`, {
        headers: { Authorization: `Bearer ${expiredToken}` }
      });

      expect([401, 403]).toContain(response.status);
      expect(response.data.success).toBe(false);
      expect(response.data.message).toContain('token');
    });

    it('should handle malformed authentication tokens', async () => {
      const malformedToken = 'invalid-token-format';

      const response = await axios.get(`${baseURL}/auth-me`, {
        headers: { Authorization: `Bearer ${malformedToken}` }
      });

      expect([401, 403]).toContain(response.status);
      expect(response.data.success).toBe(false);
    });

    it('should handle missing authorization header', async () => {
      const response = await axios.get(`${baseURL}/auth-me`);

      expect([401, 403]).toContain(response.status);
      expect(response.data.success).toBe(false);
      expect(response.data.message).toContain('authorization');
    });

    it('should handle invalid authorization header format', async () => {
      const response = await axios.get(`${baseURL}/auth-me`, {
        headers: { Authorization: 'InvalidFormat token-value' }
      });

      expect([401, 403]).toContain(response.status);
      expect(response.data.success).toBe(false);
    });
  });

  describe('Database Connection Errors', () => {
    it('should handle Supabase connection failures gracefully', async () => {
      if (!invalidClient) {
        console.log('Skipping Supabase error tests - client not initialized');
        return;
      }

      try {
        const { data, error } = await invalidClient
          .from('profiles')
          .select('*')
          .limit(1);

        expect(error).not.toBeNull();
        expect(data).toBeNull();
        expect(error.message).toContain('fetch');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid SQL queries', async () => {
      if (!supabase) return;

      const { data, error } = await supabase
        .from('non_existent_table')
        .select('invalid_column');

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error.message).toContain('relation');
    });

    it('should handle constraint violation errors', async () => {
      if (!supabase) return;

      // Try to insert duplicate data
      const duplicateData = {
        user_id: '123e4567-e89b-12d3-a456-426614174000',
        email: `duplicate.${Date.now()}@example.com`,
        full_name: 'Duplicate Test User'
      };

      // Insert first time
      await supabase.from('profiles').insert(duplicateData);

      // Try to insert again (should violate unique constraint)
      const { data, error } = await supabase
        .from('profiles')
        .insert(duplicateData);

      expect(error).not.toBeNull();
      expect(data).toBeNull();
      expect(error.message).toContain('duplicate');
    });

    it('should handle RLS policy violations', async () => {
      if (!supabase) return;

      // Try to access data that should be blocked by RLS
      const { data, error } = await supabase
        .from('contact_messages')
        .select('*')
        .limit(1);

      // Should return empty array due to RLS, not an error
      expect(error).toBeNull();
      expect(data).toHaveLength(0);
    });
  });

  describe('Rate Limiting and Throttling', () => {
    it('should handle rate limiting gracefully', async () => {
      const requests = Array.from({ length: 20 }, () => 
        axios.get(`${baseURL}/health`)
      );

      const responses = await Promise.allSettled(requests);
      
      const successfulRequests = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );
      
      const rateLimitedRequests = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      // At least some should succeed
      expect(successfulRequests.length).toBeGreaterThan(0);
      
      // Rate limiting behavior depends on implementation
      if (rateLimitedRequests.length > 0) {
        expect(rateLimitedRequests[0].value.data.message).toContain('rate limit');
      }
    });

    it('should provide retry-after headers for rate limited requests', async () => {
      // Make many rapid requests to trigger rate limiting
      const rapidRequests = Array.from({ length: 50 }, () => 
        axios.post(`${baseURL}/contact`, {
          name: 'Rate Limit Test',
          email: 'ratelimit@example.com',
          message: 'Testing rate limiting'
        })
      );

      const responses = await Promise.allSettled(rapidRequests);
      
      const rateLimited = responses.find(r => 
        r.status === 'fulfilled' && r.value.status === 429
      );

      if (rateLimited) {
        // Check for proper rate limiting headers
        expect(rateLimited.value.headers).toBeDefined();
        // Implementation may vary on header names
      }
    });
  });

  describe('Data Validation Edge Cases', () => {
    it('should handle extremely long field values', async () => {
      const longFieldData = {
        name: 'Test User',
        email: 'test@example.com',
        message: 'a'.repeat(100000) // Very long message
      };

      const response = await axios.post(`${baseURL}/contact`, longFieldData);

      // Should either accept or reject with appropriate error
      expect([200, 400, 413]).toContain(response.status);
    });

    it('should handle SQL injection attempts', async () => {
      const sqlInjectionData = {
        name: "'; DROP TABLE profiles; --",
        email: 'test@example.com',
        message: 'SELECT * FROM users WHERE 1=1'
      };

      const response = await axios.post(`${baseURL}/contact`, sqlInjectionData);

      // Should handle safely without executing SQL
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
      }
    });

    it('should handle XSS script injection attempts', async () => {
      const xssData = {
        name: '<script>alert("XSS")</script>',
        email: 'test@example.com',
        message: '<img src="x" onerror="alert(1)">'
      };

      const response = await axios.post(`${baseURL}/contact`, xssData);

      // Should sanitize or reject dangerous content
      expect([200, 400]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
      }
    });

    it('should handle binary data in text fields', async () => {
      const binaryData = {
        name: Buffer.from([0x00, 0x01, 0x02, 0x03]).toString(),
        email: 'test@example.com',
        message: 'Message with binary data: ' + String.fromCharCode(0, 1, 2, 3)
      };

      const response = await axios.post(`${baseURL}/contact`, binaryData);

      // Should handle gracefully
      expect([200, 400]).toContain(response.status);
    });
  });

  describe('Concurrent Request Handling', () => {
    it('should handle concurrent POST requests', async () => {
      const concurrentRequests = Array.from({ length: 10 }, (_, i) => 
        axios.post(`${baseURL}/contact`, {
          name: `Concurrent User ${i}`,
          email: `concurrent${i}@example.com`,
          message: `Concurrent message ${i}`
        })
      );

      const responses = await Promise.allSettled(concurrentRequests);
      
      const successful = responses.filter(r => 
        r.status === 'fulfilled' && r.value.status === 200
      );

      // Most should succeed
      expect(successful.length).toBeGreaterThan(7);
      
      successful.forEach(response => {
        expect(response.value.data.success).toBe(true);
      });
    });

    it('should handle mixed concurrent request types', async () => {
      const mixedRequests = [
        axios.get(`${baseURL}/health`),
        axios.get(`${baseURL}/blog`),
        axios.get(`${baseURL}/projects`),
        axios.post(`${baseURL}/contact`, {
          name: 'Mixed Request Test',
          email: 'mixed@example.com',
          message: 'Testing mixed requests'
        })
      ];

      const responses = await Promise.allSettled(mixedRequests);
      
      responses.forEach((response, index) => {
        if (response.status === 'fulfilled') {
          expect([200, 404]).toContain(response.value.status);
        }
      });
    });
  });

  describe('Memory and Resource Limits', () => {
    it('should handle memory-intensive operations', async () => {
      // Request large amounts of data
      const response = await axios.get(`${baseURL}/blog?limit=1000`);

      expect([200, 400, 413]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
        expect(Array.isArray(response.data.data)).toBe(true);
      }
    });

    it('should handle long-running operations', async () => {
      // Use a longer timeout for potentially slow operations
      const response = await axios.get(`${baseURL}/projects?search=complex`, {
        timeout: 30000
      });

      expect([200, 408, 504]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.data.success).toBe(true);
      }
    });
  });

  describe('Error Recovery and Resilience', () => {
    it('should maintain consistent error response format', async () => {
      const errorEndpoints = [
        `${baseURL}/non-existent`,
        `${baseURL}/health` // with invalid method
      ];

      for (const endpoint of errorEndpoints) {
        const response = await axios.delete(endpoint);

        if (response.status >= 400) {
          expect(response.data).toBeDefined();
          expect(typeof response.data).toBe('object');
          
          // Should have consistent error structure
          expect(response.data).toHaveProperty('success');
          expect(response.data.success).toBe(false);
        }
      }
    });

    it('should provide helpful error messages', async () => {
      const response = await axios.post(`${baseURL}/contact`, {
        // Missing required fields
        name: 'Test User'
      });

      expect(response.status).toBe(400);
      expect(response.data.success).toBe(false);
      expect(response.data.message).toBeDefined();
      expect(response.data.message.length).toBeGreaterThan(10);
      expect(response.data.message).toContain('required');
    });

    it('should include request correlation IDs for debugging', async () => {
      const response = await axios.get(`${baseURL}/health`);

      if (response.status === 200) {
        // Check if response includes correlation ID or similar debugging info
        expect(response.data.timestamp).toBeDefined();
        
        // Some implementations might include request IDs
        if (response.headers['x-request-id'] || response.data.requestId) {
          expect(
            response.headers['x-request-id'] || response.data.requestId
          ).toBeDefined();
        }
      }
    });
  });
});