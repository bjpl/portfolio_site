const path = require('path');
const fs = require('fs').promises;

const config = require('../config');
const { Project, Skill, Experience, Education, Testimonial, Contact } = require('../models/Portfolio');
const logger = require('../utils/logger');

const cacheService = require('./cache');
const emailService = require('./emailService');

class PortfolioService {
  /**
   * Get portfolio owner's profile
   */
  async getProfile() {
    const cacheKey = 'portfolio:profile';
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const profile = {
      name: config.portfolio?.ownerName || 'Portfolio Owner',
      title: config.portfolio?.title || 'Full Stack Developer',
      bio: config.portfolio?.bio || 'Passionate developer creating amazing experiences',
      location: config.portfolio?.location || 'Remote',
      email: config.portfolio?.contactEmail,
      social: {
        github: config.portfolio?.github,
        linkedin: config.portfolio?.linkedin,
        twitter: config.portfolio?.twitter,
        instagram: config.portfolio?.instagram,
      },
      avatar: config.portfolio?.avatar || '/images/avatar.jpg',
      resume: config.portfolio?.resumePath || '/files/resume.pdf',
    };

    await cacheService.set(cacheKey, profile, 3600); // Cache for 1 hour
    return profile;
  }

  /**
   * Update portfolio profile
   */
  async updateProfile(data) {
    // In production, this would update database
    // For now, update config and clear cache
    await cacheService.del('portfolio:profile');
    return { ...data, updated: true };
  }

  /**
   * Get featured projects
   */
  async getFeaturedProjects() {
    const cacheKey = 'portfolio:projects:featured';
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const projects = await Project.findAll({
      where: {
        featured: true,
        published: true,
      },
      order: [
        ['order', 'ASC'],
        ['createdAt', 'DESC'],
      ],
      limit: 6,
    });

    await cacheService.set(cacheKey, projects, 600); // Cache for 10 minutes
    return projects;
  }

  /**
   * Get all projects with filtering
   */
  async getProjects(options) {
    const { page = 1, limit = 12, category, technology, sortBy = 'date', sortOrder = 'desc' } = options;

    const where = { published: true };

    if (category) {
      where.category = category;
    }

    if (technology) {
      where.technologies = {
        [require('sequelize').Op.contains]: [technology],
      };
    }

    const order = [];
    if (sortBy === 'date') {
      order.push(['createdAt', sortOrder.toUpperCase()]);
    } else if (sortBy === 'title') {
      order.push(['title', sortOrder.toUpperCase()]);
    } else if (sortBy === 'views') {
      order.push(['viewCount', sortOrder.toUpperCase()]);
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await Project.findAndCountAll({
      where,
      order,
      limit,
      offset,
    });

    return {
      projects: rows,
      pagination: {
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  /**
   * Get single project by slug
   */
  async getProjectBySlug(slug) {
    const cacheKey = `portfolio:project:${slug}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const project = await Project.findOne({
      where: {
        slug,
        published: true,
      },
    });

    if (project) {
      await cacheService.set(cacheKey, project, 300); // Cache for 5 minutes
    }

    return project;
  }

  /**
   * Track project view
   */
  async trackProjectView(slug, ip) {
    const viewKey = `view:${slug}:${ip}`;
    const recentView = await cacheService.get(viewKey);

    if (!recentView) {
      await Project.increment('viewCount', {
        where: { slug },
      });

      // Prevent multiple views from same IP for 1 hour
      await cacheService.set(viewKey, true, 3600);
    }
  }

  /**
   * Create new project
   */
  async createProject(data) {
    const project = await Project.create({
      ...data,
      slug: this.generateSlug(data.title),
      viewCount: 0,
    });

    // Clear cache
    await cacheService.del('portfolio:projects:*');

    return project;
  }

  /**
   * Update project
   */
  async updateProject(id, data) {
    const project = await Project.findByPk(id);

    if (!project) return null;

    if (data.title && data.title !== project.title) {
      data.slug = this.generateSlug(data.title);
    }

    await project.update(data);

    // Clear cache
    await cacheService.del(`portfolio:project:${project.slug}`);
    await cacheService.del('portfolio:projects:*');

    return project;
  }

  /**
   * Delete project
   */
  async deleteProject(id) {
    const project = await Project.findByPk(id);

    if (project) {
      await project.destroy();

      // Clear cache
      await cacheService.del(`portfolio:project:${project.slug}`);
      await cacheService.del('portfolio:projects:*');
    }
  }

  /**
   * Get skills/technologies
   */
  async getSkills() {
    const cacheKey = 'portfolio:skills';
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const skills = await Skill.findAll({
      order: [
        ['category', 'ASC'],
        ['level', 'DESC'],
      ],
    });

    // Group by category
    const grouped = skills.reduce((acc, skill) => {
      if (!acc[skill.category]) {
        acc[skill.category] = [];
      }
      acc[skill.category].push(skill);
      return acc;
    }, {});

    await cacheService.set(cacheKey, grouped, 3600);
    return grouped;
  }

  /**
   * Get experience timeline
   */
  async getExperience() {
    const cacheKey = 'portfolio:experience';
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const experience = await Experience.findAll({
      order: [['startDate', 'DESC']],
    });

    await cacheService.set(cacheKey, experience, 3600);
    return experience;
  }

  /**
   * Get education
   */
  async getEducation() {
    const cacheKey = 'portfolio:education';
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const education = await Education.findAll({
      order: [['endDate', 'DESC']],
    });

    await cacheService.set(cacheKey, education, 3600);
    return education;
  }

  /**
   * Get testimonials
   */
  async getTestimonials() {
    const cacheKey = 'portfolio:testimonials';
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const testimonials = await Testimonial.findAll({
      where: { approved: true },
      order: [
        ['featured', 'DESC'],
        ['createdAt', 'DESC'],
      ],
    });

    await cacheService.set(cacheKey, testimonials, 1800);
    return testimonials;
  }

  /**
   * Submit contact form
   */
  async submitContactForm(data) {
    // Save to database
    const contact = await Contact.create(data);

    // Send email notification
    if (config.email.smtp.user) {
      await emailService.sendEmail({
        to: config.portfolio?.contactEmail || config.email.from,
        subject: `Portfolio Contact: ${data.subject}`,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <p><strong>Message:</strong></p>
          <p>${data.message}</p>
          <hr>
          <p><small>IP: ${data.ip} | User Agent: ${data.userAgent}</small></p>
        `,
      });
    }

    return contact;
  }

  /**
   * Get portfolio statistics
   */
  async getStatistics(includePrivate = false) {
    const cacheKey = `portfolio:stats:${includePrivate ? 'admin' : 'public'}`;
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    const stats = {
      projects: await Project.count({ where: { published: true } }),
      skills: await Skill.count(),
      experience: await Experience.count(),
      testimonials: await Testimonial.count({ where: { approved: true } }),
    };

    if (includePrivate) {
      stats.totalViews = await Project.sum('viewCount');
      stats.contacts = await Contact.count();
      stats.drafts = await Project.count({ where: { published: false } });
    }

    await cacheService.set(cacheKey, stats, 300);
    return stats;
  }

  /**
   * Get recent blog posts
   */
  async getRecentBlogPosts(limit = 5) {
    // This would integrate with the content system
    // For now, return from Hugo content
    const posts = [];

    try {
      const contentPath = path.join(__dirname, '../../../content/think');
      const files = await fs.readdir(contentPath);

      for (const file of files.slice(0, limit)) {
        if (file.endsWith('.md')) {
          const content = await fs.readFile(path.join(contentPath, file), 'utf-8');
          const frontmatter = this.parseFrontmatter(content);
          posts.push({
            title: frontmatter.title,
            slug: file.replace('.md', ''),
            date: frontmatter.date,
            excerpt: frontmatter.description,
          });
        }
      }
    } catch (error) {
      logger.error('Error reading blog posts', error);
    }

    return posts;
  }

  /**
   * Get achievements/certifications
   */
  async getAchievements() {
    const cacheKey = 'portfolio:achievements';
    const cached = await cacheService.get(cacheKey);

    if (cached) return cached;

    // This would come from database
    // For now, return mock data
    const achievements = [
      {
        title: 'AWS Certified Solutions Architect',
        issuer: 'Amazon Web Services',
        date: '2023-01-15',
        credentialId: 'AWS-123456',
        url: 'https://aws.amazon.com/verification',
      },
      {
        title: 'Google Cloud Professional Developer',
        issuer: 'Google Cloud',
        date: '2022-08-20',
        credentialId: 'GCP-789012',
        url: 'https://cloud.google.com/certification',
      },
    ];

    await cacheService.set(cacheKey, achievements, 3600);
    return achievements;
  }

  /**
   * Get resume path
   */
  async getResume(format = 'pdf') {
    const resumePath = path.join(__dirname, '../../../static/files', `resume.${format}`);

    try {
      await fs.access(resumePath);
      return resumePath;
    } catch {
      return null;
    }
  }

  /**
   * Generate slug from title
   */
  generateSlug(title) {
    return title
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Parse frontmatter from markdown
   */
  parseFrontmatter(content) {
    const lines = content.split('\n');
    const frontmatter = {};
    let inFrontmatter = false;

    for (const line of lines) {
      if (line === '---') {
        if (!inFrontmatter) {
          inFrontmatter = true;
        } else {
          break;
        }
      } else if (inFrontmatter) {
        const [key, ...valueParts] = line.split(':');
        if (key && valueParts.length) {
          frontmatter[key.trim()] = valueParts.join(':').trim();
        }
      }
    }

    return frontmatter;
  }
}

module.exports = new PortfolioService();
