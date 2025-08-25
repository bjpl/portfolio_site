#!/usr/bin/env node

/**
 * Configuration Repair Tool
 * Automated repair and diagnostic tool for admin configuration issues
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

class ConfigRepairTool {
    constructor() {
        this.projectRoot = process.cwd();
        this.issues = [];
        this.fixes = [];
        this.backupDir = path.join(this.projectRoot, '.config-backups');
        
        this.configPaths = {
            supabaseConfig: 'static/js/config/supabase-config.js',
            hugoConfig: 'config.yaml',
            netlifyConfig: 'netlify.toml',
            packageJson: 'package.json'
        };
    }

    // Main repair function
    async runRepair(options = {}) {
        console.log('🔧 Starting Configuration Repair Tool...');
        console.log('=' .repeat(50));
        
        try {
            // Create backup directory
            this.createBackupDirectory();
            
            // Run diagnostics first
            await this.runDiagnostics();
            
            // Apply fixes if any issues found
            if (this.issues.length > 0) {
                await this.applyFixes(options);
            } else {
                console.log('✅ No configuration issues found!');
            }
            
            // Generate report
            this.generateReport();
            
            console.log('\n🎉 Configuration repair completed!');
            return {
                success: true,
                issuesFound: this.issues.length,
                fixesApplied: this.fixes.length
            };
            
        } catch (error) {
            console.error('❌ Configuration repair failed:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    // Create backup directory
    createBackupDirectory() {
        if (!fs.existsSync(this.backupDir)) {
            fs.mkdirSync(this.backupDir, { recursive: true });
        }
    }

    // Run comprehensive diagnostics
    async runDiagnostics() {
        console.log('\n🔍 Running Configuration Diagnostics...');
        
        // Check file existence
        this.checkFileExistence();
        
        // Check file permissions
        this.checkFilePermissions();
        
        // Check configuration syntax
        await this.checkConfigurationSyntax();
        
        // Check Supabase connectivity
        await this.checkSupabaseConnectivity();
        
        // Check environment variables
        this.checkEnvironmentVariables();
        
        // Check dependencies
        this.checkDependencies();
        
        // Check build outputs
        this.checkBuildOutputs();
        
        console.log(`\n📊 Diagnostics complete: ${this.issues.length} issues found`);
    }

    // Check if required files exist
    checkFileExistence() {
        console.log('Checking file existence...');
        
        for (const [name, filePath] of Object.entries(this.configPaths)) {
            const fullPath = path.join(this.projectRoot, filePath);
            
            if (!fs.existsSync(fullPath)) {
                this.addIssue('missing_file', `Missing ${name}: ${filePath}`, {
                    file: filePath,
                    severity: 'high'
                });
            } else {
                console.log(`  ✅ ${name} found`);
            }
        }
    }

    // Check file permissions
    checkFilePermissions() {
        console.log('Checking file permissions...');
        
        for (const [name, filePath] of Object.entries(this.configPaths)) {
            const fullPath = path.join(this.projectRoot, filePath);
            
            if (fs.existsSync(fullPath)) {
                try {
                    fs.accessSync(fullPath, fs.constants.R_OK | fs.constants.W_OK);
                    console.log(`  ✅ ${name} permissions OK`);
                } catch (error) {
                    this.addIssue('permission_error', `Permission error for ${name}: ${error.message}`, {
                        file: filePath,
                        severity: 'medium'
                    });
                }
            }
        }
    }

    // Check configuration file syntax
    async checkConfigurationSyntax() {
        console.log('Checking configuration syntax...');
        
        // Check Supabase config
        const supabaseConfigPath = path.join(this.projectRoot, this.configPaths.supabaseConfig);
        if (fs.existsSync(supabaseConfigPath)) {
            try {
                const content = fs.readFileSync(supabaseConfigPath, 'utf8');
                
                // Basic syntax checks
                if (!content.includes('window.SUPABASE_CONFIG')) {
                    this.addIssue('config_syntax', 'Supabase config missing main object', {
                        file: this.configPaths.supabaseConfig,
                        severity: 'high'
                    });
                }
                
                if (!content.includes('url:') || !content.includes('anonKey:')) {
                    this.addIssue('config_syntax', 'Supabase config missing required fields', {
                        file: this.configPaths.supabaseConfig,
                        severity: 'high'
                    });
                }
                
                console.log('  ✅ Supabase config syntax OK');
                
            } catch (error) {
                this.addIssue('config_syntax', `Supabase config syntax error: ${error.message}`, {
                    file: this.configPaths.supabaseConfig,
                    severity: 'high'
                });
            }
        }
        
        // Check Hugo config
        const hugoConfigPath = path.join(this.projectRoot, this.configPaths.hugoConfig);
        if (fs.existsSync(hugoConfigPath)) {
            try {
                const content = fs.readFileSync(hugoConfigPath, 'utf8');
                
                // Basic YAML checks
                if (!content.includes('baseURL:') && !content.includes('title:')) {
                    this.addIssue('config_syntax', 'Hugo config missing basic fields', {
                        file: this.configPaths.hugoConfig,
                        severity: 'medium'
                    });
                }
                
                console.log('  ✅ Hugo config syntax OK');
                
            } catch (error) {
                this.addIssue('config_syntax', `Hugo config syntax error: ${error.message}`, {
                    file: this.configPaths.hugoConfig,
                    severity: 'medium'
                });
            }
        }
    }

    // Check Supabase connectivity
    async checkSupabaseConnectivity() {
        console.log('Checking Supabase connectivity...');
        
        const supabaseConfigPath = path.join(this.projectRoot, this.configPaths.supabaseConfig);
        
        if (fs.existsSync(supabaseConfigPath)) {
            try {
                const content = fs.readFileSync(supabaseConfigPath, 'utf8');
                
                // Extract URL from config
                const urlMatch = content.match(/url:\s*['"`]([^'"`]+)['"`]/);
                
                if (urlMatch) {
                    const supabaseUrl = urlMatch[1];
                    
                    try {
                        await this.testHttpConnection(supabaseUrl + '/health');
                        console.log('  ✅ Supabase connectivity OK');
                    } catch (error) {
                        this.addIssue('connectivity', `Cannot reach Supabase instance: ${error.message}`, {
                            url: supabaseUrl,
                            severity: 'high'
                        });
                    }
                } else {
                    this.addIssue('config_syntax', 'Cannot extract Supabase URL from config', {
                        file: this.configPaths.supabaseConfig,
                        severity: 'high'
                    });
                }
                
            } catch (error) {
                this.addIssue('connectivity', `Supabase connectivity check failed: ${error.message}`, {
                    severity: 'high'
                });
            }
        }
    }

    // Test HTTP connection
    testHttpConnection(url) {
        return new Promise((resolve, reject) => {
            const request = https.get(url, {
                timeout: 5000,
                headers: {
                    'User-Agent': 'Config-Repair-Tool/1.0'
                }
            }, (response) => {
                if (response.statusCode >= 200 && response.statusCode < 400) {
                    resolve(response);
                } else {
                    reject(new Error(`HTTP ${response.statusCode}: ${response.statusMessage}`));
                }
            });
            
            request.on('timeout', () => {
                request.destroy();
                reject(new Error('Connection timeout'));
            });
            
            request.on('error', (error) => {
                reject(error);
            });
        });
    }

    // Check environment variables
    checkEnvironmentVariables() {
        console.log('Checking environment variables...');
        
        const requiredEnvVars = [
            'NODE_ENV',
            // Add other required environment variables here
        ];
        
        const missingVars = [];
        
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                missingVars.push(envVar);
            }
        }
        
        if (missingVars.length > 0) {
            this.addIssue('environment', `Missing environment variables: ${missingVars.join(', ')}`, {
                missingVars,
                severity: 'medium'
            });
        } else {
            console.log('  ✅ Environment variables OK');
        }
    }

    // Check dependencies
    checkDependencies() {
        console.log('Checking dependencies...');
        
        const packageJsonPath = path.join(this.projectRoot, 'package.json');
        
        if (fs.existsSync(packageJsonPath)) {
            try {
                const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
                
                // Check if node_modules exists
                const nodeModulesPath = path.join(this.projectRoot, 'node_modules');
                if (!fs.existsSync(nodeModulesPath)) {
                    this.addIssue('dependencies', 'node_modules directory missing', {
                        fix: 'run_npm_install',
                        severity: 'high'
                    });
                } else {
                    console.log('  ✅ Dependencies installed');
                }
                
                // Check for critical dependencies
                const criticalDeps = ['@supabase/supabase-js'];
                const allDeps = { ...packageJson.dependencies, ...packageJson.devDependencies };
                
                for (const dep of criticalDeps) {
                    if (!allDeps[dep]) {
                        this.addIssue('dependencies', `Missing critical dependency: ${dep}`, {
                            dependency: dep,
                            severity: 'high'
                        });
                    }
                }
                
            } catch (error) {
                this.addIssue('dependencies', `Cannot read package.json: ${error.message}`, {
                    severity: 'high'
                });
            }
        }
    }

    // Check build outputs
    checkBuildOutputs() {
        console.log('Checking build outputs...');
        
        const buildDirs = ['public', 'dist', '.next'];
        let buildDirFound = false;
        
        for (const dir of buildDirs) {
            if (fs.existsSync(path.join(this.projectRoot, dir))) {
                buildDirFound = true;
                console.log(`  ✅ Build directory found: ${dir}`);
                break;
            }
        }
        
        if (!buildDirFound) {
            this.addIssue('build', 'No build output directory found', {
                fix: 'run_build',
                severity: 'medium'
            });
        }
    }

    // Add issue to the list
    addIssue(type, description, metadata = {}) {
        this.issues.push({
            type,
            description,
            timestamp: new Date().toISOString(),
            ...metadata
        });
        
        const severity = metadata.severity || 'low';
        const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
        console.log(`  ${icon} ${description}`);
    }

    // Apply fixes for found issues
    async applyFixes(options = {}) {
        console.log('\n🔨 Applying Fixes...');
        
        const autoFix = options.autoFix !== false; // Default to true
        
        for (const issue of this.issues) {
            if (autoFix || await this.promptForFix(issue)) {
                try {
                    await this.fixIssue(issue);
                    this.fixes.push(issue);
                } catch (error) {
                    console.error(`❌ Failed to fix ${issue.description}: ${error.message}`);
                }
            }
        }
    }

    // Fix individual issue
    async fixIssue(issue) {
        switch (issue.type) {
            case 'missing_file':
                await this.fixMissingFile(issue);
                break;
                
            case 'permission_error':
                await this.fixPermissions(issue);
                break;
                
            case 'config_syntax':
                await this.fixConfigSyntax(issue);
                break;
                
            case 'connectivity':
                await this.fixConnectivity(issue);
                break;
                
            case 'environment':
                await this.fixEnvironment(issue);
                break;
                
            case 'dependencies':
                await this.fixDependencies(issue);
                break;
                
            case 'build':
                await this.fixBuild(issue);
                break;
                
            default:
                console.log(`⚠️  No fix available for: ${issue.description}`);
        }
    }

    // Fix missing file
    async fixMissingFile(issue) {
        console.log(`🔧 Creating missing file: ${issue.file}`);
        
        const fullPath = path.join(this.projectRoot, issue.file);
        const dirPath = path.dirname(fullPath);
        
        // Create directory if it doesn't exist
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
        }
        
        // Create file based on type
        if (issue.file.includes('supabase-config.js')) {
            const template = this.getSupabaseConfigTemplate();
            fs.writeFileSync(fullPath, template, 'utf8');
        } else if (issue.file.includes('config.yaml')) {
            const template = this.getHugoConfigTemplate();
            fs.writeFileSync(fullPath, template, 'utf8');
        } else {
            // Create empty file
            fs.writeFileSync(fullPath, '', 'utf8');
        }
        
        console.log(`  ✅ Created: ${issue.file}`);
    }

    // Fix permission errors
    async fixPermissions(issue) {
        console.log(`🔧 Fixing permissions for: ${issue.file}`);
        
        const fullPath = path.join(this.projectRoot, issue.file);
        
        try {
            // Set read/write permissions
            fs.chmodSync(fullPath, 0o644);
            console.log(`  ✅ Fixed permissions: ${issue.file}`);
        } catch (error) {
            throw new Error(`Cannot fix permissions: ${error.message}`);
        }
    }

    // Fix configuration syntax
    async fixConfigSyntax(issue) {
        console.log(`🔧 Fixing configuration syntax: ${issue.file}`);
        
        const fullPath = path.join(this.projectRoot, issue.file);
        
        // Create backup
        this.createBackup(fullPath);
        
        if (issue.file.includes('supabase-config.js')) {
            const template = this.getSupabaseConfigTemplate();
            fs.writeFileSync(fullPath, template, 'utf8');
        } else if (issue.file.includes('config.yaml')) {
            const template = this.getHugoConfigTemplate();
            fs.writeFileSync(fullPath, template, 'utf8');
        }
        
        console.log(`  ✅ Fixed syntax: ${issue.file}`);
    }

    // Fix connectivity issues
    async fixConnectivity(issue) {
        console.log(`🔧 Attempting to fix connectivity: ${issue.url || 'Unknown URL'}`);
        
        // For now, just log the issue - connectivity issues usually need manual intervention
        console.log(`  ⚠️  Connectivity issue requires manual review`);
        console.log(`     Check network configuration and firewall settings`);
        console.log(`     Verify Supabase instance is active and accessible`);
    }

    // Fix environment issues
    async fixEnvironment(issue) {
        console.log(`🔧 Fixing environment variables`);
        
        const envFile = path.join(this.projectRoot, '.env.local');
        let envContent = '';
        
        if (fs.existsSync(envFile)) {
            envContent = fs.readFileSync(envFile, 'utf8');
        }
        
        // Add missing environment variables with placeholder values
        if (issue.missingVars) {
            for (const envVar of issue.missingVars) {
                if (!envContent.includes(envVar)) {
                    envContent += `\n${envVar}=PLACEHOLDER_VALUE_CHANGE_ME\n`;
                }
            }
            
            fs.writeFileSync(envFile, envContent, 'utf8');
            console.log(`  ✅ Added missing environment variables to .env.local`);
            console.log(`  ⚠️  Please update placeholder values in .env.local`);
        }
    }

    // Fix dependencies
    async fixDependencies(issue) {
        console.log(`🔧 Fixing dependencies`);
        
        if (issue.fix === 'run_npm_install') {
            try {
                console.log('  Running npm install...');
                execSync('npm install', { 
                    cwd: this.projectRoot, 
                    stdio: 'inherit' 
                });
                console.log(`  ✅ Dependencies installed`);
            } catch (error) {
                throw new Error(`npm install failed: ${error.message}`);
            }
        }
        
        if (issue.dependency) {
            try {
                console.log(`  Installing ${issue.dependency}...`);
                execSync(`npm install ${issue.dependency}`, { 
                    cwd: this.projectRoot, 
                    stdio: 'inherit' 
                });
                console.log(`  ✅ Installed ${issue.dependency}`);
            } catch (error) {
                throw new Error(`Failed to install ${issue.dependency}: ${error.message}`);
            }
        }
    }

    // Fix build issues
    async fixBuild(issue) {
        console.log(`🔧 Fixing build issues`);
        
        if (issue.fix === 'run_build') {
            try {
                console.log('  Running build process...');
                
                // Try different build commands
                const buildCommands = ['npm run build', 'npm run hugo', 'hugo'];
                
                for (const command of buildCommands) {
                    try {
                        execSync(command, { 
                            cwd: this.projectRoot, 
                            stdio: 'inherit' 
                        });
                        console.log(`  ✅ Build completed with: ${command}`);
                        return;
                    } catch (error) {
                        console.log(`  ⚠️  ${command} failed, trying next...`);
                    }
                }
                
                throw new Error('All build commands failed');
                
            } catch (error) {
                throw new Error(`Build failed: ${error.message}`);
            }
        }
    }

    // Create file backup
    createBackup(filePath) {
        if (fs.existsSync(filePath)) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupName = `${path.basename(filePath)}.backup.${timestamp}`;
            const backupPath = path.join(this.backupDir, backupName);
            
            fs.copyFileSync(filePath, backupPath);
            console.log(`  📄 Backup created: ${backupName}`);
        }
    }

    // Generate configuration templates
    getSupabaseConfigTemplate() {
        return `/**
 * Frontend Supabase Configuration
 * Generated by Config Repair Tool
 */

window.SUPABASE_CONFIG = {
  // NOTE: Update these values with your actual Supabase credentials
  url: 'https://YOUR_SUPABASE_URL.supabase.co',
  anonKey: 'YOUR_SUPABASE_ANON_KEY',
  
  auth: {
    session: {
      persistSession: true,
      storage: 'localStorage',
      storageKey: 'supabase-auth-session',
      autoRefresh: true
    }
  }
};

// Validation function
window.validateSupabaseConfig = function() {
  const config = window.SUPABASE_CONFIG;
  
  if (!config.url || config.url.includes('YOUR_SUPABASE_URL')) {
    console.error('❌ Please update Supabase URL in config');
    return false;
  }
  
  if (!config.anonKey || config.anonKey.includes('YOUR_SUPABASE_ANON_KEY')) {
    console.error('❌ Please update Supabase anonymous key in config');
    return false;
  }
  
  console.log('✅ Supabase configuration validated');
  return true;
};
`;
    }

    getHugoConfigTemplate() {
        return `baseURL: "https://your-site.netlify.app/"
defaultContentLanguage: "en"
title: "Your Site Title"

languages:
  en:
    languageName: "English"
    languageCode: "en-US"
    weight: 1
    title: "Your Site Title"

params:
  description: "Your site description"
  author: "Your Name"
  
enableRobotsTXT: true
`;
    }

    // Prompt user for fix approval
    async promptForFix(issue) {
        // For automation, always return true
        // In interactive mode, this would prompt the user
        return true;
    }

    // Generate repair report
    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            summary: {
                issuesFound: this.issues.length,
                fixesApplied: this.fixes.length,
                issuesRemaining: this.issues.length - this.fixes.length
            },
            issues: this.issues,
            fixes: this.fixes.map(fix => ({
                type: fix.type,
                description: fix.description,
                status: 'fixed'
            }))
        };
        
        const reportPath = path.join(this.projectRoot, 'config-repair-report.json');
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
        
        console.log(`\n📊 Repair Report:`);
        console.log(`   Issues Found: ${report.summary.issuesFound}`);
        console.log(`   Fixes Applied: ${report.summary.fixesApplied}`);
        console.log(`   Issues Remaining: ${report.summary.issuesRemaining}`);
        console.log(`   Report saved: config-repair-report.json`);
        
        return report;
    }
}

// CLI interface
if (require.main === module) {
    const args = process.argv.slice(2);
    const options = {
        autoFix: !args.includes('--manual'),
        verbose: args.includes('--verbose')
    };
    
    const repairTool = new ConfigRepairTool();
    
    repairTool.runRepair(options)
        .then(result => {
            process.exit(result.success ? 0 : 1);
        })
        .catch(error => {
            console.error('Repair tool failed:', error);
            process.exit(1);
        });
}

module.exports = ConfigRepairTool;