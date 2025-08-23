const HugoIntegrationService = require('../services/hugoIntegrationService');
const path = require('path');

/**
 * Hugo Integration Middleware
 * Handles automatic Hugo rebuilds and notifications for content changes
 */
class HugoIntegrationMiddleware {
  constructor() {
    this.hugoIntegration = new HugoIntegrationService();
    this.initializeIntegration();
  }

  async initializeIntegration() {
    try {
      await this.hugoIntegration.initializeIntegration();
      
      // Set up event handlers
      this.hugoIntegration.on('buildSuccess', (result) => {
        console.log(`✅ Hugo build completed in ${result.buildTime}ms`);
      });

      this.hugoIntegration.on('buildError', (result) => {
        console.error(`❌ Hugo build failed:`, result.error);
      });

      this.hugoIntegration.on('fileChange', (change) => {
        console.log(`📝 File changed: ${change.path} (${change.type})`);
      });

      console.log('🚀 Hugo integration initialized');
      
    } catch (error) {
      console.error('❌ Failed to initialize Hugo integration:', error.message);
    }
  }

  /**
   * Middleware to trigger Hugo rebuild after content operations
   */
  triggerRebuild() {
    return async (req, res, next) => {
      // Store original send method
      const originalSend = res.send;
      
      res.send = async function(data) {
        // Call original send
        originalSend.call(this, data);
        
        // Check if operation was successful
        const isSuccess = res.statusCode >= 200 && res.statusCode < 300;
        const isContentOperation = req.path.includes('/content') || req.path.includes('/portfolio');
        
        if (isSuccess && isContentOperation && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
          try {
            // Trigger Hugo rebuild with appropriate options
            const isDraft = req.body?.draft === true || req.body?.frontmatter?.draft === true;
            const options = {
              draft: isDraft,
              minify: !isDraft,
              cleanDestination: true
            };

            // Trigger rebuild asynchronously
            setImmediate(async () => {
              try {
                const result = await req.app.locals.hugoIntegration.buildSite(options);
                if (result.success) {
                  console.log(`🔄 Auto-rebuild triggered for ${req.method} ${req.path}`);
                } else {
                  console.error(`🚫 Auto-rebuild failed:`, result.error);
                }
              } catch (error) {
                console.error(`🚫 Auto-rebuild error:`, error.message);
              }
            });
            
          } catch (error) {
            console.error('Hugo rebuild trigger error:', error.message);
          }
        }
      };
      
      next();
    };
  }

  /**
   * Middleware to validate front matter before content operations
   */
  validateFrontMatter() {
    return (req, res, next) => {
      if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body?.frontmatter) {
        const validation = this.hugoIntegration.validateFrontMatter(
          req.body.frontmatter, 
          req.body.path || req.params.path
        );

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid front matter',
            details: validation.errors,
            warnings: validation.warnings
          });
        }

        // Add validation info to request for logging
        req.frontMatterValidation = validation;
        
        if (validation.warnings.length > 0) {
          console.warn(`⚠️ Front matter warnings for ${req.body.path}:`, validation.warnings);
        }
      }
      
      next();
    };
  }

  /**
   * Middleware to inject Hugo integration status into responses
   */
  injectHugoStatus() {
    return (req, res, next) => {
      // Add Hugo status to app locals for templates
      req.app.locals.hugoStatus = this.hugoIntegration.getBuildStatus();
      req.app.locals.hugoIntegration = this.hugoIntegration;
      
      next();
    };
  }

  /**
   * Express route handlers for Hugo integration API
   */
  getRouteHandlers() {
    return {
      // Get build status
      getBuildStatus: (req, res) => {
        const status = this.hugoIntegration.getBuildStatus();
        res.json({ success: true, data: status });
      },

      // Trigger manual build
      triggerBuild: async (req, res) => {
        try {
          const options = req.body || {};
          const result = await this.hugoIntegration.buildSite(options);
          
          res.json({
            success: result.success,
            data: result,
            message: result.success ? 'Build completed successfully' : 'Build failed'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      },

      // Start development server
      startDevServer: async (req, res) => {
        try {
          const options = req.body || {};
          const result = await this.hugoIntegration.startDevelopmentServer(options);
          
          res.json({
            success: true,
            data: result,
            message: 'Development server started'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      },

      // Stop development server
      stopDevServer: async (req, res) => {
        try {
          const result = await this.hugoIntegration.stopDevelopmentServer();
          
          res.json({
            success: true,
            data: result,
            message: 'Development server stopped'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      },

      // Preview content
      previewContent: async (req, res) => {
        try {
          const { path: contentPath } = req.params;
          const options = req.body || {};
          
          const result = await this.hugoIntegration.previewContent(contentPath, options);
          
          res.json({
            success: result.success,
            data: result,
            message: result.success ? 'Preview ready' : 'Preview failed'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      },

      // Validate front matter
      validateFrontMatter: (req, res) => {
        try {
          const { frontMatter, path: contentPath } = req.body;
          
          if (!frontMatter) {
            return res.status(400).json({
              success: false,
              error: 'Front matter is required'
            });
          }

          const validation = this.hugoIntegration.validateFrontMatter(frontMatter, contentPath);
          
          res.json({
            success: true,
            data: validation,
            message: validation.valid ? 'Front matter is valid' : 'Front matter has issues'
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      },

      // Get health status
      getHealthStatus: async (req, res) => {
        try {
          const health = await this.hugoIntegration.getHealthStatus();
          
          const statusCode = health.status === 'healthy' ? 200 : 
                            health.status === 'degraded' ? 200 : 503;
          
          res.status(statusCode).json({
            success: health.status !== 'unhealthy',
            data: health
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message
          });
        }
      },

      // WebSocket endpoint for live updates
      handleWebSocket: (ws, req) => {
        // Set up WebSocket connection with Hugo integration
        const hugoIntegration = this.hugoIntegration;
        
        // Send initial status
        ws.send(JSON.stringify({
          type: 'connected',
          data: hugoIntegration.getBuildStatus()
        }));

        // Forward Hugo events to WebSocket client
        const forwardEvent = (eventType) => (data) => {
          if (ws.readyState === ws.OPEN) {
            ws.send(JSON.stringify({
              type: eventType,
              data,
              timestamp: new Date()
            }));
          }
        };

        hugoIntegration.on('buildStart', forwardEvent('buildStart'));
        hugoIntegration.on('buildSuccess', forwardEvent('buildSuccess'));
        hugoIntegration.on('buildError', forwardEvent('buildError'));
        hugoIntegration.on('fileChange', forwardEvent('fileChange'));
        hugoIntegration.on('rebuild', forwardEvent('rebuild'));
        hugoIntegration.on('serverStarted', forwardEvent('serverStarted'));
        hugoIntegration.on('serverStopped', forwardEvent('serverStopped'));

        // Handle client messages
        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message);
            
            switch (data.type) {
              case 'requestStatus':
                ws.send(JSON.stringify({
                  type: 'status',
                  data: hugoIntegration.getBuildStatus()
                }));
                break;

              case 'triggerBuild':
                const buildResult = await hugoIntegration.buildSite(data.options);
                ws.send(JSON.stringify({
                  type: 'buildResult',
                  data: buildResult
                }));
                break;

              default:
                ws.send(JSON.stringify({
                  type: 'error',
                  data: { error: `Unknown message type: ${data.type}` }
                }));
            }
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { error: 'Invalid message format' }
            }));
          }
        });

        // Clean up on disconnect
        ws.on('close', () => {
          hugoIntegration.removeAllListeners();
        });

        ws.on('error', (error) => {
          console.error('WebSocket error:', error);
        });
      }
    };
  }

  /**
   * Clean up resources
   */
  async cleanup() {
    await this.hugoIntegration.cleanup();
  }
}

module.exports = HugoIntegrationMiddleware;