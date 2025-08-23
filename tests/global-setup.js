const path = require('path');
const fs = require('fs');

/**
 * Global setup that runs once before all tests
 * This is executed in a separate Node.js process
 */
module.exports = async () => {
  console.log('🚀 Running global test setup...');
  
  // Set environment to test
  process.env.NODE_ENV = 'test';
  
  // Create necessary test directories
  const testDirs = [
    path.join(__dirname, '../uploads/test'),
    path.join(__dirname, '../uploads/test/images'),
    path.join(__dirname, '../uploads/test/documents'),
    path.join(__dirname, '../uploads/test/videos'),
    path.join(__dirname, '../content/test'),
    path.join(__dirname, '../logs/test'),
    path.join(__dirname, '../coverage'),
    path.join(__dirname, '../coverage/html-report'),
    path.join(__dirname, '../coverage/junit')
  ];
  
  for (const dir of testDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✓ Created test directory: ${dir}`);
    }
  }
  
  // Create test environment variables file
  const testEnvPath = path.join(__dirname, '../.env.test');
  const testEnvContent = `
# Test Environment Configuration
NODE_ENV=test

# Database
DB_DIALECT=sqlite
DB_STORAGE=:memory:
DB_LOGGING=false

# JWT
JWT_SECRET=test-jwt-secret-key-for-testing-only
JWT_ACCESS_TOKEN_EXPIRY=1h
JWT_REFRESH_TOKEN_EXPIRY=7d

# BCrypt
BCRYPT_ROUNDS=4

# Rate Limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_AUTH_MAX=10

# File Uploads
UPLOAD_DIR=${path.join(__dirname, '../uploads/test')}
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpg,jpeg,png,gif,pdf,txt

# Email (Mock)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=test@ethereal.email
SMTP_PASS=test-password
FROM_EMAIL=test@example.com
FROM_NAME=Test Portfolio

# Redis (Mock)
REDIS_URL=redis://localhost:6379/1
REDIS_SESSION_PREFIX=test:sess:

# API
API_BASE_URL=http://localhost:4000/api
FRONTEND_URL=http://localhost:3000
CORS_ORIGIN=http://localhost:3000,http://localhost:1313

# Logging
LOG_LEVEL=error
LOG_TO_FILE=false
LOG_TO_CONSOLE=false

# Security
HELMET_ENABLED=false
CSRF_ENABLED=false
SESSION_SECRET=test-session-secret

# Content
CONTENT_DIR=${path.join(__dirname, '../content/test')}
HUGO_CONTENT_DIR=${path.join(__dirname, '../content/test')}

# GraphQL
GRAPHQL_INTROSPECTION=true
GRAPHQL_PLAYGROUND=true

# Sentry (Disabled)
SENTRY_DSN=
SENTRY_ENVIRONMENT=test
`;
  
  if (!fs.existsSync(testEnvPath)) {
    fs.writeFileSync(testEnvPath, testEnvContent);
    console.log('✓ Created test environment file');
  }
  
  // Create test fixtures
  const fixturesDir = path.join(__dirname, 'fixtures');
  if (!fs.existsSync(fixturesDir)) {
    fs.mkdirSync(fixturesDir, { recursive: true });
    
    // Create sample test data files
    const testData = {
      users: [
        {
          id: '550e8400-e29b-41d4-a716-446655440000',
          username: 'testuser',
          email: 'test@example.com',
          firstName: 'Test',
          lastName: 'User',
          role: 'user',
          isActive: true,
          isVerified: true
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440001',
          username: 'admin',
          email: 'admin@example.com',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
          isActive: true,
          isVerified: true
        }
      ],
      projects: [
        {
          id: '550e8400-e29b-41d4-a716-446655440002',
          title: 'Test Project',
          slug: 'test-project',
          shortDescription: 'A test project',
          description: 'This is a test project for unit testing',
          category: 'web',
          status: 'published',
          visibility: 'public',
          isFeatured: true,
          technologies: ['JavaScript', 'Node.js', 'React'],
          authorId: '550e8400-e29b-41d4-a716-446655440000'
        }
      ],
      blogs: [
        {
          id: '550e8400-e29b-41d4-a716-446655440003',
          title: 'Test Blog Post',
          slug: 'test-blog-post',
          content: '<h1>Test Blog</h1><p>This is a test blog post.</p>',
          markdown: '# Test Blog\n\nThis is a test blog post.',
          excerpt: 'A test blog post',
          status: 'published',
          language: 'en',
          publishedAt: new Date().toISOString(),
          authorId: '550e8400-e29b-41d4-a716-446655440000'
        }
      ],
      tags: [
        {
          id: '550e8400-e29b-41d4-a716-446655440004',
          name: 'JavaScript',
          slug: 'javascript',
          description: 'JavaScript programming language'
        },
        {
          id: '550e8400-e29b-41d4-a716-446655440005',
          name: 'Node.js',
          slug: 'nodejs',
          description: 'Node.js runtime environment'
        }
      ]
    };
    
    Object.entries(testData).forEach(([key, data]) => {
      const filePath = path.join(fixturesDir, `${key}.json`);
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
      console.log(`✓ Created test fixture: ${key}.json`);
    });
  }
  
  // Create test Hugo content
  const testContentDir = path.join(__dirname, '../content/test');
  const testPostDir = path.join(testContentDir, 'posts');
  
  if (!fs.existsSync(testPostDir)) {
    fs.mkdirSync(testPostDir, { recursive: true });
    
    const testPost = `---
title: "Test Hugo Blog Post"
date: 2024-01-01T00:00:00Z
draft: false
description: "A test blog post for Hugo integration"
tags: ["test", "hugo"]
categories: ["testing"]
author: "Test Author"
---

# Test Hugo Blog Post

This is a test blog post created for testing Hugo integration with the API.

## Features

- Markdown parsing
- Front matter extraction
- Content processing

## Code Example

\`\`\`javascript
const test = () => {
  console.log('Hello, World!');
};
\`\`\`

## Conclusion

This post demonstrates the Hugo integration functionality.
`;
    
    fs.writeFileSync(path.join(testPostDir, 'test-post.md'), testPost);
    console.log('✓ Created test Hugo content');
  }
  
  // Set up test database
  try {
    // Import database models in the global setup context
    const { sequelize } = require('../backend/src/models');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✓ Test database connection verified');
    
    // Initialize test database schema
    await sequelize.sync({ force: true });
    console.log('✓ Test database schema initialized');
    
    // Close the connection
    await sequelize.close();
    
  } catch (error) {
    console.warn('⚠️  Database setup skipped (database may not be available):', error.message);
  }
  
  // Create test SSL certificates (if needed)
  const certDir = path.join(__dirname, '../certs/test');
  if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
    console.log('✓ Created test certificates directory');
  }
  
  // Set up test cache directory
  const cacheDir = path.join(__dirname, '../node_modules/.cache/jest');
  if (!fs.existsSync(cacheDir)) {
    fs.mkdirSync(cacheDir, { recursive: true });
    console.log('✓ Created Jest cache directory');
  }
  
  // Load environment variables from test file
  require('dotenv').config({ path: testEnvPath });
  
  console.log('✅ Global test setup complete');
};
