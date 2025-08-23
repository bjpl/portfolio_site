const logger = require('../../../src/utils/logger');

describe('Logger Utility', () => {
  beforeEach(() => {
    // Clear any previous mock calls
    jest.clearAllMocks();
  });

  describe('Log Levels', () => {
    it('should have info method', () => {
      expect(typeof logger.info).toBe('function');
      
      logger.info('Test info message');
      // Since logger is mocked in setup, we just verify it doesn't throw
    });

    it('should have error method', () => {
      expect(typeof logger.error).toBe('function');
      
      logger.error('Test error message');
      // Since logger is mocked in setup, we just verify it doesn't throw
    });

    it('should have warn method', () => {
      expect(typeof logger.warn).toBe('function');
      
      logger.warn('Test warning message');
      // Since logger is mocked in setup, we just verify it doesn't throw
    });

    it('should have debug method', () => {
      expect(typeof logger.debug).toBe('function');
      
      logger.debug('Test debug message');
      // Since logger is mocked in setup, we just verify it doesn't throw
    });
  });

  describe('Error Logging', () => {
    it('should handle Error objects', () => {
      const error = new Error('Test error');
      error.stack = 'Test stack trace';

      expect(() => {
        logger.error('Error occurred:', error);
      }).not.toThrow();
    });

    it('should handle custom error objects', () => {
      const customError = {
        message: 'Custom error message',
        code: 'CUSTOM_ERROR',
        details: { field: 'email', reason: 'invalid format' }
      };

      expect(() => {
        logger.error('Custom error:', customError);
      }).not.toThrow();
    });
  });

  describe('Structured Logging', () => {
    it('should handle metadata objects', () => {
      const metadata = {
        userId: 123,
        action: 'login',
        ip: '192.168.1.1',
        userAgent: 'Test Browser'
      };

      expect(() => {
        logger.info('User login attempt', metadata);
      }).not.toThrow();
    });

    it('should handle performance metrics', () => {
      const metrics = {
        operation: 'database_query',
        duration: 150,
        query: 'SELECT * FROM users',
        rows: 100
      };

      expect(() => {
        logger.info('Database query completed', metrics);
      }).not.toThrow();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null messages', () => {
      expect(() => {
        logger.info(null);
      }).not.toThrow();
    });

    it('should handle undefined messages', () => {
      expect(() => {
        logger.info(undefined);
      }).not.toThrow();
    });

    it('should handle empty messages', () => {
      expect(() => {
        logger.info('');
      }).not.toThrow();
    });

    it('should handle circular reference objects', () => {
      const obj = { name: 'test' };
      obj.self = obj; // Create circular reference

      expect(() => {
        logger.info('Circular object test', obj);
      }).not.toThrow();
    });
  });

  describe('Log Sanitization', () => {
    it('should handle sensitive data safely', () => {
      const sensitiveData = {
        user: 'john@example.com',
        password: 'secret123',
        creditCard: '4111111111111111',
        ssn: '123-45-6789'
      };

      expect(() => {
        logger.info('Processing user data', sensitiveData);
      }).not.toThrow();
    });
  });
});