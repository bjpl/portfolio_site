/**
 * Seed: Default Roles
 * Creates the basic role system for the portfolio site
 */

const { PrismaClient } = require('@prisma/client');
const logger = require('../utils/logger');

const prisma = new PrismaClient();

const defaultRoles = [
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: [
      'users:*',
      'roles:*',
      'projects:*',
      'blog:*',
      'comments:*',
      'media:*',
      'analytics:*',
      'settings:*',
      'system:*'
    ],
    isSystem: true,
    isActive: true
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full content management access',
    permissions: [
      'users:read',
      'users:update',
      'projects:*',
      'blog:*',
      'comments:*',
      'media:*',
      'analytics:read',
      'settings:read'
    ],
    isSystem: true,
    isActive: true
  },
  {
    name: 'editor',
    displayName: 'Content Editor',
    description: 'Can create and edit content',
    permissions: [
      'projects:create',
      'projects:read',
      'projects:update',
      'blog:create',
      'blog:read',
      'blog:update',
      'comments:moderate',
      'media:create',
      'media:read',
      'media:update'
    ],
    isSystem: true,
    isActive: true
  },
  {
    name: 'author',
    displayName: 'Author',
    description: 'Can create and manage own content',
    permissions: [
      'projects:create',
      'projects:read',
      'projects:update:own',
      'blog:create',
      'blog:read',
      'blog:update:own',
      'media:create',
      'media:read',
      'media:update:own'
    ],
    isSystem: true,
    isActive: true
  },
  {
    name: 'moderator',
    displayName: 'Content Moderator',
    description: 'Can moderate comments and user-generated content',
    permissions: [
      'comments:read',
      'comments:moderate',
      'comments:delete',
      'users:read',
      'projects:read',
      'blog:read'
    ],
    isSystem: true,
    isActive: true
  },
  {
    name: 'viewer',
    displayName: 'Viewer',
    description: 'Read-only access to public content',
    permissions: [
      'projects:read:public',
      'blog:read:public',
      'comments:read:approved'
    ],
    isSystem: true,
    isActive: true
  },
  {
    name: 'contributor',
    displayName: 'Contributor',
    description: 'Can submit content for review',
    permissions: [
      'projects:create:draft',
      'blog:create:draft',
      'comments:create',
      'media:create'
    ],
    isSystem: false,
    isActive: true
  }
];

async function seedRoles() {
  try {
    logger.info('Starting role seeding...');

    let createdCount = 0;
    let skippedCount = 0;

    for (const roleData of defaultRoles) {
      // Check if role already exists
      const existingRole = await prisma.role.findUnique({
        where: { name: roleData.name }
      });

      if (existingRole) {
        logger.info(`Role '${roleData.name}' already exists, skipping`);
        skippedCount++;
        continue;
      }

      // Create new role
      await prisma.role.create({
        data: {
          ...roleData,
          permissions: roleData.permissions
        }
      });

      logger.info(`Created role: ${roleData.name}`);
      createdCount++;
    }

    logger.info(`Role seeding completed: ${createdCount} created, ${skippedCount} skipped`);

    return {
      success: true,
      created: createdCount,
      skipped: skippedCount,
      total: defaultRoles.length
    };

  } catch (error) {
    logger.error('Error seeding roles:', error);
    throw error;
  }
}

async function rollbackRoles() {
  try {
    logger.info('Rolling back role seeding...');

    const systemRoleNames = defaultRoles.filter(role => role.isSystem).map(role => role.name);
    
    const deletedRoles = await prisma.role.deleteMany({
      where: {
        name: { in: systemRoleNames },
        isSystem: true
      }
    });

    logger.info(`Rollback completed: ${deletedRoles.count} roles deleted`);
    return deletedRoles.count;

  } catch (error) {
    logger.error('Error rolling back roles:', error);
    throw error;
  }
}

// Export for use in main seed file
module.exports = {
  seedRoles,
  rollbackRoles,
  defaultRoles
};

// Run directly if called from command line
if (require.main === module) {
  seedRoles()
    .then((result) => {
      console.log('✅ Role seeding completed:', result);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Role seeding failed:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}