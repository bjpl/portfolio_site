module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
  
  // Test match patterns
  testMatch: [
    '**/tests/**/*.test.js',
    '**/tests/**/*.spec.js',
    '**/__tests__/**/*.js'
  ],
  
  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/simple-cms-server.js',
    '!src/config/index.js',
    '!src/migrations/**',
    '!src/seeders/**',
    '!src/**/*.spec.js',
    '!src/**/*.test.js',
    '!src/test/**',
    '!src/tests/**'
  ],
  
  coverageDirectory: 'coverage',
  
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json-summary'
  ],
  
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    },
    './src/services/': {
      branches: 85,
      functions: 85,
      lines: 85,
      statements: 85
    },
    './src/models/': {
      branches: 75,
      functions: 75,
      lines: 75,
      statements: 75
    },
    './src/middleware/': {
      branches: 90,
      functions: 90,
      lines: 90,
      statements: 90
    }
  },
  
  // Module name mapper for aliases
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^@config/(.*)$': '<rootDir>/src/config/$1',
    '^@models/(.*)$': '<rootDir>/src/models/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@middleware/(.*)$': '<rootDir>/src/middleware/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@routes/(.*)$': '<rootDir>/src/routes/$1',
    '^@controllers/(.*)$': '<rootDir>/src/controllers/$1',
    '^@fixtures/(.*)$': '<rootDir>/tests/fixtures/$1'
  },
  
  // Transform files
  transform: {
    '^.+\\.js$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', {
          targets: {
            node: 'current'
          }
        }]
      ]
    }]
  },
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/build/',
    '/public/',
    '/uploads/',
    '/temp/'
  ],
  
  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json',
    'node'
  ],
  
  // Test timeout
  testTimeout: 30000,
  
  // Verbose output
  verbose: true,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Reset modules after each test
  resetModules: false,
  
  // Automatically reset mock state after every test
  resetMocks: false,
  
  // Max workers for parallel test execution
  maxWorkers: '50%',
  
  // Collect coverage from untested files
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/simple-cms-server.js',
    '!src/config/index.js',
    '!src/migrations/**',
    '!src/seeders/**',
    '!src/**/*.spec.js',
    '!src/**/*.test.js',
    '!src/test/**',
    '!src/tests/**'
  ],
  
  // Coverage path ignore patterns
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/',
    '/test/',
    'src/migrations/',
    'src/seeders/',
    'src/config/index.js'
  ],
  
  // Global setup and teardown
  globalSetup: '<rootDir>/tests/global-setup.js',
  globalTeardown: '<rootDir>/tests/global-teardown.js',
  
  // Test environment options
  testEnvironmentOptions: {
    url: 'http://localhost'
  },
  
  // Watch plugins (commented out as package may not be available)
  // watchPlugins: [
  //   'jest-watch-typeahead/filename',
  //   'jest-watch-typeahead/testname'
  // ].filter(Boolean),
  
  // Jest project configuration for different test types
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js']
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/tests/integration/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 60000
    },
    {
      displayName: 'e2e',
      testMatch: ['<rootDir>/tests/e2e/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 120000
    },
    {
      displayName: 'performance',
      testMatch: ['<rootDir>/tests/performance/**/*.test.js'],
      testEnvironment: 'node',
      setupFilesAfterEnv: ['<rootDir>/tests/setup.js'],
      testTimeout: 300000, // 5 minutes for performance tests
      verbose: false // Less verbose for performance tests
    }
  ],
  
  // Reporter configuration (using only built-in reporters)
  reporters: ['default'],
  
  // Notify configuration
  notify: false,
  notifyMode: 'failure-change',
  
  // Error handling
  errorOnDeprecated: true,
  
  // Snapshot serializers (commented out as package may not be available)
  // snapshotSerializers: [
  //   'jest-serializer-path'
  // ].filter(Boolean),
  
  // Mock configuration
  unmockedModulePathPatterns: [
    'node_modules/react/',
    'node_modules/sequelize/'
  ],
  
  // Dependency extraction
  dependencyExtractor: null,
  
  // Force exit after tests complete
  forceExit: false,
  
  // Detect open handles
  detectOpenHandles: true,
  
  // Detect leaked handles
  detectLeaks: false,
  
  // Bail on first test failure
  bail: 0,
  
  // Cache directory
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  
  // Use cache
  cache: true,
  
  // Watch mode configuration
  watchman: true,
  
  // Transform ignore patterns
  transformIgnorePatterns: [
    'node_modules/(?!(some-es6-module)/)'
  ],
  
  // Global variables
  globals: {
    __DEV__: false,
    __TEST__: true
  }
};