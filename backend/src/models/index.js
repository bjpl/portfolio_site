/**
 * Database Models Index
 * Centralizes all Sequelize models and handles associations
 */

const { Sequelize } = require('sequelize');
const { sequelize } = require('../config/database');

// Import all models
const User = require('./User');
const Role = require('./Role');
const UserRole = require('./UserRole');
const Project = require('./Project');
const Skill = require('./Skill');
const Experience = require('./Experience');
const Education = require('./Education');
const Testimonial = require('./Testimonial');
const ContentVersion = require('./ContentVersion');
const WorkflowState = require('./WorkflowState');
const MediaAsset = require('./MediaAsset');
const Tag = require('./Tag');
const ProjectTag = require('./ProjectTag');
const ProjectSkill = require('./ProjectSkill');

// Initialize models
const models = {
  User: User(sequelize, Sequelize),
  Role: Role(sequelize, Sequelize),
  UserRole: UserRole(sequelize, Sequelize),
  Project: Project(sequelize, Sequelize),
  Skill: Skill(sequelize, Sequelize),
  Experience: Experience(sequelize, Sequelize),
  Education: Education(sequelize, Sequelize),
  Testimonial: Testimonial(sequelize, Sequelize),
  ContentVersion: ContentVersion(sequelize, Sequelize),
  WorkflowState: WorkflowState(sequelize, Sequelize),
  MediaAsset: MediaAsset(sequelize, Sequelize),
  Tag: Tag(sequelize, Sequelize),
  ProjectTag: ProjectTag(sequelize, Sequelize),
  ProjectSkill: ProjectSkill(sequelize, Sequelize),
};

// Define associations
Object.keys(models).forEach(modelName => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

// Export models and sequelize instance
module.exports = {
  ...models,
  sequelize,
  Sequelize,
};