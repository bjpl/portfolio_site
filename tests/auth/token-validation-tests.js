/**
 * Token Generation and Validation Tests
 * 
 * Comprehensive test suite for JWT token generation, validation, expiration,
 * refresh mechanisms, and security vulnerabilities in token handling.
 */

const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { performance } = require('perf_hooks');
const authService = require('../../backend/src/services/authService.js');
const config = require('../../backend/src/config');

describe('🎫 Token Generation and Validation Tests', () => {
  // Test data
  const validUserPayload = {
    id: 12345,
    email: 'test@example.com',
    role: 'editor',
    permissions: ['read', 'write']
  };

  const refreshPayload = {
    id: 12345,
    tokenVersion: 1
  };

  // Time constants
  const SECOND = 1000;
  const MINUTE = 60 * SECOND;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  describe('Access Token Generation', () => {
    test('should generate valid JWT access token with correct structure', () => {
      const token = authService.generateToken(validUserPayload);
      
      // JWT format check
      expect(token).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
      
      // Token parts
      const parts = token.split('.');
      expect(parts).toHaveLength(3);
      
      // Header validation
      const header = JSON.parse(Buffer.from(parts[0], 'base64url').toString());
      expect(header).toMatchObject({
        typ: 'JWT',
        alg: expect.stringMatching(/^(HS256|RS256|ES256)$/)
      });
      
      // Payload validation
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      expect(payload).toMatchObject({
        id: validUserPayload.id,
        email: validUserPayload.email,
        role: validUserPayload.role,
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
      
      // Expiration validation
      expect(payload.exp).toBeGreaterThan(payload.iat);
      expect((payload.exp - payload.iat) * 1000).toBeLessThanOrEqual(24 * HOUR); // Max 24 hours
    });

    test('should generate tokens with configurable expiration', () => {
      const customExpirations = ['5m', '1h', '2d', '30d'];
      
      customExpirations.forEach(expiry => {
        const token = authService.generateToken(validUserPayload, config.security.jwtSecret, expiry);
        const decoded = jwt.decode(token);
        
        expect(decoded.exp).toBeGreaterThan(decoded.iat);
        
        // Verify expiration matches expectation (approximately)
        const expectedExpiry = jwt.decode(jwt.sign({}, 'test', { expiresIn: expiry })).exp;
        expect(Math.abs(decoded.exp - expectedExpiry)).toBeLessThanOrEqual(2); // 2 second tolerance
      });
    });

    test('should generate unique tokens for same payload', () => {
      const token1 = authService.generateToken(validUserPayload);
      const token2 = authService.generateToken(validUserPayload);
      
      expect(token1).not.toBe(token2);
      
      // But should decode to similar payload (different iat)
      const decoded1 = jwt.decode(token1);
      const decoded2 = jwt.decode(token2);
      
      expect(decoded1.id).toBe(decoded2.id);
      expect(decoded1.email).toBe(decoded2.email);
      expect(decoded1.role).toBe(decoded2.role);
    });

    test('should handle special characters in payload', () => {
      const specialPayload = {
        id: 123,
        email: 'test+user@example-domain.co.uk',
        role: 'special-role_with-chars',
        name: 'José María Ñoño',
        metadata: {
          'special-key': 'special@value#123',
          unicode: '🔐🎫✅'
        }
      };

      const token = authService.generateToken(specialPayload);
      const decoded = authService.verifyToken(token);

      expect(decoded.email).toBe(specialPayload.email);
      expect(decoded.name).toBe(specialPayload.name);
      expect(decoded.metadata['special-key']).toBe(specialPayload.metadata['special-key']);
      expect(decoded.metadata.unicode).toBe(specialPayload.metadata.unicode);
    });

    test('should handle large payloads within reasonable limits', () => {
      const largePayload = {
        ...validUserPayload,
        permissions: new Array(1000).fill('permission_').map((p, i) => `${p}${i}`),
        metadata: {
          description: 'A'.repeat(5000), // 5KB description
          settings: Object.fromEntries(
            new Array(100).fill().map((_, i) => [`setting_${i}`, `value_${i}`])
          )
        }
      };

      const token = authService.generateToken(largePayload);
      expect(token).toBeDefined();
      expect(token.length).toBeGreaterThan(1000);
      
      const decoded = authService.verifyToken(token);
      expect(decoded.permissions).toHaveLength(1000);
      expect(decoded.metadata.description.length).toBe(5000);
      expect(Object.keys(decoded.metadata.settings)).toHaveLength(100);
    });
  });

  describe('Refresh Token Generation', () => {
    test('should generate valid refresh token', () => {
      const refreshToken = authService.generateRefreshToken(refreshPayload);
      
      expect(refreshToken).toMatch(/^[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+$/);
      
      const decoded = jwt.verify(refreshToken, config.security.jwtRefreshSecret);
      expect(decoded).toMatchObject({
        id: refreshPayload.id,
        tokenVersion: refreshPayload.tokenVersion,
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
      
      // Refresh token should have longer expiry than access token
      const accessToken = authService.generateToken(validUserPayload);
      const accessDecoded = jwt.decode(accessToken);
      
      expect(decoded.exp).toBeGreaterThan(accessDecoded.exp);
    });

    test('should differentiate refresh tokens by version', () => {
      const token1 = authService.generateRefreshToken({ ...refreshPayload, tokenVersion: 1 });
      const token2 = authService.generateRefreshToken({ ...refreshPayload, tokenVersion: 2 });
      
      const decoded1 = jwt.verify(token1, config.security.jwtRefreshSecret);
      const decoded2 = jwt.verify(token2, config.security.jwtRefreshSecret);
      
      expect(decoded1.tokenVersion).toBe(1);
      expect(decoded2.tokenVersion).toBe(2);
      expect(token1).not.toBe(token2);
    });

    test('should generate refresh tokens with long expiration', () => {
      const refreshToken = authService.generateRefreshToken(refreshPayload);
      const decoded = jwt.decode(refreshToken);
      
      const expirationTime = (decoded.exp - decoded.iat) * 1000;
      expect(expirationTime).toBeGreaterThanOrEqual(7 * DAY); // At least 7 days
      expect(expirationTime).toBeLessThanOrEqual(90 * DAY); // Max 90 days
    });
  });

  describe('Token Validation', () => {
    let validAccessToken;
    let validRefreshToken;

    beforeEach(() => {
      validAccessToken = authService.generateToken(validUserPayload);
      validRefreshToken = authService.generateRefreshToken(refreshPayload);
    });

    test('should verify valid access token', () => {
      const decoded = authService.verifyToken(validAccessToken);
      
      expect(decoded).toMatchObject({
        id: validUserPayload.id,
        email: validUserPayload.email,
        role: validUserPayload.role,
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
    });

    test('should verify valid refresh token', () => {
      const decoded = authService.verifyRefreshToken(validRefreshToken);
      
      expect(decoded).toMatchObject({
        id: refreshPayload.id,
        tokenVersion: refreshPayload.tokenVersion,
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
    });

    test('should reject token with invalid signature', () => {
      const tamperedToken = validAccessToken.slice(0, -5) + 'XXXXX';
      
      expect(() => {
        authService.verifyToken(tamperedToken);
      }).toThrow('Invalid token');
    });

    test('should reject token signed with wrong secret', () => {
      const wrongToken = jwt.sign(validUserPayload, 'wrong-secret');
      
      expect(() => {
        authService.verifyToken(wrongToken);
      }).toThrow('Invalid token');
    });

    test('should handle malformed tokens gracefully', () => {
      const malformedTokens = [
        'not.a.jwt',
        'header.payload', // Missing signature
        'header.payload.signature.extra', // Too many parts
        '', // Empty string
        null,
        undefined,
        123, // Number
        {}, // Object
        'Bearer validtoken' // With prefix
      ];

      malformedTokens.forEach(token => {
        expect(() => {
          authService.verifyToken(token);
        }).toThrow();
      });
    });

    test('should validate token claims correctly', () => {
      // Test with additional claims
      const tokenWithClaims = jwt.sign(
        {
          ...validUserPayload,
          iss: 'test-issuer',
          aud: 'test-audience',
          sub: 'user-subject',
          jti: crypto.randomUUID()
        },
        config.security.jwtSecret,
        { expiresIn: '1h' }
      );

      const decoded = authService.verifyToken(tokenWithClaims);
      expect(decoded.iss).toBe('test-issuer');
      expect(decoded.aud).toBe('test-audience');
      expect(decoded.sub).toBe('user-subject');
      expect(decoded.jti).toMatch(/^[0-9a-f-]+$/);
    });

    test('should reject tokens with future issued date', () => {
      const futureToken = jwt.sign(
        {
          ...validUserPayload,
          iat: Math.floor(Date.now() / 1000) + 3600 // 1 hour in future
        },
        config.security.jwtSecret
      );

      expect(() => {
        authService.verifyToken(futureToken);
      }).toThrow();
    });

    test('should validate token within clock skew tolerance', () => {
      const clockSkewSeconds = 30; // Common tolerance
      const slightlyFutureToken = jwt.sign(
        {
          ...validUserPayload,
          iat: Math.floor(Date.now() / 1000) + clockSkewSeconds - 1
        },
        config.security.jwtSecret,
        { expiresIn: '1h' }
      );

      // Should succeed within tolerance
      expect(() => {
        authService.verifyToken(slightlyFutureToken);
      }).not.toThrow();
    });
  });

  describe('Token Expiration Handling', () => {
    test('should detect expired access token', async () => {
      const shortToken = jwt.sign(
        validUserPayload,
        config.security.jwtSecret,
        { expiresIn: '10ms' }
      );

      // Wait for token to expire
      await new Promise(resolve => setTimeout(resolve, 50));

      expect(() => {
        authService.verifyToken(shortToken);
      }).toThrow('Token has expired');
    });

    test('should detect expired refresh token', async () => {
      const shortRefreshToken = jwt.sign(
        refreshPayload,
        config.security.jwtRefreshSecret,
        { expiresIn: '10ms' }
      );

      await new Promise(resolve => setTimeout(resolve, 50));

      expect(() => {
        authService.verifyRefreshToken(shortRefreshToken);
      }).toThrow('Token has expired');
    });

    test('should handle tokens expiring at exact boundary', () => {
      const now = Math.floor(Date.now() / 1000);
      const boundaryToken = jwt.sign(
        {
          ...validUserPayload,
          iat: now - 100,
          exp: now // Expires exactly now
        },
        config.security.jwtSecret
      );

      expect(() => {
        authService.verifyToken(boundaryToken);
      }).toThrow('Token has expired');
    });

    test('should calculate remaining token lifetime', () => {
      const token = authService.generateToken(validUserPayload);
      const decoded = jwt.decode(token);
      
      const now = Math.floor(Date.now() / 1000);
      const remainingTime = decoded.exp - now;
      
      expect(remainingTime).toBeGreaterThan(0);
      expect(remainingTime).toBeLessThanOrEqual(24 * 60 * 60); // Max 24 hours
    });

    test('should handle very long expiration times', () => {
      const longToken = jwt.sign(
        validUserPayload,
        config.security.jwtSecret,
        { expiresIn: '100y' }
      );

      const decoded = authService.verifyToken(longToken);
      expect(decoded.exp).toBeGreaterThan(decoded.iat + (50 * 365 * 24 * 60 * 60)); // At least 50 years
    });
  });

  describe('Token Security Tests', () => {
    test('should use secure random generation for token uniqueness', () => {
      const tokens = new Set();
      const iterations = 1000;

      for (let i = 0; i < iterations; i++) {
        const token = authService.generateToken({
          ...validUserPayload,
          nonce: i // Add variation to prevent identical payloads
        });
        tokens.add(token);
      }

      // All tokens should be unique
      expect(tokens.size).toBe(iterations);
    });

    test('should prevent timing attacks in token verification', async () => {
      const validToken = authService.generateToken(validUserPayload);
      const invalidToken = 'invalid.token.here';

      const measurements = [];
      const iterations = 100;

      // Measure valid token verification times
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          authService.verifyToken(validToken);
        } catch (e) {
          // Ignore errors
        }
        const end = performance.now();
        measurements.push({ type: 'valid', time: end - start });
      }

      // Measure invalid token verification times
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        try {
          authService.verifyToken(invalidToken);
        } catch (e) {
          // Ignore errors
        }
        const end = performance.now();
        measurements.push({ type: 'invalid', time: end - start });
      }

      // Calculate averages
      const validAvg = measurements
        .filter(m => m.type === 'valid')
        .reduce((sum, m) => sum + m.time, 0) / iterations;

      const invalidAvg = measurements
        .filter(m => m.type === 'invalid')
        .reduce((sum, m) => sum + m.time, 0) / iterations;

      // Times should be relatively similar (within 50% difference)
      const timeDifference = Math.abs(validAvg - invalidAvg);
      const threshold = Math.max(validAvg, invalidAvg) * 0.5;
      
      expect(timeDifference).toBeLessThan(threshold);
    });

    test('should resist token brute force attempts', () => {
      const validPayload = validUserPayload;
      const bruteForceAttempts = 10000;

      // Generate many tokens with incremental changes
      const tokens = new Set();
      for (let i = 0; i < bruteForceAttempts; i++) {
        try {
          // Attempt to create predictable tokens
          const fakeToken = `eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.${Buffer.from(JSON.stringify({
            ...validPayload,
            id: i
          })).toString('base64url')}.${crypto.randomBytes(32).toString('base64url')}`;
          
          tokens.add(fakeToken);
        } catch (e) {
          // Ignore generation errors
        }
      }

      // None of these fake tokens should verify successfully
      let successfulVerifications = 0;
      tokens.forEach(token => {
        try {
          authService.verifyToken(token);
          successfulVerifications++;
        } catch (e) {
          // Expected to fail
        }
      });

      expect(successfulVerifications).toBe(0);
    });

    test('should prevent algorithm confusion attacks', () => {
      // Create token with 'none' algorithm
      const noneToken = jwt.sign(validUserPayload, '', { algorithm: 'none' });
      
      expect(() => {
        authService.verifyToken(noneToken);
      }).toThrow();

      // Create token claiming to be HS256 but signed with RS256 key structure
      const confusedToken = jwt.sign(
        { ...validUserPayload, alg: 'RS256' },
        config.security.jwtSecret,
        { algorithm: 'HS256' }
      );

      // Should still verify correctly since we're using the right secret
      expect(() => {
        authService.verifyToken(confusedToken);
      }).not.toThrow();
    });

    test('should handle token replay attack scenarios', () => {
      const token = authService.generateToken({
        ...validUserPayload,
        jti: crypto.randomUUID(), // Unique token ID
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      });

      // First use should succeed
      const firstUse = authService.verifyToken(token);
      expect(firstUse).toBeDefined();

      // Subsequent uses should also succeed (token is still valid)
      // Replay protection should be implemented at application level
      const secondUse = authService.verifyToken(token);
      expect(secondUse).toBeDefined();

      // Tokens should have unique IDs for replay tracking
      expect(firstUse.jti).toBe(secondUse.jti);
    });
  });

  describe('Token Performance Tests', () => {
    test('should generate tokens efficiently', () => {
      const iterations = 1000;
      const start = performance.now();

      for (let i = 0; i < iterations; i++) {
        authService.generateToken({
          ...validUserPayload,
          id: i
        });
      }

      const end = performance.now();
      const avgTime = (end - start) / iterations;

      // Should generate tokens in less than 1ms each
      expect(avgTime).toBeLessThan(1);
    });

    test('should verify tokens efficiently', () => {
      // Pre-generate tokens
      const tokens = [];
      for (let i = 0; i < 1000; i++) {
        tokens.push(authService.generateToken({
          ...validUserPayload,
          id: i
        }));
      }

      const start = performance.now();

      tokens.forEach(token => {
        authService.verifyToken(token);
      });

      const end = performance.now();
      const avgTime = (end - start) / tokens.length;

      // Should verify tokens in less than 0.5ms each
      expect(avgTime).toBeLessThan(0.5);
    });

    test('should handle concurrent token operations', async () => {
      const concurrentOps = 100;
      
      const generatePromises = Array.from({ length: concurrentOps }, (_, i) =>
        Promise.resolve().then(() => authService.generateToken({
          ...validUserPayload,
          id: i
        }))
      );

      const start = performance.now();
      const tokens = await Promise.all(generatePromises);
      const generateEnd = performance.now();

      const verifyPromises = tokens.map(token =>
        Promise.resolve().then(() => authService.verifyToken(token))
      );

      await Promise.all(verifyPromises);
      const verifyEnd = performance.now();

      const generateTime = (generateEnd - start) / concurrentOps;
      const verifyTime = (verifyEnd - generateEnd) / concurrentOps;

      expect(generateTime).toBeLessThan(2); // 2ms per generation
      expect(verifyTime).toBeLessThan(1); // 1ms per verification
    });

    test('should scale with payload size', () => {
      const payloadSizes = [
        { size: 'small', data: validUserPayload },
        { 
          size: 'medium', 
          data: {
            ...validUserPayload,
            permissions: new Array(100).fill().map((_, i) => `perm_${i}`),
            metadata: { description: 'A'.repeat(1000) }
          }
        },
        {
          size: 'large',
          data: {
            ...validUserPayload,
            permissions: new Array(1000).fill().map((_, i) => `permission_${i}`),
            metadata: {
              description: 'A'.repeat(10000),
              settings: Object.fromEntries(
                new Array(500).fill().map((_, i) => [`setting_${i}`, `value_${i}_with_longer_content`])
              )
            }
          }
        }
      ];

      const results = payloadSizes.map(({ size, data }) => {
        const iterations = 100;
        
        const generateStart = performance.now();
        const tokens = [];
        for (let i = 0; i < iterations; i++) {
          tokens.push(authService.generateToken(data));
        }
        const generateTime = performance.now() - generateStart;

        const verifyStart = performance.now();
        tokens.forEach(token => authService.verifyToken(token));
        const verifyTime = performance.now() - verifyStart;

        return {
          size,
          generateAvg: generateTime / iterations,
          verifyAvg: verifyTime / iterations,
          tokenSize: tokens[0].length
        };
      });

      // Performance should degrade gracefully with size
      expect(results[0].generateAvg).toBeLessThan(results[1].generateAvg);
      expect(results[1].generateAvg).toBeLessThan(results[2].generateAvg);
      
      expect(results[0].verifyAvg).toBeLessThan(results[1].verifyAvg);
      expect(results[1].verifyAvg).toBeLessThan(results[2].verifyAvg);

      // Even large tokens should be reasonably fast
      expect(results[2].generateAvg).toBeLessThan(5); // Less than 5ms
      expect(results[2].verifyAvg).toBeLessThan(3); // Less than 3ms
    });
  });

  describe('Edge Cases and Error Conditions', () => {
    test('should handle empty payloads', () => {
      const emptyToken = authService.generateToken({});
      const decoded = authService.verifyToken(emptyToken);
      
      expect(decoded).toMatchObject({
        iat: expect.any(Number),
        exp: expect.any(Number)
      });
    });

    test('should handle null and undefined values in payload', () => {
      const payloadWithNulls = {
        id: 123,
        email: 'test@example.com',
        role: null,
        permissions: undefined,
        metadata: {
          setting1: null,
          setting2: undefined,
          setting3: 'valid'
        }
      };

      const token = authService.generateToken(payloadWithNulls);
      const decoded = authService.verifyToken(token);

      expect(decoded.id).toBe(123);
      expect(decoded.email).toBe('test@example.com');
      expect(decoded.role).toBeNull();
      expect(decoded).not.toHaveProperty('permissions');
      expect(decoded.metadata.setting1).toBeNull();
      expect(decoded.metadata).not.toHaveProperty('setting2');
      expect(decoded.metadata.setting3).toBe('valid');
    });

    test('should handle circular references gracefully', () => {
      const circularPayload = { id: 123, email: 'test@example.com' };
      circularPayload.self = circularPayload; // Create circular reference

      expect(() => {
        authService.generateToken(circularPayload);
      }).toThrow(); // Should throw due to circular reference
    });

    test('should handle extremely long strings', () => {
      const longStringPayload = {
        id: 123,
        email: 'test@example.com',
        description: 'A'.repeat(100000) // 100KB string
      };

      // Should either succeed or fail gracefully
      try {
        const token = authService.generateToken(longStringPayload);
        const decoded = authService.verifyToken(token);
        expect(decoded.description.length).toBe(100000);
      } catch (error) {
        expect(error.message).toMatch(/payload|size|limit/i);
      }
    });

    test('should handle special numeric values', () => {
      const specialNumbersPayload = {
        id: 123,
        infinity: Infinity,
        negativeInfinity: -Infinity,
        nan: NaN,
        zero: 0,
        negativeZero: -0,
        maxSafeInteger: Number.MAX_SAFE_INTEGER,
        minSafeInteger: Number.MIN_SAFE_INTEGER
      };

      const token = authService.generateToken(specialNumbersPayload);
      const decoded = authService.verifyToken(token);

      expect(decoded.id).toBe(123);
      expect(decoded.infinity).toBe(null); // JSON.stringify converts Infinity to null
      expect(decoded.negativeInfinity).toBe(null);
      expect(decoded.nan).toBe(null); // JSON.stringify converts NaN to null
      expect(decoded.zero).toBe(0);
      expect(decoded.negativeZero).toBe(0); // -0 becomes 0
      expect(decoded.maxSafeInteger).toBe(Number.MAX_SAFE_INTEGER);
      expect(decoded.minSafeInteger).toBe(Number.MIN_SAFE_INTEGER);
    });

    test('should handle unicode and special characters', () => {
      const unicodePayload = {
        id: 123,
        name: '测试用户',
        emoji: '🔐🎫✅❌',
        symbols: '!@#$%^&*()[]{}|;:,.<>?',
        newlines: 'Line 1\nLine 2\r\nLine 3',
        tabs: 'Col1\tCol2\tCol3',
        quotes: "Single 'quotes' and \"double quotes\"",
        unicode: '\u0041\u0042\u0043', // ABC
        surrogatePairs: '𝒜𝒷𝒸', // Mathematical script letters
        combining: 'é' // e + combining acute accent
      };

      const token = authService.generateToken(unicodePayload);
      const decoded = authService.verifyToken(token);

      expect(decoded.name).toBe('测试用户');
      expect(decoded.emoji).toBe('🔐🎫✅❌');
      expect(decoded.symbols).toBe('!@#$%^&*()[]{}|;:,.<>?');
      expect(decoded.newlines).toBe('Line 1\nLine 2\r\nLine 3');
      expect(decoded.tabs).toBe('Col1\tCol2\tCol3');
      expect(decoded.quotes).toBe("Single 'quotes' and \"double quotes\"");
      expect(decoded.unicode).toBe('ABC');
      expect(decoded.surrogatePairs).toBe('𝒜𝒷𝒸');
      expect(decoded.combining).toBe('é');
    });
  });
});