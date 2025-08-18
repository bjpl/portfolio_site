#!/usr/bin/env node

/**
 * System Health Check for Portfolio CMS
 * Performs comprehensive checks on all system components
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

const checks = {
    passed: 0,
    failed: 0,
    warnings: 0
};

function log(message, type = 'info') {
    const prefix = {
        success: `${colors.green}✓${colors.reset}`,
        error: `${colors.red}✗${colors.reset}`,
        warning: `${colors.yellow}⚠${colors.reset}`,
        info: `${colors.blue}ℹ${colors.reset}`,
        header: `${colors.cyan}▶${colors.reset}`
    };
    
    console.log(`${prefix[type] || ''} ${message}`);
    
    if (type === 'success') checks.passed++;
    if (type === 'error') checks.failed++;
    if (type === 'warning') checks.warnings++;
}

async function checkFileExists(filePath, description) {
    try {
        await fs.access(filePath);
        log(`${description}: Found`, 'success');
        return true;
    } catch {
        log(`${description}: Missing`, 'error');
        return false;
    }
}

async function checkServerRunning(url, description) {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch(url, { timeout: 5000 });
        if (response.ok) {
            log(`${description}: Running (${response.status})`, 'success');
            return true;
        } else {
            log(`${description}: Responding but with error (${response.status})`, 'warning');
            return false;
        }
    } catch (error) {
        log(`${description}: Not running (${error.message})`, 'error');
        return false;
    }
}

async function checkGitStatus() {
    try {
        const { stdout } = await execPromise('git status --porcelain');
        const modifiedFiles = stdout.trim().split('\n').filter(line => line);
        
        if (modifiedFiles.length === 0) {
            log('Git repository: Clean', 'success');
        } else {
            log(`Git repository: ${modifiedFiles.length} uncommitted changes`, 'warning');
            if (modifiedFiles.length <= 5) {
                modifiedFiles.forEach(file => {
                    console.log(`  ${colors.yellow}→${colors.reset} ${file}`);
                });
            }
        }
        return true;
    } catch (error) {
        log('Git repository: Not initialized or error', 'error');
        return false;
    }
}

async function checkNodeModules() {
    const backendModules = path.join(__dirname, 'backend', 'node_modules');
    const exists = await checkFileExists(backendModules, 'Backend dependencies');
    
    if (exists) {
        try {
            const packageJson = JSON.parse(
                await fs.readFile(path.join(__dirname, 'backend', 'package.json'), 'utf-8')
            );
            const deps = Object.keys(packageJson.dependencies || {}).length;
            log(`  ${deps} dependencies installed`, 'info');
        } catch {}
    }
    
    return exists;
}

async function checkHugoInstallation() {
    try {
        const { stdout } = await execPromise('hugo version');
        const version = stdout.match(/v[\d.]+/);
        log(`Hugo: Installed (${version ? version[0] : 'unknown version'})`, 'success');
        return true;
    } catch {
        log('Hugo: Not installed', 'error');
        console.log(`  ${colors.yellow}→${colors.reset} Install from: https://gohugo.io/installation/`);
        return false;
    }
}

async function checkContentStructure() {
    const contentDir = path.join(__dirname, 'content');
    const expectedDirs = ['portfolio', 'make', 'learn', 'think', 'meet'];
    let allExist = true;
    
    log('Content structure:', 'header');
    
    for (const dir of expectedDirs) {
        const dirPath = path.join(contentDir, dir);
        try {
            await fs.access(dirPath);
            const files = await fs.readdir(dirPath);
            const mdFiles = files.filter(f => f.endsWith('.md'));
            log(`  ${dir}/: ${mdFiles.length} markdown files`, 'success');
        } catch {
            log(`  ${dir}/: Missing`, 'error');
            allExist = false;
        }
    }
    
    return allExist;
}

async function checkConfigFiles() {
    const configFiles = [
        { path: 'config.yaml', desc: 'Hugo configuration' },
        { path: '.env.example', desc: 'Environment template' },
        { path: 'netlify.toml', desc: 'Netlify configuration' },
        { path: 'backend/package.json', desc: 'Backend dependencies' },
        { path: 'static/robots.txt', desc: 'SEO robots file' }
    ];
    
    log('Configuration files:', 'header');
    let allExist = true;
    
    for (const file of configFiles) {
        const exists = await checkFileExists(
            path.join(__dirname, file.path),
            `  ${file.desc}`
        );
        allExist = allExist && exists;
    }
    
    return allExist;
}

async function checkAPIEndpoints() {
    const endpoints = [
        { url: 'http://localhost:3334/api/content', desc: 'Content API' },
        { url: 'http://localhost:3334/api/media', desc: 'Media API' },
        { url: 'http://localhost:3334/api/analytics/summary', desc: 'Analytics API' },
        { url: 'http://localhost:3334/api/build', desc: 'Build API', method: 'POST' }
    ];
    
    log('API Endpoints:', 'header');
    let allWorking = true;
    
    for (const endpoint of endpoints) {
        try {
            const fetch = (await import('node-fetch')).default;
            const response = await fetch(endpoint.url, {
                method: endpoint.method || 'GET',
                timeout: 5000
            });
            
            if (response.ok) {
                log(`  ${endpoint.desc}: Working`, 'success');
            } else {
                log(`  ${endpoint.desc}: Error ${response.status}`, 'error');
                allWorking = false;
            }
        } catch (error) {
            log(`  ${endpoint.desc}: Not available`, 'error');
            allWorking = false;
        }
    }
    
    return allWorking;
}

async function checkDiskSpace() {
    try {
        const { stdout } = await execPromise('df -h .');
        const lines = stdout.trim().split('\n');
        const dataLine = lines[lines.length - 1];
        const parts = dataLine.split(/\s+/);
        const usage = parts[4] || 'unknown';
        
        const usageNum = parseInt(usage);
        if (usageNum > 90) {
            log(`Disk space: ${usage} used`, 'error');
        } else if (usageNum > 75) {
            log(`Disk space: ${usage} used`, 'warning');
        } else {
            log(`Disk space: ${usage} used`, 'success');
        }
        return true;
    } catch {
        // Windows fallback
        try {
            const { stdout } = await execPromise('wmic logicaldisk get size,freespace,caption');
            log('Disk space: Check output above', 'info');
            console.log(stdout);
        } catch {
            log('Disk space: Unable to check', 'warning');
        }
        return true;
    }
}

async function checkRecentErrors() {
    const logsDir = path.join(__dirname, 'logs');
    
    try {
        const files = await fs.readdir(logsDir);
        const errorLogs = files.filter(f => f.includes('error') || f.includes('crash'));
        
        if (errorLogs.length > 0) {
            log(`Log files: ${errorLogs.length} error logs found`, 'warning');
            errorLogs.slice(0, 3).forEach(file => {
                console.log(`  ${colors.yellow}→${colors.reset} ${file}`);
            });
        } else {
            log('Log files: No error logs', 'success');
        }
    } catch {
        log('Log files: No logs directory', 'info');
    }
}

async function checkNetlifyStatus() {
    try {
        const fetch = (await import('node-fetch')).default;
        const response = await fetch('https://vocal-pony-24e3de.netlify.app');
        
        if (response.ok) {
            log('Netlify deployment: Site is live', 'success');
            
            // Check if it's the latest version
            const headers = response.headers;
            const deployId = headers.get('x-nf-request-id');
            if (deployId) {
                log(`  Deploy ID: ${deployId.substring(0, 8)}...`, 'info');
            }
        } else {
            log(`Netlify deployment: Site responding with ${response.status}`, 'warning');
        }
    } catch (error) {
        log('Netlify deployment: Unable to reach site', 'error');
    }
}

async function runHealthCheck() {
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}     Portfolio CMS System Health Check${colors.reset}`);
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);
    
    // Core Services
    console.log(`${colors.bright}Core Services:${colors.reset}`);
    await checkServerRunning('http://localhost:3334/api/content', 'CMS Server (3334)');
    await checkServerRunning('http://localhost:1313', 'Hugo Server (1313)');
    await checkHugoInstallation();
    console.log();
    
    // File System
    console.log(`${colors.bright}File System:${colors.reset}`);
    await checkNodeModules();
    await checkConfigFiles();
    await checkContentStructure();
    console.log();
    
    // API Health
    console.log(`${colors.bright}API Health:${colors.reset}`);
    await checkAPIEndpoints();
    console.log();
    
    // System Status
    console.log(`${colors.bright}System Status:${colors.reset}`);
    await checkGitStatus();
    await checkDiskSpace();
    await checkRecentErrors();
    console.log();
    
    // Production
    console.log(`${colors.bright}Production:${colors.reset}`);
    await checkNetlifyStatus();
    
    // Summary
    console.log(`\n${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}`);
    console.log(`${colors.bright}Summary:${colors.reset}`);
    console.log(`  ${colors.green}Passed: ${checks.passed}${colors.reset}`);
    console.log(`  ${colors.yellow}Warnings: ${checks.warnings}${colors.reset}`);
    console.log(`  ${colors.red}Failed: ${checks.failed}${colors.reset}`);
    
    if (checks.failed === 0) {
        console.log(`\n${colors.green}${colors.bright}✓ System is healthy and ready for use!${colors.reset}`);
    } else if (checks.failed <= 3) {
        console.log(`\n${colors.yellow}${colors.bright}⚠ System has minor issues but is functional${colors.reset}`);
    } else {
        console.log(`\n${colors.red}${colors.bright}✗ System has critical issues that need attention${colors.reset}`);
    }
    
    console.log(`${colors.bright}${colors.blue}═══════════════════════════════════════════════${colors.reset}\n`);
    
    // Exit with appropriate code
    process.exit(checks.failed > 3 ? 1 : 0);
}

// Run the health check
runHealthCheck().catch(error => {
    console.error(`${colors.red}Health check failed: ${error.message}${colors.reset}`);
    process.exit(1);
});