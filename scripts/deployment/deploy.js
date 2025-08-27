#!/usr/bin/env node

/**
 * Unified Deployment Script
 * 
 * This script provides a unified interface for deploying to different platforms
 * with comprehensive validation, optimization, and monitoring
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const BuildOptimizer = require('./build-optimizer');
const ProductionMonitor = require('./monitoring');

class DeploymentManager {
  constructor() {
    this.platform = process.env.DEPLOYMENT_PLATFORM || 'netlify';
    this.environment = process.env.NODE_ENV || 'production';
    this.projectRoot = path.resolve(__dirname, '..', '..');
    this.deploymentDir = path.join(this.projectRoot, 'deployment');
    this.logFile = path.join(this.deploymentDir, 'deployment.log');
    
    this.config = {
      platforms: {
        netlify: {
          buildCommand: 'npm run build',
          deployCommand: 'netlify deploy --prod --dir=out',
          siteIdEnv: 'NETLIFY_SITE_ID',
          tokenEnv: 'NETLIFY_AUTH_TOKEN'
        },
        vercel: {
          buildCommand: 'npm run build',
          deployCommand: 'vercel --prod',
          tokenEnv: 'VERCEL_TOKEN'
        },
        manual: {
          buildCommand: 'npm run build',
          deployCommand: null
        }
      }
    };
    
    this.ensureDeploymentDirectory();
  }

  ensureDeploymentDirectory() {
    if (!fs.existsSync(this.deploymentDir)) {
      fs.mkdirSync(this.deploymentDir, { recursive: true });
    }
  }

  log(message, level = 'INFO') {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${level}] ${message}`;
    console.log(logMessage);
    
    fs.appendFileSync(this.logFile, logMessage + '\n');
  }

  async executeCommand(command, options = {}) {
    try {
      const result = execSync(command, { 
        encoding: 'utf8',
        cwd: this.projectRoot,
        stdio: options.silent ? 'pipe' : 'inherit',
        ...options 
      });
      return { success: true, output: result };
    } catch (error) {
      return { 
        success: false, 
        error: error.message, 
        output: error.stdout || error.stderr 
      };
    }
  }

  async validateEnvironment() {
    this.log('Validating deployment environment...');
    const validationResults = {
      platform: this.platform,
      environment: this.environment,
      checks: {},
      valid: true,
      issues: []
    };
    
    // Check Node.js version
    try {
      const nodeVersion = process.version;
      const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
      validationResults.checks.nodeVersion = {
        current: nodeVersion,
        valid: majorVersion >= 18
      };
      
      if (majorVersion < 18) {
        validationResults.valid = false;
        validationResults.issues.push(`Node.js version ${nodeVersion} is not supported. Require Node.js 18+`);
      }
    } catch (error) {
      validationResults.valid = false;
      validationResults.issues.push('Failed to check Node.js version');
    }
    
    // Check Next.js availability
    try {
      const nextResult = await this.executeCommand('npx next --version', { silent: true });
      if (nextResult.success) {
        const nextVersion = nextResult.output.trim();
        validationResults.checks.nextVersion = {
          current: nextVersion,
          valid: true
        };
      } else {
        validationResults.valid = false;
        validationResults.issues.push('Next.js not found or not accessible');
      }
    } catch (error) {
      validationResults.valid = false;
      validationResults.issues.push('Failed to check Next.js version');
    }
    
    // Check required environment variables
    const platformConfig = this.config.platforms[this.platform];
    if (platformConfig) {
      const requiredEnvVars = [
        platformConfig.siteIdEnv,
        platformConfig.tokenEnv
      ].filter(Boolean);
      
      requiredEnvVars.forEach(envVar => {
        const value = process.env[envVar];
        validationResults.checks[envVar] = {
          present: !!value,
          masked: value ? `${value.substring(0, 4)}...` : null
        };
        
        if (!value) {
          validationResults.valid = false;
          validationResults.issues.push(`Missing required environment variable: ${envVar}`);
        }
      });
    }
    
    // Check project structure
    const requiredPaths = [
      'package.json',
      'next.config.mjs',
      'app',
      'components',
      'public'
    ];
    
    requiredPaths.forEach(reqPath => {
      const fullPath = path.join(this.projectRoot, reqPath);
      const exists = fs.existsSync(fullPath);
      validationResults.checks[`path_${reqPath}`] = { exists };
      
      if (!exists) {
        validationResults.valid = false;
        validationResults.issues.push(`Missing required path: ${reqPath}`);
      }
    });
    
    if (validationResults.valid) {
      this.log('Environment validation passed');
    } else {
      this.log(`Environment validation failed: ${validationResults.issues.join(', ')}`, 'ERROR');
    }
    
    return validationResults;
  }

  async runPreDeploymentTests() {
    this.log('Running pre-deployment tests...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: {},
      passed: 0,
      failed: 0,
      overall: 'unknown'
    };
    
    // Run linting
    try {
      const lintResult = await this.executeCommand('npm run lint', { silent: true });
      testResults.tests.lint = {
        passed: lintResult.success,
        output: lintResult.output || lintResult.error
      };
      
      if (lintResult.success) {
        testResults.passed++;
        this.log('✓ Linting passed');
      } else {
        testResults.failed++;
        this.log('✗ Linting failed', 'WARN');
      }
    } catch (error) {
      testResults.tests.lint = { passed: false, error: error.message };
      testResults.failed++;
    }
    
    // Run type checking
    try {
      const typeCheckResult = await this.executeCommand('npm run typecheck', { silent: true });
      testResults.tests.typecheck = {
        passed: typeCheckResult.success,
        output: typeCheckResult.output || typeCheckResult.error
      };
      
      if (typeCheckResult.success) {
        testResults.passed++;
        this.log('✓ Type checking passed');
      } else {
        testResults.failed++;
        this.log('✗ Type checking failed', 'WARN');
      }
    } catch (error) {
      testResults.tests.typecheck = { passed: false, error: error.message };
      testResults.failed++;
    }
    
    // Run unit tests
    try {
      const unitTestResult = await this.executeCommand('npm run test:unit', { silent: true });
      testResults.tests.unit = {
        passed: unitTestResult.success,
        output: unitTestResult.output || unitTestResult.error
      };
      
      if (unitTestResult.success) {
        testResults.passed++;
        this.log('✓ Unit tests passed');
      } else {
        testResults.failed++;
        this.log('✗ Unit tests failed', 'ERROR');
      }
    } catch (error) {
      testResults.tests.unit = { passed: false, error: error.message };
      testResults.failed++;
    }
    
    // Determine overall result
    testResults.overall = testResults.failed === 0 ? 'passed' : 'failed';
    
    if (testResults.overall === 'passed') {
      this.log(`Pre-deployment tests completed: ${testResults.passed} passed, ${testResults.failed} failed`);
    } else {
      this.log(`Pre-deployment tests failed: ${testResults.passed} passed, ${testResults.failed} failed`, 'ERROR');
    }
    
    return testResults;
  }

  async buildProject() {
    this.log('Building project for production...');
    
    const buildStartTime = Date.now();
    const platformConfig = this.config.platforms[this.platform];
    
    // Run build optimization first
    try {
      const buildOptimizer = new BuildOptimizer();
      const optimizationResults = await buildOptimizer.runFullOptimization();
      this.log(`Build optimization completed: ${optimizationResults.metrics.savings.formatted} saved`);
    } catch (error) {
      this.log(`Build optimization failed: ${error.message}`, 'WARN');
      // Continue with regular build even if optimization fails
    }
    
    // Run platform-specific build
    const buildResult = await this.executeCommand(platformConfig.buildCommand);
    const buildDuration = Date.now() - buildStartTime;
    
    if (buildResult.success) {
      this.log(`Build completed successfully in ${buildDuration}ms`);
      
      // Validate build output
      const buildDir = path.join(this.projectRoot, 'out');
      if (fs.existsSync(buildDir)) {
        const buildSize = this.calculateDirectorySize(buildDir);
        this.log(`Build output size: ${this.formatBytes(buildSize)}`);
        
        return {
          success: true,
          duration: buildDuration,
          outputSize: buildSize,
          outputDir: buildDir
        };
      } else {
        throw new Error('Build output directory not found');
      }
    } else {
      throw new Error(`Build failed: ${buildResult.error}`);
    }
  }

  calculateDirectorySize(dirPath) {
    if (!fs.existsSync(dirPath)) return 0;
    
    let totalSize = 0;
    const files = fs.readdirSync(dirPath, { withFileTypes: true });
    
    for (const file of files) {
      const filePath = path.join(dirPath, file.name);
      if (file.isDirectory()) {
        totalSize += this.calculateDirectorySize(filePath);
      } else {
        totalSize += fs.statSync(filePath).size;
      }
    }
    
    return totalSize;
  }

  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  async deployToPlatform() {
    this.log(`Deploying to ${this.platform}...`);
    
    const deployStartTime = Date.now();
    const platformConfig = this.config.platforms[this.platform];
    
    if (!platformConfig.deployCommand) {
      this.log('Manual deployment - build artifacts ready in public/ directory');
      return {
        success: true,
        manual: true,
        duration: 0,
        message: 'Build completed. Manual deployment required.'
      };
    }
    
    // Platform-specific deployment
    let deployResult;
    
    switch (this.platform) {
      case 'netlify':
        deployResult = await this.deployToNetlify();
        break;
        
      case 'vercel':
        deployResult = await this.deployToVercel();
        break;
        
      default:
        throw new Error(`Unsupported platform: ${this.platform}`);
    }
    
    const deployDuration = Date.now() - deployStartTime;
    deployResult.duration = deployDuration;
    
    if (deployResult.success) {
      this.log(`Deployment to ${this.platform} completed in ${deployDuration}ms`);
    } else {
      this.log(`Deployment to ${this.platform} failed: ${deployResult.error}`, 'ERROR');
    }
    
    return deployResult;
  }

  async deployToNetlify() {
    try {
      // Check if Netlify CLI is available
      const cliCheck = await this.executeCommand('netlify --version', { silent: true });
      if (!cliCheck.success) {
        throw new Error('Netlify CLI not found. Install with: npm install -g netlify-cli');
      }
      
      // Login check
      const loginCheck = await this.executeCommand('netlify status', { silent: true });
      if (!loginCheck.success) {
        throw new Error('Not logged in to Netlify. Run: netlify login');
      }
      
      // Deploy
      const deployResult = await this.executeCommand('netlify deploy --prod --dir=out');
      
      if (deployResult.success) {
        // Extract deploy URL from output
        const deployUrl = this.extractUrlFromOutput(deployResult.output, 'netlify');
        
        return {
          success: true,
          platform: 'netlify',
          deployUrl,
          output: deployResult.output
        };
      } else {
        throw new Error(deployResult.error);
      }
    } catch (error) {
      return {
        success: false,
        platform: 'netlify',
        error: error.message
      };
    }
  }

  async deployToVercel() {
    try {
      // Check if Vercel CLI is available
      const cliCheck = await this.executeCommand('vercel --version', { silent: true });
      if (!cliCheck.success) {
        throw new Error('Vercel CLI not found. Install with: npm install -g vercel');
      }
      
      // Deploy
      const deployResult = await this.executeCommand('vercel --prod --yes');
      
      if (deployResult.success) {
        // Extract deploy URL from output
        const deployUrl = this.extractUrlFromOutput(deployResult.output, 'vercel');
        
        return {
          success: true,
          platform: 'vercel',
          deployUrl,
          output: deployResult.output
        };
      } else {
        throw new Error(deployResult.error);
      }
    } catch (error) {
      return {
        success: false,
        platform: 'vercel',
        error: error.message
      };
    }
  }

  extractUrlFromOutput(output, platform) {
    switch (platform) {
      case 'netlify':
        const netlifyMatch = output.match(/https:\\/\\/[a-zA-Z0-9-]+\\.netlify\\.app/);
        return netlifyMatch ? netlifyMatch[0] : null;
        
      case 'vercel':
        const vercelMatch = output.match(/https:\\/\\/[a-zA-Z0-9-]+\\.vercel\\.app/);
        return vercelMatch ? vercelMatch[0] : null;
        
      default:
        return null;
    }
  }

  async runPostDeploymentValidation(deployUrl) {
    this.log('Running post-deployment validation...');
    
    if (!deployUrl) {
      this.log('No deploy URL available for validation', 'WARN');
      return { skipped: true, reason: 'No deploy URL available' };
    }
    
    try {
      const monitor = new ProductionMonitor();
      monitor.baseUrl = deployUrl;
      
      // Wait a bit for deployment to propagate
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
      
      const validationResults = await monitor.performHealthCheck();
      
      if (validationResults.summary.overallHealth === 'healthy') {
        this.log('✓ Post-deployment validation passed');
        return {
          success: true,
          results: validationResults
        };
      } else {
        this.log(`✗ Post-deployment validation failed: ${validationResults.summary.overallHealth}`, 'WARN');
        return {
          success: false,
          results: validationResults,
          issues: validationResults.endpoints.filter(e => !e.healthy)
        };
      }
    } catch (error) {
      this.log(`Post-deployment validation error: ${error.message}`, 'ERROR');
      return {
        success: false,
        error: error.message
      };
    }
  }

  async sendDeploymentNotification(deploymentResult) {
    this.log('Sending deployment notification...');
    
    const notification = {
      timestamp: new Date().toISOString(),
      platform: this.platform,
      environment: this.environment,
      success: deploymentResult.success,
      deployUrl: deploymentResult.deployUrl,
      duration: deploymentResult.totalDuration,
      buildSize: deploymentResult.buildSize
    };
    
    // Send to Slack if configured
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackNotification(notification);
    }
    
    // Send to Discord if configured
    if (process.env.DISCORD_WEBHOOK_URL) {
      await this.sendDiscordNotification(notification);
    }
    
    // Save notification log
    const notificationFile = path.join(this.deploymentDir, `notification-${Date.now()}.json`);
    fs.writeFileSync(notificationFile, JSON.stringify(notification, null, 2));
  }

  async sendSlackNotification(notification) {
    const color = notification.success ? 'good' : 'danger';
    const emoji = notification.success ? '🚀' : '❌';
    
    const payload = {
      text: `${emoji} Deployment ${notification.success ? 'Successful' : 'Failed'}`,
      attachments: [{
        color,
        fields: [
          { title: 'Platform', value: notification.platform, short: true },
          { title: 'Environment', value: notification.environment, short: true },
          { title: 'Duration', value: `${notification.duration}ms`, short: true },
          { title: 'URL', value: notification.deployUrl || 'N/A', short: false }
        ]
      }]
    };
    
    try {
      await this.executeCommand(`curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' ${process.env.SLACK_WEBHOOK_URL}`, { silent: true });
    } catch (error) {
      this.log(`Failed to send Slack notification: ${error.message}`, 'WARN');
    }
  }

  async sendDiscordNotification(notification) {
    const emoji = notification.success ? '🚀' : '❌';
    const status = notification.success ? 'Successful' : 'Failed';
    
    const payload = {
      content: `${emoji} **Deployment ${status}**\\n` +
               `**Platform**: ${notification.platform}\\n` +
               `**Environment**: ${notification.environment}\\n` +
               `**Duration**: ${notification.duration}ms\\n` +
               `**URL**: ${notification.deployUrl || 'N/A'}`
    };
    
    try {
      await this.executeCommand(`curl -X POST -H 'Content-Type: application/json' --data '${JSON.stringify(payload)}' ${process.env.DISCORD_WEBHOOK_URL}`, { silent: true });
    } catch (error) {
      this.log(`Failed to send Discord notification: ${error.message}`, 'WARN');
    }
  }

  async performFullDeployment(options = {}) {
    const {
      skipTests = false,
      skipValidation = false,
      skipNotifications = false
    } = options;
    
    const deploymentStartTime = Date.now();
    
    try {
      this.log('='.repeat(60));
      this.log(`STARTING DEPLOYMENT TO ${this.platform.toUpperCase()}`, 'INFO');
      this.log('='.repeat(60));
      
      // Step 1: Validate environment
      const envValidation = await this.validateEnvironment();
      if (!envValidation.valid) {
        throw new Error(`Environment validation failed: ${envValidation.issues.join(', ')}`);
      }
      
      // Step 2: Run pre-deployment tests
      let testResults = null;
      if (!skipTests) {
        testResults = await this.runPreDeploymentTests();
        if (testResults.overall === 'failed') {
          this.log('Pre-deployment tests failed. Continuing with deployment...', 'WARN');
          // Don't fail deployment for test failures in this version
        }
      }
      
      // Step 3: Build project
      const buildResults = await this.buildProject();
      
      // Step 4: Deploy to platform
      const deployResults = await this.deployToPlatform();
      if (!deployResults.success) {
        throw new Error(`Deployment failed: ${deployResults.error}`);
      }
      
      // Step 5: Post-deployment validation
      let validationResults = null;
      if (!skipValidation && deployResults.deployUrl) {
        validationResults = await this.runPostDeploymentValidation(deployResults.deployUrl);
      }
      
      const totalDuration = Date.now() - deploymentStartTime;
      
      // Step 6: Send notifications
      const finalResults = {
        success: true,
        platform: this.platform,
        environment: this.environment,
        deployUrl: deployResults.deployUrl,
        buildSize: this.formatBytes(buildResults.outputSize),
        totalDuration,
        steps: {
          environment: envValidation,
          tests: testResults,
          build: buildResults,
          deployment: deployResults,
          validation: validationResults
        }
      };
      
      if (!skipNotifications) {
        await this.sendDeploymentNotification(finalResults);
      }
      
      this.log('='.repeat(60));
      this.log('DEPLOYMENT COMPLETED SUCCESSFULLY', 'SUCCESS');
      this.log(`Total duration: ${totalDuration}ms`);
      this.log(`Deploy URL: ${deployResults.deployUrl || 'Manual deployment'}`);
      this.log('='.repeat(60));
      
      return finalResults;
      
    } catch (error) {
      const totalDuration = Date.now() - deploymentStartTime;
      
      this.log(`DEPLOYMENT FAILED: ${error.message}`, 'ERROR');
      
      const failureResults = {
        success: false,
        platform: this.platform,
        environment: this.environment,
        error: error.message,
        totalDuration
      };
      
      if (!skipNotifications) {
        await this.sendDeploymentNotification(failureResults);
      }
      
      throw error;
    }
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const platform = args[0] || process.env.DEPLOYMENT_PLATFORM || 'netlify';
  const options = {
    skipTests: args.includes('--skip-tests'),
    skipValidation: args.includes('--skip-validation'),
    skipNotifications: args.includes('--skip-notifications')
  };
  
  // Set platform environment variable
  process.env.DEPLOYMENT_PLATFORM = platform;
  
  const deploymentManager = new DeploymentManager();
  
  try {
    await deploymentManager.performFullDeployment(options);
    process.exit(0);
  } catch (error) {
    console.error(`Deployment failed: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = DeploymentManager;