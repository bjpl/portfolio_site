'use strict';

const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const userId = uuidv4();
    const adminRoleId = uuidv4();
    const editorRoleId = uuidv4();
    const viewerRoleId = uuidv4();

    // Create users
    await queryInterface.bulkInsert('users', [
      {
        id: userId,
        username: 'admin',
        email: 'admin@portfolio.com',
        password_hash: await bcrypt.hash('admin123', 12),
        first_name: 'Portfolio',
        last_name: 'Administrator',
        display_name: 'Portfolio Admin',
        bio: 'System administrator for the portfolio platform',
        status: 'active',
        email_verified: true,
        timezone: 'UTC',
        language: 'en',
        preferences: JSON.stringify({
          theme: 'light',
          notifications: {
            email: true,
            browser: true
          }
        }),
        metadata: JSON.stringify({
          created_by_system: true
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: uuidv4(),
        username: 'demo_user',
        email: 'demo@portfolio.com',
        password_hash: await bcrypt.hash('demo123', 12),
        first_name: 'Demo',
        last_name: 'User',
        display_name: 'Demo User',
        bio: 'Demonstration user account for testing purposes',
        status: 'active',
        email_verified: true,
        timezone: 'UTC',
        language: 'en',
        preferences: JSON.stringify({
          theme: 'auto',
          notifications: {
            email: false,
            browser: true
          }
        }),
        metadata: JSON.stringify({
          demo_account: true
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Create roles
    await queryInterface.bulkInsert('roles', [
      {
        id: adminRoleId,
        name: 'admin',
        display_name: 'Administrator',
        description: 'Full system access with all permissions',
        permissions: JSON.stringify({
          users: { create: true, read: true, update: true, delete: true },
          roles: { create: true, read: true, update: true, delete: true },
          projects: { create: true, read: true, update: true, delete: true, publish: true },
          content: { create: true, read: true, update: true, delete: true, publish: true },
          media: { upload: true, manage: true, delete: true },
          workflows: { manage: true, approve: true, override: true },
          system: { configure: true, backup: true, monitor: true }
        }),
        is_system_role: true,
        hierarchy_level: 100,
        status: 'active',
        metadata: JSON.stringify({
          system_role: true,
          description: 'Built-in administrator role'
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: editorRoleId,
        name: 'editor',
        display_name: 'Content Editor',
        description: 'Can create and edit content, manage projects',
        permissions: JSON.stringify({
          users: { read: true },
          projects: { create: true, read: true, update: true, delete: false, publish: false },
          content: { create: true, read: true, update: true, delete: false, publish: false },
          media: { upload: true, manage: false, delete: false },
          workflows: { participate: true, approve: false }
        }),
        is_system_role: true,
        hierarchy_level: 50,
        status: 'active',
        metadata: JSON.stringify({
          system_role: true,
          description: 'Built-in content editor role'
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
      {
        id: viewerRoleId,
        name: 'viewer',
        display_name: 'Viewer',
        description: 'Read-only access to content',
        permissions: JSON.stringify({
          users: { read: false },
          projects: { read: true },
          content: { read: true },
          media: { view: true },
          workflows: { view: true }
        }),
        is_system_role: true,
        hierarchy_level: 10,
        status: 'active',
        metadata: JSON.stringify({
          system_role: true,
          description: 'Built-in viewer role'
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);

    // Assign admin role to admin user
    await queryInterface.bulkInsert('user_roles', [
      {
        id: uuidv4(),
        user_id: userId,
        role_id: adminRoleId,
        assigned_at: new Date(),
        status: 'active',
        metadata: JSON.stringify({
          assigned_by_system: true
        }),
        created_at: new Date(),
        updated_at: new Date(),
      },
    ]);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('user_roles', null, {});
    await queryInterface.bulkDelete('roles', null, {});
    await queryInterface.bulkDelete('users', null, {});
  }
};