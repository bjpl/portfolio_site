// Seed script for portfolio data
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { Sequelize } = require('sequelize');
const { sequelize } = require('../src/models/User');
const { Project, Skill, Experience } = require('../src/models/Portfolio');

const sampleProjects = [
  {
    title: 'E-Commerce Platform',
    slug: 'e-commerce-platform',
    description: 'Full-stack e-commerce solution with React, Node.js, and PostgreSQL',
    content: 'Built a comprehensive e-commerce platform featuring user authentication, product catalog, shopping cart, payment integration, and admin dashboard.',
    category: 'Web Development',
    technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe', 'Redis'],
    thumbnail: '/images/projects/ecommerce.jpg',
    liveUrl: 'https://demo.example.com',
    githubUrl: 'https://github.com/example/ecommerce',
    featured: true,
    published: true,
    order: 1
  },
  {
    title: 'AI Content Generator',
    slug: 'ai-content-generator',
    description: 'Machine learning powered content generation tool',
    content: 'Developed an AI-powered content generation tool using OpenAI GPT API, featuring template management, batch processing, and content optimization.',
    category: 'Machine Learning',
    technologies: ['Python', 'FastAPI', 'React', 'OpenAI API', 'MongoDB'],
    thumbnail: '/images/projects/ai-generator.jpg',
    liveUrl: 'https://ai-demo.example.com',
    githubUrl: 'https://github.com/example/ai-generator',
    featured: true,
    published: true,
    order: 2
  },
  {
    title: 'Real-time Analytics Dashboard',
    slug: 'analytics-dashboard',
    description: 'Interactive data visualization dashboard with real-time updates',
    content: 'Created a real-time analytics dashboard with WebSocket connections, interactive charts, and customizable widgets for business intelligence.',
    category: 'Data Visualization',
    technologies: ['Vue.js', 'D3.js', 'Socket.io', 'Express', 'ClickHouse'],
    thumbnail: '/images/projects/analytics.jpg',
    liveUrl: 'https://analytics.example.com',
    featured: false,
    published: true,
    order: 3
  }
];

const sampleSkills = {
  frontend: [
    { name: 'React', level: 90, category: 'Frontend' },
    { name: 'Vue.js', level: 85, category: 'Frontend' },
    { name: 'TypeScript', level: 88, category: 'Frontend' },
    { name: 'CSS/Sass', level: 92, category: 'Frontend' }
  ],
  backend: [
    { name: 'Node.js', level: 90, category: 'Backend' },
    { name: 'Python', level: 85, category: 'Backend' },
    { name: 'PostgreSQL', level: 82, category: 'Backend' },
    { name: 'Redis', level: 78, category: 'Backend' }
  ],
  tools: [
    { name: 'Docker', level: 80, category: 'DevOps' },
    { name: 'AWS', level: 75, category: 'DevOps' },
    { name: 'Git', level: 95, category: 'Tools' },
    { name: 'CI/CD', level: 82, category: 'DevOps' }
  ]
};

const sampleExperience = [
  {
    position: 'Senior Full Stack Developer',
    company: 'Tech Solutions Inc.',
    startDate: '2021-01-01',
    endDate: null,
    current: true,
    description: 'Leading development of enterprise web applications using modern JavaScript frameworks. Architecting scalable solutions and mentoring junior developers.',
    responsibilities: ['Lead development team', 'Architect solutions', 'Mentor developers'],
    technologies: ['React', 'Node.js', 'AWS', 'Docker'],
    order: 1
  },
  {
    position: 'Full Stack Developer',
    company: 'Digital Agency Co.',
    startDate: '2019-03-01',
    endDate: '2020-12-31',
    current: false,
    description: 'Developed custom web applications for clients across various industries. Implemented responsive designs and RESTful APIs.',
    responsibilities: ['Build web applications', 'Design APIs', 'Client collaboration'],
    technologies: ['Vue.js', 'Python', 'PostgreSQL'],
    order: 2
  }
];

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seed...');
    
    // Sync database
    await sequelize.sync();
    
    // Clear existing data
    console.log('Clearing existing data...');
    await Project.destroy({ where: {} });
    await Skill.destroy({ where: {} });
    await Experience.destroy({ where: {} });
    
    // Seed projects
    console.log('Seeding projects...');
    for (const project of sampleProjects) {
      await Project.create(project);
    }
    
    // Seed skills
    console.log('Seeding skills...');
    const allSkills = [
      ...sampleSkills.frontend,
      ...sampleSkills.backend,
      ...sampleSkills.tools
    ];
    for (const skill of allSkills) {
      await Skill.create(skill);
    }
    
    // Seed experience
    console.log('Seeding experience...');
    for (const exp of sampleExperience) {
      await Experience.create(exp);
    }
    
    console.log('✅ Database seeded successfully!');
    console.log(`- ${sampleProjects.length} projects`);
    console.log(`- ${allSkills.length} skills`);
    console.log(`- ${sampleExperience.length} experiences`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seedDatabase();