/**
 * Global Test Environment Setup
 * Configures the testing environment with necessary mocks and utilities
 */

import 'jest-dom/extend-expect';
import { configure } from '@testing-library/react';
import { server } from '../mocks/server';

// Configure React Testing Library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
  computedStyleSupportsPseudoElements: false
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor(cb) {
    this.cb = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
  length: 0,
  key: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
global.sessionStorage = localStorageMock;

// Mock fetch
global.fetch = jest.fn();

// Mock Image constructor for Next.js Image component
global.Image = class {
  constructor() {
    setTimeout(() => {
      this.onload && this.onload();
    }, 100);
  }
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url');

// Mock performance.now
global.performance.now = jest.fn(() => Date.now());

// Mock requestAnimationFrame
global.requestAnimationFrame = jest.fn(cb => setTimeout(cb, 0));
global.cancelAnimationFrame = jest.fn();

// Mock scrollTo
global.scrollTo = jest.fn();

// Establish API mocking before all tests
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn'
  });
});

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
  
  // Clear localStorage and sessionStorage
  localStorageMock.clear();
  
  // Reset DOM
  document.body.innerHTML = '';
  document.head.innerHTML = '';
});

// Clean up after the tests are finished
afterAll(() => {
  server.close();
});

// Console error suppression for known issues
const originalConsoleError = console.error;
console.error = (...args) => {
  // Suppress specific warnings that are expected in tests
  const suppressedMessages = [
    'Warning: ReactDOM.render is deprecated',
    'Warning: An invalid form control',
    'ResizeObserver loop limit exceeded',
    'Warning: validateDOMNesting'
  ];
  
  const shouldSuppress = suppressedMessages.some(msg => 
    args[0] && args[0].toString().includes(msg)
  );
  
  if (!shouldSuppress) {
    originalConsoleError(...args);
  }
};

// Global test utilities
global.testUtils = {
  // Helper to wait for async operations
  waitFor: (condition, timeout = 5000) => {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      const check = () => {
        if (condition()) {
          resolve();
        } else if (Date.now() - startTime >= timeout) {
          reject(new Error('Condition not met within timeout'));
        } else {
          setTimeout(check, 50);
        }
      };
      
      check();
    });
  },
  
  // Helper to simulate user interactions
  simulateUserInteraction: async (element, interaction = 'click') => {
    const { fireEvent } = await import('@testing-library/react');
    
    switch (interaction) {
      case 'click':
        fireEvent.click(element);
        break;
      case 'focus':
        fireEvent.focus(element);
        break;
      case 'blur':
        fireEvent.blur(element);
        break;
      case 'hover':
        fireEvent.mouseEnter(element);
        break;
      default:
        throw new Error(`Unknown interaction: ${interaction}`);
    }
  },
  
  // Helper to check accessibility
  checkA11y: async (container) => {
    const { axe, toHaveNoViolations } = await import('jest-axe');
    expect.extend(toHaveNoViolations);
    
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  }
};

// Performance monitoring for tests
let performanceMarks = {};

global.performance.mark = jest.fn((name) => {
  performanceMarks[name] = Date.now();
});

global.performance.measure = jest.fn((name, startMark, endMark) => {
  const start = performanceMarks[startMark] || 0;
  const end = performanceMarks[endMark] || Date.now();
  const duration = end - start;
  
  return {
    name,
    duration,
    startTime: start
  };
});

// Error boundary for tests
global.TestErrorBoundary = class extends Error {
  constructor(message) {
    super(message);
    this.name = 'TestError';
  }
};

// Test data factories
global.testData = {
  createMockProject: (overrides = {}) => ({
    id: 1,
    title: 'Test Project',
    slug: 'test-project',
    description: 'A test project description',
    image: '/images/test-project.jpg',
    technologies: ['React', 'JavaScript'],
    status: 'Completed',
    featured: false,
    demo: 'https://demo.example.com',
    github: 'https://github.com/example/test',
    ...overrides
  }),
  
  createMockBlogPost: (overrides = {}) => ({
    id: 1,
    title: 'Test Blog Post',
    slug: 'test-blog-post',
    excerpt: 'Test excerpt',
    content: 'Test content',
    featured_image: '/images/test-blog.jpg',
    published_at: '2024-01-01T10:00:00Z',
    tags: ['Test', 'Blog'],
    profiles: {
      username: 'testuser',
      full_name: 'Test User',
      avatar_url: '/images/avatar.jpg'
    },
    ...overrides
  }),
  
  createMockUser: (overrides = {}) => ({
    id: 1,
    username: 'testuser',
    full_name: 'Test User',
    email: 'test@example.com',
    avatar_url: '/images/avatar.jpg',
    ...overrides
  })
};

// Custom Jest matchers
expect.extend({
  toBeAccessible(received) {
    // Custom accessibility matcher
    const pass = received && received.getAttribute && 
                 (received.getAttribute('aria-label') || 
                  received.textContent ||
                  received.getAttribute('alt'));
    
    return {
      message: () => `expected element to be accessible`,
      pass
    };
  },
  
  toHaveValidUrl(received) {
    try {
      new URL(received);
      return { pass: true };
    } catch {
      return {
        message: () => `expected "${received}" to be a valid URL`,
        pass: false
      };
    }
  },
  
  toBeWithinRange(received, floor, ceiling) {
    const pass = received >= floor && received <= ceiling;
    return {
      message: () => `expected ${received} to be within range ${floor} - ${ceiling}`,
      pass
    };
  }
});

// Set up console.log capturing for debugging
let capturedLogs = [];
const originalConsoleLog = console.log;

global.startLogCapture = () => {
  capturedLogs = [];
  console.log = (...args) => {
    capturedLogs.push(args);
    originalConsoleLog(...args);
  };
};

global.stopLogCapture = () => {
  console.log = originalConsoleLog;
  const logs = [...capturedLogs];
  capturedLogs = [];
  return logs;
};

// Cleanup function for tests
global.cleanup = () => {
  // Clear all mocks
  jest.clearAllMocks();
  
  // Clear DOM
  if (document.body) {
    document.body.innerHTML = '';
  }
  
  // Clear storage mocks
  localStorageMock.clear();
  
  // Clear performance marks
  performanceMarks = {};
  
  // Reset console
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
};

export { testUtils, testData };