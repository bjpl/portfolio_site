/**
 * Client-Side JWT Implementation
 * Generates and validates JWT tokens without server dependency
 */

class JWTUtils {
  constructor() {
    this.crypto = new CryptoUtils();
    this.defaultExpiry = 24 * 60 * 60 * 1000; // 24 hours
    this.issuer = 'static-cms';
    this.secretKey = null;
  }

  /**
   * Initialize with a secret key (derived from user session)
   * @param {string} userSecret - User-specific secret for JWT signing
   */
  async init(userSecret) {
    // Generate a consistent secret key from user data
    const salt = new TextEncoder().encode('jwt-secret-salt-2024');
    const secretData = new TextEncoder().encode(userSecret + this.issuer);
    
    const hashBuffer = await crypto.subtle.digest('SHA-256', 
      new Uint8Array([...salt, ...secretData])
    );
    
    this.secretKey = this.crypto.arrayToHex(new Uint8Array(hashBuffer));
  }

  /**
   * Base64 URL encode
   * @param {string} str - String to encode
   * @returns {string} Base64 URL encoded string
   */
  base64UrlEncode(str) {
    const base64 = btoa(str);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Base64 URL decode
   * @param {string} str - String to decode
   * @returns {string} Decoded string
   */
  base64UrlDecode(str) {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    const padding = 4 - (base64.length % 4);
    if (padding !== 4) {
      base64 += '='.repeat(padding);
    }
    return atob(base64);
  }

  /**
   * Generate JWT token
   * @param {Object} payload - Token payload
   * @param {number} expiresIn - Expiration time in milliseconds
   * @returns {Promise<string>} JWT token
   */
  async generateToken(payload, expiresIn = this.defaultExpiry) {
    if (!this.secretKey) {
      throw new Error('JWT utility not initialized with secret key');
    }

    const header = {
      alg: 'HS256',
      typ: 'JWT'
    };

    const now = Date.now();
    const claims = {
      ...payload,
      iss: this.issuer,
      iat: Math.floor(now / 1000),
      exp: Math.floor((now + expiresIn) / 1000),
      jti: this.crypto.generateToken(16) // JWT ID for uniqueness
    };

    const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
    const encodedPayload = this.base64UrlEncode(JSON.stringify(claims));
    
    const signatureInput = `${encodedHeader}.${encodedPayload}`;
    const signature = await this.crypto.generateHMAC(signatureInput, this.secretKey);
    const encodedSignature = this.base64UrlEncode(signature);

    return `${encodedHeader}.${encodedPayload}.${encodedSignature}`;
  }

  /**
   * Verify and decode JWT token
   * @param {string} token - JWT token to verify
   * @returns {Promise<Object|null>} Decoded payload or null if invalid
   */
  async verifyToken(token) {
    if (!this.secretKey) {
      throw new Error('JWT utility not initialized with secret key');
    }

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const [encodedHeader, encodedPayload, encodedSignature] = parts;
      
      // Verify signature
      const signatureInput = `${encodedHeader}.${encodedPayload}`;
      const expectedSignature = await this.crypto.generateHMAC(signatureInput, this.secretKey);
      const providedSignature = this.base64UrlDecode(encodedSignature);

      if (!this.crypto.secureCompare(expectedSignature, providedSignature)) {
        console.warn('JWT signature verification failed');
        return null;
      }

      // Decode and validate payload
      const header = JSON.parse(this.base64UrlDecode(encodedHeader));
      const payload = JSON.parse(this.base64UrlDecode(encodedPayload));

      // Check algorithm
      if (header.alg !== 'HS256') {
        console.warn('Invalid JWT algorithm');
        return null;
      }

      // Check expiration
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        console.warn('JWT token expired');
        return null;
      }

      // Check issuer
      if (payload.iss !== this.issuer) {
        console.warn('Invalid JWT issuer');
        return null;
      }

      // Check not before (if present)
      if (payload.nbf && payload.nbf > now) {
        console.warn('JWT token not yet valid');
        return null;
      }

      return payload;
    } catch (error) {
      console.error('JWT verification error:', error);
      return null;
    }
  }

  /**
   * Refresh JWT token (generate new token with updated expiration)
   * @param {string} token - Current token
   * @param {number} expiresIn - New expiration time in milliseconds
   * @returns {Promise<string|null>} New token or null if invalid
   */
  async refreshToken(token, expiresIn = this.defaultExpiry) {
    const payload = await this.verifyToken(token);
    if (!payload) {
      return null;
    }

    // Remove JWT-specific claims for new token
    const newPayload = { ...payload };
    delete newPayload.iat;
    delete newPayload.exp;
    delete newPayload.jti;
    delete newPayload.iss;

    return await this.generateToken(newPayload, expiresIn);
  }

  /**
   * Decode JWT without verification (for reading expired tokens)
   * @param {string} token - JWT token
   * @returns {Object|null} Decoded payload or null
   */
  decodeToken(token) {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        return null;
      }

      const payload = JSON.parse(this.base64UrlDecode(parts[1]));
      return payload;
    } catch (error) {
      console.error('JWT decode error:', error);
      return null;
    }
  }

  /**
   * Check if token is expired
   * @param {string} token - JWT token
   * @returns {boolean} True if expired
   */
  isTokenExpired(token) {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return payload.exp < now;
  }

  /**
   * Get time until token expires
   * @param {string} token - JWT token
   * @returns {number} Milliseconds until expiration, or 0 if expired
   */
  getTimeUntilExpiry(token) {
    const payload = this.decodeToken(token);
    if (!payload || !payload.exp) {
      return 0;
    }

    const now = Math.floor(Date.now() / 1000);
    const timeLeft = (payload.exp - now) * 1000;
    return Math.max(0, timeLeft);
  }

  /**
   * Extract user information from token
   * @param {string} token - JWT token
   * @returns {Object|null} User information or null
   */
  getUserFromToken(token) {
    const payload = this.decodeToken(token);
    if (!payload) {
      return null;
    }

    return {
      username: payload.username,
      email: payload.email,
      role: payload.role,
      profile: payload.profile,
      permissions: payload.permissions || []
    };
  }

  /**
   * Create admin token with enhanced permissions
   * @param {Object} user - User object
   * @param {Array} permissions - Additional permissions
   * @returns {Promise<string>} Admin JWT token
   */
  async generateAdminToken(user, permissions = []) {
    const adminPayload = {
      username: user.username,
      email: user.email,
      role: user.role,
      profile: user.profile,
      permissions: [
        'read:posts',
        'write:posts',
        'delete:posts',
        'manage:users',
        'access:admin',
        'modify:settings',
        ...permissions
      ],
      isAdmin: user.role === 'admin' || user.role === 'super_admin',
      scope: 'full_access'
    };

    return await this.generateToken(adminPayload, this.defaultExpiry);
  }

  /**
   * Validate admin permissions in token
   * @param {string} token - JWT token
   * @param {string} permission - Required permission
   * @returns {Promise<boolean>} True if permission granted
   */
  async hasPermission(token, permission) {
    const payload = await this.verifyToken(token);
    if (!payload) {
      return false;
    }

    return payload.permissions && payload.permissions.includes(permission);
  }
}

// Export for use in other modules
window.JWTUtils = JWTUtils;

export default JWTUtils;