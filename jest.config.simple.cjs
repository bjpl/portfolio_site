/**
 * Simplified Jest Configuration for Testing Framework Validation
 */
module.exports = {
  testEnvironment: 'jsdom',
  
  roots: ['<rootDir>/tests'],
  
  testMatch: [
    '**/tests/**/*.test.{js,jsx,ts,tsx}'
  ],
  
  setupFilesAfterEnv: [
    '@testing-library/jest-dom'
  ],
  
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|eot|otf|webp|svg|ttf|woff|woff2|mp4|webm|wav|mp3|m4a|aac|oga)$': '<rootDir>/tests/mocks/fileMock.js'
  },
  
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }],
        '@babel/preset-typescript'
      ]
    }]
  },
  
  testTimeout: 10000,
  clearMocks: true,
  restoreMocks: true,
  
  // Basic coverage
  collectCoverage: false,
  coverageDirectory: 'coverage',
  
  // Simple reporter
  reporters: ['default']
};