/**
 * Mock API Handlers
 * Comprehensive set of API endpoints that mirror the real backend
 * Handles authentication, content management, file operations, and more
 */

class MockAPIHandlers {
  static db = null;
  static auth = null;

  static async initialize() {
    if (!MockAPIHandlers.db) {
      MockAPIHandlers.db = await MockDatabase.initialize();
      MockAPIHandlers.auth = await MockAuth.initialize();
    }
  }

  static getHandlers() {
    return {
      // Authentication endpoints
      '/auth/register': {
        post: MockAPIHandlers.registerUser
      },
      '/auth/login': {
        post: MockAPIHandlers.loginUser
      },
      '/auth/logout': {
        post: MockAPIHandlers.logoutUser
      },
      '/auth/refresh': {
        post: MockAPIHandlers.refreshToken
      },
      '/auth/me': {
        get: MockAPIHandlers.getCurrentUser
      },
      '/auth/change-password': {
        post: MockAPIHandlers.changePassword
      },
      '/auth/forgot-password': {
        post: MockAPIHandlers.forgotPassword
      },
      '/auth/reset-password': {
        post: MockAPIHandlers.resetPassword
      },
      '/auth/sessions': {
        get: MockAPIHandlers.getActiveSessions
      },
      '/auth/sessions/:sessionId': {
        delete: MockAPIHandlers.revokeSession
      },

      // Content management
      '/content': {
        get: MockAPIHandlers.listContent,
        post: MockAPIHandlers.createContent
      },
      '/content/:path': {
        get: MockAPIHandlers.getContent,
        put: MockAPIHandlers.updateContent,
        delete: MockAPIHandlers.deleteContent
      },
      '/content/search': {
        get: MockAPIHandlers.searchContent
      },

      // File management
      '/files': {
        get: MockAPIHandlers.listFiles
      },
      '/files/:path': {
        get: MockAPIHandlers.getFile,
        delete: MockAPIHandlers.deleteFile
      },
      '/files/upload': {
        post: MockAPIHandlers.uploadFile
      },
      '/files/folder': {
        post: MockAPIHandlers.createFolder
      },

      // Media management
      '/media': {
        get: MockAPIHandlers.listMedia,
        post: MockAPIHandlers.uploadMedia
      },
      '/media/:id': {
        get: MockAPIHandlers.getMedia,
        put: MockAPIHandlers.updateMedia,
        delete: MockAPIHandlers.deleteMedia
      },

      // Portfolio data
      '/portfolio/projects': {
        get: MockAPIHandlers.listProjects,
        post: MockAPIHandlers.createProject
      },
      '/portfolio/projects/:id': {
        get: MockAPIHandlers.getProject,
        put: MockAPIHandlers.updateProject,
        delete: MockAPIHandlers.deleteProject
      },
      '/portfolio/skills': {
        get: MockAPIHandlers.listSkills,
        post: MockAPIHandlers.createSkill
      },
      '/portfolio/skills/:id': {
        get: MockAPIHandlers.getSkill,
        put: MockAPIHandlers.updateSkill,
        delete: MockAPIHandlers.deleteSkill
      },
      '/portfolio/experiences': {
        get: MockAPIHandlers.listExperiences,
        post: MockAPIHandlers.createExperience
      },
      '/portfolio/experiences/:id': {
        get: MockAPIHandlers.getExperience,
        put: MockAPIHandlers.updateExperience,
        delete: MockAPIHandlers.deleteExperience
      },

      // Dashboard
      '/dashboard/stats': {
        get: MockAPIHandlers.getDashboardStats
      },
      '/dashboard/recent': {
        get: MockAPIHandlers.getRecentActivity
      },

      // Settings
      '/settings': {
        get: MockAPIHandlers.getSettings,
        put: MockAPIHandlers.updateSettings
      },

      // Users management
      '/users': {
        get: MockAPIHandlers.listUsers,
        post: MockAPIHandlers.createUser
      },
      '/users/:id': {
        get: MockAPIHandlers.getUser,
        put: MockAPIHandlers.updateUser,
        delete: MockAPIHandlers.deleteUser
      },

      // Analytics
      '/analytics': {
        get: MockAPIHandlers.getAnalytics
      },
      '/analytics/track': {
        post: MockAPIHandlers.trackEvent
      },

      // Logs
      '/logs': {
        get: MockAPIHandlers.getLogs
      },

      // Health check
      '/health': {
        get: MockAPIHandlers.healthCheck
      },

      // Build and deploy
      '/build/start': {
        post: MockAPIHandlers.startBuild
      },
      '/build/status': {
        get: MockAPIHandlers.getBuildStatus
      },
      '/deploy': {
        post: MockAPIHandlers.deploySite
      }
    };
  }

  // Helper function to require authentication
  static async requireAuth(request) {
    const authHeader = request.headers.Authorization || request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new Error('Authentication required');
    }

    const token = authHeader.split(' ')[1];
    const user = await MockAPIHandlers.auth.verifyAccessToken(token);
    return user;
  }

  // Authentication handlers
  static async registerUser(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const result = await MockAPIHandlers.auth.register(req.body);
      return { status: 201, data: result };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  static async loginUser(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const { email, password } = req.body;
      const deviceInfo = {
        userAgent: req.headers['user-agent'] || 'Unknown',
        ip: '127.0.0.1' // Mock IP
      };
      
      const result = await MockAPIHandlers.auth.login(email, password, deviceInfo);
      return { status: 200, data: result };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async logoutUser(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      await MockAPIHandlers.auth.logout(req.body.refreshToken);
      return { status: 200, data: { message: 'Logout successful' } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async refreshToken(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const { refreshToken } = req.body;
      const result = await MockAPIHandlers.auth.refreshAccessToken(refreshToken);
      return { status: 200, data: result };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async getCurrentUser(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const user = await MockAPIHandlers.requireAuth(req);
      return { status: 200, data: { user } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async changePassword(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const user = await MockAPIHandlers.requireAuth(req);
      const { currentPassword, newPassword } = req.body;
      
      await MockAPIHandlers.auth.changePassword(user.id, currentPassword, newPassword);
      return { status: 200, data: { message: 'Password changed successfully' } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  static async forgotPassword(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const { email } = req.body;
      const result = await MockAPIHandlers.auth.requestPasswordReset(email);
      return { status: 200, data: result };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  static async resetPassword(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const { token, newPassword } = req.body;
      const result = await MockAPIHandlers.auth.resetPassword(token, newPassword);
      return { status: 200, data: result };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  static async getActiveSessions(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const user = await MockAPIHandlers.requireAuth(req);
      const sessions = await MockAPIHandlers.auth.getActiveSessions(user.id);
      return { status: 200, data: { sessions } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async revokeSession(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const user = await MockAPIHandlers.requireAuth(req);
      await MockAPIHandlers.auth.revokeSession(user.id, req.params.sessionId);
      return { status: 200, data: { message: 'Session revoked successfully' } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  // Content management handlers
  static async listContent(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const { type, status, limit = 50, offset = 0 } = req.query;
      const where = {};
      
      if (type) where.type = type;
      if (status) where.status = status;
      
      const content = await MockAPIHandlers.db.findAll('content', {
        where,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy: ['updatedAt', 'DESC']
      });
      
      const total = await MockAPIHandlers.db.count('content', where);
      
      return {
        status: 200,
        data: {
          content,
          pagination: {
            total,
            limit: parseInt(limit),
            offset: parseInt(offset)
          }
        }
      };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async getContent(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const content = await MockAPIHandlers.db.findOne('content', 'path', req.params.path);
      if (!content) {
        return { status: 404, error: 'Content not found' };
      }
      
      return { status: 200, data: { content } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async createContent(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const user = await MockAPIHandlers.requireAuth(req);
      
      const contentData = {
        ...req.body,
        authorId: user.id,
        status: req.body.status || 'draft'
      };
      
      const content = await MockAPIHandlers.db.create('content', contentData);
      return { status: 201, data: { content } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  static async updateContent(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const user = await MockAPIHandlers.requireAuth(req);
      
      const content = await MockAPIHandlers.db.findOne('content', 'path', req.params.path);
      if (!content) {
        return { status: 404, error: 'Content not found' };
      }
      
      const updated = await MockAPIHandlers.db.update('content', content.id, {
        ...req.body,
        lastModifiedBy: user.id
      });
      
      return { status: 200, data: { content: updated } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  static async deleteContent(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const content = await MockAPIHandlers.db.findOne('content', 'path', req.params.path);
      if (!content) {
        return { status: 404, error: 'Content not found' };
      }
      
      await MockAPIHandlers.db.delete('content', content.id);
      return { status: 200, data: { message: 'Content deleted successfully' } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  static async searchContent(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const { q: query, type, limit = 20 } = req.query;
      
      if (!query) {
        return { status: 400, error: 'Search query is required' };
      }
      
      const where = {
        title: { like: query }
      };
      
      if (type) where.type = type;
      
      const results = await MockAPIHandlers.db.findAll('content', {
        where,
        limit: parseInt(limit)
      });
      
      return { status: 200, data: { results } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  // File management handlers
  static async listFiles(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const files = await MockAPIHandlers.db.findAll('media', {
        orderBy: ['uploadedAt', 'DESC']
      });
      
      return { status: 200, data: { files } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async uploadFile(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const user = await MockAPIHandlers.requireAuth(req);
      
      // Mock file upload
      const mockFile = {
        filename: `uploaded-${Date.now()}.jpg`,
        size: Math.floor(Math.random() * 1000000),
        type: 'image/jpeg',
        url: `/uploads/uploaded-${Date.now()}.jpg`,
        uploadedBy: user.id
      };
      
      const file = await MockAPIHandlers.db.create('media', mockFile);
      return { status: 201, data: { file } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  static async deleteFile(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const file = await MockAPIHandlers.db.findOne('media', 'filename', req.params.path);
      if (!file) {
        return { status: 404, error: 'File not found' };
      }
      
      await MockAPIHandlers.db.delete('media', file.id);
      return { status: 200, data: { message: 'File deleted successfully' } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  // Portfolio data handlers
  static async listProjects(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const projects = await MockAPIHandlers.db.findAll('projects', {
        orderBy: ['createdAt', 'DESC']
      });
      
      return { status: 200, data: { projects } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async createProject(req) {
    await MockAPIHandlers.initialize();
    
    try {
      const user = await MockAPIHandlers.requireAuth(req);
      
      const project = await MockAPIHandlers.db.create('projects', {
        ...req.body,
        createdBy: user.id
      });
      
      return { status: 201, data: { project } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  // Dashboard handlers
  static async getDashboardStats(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const stats = {
        totalContent: await MockAPIHandlers.db.count('content'),
        totalProjects: await MockAPIHandlers.db.count('projects'),
        totalMedia: await MockAPIHandlers.db.count('media'),
        totalUsers: await MockAPIHandlers.db.count('users'),
        recentActivity: await MockAPIHandlers.db.findAll('logs', {
          limit: 10,
          orderBy: ['timestamp', 'DESC']
        })
      };
      
      return { status: 200, data: { stats } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  // Settings handlers
  static async getSettings(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const settings = await MockAPIHandlers.db.findAll('settings');
      const settingsObj = {};
      
      settings.forEach(setting => {
        settingsObj[setting.key] = setting.value;
      });
      
      return { status: 200, data: { settings: settingsObj } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async updateSettings(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      const updates = req.body;
      
      for (const [key, value] of Object.entries(updates)) {
        const existing = await MockAPIHandlers.db.findOne('settings', 'key', key);
        
        if (existing) {
          await MockAPIHandlers.db.update('settings', existing.id, { value });
        } else {
          await MockAPIHandlers.db.create('settings', {
            key,
            value,
            type: typeof value
          });
        }
      }
      
      return { status: 200, data: { message: 'Settings updated successfully' } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  // Analytics handlers
  static async getAnalytics(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      // Mock analytics data
      const analytics = {
        pageViews: Math.floor(Math.random() * 10000),
        uniqueVisitors: Math.floor(Math.random() * 5000),
        bounceRate: (Math.random() * 100).toFixed(2),
        avgSessionDuration: Math.floor(Math.random() * 300),
        topPages: [
          { path: '/', views: Math.floor(Math.random() * 1000) },
          { path: '/about', views: Math.floor(Math.random() * 800) },
          { path: '/projects', views: Math.floor(Math.random() * 600) }
        ]
      };
      
      return { status: 200, data: { analytics } };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async trackEvent(req) {
    await MockAPIHandlers.initialize();
    
    try {
      // Log the event
      await MockAPIHandlers.db.create('logs', {
        level: 'info',
        message: 'Analytics event tracked',
        data: JSON.stringify(req.body),
        timestamp: new Date().toISOString()
      });
      
      return { status: 200, data: { message: 'Event tracked successfully' } };
    } catch (error) {
      return { status: 400, error: error.message };
    }
  }

  // Health check
  static async healthCheck(req) {
    await MockAPIHandlers.initialize();
    
    return {
      status: 200,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        database: MockAPIHandlers.db ? 'connected' : 'disconnected',
        uptime: Date.now() // Mock uptime
      }
    };
  }

  // Build and deploy handlers
  static async startBuild(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      // Mock build process
      setTimeout(() => {
        console.log('[MockAPI] Mock build completed');
      }, 2000);
      
      return {
        status: 200,
        data: {
          buildId: `build-${Date.now()}`,
          status: 'started',
          message: 'Build process initiated'
        }
      };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  static async getBuildStatus(req) {
    await MockAPIHandlers.initialize();
    
    try {
      await MockAPIHandlers.requireAuth(req);
      
      return {
        status: 200,
        data: {
          status: 'completed',
          lastBuild: new Date().toISOString(),
          duration: '45s'
        }
      };
    } catch (error) {
      return { status: 401, error: error.message };
    }
  }

  // Additional handlers can be added here for complete API coverage
  
  // Default handlers for missing implementations
  static async getSkill(req) { return { status: 200, data: { skill: { id: req.params.id, name: 'Mock Skill' } } }; }
  static async updateSkill(req) { return { status: 200, data: { skill: { id: req.params.id, ...req.body } } }; }
  static async deleteSkill(req) { return { status: 200, data: { message: 'Skill deleted' } }; }
  static async listSkills(req) { return { status: 200, data: { skills: [] } }; }
  static async createSkill(req) { return { status: 201, data: { skill: { id: Date.now(), ...req.body } } }; }
  
  static async listExperiences(req) { return { status: 200, data: { experiences: [] } }; }
  static async createExperience(req) { return { status: 201, data: { experience: { id: Date.now(), ...req.body } } }; }
  static async getExperience(req) { return { status: 200, data: { experience: { id: req.params.id } } }; }
  static async updateExperience(req) { return { status: 200, data: { experience: { id: req.params.id, ...req.body } } }; }
  static async deleteExperience(req) { return { status: 200, data: { message: 'Experience deleted' } }; }
  
  static async listMedia(req) { return { status: 200, data: { media: [] } }; }
  static async uploadMedia(req) { return { status: 201, data: { media: { id: Date.now(), url: '/mock-upload.jpg' } } }; }
  static async getMedia(req) { return { status: 200, data: { media: { id: req.params.id } } }; }
  static async updateMedia(req) { return { status: 200, data: { media: { id: req.params.id, ...req.body } } }; }
  static async deleteMedia(req) { return { status: 200, data: { message: 'Media deleted' } }; }
  
  static async listUsers(req) { return { status: 200, data: { users: [] } }; }
  static async createUser(req) { return { status: 201, data: { user: { id: Date.now(), ...req.body } } }; }
  static async getUser(req) { return { status: 200, data: { user: { id: req.params.id } } }; }
  static async updateUser(req) { return { status: 200, data: { user: { id: req.params.id, ...req.body } } }; }
  static async deleteUser(req) { return { status: 200, data: { message: 'User deleted' } }; }
  
  static async getProject(req) { return { status: 200, data: { project: { id: req.params.id } } }; }
  static async updateProject(req) { return { status: 200, data: { project: { id: req.params.id, ...req.body } } }; }
  static async deleteProject(req) { return { status: 200, data: { message: 'Project deleted' } }; }
  
  static async getFile(req) { return { status: 200, data: { file: { path: req.params.path } } }; }
  static async createFolder(req) { return { status: 201, data: { folder: { name: req.body.name } } }; }
  
  static async getRecentActivity(req) { return { status: 200, data: { activity: [] } }; }
  static async getLogs(req) { return { status: 200, data: { logs: [] } }; }
  static async deploySite(req) { return { status: 200, data: { message: 'Deployment started' } }; }
}

// Export for use in service worker
if (typeof self !== 'undefined') {
  self.MockAPIHandlers = MockAPIHandlers;
}