// Test data fixtures and factories for comprehensive testing

const bcrypt = require('bcryptjs');

// User fixtures
const users = {
  admin: {
    email: 'admin@test.com',
    username: 'admin',
    password: 'Admin123!',
    firstName: 'Admin',
    lastName: 'User',
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    emailVerificationExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    twoFactorSecret: null,
    isTwoFactorEnabled: false,
    lastLoginAt: new Date(),
    loginAttempts: 0,
    lockUntil: null,
    preferences: JSON.stringify({
      theme: 'light',
      language: 'en',
      notifications: true
    })
  },
  
  editor: {
    email: 'editor@test.com',
    username: 'editor',
    password: 'Editor123!',
    firstName: 'Editor',
    lastName: 'User',
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    emailVerificationExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    twoFactorSecret: null,
    isTwoFactorEnabled: false,
    lastLoginAt: new Date(),
    loginAttempts: 0,
    lockUntil: null,
    preferences: JSON.stringify({
      theme: 'dark',
      language: 'en',
      notifications: true
    })
  },

  user: {
    email: 'user@test.com',
    username: 'user',
    password: 'User123!',
    firstName: 'Regular',
    lastName: 'User',
    isEmailVerified: true,
    isActive: true,
    emailVerificationToken: null,
    emailVerificationExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    twoFactorSecret: null,
    isTwoFactorEnabled: false,
    lastLoginAt: new Date(),
    loginAttempts: 0,
    lockUntil: null,
    preferences: JSON.stringify({
      theme: 'light',
      language: 'es',
      notifications: false
    })
  },

  unverified: {
    email: 'unverified@test.com',
    username: 'unverified',
    password: 'Unverified123!',
    firstName: 'Unverified',
    lastName: 'User',
    isEmailVerified: false,
    isActive: true,
    emailVerificationToken: 'verification-token-123',
    emailVerificationExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000),
    passwordResetToken: null,
    passwordResetExpiry: null,
    twoFactorSecret: null,
    isTwoFactorEnabled: false,
    lastLoginAt: null,
    loginAttempts: 0,
    lockUntil: null,
    preferences: JSON.stringify({})
  },

  locked: {
    email: 'locked@test.com',
    username: 'locked',
    password: 'Locked123!',
    firstName: 'Locked',
    lastName: 'User',
    isEmailVerified: true,
    isActive: false,
    emailVerificationToken: null,
    emailVerificationExpiry: null,
    passwordResetToken: null,
    passwordResetExpiry: null,
    twoFactorSecret: null,
    isTwoFactorEnabled: false,
    lastLoginAt: null,
    loginAttempts: 5,
    lockUntil: new Date(Date.now() + 30 * 60 * 1000),
    preferences: JSON.stringify({})
  }
};

// Skills fixtures
const skills = [
  {
    name: 'JavaScript',
    category: 'programming',
    level: 'expert',
    description: 'Modern JavaScript and ES6+',
    yearsOfExperience: 5,
    isHighlighted: true,
    sortOrder: 1
  },
  {
    name: 'React',
    category: 'framework',
    level: 'expert',
    description: 'React.js frontend development',
    yearsOfExperience: 4,
    isHighlighted: true,
    sortOrder: 2
  },
  {
    name: 'Node.js',
    category: 'backend',
    level: 'advanced',
    description: 'Server-side JavaScript development',
    yearsOfExperience: 3,
    isHighlighted: true,
    sortOrder: 3
  },
  {
    name: 'Python',
    category: 'programming',
    level: 'intermediate',
    description: 'Python programming and data analysis',
    yearsOfExperience: 2,
    isHighlighted: false,
    sortOrder: 4
  },
  {
    name: 'Docker',
    category: 'devops',
    level: 'intermediate',
    description: 'Containerization and deployment',
    yearsOfExperience: 2,
    isHighlighted: false,
    sortOrder: 5
  }
];

// Tags fixtures
const tags = [
  {
    name: 'web-development',
    displayName: 'Web Development',
    color: '#007bff',
    description: 'Web application development',
    isActive: true,
    usageCount: 10
  },
  {
    name: 'frontend',
    displayName: 'Frontend',
    color: '#28a745',
    description: 'Frontend development and UI',
    isActive: true,
    usageCount: 8
  },
  {
    name: 'backend',
    displayName: 'Backend',
    color: '#dc3545',
    description: 'Backend development and APIs',
    isActive: true,
    usageCount: 6
  },
  {
    name: 'mobile',
    displayName: 'Mobile',
    color: '#fd7e14',
    description: 'Mobile app development',
    isActive: true,
    usageCount: 3
  },
  {
    name: 'ai-ml',
    displayName: 'AI & Machine Learning',
    color: '#6f42c1',
    description: 'Artificial Intelligence and Machine Learning',
    isActive: true,
    usageCount: 5
  },
  {
    name: 'archived-tag',
    displayName: 'Archived Tag',
    color: '#6c757d',
    description: 'This tag is no longer active',
    isActive: false,
    usageCount: 0
  }
];

// Projects fixtures
const projects = [
  {
    title: 'E-commerce Platform',
    description: 'A full-stack e-commerce solution with React and Node.js',
    content: '# E-commerce Platform\\n\\nA comprehensive e-commerce solution built with modern web technologies.',
    slug: 'ecommerce-platform',
    status: 'published',
    featured: true,
    startDate: new Date('2023-01-01'),
    endDate: new Date('2023-06-30'),
    projectUrl: 'https://ecommerce.example.com',
    repositoryUrl: 'https://github.com/user/ecommerce',
    technologies: JSON.stringify(['React', 'Node.js', 'PostgreSQL', 'Redis']),
    images: JSON.stringify(['project1-1.jpg', 'project1-2.jpg']),
    sortOrder: 1,
    viewCount: 150,
    likeCount: 25,
    seoTitle: 'E-commerce Platform | Portfolio',
    seoDescription: 'Full-stack e-commerce solution built with React and Node.js',
    seoKeywords: 'e-commerce, react, nodejs, postgresql'
  },
  {
    title: 'Task Management App',
    description: 'A collaborative task management application',
    content: '# Task Management App\\n\\nA collaborative task management solution for teams.',
    slug: 'task-management-app',
    status: 'published',
    featured: false,
    startDate: new Date('2023-07-01'),
    endDate: new Date('2023-09-30'),
    projectUrl: 'https://taskapp.example.com',
    repositoryUrl: 'https://github.com/user/taskapp',
    technologies: JSON.stringify(['Vue.js', 'Express', 'MongoDB']),
    images: JSON.stringify(['project2-1.jpg']),
    sortOrder: 2,
    viewCount: 85,
    likeCount: 12,
    seoTitle: 'Task Management App | Portfolio',
    seoDescription: 'Collaborative task management application for teams',
    seoKeywords: 'task management, vue, mongodb, collaboration'
  },
  {
    title: 'Weather Dashboard',
    description: 'A weather dashboard with data visualization',
    content: '# Weather Dashboard\\n\\nWeather data visualization dashboard.',
    slug: 'weather-dashboard',
    status: 'draft',
    featured: false,
    startDate: new Date('2023-10-01'),
    endDate: null,
    projectUrl: null,
    repositoryUrl: 'https://github.com/user/weather-dashboard',
    technologies: JSON.stringify(['React', 'D3.js', 'Weather API']),
    images: JSON.stringify([]),
    sortOrder: 3,
    viewCount: 10,
    likeCount: 2,
    seoTitle: 'Weather Dashboard | Portfolio',
    seoDescription: 'Weather data visualization dashboard',
    seoKeywords: 'weather, dashboard, data visualization, react'
  },
  {
    title: 'Archived Project',
    description: 'An old project that is no longer maintained',
    content: '# Archived Project\\n\\nThis project is archived.',
    slug: 'archived-project',
    status: 'archived',
    featured: false,
    startDate: new Date('2022-01-01'),
    endDate: new Date('2022-03-31'),
    projectUrl: null,
    repositoryUrl: null,
    technologies: JSON.stringify(['jQuery', 'PHP']),
    images: JSON.stringify([]),
    sortOrder: 4,
    viewCount: 5,
    likeCount: 0,
    seoTitle: 'Archived Project | Portfolio',
    seoDescription: 'An archived project',
    seoKeywords: 'archived, legacy'
  }
];

// Experiences fixtures
const experiences = [
  {
    title: 'Senior Full Stack Developer',
    company: 'Tech Solutions Inc.',
    location: 'San Francisco, CA',
    startDate: new Date('2022-01-01'),
    endDate: null, // Current position
    description: 'Leading full-stack development projects using React and Node.js',
    responsibilities: JSON.stringify([
      'Lead development of web applications',
      'Mentor junior developers',
      'Architect scalable solutions',
      'Collaborate with product teams'
    ]),
    achievements: JSON.stringify([
      'Increased application performance by 40%',
      'Led team of 5 developers',
      'Implemented CI/CD pipeline'
    ]),
    technologies: JSON.stringify(['React', 'Node.js', 'AWS', 'Docker']),
    employmentType: 'full-time',
    isCurrentPosition: true,
    sortOrder: 1
  },
  {
    title: 'Full Stack Developer',
    company: 'Startup Ventures',
    location: 'Austin, TX',
    startDate: new Date('2020-06-01'),
    endDate: new Date('2021-12-31'),
    description: 'Developed and maintained multiple web applications',
    responsibilities: JSON.stringify([
      'Develop frontend and backend features',
      'Optimize database queries',
      'Write comprehensive tests',
      'Deploy applications'
    ]),
    achievements: JSON.stringify([
      'Built 3 major features from scratch',
      'Reduced loading times by 30%',
      'Implemented automated testing'
    ]),
    technologies: JSON.stringify(['Vue.js', 'Python', 'PostgreSQL', 'Redis']),
    employmentType: 'full-time',
    isCurrentPosition: false,
    sortOrder: 2
  },
  {
    title: 'Junior Developer',
    company: 'Web Agency Pro',
    location: 'Denver, CO',
    startDate: new Date('2019-01-01'),
    endDate: new Date('2020-05-31'),
    description: 'Entry-level position working on client websites',
    responsibilities: JSON.stringify([
      'Build responsive websites',
      'Fix bugs and issues',
      'Update content management systems',
      'Client communication'
    ]),
    achievements: JSON.stringify([
      'Completed 20+ client projects',
      'Learned modern development practices',
      'Received positive client feedback'
    ]),
    technologies: JSON.stringify(['HTML', 'CSS', 'JavaScript', 'WordPress']),
    employmentType: 'full-time',
    isCurrentPosition: false,
    sortOrder: 3
  }
];

// Education fixtures
const education = [
  {
    degree: 'Master of Science',
    field: 'Computer Science',
    institution: 'University of Technology',
    location: 'Boston, MA',
    startDate: new Date('2017-09-01'),
    endDate: new Date('2019-05-31'),
    gpa: '3.8',
    description: 'Specialized in software engineering and artificial intelligence',
    coursework: JSON.stringify([
      'Advanced Algorithms',
      'Machine Learning',
      'Software Architecture',
      'Database Systems',
      'Web Technologies'
    ]),
    achievements: JSON.stringify([
      'Magna Cum Laude',
      'Teaching Assistant for CS101',
      'Published research paper on ML algorithms'
    ]),
    thesis: 'Machine Learning Applications in Web Development',
    isHighlighted: true,
    sortOrder: 1
  },
  {
    degree: 'Bachelor of Science',
    field: 'Information Technology',
    institution: 'State University',
    location: 'Austin, TX',
    startDate: new Date('2013-09-01'),
    endDate: new Date('2017-05-31'),
    gpa: '3.6',
    description: 'Foundation in computer science and information systems',
    coursework: JSON.stringify([
      'Programming Fundamentals',
      'Data Structures',
      'Computer Networks',
      'Database Design',
      'Web Development'
    ]),
    achievements: JSON.stringify([
      'Dean\'s List (3 semesters)',
      'Computer Science Club President',
      'Hackathon Winner (2016)'
    ]),
    thesis: null,
    isHighlighted: true,
    sortOrder: 2
  },
  {
    degree: 'Certificate',
    field: 'Full Stack Web Development',
    institution: 'Code Bootcamp',
    location: 'Online',
    startDate: new Date('2018-06-01'),
    endDate: new Date('2018-12-31'),
    gpa: null,
    description: 'Intensive full-stack web development program',
    coursework: JSON.stringify([
      'HTML/CSS/JavaScript',
      'React.js',
      'Node.js/Express',
      'MongoDB',
      'Git/GitHub'
    ]),
    achievements: JSON.stringify([
      'Completed with distinction',
      'Built 5 major projects',
      'Job placement assistance'
    ]),
    thesis: null,
    isHighlighted: false,
    sortOrder: 3
  }
];

// Testimonials fixtures
const testimonials = [
  {
    clientName: 'Sarah Johnson',
    clientTitle: 'Product Manager',
    clientCompany: 'Tech Solutions Inc.',
    clientEmail: 'sarah.johnson@techsolutions.com',
    testimonialText: 'Working with this developer was an absolute pleasure. Their technical skills are outstanding, and they delivered our project ahead of schedule with exceptional quality.',
    rating: 5,
    projectTitle: 'E-commerce Platform',
    isPublished: true,
    isFeatured: true,
    dateReceived: new Date('2023-07-15'),
    clientImage: 'sarah-johnson.jpg',
    clientLinkedIn: 'https://linkedin.com/in/sarah-johnson',
    sortOrder: 1
  },
  {
    clientName: 'Michael Chen',
    clientTitle: 'CTO',
    clientCompany: 'Startup Ventures',
    clientEmail: 'michael.chen@startupventures.com',
    testimonialText: 'Excellent problem-solving skills and attention to detail. The code quality was top-notch and well-documented. Would definitely work with them again.',
    rating: 5,
    projectTitle: 'Task Management App',
    isPublished: true,
    isFeatured: true,
    dateReceived: new Date('2023-05-20'),
    clientImage: 'michael-chen.jpg',
    clientLinkedIn: 'https://linkedin.com/in/michael-chen',
    sortOrder: 2
  },
  {
    clientName: 'Emily Rodriguez',
    clientTitle: 'Marketing Director',
    clientCompany: 'Creative Agency',
    clientEmail: 'emily.rodriguez@creativeagency.com',
    testimonialText: 'Great communication throughout the project. They understood our requirements perfectly and delivered exactly what we needed.',
    rating: 4,
    projectTitle: 'Portfolio Website',
    isPublished: true,
    isFeatured: false,
    dateReceived: new Date('2023-03-10'),
    clientImage: null,
    clientLinkedIn: null,
    sortOrder: 3
  },
  {
    clientName: 'David Williams',
    clientTitle: 'Business Owner',
    clientCompany: 'Local Business',
    clientEmail: 'david@localbusiness.com',
    testimonialText: 'Still working on the project, but so far very impressed with the progress and professionalism.',
    rating: 4,
    projectTitle: 'Business Website',
    isPublished: false,
    isFeatured: false,
    dateReceived: new Date('2023-08-01'),
    clientImage: null,
    clientLinkedIn: null,
    sortOrder: 4
  }
];

// Media assets fixtures
const mediaAssets = [
  {
    filename: 'project1-hero.jpg',
    originalName: 'ecommerce-hero-image.jpg',
    mimetype: 'image/jpeg',
    size: 2048000,
    path: '/uploads/images/project1-hero.jpg',
    url: 'https://cdn.example.com/uploads/images/project1-hero.jpg',
    thumbnailUrl: 'https://cdn.example.com/uploads/thumbnails/project1-hero.jpg',
    altText: 'E-commerce platform hero image',
    caption: 'Main landing page of the e-commerce platform',
    category: 'project',
    tags: JSON.stringify(['ecommerce', 'hero', 'landing']),
    metadata: JSON.stringify({
      width: 1920,
      height: 1080,
      format: 'jpeg',
      colorSpace: 'srgb',
      hasAlpha: false
    }),
    isPublic: true,
    sortOrder: 1
  },
  {
    filename: 'profile-photo.jpg',
    originalName: 'my-profile-photo.jpg',
    mimetype: 'image/jpeg',
    size: 512000,
    path: '/uploads/images/profile-photo.jpg',
    url: 'https://cdn.example.com/uploads/images/profile-photo.jpg',
    thumbnailUrl: 'https://cdn.example.com/uploads/thumbnails/profile-photo.jpg',
    altText: 'Professional profile photo',
    caption: 'Professional headshot for portfolio',
    category: 'profile',
    tags: JSON.stringify(['profile', 'headshot', 'professional']),
    metadata: JSON.stringify({
      width: 800,
      height: 800,
      format: 'jpeg',
      colorSpace: 'srgb',
      hasAlpha: false
    }),
    isPublic: true,
    sortOrder: 2
  },
  {
    filename: 'task-app-demo.mp4',
    originalName: 'task-management-demo.mp4',
    mimetype: 'video/mp4',
    size: 10240000,
    path: '/uploads/videos/task-app-demo.mp4',
    url: 'https://cdn.example.com/uploads/videos/task-app-demo.mp4',
    thumbnailUrl: 'https://cdn.example.com/uploads/thumbnails/task-app-demo.jpg',
    altText: 'Task management app demo video',
    caption: 'Demonstration of key features',
    category: 'project',
    tags: JSON.stringify(['demo', 'video', 'task-management']),
    metadata: JSON.stringify({
      duration: 120,
      width: 1280,
      height: 720,
      format: 'mp4',
      codec: 'h264',
      bitrate: 2000
    }),
    isPublic: true,
    sortOrder: 3
  }
];

// Factory functions for creating test data
const factories = {
  async createUser(overrides = {}, role = 'user') {
    const hashedPassword = await bcrypt.hash(users[role].password, 10);
    return {
      ...users[role],
      password: hashedPassword,
      ...overrides
    };
  },

  createProject(userId, overrides = {}) {
    const project = projects[Math.floor(Math.random() * projects.length)];
    return {
      ...project,
      userId,
      ...overrides
    };
  },

  createSkill(overrides = {}) {
    const skill = skills[Math.floor(Math.random() * skills.length)];
    return {
      ...skill,
      ...overrides
    };
  },

  createTag(overrides = {}) {
    const tag = tags[Math.floor(Math.random() * tags.length)];
    return {
      ...tag,
      ...overrides
    };
  },

  createExperience(userId, overrides = {}) {
    const experience = experiences[Math.floor(Math.random() * experiences.length)];
    return {
      ...experience,
      userId,
      ...overrides
    };
  },

  createEducation(userId, overrides = {}) {
    const edu = education[Math.floor(Math.random() * education.length)];
    return {
      ...edu,
      userId,
      ...overrides
    };
  },

  createTestimonial(userId, overrides = {}) {
    const testimonial = testimonials[Math.floor(Math.random() * testimonials.length)];
    return {
      ...testimonial,
      userId,
      ...overrides
    };
  },

  createMediaAsset(userId, overrides = {}) {
    const asset = mediaAssets[Math.floor(Math.random() * mediaAssets.length)];
    return {
      ...asset,
      userId,
      ...overrides
    };
  },

  // Bulk data creation
  createMultipleUsers(count = 5, role = 'user') {
    return Promise.all(
      Array.from({ length: count }, (_, i) => 
        this.createUser({ email: `user${i}@test.com`, username: `user${i}` }, role)
      )
    );
  },

  createMultipleProjects(userId, count = 3) {
    return Array.from({ length: count }, (_, i) => 
      this.createProject(userId, { 
        title: `Test Project ${i + 1}`,
        slug: `test-project-${i + 1}`
      })
    );
  }
};

// Validation test data (invalid data for testing validation)
const invalidData = {
  users: {
    noEmail: { username: 'test', password: 'Password123!' },
    invalidEmail: { email: 'invalid-email', username: 'test', password: 'Password123!' },
    shortPassword: { email: 'test@example.com', username: 'test', password: '123' },
    noPassword: { email: 'test@example.com', username: 'test' },
    duplicateEmail: { email: 'admin@test.com', username: 'duplicate', password: 'Password123!' }
  },
  projects: {
    noTitle: { description: 'Test description', userId: 1 },
    noUserId: { title: 'Test Project', description: 'Test description' },
    invalidStatus: { title: 'Test', description: 'Test', status: 'invalid', userId: 1 }
  }
};

module.exports = {
  users,
  skills,
  tags,
  projects,
  experiences,
  education,
  testimonials,
  mediaAssets,
  factories,
  invalidData
};