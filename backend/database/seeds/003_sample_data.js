/**
 * Seed: Sample Data
 * Creates sample users, projects, blog posts, and related content for development/testing
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const slugify = require('slugify');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

// Sample data configuration
const SAMPLE_CONFIG = {
  createUsers: true,
  createProjects: true,
  createBlogPosts: true,
  createComments: true,
  createSkills: true,
  createTags: true,
  createCategories: true,
  userCount: 5,
  projectCount: 12,
  blogPostCount: 15,
  commentCount: 25
};

// Sample users
const sampleUsers = [
  {
    email: 'admin@portfoliosite.com',
    username: 'admin',
    firstName: 'Site',
    lastName: 'Administrator',
    displayName: 'Admin',
    bio: 'Portfolio site administrator',
    isActive: true,
    emailVerified: true,
    roles: ['super_admin']
  },
  {
    email: 'editor@portfoliosite.com',
    username: 'editor',
    firstName: 'Content',
    lastName: 'Editor',
    displayName: 'Editor',
    bio: 'Content editor and curator',
    isActive: true,
    emailVerified: true,
    roles: ['editor']
  },
  {
    email: 'author@portfoliosite.com',
    username: 'author',
    firstName: 'John',
    lastName: 'Author',
    displayName: 'John Author',
    bio: 'Full-stack developer and technical writer',
    isActive: true,
    emailVerified: true,
    roles: ['author']
  },
  {
    email: 'demo@portfoliosite.com',
    username: 'demo',
    firstName: 'Demo',
    lastName: 'User',
    displayName: 'Demo User',
    bio: 'Demo user account for testing',
    isActive: true,
    emailVerified: true,
    roles: ['viewer']
  }
];

// Sample skills
const sampleSkills = [
  { name: 'JavaScript', category: 'LANGUAGES', level: 'EXPERT', color: '#F7DF1E' },
  { name: 'TypeScript', category: 'LANGUAGES', level: 'ADVANCED', color: '#3178C6' },
  { name: 'Python', category: 'LANGUAGES', level: 'ADVANCED', color: '#3776AB' },
  { name: 'React', category: 'FRAMEWORKS', level: 'EXPERT', color: '#61DAFB' },
  { name: 'Next.js', category: 'FRAMEWORKS', level: 'ADVANCED', color: '#000000' },
  { name: 'Node.js', category: 'BACKEND', level: 'EXPERT', color: '#339933' },
  { name: 'Express.js', category: 'FRAMEWORKS', level: 'ADVANCED', color: '#000000' },
  { name: 'PostgreSQL', category: 'DATABASE', level: 'ADVANCED', color: '#336791' },
  { name: 'MongoDB', category: 'DATABASE', level: 'INTERMEDIATE', color: '#47A248' },
  { name: 'Docker', category: 'DEVOPS', level: 'INTERMEDIATE', color: '#2496ED' },
  { name: 'AWS', category: 'DEVOPS', level: 'INTERMEDIATE', color: '#FF9900' },
  { name: 'Git', category: 'TOOLS', level: 'EXPERT', color: '#F05032' },
  { name: 'Figma', category: 'DESIGN', level: 'INTERMEDIATE', color: '#F24E1E' }
];

// Sample tags
const sampleTags = [
  { name: 'Web Development', color: '#3B82F6' },
  { name: 'Full Stack', color: '#10B981' },
  { name: 'Frontend', color: '#F59E0B' },
  { name: 'Backend', color: '#8B5CF6' },
  { name: 'API', color: '#EF4444' },
  { name: 'Database', color: '#6366F1' },
  { name: 'DevOps', color: '#84CC16' },
  { name: 'Mobile', color: '#F97316' },
  { name: 'Tutorial', color: '#06B6D4' },
  { name: 'Case Study', color: '#EC4899' }
];

// Sample categories
const sampleCategories = [
  { name: 'Web Development', color: '#3B82F6' },
  { name: 'Mobile Development', color: '#10B981' },
  { name: 'DevOps & Deployment', color: '#F59E0B' },
  { name: 'Database & Backend', color: '#8B5CF6' },
  { name: 'UI/UX Design', color: '#EF4444' },
  { name: 'Tutorials', color: '#06B6D4' },
  { name: 'Career & Growth', color: '#84CC16' },
  { name: 'Tools & Tips', color: '#F97316' }
];

// Sample projects
const sampleProjects = [
  {
    title: 'E-commerce Platform',
    subtitle: 'Full-stack online store with payment integration',
    description: 'A comprehensive e-commerce platform built with React and Node.js, featuring user authentication, product catalog, shopping cart, and Stripe payment integration.',
    content: '# E-commerce Platform\n\nThis project showcases a complete e-commerce solution...',
    type: 'WEB',
    status: 'PUBLISHED',
    featured: true,
    skills: ['JavaScript', 'React', 'Node.js', 'PostgreSQL'],
    tags: ['Web Development', 'Full Stack', 'Frontend', 'Backend'],
    demoUrl: 'https://demo-ecommerce.example.com',
    githubUrl: 'https://github.com/example/ecommerce-platform'
  },
  {
    title: 'Task Management Dashboard',
    subtitle: 'Real-time collaborative task management',
    description: 'A modern task management application with real-time collaboration, drag-and-drop interface, and team management features.',
    content: '# Task Management Dashboard\n\nBuilt with modern technologies...',
    type: 'WEB',
    status: 'PUBLISHED',
    featured: true,
    skills: ['TypeScript', 'React', 'Node.js', 'MongoDB'],
    tags: ['Web Development', 'Full Stack', 'Frontend'],
    demoUrl: 'https://tasks.example.com',
    githubUrl: 'https://github.com/example/task-manager'
  },
  {
    title: 'Mobile Weather App',
    subtitle: 'Cross-platform weather application',
    description: 'A beautiful weather app built with React Native, featuring location-based forecasts, weather alerts, and offline functionality.',
    content: '# Mobile Weather App\n\nCross-platform mobile application...',
    type: 'MOBILE',
    status: 'PUBLISHED',
    featured: true,
    skills: ['JavaScript', 'React', 'Node.js'],
    tags: ['Mobile', 'API'],
    demoUrl: 'https://weather-app.example.com'
  },
  {
    title: 'Blog API Backend',
    subtitle: 'RESTful API for content management',
    description: 'A robust REST API built with Express.js and PostgreSQL for managing blog content, user authentication, and admin functionality.',
    content: '# Blog API Backend\n\nComprehensive backend solution...',
    type: 'API',
    status: 'PUBLISHED',
    featured: false,
    skills: ['Node.js', 'Express.js', 'PostgreSQL'],
    tags: ['Backend', 'API', 'Database'],
    githubUrl: 'https://github.com/example/blog-api'
  },
  {
    title: 'Portfolio Website',
    subtitle: 'Personal portfolio and blog',
    description: 'A modern portfolio website built with Next.js, featuring a CMS integration, blog functionality, and optimized performance.',
    content: '# Portfolio Website\n\nModern portfolio solution...',
    type: 'WEB',
    status: 'PUBLISHED',
    featured: false,
    skills: ['TypeScript', 'Next.js', 'PostgreSQL'],
    tags: ['Web Development', 'Frontend'],
    demoUrl: 'https://portfolio.example.com',
    githubUrl: 'https://github.com/example/portfolio'
  }
];

// Sample blog posts
const sampleBlogPosts = [
  {
    title: 'Getting Started with React Hooks',
    subtitle: 'A comprehensive guide to modern React development',
    content: '# Getting Started with React Hooks\n\nReact Hooks revolutionized how we write React components...',
    excerpt: 'Learn how to use React Hooks to simplify your components and manage state more effectively.',
    type: 'TUTORIAL',
    status: 'PUBLISHED',
    featured: true,
    tags: ['Tutorial', 'Frontend'],
    categories: ['Web Development', 'Tutorials'],
    readingTime: 8,
    wordCount: 1200
  },
  {
    title: 'Building Scalable APIs with Node.js',
    subtitle: 'Best practices for backend development',
    content: '# Building Scalable APIs with Node.js\n\nWhen building APIs that need to handle thousands of requests...',
    excerpt: 'Discover best practices for building scalable and maintainable APIs using Node.js and Express.',
    type: 'TUTORIAL',
    status: 'PUBLISHED',
    featured: true,
    tags: ['Tutorial', 'Backend', 'API'],
    categories: ['Database & Backend', 'Tutorials'],
    readingTime: 12,
    wordCount: 1800
  },
  {
    title: 'Database Design Patterns',
    subtitle: 'Common patterns for data modeling',
    content: '# Database Design Patterns\n\nEffective database design is crucial for application performance...',
    excerpt: 'Explore common database design patterns and when to use them in your applications.',
    type: 'TECHNICAL',
    status: 'PUBLISHED',
    featured: false,
    tags: ['Database', 'Backend'],
    categories: ['Database & Backend'],
    readingTime: 10,
    wordCount: 1500
  },
  {
    title: 'My Journey as a Developer',
    subtitle: 'Reflections on career growth',
    content: '# My Journey as a Developer\n\nLooking back at my development journey...',
    excerpt: 'Personal reflections on career growth, challenges faced, and lessons learned as a software developer.',
    type: 'PERSONAL',
    status: 'PUBLISHED',
    featured: false,
    tags: ['Case Study'],
    categories: ['Career & Growth'],
    readingTime: 6,
    wordCount: 900
  }
];

async function seedSampleData() {
  try {
    logger.info('Starting sample data seeding...');
    const results = {};

    // Create skills first
    if (SAMPLE_CONFIG.createSkills) {
      results.skills = await seedSkills();
    }

    // Create tags and categories
    if (SAMPLE_CONFIG.createTags) {
      results.tags = await seedTags();
    }

    if (SAMPLE_CONFIG.createCategories) {
      results.categories = await seedCategories();
    }

    // Create users
    if (SAMPLE_CONFIG.createUsers) {
      results.users = await seedUsers();
    }

    // Create projects
    if (SAMPLE_CONFIG.createProjects) {
      results.projects = await seedProjects();
    }

    // Create blog posts
    if (SAMPLE_CONFIG.createBlogPosts) {
      results.blogPosts = await seedBlogPosts();
    }

    // Create comments
    if (SAMPLE_CONFIG.createComments) {
      results.comments = await seedComments();
    }

    logger.info('Sample data seeding completed successfully', results);
    return results;

  } catch (error) {
    logger.error('Error seeding sample data:', error);
    throw error;
  }
}

async function seedSkills() {
  logger.info('Seeding skills...');
  let createdCount = 0;

  for (const skillData of sampleSkills) {
    const existing = await prisma.skill.findUnique({
      where: { name: skillData.name }
    });

    if (!existing) {
      await prisma.skill.create({ data: skillData });
      createdCount++;
    }
  }

  logger.info(`Created ${createdCount} skills`);
  return { created: createdCount };
}

async function seedTags() {
  logger.info('Seeding tags...');
  let createdCount = 0;

  for (const tagData of sampleTags) {
    const slug = slugify(tagData.name, { lower: true });
    const existing = await prisma.tag.findUnique({
      where: { slug }
    });

    if (!existing) {
      await prisma.tag.create({
        data: { ...tagData, slug }
      });
      createdCount++;
    }
  }

  logger.info(`Created ${createdCount} tags`);
  return { created: createdCount };
}

async function seedCategories() {
  logger.info('Seeding categories...');
  let createdCount = 0;

  for (const categoryData of sampleCategories) {
    const slug = slugify(categoryData.name, { lower: true });
    const existing = await prisma.category.findUnique({
      where: { slug }
    });

    if (!existing) {
      await prisma.category.create({
        data: { ...categoryData, slug }
      });
      createdCount++;
    }
  }

  logger.info(`Created ${createdCount} categories`);
  return { created: createdCount };
}

async function seedUsers() {
  logger.info('Seeding users...');
  let createdCount = 0;

  for (const userData of sampleUsers) {
    const existing = await prisma.user.findUnique({
      where: { email: userData.email }
    });

    if (!existing) {
      const passwordHash = await bcrypt.hash('password123', 12);
      const roles = userData.roles || [];
      delete userData.roles;

      const user = await prisma.user.create({
        data: {
          ...userData,
          passwordHash,
          emailVerifiedAt: new Date()
        }
      });

      // Assign roles
      for (const roleName of roles) {
        const role = await prisma.role.findUnique({
          where: { name: roleName }
        });

        if (role) {
          await prisma.userRole.create({
            data: {
              userId: user.id,
              roleId: role.id
            }
          });
        }
      }

      createdCount++;
    }
  }

  logger.info(`Created ${createdCount} users`);
  return { created: createdCount };
}

async function seedProjects() {
  logger.info('Seeding projects...');
  let createdCount = 0;

  // Get the first user as author
  const author = await prisma.user.findFirst();
  if (!author) {
    logger.warn('No users found, skipping project seeding');
    return { created: 0 };
  }

  for (const projectData of sampleProjects) {
    const slug = slugify(projectData.title, { lower: true });
    const existing = await prisma.project.findUnique({
      where: { slug }
    });

    if (!existing) {
      const { skills: skillNames, tags: tagNames, ...projectInfo } = projectData;

      const project = await prisma.project.create({
        data: {
          ...projectInfo,
          slug,
          excerpt: projectData.description.substring(0, 200) + '...',
          publishedAt: new Date(),
          createdBy: author.id
        }
      });

      // Connect skills
      if (skillNames) {
        for (const skillName of skillNames) {
          const skill = await prisma.skill.findUnique({
            where: { name: skillName }
          });

          if (skill) {
            await prisma.projectSkill.create({
              data: {
                projectId: project.id,
                skillId: skill.id
              }
            });
          }
        }
      }

      // Connect tags
      if (tagNames) {
        for (const tagName of tagNames) {
          const tag = await prisma.tag.findUnique({
            where: { slug: slugify(tagName, { lower: true }) }
          });

          if (tag) {
            await prisma.projectTag.create({
              data: {
                projectId: project.id,
                tagId: tag.id
              }
            });
          }
        }
      }

      createdCount++;
    }
  }

  logger.info(`Created ${createdCount} projects`);
  return { created: createdCount };
}

async function seedBlogPosts() {
  logger.info('Seeding blog posts...');
  let createdCount = 0;

  // Get the first user as author
  const author = await prisma.user.findFirst();
  if (!author) {
    logger.warn('No users found, skipping blog post seeding');
    return { created: 0 };
  }

  for (const postData of sampleBlogPosts) {
    const slug = slugify(postData.title, { lower: true });
    const existing = await prisma.blogPost.findUnique({
      where: { slug }
    });

    if (!existing) {
      const { tags: tagNames, categories: categoryNames, ...postInfo } = postData;

      const post = await prisma.blogPost.create({
        data: {
          ...postInfo,
          slug,
          publishedAt: new Date(),
          createdBy: author.id
        }
      });

      // Connect tags
      if (tagNames) {
        for (const tagName of tagNames) {
          const tag = await prisma.tag.findUnique({
            where: { slug: slugify(tagName, { lower: true }) }
          });

          if (tag) {
            await prisma.blogTag.create({
              data: {
                postId: post.id,
                tagId: tag.id
              }
            });
          }
        }
      }

      // Connect categories
      if (categoryNames) {
        for (const categoryName of categoryNames) {
          const category = await prisma.category.findUnique({
            where: { slug: slugify(categoryName, { lower: true }) }
          });

          if (category) {
            await prisma.blogCategory.create({
              data: {
                postId: post.id,
                categoryId: category.id
              }
            });
          }
        }
      }

      createdCount++;
    }
  }

  logger.info(`Created ${createdCount} blog posts`);
  return { created: createdCount };
}

async function seedComments() {
  logger.info('Seeding comments...');
  let createdCount = 0;

  const posts = await prisma.blogPost.findMany({ take: 3 });
  const users = await prisma.user.findMany({ take: 3 });

  if (posts.length === 0 || users.length === 0) {
    logger.warn('No posts or users found, skipping comment seeding');
    return { created: 0 };
  }

  const sampleComments = [
    'Great article! Very informative and well-written.',
    'Thanks for sharing this. It helped me understand the concept better.',
    'I have a question about the implementation. Could you elaborate on that part?',
    'This is exactly what I was looking for. Thank you!',
    'Interesting perspective. I have a different approach that might also work.',
    'Clear and concise explanation. Looking forward to more content like this.',
    'I tried implementing this and it works perfectly. Thanks!',
    'Could you provide more examples for the edge cases?'
  ];

  for (let i = 0; i < Math.min(SAMPLE_CONFIG.commentCount, sampleComments.length); i++) {
    const post = posts[i % posts.length];
    const user = users[i % users.length];

    await prisma.comment.create({
      data: {
        content: sampleComments[i],
        postId: post.id,
        authorId: user.id,
        status: 'APPROVED'
      }
    });

    createdCount++;
  }

  logger.info(`Created ${createdCount} comments`);
  return { created: createdCount };
}

async function rollbackSampleData() {
  try {
    logger.info('Rolling back sample data...');

    // Delete in reverse order of creation
    await prisma.comment.deleteMany();
    await prisma.blogCategory.deleteMany();
    await prisma.blogTag.deleteMany();
    await prisma.projectSkill.deleteMany();
    await prisma.projectTag.deleteMany();
    await prisma.blogPost.deleteMany();
    await prisma.project.deleteMany();
    await prisma.userRole.deleteMany();
    await prisma.user.deleteMany({ where: { email: { endsWith: '@portfoliosite.com' } } });
    await prisma.category.deleteMany();
    await prisma.tag.deleteMany();
    await prisma.skill.deleteMany();

    logger.info('Sample data rollback completed');

  } catch (error) {
    logger.error('Error rolling back sample data:', error);
    throw error;
  }
}

module.exports = {
  seedSampleData,
  rollbackSampleData,
  SAMPLE_CONFIG
};

// Run directly if called from command line
if (require.main === module) {
  seedSampleData()
    .then((result) => {
      console.log('✅ Sample data seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Sample data seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}