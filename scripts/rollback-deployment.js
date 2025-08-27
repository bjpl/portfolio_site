#!/usr/bin/env node

/**
 * Deployment Rollback Script
 * Automatically rolls back to the previous successful deployment on Netlify
 */

const axios = require('axios');
const chalk = require('chalk');

class DeploymentRollback {
  constructor() {
    this.netlifyAuthToken = process.env.NETLIFY_AUTH_TOKEN;
    this.netlifySiteId = process.env.NETLIFY_SITE_ID;
    this.deployedUrl = process.env.DEPLOYED_URL;
    this.forceRollback = process.env.FORCE_ROLLBACK === 'true';
    
    if (!this.netlifyAuthToken || !this.netlifySiteId) {
      throw new Error('Missing required environment variables: NETLIFY_AUTH_TOKEN, NETLIFY_SITE_ID');
    }
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red,
      progress: chalk.cyan
    };
    
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${colors[type]('●')} ${message}`);
  }

  async makeNetlifyRequest(endpoint, method = 'GET', data = null) {
    const config = {
      method,
      url: `https://api.netlify.com/api/v1${endpoint}`,
      headers: {
        'Authorization': `Bearer ${this.netlifyAuthToken}`,
        'Content-Type': 'application/json'
      }
    };

    if (data) {
      config.data = data;
    }

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      throw new Error(`Netlify API error: ${error.response?.data?.message || error.message}`);
    }
  }

  async getCurrentDeployment() {
    this.log('Getting current deployment status...', 'progress');
    
    const site = await this.makeNetlifyRequest(`/sites/${this.netlifySiteId}`);
    const currentDeploy = await this.makeNetlifyRequest(`/sites/${this.netlifySiteId}/deploys/${site.published_deploy.id}`);
    
    this.log(`Current deployment: ${currentDeploy.id}`, 'info');
    this.log(`Status: ${currentDeploy.state}`, 'info');
    this.log(`Created: ${currentDeploy.created_at}`, 'info');
    
    return currentDeploy;
  }

  async getDeploymentHistory() {
    this.log('Fetching deployment history...', 'progress');
    
    const deploys = await this.makeNetlifyRequest(`/sites/${this.netlifySiteId}/deploys?per_page=50`);
    
    // Filter for successful, published deployments
    const successfulDeploys = deploys.filter(deploy => 
      deploy.state === 'ready' && 
      deploy.published_at &&
      deploy.context === 'production'
    );

    this.log(`Found ${successfulDeploys.length} successful deployments`, 'info');
    
    return successfulDeploys;
  }

  async findPreviousDeployment(currentDeployId) {
    const deployments = await this.getDeploymentHistory();
    
    // Find the current deployment index
    const currentIndex = deployments.findIndex(deploy => deploy.id === currentDeployId);
    
    if (currentIndex === -1) {
      throw new Error('Current deployment not found in history');
    }

    if (currentIndex === deployments.length - 1) {
      throw new Error('No previous deployment available for rollback');
    }

    const previousDeploy = deployments[currentIndex + 1];
    
    this.log(`Previous deployment found: ${previousDeploy.id}`, 'success');
    this.log(`Created: ${previousDeploy.created_at}`, 'info');
    this.log(`Commit: ${previousDeploy.commit_ref}`, 'info');
    
    return previousDeploy;
  }

  async checkCurrentDeploymentHealth() {
    if (!this.deployedUrl) {
      this.log('No deployed URL provided, skipping health check', 'warning');
      return false;
    }

    this.log(`Checking current deployment health: ${this.deployedUrl}`, 'progress');
    
    try {
      const response = await axios.get(this.deployedUrl, { 
        timeout: 10000,
        validateStatus: status => status < 500
      });
      
      if (response.status === 200) {
        this.log('Current deployment is healthy', 'success');
        return true;
      } else {
        this.log(`Current deployment returned status: ${response.status}`, 'warning');
        return false;
      }
    } catch (error) {
      this.log(`Health check failed: ${error.message}`, 'error');
      return false;
    }
  }

  async performRollback(previousDeployId) {
    this.log(`Initiating rollback to deployment: ${previousDeployId}`, 'progress');
    
    try {
      await this.makeNetlifyRequest(
        `/sites/${this.netlifySiteId}/deploys/${previousDeployId}/restore`,
        'POST'
      );
      
      this.log('Rollback initiated successfully', 'success');
      
      // Wait for rollback to complete
      await this.waitForRollbackCompletion(previousDeployId);
      
    } catch (error) {
      throw new Error(`Rollback failed: ${error.message}`);
    }
  }

  async waitForRollbackCompletion(targetDeployId) {
    this.log('Waiting for rollback to complete...', 'progress');
    
    const maxAttempts = 30;
    const delay = 10000; // 10 seconds
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const site = await this.makeNetlifyRequest(`/sites/${this.netlifySiteId}`);
        
        if (site.published_deploy.id === targetDeployId) {
          this.log('Rollback completed successfully', 'success');
          return true;
        }
        
        this.log(`Attempt ${attempt}/${maxAttempts} - waiting for rollback...`, 'progress');
        await this.sleep(delay);
        
      } catch (error) {
        this.log(`Error checking rollback status: ${error.message}`, 'warning');
      }
    }
    
    throw new Error('Rollback did not complete within expected time');
  }

  async verifyRollback() {
    if (!this.deployedUrl) {
      this.log('No deployed URL provided, skipping verification', 'warning');
      return true;
    }

    this.log('Verifying rollback success...', 'progress');
    
    // Wait a bit for DNS/CDN propagation
    await this.sleep(30000);
    
    const maxAttempts = 5;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios.get(this.deployedUrl, { 
          timeout: 15000,
          headers: {
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
          }
        });
        
        if (response.status === 200) {
          this.log('Rollback verification successful - site is accessible', 'success');
          return true;
        } else {
          this.log(`Verification attempt ${attempt}: received status ${response.status}`, 'warning');
        }
      } catch (error) {
        this.log(`Verification attempt ${attempt} failed: ${error.message}`, 'warning');
      }
      
      if (attempt < maxAttempts) {
        await this.sleep(10000);
      }
    }
    
    this.log('Rollback verification failed - manual investigation required', 'error');
    return false;
  }

  async createIncidentReport(currentDeployId, previousDeployId, reason) {
    const report = {
      timestamp: new Date().toISOString(),
      type: 'deployment_rollback',
      reason: reason,
      environment: 'production',
      site_id: this.netlifySiteId,
      rollback: {
        from_deployment: currentDeployId,
        to_deployment: previousDeployId,
        triggered_by: process.env.GITHUB_ACTOR || 'automated_system',
        commit_sha: process.env.GITHUB_SHA || 'unknown'
      },
      actions_taken: [
        'Detected deployment failure',
        'Retrieved deployment history',
        'Identified previous stable deployment',
        'Performed automatic rollback',
        'Verified rollback success'
      ]
    };

    this.log('Incident Report:', 'info');
    console.log(JSON.stringify(report, null, 2));
    
    // Optionally save to file or send to monitoring system
    try {
      const fs = require('fs');
      const reportPath = `incident-report-${Date.now()}.json`;
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
      this.log(`Incident report saved to: ${reportPath}`, 'info');
    } catch (error) {
      this.log(`Could not save incident report: ${error.message}`, 'warning');
    }
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async execute() {
    try {
      this.log('Starting deployment rollback process...', 'info');
      
      // Get current deployment
      const currentDeployment = await this.getCurrentDeployment();
      
      // Check if rollback is needed
      if (!this.forceRollback) {
        const isHealthy = await this.checkCurrentDeploymentHealth();
        if (isHealthy) {
          this.log('Current deployment is healthy, no rollback needed', 'success');
          return;
        }
      }
      
      this.log('Rollback is required', 'warning');
      
      // Find previous deployment
      const previousDeployment = await this.findPreviousDeployment(currentDeployment.id);
      
      // Perform rollback
      await this.performRollback(previousDeployment.id);
      
      // Verify rollback
      const rollbackSuccessful = await this.verifyRollback();
      
      // Create incident report
      await this.createIncidentReport(
        currentDeployment.id,
        previousDeployment.id,
        this.forceRollback ? 'Manual rollback requested' : 'Deployment health check failed'
      );
      
      if (rollbackSuccessful) {
        this.log('Rollback completed successfully', 'success');
        this.log(`Site restored to deployment: ${previousDeployment.id}`, 'success');
        process.exit(0);
      } else {
        this.log('Rollback completed but verification failed', 'error');
        process.exit(1);
      }
      
    } catch (error) {
      this.log(`Rollback failed: ${error.message}`, 'error');
      process.exit(1);
    }
  }

  // Monitor deployment and trigger rollback if needed
  async monitorAndRollback() {
    const maxRetries = 5;
    const retryDelay = 60000; // 1 minute
    
    this.log('Starting deployment monitoring...', 'info');
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      this.log(`Health check attempt ${attempt}/${maxRetries}`, 'progress');
      
      const isHealthy = await this.checkCurrentDeploymentHealth();
      
      if (isHealthy) {
        this.log('Deployment is healthy, monitoring complete', 'success');
        return;
      }
      
      if (attempt === maxRetries) {
        this.log('Max health check attempts reached, initiating rollback', 'warning');
        this.forceRollback = true;
        await this.execute();
        return;
      }
      
      this.log(`Waiting ${retryDelay / 1000} seconds before next attempt...`, 'progress');
      await this.sleep(retryDelay);
    }
  }
}

// CLI execution
if (require.main === module) {
  const rollback = new DeploymentRollback();
  
  if (process.env.MONITOR_DEPLOYMENT === 'true') {
    rollback.monitorAndRollback().catch((error) => {
      console.error(chalk.red('❌ Monitoring failed:'), error.message);
      process.exit(1);
    });
  } else {
    rollback.execute().catch((error) => {
      console.error(chalk.red('❌ Rollback failed:'), error.message);
      process.exit(1);
    });
  }
}

module.exports = DeploymentRollback;