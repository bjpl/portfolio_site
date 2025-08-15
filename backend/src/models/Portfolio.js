const { Sequelize, DataTypes } = require('sequelize');

const { sequelize } = require('./User');

// Project Model
const Project = sequelize.define(
  'Project',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    category: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    technologies: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    features: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    images: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    thumbnail: {
      type: DataTypes.STRING,
    },
    liveUrl: {
      type: DataTypes.STRING,
      field: 'live_url',
    },
    githubUrl: {
      type: DataTypes.STRING,
      field: 'github_url',
    },
    demoUrl: {
      type: DataTypes.STRING,
      field: 'demo_url',
    },
    client: {
      type: DataTypes.STRING,
    },
    duration: {
      type: DataTypes.STRING,
    },
    role: {
      type: DataTypes.STRING,
    },
    teamSize: {
      type: DataTypes.INTEGER,
      field: 'team_size',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      field: 'published_at',
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count',
    },
    metadata: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    authorId: {
      type: DataTypes.UUID,
      field: 'author_id',
    },
  },
  {
    tableName: 'projects',
    timestamps: true,
    underscored: true,
  }
);

// Skill Model
const Skill = sequelize.define(
  'Skill',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    category: {
      type: DataTypes.ENUM('frontend', 'backend', 'database', 'devops', 'tools', 'soft'),
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 100,
      },
    },
    yearsOfExperience: {
      type: DataTypes.FLOAT,
      field: 'years_of_experience',
    },
    icon: {
      type: DataTypes.STRING,
    },
    color: {
      type: DataTypes.STRING,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'skills',
    timestamps: true,
    underscored: true,
  }
);

// Experience Model
const Experience = sequelize.define(
  'Experience',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    company: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    position: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    responsibilities: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    achievements: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    technologies: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATE,
      field: 'end_date',
    },
    isCurrent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_current',
    },
    location: {
      type: DataTypes.STRING,
    },
    type: {
      type: DataTypes.ENUM('full-time', 'part-time', 'contract', 'freelance', 'internship'),
      defaultValue: 'full-time',
    },
    companyUrl: {
      type: DataTypes.STRING,
      field: 'company_url',
    },
    companyLogo: {
      type: DataTypes.STRING,
      field: 'company_logo',
    },
  },
  {
    tableName: 'experiences',
    timestamps: true,
    underscored: true,
  }
);

// Education Model
const Education = sequelize.define(
  'Education',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    institution: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    degree: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    field: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'start_date',
    },
    endDate: {
      type: DataTypes.DATE,
      field: 'end_date',
    },
    isCurrent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_current',
    },
    gpa: {
      type: DataTypes.FLOAT,
    },
    honors: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    activities: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    location: {
      type: DataTypes.STRING,
    },
  },
  {
    tableName: 'education',
    timestamps: true,
    underscored: true,
  }
);

// Testimonial Model
const Testimonial = sequelize.define(
  'Testimonial',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    position: {
      type: DataTypes.STRING,
    },
    company: {
      type: DataTypes.STRING,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    rating: {
      type: DataTypes.INTEGER,
      validate: {
        min: 1,
        max: 5,
      },
    },
    avatar: {
      type: DataTypes.STRING,
    },
    projectId: {
      type: DataTypes.UUID,
      field: 'project_id',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    approved: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    linkedinUrl: {
      type: DataTypes.STRING,
      field: 'linkedin_url',
    },
  },
  {
    tableName: 'testimonials',
    timestamps: true,
    underscored: true,
  }
);

// Contact Form Submission Model
const Contact = sequelize.define(
  'Contact',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isEmail: true,
      },
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    phone: {
      type: DataTypes.STRING,
    },
    company: {
      type: DataTypes.STRING,
    },
    projectType: {
      type: DataTypes.STRING,
      field: 'project_type',
    },
    budget: {
      type: DataTypes.STRING,
    },
    timeline: {
      type: DataTypes.STRING,
    },
    ip: {
      type: DataTypes.STRING,
    },
    userAgent: {
      type: DataTypes.STRING,
      field: 'user_agent',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_read',
    },
    isReplied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_replied',
    },
    isSpam: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_spam',
    },
    notes: {
      type: DataTypes.TEXT,
    },
  },
  {
    tableName: 'contacts',
    timestamps: true,
    underscored: true,
  }
);

// Achievement/Certification Model
const Achievement = sequelize.define(
  'Achievement',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    issuer: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    expiryDate: {
      type: DataTypes.DATE,
      field: 'expiry_date',
    },
    credentialId: {
      type: DataTypes.STRING,
      field: 'credential_id',
    },
    url: {
      type: DataTypes.STRING,
    },
    description: {
      type: DataTypes.TEXT,
    },
    image: {
      type: DataTypes.STRING,
    },
    category: {
      type: DataTypes.ENUM('certification', 'award', 'publication', 'speaking', 'other'),
      defaultValue: 'certification',
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: 'achievements',
    timestamps: true,
    underscored: true,
  }
);

// Blog Post Model (integrates with Hugo content)
const BlogPost = sequelize.define(
  'BlogPost',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    excerpt: {
      type: DataTypes.TEXT,
    },
    contentPath: {
      type: DataTypes.STRING,
      field: 'content_path',
    },
    category: {
      type: DataTypes.STRING,
    },
    tags: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    published: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    publishedAt: {
      type: DataTypes.DATE,
      field: 'published_at',
    },
    viewCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'view_count',
    },
    readTime: {
      type: DataTypes.INTEGER,
      field: 'read_time',
    },
    authorId: {
      type: DataTypes.UUID,
      field: 'author_id',
    },
  },
  {
    tableName: 'blog_posts',
    timestamps: true,
    underscored: true,
  }
);

// Service/Offering Model
const Service = sequelize.define(
  'Service',
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    slug: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    features: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    price: {
      type: DataTypes.STRING,
    },
    priceUnit: {
      type: DataTypes.ENUM('hour', 'project', 'month', 'custom'),
      field: 'price_unit',
    },
    icon: {
      type: DataTypes.STRING,
    },
    featured: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  },
  {
    tableName: 'services',
    timestamps: true,
    underscored: true,
  }
);

// Associations
Project.hasMany(Testimonial, { foreignKey: 'projectId', as: 'testimonials' });
Testimonial.belongsTo(Project, { foreignKey: 'projectId', as: 'project' });

// Add User associations if needed
const { User } = require('./User');

User.hasMany(Project, { foreignKey: 'authorId', as: 'projects' });
Project.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

User.hasMany(BlogPost, { foreignKey: 'authorId', as: 'blogPosts' });
BlogPost.belongsTo(User, { foreignKey: 'authorId', as: 'author' });

module.exports = {
  Project,
  Skill,
  Experience,
  Education,
  Testimonial,
  Contact,
  Achievement,
  BlogPost,
  Service,
};
