const { sequelize } = require('./User');

// Import model definitions
const userModels = require('./User');
const portfolioModels = require('./Portfolio');
const ContentVersion = require('./ContentVersion');
const analyticsModel = require('./Analytics');

// Initialize models
const User = userModels.User;
const Session = userModels.Session;
const Analytics = analyticsModel(sequelize);

// Portfolio models are already initialized
const { Project, Skill, Experience, Education, Testimonial, Contact, Achievement, BlogPost, Service } = portfolioModels;

// Define associations (avoid duplicates - some already defined in individual model files)
User.hasMany(Analytics, { foreignKey: 'userId', as: 'analytics' });
Analytics.belongsTo(User, { foreignKey: 'userId', as: 'user' });

User.hasMany(ContentVersion, { foreignKey: 'userId', as: 'contentVersions' });
ContentVersion.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// Export all models and sequelize instance
module.exports = {
  sequelize,
  User,
  Session,
  Project,
  Skill,
  Experience,
  Education,
  Testimonial,
  Contact,
  Achievement,
  BlogPost,
  Service,
  ContentVersion,
  Analytics
};