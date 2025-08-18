#!/usr/bin/env node

/**
 * Content Backup Tool
 * Automated backup system for Hugo content with versioning
 */

const fs = require('fs').promises;
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Configuration
const BACKUP_DIR = 'backups';
const CONTENT_DIR = 'content';
const MAX_BACKUPS = 10; // Keep last 10 backups

// Colors for terminal
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

// Create timestamp
function getTimestamp() {
    const now = new Date();
    return now.toISOString().replace(/:/g, '-').split('.')[0];
}

// Create backup
async function createBackup(type = 'manual') {
    log('\n📦 Creating Content Backup', 'bright');
    log('========================\n', 'bright');
    
    const timestamp = getTimestamp();
    const backupName = `backup-${type}-${timestamp}`;
    
    try {
        // Create backup directory if it doesn't exist
        await fs.mkdir(BACKUP_DIR, { recursive: true });
        
        // Create backup subdirectory
        const backupPath = path.join(BACKUP_DIR, backupName);
        await fs.mkdir(backupPath, { recursive: true });
        
        // Copy content directory
        log('Copying content files...', 'yellow');
        await copyDirectory(CONTENT_DIR, path.join(backupPath, 'content'));
        
        // Create metadata file
        const metadata = {
            timestamp,
            type,
            date: new Date().toLocaleString(),
            stats: await getContentStats()
        };
        
        await fs.writeFile(
            path.join(backupPath, 'metadata.json'),
            JSON.stringify(metadata, null, 2)
        );
        
        // Create compressed archive
        log('Compressing backup...', 'yellow');
        const archiveName = `${backupName}.tar.gz`;
        
        try {
            await execPromise(`tar -czf ${path.join(BACKUP_DIR, archiveName)} -C ${BACKUP_DIR} ${backupName}`);
            
            // Remove uncompressed directory
            await removeDirectory(backupPath);
            
            log(`✅ Backup created: ${archiveName}`, 'green');
        } catch (error) {
            log('⚠️ Compression failed, keeping uncompressed backup', 'yellow');
            log(`✅ Backup created: ${backupName}`, 'green');
        }
        
        // Clean old backups
        await cleanOldBackups();
        
        return backupName;
        
    } catch (error) {
        log(`❌ Backup failed: ${error.message}`, 'red');
        throw error;
    }
}

// Copy directory recursively
async function copyDirectory(src, dest) {
    await fs.mkdir(dest, { recursive: true });
    
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        
        if (entry.isDirectory()) {
            await copyDirectory(srcPath, destPath);
        } else {
            await fs.copyFile(srcPath, destPath);
        }
    }
}

// Remove directory recursively
async function removeDirectory(dir) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        
        if (entry.isDirectory()) {
            await removeDirectory(fullPath);
        } else {
            await fs.unlink(fullPath);
        }
    }
    
    await fs.rmdir(dir);
}

// Get content statistics
async function getContentStats() {
    let fileCount = 0;
    let totalSize = 0;
    
    async function scanDir(dir) {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
            const fullPath = path.join(dir, entry.name);
            
            if (entry.isDirectory()) {
                await scanDir(fullPath);
            } else if (entry.name.endsWith('.md')) {
                fileCount++;
                const stats = await fs.stat(fullPath);
                totalSize += stats.size;
            }
        }
    }
    
    await scanDir(CONTENT_DIR);
    
    return {
        files: fileCount,
        totalSize: `${(totalSize / 1024).toFixed(2)} KB`
    };
}

// Clean old backups
async function cleanOldBackups() {
    log('\nCleaning old backups...', 'yellow');
    
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backups = files
            .filter(f => f.startsWith('backup-'))
            .map(f => ({
                name: f,
                path: path.join(BACKUP_DIR, f)
            }));
        
        // Sort by creation time
        const backupStats = await Promise.all(
            backups.map(async b => {
                const stats = await fs.stat(b.path);
                return { ...b, mtime: stats.mtime };
            })
        );
        
        backupStats.sort((a, b) => b.mtime - a.mtime);
        
        // Remove old backups
        if (backupStats.length > MAX_BACKUPS) {
            const toRemove = backupStats.slice(MAX_BACKUPS);
            
            for (const backup of toRemove) {
                if (backup.name.endsWith('.tar.gz')) {
                    await fs.unlink(backup.path);
                } else {
                    await removeDirectory(backup.path);
                }
                log(`  Removed old backup: ${backup.name}`, 'cyan');
            }
        }
        
        log(`  Keeping ${Math.min(backupStats.length, MAX_BACKUPS)} most recent backups`, 'cyan');
        
    } catch (error) {
        log(`⚠️ Could not clean old backups: ${error.message}`, 'yellow');
    }
}

// List backups
async function listBackups() {
    log('\n📋 Available Backups', 'bright');
    log('==================\n', 'bright');
    
    try {
        const files = await fs.readdir(BACKUP_DIR);
        const backups = files.filter(f => f.startsWith('backup-'));
        
        if (backups.length === 0) {
            log('No backups found.', 'yellow');
            return;
        }
        
        for (const backup of backups) {
            const backupPath = path.join(BACKUP_DIR, backup);
            const stats = await fs.stat(backupPath);
            const size = (stats.size / 1024).toFixed(2);
            
            log(`  📦 ${backup}`, 'cyan');
            log(`     Size: ${size} KB`, 'reset');
            log(`     Date: ${stats.mtime.toLocaleString()}`, 'reset');
            
            // Try to read metadata
            if (!backup.endsWith('.tar.gz')) {
                try {
                    const metadata = JSON.parse(
                        await fs.readFile(path.join(backupPath, 'metadata.json'), 'utf-8')
                    );
                    log(`     Files: ${metadata.stats.files}`, 'reset');
                } catch {}
            }
        }
        
    } catch (error) {
        log(`Error listing backups: ${error.message}`, 'red');
    }
}

// Restore backup
async function restoreBackup(backupName) {
    log('\n🔄 Restoring Backup', 'bright');
    log('==================\n', 'bright');
    
    try {
        const backupPath = path.join(BACKUP_DIR, backupName);
        
        // Check if backup exists
        await fs.access(backupPath);
        
        // Create safety backup first
        log('Creating safety backup of current content...', 'yellow');
        await createBackup('pre-restore');
        
        // Extract if compressed
        let sourcePath = backupPath;
        if (backupName.endsWith('.tar.gz')) {
            log('Extracting archive...', 'yellow');
            await execPromise(`tar -xzf ${backupPath} -C ${BACKUP_DIR}`);
            sourcePath = backupPath.replace('.tar.gz', '');
        }
        
        // Remove current content
        log('Removing current content...', 'yellow');
        await removeDirectory(CONTENT_DIR);
        
        // Restore from backup
        log('Restoring content...', 'yellow');
        await copyDirectory(path.join(sourcePath, 'content'), CONTENT_DIR);
        
        // Clean up extracted files if needed
        if (backupName.endsWith('.tar.gz')) {
            await removeDirectory(sourcePath);
        }
        
        log(`✅ Successfully restored from ${backupName}`, 'green');
        
    } catch (error) {
        log(`❌ Restore failed: ${error.message}`, 'red');
        log('Your original content is preserved in the safety backup.', 'yellow');
    }
}

// Main CLI
async function main() {
    const args = process.argv.slice(2);
    const command = args[0];
    
    switch (command) {
        case 'create':
            await createBackup();
            break;
            
        case 'list':
            await listBackups();
            break;
            
        case 'restore':
            if (!args[1]) {
                log('❌ Please specify backup name to restore', 'red');
                log('Usage: node backup-content.js restore <backup-name>', 'yellow');
            } else {
                await restoreBackup(args[1]);
            }
            break;
            
        case 'auto':
            // For automated/scheduled backups
            await createBackup('auto');
            break;
            
        default:
            log('\n📦 Content Backup Tool', 'bright');
            log('====================\n', 'bright');
            log('Usage:', 'yellow');
            log('  node backup-content.js create   - Create a new backup', 'cyan');
            log('  node backup-content.js list     - List all backups', 'cyan');
            log('  node backup-content.js restore <name> - Restore a backup', 'cyan');
            log('  node backup-content.js auto     - Automated backup', 'cyan');
            log('\nBackups are stored in the "backups" directory', 'reset');
            log(`Maximum backups kept: ${MAX_BACKUPS}`, 'reset');
    }
}

// Run if called directly
if (require.main === module) {
    main().catch(error => {
        log(`\n❌ Fatal error: ${error.message}`, 'red');
        process.exit(1);
    });
}

module.exports = { createBackup, listBackups, restoreBackup };