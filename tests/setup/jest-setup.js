// Jest setup file for global test configuration
import '@testing-library/jest-dom';

// Mock environment variables
process.env.NODE_ENV = 'test';

// Global test setup
beforeEach(() => {
  // Reset any mocks before each test
  jest.clearAllMocks();
});

// Suppress console.error during tests unless explicitly needed
const originalError = console.error;
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning:') || args[0].includes('ReactDOMTestUtils'))
    ) {
      return;
    }
    originalError.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
});