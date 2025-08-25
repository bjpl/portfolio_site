#!/usr/bin/env node

/**
 * Build Error Handler for Hugo + Netlify
 * Provides robust error handling, recovery mechanisms, and detailed reporting
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const chalk = require('chalk');

class BuildErrorHandler {
  constructor() {
    this.errors = [];
    this.warnings = [];
    this.recoveryAttempts = [];
    this.buildContext = {
      environment: process.env.HUGO_ENV || 'development',
      nodeVersion: process.version,
      platform: process.platform,
      timestamp: new Date().toISOString()
    };
    
    this.recoveryStrategies = [
      'clearCache',
      'resetDependencies',
      'fallbackBuild',
      'emergencyBuild'
    ];
  }

  async handleBuildProcess(buildCommand) {
    this.log('Starting build process with error handling...', 'info');
    
    try {
      // Pre-build validation
      await this.validateBuildEnvironment();
      
      // Execute build with monitoring
      const result = await this.executeBuildWithMonitoring(buildCommand);
      
      if (result.success) {
        this.log('Build completed successfully', 'success');
        await this.generateSuccessReport();
        return result;
      } else {
        throw new Error(`Build failed: ${result.error}`);
      }
      
    } catch (error) {
      this.log(`Build failed: ${error.message}`, 'error');
      
      // Record the error
      this.recordError(error, 'build_failure');
      
      // Attempt recovery
      const recoveryResult = await this.attemptRecovery(buildCommand);
      
      if (recoveryResult.success) {
        this.log('Build recovered successfully', 'success');
        await this.generateRecoveryReport();
        return recoveryResult;
      } else {
        await this.generateFailureReport(error);
        throw error;
      }
    }
  }

  async validateBuildEnvironment() {
    this.log('Validating build environment...', 'info');
    
    const validations = [
      { name: 'Hugo Installation', check: () => this.checkHugoInstallation() },
      { name: 'Node.js Version', check: () => this.checkNodeVersion() },
      { name: 'Dependencies', check: () => this.checkDependencies() },
      { name: 'Configuration Files', check: () => this.checkConfigFiles() },
      { name: 'Content Directory', check: () => this.checkContentDirectory() },
      { name: 'Disk Space', check: () => this.checkDiskSpace() },
      { name: 'Memory Available', check: () => this.checkMemory() }
    ];

    const results = [];
    
    for (const validation of validations) {
      try {
        const result = await validation.check();
        results.push({ name: validation.name, status: 'pass', result });
        this.log(`✓ ${validation.name}`, 'success');
      } catch (error) {
        results.push({ name: validation.name, status: 'fail', error: error.message });
        this.recordWarning(`Validation failed: ${validation.name} - ${error.message}`);
        this.log(`✗ ${validation.name}: ${error.message}`, 'warning');
      }
    }
    
    const failures = results.filter(r => r.status === 'fail');
    if (failures.length > 0) {
      this.log(`${failures.length} validation(s) failed, build may be unstable`, 'warning');
    } else {
      this.log('All validations passed', 'success');
    }
    
    return results;
  }

  async executeBuildWithMonitoring(buildCommand) {
    return new Promise((resolve, reject) => {
      this.log(`Executing: ${buildCommand}`, 'info');
      
      const startTime = Date.now();
      const buildProcess = spawn('cmd', ['/c', buildCommand], {
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: true
      });
      
      let stdout = '';
      let stderr = '';
      
      buildProcess.stdout.on('data', (data) => {
        const output = data.toString();
        stdout += output;
        process.stdout.write(output);
        this.parseOutputForIssues(output);
      });
      
      buildProcess.stderr.on('data', (data) => {
        const output = data.toString();
        stderr += output;
        process.stderr.write(output);
        this.parseErrorOutput(output);
      });
      
      buildProcess.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        const result = {
          success: code === 0,
          code,
          duration,
          stdout,
          stderr,
          command: buildCommand
        };
        
        if (code === 0) {
          resolve(result);
        } else {
          result.error = `Build process exited with code ${code}`;
          reject(new Error(result.error));
        }
      });
      
      buildProcess.on('error', (error) => {
        reject(new Error(`Failed to start build process: ${error.message}`));
      });
      
      // Set timeout for long builds
      const timeout = setTimeout(() => {
        buildProcess.kill('SIGTERM');
        reject(new Error('Build process timed out after 10 minutes'));
      }, 10 * 60 * 1000); // 10 minutes
      
      buildProcess.on('close', () => {
        clearTimeout(timeout);
      });
    });
  }

  async attemptRecovery(originalCommand) {
    this.log('Attempting build recovery...', 'warning');
    
    for (let i = 0; i < this.recoveryStrategies.length; i++) {
      const strategy = this.recoveryStrategies[i];
      
      try {
        this.log(`Trying recovery strategy: ${strategy}`, 'info');
        
        const recoveryResult = await this.executeRecoveryStrategy(strategy);
        
        if (recoveryResult.success) {
          // Try the build again
          const buildResult = await this.executeBuildWithMonitoring(originalCommand);
          
          this.recordRecoveryAttempt(strategy, 'success', 'Build succeeded after recovery');
          this.log(`Recovery strategy '${strategy}' succeeded`, 'success');
          
          return buildResult;
        } else {
          this.recordRecoveryAttempt(strategy, 'failed', recoveryResult.error);
        }
        
      } catch (error) {
        this.recordRecoveryAttempt(strategy, 'error', error.message);
        this.log(`Recovery strategy '${strategy}' failed: ${error.message}`, 'error');
      }
    }
    
    // All recovery strategies failed
    return {
      success: false,
      error: 'All recovery strategies failed',
      recoveryAttempts: this.recoveryAttempts
    };
  }

  async executeRecoveryStrategy(strategy) {
    switch (strategy) {
      case 'clearCache':
        return await this.clearCache();
      case 'resetDependencies':
        return await this.resetDependencies();
      case 'fallbackBuild':
        return await this.fallbackBuild();
      case 'emergencyBuild':
        return await this.emergencyBuild();
      default:
        throw new Error(`Unknown recovery strategy: ${strategy}`);
    }
  }

  async clearCache() {
    this.log('Clearing build cache...', 'info');
    
    try {
      const cacheDirs = [
        'resources/_gen',
        '.hugo_build.lock',
        'public',
        'node_modules/.cache',
        '.cache'
      ];
      
      for (const dir of cacheDirs) {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          this.log(`Cleared cache: ${dir}`, 'info');
        }
      }
      
      return { success: true, message: 'Cache cleared successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async resetDependencies() {
    this.log('Resetting dependencies...', 'info');
    
    try {
      // Remove node_modules and package-lock.json
      if (fs.existsSync('node_modules')) {
        fs.rmSync('node_modules', { recursive: true, force: true });
      }
      
      if (fs.existsSync('package-lock.json')) {
        fs.unlinkSync('package-lock.json');
      }
      
      // Reinstall dependencies
      execSync('npm install', { stdio: 'inherit' });
      
      return { success: true, message: 'Dependencies reset successfully' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async fallbackBuild() {
    this.log('Attempting fallback build...', 'info');
    
    try {
      // Use basic Hugo build command without advanced features
      const fallbackCommand = 'hugo --minify';
      await this.executeBuildWithMonitoring(fallbackCommand);
      
      return { success: true, message: 'Fallback build completed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async emergencyBuild() {
    this.log('Attempting emergency build...', 'info');
    
    try {
      // Most basic Hugo build possible
      const emergencyCommand = 'hugo';
      await this.executeBuildWithMonitoring(emergencyCommand);
      
      return { success: true, message: 'Emergency build completed' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  parseOutputForIssues(output) {
    const lines = output.split('\n');
    
    lines.forEach(line => {
      // Check for warnings
      if (line.toLowerCase().includes('warn') || line.toLowerCase().includes('warning')) {
        this.recordWarning(line.trim());
      }
      
      // Check for deprecation notices
      if (line.toLowerCase().includes('deprecat')) {
        this.recordWarning(`Deprecation: ${line.trim()}`);
      }
      
      // Check for missing files
      if (line.toLowerCase().includes('not found') || line.toLowerCase().includes('missing')) {
        this.recordWarning(`Missing resource: ${line.trim()}`);
      }
    });
  }

  parseErrorOutput(output) {
    const lines = output.split('\n');
    
    lines.forEach(line => {
      if (line.trim()) {
        this.recordError(new Error(line.trim()), 'build_error');
      }
    });
  }

  recordError(error, category = 'general') {
    this.errors.push({
      timestamp: new Date().toISOString(),
      category,
      message: error.message,
      stack: error.stack
    });
  }

  recordWarning(message, category = 'general') {
    this.warnings.push({
      timestamp: new Date().toISOString(),
      category,
      message
    });
  }

  recordRecoveryAttempt(strategy, status, message) {
    this.recoveryAttempts.push({
      timestamp: new Date().toISOString(),
      strategy,
      status,
      message
    });
  }

  // Validation methods
  checkHugoInstallation() {
    try {
      const version = execSync('hugo version', { encoding: 'utf8' });
      return { installed: true, version: version.trim() };
    } catch (error) {
      throw new Error('Hugo is not installed or not in PATH');
    }
  }

  checkNodeVersion() {
    const requiredMajor = 16;
    const currentMajor = parseInt(process.version.slice(1));
    
    if (currentMajor < requiredMajor) {
      throw new Error(`Node.js ${requiredMajor}+ required, found ${process.version}`);
    }
    
    return { version: process.version, supported: true };
  }

  checkDependencies() {
    if (!fs.existsSync('package.json')) {
      throw new Error('package.json not found');
    }
    
    if (!fs.existsSync('node_modules')) {
      throw new Error('node_modules not found, run npm install');
    }
    
    return { status: 'ok' };
  }

  checkConfigFiles() {
    const configFiles = ['config.yaml', 'config.toml', 'config.json', 'hugo.yaml', 'hugo.toml'];
    const foundConfigs = configFiles.filter(file => fs.existsSync(file));
    
    if (foundConfigs.length === 0) {
      throw new Error('No Hugo configuration file found');
    }
    
    return { configs: foundConfigs };
  }

  checkContentDirectory() {
    if (!fs.existsSync('content')) {
      throw new Error('Content directory not found');
    }
    
    const contentFiles = this.countFiles('content');
    return { contentFiles };
  }

  checkDiskSpace() {
    try {
      const stats = fs.statSync('.');
      // This is a simplified check - in practice you'd use a library for actual disk space
      return { available: 'unknown', status: 'ok' };
    } catch (error) {
      throw new Error('Unable to check disk space');
    }
  }

  checkMemory() {
    const usage = process.memoryUsage();
    const totalMemory = usage.heapTotal;
    const freeMemory = usage.heapUsed;
    
    if (totalMemory < 100 * 1024 * 1024) { // Less than 100MB
      throw new Error('Insufficient memory available');
    }
    
    return { 
      total: totalMemory, 
      used: freeMemory, 
      free: totalMemory - freeMemory 
    };
  }

  countFiles(dir) {
    let count = 0;
    
    if (!fs.existsSync(dir)) return count;
    
    const walk = (currentDir) => {
      const files = fs.readdirSync(currentDir);
      
      files.forEach(file => {
        const filePath = path.join(currentDir, file);
        const stat = fs.statSync(filePath);
        
        if (stat.isDirectory()) {
          walk(filePath);
        } else {
          count++;
        }
      });
    };
    
    walk(dir);
    return count;
  }

  async generateSuccessReport() {
    const report = {
      status: 'success',
      timestamp: new Date().toISOString(),
      buildContext: this.buildContext,
      warnings: this.warnings,
      summary: {
        totalWarnings: this.warnings.length,
        buildEnvironment: this.buildContext.environment
      }
    };
    
    this.saveReport('build-success-report.json', report);
  }

  async generateRecoveryReport() {
    const report = {
      status: 'recovered',
      timestamp: new Date().toISOString(),
      buildContext: this.buildContext,
      errors: this.errors,
      warnings: this.warnings,
      recoveryAttempts: this.recoveryAttempts,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        totalRecoveryAttempts: this.recoveryAttempts.length,
        successfulStrategy: this.recoveryAttempts.find(a => a.status === 'success')?.strategy
      }
    };
    
    this.saveReport('build-recovery-report.json', report);
  }

  async generateFailureReport(finalError) {
    const report = {
      status: 'failed',
      timestamp: new Date().toISOString(),
      buildContext: this.buildContext,
      finalError: {
        message: finalError.message,
        stack: finalError.stack
      },
      errors: this.errors,
      warnings: this.warnings,
      recoveryAttempts: this.recoveryAttempts,
      summary: {
        totalErrors: this.errors.length,
        totalWarnings: this.warnings.length,
        totalRecoveryAttempts: this.recoveryAttempts.length,
        allStrategiesFailed: true
      },
      recommendations: this.generateRecommendations()
    };
    
    this.saveReport('build-failure-report.json', report);
    this.logFailureAnalysis(report);
  }

  generateRecommendations() {
    const recommendations = [];
    
    // Based on common errors
    const errorMessages = this.errors.map(e => e.message.toLowerCase());
    
    if (errorMessages.some(msg => msg.includes('memory'))) {
      recommendations.push('Consider increasing memory allocation or optimizing content size');
    }
    
    if (errorMessages.some(msg => msg.includes('file not found') || msg.includes('missing'))) {
      recommendations.push('Check for missing files or broken links in your content');
    }
    
    if (errorMessages.some(msg => msg.includes('syntax') || msg.includes('parse'))) {
      recommendations.push('Review configuration files and content for syntax errors');
    }
    
    if (this.warnings.some(w => w.message.toLowerCase().includes('deprecat'))) {
      recommendations.push('Update deprecated configurations and dependencies');
    }
    
    if (this.recoveryAttempts.length > 0) {
      recommendations.push('Consider implementing the fixes from successful recovery strategies');
    }
    
    return recommendations;
  }

  saveReport(filename, report) {
    fs.writeFileSync(filename, JSON.stringify(report, null, 2));
    this.log(`Report saved: ${filename}`, 'info');
  }

  logFailureAnalysis(report) {
    this.log('\n' + '='.repeat(60), 'error');
    this.log('BUILD FAILURE ANALYSIS', 'error');
    this.log('='.repeat(60), 'error');
    
    this.log(`Final Error: ${report.finalError.message}`, 'error');
    this.log(`Total Errors: ${report.summary.totalErrors}`, 'error');
    this.log(`Total Warnings: ${report.summary.totalWarnings}`, 'error');
    this.log(`Recovery Attempts: ${report.summary.totalRecoveryAttempts}`, 'error');
    
    if (report.recommendations.length > 0) {
      this.log('\nRecommendations:', 'warning');
      report.recommendations.forEach((rec, index) => {
        this.log(`${index + 1}. ${rec}`, 'warning');
      });
    }
    
    this.log('='.repeat(60), 'error');
  }

  log(message, type = 'info') {
    const colors = {
      info: chalk.blue,
      success: chalk.green,
      warning: chalk.yellow,
      error: chalk.red
    };
    
    const timestamp = new Date().toISOString();
    console.log(`${colors[type](`[${type.toUpperCase()}]`)} ${timestamp}: ${message}`);
  }
}

// CLI execution
if (require.main === module) {
  const handler = new BuildErrorHandler();
  const buildCommand = process.argv[2] || 'npm run build:production';
  
  handler.handleBuildProcess(buildCommand)
    .then(result => {
      console.log('Build process completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Build process failed:', error.message);
      process.exit(1);
    });
}

module.exports = BuildErrorHandler;