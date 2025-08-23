/**
 * Web Crypto API Utilities for Client-Side Encryption
 * Provides secure encryption/decryption using browser's native crypto API
 */

class CryptoUtils {
  constructor() {
    this.algorithm = 'AES-GCM';
    this.keyLength = 256;
    this.ivLength = 12;
    this.saltLength = 16;
    this.iterations = 100000;
  }

  /**
   * Generate a random salt
   * @returns {Uint8Array} Random salt
   */
  generateSalt() {
    return crypto.getRandomValues(new Uint8Array(this.saltLength));
  }

  /**
   * Generate a random IV
   * @returns {Uint8Array} Random IV
   */
  generateIV() {
    return crypto.getRandomValues(new Uint8Array(this.ivLength));
  }

  /**
   * Derive key from password using PBKDF2
   * @param {string} password - User password
   * @param {Uint8Array} salt - Salt for key derivation
   * @returns {Promise<CryptoKey>} Derived key
   */
  async deriveKey(password, salt) {
    const passwordBuffer = new TextEncoder().encode(password);
    
    const importedKey = await crypto.subtle.importKey(
      'raw',
      passwordBuffer,
      { name: 'PBKDF2' },
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: salt,
        iterations: this.iterations,
        hash: 'SHA-256'
      },
      importedKey,
      {
        name: this.algorithm,
        length: this.keyLength
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt data with password
   * @param {string} data - Data to encrypt
   * @param {string} password - Password for encryption
   * @returns {Promise<Object>} Encrypted data with salt and iv
   */
  async encrypt(data, password) {
    const salt = this.generateSalt();
    const iv = this.generateIV();
    const key = await this.deriveKey(password, salt);
    
    const dataBuffer = new TextEncoder().encode(data);
    
    const encryptedBuffer = await crypto.subtle.encrypt(
      {
        name: this.algorithm,
        iv: iv
      },
      key,
      dataBuffer
    );

    return {
      encrypted: new Uint8Array(encryptedBuffer),
      salt: salt,
      iv: iv
    };
  }

  /**
   * Decrypt data with password
   * @param {Object} encryptedData - Object containing encrypted data, salt, and iv
   * @param {string} password - Password for decryption
   * @returns {Promise<string>} Decrypted data
   */
  async decrypt(encryptedData, password) {
    const { encrypted, salt, iv } = encryptedData;
    const key = await this.deriveKey(password, salt);
    
    try {
      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.algorithm,
          iv: iv
        },
        key,
        encrypted
      );

      return new TextDecoder().decode(decryptedBuffer);
    } catch (error) {
      throw new Error('Decryption failed - invalid password or corrupted data');
    }
  }

  /**
   * Hash password using SHA-256
   * @param {string} password - Password to hash
   * @param {Uint8Array} salt - Salt for hashing
   * @returns {Promise<string>} Hashed password (hex string)
   */
  async hashPassword(password, salt) {
    const passwordBuffer = new TextEncoder().encode(password + this.arrayToHex(salt));
    const hashBuffer = await crypto.subtle.digest('SHA-256', passwordBuffer);
    return this.arrayToHex(new Uint8Array(hashBuffer));
  }

  /**
   * Generate secure random token
   * @param {number} length - Token length in bytes
   * @returns {string} Random token (hex string)
   */
  generateToken(length = 32) {
    const randomBytes = crypto.getRandomValues(new Uint8Array(length));
    return this.arrayToHex(randomBytes);
  }

  /**
   * Convert Uint8Array to hex string
   * @param {Uint8Array} array - Array to convert
   * @returns {string} Hex string
   */
  arrayToHex(array) {
    return Array.from(array)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to Uint8Array
   * @param {string} hex - Hex string to convert
   * @returns {Uint8Array} Converted array
   */
  hexToArray(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
  }

  /**
   * Secure compare of two strings (timing-safe)
   * @param {string} a - First string
   * @param {string} b - Second string
   * @returns {boolean} True if strings match
   */
  secureCompare(a, b) {
    if (a.length !== b.length) {
      return false;
    }
    
    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }
    
    return result === 0;
  }

  /**
   * Generate HMAC signature
   * @param {string} data - Data to sign
   * @param {string} secret - Secret key
   * @returns {Promise<string>} HMAC signature
   */
  async generateHMAC(data, secret) {
    const secretKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );

    const signature = await crypto.subtle.sign(
      'HMAC',
      secretKey,
      new TextEncoder().encode(data)
    );

    return this.arrayToHex(new Uint8Array(signature));
  }

  /**
   * Verify HMAC signature
   * @param {string} data - Original data
   * @param {string} signature - Signature to verify
   * @param {string} secret - Secret key
   * @returns {Promise<boolean>} True if signature is valid
   */
  async verifyHMAC(data, signature, secret) {
    const expectedSignature = await this.generateHMAC(data, secret);
    return this.secureCompare(signature, expectedSignature);
  }
}

// Export for use in other modules
window.CryptoUtils = CryptoUtils;

export default CryptoUtils;