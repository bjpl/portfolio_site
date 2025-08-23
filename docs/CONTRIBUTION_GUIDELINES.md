# Contribution Guidelines

## Table of Contents
1. [Welcome Contributors](#welcome-contributors)
2. [Code of Conduct](#code-of-conduct)
3. [Getting Started](#getting-started)
4. [Development Setup](#development-setup)
5. [How to Contribute](#how-to-contribute)
6. [Coding Standards](#coding-standards)
7. [Git Workflow](#git-workflow)
8. [Testing Requirements](#testing-requirements)
9. [Documentation Standards](#documentation-standards)
10. [Review Process](#review-process)

## Welcome Contributors

Thank you for your interest in contributing to the Portfolio Site project! We welcome contributions from developers of all skill levels. This document provides guidelines to help you contribute effectively to the project.

### Types of Contributions We Welcome

- **Code Contributions**: Bug fixes, new features, performance improvements
- **Documentation**: Improvements to docs, tutorials, examples
- **Design**: UI/UX improvements, accessibility enhancements
- **Testing**: Test cases, bug reports, test coverage improvements
- **Translations**: Help translate the site to other languages
- **Ideas**: Feature suggestions, architecture discussions

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inclusive environment for all contributors.

### Expected Behavior

- **Be Respectful**: Value each other's ideas, skills, and time
- **Be Constructive**: Provide helpful feedback and accept criticism gracefully
- **Be Inclusive**: Welcome newcomers and help them get started
- **Be Professional**: Maintain professional conduct in all interactions
- **Be Collaborative**: Work together to solve problems

### Unacceptable Behavior

- Harassment, discrimination, or offensive comments
- Personal attacks or trolling
- Publishing private information without consent
- Unprofessional conduct
- Any behavior that creates an unsafe environment

### Reporting Issues

Report violations to: conduct@portfolio.com

## Getting Started

### Prerequisites

Before contributing, ensure you have:

1. **Technical Requirements**:
   - Node.js 20+ LTS
   - Git 2.x+
   - Code editor (VS Code recommended)
   - GitHub account

2. **Knowledge Requirements**:
   - Basic understanding of JavaScript/Node.js
   - Familiarity with Git and GitHub
   - Understanding of web development concepts

### First-Time Contributors

1. **Find an Issue**:
   ```bash
   # Look for "good first issue" or "help wanted" labels
   https://github.com/portfolio/site/labels/good%20first%20issue
   ```

2. **Read Documentation**:
   - Review README.md
   - Read architecture documentation
   - Understand the codebase structure

3. **Join Community**:
   - Join our Discord server
   - Introduce yourself
   - Ask questions in #help channel

## Development Setup

### Fork and Clone

```bash
# Fork the repository on GitHub

# Clone your fork
git clone https://github.com/YOUR_USERNAME/portfolio-site.git
cd portfolio-site

# Add upstream remote
git remote add upstream https://github.com/portfolio/site.git

# Verify remotes
git remote -v
```

### Install Dependencies

```bash
# Install Node dependencies
npm install

# Install Hugo (if not installed)
# macOS
brew install hugo

# Windows
choco install hugo-extended

# Linux
snap install hugo --channel=extended
```

### Environment Configuration

```bash
# Copy environment template
cp .env.example .env

# Edit .env with your settings
nano .env

# Required environment variables
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=portfolio_dev
DB_USER=developer
DB_PASSWORD=dev_password
```

### Database Setup

```bash
# Start PostgreSQL
# macOS
brew services start postgresql

# Linux
sudo systemctl start postgresql

# Create database
createdb portfolio_dev

# Run migrations
npm run db:migrate

# Seed development data
npm run db:seed
```

### Running the Application

```bash
# Start development server
npm run dev

# Run specific services
npm run backend:dev  # Backend only
npm run hugo:dev     # Frontend only

# Access the application
# Frontend: http://localhost:1313
# Backend API: http://localhost:3000
```

## How to Contribute

### Finding Issues to Work On

1. **Browse Issues**: Check [open issues](https://github.com/portfolio/site/issues)
2. **Filter by Labels**:
   - `good first issue`: Great for beginners
   - `help wanted`: Community help needed
   - `bug`: Bug fixes
   - `enhancement`: New features
   - `documentation`: Doc improvements

3. **Claim an Issue**:
   ```markdown
   # Comment on the issue
   "I'd like to work on this issue. Can you assign it to me?"
   ```

### Creating a New Issue

```markdown
<!-- Bug Report Template -->
## Bug Description
A clear description of the bug

## Steps to Reproduce
1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior
What should happen

## Actual Behavior
What actually happens

## Environment
- OS: [e.g., Ubuntu 20.04]
- Node.js: [e.g., 20.11.0]
- Browser: [e.g., Chrome 120]

## Screenshots
If applicable

## Additional Context
Any other relevant information
```

```markdown
<!-- Feature Request Template -->
## Feature Description
Clear description of the feature

## Problem it Solves
What problem does this feature address?

## Proposed Solution
How should it work?

## Alternatives Considered
Other approaches you've thought about

## Additional Context
Mockups, examples, or references
```

### Making Changes

1. **Create a Branch**:
   ```bash
   # Update main branch
   git checkout main
   git pull upstream main
   
   # Create feature branch
   git checkout -b feature/your-feature-name
   # or
   git checkout -b fix/issue-number-description
   ```

2. **Make Your Changes**:
   - Write clean, readable code
   - Follow coding standards
   - Add tests for new features
   - Update documentation

3. **Commit Your Changes**:
   ```bash
   # Stage changes
   git add .
   
   # Commit with descriptive message
   git commit -m "feat: add user authentication feature
   
   - Implement JWT authentication
   - Add login/logout endpoints
   - Create auth middleware
   - Add tests for auth flow
   
   Fixes #123"
   ```

## Coding Standards

### JavaScript/Node.js Standards

```javascript
/**
 * File Header Template
 * @file Description of file purpose
 * @author Your Name
 * @since Version when added
 */

/**
 * Function documentation
 * @param {string} param1 - Description of param1
 * @param {number} param2 - Description of param2
 * @returns {Promise<Object>} Description of return value
 * @throws {Error} Description of when errors are thrown
 * @example
 * const result = await functionName('value', 123);
 */
async function functionName(param1, param2) {
  // Input validation
  if (!param1 || typeof param1 !== 'string') {
    throw new Error('param1 must be a non-empty string');
  }
  
  // Use meaningful variable names
  const userData = await getUserData(param1);
  
  // Handle errors properly
  try {
    const result = await processData(userData, param2);
    return result;
  } catch (error) {
    logger.error('Error processing data', { error, param1, param2 });
    throw new Error(`Failed to process data: ${error.message}`);
  }
}

// Export patterns
module.exports = {
  functionName
};

// ES6 modules
export { functionName };
export default className;
```

### CSS/SCSS Standards

```scss
// File: components/_button.scss

// Component documentation
// Button component with multiple variants
// Usage: <button class="btn btn--primary">Click me</button>

// Variables
$button-padding: 0.75rem 1.5rem;
$button-border-radius: 4px;
$button-transition: all 0.3s ease;

// BEM naming convention
.btn {
  // Base styles
  display: inline-block;
  padding: $button-padding;
  border: none;
  border-radius: $button-border-radius;
  font-family: inherit;
  font-size: 1rem;
  cursor: pointer;
  transition: $button-transition;
  
  // Modifiers
  &--primary {
    background-color: var(--color-primary);
    color: white;
    
    &:hover {
      background-color: var(--color-primary-dark);
    }
  }
  
  &--secondary {
    background-color: var(--color-secondary);
    color: white;
  }
  
  // States
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  
  // Elements
  &__icon {
    margin-right: 0.5rem;
  }
  
  &__text {
    vertical-align: middle;
  }
}

// Responsive design
@media (max-width: 768px) {
  .btn {
    padding: 0.5rem 1rem;
    font-size: 0.875rem;
  }
}
```

### HTML/Template Standards

```html
<!-- Component: Card -->
<article class="card" data-testid="card-component">
  <!-- Semantic HTML -->
  <header class="card__header">
    <h2 class="card__title">{{ .Title }}</h2>
    <time class="card__date" datetime="{{ .Date }}">
      {{ .Date | dateFormat "January 2, 2006" }}
    </time>
  </header>
  
  <!-- Accessibility attributes -->
  <img 
    class="card__image" 
    src="{{ .Image }}" 
    alt="{{ .ImageAlt }}"
    loading="lazy"
    width="300"
    height="200"
  >
  
  <div class="card__content">
    <p class="card__description">{{ .Description }}</p>
  </div>
  
  <!-- Properly labeled interactive elements -->
  <footer class="card__footer">
    <a 
      href="{{ .URL }}" 
      class="card__link"
      aria-label="Read more about {{ .Title }}"
    >
      Read More
      <span class="sr-only">about {{ .Title }}</span>
    </a>
  </footer>
</article>
```

### File Naming Conventions

```bash
# JavaScript/TypeScript files
userController.js       # camelCase for files
UserService.js         # PascalCase for classes
user.model.js          # descriptive suffixes
user.test.js           # test files

# CSS/SCSS files
_variables.scss        # Partials with underscore
_mixins.scss
main.scss             # Main files without underscore
components.scss

# React/Vue components
UserProfile.jsx        # PascalCase for components
Button.vue
Header.component.tsx

# Configuration files
.env.example          # Environment template
.eslintrc.js         # Linter config
jest.config.js       # Test config
```

## Git Workflow

### Branch Naming

```bash
# Feature branches
feature/user-authentication
feature/add-payment-integration

# Bug fixes
fix/login-error
fix/issue-456-memory-leak

# Documentation
docs/api-documentation
docs/update-readme

# Refactoring
refactor/database-queries
refactor/component-structure

# Performance
perf/optimize-images
perf/reduce-bundle-size
```

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
# Format
<type>(<scope>): <subject>

<body>

<footer>

# Types
feat: New feature
fix: Bug fix
docs: Documentation changes
style: Code style changes (formatting, etc)
refactor: Code refactoring
perf: Performance improvements
test: Test additions or fixes
build: Build system changes
ci: CI/CD changes
chore: Maintenance tasks

# Examples
feat(auth): add OAuth2 integration

- Implement Google OAuth2
- Add Facebook login
- Create OAuth middleware
- Update user model for social logins

Closes #234

fix(api): resolve memory leak in data processing

The data processor was not properly releasing memory
after processing large files. This fix ensures all
streams are properly closed and garbage collected.

Fixes #567
```

### Pull Request Process

1. **Create Pull Request**:
   ```bash
   # Push your branch
   git push origin feature/your-feature
   
   # Create PR on GitHub
   ```

2. **PR Template**:
   ```markdown
   ## Description
   Brief description of changes
   
   ## Type of Change
   - [ ] Bug fix
   - [ ] New feature
   - [ ] Breaking change
   - [ ] Documentation update
   
   ## Changes Made
   - List specific changes
   - Include technical details
   
   ## Testing
   - [ ] Unit tests pass
   - [ ] Integration tests pass
   - [ ] Manual testing completed
   
   ## Screenshots
   If applicable
   
   ## Checklist
   - [ ] Code follows style guidelines
   - [ ] Self-review completed
   - [ ] Comments added where needed
   - [ ] Documentation updated
   - [ ] No new warnings
   - [ ] Tests added/updated
   - [ ] All tests passing
   
   ## Related Issues
   Fixes #123
   Related to #456
   ```

## Testing Requirements

### Unit Testing

```javascript
// test/unit/userService.test.js
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const UserService = require('../../src/services/UserService');

describe('UserService', () => {
  let userService;
  
  beforeEach(() => {
    userService = new UserService();
  });
  
  afterEach(() => {
    jest.clearAllMocks();
  });
  
  describe('createUser', () => {
    it('should create a new user with valid data', async () => {
      // Arrange
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'SecurePass123!'
      };
      
      // Act
      const user = await userService.createUser(userData);
      
      // Assert
      expect(user).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.password).not.toBe(userData.password); // Should be hashed
    });
    
    it('should throw error for invalid email', async () => {
      // Arrange
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'SecurePass123!'
      };
      
      // Act & Assert
      await expect(userService.createUser(userData))
        .rejects
        .toThrow('Invalid email format');
    });
  });
});
```

### Integration Testing

```javascript
// test/integration/api.test.js
const request = require('supertest');
const app = require('../../src/app');

describe('API Integration Tests', () => {
  describe('POST /api/users', () => {
    it('should create a new user', async () => {
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'newuser@example.com',
          name: 'New User',
          password: 'SecurePass123!'
        })
        .expect(201);
      
      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('newuser@example.com');
    });
    
    it('should return 400 for duplicate email', async () => {
      // Create first user
      await request(app)
        .post('/api/users')
        .send({
          email: 'duplicate@example.com',
          name: 'First User',
          password: 'SecurePass123!'
        });
      
      // Try to create duplicate
      const response = await request(app)
        .post('/api/users')
        .send({
          email: 'duplicate@example.com',
          name: 'Second User',
          password: 'SecurePass123!'
        })
        .expect(400);
      
      expect(response.body.error).toContain('already exists');
    });
  });
});
```

### Test Coverage Requirements

```bash
# Minimum coverage thresholds
- Statements: 80%
- Branches: 75%
- Functions: 80%
- Lines: 80%

# Run tests with coverage
npm test -- --coverage

# Generate coverage report
npm run test:coverage
```

## Documentation Standards

### Code Documentation

```javascript
/**
 * Service for managing user operations
 * @class UserService
 * @module services/user
 */
class UserService {
  /**
   * Creates a new user in the system
   * @async
   * @param {Object} userData - User data object
   * @param {string} userData.email - User's email address
   * @param {string} userData.name - User's full name
   * @param {string} userData.password - User's password (will be hashed)
   * @param {string} [userData.role='user'] - User's role
   * @returns {Promise<User>} Created user object
   * @throws {ValidationError} If user data is invalid
   * @throws {DuplicateError} If email already exists
   * @example
   * const userService = new UserService();
   * const user = await userService.createUser({
   *   email: 'john@example.com',
   *   name: 'John Doe',
   *   password: 'SecurePass123!'
   * });
   */
  async createUser(userData) {
    // Implementation
  }
}
```

### API Documentation

```yaml
# openapi.yaml
/api/users:
  post:
    summary: Create a new user
    description: Creates a new user account in the system
    tags:
      - Users
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            required:
              - email
              - name
              - password
            properties:
              email:
                type: string
                format: email
                example: user@example.com
              name:
                type: string
                minLength: 2
                maxLength: 100
                example: John Doe
              password:
                type: string
                minLength: 8
                pattern: ^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])
                example: SecurePass123!
    responses:
      201:
        description: User created successfully
        content:
          application/json:
            schema:
              $ref: '#/components/schemas/User'
      400:
        description: Invalid input data
      409:
        description: Email already exists
```

### README Documentation

```markdown
## Feature Name

### Overview
Brief description of what this feature does

### Usage
```javascript
// Code example showing how to use the feature
const feature = require('./feature');
const result = await feature.doSomething();
```

### Configuration
| Option | Type | Default | Description |
|--------|------|---------|-------------|
| enabled | boolean | true | Enable/disable feature |
| timeout | number | 5000 | Timeout in milliseconds |

### API Reference
Link to detailed API documentation

### Examples
Link to example implementations
```

## Review Process

### Code Review Checklist

**Functionality**:
- [ ] Code accomplishes the intended goal
- [ ] Edge cases are handled
- [ ] Error handling is appropriate
- [ ] No obvious bugs

**Code Quality**:
- [ ] Follows coding standards
- [ ] No code duplication
- [ ] Proper abstraction levels
- [ ] Clear variable/function names

**Performance**:
- [ ] No unnecessary loops
- [ ] Efficient algorithms used
- [ ] Database queries optimized
- [ ] Caching implemented where appropriate

**Security**:
- [ ] Input validation present
- [ ] No SQL injection vulnerabilities
- [ ] XSS prevention measures
- [ ] Sensitive data protected

**Testing**:
- [ ] Tests cover new functionality
- [ ] Tests are meaningful
- [ ] Edge cases tested
- [ ] Coverage thresholds met

**Documentation**:
- [ ] Code is well-commented
- [ ] API documentation updated
- [ ] README updated if needed
- [ ] Changelog updated

### Review Response

```markdown
## Review Feedback Response

### Changes Made
- Addressed security concern by adding input validation
- Refactored database query for better performance
- Added missing test cases for edge conditions

### Questions/Clarifications
- Regarding the caching suggestion, should we use Redis or in-memory?
- The API endpoint naming follows current convention, should we update all endpoints?

### Not Changed (with reasoning)
- Kept the current algorithm as the suggested one doesn't handle edge case X
```

### Merge Requirements

1. **All checks must pass**:
   - CI/CD pipeline
   - Code quality checks
   - Test coverage
   - Security scan

2. **Review requirements**:
   - At least 2 approvals for major changes
   - 1 approval for minor changes
   - No unresolved conversations

3. **Documentation**:
   - Changelog updated
   - Breaking changes documented
   - Migration guide if needed

## Recognition

### Contributors Hall of Fame

We recognize our contributors in:
- README.md contributors section
- Monthly newsletter
- Annual contributor awards

### Contributor Levels

- **First-time Contributor**: First PR merged
- **Regular Contributor**: 5+ PRs merged
- **Core Contributor**: 20+ PRs merged
- **Maintainer**: Commit access granted

## Getting Help

### Resources

- **Documentation**: [docs.portfolio.com](https://docs.portfolio.com)
- **Discord**: [discord.gg/portfolio](https://discord.gg/portfolio)
- **Forum**: [forum.portfolio.com](https://forum.portfolio.com)
- **Stack Overflow**: Tag `portfolio-site`

### Contact

- **General Questions**: help@portfolio.com
- **Security Issues**: security@portfolio.com
- **Partnership**: partners@portfolio.com

## License

By contributing, you agree that your contributions will be licensed under the same license as the project (MIT License).

---

Thank you for contributing to make this project better! 🎉