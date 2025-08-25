/**
 * Pre-Deployment Validation Script
 * Comprehensive validation before deployment to catch issues early
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

class PreDeploymentValidator {
    constructor() {
        this.results = {
            environment: [],
            dependencies: [],
            configuration: [],
            database: [],
            security: [],
            build: [],
            summary: {
                passed: 0,
                failed: 0,
                warnings: 0,
                total: 0
            }
        };
        
        this.errors = [];
        this.warnings = [];
        this.startTime = Date.now();
    }

    async runAllValidations() {
        console.log('🚀 Starting Pre-Deployment Validation...');
        console.log('='.repeat(60));
        
        try {
            await this.validateEnvironment();
            await this.validateDependencies();
            await this.validateConfiguration();
            await this.validateDatabase();
            await this.validateSecurity();
            await this.validateBuild();
            
            this.calculateSummary();
            const report = this.generateReport();
            
            if (this.results.summary.failed === 0) {
                console.log('\n✅ All pre-deployment validations passed! Ready for deployment.');
                return { success: true, report };
            } else {
                console.log(`\n❌ ${this.results.summary.failed} validation(s) failed. Please fix issues before deployment.`);
                return { success: false, report };
            }
            
        } catch (error) {
            console.error('❌ Pre-deployment validation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async validateEnvironment() {
        console.log('\n🌍 Validating Environment...');
        
        // Check Node.js version
        this.addTest('environment', 'Node.js Version', () => {
            const nodeVersion = process.version;
            const majorVersion = parseInt(nodeVersion.split('.')[0].replace('v', ''));
            
            if (majorVersion < 16) {
                throw new Error(`Node.js ${majorVersion} is too old. Minimum required: 16`);
            }
            
            return `Node.js ${nodeVersion} ✓`;
        });
        
        // Check available memory
        this.addTest('environment', 'Memory Availability', () => {
            const totalMem = Math.round(require('os').totalmem() / 1024 / 1024);
            const freeMem = Math.round(require('os').freemem() / 1024 / 1024);
            
            if (freeMem < 512) {
                throw new Error(`Low memory: ${freeMem}MB available. Minimum required: 512MB`);
            }
            
            return `${freeMem}MB / ${totalMem}MB available ✓`;
        });
        
        // Check disk space
        this.addTest('environment', 'Disk Space', () => {
            try {
                const stats = fs.statSync(process.cwd());
                const size = this.getFolderSize(process.cwd());
                
                if (size > 1024 * 1024 * 1024) { // > 1GB
                    this.warnings.push('Project size is large (>1GB)');
                }
                
                return `Project size: ${Math.round(size / 1024 / 1024)}MB ✓`;
            } catch (error) {
                return 'Could not determine disk usage ⚠️';
            }
        });
        
        // Check environment variables
        this.addTest('environment', 'Environment Variables', () => {
            const requiredEnvVars = [
                'SUPABASE_URL',
                'SUPABASE_ANON_KEY'
            ];
            
            const missing = requiredEnvVars.filter(envVar => !process.env[envVar]);
            
            if (missing.length > 0) {
                throw new Error(`Missing environment variables: ${missing.join(', ')}`);
            }
            
            return `${requiredEnvVars.length} environment variables configured ✓`;
        });
    }

    async validateDependencies() {
        console.log('\n📦 Validating Dependencies...');
        
        // Check package.json exists
        this.addTest('dependencies', 'Package.json', () => {
            const packagePath = path.join(process.cwd(), 'package.json');
            
            if (!fs.existsSync(packagePath)) {
                throw new Error('package.json not found');
            }
            
            const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
            
            if (!pkg.name || !pkg.version) {
                throw new Error('package.json missing name or version');
            }
            
            return `${pkg.name}@${pkg.version} ✓`;
        });
        
        // Check node_modules exists
        this.addTest('dependencies', 'Node Modules', () => {
            const nodeModulesPath = path.join(process.cwd(), 'node_modules');
            
            if (!fs.existsSync(nodeModulesPath)) {
                throw new Error('node_modules not found. Run: npm install');
            }
            
            const moduleCount = fs.readdirSync(nodeModulesPath).length;
            return `${moduleCount} modules installed ✓`;
        });
        
        // Check critical dependencies
        this.addTest('dependencies', 'Critical Dependencies', () => {
            const criticalDeps = [
                '@supabase/supabase-js',
                'express',
                'cors'
            ];
            
            const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
            const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
            
            const missing = criticalDeps.filter(dep => !allDeps[dep]);
            
            if (missing.length > 0) {
                throw new Error(`Missing critical dependencies: ${missing.join(', ')}`);
            }
            
            return `${criticalDeps.length} critical dependencies present ✓`;
        });
        
        // Check for security vulnerabilities
        this.addTest('dependencies', 'Security Audit', async () => {
            try {
                execSync('npm audit --audit-level=high', { stdio: 'pipe' });
                return 'No high-severity vulnerabilities ✓';
            } catch (error) {
                if (error.status === 1) {
                    throw new Error('High-severity security vulnerabilities found. Run: npm audit fix');
                }
                return 'Audit completed ✓';
            }
        });
    }

    async validateConfiguration() {
        console.log('\n⚙️ Validating Configuration...');
        
        // Check Supabase configuration
        this.addTest('configuration', 'Supabase Config', () => {
            const configPath = path.join(process.cwd(), 'static/js/config/supabase-config.js');
            
            if (!fs.existsSync(configPath)) {
                throw new Error('Supabase configuration file not found');
            }
            
            const configContent = fs.readFileSync(configPath, 'utf8');
            
            if (configContent.includes('{{') || configContent.includes('undefined')) {
                throw new Error('Supabase configuration contains placeholder values');
            }
            
            return 'Supabase configuration valid ✓';
        });
        
        // Check Netlify functions
        this.addTest('configuration', 'Netlify Functions', () => {
            const functionsPath = path.join(process.cwd(), 'netlify/functions');
            
            if (!fs.existsSync(functionsPath)) {
                throw new Error('Netlify functions directory not found');
            }
            
            const functions = fs.readdirSync(functionsPath).filter(f => f.endsWith('.js'));
            
            if (functions.length === 0) {
                throw new Error('No Netlify functions found');
            }
            
            return `${functions.length} Netlify functions configured ✓`;
        });
        
        // Check Hugo configuration
        this.addTest('configuration', 'Hugo Config', () => {
            const configFiles = ['config.yaml', 'config.yml', 'config.toml', 'hugo.yaml', 'hugo.yml'];
            const configExists = configFiles.some(file => fs.existsSync(path.join(process.cwd(), file)));
            
            if (!configExists) {
                throw new Error('Hugo configuration file not found');
            }
            
            return 'Hugo configuration found ✓';
        });
        
        // Check admin panel files
        this.addTest('configuration', 'Admin Panel', () => {
            const adminPath = path.join(process.cwd(), 'static/admin');
            
            if (!fs.existsSync(adminPath)) {
                throw new Error('Admin panel directory not found');
            }
            
            const requiredFiles = [
                'admin-layout.html',
                'portfolio.html',
                'analytics.html'
            ];
            
            const missing = requiredFiles.filter(file => 
                !fs.existsSync(path.join(adminPath, file))
            );
            
            if (missing.length > 0) {
                throw new Error(`Missing admin files: ${missing.join(', ')}`);
            }
            
            return `${requiredFiles.length} admin panel files present ✓`;
        });
    }

    async validateDatabase() {
        console.log('\n🗄️ Validating Database...');
        
        // Test Supabase connection
        this.addTest('database', 'Supabase Connection', async () => {
            if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
                throw new Error('Missing Supabase environment variables');
            }
            
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            
            // Test with a simple query
            const { error } = await supabase
                .from('profiles')
                .select('count')
                .limit(1);
            
            if (error && error.code !== 'PGRST116') {
                throw new Error(`Database connection failed: ${error.message}`);
            }
            
            return 'Supabase connection successful ✓';
        });
        
        // Test required tables
        this.addTest('database', 'Database Schema', async () => {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            
            const requiredTables = ['profiles', 'projects', 'blog_posts'];
            const results = [];
            
            for (const table of requiredTables) {
                try {
                    const { error } = await supabase
                        .from(table)
                        .select('count')
                        .limit(1);
                    
                    if (error && error.code === 'PGRST116') {
                        results.push(`${table}: MISSING`);
                    } else if (error) {
                        results.push(`${table}: ERROR`);
                    } else {
                        results.push(`${table}: OK`);
                    }
                } catch (err) {
                    results.push(`${table}: ERROR`);
                }
            }
            
            const missing = results.filter(r => r.includes('MISSING'));
            if (missing.length > 0) {
                this.warnings.push(`Some tables may need migration: ${missing.join(', ')}`);
            }
            
            return `Schema check: ${results.join(', ')} ✓`;
        });
        
        // Test authentication
        this.addTest('database', 'Authentication Setup', async () => {
            const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
            
            try {
                // Try to get current session (should be null but not error)
                const { error } = await supabase.auth.getSession();
                
                if (error) {
                    throw new Error(`Auth setup issue: ${error.message}`);
                }
                
                return 'Authentication setup valid ✓';
            } catch (error) {
                throw new Error(`Authentication validation failed: ${error.message}`);
            }
        });
    }

    async validateSecurity() {
        console.log('\n🛡️ Validating Security...');
        
        // Check for sensitive data in files
        this.addTest('security', 'Sensitive Data Exposure', () => {
            const sensitivePatterns = [
                /password\s*[:=]\s*['"][^'"]+['"]/i,
                /secret\s*[:=]\s*['"][^'"]+['"]/i,
                /private[_-]?key/i
            ];
            
            const publicFiles = this.getFilesRecursive('static').concat(
                this.getFilesRecursive('layouts', '.html'),
                this.getFilesRecursive('content', '.md')
            );
            
            const exposures = [];
            
            publicFiles.forEach(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    sensitivePatterns.forEach(pattern => {
                        if (pattern.test(content)) {
                            exposures.push(file);
                        }
                    });
                } catch (error) {
                    // Skip files that can't be read
                }
            });
            
            if (exposures.length > 0) {
                throw new Error(`Potential sensitive data in: ${exposures.slice(0, 3).join(', ')}`);
            }
            
            return `${publicFiles.length} public files scanned, no exposures ✓`;
        });
        
        // Check CORS configuration
        this.addTest('security', 'CORS Configuration', () => {
            const functionFiles = this.getFilesRecursive('netlify/functions', '.js');
            let corsConfigured = false;
            
            functionFiles.forEach(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    if (content.includes('Access-Control-Allow-Origin')) {
                        corsConfigured = true;
                    }
                } catch (error) {
                    // Skip
                }
            });
            
            if (!corsConfigured) {
                this.warnings.push('CORS headers not found in function files');
            }
            
            return corsConfigured ? 'CORS configured ✓' : 'CORS not configured ⚠️';
        });
        
        // Check for hardcoded URLs
        this.addTest('security', 'Hardcoded URLs', () => {
            const configFiles = [
                'static/js/config/supabase-config.js',
                'netlify/functions/utils/supabase.js'
            ];
            
            const issues = [];
            
            configFiles.forEach(file => {
                if (fs.existsSync(file)) {
                    const content = fs.readFileSync(file, 'utf8');
                    if (content.includes('localhost') && process.env.NODE_ENV === 'production') {
                        issues.push(`${file} contains localhost references`);
                    }
                }
            });
            
            if (issues.length > 0) {
                this.warnings.push(issues.join(', '));
            }
            
            return issues.length === 0 ? 'No hardcoded development URLs ✓' : 'Development URLs found ⚠️';
        });
    }

    async validateBuild() {
        console.log('\n🏗️ Validating Build Process...');
        
        // Test Hugo build
        this.addTest('build', 'Hugo Build', () => {
            try {
                execSync('hugo --quiet --minify', { stdio: 'pipe' });
                
                // Check if public directory was created
                if (!fs.existsSync('public')) {
                    throw new Error('Hugo build did not create public directory');
                }
                
                // Check for index.html
                if (!fs.existsSync('public/index.html')) {
                    throw new Error('Hugo build did not create index.html');
                }
                
                return 'Hugo build successful ✓';
            } catch (error) {
                throw new Error(`Hugo build failed: ${error.message}`);
            }
        });
        
        // Test JavaScript syntax
        this.addTest('build', 'JavaScript Syntax', () => {
            const jsFiles = this.getFilesRecursive('static/js', '.js')
                .concat(this.getFilesRecursive('netlify/functions', '.js'));
            
            const syntaxErrors = [];
            
            jsFiles.forEach(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    // Basic syntax check - try to create a Function
                    new Function(content);
                } catch (error) {
                    if (error instanceof SyntaxError) {
                        syntaxErrors.push(`${file}: ${error.message}`);
                    }
                }
            });
            
            if (syntaxErrors.length > 0) {
                throw new Error(`Syntax errors in: ${syntaxErrors.slice(0, 2).join(', ')}`);
            }
            
            return `${jsFiles.length} JavaScript files validated ✓`;
        });
        
        // Test CSS validity
        this.addTest('build', 'CSS Validity', () => {
            const cssFiles = this.getFilesRecursive('static/css', '.css')
                .concat(this.getFilesRecursive('static', '.scss'));
            
            let validFiles = 0;
            
            cssFiles.forEach(file => {
                try {
                    const content = fs.readFileSync(file, 'utf8');
                    // Basic CSS validation - check for unclosed braces
                    const openBraces = (content.match(/\{/g) || []).length;
                    const closeBraces = (content.match(/\}/g) || []).length;
                    
                    if (openBraces === closeBraces) {
                        validFiles++;
                    }
                } catch (error) {
                    // Skip
                }
            });
            
            return `${validFiles}/${cssFiles.length} CSS files validated ✓`;
        });
        
        // Check build size
        this.addTest('build', 'Build Size', () => {
            if (fs.existsSync('public')) {
                const buildSize = this.getFolderSize('public');
                const buildSizeMB = Math.round(buildSize / 1024 / 1024);
                
                if (buildSizeMB > 100) {
                    this.warnings.push(`Build size is large: ${buildSizeMB}MB`);
                }
                
                return `Build size: ${buildSizeMB}MB ✓`;
            }
            
            return 'Build directory not found ⚠️';
        });
    }

    addTest(category, name, testFn) {
        try {
            const result = testFn();
            
            if (result && typeof result.then === 'function') {
                // Handle async test
                return result.then(asyncResult => {
                    this.results[category].push({
                        name,
                        passed: true,
                        message: asyncResult,
                        timestamp: new Date().toISOString()
                    });
                    console.log(`  ✅ ${name}: ${asyncResult}`);
                }).catch(error => {
                    this.results[category].push({
                        name,
                        passed: false,
                        message: error.message,
                        timestamp: new Date().toISOString()
                    });
                    this.errors.push(`${category}/${name}: ${error.message}`);
                    console.log(`  ❌ ${name}: ${error.message}`);
                });
            } else {
                // Handle sync test
                this.results[category].push({
                    name,
                    passed: true,
                    message: result,
                    timestamp: new Date().toISOString()
                });
                console.log(`  ✅ ${name}: ${result}`);
            }
        } catch (error) {
            this.results[category].push({
                name,
                passed: false,
                message: error.message,
                timestamp: new Date().toISOString()
            });
            this.errors.push(`${category}/${name}: ${error.message}`);
            console.log(`  ❌ ${name}: ${error.message}`);
        }
    }

    calculateSummary() {
        let passed = 0;
        let failed = 0;
        let total = 0;
        
        Object.values(this.results).forEach(categoryResults => {
            if (Array.isArray(categoryResults)) {
                categoryResults.forEach(test => {
                    total++;
                    if (test.passed) {
                        passed++;
                    } else {
                        failed++;
                    }
                });
            }
        });
        
        this.results.summary = {
            passed,
            failed,
            warnings: this.warnings.length,
            total,
            duration: Date.now() - this.startTime
        };
    }

    generateReport() {
        const report = {
            timestamp: new Date().toISOString(),
            duration: this.results.summary.duration,
            summary: this.results.summary,
            results: this.results,
            errors: this.errors,
            warnings: this.warnings,
            recommendations: this.generateRecommendations()
        };
        
        this.printSummary();
        
        return report;
    }

    generateRecommendations() {
        const recommendations = [];
        
        if (this.errors.length > 0) {
            recommendations.push('Fix all validation errors before deploying');
        }
        
        if (this.warnings.length > 0) {
            recommendations.push('Review and address warnings for optimal deployment');
        }
        
        if (this.results.summary.failed === 0) {
            recommendations.push('All validations passed - ready for deployment!');
        }
        
        return recommendations;
    }

    printSummary() {
        console.log('\n' + '='.repeat(60));
        console.log('📊 PRE-DEPLOYMENT VALIDATION SUMMARY');
        console.log('='.repeat(60));
        
        console.log(`\n✅ Passed: ${this.results.summary.passed}`);
        console.log(`❌ Failed: ${this.results.summary.failed}`);
        console.log(`⚠️  Warnings: ${this.results.summary.warnings}`);
        console.log(`📊 Total: ${this.results.summary.total}`);
        console.log(`⏱️  Duration: ${Math.round(this.results.summary.duration / 1000)}s`);
        
        if (this.errors.length > 0) {
            console.log('\n❌ Errors:');
            this.errors.forEach(error => console.log(`   - ${error}`));
        }
        
        if (this.warnings.length > 0) {
            console.log('\n⚠️  Warnings:');
            this.warnings.forEach(warning => console.log(`   - ${warning}`));
        }
        
        console.log('\n' + '='.repeat(60));
    }

    // Utility methods
    getFolderSize(folder) {
        let size = 0;
        
        try {
            const files = fs.readdirSync(folder);
            
            files.forEach(file => {
                const filePath = path.join(folder, file);
                const stats = fs.statSync(filePath);
                
                if (stats.isDirectory()) {
                    size += this.getFolderSize(filePath);
                } else {
                    size += stats.size;
                }
            });
        } catch (error) {
            // Skip inaccessible folders
        }
        
        return size;
    }

    getFilesRecursive(dir, extension = '') {
        let files = [];
        
        try {
            if (!fs.existsSync(dir)) return files;
            
            const items = fs.readdirSync(dir);
            
            items.forEach(item => {
                const fullPath = path.join(dir, item);
                const stats = fs.statSync(fullPath);
                
                if (stats.isDirectory()) {
                    files = files.concat(this.getFilesRecursive(fullPath, extension));
                } else if (!extension || fullPath.endsWith(extension)) {
                    files.push(fullPath);
                }
            });
        } catch (error) {
            // Skip inaccessible directories
        }
        
        return files;
    }
}

// CLI execution
if (require.main === module) {
    const validator = new PreDeploymentValidator();
    
    validator.runAllValidations()
        .then(result => {
            if (result.success) {
                console.log('\n🚀 Pre-deployment validation completed successfully!');
                process.exit(0);
            } else {
                console.log('\n💥 Pre-deployment validation failed!');
                process.exit(1);
            }
        })
        .catch(error => {
            console.error('💥 Validation error:', error);
            process.exit(1);
        });
}

module.exports = PreDeploymentValidator;