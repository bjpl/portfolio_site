const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const EventEmitter = require('events');
const WebSocket = require('ws');
const HugoService = require('./hugoService');

const execPromise = util.promisify(exec);

/**
 * Enhanced Hugo Integration Service
 * Provides comprehensive Hugo integration with live reload, build monitoring,
 * and content management integration
 */
class HugoIntegrationService extends EventEmitter {
  constructor() {
    super();
    this.projectRoot = path.join(__dirname, '../../../..');
    this.contentPath = path.join(this.projectRoot, 'content');
    this.publicPath = path.join(this.projectRoot, 'public');
    this.hugoService = new HugoService();
    
    // Build management
    this.buildQueue = new Set();
    this.isBuilding = false;
    this.buildStatus = 'idle'; // idle, building, success, error
    this.lastBuildResult = null;
    
    // Server management
    this.hugoProcess = null;
    this.serverPort = 1313;
    this.wsServer = null;
    
    // File watching
    this.watchedFiles = new Map();
    this.buildTimer = null;
    
    // Performance tracking
    this.buildMetrics = {
      totalBuilds: 0,
      successfulBuilds: 0,
      failedBuilds: 0,
      averageBuildTime: 0,
      lastBuildDuration: 0
    };
    
    this.initializeIntegration();
  }

  /**
   * Initialize Hugo integration
   */
  async initializeIntegration() {
    try {
      // Verify Hugo installation
      const envInfo = await this.hugoService.getEnvironmentInfo();
      if (!envInfo.success) {
        throw new Error('Hugo not found or not properly installed');
      }

      // Initialize file watchers
      this.initializeFileWatchers();
      
      // Setup WebSocket server for live updates
      this.setupWebSocketServer();
      
      this.emit('integrationReady', envInfo);
      
    } catch (error) {
      this.emit('integrationError', { error: error.message });
      throw error;
    }
  }

  /**
   * Start Hugo development server with enhanced monitoring
   */
  async startDevelopmentServer(options = {}) {
    const {
      port = 1313,
      bind = '127.0.0.1',
      livereload = true,
      watch = true,
      drafts = true,
      navigateToChanged = true
    } = options;

    try {
      // Check if port is available
      await this.checkPortAvailability(port);
      
      // Stop existing server
      if (this.hugoProcess) {
        await this.stopDevelopmentServer();
      }

      const args = [
        'server',
        `--bind=${bind}`,
        `--port=${port}`,
        watch ? '--watch' : '--watch=false'
      ];

      if (drafts) args.push('-D');
      if (!livereload) args.push('--disableLiveReload');
      if (navigateToChanged) args.push('--navigateToChanged');
      
      // Add template metrics for debugging
      args.push('--templateMetrics');

      return new Promise((resolve, reject) => {
        this.hugoProcess = spawn('hugo', args, {
          cwd: this.projectRoot,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let serverReady = false;
        let output = '';

        // Handle stdout
        this.hugoProcess.stdout.on('data', (data) => {
          const chunk = data.toString();
          output += chunk;
          
          // Check if server is ready
          if (!serverReady && chunk.includes('Web Server is available at')) {
            serverReady = true;
            this.serverPort = port;
            
            const serverInfo = {
              success: true,
              port,
              bind,
              url: `http://${bind}:${port}`,
              pid: this.hugoProcess.pid
            };
            
            this.emit('serverStarted', serverInfo);
            this.notifyClients({ type: 'serverStarted', data: serverInfo });
            resolve(serverInfo);
          }

          // Detect rebuilds
          if (chunk.includes('Built in')) {
            const match = chunk.match(/Built in (\\d+) ms/);
            const buildTime = match ? parseInt(match[1]) : 0;
            
            const rebuildInfo = {
              timestamp: new Date(),
              buildTime,
              output: chunk
            };
            
            this.emit('rebuild', rebuildInfo);
            this.notifyClients({ type: 'rebuild', data: rebuildInfo });
            this.updateBuildMetrics(true, buildTime);
          }
          
          // Detect errors
          if (chunk.includes('ERROR') || chunk.includes('Error')) {
            this.emit('serverError', { error: chunk, timestamp: new Date() });
            this.notifyClients({ type: 'error', data: { error: chunk } });
          }
          
          this.emit('serverOutput', chunk);
        });

        // Handle stderr
        this.hugoProcess.stderr.on('data', (data) => {
          const error = data.toString();
          this.emit('serverError', { error, timestamp: new Date() });
          
          if (!serverReady && error.includes('bind: Only one usage')) {
            reject(new Error(`Port ${port} is already in use`));
          }
        });

        // Handle process exit
        this.hugoProcess.on('close', (code) => {
          this.hugoProcess = null;
          const exitInfo = { code, timestamp: new Date() };
          
          this.emit('serverStopped', exitInfo);
          this.notifyClients({ type: 'serverStopped', data: exitInfo });
          
          if (!serverReady) {
            reject(new Error(`Hugo server failed to start (exit code: ${code})`));
          }
        });

        this.hugoProcess.on('error', (error) => {
          this.hugoProcess = null;
          this.emit('serverError', { error: error.message });
          
          if (!serverReady) {
            reject(error);
          }
        });

        // Timeout protection
        setTimeout(() => {
          if (!serverReady) {
            this.stopDevelopmentServer();
            reject(new Error('Hugo server startup timeout (30s)'));
          }
        }, 30000);
      });
      
    } catch (error) {
      throw new Error(`Failed to start Hugo server: ${error.message}`);
    }
  }

  /**
   * Stop Hugo development server
   */
  async stopDevelopmentServer() {
    if (!this.hugoProcess) {
      return { success: true, message: 'Server not running' };
    }

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        if (this.hugoProcess) {
          this.hugoProcess.kill('SIGKILL');
        }
      }, 5000);

      this.hugoProcess.once('close', () => {
        clearTimeout(timeout);
        this.hugoProcess = null;
        resolve({ success: true, message: 'Server stopped' });
      });

      this.hugoProcess.kill('SIGTERM');
    });
  }

  /**
   * Build site with comprehensive monitoring
   */
  async buildSite(options = {}) {
    const {
      draft = false,
      minify = true,
      cleanDestination = true,
      enableGitInfo = false,
      verbose = false
    } = options;

    // Prevent concurrent builds
    if (this.isBuilding) {
      return this.queueBuild(options);
    }

    this.isBuilding = true;
    this.buildStatus = 'building';
    
    const startTime = Date.now();
    const buildId = `build-${Date.now()}`;
    
    this.emit('buildStart', { 
      buildId, 
      timestamp: new Date(), 
      options 
    });
    
    this.notifyClients({ 
      type: 'buildStart', 
      data: { buildId, timestamp: new Date(), options } 
    });

    try {
      // Build command
      let command = 'hugo';
      const flags = [];
      
      if (draft) flags.push('-D');
      if (minify) flags.push('--minify');
      if (cleanDestination) flags.push('--cleanDestinationDir');
      if (enableGitInfo) flags.push('--enableGitInfo');
      if (verbose) flags.push('--verbose');
      
      command += flags.length > 0 ? ' ' + flags.join(' ') : '';

      // Execute build
      const { stdout, stderr } = await execPromise(command, {
        cwd: this.projectRoot,
        timeout: 120000 // 2 minutes
      });

      const buildTime = Date.now() - startTime;
      
      const result = {
        success: true,
        buildId,
        buildTime,
        output: stdout,
        warnings: stderr ? stderr.split('\\n').filter(line => line.trim()) : [],
        timestamp: new Date(),
        options
      };

      this.lastBuildResult = result;
      this.buildStatus = 'success';
      
      this.emit('buildSuccess', result);
      this.notifyClients({ type: 'buildSuccess', data: result });
      
      this.updateBuildMetrics(true, buildTime);
      
      return result;

    } catch (error) {
      const buildTime = Date.now() - startTime;
      
      const result = {
        success: false,
        buildId,
        buildTime,
        error: error.message,
        stderr: error.stderr,
        timestamp: new Date(),
        options
      };

      this.lastBuildResult = result;
      this.buildStatus = 'error';
      
      this.emit('buildError', result);
      this.notifyClients({ type: 'buildError', data: result });
      
      this.updateBuildMetrics(false, buildTime);
      
      return result;

    } finally {
      this.isBuilding = false;
      this.processBuildQueue();
    }
  }

  /**
   * Handle content changes with smart rebuilding
   */
  async onContentChange(filePath, changeType = 'change') {
    const relativePath = path.relative(this.projectRoot, filePath);
    
    this.emit('fileChange', {
      type: changeType,
      path: relativePath,
      fullPath: filePath,
      timestamp: new Date()
    });

    // Smart rebuild logic
    if (this.shouldTriggerRebuild(relativePath)) {
      await this.triggerSmartRebuild(relativePath);
    }
  }

  /**
   * Determine if file change should trigger rebuild
   */
  shouldTriggerRebuild(relativePath) {
    // Content files
    if (relativePath.startsWith('content/') && relativePath.endsWith('.md')) {
      return true;
    }
    
    // Layout files
    if (relativePath.startsWith('layouts/')) {
      return true;
    }
    
    // Static assets
    if (relativePath.startsWith('static/')) {
      return true;
    }
    
    // Config files
    if (relativePath.startsWith('config/') || relativePath.includes('hugo.')) {
      return true;
    }
    
    // Assets
    if (relativePath.startsWith('assets/')) {
      return true;
    }
    
    return false;
  }

  /**
   * Smart rebuild with debouncing
   */
  async triggerSmartRebuild(triggerPath, debounceMs = 500) {
    // Clear existing timer
    if (this.buildTimer) {
      clearTimeout(this.buildTimer);
    }
    
    // Set new timer
    this.buildTimer = setTimeout(async () => {
      try {
        if (this.hugoProcess) {
          // Hugo server handles rebuilds automatically
          this.emit('contentChange', { 
            path: triggerPath, 
            timestamp: new Date(),
            autoRebuild: true 
          });
        } else {
          // Manual build for production
          const options = { 
            draft: false, 
            minify: true,
            cleanDestination: true 
          };
          
          await this.buildSite(options);
        }
      } catch (error) {
        this.emit('rebuildError', { 
          error: error.message, 
          triggerPath,
          timestamp: new Date()
        });
      }
    }, debounceMs);
  }

  /**
   * Validate Hugo front matter
   */
  validateFrontMatter(frontMatter, contentPath = '') {
    const errors = [];
    const warnings = [];

    // Required fields validation
    if (!frontMatter.title || typeof frontMatter.title !== 'string' || frontMatter.title.trim().length === 0) {
      errors.push('Title is required and must be a non-empty string');
    }

    // Date validation
    if (frontMatter.date) {
      const date = new Date(frontMatter.date);
      if (isNaN(date.getTime())) {
        errors.push('Invalid date format. Use YYYY-MM-DD or ISO format');
      }
      
      // Future date warning
      if (date > new Date()) {
        warnings.push('Date is in the future - content may not be published');
      }
    } else {
      warnings.push('No date specified - current date will be used');
    }

    // Draft validation
    if (frontMatter.draft !== undefined && typeof frontMatter.draft !== 'boolean') {
      errors.push('Draft field must be boolean (true or false)');
    }

    // URL/slug validation
    if (frontMatter.slug && !/^[a-z0-9-]+$/.test(frontMatter.slug)) {
      errors.push('Slug must contain only lowercase letters, numbers, and hyphens');
    }

    // Tags validation
    if (frontMatter.tags) {
      if (!Array.isArray(frontMatter.tags)) {
        errors.push('Tags must be an array');
      } else {
        frontMatter.tags.forEach((tag, index) => {
          if (typeof tag !== 'string') {
            errors.push(`Tag at index ${index} must be a string`);
          }
        });
      }
    }

    // Categories validation
    if (frontMatter.categories) {
      if (!Array.isArray(frontMatter.categories)) {
        errors.push('Categories must be an array');
      } else {
        frontMatter.categories.forEach((category, index) => {
          if (typeof category !== 'string') {
            errors.push(`Category at index ${index} must be a string`);
          }
        });
      }
    }

    // Weight validation
    if (frontMatter.weight !== undefined && (!Number.isInteger(frontMatter.weight) || frontMatter.weight < 0)) {
      errors.push('Weight must be a non-negative integer');
    }

    // Featured image validation
    if (frontMatter.image && typeof frontMatter.image !== 'string') {
      errors.push('Featured image must be a string (path to image)');
    }

    // Description validation
    if (frontMatter.description && typeof frontMatter.description !== 'string') {
      warnings.push('Description should be a string');
    }

    // Multilingual validation
    if (contentPath.includes('/es/') && frontMatter.language && frontMatter.language !== 'es') {
      warnings.push('Content is in Spanish directory but language is not set to "es"');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      score: Math.max(0, 100 - (errors.length * 20) - (warnings.length * 5))
    };
  }

  /**
   * Preview content before publishing
   */
  async previewContent(contentPath, options = {}) {
    const { 
      buildDrafts = true,
      openInBrowser = false 
    } = options;

    try {
      // Ensure development server is running
      if (!this.hugoProcess) {
        await this.startDevelopmentServer({ 
          port: this.serverPort + 1, // Use different port for preview
          drafts: buildDrafts 
        });
      }

      const previewUrl = `http://127.0.0.1:${this.serverPort}/${contentPath.replace('.md', '/')}`;
      
      if (openInBrowser) {
        const open = require('open');
        await open(previewUrl);
      }

      return {
        success: true,
        previewUrl,
        serverRunning: !!this.hugoProcess
      };

    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Get comprehensive build status
   */
  getBuildStatus() {
    return {
      status: this.buildStatus,
      isBuilding: this.isBuilding,
      lastBuild: this.lastBuildResult,
      metrics: this.buildMetrics,
      server: {
        running: !!this.hugoProcess,
        port: this.serverPort,
        pid: this.hugoProcess?.pid
      },
      queueSize: this.buildQueue.size
    };
  }

  /**
   * Initialize file watchers
   */
  initializeFileWatchers() {
    try {
      const chokidar = require('chokidar');
      
      const watchPaths = [
        path.join(this.contentPath, '**/*.md'),
        path.join(this.projectRoot, 'layouts/**/*.html'),
        path.join(this.projectRoot, 'static/**/*'),
        path.join(this.projectRoot, 'assets/**/*'),
        path.join(this.projectRoot, 'config/**/*'),
        path.join(this.projectRoot, 'data/**/*')
      ];

      const watcher = chokidar.watch(watchPaths, {
        ignored: /(^|[\\/\\\\])\\../,
        persistent: true,
        ignoreInitial: true,
        awaitWriteFinish: {
          stabilityThreshold: 100,
          pollInterval: 50
        }
      });

      watcher
        .on('add', (filePath) => this.onContentChange(filePath, 'add'))
        .on('change', (filePath) => this.onContentChange(filePath, 'change'))
        .on('unlink', (filePath) => this.onContentChange(filePath, 'delete'));

      this.fileWatcher = watcher;
      
    } catch (error) {
      console.warn('File watcher unavailable:', error.message);
    }
  }

  /**
   * Setup WebSocket server for live updates
   */
  setupWebSocketServer(port = 3001) {
    try {
      this.wsServer = new WebSocket.Server({ 
        port,
        verifyClient: (info) => {
          // Add origin checking for security if needed
          return true;
        }
      });

      this.wsServer.on('connection', (ws, req) => {
        // Send current status on connection
        ws.send(JSON.stringify({
          type: 'status',
          data: this.getBuildStatus()
        }));

        // Handle client messages
        ws.on('message', async (message) => {
          try {
            const data = JSON.parse(message);
            await this.handleClientMessage(ws, data);
          } catch (error) {
            ws.send(JSON.stringify({
              type: 'error',
              data: { error: 'Invalid message format' }
            }));
          }
        });

        ws.on('error', (error) => {
          console.error('WebSocket client error:', error);
        });
      });

      this.wsServer.on('error', (error) => {
        console.error('WebSocket server error:', error);
      });

    } catch (error) {
      console.warn('WebSocket server unavailable:', error.message);
    }
  }

  /**
   * Handle WebSocket client messages
   */
  async handleClientMessage(ws, message) {
    const { type, data } = message;

    switch (type) {
      case 'requestStatus':
        ws.send(JSON.stringify({
          type: 'status',
          data: this.getBuildStatus()
        }));
        break;

      case 'requestBuild':
        const result = await this.buildSite(data?.options || {});
        ws.send(JSON.stringify({
          type: 'buildResult',
          data: result
        }));
        break;

      case 'startServer':
        try {
          const serverInfo = await this.startDevelopmentServer(data?.options || {});
          ws.send(JSON.stringify({
            type: 'serverStarted',
            data: serverInfo
          }));
        } catch (error) {
          ws.send(JSON.stringify({
            type: 'error',
            data: { error: error.message }
          }));
        }
        break;

      case 'stopServer':
        const stopResult = await this.stopDevelopmentServer();
        ws.send(JSON.stringify({
          type: 'serverStopped',
          data: stopResult
        }));
        break;

      default:
        ws.send(JSON.stringify({
          type: 'error',
          data: { error: `Unknown message type: ${type}` }
        }));
    }
  }

  /**
   * Notify all WebSocket clients
   */
  notifyClients(message) {
    if (this.wsServer) {
      this.wsServer.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          try {
            client.send(JSON.stringify(message));
          } catch (error) {
            console.error('Failed to send WebSocket message:', error);
          }
        }
      });
    }
  }

  /**
   * Queue build for later execution
   */
  async queueBuild(options) {
    return new Promise((resolve) => {
      this.buildQueue.add({ options, resolve });
    });
  }

  /**
   * Process queued builds
   */
  async processBuildQueue() {
    if (this.buildQueue.size === 0) return;
    
    const next = this.buildQueue.values().next().value;
    this.buildQueue.delete(next);
    
    const result = await this.buildSite(next.options);
    next.resolve(result);
  }

  /**
   * Update build metrics
   */
  updateBuildMetrics(success, buildTime) {
    this.buildMetrics.totalBuilds++;
    this.buildMetrics.lastBuildDuration = buildTime;
    
    if (success) {
      this.buildMetrics.successfulBuilds++;
    } else {
      this.buildMetrics.failedBuilds++;
    }
    
    // Calculate average build time
    this.buildMetrics.averageBuildTime = Math.round(
      (this.buildMetrics.averageBuildTime * (this.buildMetrics.totalBuilds - 1) + buildTime) / 
      this.buildMetrics.totalBuilds
    );
  }

  /**
   * Check if port is available
   */
  async checkPortAvailability(port) {
    const net = require('net');
    
    return new Promise((resolve, reject) => {
      const server = net.createServer();
      
      server.listen(port, () => {
        server.close(() => resolve(true));
      });
      
      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          reject(new Error(`Port ${port} is already in use`));
        } else {
          reject(err);
        }
      });
    });
  }

  /**
   * Clean up all resources
   */
  async cleanup() {
    // Stop Hugo server
    await this.stopDevelopmentServer();
    
    // Close WebSocket server
    if (this.wsServer) {
      this.wsServer.close();
      this.wsServer = null;
    }
    
    // Stop file watcher
    if (this.fileWatcher) {
      this.fileWatcher.close();
      this.fileWatcher = null;
    }
    
    // Clear timers
    if (this.buildTimer) {
      clearTimeout(this.buildTimer);
      this.buildTimer = null;
    }
    
    this.removeAllListeners();
  }

  /**
   * Get integration health status
   */
  async getHealthStatus() {
    const health = {
      status: 'healthy',
      checks: {},
      timestamp: new Date()
    };

    try {
      // Check Hugo installation
      const envInfo = await this.hugoService.getEnvironmentInfo();
      health.checks.hugo = envInfo.success ? 'ok' : 'error';
      
      // Check content directory
      try {
        await fs.access(this.contentPath);
        health.checks.contentDirectory = 'ok';
      } catch {
        health.checks.contentDirectory = 'error';
        health.status = 'unhealthy';
      }
      
      // Check build status
      health.checks.buildSystem = this.buildStatus === 'error' ? 'warning' : 'ok';
      
      // Check server status
      health.checks.devServer = this.hugoProcess ? 'running' : 'stopped';
      
      // Check WebSocket
      health.checks.websocket = this.wsServer ? 'ok' : 'warning';
      
      // Overall status
      const hasErrors = Object.values(health.checks).some(status => status === 'error');
      if (hasErrors) {
        health.status = 'unhealthy';
      } else if (Object.values(health.checks).some(status => status === 'warning')) {
        health.status = 'degraded';
      }
      
    } catch (error) {
      health.status = 'unhealthy';
      health.error = error.message;
    }

    return health;
  }
}

// Global cleanup handler
process.on('SIGINT', async () => {
  const instances = HugoIntegrationService._instances || [];
  await Promise.all(instances.map(instance => instance.cleanup()));
  process.exit(0);
});

module.exports = HugoIntegrationService;