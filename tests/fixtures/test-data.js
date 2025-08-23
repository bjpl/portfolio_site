/**
 * Test Data Fixtures and Factory Functions
 * Provides consistent test data across all test suites
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');

/**
 * User fixtures
 */
const UserFixtures = {
  // Standard user data
  validUser: {
    email: 'user@example.com',
    username: 'testuser',
    password: 'TestPass123!',
    firstName: 'Test',
    lastName: 'User',
    role: 'user',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },

  // Admin user data
  adminUser: {
    email: 'admin@example.com',
    username: 'admin',
    password: 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'User',
    role: 'admin',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },

  // Editor user data
  editorUser: {
    email: 'editor@example.com',
    username: 'editor',
    password: 'EditorPass123!',
    firstName: 'Editor',
    lastName: 'User',
    role: 'editor',
    isActive: true,
    isEmailVerified: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },

  // Inactive user
  inactiveUser: {
    email: 'inactive@example.com',
    username: 'inactiveuser',
    password: 'TestPass123!',
    firstName: 'Inactive',
    lastName: 'User',
    role: 'user',
    isActive: false,
    isEmailVerified: true,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },

  // Unverified user
  unverifiedUser: {
    email: 'unverified@example.com',
    username: 'unverifieduser',
    password: 'TestPass123!',
    firstName: 'Unverified',
    lastName: 'User',
    role: 'user',
    isActive: true,
    isEmailVerified: false,
    emailVerificationToken: 'verification-token-123',
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  }
};

/**
 * Content fixtures
 */
const ContentFixtures = {
  // Published blog post
  publishedBlogPost: {
    title: 'Test Blog Post',
    slug: 'test-blog-post',
    section: 'blog',
    subsection: 'tutorials',
    content: '# Test Blog Post\n\nThis is a test blog post content with **bold** and *italic* text.\n\n## Subheading\n\nMore content here.',
    frontmatter: {
      title: 'Test Blog Post',
      date: new Date('2023-06-01'),
      draft: false,
      description: 'This is a test blog post for testing purposes',
      tags: ['test', 'tutorial', 'example'],
      categories: ['education'],
      author: 'Test Author',
      featured: false
    },
    excerpt: 'This is a test blog post content with bold and italic text.',
    readTime: 2,
    viewCount: 150,
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01')
  },

  // Draft post
  draftPost: {
    title: 'Draft Post',
    slug: 'draft-post',
    section: 'blog',
    subsection: 'drafts',
    content: '# Draft Post\n\nThis is a draft post that should not be visible to public.',
    frontmatter: {
      title: 'Draft Post',
      date: new Date('2023-06-15'),
      draft: true,
      description: 'This is a draft post',
      tags: ['draft'],
      categories: ['test'],
      author: 'Test Author'
    },
    excerpt: 'This is a draft post that should not be visible to public.',
    readTime: 1,
    viewCount: 0,
    createdAt: new Date('2023-06-15'),
    updatedAt: new Date('2023-06-15')
  },

  // Portfolio project
  portfolioProject: {
    title: 'Sample Portfolio Project',
    slug: 'sample-portfolio-project',
    section: 'portfolio',
    subsection: 'projects',
    content: '# Sample Portfolio Project\n\nA detailed description of this portfolio project.\n\n## Technologies Used\n\n- React\n- Node.js\n- MongoDB',
    frontmatter: {
      title: 'Sample Portfolio Project',
      date: new Date('2023-05-01'),
      draft: false,
      description: 'A sample portfolio project showcasing web development skills',
      tags: ['react', 'nodejs', 'mongodb'],
      categories: ['web-development'],
      technologies: ['React', 'Node.js', 'MongoDB'],
      projectUrl: 'https://example.com/project',
      githubUrl: 'https://github.com/user/project',
      featured: true
    },
    excerpt: 'A detailed description of this portfolio project.',
    readTime: 3,
    viewCount: 200,
    createdAt: new Date('2023-05-01'),
    updatedAt: new Date('2023-05-01')
  }
};

/**
 * Portfolio data fixtures
 */
const PortfolioFixtures = {
  // Sample project
  project: {
    title: 'E-commerce Platform',
    slug: 'ecommerce-platform',
    description: 'A full-stack e-commerce platform built with modern technologies',
    longDescription: 'This is a comprehensive e-commerce platform featuring user authentication, product catalog, shopping cart, payment integration, and admin dashboard.',
    technologies: ['React', 'Node.js', 'Express', 'MongoDB', 'Stripe'],
    category: 'web-development',
    featured: true,
    published: true,
    projectUrl: 'https://ecommerce-demo.example.com',
    githubUrl: 'https://github.com/user/ecommerce-platform',
    imageUrl: '/images/projects/ecommerce-platform.jpg',
    screenshots: [
      '/images/projects/ecommerce-platform-1.jpg',
      '/images/projects/ecommerce-platform-2.jpg'
    ],
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-03-31'),
    status: 'completed',
    order: 1,
    viewCount: 350,
    createdAt: new Date('2023-04-01'),
    updatedAt: new Date('2023-04-01')
  },

  // Sample skill
  skill: {
    name: 'JavaScript',
    category: 'programming-languages',
    level: 90,
    yearsOfExperience: 5,
    description: 'Advanced JavaScript including ES6+, async/await, and modern frameworks',
    endorsed: true,
    featured: true,
    relatedSkills: ['React', 'Node.js', 'TypeScript'],
    projects: ['ecommerce-platform', 'portfolio-website'],
    certifications: ['JavaScript Advanced Certification'],
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-01')
  },

  // Sample experience
  experience: {
    company: 'Tech Company Inc.',
    position: 'Senior Full Stack Developer',
    description: 'Led development of web applications using React and Node.js. Mentored junior developers and implemented best practices.',
    startDate: new Date('2021-06-01'),
    endDate: new Date('2023-05-31'),
    current: false,
    location: 'San Francisco, CA',
    type: 'full-time',
    technologies: ['React', 'Node.js', 'AWS', 'PostgreSQL'],
    achievements: [
      'Increased application performance by 40%',
      'Led team of 4 developers',
      'Implemented CI/CD pipeline'
    ],
    companyUrl: 'https://techcompany.com',
    featured: true,
    createdAt: new Date('2023-06-01'),
    updatedAt: new Date('2023-06-01')
  },

  // Sample education
  education: {
    institution: 'University of Technology',
    degree: 'Bachelor of Science',
    field: 'Computer Science',
    description: 'Focused on software engineering, algorithms, and data structures',
    startDate: new Date('2018-09-01'),
    endDate: new Date('2022-05-31'),
    gpa: 3.8,
    honors: ['Magna Cum Laude', 'Dean\'s List'],
    relevantCourses: [
      'Data Structures and Algorithms',
      'Software Engineering',
      'Database Systems',
      'Web Development'
    ],
    projects: [
      'Senior Capstone Project',
      'Mobile App Development'
    ],
    location: 'Boston, MA',
    featured: true,
    createdAt: new Date('2022-06-01'),
    updatedAt: new Date('2022-06-01')
  },

  // Sample testimonial
  testimonial: {
    name: 'John Smith',
    position: 'CTO at StartupCorp',
    company: 'StartupCorp',
    content: 'An exceptional developer with strong technical skills and excellent communication. Delivered high-quality work consistently.',
    rating: 5,
    avatar: '/images/testimonials/john-smith.jpg',
    linkedinUrl: 'https://linkedin.com/in/johnsmith',
    projectRelated: 'ecommerce-platform',
    featured: true,
    approved: true,
    createdAt: new Date('2023-04-15'),
    updatedAt: new Date('2023-04-15')
  }
};

/**
 * Contact form fixtures
 */
const ContactFixtures = {
  validContact: {
    name: 'Jane Doe',
    email: 'jane@example.com',
    subject: 'Project Inquiry',
    message: 'I am interested in discussing a potential project collaboration. Please let me know your availability.',
    phone: '+1-555-0123',
    company: 'Example Corp',
    projectType: 'web-development',
    budget: '10000-25000',
    timeline: '3-6 months',
    source: 'google',
    newsletter: true,
    privacy: true,
    ip: '192.168.1.100',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    status: 'new',
    priority: 'medium',
    createdAt: new Date('2023-06-20'),
    updatedAt: new Date('2023-06-20')
  },

  spamContact: {
    name: 'Spam User',
    email: 'spam@spammer.com',
    subject: 'Buy our product!!!',
    message: 'Amazing deal! Click here now! http://suspicious-link.com',
    ip: '10.0.0.1',
    userAgent: 'Bot/1.0',
    status: 'spam',
    priority: 'low',
    createdAt: new Date('2023-06-21'),
    updatedAt: new Date('2023-06-21')
  }
};

/**
 * Factory functions for creating test data
 */
class TestDataFactory {
  /**
   * Create user with optional overrides
   */
  static async createUser(overrides = {}) {
    const userData = {
      ...UserFixtures.validUser,
      ...overrides,
      id: overrides.id || Math.floor(Math.random() * 1000000),
      email: overrides.email || `user${Date.now()}@example.com`,
      username: overrides.username || `user${Date.now()}`
    };

    // Hash password if provided
    if (userData.password && !userData.password.startsWith('$2a$')) {
      userData.password = await bcrypt.hash(userData.password, 10);
    }

    return userData;
  }

  /**
   * Create multiple users
   */
  static async createUsers(count = 5, overrides = {}) {
    const users = [];
    for (let i = 0; i < count; i++) {
      const user = await this.createUser({
        ...overrides,
        email: `user${Date.now()}-${i}@example.com`,
        username: `user${Date.now()}-${i}`
      });
      users.push(user);
    }
    return users;
  }

  /**
   * Create content with optional overrides
   */
  static createContent(overrides = {}) {
    return {
      ...ContentFixtures.publishedBlogPost,
      ...overrides,
      id: overrides.id || Math.floor(Math.random() * 1000000),
      slug: overrides.slug || `content-${Date.now()}`,
      title: overrides.title || `Test Content ${Date.now()}`
    };
  }

  /**
   * Create multiple content items
   */
  static createContentList(count = 10, overrides = {}) {
    const contents = [];
    for (let i = 0; i < count; i++) {
      const content = this.createContent({
        ...overrides,
        slug: `content-${Date.now()}-${i}`,
        title: `Test Content ${Date.now()} - ${i}`,
        frontmatter: {
          ...ContentFixtures.publishedBlogPost.frontmatter,
          title: `Test Content ${Date.now()} - ${i}`,
          date: new Date(Date.now() - (i * 24 * 60 * 60 * 1000)) // Stagger dates
        }
      });
      contents.push(content);
    }
    return contents;
  }

  /**
   * Create project with optional overrides
   */
  static createProject(overrides = {}) {
    return {
      ...PortfolioFixtures.project,
      ...overrides,
      id: overrides.id || Math.floor(Math.random() * 1000000),
      slug: overrides.slug || `project-${Date.now()}`,
      title: overrides.title || `Test Project ${Date.now()}`
    };
  }

  /**
   * Create contact form submission
   */
  static createContact(overrides = {}) {
    return {
      ...ContactFixtures.validContact,
      ...overrides,
      id: overrides.id || Math.floor(Math.random() * 1000000),
      email: overrides.email || `contact${Date.now()}@example.com`
    };
  }

  /**
   * Create session data
   */
  static createSession(userId, overrides = {}) {
    return {
      id: Math.floor(Math.random() * 1000000),
      userId,
      token: overrides.token || this.generateJWT(),
      refreshToken: overrides.refreshToken || this.generateRefreshToken(),
      userAgent: overrides.userAgent || 'Mozilla/5.0 Test Browser',
      ipAddress: overrides.ipAddress || '127.0.0.1',
      expiresAt: overrides.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000),
      lastActivity: overrides.lastActivity || new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides
    };
  }

  /**
   * Generate fake JWT token for testing
   */
  static generateJWT(payload = {}) {
    const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
    const body = Buffer.from(JSON.stringify({
      id: payload.id || 123,
      email: payload.email || 'test@example.com',
      role: payload.role || 'user',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...payload
    })).toString('base64url');
    const signature = crypto.randomBytes(32).toString('base64url');
    
    return `${header}.${body}.${signature}`;
  }

  /**
   * Generate fake refresh token
   */
  static generateRefreshToken() {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Create API response data
   */
  static createAPIResponse(data, meta = {}) {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        ...meta
      }
    };
  }

  /**
   * Create paginated response
   */
  static createPaginatedResponse(items, page = 1, limit = 10, total = null) {
    const totalItems = total || items.length;
    const totalPages = Math.ceil(totalItems / limit);
    
    return this.createAPIResponse(
      {
        items: items.slice((page - 1) * limit, page * limit),
        pagination: {
          page,
          limit,
          total: totalItems,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      }
    );
  }

  /**
   * Create error response
   */
  static createErrorResponse(message, code = 400, details = {}) {
    return {
      success: false,
      error: {
        message,
        code,
        timestamp: new Date().toISOString(),
        ...details
      }
    };
  }
}

/**
 * Mock data generators for different scenarios
 */
class MockDataGenerators {
  /**
   * Generate realistic content for testing search
   */
  static generateSearchContent() {
    const topics = ['JavaScript', 'React', 'Node.js', 'Python', 'Testing', 'DevOps'];
    const types = ['tutorial', 'guide', 'tips', 'best practices'];
    
    return topics.flatMap(topic => 
      types.map(type => TestDataFactory.createContent({
        title: `${topic} ${type}`,
        frontmatter: {
          ...ContentFixtures.publishedBlogPost.frontmatter,
          title: `${topic} ${type}`,
          tags: [topic.toLowerCase(), type.replace(' ', '-')],
          description: `Learn about ${topic} ${type} in this comprehensive guide`
        },
        content: `# ${topic} ${type}\n\nThis is a comprehensive guide about ${topic} covering all the essential ${type} you need to know.`
      }))
    );
  }

  /**
   * Generate performance test data
   */
  static generateLargeDataset(count = 1000) {
    return Array.from({ length: count }, (_, i) => 
      TestDataFactory.createContent({
        title: `Performance Test Content ${i + 1}`,
        slug: `performance-test-${i + 1}`,
        content: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. '.repeat(50)
      })
    );
  }

  /**
   * Generate security test payloads
   */
  static generateSecurityPayloads() {
    return {
      xss: [
        '<script>alert("XSS")</script>',
        '<img src="x" onerror="alert(1)">',
        '<svg onload="alert(1)">',
        'javascript:alert("XSS")'
      ],
      sqlInjection: [
        "'; DROP TABLE users; --",
        "' OR '1'='1",
        "' UNION SELECT * FROM users --",
        "admin'/*"
      ],
      pathTraversal: [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32\\config\\sam',
        '....//....//....//etc/passwd'
      ],
      commandInjection: [
        '; cat /etc/passwd;',
        '| whoami',
        '& dir',
        '`id`'
      ]
    };
  }
}

module.exports = {
  UserFixtures,
  ContentFixtures,
  PortfolioFixtures,
  ContactFixtures,
  TestDataFactory,
  MockDataGenerators
};