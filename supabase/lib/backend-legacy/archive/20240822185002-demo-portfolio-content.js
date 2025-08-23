'use strict';

const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Get existing user ID (assuming admin user exists)
    const users = await queryInterface.sequelize.query(
      'SELECT id FROM users WHERE username = :username LIMIT 1',
      {
        replacements: { username: 'admin' },
        type: queryInterface.sequelize.QueryTypes.SELECT
      }
    );

    if (users.length === 0) {
      throw new Error('Admin user not found. Please run user seeder first.');
    }

    const userId = users[0].id;

    // Sample projects
    const projectIds = [uuidv4(), uuidv4(), uuidv4()];
    const projects = [
      {
        id: projectIds[0],
        title: 'E-commerce Platform',
        slug: 'ecommerce-platform',
        short_description: 'A full-featured online shopping platform with payment integration',
        description: 'Built a comprehensive e-commerce solution from scratch using modern web technologies. Features include user authentication, product catalog, shopping cart, payment processing, and admin dashboard.',
        content: '# E-commerce Platform\n\n## Overview\nThis project was a comprehensive e-commerce solution designed to handle online retail operations...',
        project_type: 'web_application',
        status: 'published',
        priority: 10,
        featured: true,
        start_date: '2023-01-15',
        end_date: '2023-06-30',
        duration_months: 5,
        team_size: 4,
        my_role: 'Full Stack Developer & Team Lead',
        responsibilities: JSON.stringify([
          'Led development team of 4 developers',
          'Architected system design and database schema',
          'Implemented payment gateway integration',
          'Developed responsive frontend with React',
          'Built REST API with Node.js and Express'
        ]),
        technologies: JSON.stringify([
          'React', 'Node.js', 'PostgreSQL', 'Stripe API', 'Docker', 'AWS'
        ]),
        challenges: 'Main challenges included handling high traffic loads during sales events and implementing secure payment processing.',
        solutions: 'Implemented Redis caching, database optimization, and comprehensive security measures including input validation and encryption.',
        results: 'Successfully launched platform handling 10,000+ concurrent users with 99.9% uptime and processing $2M+ in transactions.',
        demo_url: 'https://demo-ecommerce.example.com',
        repository_url: 'https://github.com/example/ecommerce-platform',
        client_name: 'TechStore Inc.',
        client_industry: 'Retail Technology',
        budget_range: '25k_50k',
        metrics: JSON.stringify({
          users: 25000,
          transactions: 15000,
          revenue: 2500000,
          uptime: 99.9,
          load_time: 1.2
        }),
        seo_title: 'E-commerce Platform - Full Stack Development Case Study',
        seo_description: 'Learn how we built a scalable e-commerce platform handling $2M+ in transactions with React, Node.js, and PostgreSQL.',
        seo_keywords: JSON.stringify(['e-commerce', 'full-stack', 'react', 'nodejs', 'postgresql']),
        view_count: 256,
        published_at: new Date('2023-07-15'),
        metadata: JSON.stringify({
          performance_metrics: {
            lighthouse_score: 95,
            core_web_vitals: 'passed'
          }
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: projectIds[1],
        title: 'Task Management Dashboard',
        slug: 'task-management-dashboard',
        short_description: 'A collaborative project management tool with real-time updates',
        description: 'Developed a modern task management application with real-time collaboration features, drag-and-drop interface, and comprehensive reporting.',
        content: '# Task Management Dashboard\n\n## Features\n- Real-time collaboration\n- Drag and drop interface\n- Advanced reporting...',
        project_type: 'web_application',
        status: 'published',
        priority: 8,
        featured: true,
        start_date: '2023-08-01',
        end_date: '2023-11-15',
        duration_months: 3,
        team_size: 2,
        my_role: 'Frontend Developer',
        responsibilities: JSON.stringify([
          'Designed and implemented user interface',
          'Integrated WebSocket for real-time features',
          'Implemented drag-and-drop functionality',
          'Created responsive design for mobile devices'
        ]),
        technologies: JSON.stringify([
          'React', 'TypeScript', 'Socket.io', 'Material-UI', 'Express.js'
        ]),
        challenges: 'Implementing smooth real-time updates without performance issues and creating an intuitive drag-and-drop interface.',
        solutions: 'Used Socket.io for efficient real-time communication and optimized React components with useMemo and useCallback.',
        results: 'Delivered a high-performance dashboard with 98% user satisfaction and 40% improvement in team productivity.',
        demo_url: 'https://taskboard-demo.example.com',
        repository_url: 'https://github.com/example/task-dashboard',
        metrics: JSON.stringify({
          active_users: 500,
          teams: 120,
          tasks_managed: 50000,
          user_satisfaction: 4.8
        }),
        view_count: 189,
        published_at: new Date('2023-12-01'),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: projectIds[2],
        title: 'Portfolio Website',
        slug: 'portfolio-website',
        short_description: 'Personal portfolio website with CMS integration',
        description: 'Built a modern, responsive portfolio website with integrated content management system for easy updates.',
        project_type: 'website',
        status: 'published',
        priority: 6,
        featured: false,
        start_date: '2024-01-01',
        end_date: '2024-03-01',
        duration_months: 2,
        team_size: 1,
        my_role: 'Full Stack Developer',
        responsibilities: JSON.stringify([
          'Complete website design and development',
          'CMS integration for content management',
          'SEO optimization and performance tuning',
          'Responsive design implementation'
        ]),
        technologies: JSON.stringify([
          'Hugo', 'JavaScript', 'Node.js', 'PostgreSQL', 'Docker'
        ]),
        results: 'Created a fast, SEO-optimized portfolio website with 95+ Lighthouse score and integrated CMS.',
        repository_url: 'https://github.com/example/portfolio-site',
        view_count: 87,
        published_at: new Date('2024-03-15'),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    // Sample experiences
    const experiences = [
      {
        id: uuidv4(),
        title: 'Senior Full Stack Developer',
        company: 'TechCorp Solutions',
        company_url: 'https://techcorp.example.com',
        location: 'San Francisco, CA',
        employment_type: 'full_time',
        work_arrangement: 'remote',
        start_date: '2022-03-01',
        end_date: null,
        is_current: true,
        description: 'Lead development of enterprise web applications using modern JavaScript frameworks and cloud technologies.',
        responsibilities: JSON.stringify([
          'Lead a team of 5 developers in building scalable web applications',
          'Architect system designs for high-traffic applications',
          'Mentor junior developers and conduct code reviews',
          'Collaborate with product managers and designers on feature development',
          'Implement CI/CD pipelines and DevOps best practices'
        ]),
        achievements: JSON.stringify([
          'Reduced application load time by 60% through optimization',
          'Led migration to microservices architecture',
          'Implemented automated testing resulting in 40% fewer bugs',
          'Mentored 3 junior developers who were promoted'
        ]),
        technologies: JSON.stringify([
          'React', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS', 'Redis'
        ]),
        industry: 'Technology',
        company_size: 'medium_51_200',
        team_size: 5,
        direct_reports: 2,
        key_projects: JSON.stringify([
          { name: 'Customer Portal Redesign', impact: 'Increased user satisfaction by 45%' },
          { name: 'API Gateway Implementation', impact: 'Improved system reliability to 99.9%' }
        ]),
        skills_gained: JSON.stringify([
          'Kubernetes', 'GraphQL', 'System Architecture', 'Team Leadership'
        ]),
        is_featured: true,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        title: 'Frontend Developer',
        company: 'StartupXYZ',
        company_url: 'https://startupxyz.example.com',
        location: 'Austin, TX',
        employment_type: 'full_time',
        work_arrangement: 'on_site',
        start_date: '2020-06-01',
        end_date: '2022-02-28',
        is_current: false,
        description: 'Developed user interfaces for a fast-growing SaaS platform serving 100,000+ users.',
        responsibilities: JSON.stringify([
          'Built responsive web applications using React and Vue.js',
          'Collaborated with UX designers to implement user-friendly interfaces',
          'Optimized application performance and accessibility',
          'Participated in agile development processes'
        ]),
        achievements: JSON.stringify([
          'Improved application performance by 35%',
          'Implemented accessibility features achieving WCAG 2.1 compliance',
          'Reduced bundle size by 25% through code optimization'
        ]),
        technologies: JSON.stringify([
          'React', 'Vue.js', 'JavaScript', 'SASS', 'Webpack', 'Jest'
        ]),
        industry: 'Software',
        company_size: 'startup_1_10',
        team_size: 3,
        reason_for_leaving: 'Sought opportunities for full-stack development and team leadership',
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    // Sample education
    const education = [
      {
        id: uuidv4(),
        institution: 'University of Technology',
        institution_url: 'https://utech.example.edu',
        location: 'California, USA',
        degree_type: 'bachelor',
        degree_name: 'Bachelor of Science in Computer Science',
        field_of_study: 'Computer Science',
        specialization: 'Software Engineering',
        start_date: '2016-09-01',
        graduation_date: '2020-05-15',
        is_completed: true,
        grade_type: 'gpa',
        grade_value: '3.8',
        grade_scale: '4.0',
        honors: JSON.stringify(['Magna Cum Laude', 'Dean\'s List']),
        activities: JSON.stringify(['Computer Science Club President', 'Hackathon Winner']),
        coursework: JSON.stringify([
          'Data Structures and Algorithms',
          'Database Systems',
          'Software Engineering',
          'Web Development',
          'Computer Networks'
        ]),
        description: 'Comprehensive computer science education with focus on software engineering and web technologies.',
        skills_acquired: JSON.stringify([
          'Programming Fundamentals',
          'Algorithm Design',
          'Database Design',
          'Software Architecture'
        ]),
        projects: JSON.stringify([
          { name: 'Final Year Project: E-learning Platform', grade: 'A+' },
          { name: 'Database Management System', grade: 'A' }
        ]),
        is_featured: true,
        status: 'active',
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    // Sample testimonials
    const testimonials = [
      {
        id: uuidv4(),
        author_name: 'Sarah Johnson',
        author_title: 'Project Manager',
        author_company: 'TechCorp Solutions',
        author_email: 'sarah.johnson@techcorp.example.com',
        content: 'Working with this developer was exceptional. They delivered high-quality code on time and went above and beyond to ensure our project\'s success. Their technical expertise and communication skills made them an invaluable team member.',
        short_content: 'Exceptional developer who delivered high-quality code on time with great communication skills.',
        rating: 5,
        testimonial_type: 'colleague_recommendation',
        relationship: 'manager',
        project_context: 'E-commerce Platform Development',
        work_period: '6 months',
        skills_mentioned: JSON.stringify(['React', 'Node.js', 'Leadership', 'Problem Solving']),
        received_date: '2023-07-20',
        is_featured: true,
        is_public: true,
        status: 'active',
        verification_status: 'verified',
        verification_date: new Date('2023-07-21'),
        consent_given: true,
        consent_date: new Date('2023-07-20'),
        usage_permissions: JSON.stringify({
          website: true,
          marketing: true,
          social_media: true,
          proposals: true
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        author_name: 'Mike Chen',
        author_title: 'CEO',
        author_company: 'StartupXYZ',
        content: 'An outstanding developer who consistently delivers excellent results. Their ability to understand complex requirements and translate them into elegant solutions is remarkable. Highly recommended for any development project.',
        rating: 5,
        testimonial_type: 'client_review',
        relationship: 'client',
        project_context: 'Frontend Development for SaaS Platform',
        skills_mentioned: JSON.stringify(['Frontend Development', 'React', 'Problem Solving']),
        received_date: '2022-03-10',
        is_featured: true,
        is_public: true,
        status: 'active',
        verification_status: 'verified',
        consent_given: true,
        usage_permissions: JSON.stringify({
          website: true,
          marketing: false,
          social_media: true,
          proposals: true
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ];

    await queryInterface.bulkInsert('projects', projects);
    await queryInterface.bulkInsert('experiences', experiences);
    await queryInterface.bulkInsert('education', education);
    await queryInterface.bulkInsert('testimonials', testimonials);

    // Create some content versions for the projects
    const contentVersions = projects.map((project, index) => ({
      id: uuidv4(),
      content_id: project.id,
      content_type: 'project',
      version_number: 1,
      version_label: 'Initial Version',
      title: project.title,
      content_data: JSON.stringify({
        title: project.title,
        description: project.description,
        technologies: JSON.parse(project.technologies),
        status: project.status
      }),
      content_html: project.content,
      summary: project.short_description,
      change_type: 'created',
      change_description: 'Initial project creation',
      word_count: project.content ? project.content.split(' ').length : 0,
      character_count: project.content ? project.content.length : 0,
      created_by: userId,
      is_current: true,
      is_published: true,
      status: 'published',
      published_at: project.published_at,
      published_by: userId,
      language: 'en',
      source_type: 'manual',
      created_at: new Date(),
      updated_at: new Date(),
    }));

    await queryInterface.bulkInsert('content_versions', contentVersions);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('content_versions', null, {});
    await queryInterface.bulkDelete('testimonials', null, {});
    await queryInterface.bulkDelete('education', null, {});
    await queryInterface.bulkDelete('experiences', null, {});
    await queryInterface.bulkDelete('projects', null, {});
  }
};