#!/usr/bin/env node

/**
 * Production Rollback Script
 * 
 * This script handles automated rollback procedures for production deployments
 * It can rollback to previous versions on Netlify, Vercel, and other platforms
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

class RollbackManager {
  constructor() {
    this.platform = process.env.DEPLOYMENT_PLATFORM || 'netlify';
    this.siteId = process.env.NETLIFY_SITE_ID || process.env.VERCEL_PROJECT_ID;
    this.authToken = process.env.NETLIFY_AUTH_TOKEN || process.env.VERCEL_TOKEN;
    this.rollbackDir = path.join(__dirname, '..', '..', 'rollback');
    this.logFile = path.join(this.rollbackDir, 'rollback.log');
    
    this.ensureRollbackDirectory();
  }

  ensureRollbackDirectory() {
    if (!fs.existsSync(this.rollbackDir)) {
      fs.mkdirSync(this.rollbackDir, { recursive: true });
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

  async getDeploymentHistory() {
    this.log('Fetching deployment history...');
    
    if (this.platform === 'netlify') {
      return this.getNetlifyDeployments();
    } else if (this.platform === 'vercel') {
      return this.getVercelDeployments();
    } else {
      throw new Error(`Unsupported platform: ${this.platform}`);
    }
  }

  async getNetlifyDeployments() {
    const command = `curl -H "Authorization: Bearer ${this.authToken}" https://api.netlify.com/api/v1/sites/${this.siteId}/deploys`;
    const result = await this.executeCommand(command, { silent: true });
    
    if (!result.success) {
      throw new Error(`Failed to fetch Netlify deployments: ${result.error}`);
    }

    const deployments = JSON.parse(result.output);
    return deployments.filter(deploy => 
      deploy.state === 'ready' && 
      deploy.context === 'production'
    ).slice(0, 10); // Get last 10 successful deployments
  }

  async getVercelDeployments() {
    const command = `curl -H "Authorization: Bearer ${this.authToken}" https://api.vercel.com/v6/deployments?projectId=${this.siteId}&limit=10`;
    const result = await this.executeCommand(command, { silent: true });
    
    if (!result.success) {
      throw new Error(`Failed to fetch Vercel deployments: ${result.error}`);
    }

    const data = JSON.parse(result.output);
    return data.deployments.filter(deploy => 
      deploy.state === 'READY' && 
      deploy.target === 'production'
    );
  }

  async getCurrentDeployment() {
    this.log('Getting current deployment information...');
    const deployments = await this.getDeploymentHistory();
    return deployments[0]; // Most recent deployment
  }

  async getPreviousDeployment(skipCount = 1) {
    this.log(`Getting previous deployment (skipping ${skipCount} versions)...`);
    const deployments = await this.getDeploymentHistory();
    
    if (deployments.length <= skipCount) {
      throw new Error('No previous deployment found to rollback to');
    }
    
    return deployments[skipCount];
  }

  async createBackup() {
    this.log('Creating backup before rollback...');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(this.rollbackDir, `backup-${timestamp}.json`);
    
    const current = await this.getCurrentDeployment();
    const backupData = {
      timestamp,
      platform: this.platform,
      deployment: current,
      environment: process.env.NODE_ENV,
      rollbackReason: process.env.ROLLBACK_REASON || 'Manual rollback'
    };
    
    fs.writeFileSync(backupPath, JSON.stringify(backupData, null, 2));
    this.log(`Backup created: ${backupPath}`);
    return backupPath;
  }

  async rollbackNetlify(targetDeployId) {
    this.log(`Rolling back Netlify site to deployment: ${targetDeployId}`);
    
    const command = `curl -X POST -H "Authorization: Bearer ${this.authToken}" https://api.netlify.com/api/v1/sites/${this.siteId}/deploys/${targetDeployId}/restore`;
    const result = await this.executeCommand(command, { silent: true });
    
    if (!result.success) {
      throw new Error(`Netlify rollback failed: ${result.error}`);
    }
    
    const response = JSON.parse(result.output);
    this.log(`Netlify rollback initiated: ${response.id}`);
    return response;
  }

  async rollbackVercel(targetDeployId) {
    this.log(`Rolling back Vercel project to deployment: ${targetDeployId}`);
    
    // For Vercel, we promote a previous deployment to production
    const command = `curl -X PATCH -H "Authorization: Bearer ${this.authToken}" -H "Content-Type: application/json" -d '{"target": "production"}' https://api.vercel.com/v13/deployments/${targetDeployId}`;
    const result = await this.executeCommand(command, { silent: true });
    
    if (!result.success) {
      throw new Error(`Vercel rollback failed: ${result.error}`);
    }
    
    this.log(`Vercel rollback completed`);
    return JSON.parse(result.output);
  }

  async waitForRollback(deploymentId, maxWaitTime = 300000) { // 5 minutes
    this.log('Waiting for rollback to complete...');
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const deployments = await this.getDeploymentHistory();
      const current = deployments[0];
      
      if (this.platform === 'netlify' && current.id === deploymentId) {
        this.log('Rollback completed successfully');
        return true;
      } else if (this.platform === 'vercel' && current.uid === deploymentId) {
        this.log('Rollback completed successfully');
        return true;
      }
      
      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
    }
    
    throw new Error('Rollback timed out');
  }

  async validateRollback(expectedUrl) {
    this.log(`Validating rollback at ${expectedUrl}...`);
    
    try {
      const command = `curl -f -s -o /dev/null -w "%{http_code}" ${expectedUrl}`;
      const result = await this.executeCommand(command, { silent: true });
      
      if (result.success && result.output.trim() === '200') {
        this.log('Rollback validation successful - site is accessible');
        return true;
      } else {
        throw new Error(`Site returned status: ${result.output}`);
      }
    } catch (error) {
      this.log(`Rollback validation failed: ${error.message}`, 'ERROR');
      return false;
    }
  }

  async sendNotification(rollbackInfo) {
    this.log('Sending rollback notification...');
    
    const message = {
      text: `🔄 Production Rollback Completed`,
      details: {
        platform: this.platform,
        timestamp: new Date().toISOString(),
        previousVersion: rollbackInfo.from?.id || 'unknown',
        rolledBackTo: rollbackInfo.to?.id || 'unknown',
        reason: process.env.ROLLBACK_REASON || 'Manual rollback',
        site: process.env.SITE_URL
      }
    };
    
    // Send to Slack if webhook URL is provided
    if (process.env.SLACK_WEBHOOK_URL) {
      await this.sendSlackNotification(message);
    }
    
    // Send to Discord if webhook URL is provided
    if (process.env.DISCORD_WEBHOOK_URL) {
      await this.sendDiscordNotification(message);
    }
    
    // Log to file
    fs.writeFileSync(
      path.join(this.rollbackDir, `notification-${Date.now()}.json`),
      JSON.stringify(message, null, 2)
    );
  }

  async sendSlackNotification(message) {
    const payload = {
      text: message.text,
      attachments: [{
        color: 'warning',
        fields: Object.entries(message.details).map(([key, value]) => ({
          title: key,
          value: value,
          short: true
        }))
      }]
    };
    
    const command = `curl -X POST -H 'Content-type: application/json' --data '${JSON.stringify(payload)}' ${process.env.SLACK_WEBHOOK_URL}`;
    await this.executeCommand(command, { silent: true });
  }

  async sendDiscordNotification(message) {
    const payload = {
      content: `${message.text}\\n\\`\\`\\`json\\n${JSON.stringify(message.details, null, 2)}\\n\\`\\`\\``
    };
    
    const command = `curl -X POST -H 'Content-Type: application/json' --data '${JSON.stringify(payload)}' ${process.env.DISCORD_WEBHOOK_URL}`;
    await this.executeCommand(command, { silent: true });
  }

  async performRollback(options = {}) {
    const { skipVersions = 1, reason = 'Manual rollback', validate = true } = options;
    
    try {
      this.log('='.repeat(50));
      this.log('STARTING PRODUCTION ROLLBACK', 'WARN');
      this.log('='.repeat(50));
      
      // Set rollback reason in environment
      process.env.ROLLBACK_REASON = reason;
      
      // Create backup
      await this.createBackup();
      
      // Get current and target deployments
      const current = await this.getCurrentDeployment();
      const target = await this.getPreviousDeployment(skipVersions);
      
      this.log(`Current deployment: ${current.id || current.uid} (${current.created_at || current.createdAt})`);
      this.log(`Target deployment: ${target.id || target.uid} (${target.created_at || target.createdAt})`);
      
      // Perform platform-specific rollback
      let rollbackResult;
      if (this.platform === 'netlify') {
        rollbackResult = await this.rollbackNetlify(target.id);
        await this.waitForRollback(target.id);
      } else if (this.platform === 'vercel') {
        rollbackResult = await this.rollbackVercel(target.uid);
        await this.waitForRollback(target.uid);
      }
      
      // Validate rollback if requested
      if (validate && process.env.SITE_URL) {
        const isValid = await this.validateRollback(process.env.SITE_URL);
        if (!isValid) {
          throw new Error('Rollback validation failed');
        }
      }
      
      // Send notifications
      await this.sendNotification({
        from: current,
        to: target,
        result: rollbackResult
      });
      
      this.log('='.repeat(50));
      this.log('ROLLBACK COMPLETED SUCCESSFULLY', 'SUCCESS');
      this.log('='.repeat(50));
      
      return {
        success: true,
        from: current,
        to: target,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      this.log(`ROLLBACK FAILED: ${error.message}`, 'ERROR');
      
      // Send failure notification
      if (process.env.SLACK_WEBHOOK_URL || process.env.DISCORD_WEBHOOK_URL) {
        await this.sendNotification({
          error: error.message,
          timestamp: new Date().toISOString()
        });
      }
      
      throw error;
    }
  }

  async listAvailableRollbacks() {
    this.log('Fetching available rollback targets...');
    const deployments = await this.getDeploymentHistory();
    
    console.log('\\nAvailable rollback targets:');
    deployments.forEach((deploy, index) => {
      const id = deploy.id || deploy.uid;
      const date = deploy.created_at || deploy.createdAt;
      const status = index === 0 ? '(CURRENT)' : `(${index} versions back)`;
      console.log(`${index}: ${id} - ${date} ${status}`);
    });
    
    return deployments;
  }
}

// CLI Interface
async function main() {
  const rollbackManager = new RollbackManager();
  const args = process.argv.slice(2);
  const command = args[0];
  
  try {
    switch (command) {
      case 'list':
        await rollbackManager.listAvailableRollbacks();
        break;
        
      case 'rollback':
        const skipVersions = parseInt(args[1]) || 1;
        const reason = args[2] || 'Manual rollback via CLI';
        await rollbackManager.performRollback({ 
          skipVersions, 
          reason,
          validate: !args.includes('--no-validate')
        });
        break;
        
      case 'validate':
        const url = args[1] || process.env.SITE_URL;
        const isValid = await rollbackManager.validateRollback(url);
        process.exit(isValid ? 0 : 1);
        break;
        
      default:
        console.log('Usage:');
        console.log('  node rollback.js list                           - List available rollback targets');
        console.log('  node rollback.js rollback [versions] [reason]   - Perform rollback');
        console.log('  node rollback.js validate [url]                 - Validate site accessibility');
        console.log('');
        console.log('Examples:');
        console.log('  node rollback.js rollback 1 "Performance issue"');
        console.log('  node rollback.js rollback 2 "Security vulnerability"');
        console.log('  node rollback.js validate https://your-site.com');
        break;
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = RollbackManager;