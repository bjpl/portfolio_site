#!/usr/bin/env node

/**
 * Simple Content Development Tool
 * A clean, functional CLI for managing Hugo content
 */

const fs = require('fs').promises;
const path = require('path');
const readline = require('readline');
const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    bright: '\x1b[1m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    red: '\x1b[31m',
    cyan: '\x1b[36m'
};

// Content templates
const templates = {
    'blog': {
        frontmatter: {
            title: '',
            date: new Date().toISOString(),
            draft: true,
            description: '',
            categories: [],
            tags: [],
            type: 'post'
        },
        content: '## Introduction\n\n[Your content here]\n\n## Main Points\n\n1. First point\n2. Second point\n3. Third point\n\n## Conclusion\n\n[Your conclusion here]'
    },
    'tool': {
        frontmatter: {
            title: '',
            date: new Date().toISOString(),
            draft: false,
            description: '',
            categories: ['tools'],
            tags: [],
            type: 'tools'
        },
        content: '## What it is\n\n[Description]\n\n## How to use it\n\n[Instructions]\n\n## Quick Specs\n\n- **Cost**: \n- **Platform**: \n- **Features**: \n\n## Pro Tips\n\n1. \n2. \n3. '
    },
    'strategy': {
        frontmatter: {
            title: '',
            date: new Date().toISOString(),
            draft: false,
            description: '',
            categories: ['strategies'],
            tags: [],
            type: 'tools'
        },
        content: '## Core Principle\n\n[Main concept]\n\n## Why It Works\n\n[Explanation]\n\n## Implementation\n\n### Step 1\n[Description]\n\n### Step 2\n[Description]\n\n### Step 3\n[Description]\n\n## Success Metrics\n\n- \n- \n- '
    },
    'poem': {
        frontmatter: {
            title: '',
            date: new Date().toISOString(),
            draft: false,
            description: '',
            categories: ['poetry'],
            tags: [],
            type: 'words'
        },
        content: '<div class="poem-original">\n\n[Your poem here]\n\n</div>\n\n<div class="poem-translation">\n\n*[Translation here]*\n\n</div>'
    },
    'portfolio': {
        frontmatter: {
            title: '',
            date: new Date().toISOString(),
            draft: false,
            description: '',
            featured_image: '',
            client: '',
            year: new Date().getFullYear(),
            tags: [],
            type: 'portfolio'
        },
        content: '## Project Overview\n\n[Description]\n\n## Challenge\n\n[What problem did you solve?]\n\n## Solution\n\n[How did you solve it?]\n\n## Results\n\n[What was the outcome?]'
    }
};

// Helper functions
function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function slugify(text) {
    return text
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/--+/g, '-')
        .trim();
}

function formatFrontmatter(data) {
    const yaml = ['---'];
    for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
            if (value.length > 0) {
                yaml.push(`${key}: [${value.map(v => `"${v}"`).join(', ')}]`);
            }
        } else if (typeof value === 'string') {
            yaml.push(`${key}: "${value}"`);
        } else {
            yaml.push(`${key}: ${value}`);
        }
    }
    yaml.push('---');
    return yaml.join('\n');
}

// CLI interface
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function prompt(question) {
    return new Promise(resolve => {
        rl.question(`${colors.cyan}${question}${colors.reset} `, resolve);
    });
}

// Main functions
async function createContent() {
    log('\n📝 Create New Content', 'bright');
    log('===================\n', 'bright');
    
    // Select template
    log('Available templates:', 'yellow');
    Object.keys(templates).forEach((t, i) => {
        log(`  ${i + 1}. ${t}`, 'cyan');
    });
    
    const templateChoice = await prompt('\nSelect template (number or name):');
    const templateKeys = Object.keys(templates);
    let templateName;
    
    if (isNaN(templateChoice)) {
        templateName = templateChoice;
    } else {
        templateName = templateKeys[parseInt(templateChoice) - 1];
    }
    
    if (!templates[templateName]) {
        log('Invalid template!', 'red');
        return;
    }
    
    const template = templates[templateName];
    
    // Get content details
    const title = await prompt('Title:');
    const description = await prompt('Description:');
    const tags = await prompt('Tags (comma-separated):');
    const section = await prompt('Section (e.g., writing/poetry, tools/strategies):');
    
    // Prepare frontmatter
    const frontmatter = {
        ...template.frontmatter,
        title,
        description,
        tags: tags.split(',').map(t => t.trim()).filter(t => t)
    };
    
    // Generate filename and path
    const filename = `${slugify(title)}.md`;
    const filepath = path.join('content', section, filename);
    
    // Create content
    const content = `${formatFrontmatter(frontmatter)}\n\n${template.content}`;
    
    // Create directory if it doesn't exist
    await fs.mkdir(path.dirname(filepath), { recursive: true });
    
    // Write file
    await fs.writeFile(filepath, content);
    
    log(`\n✅ Created: ${filepath}`, 'green');
    
    // Open in editor
    const openEditor = await prompt('Open in editor? (y/n):');
    if (openEditor.toLowerCase() === 'y') {
        exec(`code ${filepath}`);
    }
}

async function listContent() {
    log('\n📚 Content Library', 'bright');
    log('=================\n', 'bright');
    
    const contentDir = 'content';
    
    async function scanDir(dir, level = 0) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            const indent = '  '.repeat(level);
            
            if (item.isDirectory()) {
                log(`${indent}📁 ${item.name}/`, 'yellow');
                await scanDir(fullPath, level + 1);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                const content = await fs.readFile(fullPath, 'utf-8');
                const titleMatch = content.match(/title:\s*"([^"]+)"/);
                const title = titleMatch ? titleMatch[1] : item.name;
                log(`${indent}📄 ${title}`, 'cyan');
            }
        }
    }
    
    await scanDir(contentDir);
}

async function validateContent() {
    log('\n🔍 Validating Content', 'bright');
    log('====================\n', 'bright');
    
    const issues = {
        errors: [],
        warnings: [],
        suggestions: []
    };
    
    let totalFiles = 0;
    
    async function checkFile(filepath) {
        const content = await fs.readFile(filepath, 'utf-8');
        const filename = path.basename(filepath);
        const relPath = path.relative('content', filepath);
        totalFiles++;
        
        // Check for required frontmatter
        if (!content.includes('title:')) {
            issues.errors.push(`❌ ${relPath}: Missing title in frontmatter`);
        }
        if (!content.includes('date:')) {
            issues.errors.push(`❌ ${relPath}: Missing date in frontmatter`);
        }
        if (!content.includes('description:')) {
            issues.warnings.push(`⚠️  ${relPath}: No description (affects SEO)`);
        }
        
        // Check for empty content
        const lines = content.split('\n');
        const contentStart = lines.findIndex(line => line === '---', 1) + 1;
        const actualContent = lines.slice(contentStart).join('\n').trim();
        
        if (actualContent.length < 50) {
            issues.warnings.push(`⚠️  ${relPath}: Very short content (${actualContent.length} chars)`);
        } else if (actualContent.length < 200) {
            issues.suggestions.push(`💡 ${relPath}: Consider expanding content (${actualContent.length} chars)`);
        }
        
        // Check for broken links
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
            const url = match[2];
            if (url === 'url' || url === '#') {
                issues.warnings.push(`⚠️  ${relPath}: Placeholder link found: "${url}"`);
            } else if (url.startsWith('/') || url.startsWith('./')) {
                // Check if local file exists
                const localPath = path.join('static', url);
                try {
                    await fs.access(localPath);
                } catch {
                    issues.errors.push(`❌ ${relPath}: Broken link to ${url}`);
                }
            }
        }
        
        // Check for draft status
        if (content.includes('draft: true')) {
            issues.suggestions.push(`💡 ${relPath}: Still in draft mode`);
        }
    }
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                await checkFile(fullPath);
            }
        }
    }
    
    await scanDir('content');
    
    // Display results
    log(`\nScanned ${totalFiles} files:`, 'cyan');
    
    if (issues.errors.length > 0) {
        log(`\n❌ Errors (${issues.errors.length}):`, 'red');
        issues.errors.forEach(issue => log(issue, 'red'));
    }
    
    if (issues.warnings.length > 0) {
        log(`\n⚠️  Warnings (${issues.warnings.length}):`, 'yellow');
        issues.warnings.forEach(issue => log(issue, 'yellow'));
    }
    
    if (issues.suggestions.length > 0) {
        log(`\n💡 Suggestions (${issues.suggestions.length}):`, 'cyan');
        issues.suggestions.forEach(issue => log(issue, 'cyan'));
    }
    
    if (issues.errors.length === 0 && issues.warnings.length === 0) {
        log('\n✅ All content validated successfully!', 'green');
    }
}

async function previewContent() {
    log('\n👁️  Content Preview', 'bright');
    log('==================\n', 'bright');
    
    const section = await prompt('Section (e.g., writing/poetry):');
    const filename = await prompt('Filename (without .md):');
    
    const filepath = path.join('content', section, `${filename}.md`);
    
    try {
        const content = await fs.readFile(filepath, 'utf-8');
        const lines = content.split('\n');
        
        // Parse frontmatter
        const frontmatterEnd = lines.findIndex((line, i) => i > 0 && line === '---');
        const frontmatter = lines.slice(1, frontmatterEnd);
        const body = lines.slice(frontmatterEnd + 1).join('\n');
        
        log('\n--- Frontmatter ---', 'yellow');
        frontmatter.forEach(line => log(line, 'cyan'));
        
        log('\n--- Content Preview ---', 'yellow');
        log(body.substring(0, 500) + '...', 'reset');
        
        // Show stats
        const wordCount = body.split(/\s+/).length;
        const readingTime = Math.ceil(wordCount / 200);
        
        log('\n--- Stats ---', 'yellow');
        log(`Words: ${wordCount}`, 'cyan');
        log(`Reading time: ${readingTime} min`, 'cyan');
        
    } catch (error) {
        log(`Error: Could not read ${filepath}`, 'red');
    }
}

async function exportContent() {
    log('\n📤 Export Content', 'bright');
    log('================\n', 'bright');
    
    log('Export formats:', 'yellow');
    log('  1. JSON (structured data)', 'cyan');
    log('  2. HTML (rendered output)', 'cyan');
    log('  3. ZIP (complete backup)', 'cyan');
    log('  4. CSV (metadata only)', 'cyan');
    
    const format = await prompt('\nSelect format (1-4):');
    
    const exportDir = 'exports';
    await fs.mkdir(exportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    
    switch(format) {
        case '1':
            await exportJSON(exportDir, timestamp);
            break;
        case '2':
            await exportHTML(exportDir, timestamp);
            break;
        case '3':
            await exportZIP(exportDir, timestamp);
            break;
        case '4':
            await exportCSV(exportDir, timestamp);
            break;
        default:
            log('Invalid format!', 'red');
    }
}

async function exportJSON(exportDir, timestamp) {
    log('\nExporting to JSON...', 'yellow');
    
    const allContent = [];
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                const content = await fs.readFile(fullPath, 'utf-8');
                const parsed = parseMarkdownFile(content);
                allContent.push({
                    path: path.relative('content', fullPath),
                    ...parsed
                });
            }
        }
    }
    
    await scanDir('content');
    
    const outputFile = path.join(exportDir, `content-${timestamp}.json`);
    await fs.writeFile(outputFile, JSON.stringify(allContent, null, 2));
    
    log(`✅ Exported ${allContent.length} files to ${outputFile}`, 'green');
}

async function exportHTML(exportDir, timestamp) {
    log('\nExporting to HTML...', 'yellow');
    
    const { marked } = await import('marked');
    let html = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Content Export - ${timestamp}</title>
    <style>
        body { font-family: system-ui; max-width: 900px; margin: 0 auto; padding: 20px; }
        article { margin: 40px 0; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
        h1 { color: #5b21b6; }
        .metadata { background: #f3f4f6; padding: 10px; border-radius: 4px; margin-bottom: 20px; }
        .metadata span { margin-right: 20px; color: #6b7280; }
    </style>
</head>
<body>\n`;
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                const content = await fs.readFile(fullPath, 'utf-8');
                const parsed = parseMarkdownFile(content);
                
                html += `<article>
                    <h1>${parsed.frontmatter.title || 'Untitled'}</h1>
                    <div class="metadata">
                        <span>📅 ${parsed.frontmatter.date || 'No date'}</span>
                        <span>📁 ${path.dirname(path.relative('content', fullPath))}</span>
                        ${parsed.frontmatter.tags ? `<span>🏷️ ${parsed.frontmatter.tags.join(', ')}</span>` : ''}
                    </div>
                    ${marked.parse(parsed.content)}
                </article>\n`;
            }
        }
    }
    
    await scanDir('content');
    html += '</body>\n</html>';
    
    const outputFile = path.join(exportDir, `content-${timestamp}.html`);
    await fs.writeFile(outputFile, html);
    
    log(`✅ Exported to ${outputFile}`, 'green');
}

async function exportZIP(exportDir, timestamp) {
    log('\nCreating ZIP backup...', 'yellow');
    
    try {
        const zipFile = path.join(exportDir, `content-backup-${timestamp}.zip`);
        
        // Using native tar command (available on Windows 10+)
        await execPromise(`tar -czf ${zipFile} content`);
        
        log(`✅ Created backup: ${zipFile}`, 'green');
    } catch (error) {
        log('❌ ZIP creation failed. Trying alternative method...', 'yellow');
        
        // Fallback: Copy entire content directory
        const backupDir = path.join(exportDir, `content-backup-${timestamp}`);
        await fs.cp('content', backupDir, { recursive: true });
        
        log(`✅ Created backup directory: ${backupDir}`, 'green');
    }
}

async function exportCSV(exportDir, timestamp) {
    log('\nExporting metadata to CSV...', 'yellow');
    
    let csv = 'Path,Title,Date,Description,Tags,Word Count\n';
    let fileCount = 0;
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                const content = await fs.readFile(fullPath, 'utf-8');
                const parsed = parseMarkdownFile(content);
                const wordCount = parsed.content.split(/\s+/).length;
                
                const row = [
                    path.relative('content', fullPath),
                    parsed.frontmatter.title || 'Untitled',
                    parsed.frontmatter.date || '',
                    parsed.frontmatter.description || '',
                    (parsed.frontmatter.tags || []).join('; '),
                    wordCount
                ];
                
                csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
                fileCount++;
            }
        }
    }
    
    await scanDir('content');
    
    const outputFile = path.join(exportDir, `content-metadata-${timestamp}.csv`);
    await fs.writeFile(outputFile, csv);
    
    log(`✅ Exported ${fileCount} files to ${outputFile}`, 'green');
}

function parseMarkdownFile(content) {
    const lines = content.split('\n');
    const frontmatterStart = lines.findIndex(line => line === '---');
    const frontmatterEnd = lines.findIndex((line, i) => i > frontmatterStart && line === '---');
    
    let frontmatter = {};
    if (frontmatterStart === 0 && frontmatterEnd > 0) {
        const yamlLines = lines.slice(1, frontmatterEnd);
        yamlLines.forEach(line => {
            const match = line.match(/^([^:]+):\s*(.*)$/);
            if (match) {
                const key = match[1].trim();
                let value = match[2].trim();
                
                // Parse arrays
                if (value.startsWith('[') && value.endsWith(']')) {
                    value = value.slice(1, -1).split(',').map(v => v.trim().replace(/"/g, ''));
                } else {
                    value = value.replace(/"/g, '');
                }
                
                frontmatter[key] = value;
            }
        });
    }
    
    const contentLines = frontmatterEnd > 0 ? lines.slice(frontmatterEnd + 1) : lines;
    
    return {
        frontmatter,
        content: contentLines.join('\n').trim()
    };
}

async function buildSite() {
    log('\n🔨 Building Site', 'bright');
    log('===============\n', 'bright');
    
    try {
        log('Running Hugo build...', 'yellow');
        const { stdout, stderr } = await execPromise('hugo');
        
        if (stderr) {
            log('Build warnings:', 'yellow');
            log(stderr, 'reset');
        }
        
        // Parse build output
        const lines = stdout.split('\n');
        lines.forEach(line => {
            if (line.includes('ERROR')) {
                log(line, 'red');
            } else if (line.includes('WARN')) {
                log(line, 'yellow');
            } else {
                log(line, 'green');
            }
        });
        
        log('\n✅ Build complete!', 'green');
        
    } catch (error) {
        log('❌ Build failed:', 'red');
        log(error.message, 'red');
    }
}

async function bulkOperations() {
    log('\n⚡ Bulk Operations', 'bright');
    log('=================\n', 'bright');
    
    log('Available operations:', 'yellow');
    log('  1. Validate all content', 'cyan');
    log('  2. Convert all drafts to published', 'cyan');
    log('  3. Update all dates to today', 'cyan');
    log('  4. Add tag to all files', 'cyan');
    log('  5. Export all content', 'cyan');
    log('  6. Find and replace across files', 'cyan');
    
    const choice = await prompt('\nSelect operation:');
    
    switch(choice) {
        case '1':
            await bulkValidate();
            break;
        case '2':
            await bulkPublish();
            break;
        case '3':
            await bulkUpdateDates();
            break;
        case '4':
            await bulkAddTag();
            break;
        case '5':
            await bulkExport();
            break;
        case '6':
            await bulkFindReplace();
            break;
        default:
            log('Invalid operation!', 'red');
    }
}

async function bulkValidate() {
    log('\n🔍 Validating all content...', 'yellow');
    
    let totalFiles = 0;
    let validFiles = 0;
    const issues = [];
    
    async function validateFile(filepath) {
        const content = await fs.readFile(filepath, 'utf-8');
        const relPath = path.relative('content', filepath);
        totalFiles++;
        
        let fileValid = true;
        
        if (!content.includes('title:')) {
            issues.push(`❌ ${relPath}: Missing title`);
            fileValid = false;
        }
        if (!content.includes('date:')) {
            issues.push(`❌ ${relPath}: Missing date`);
            fileValid = false;
        }
        
        if (fileValid) validFiles++;
    }
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                await validateFile(fullPath);
            }
        }
    }
    
    await scanDir('content');
    
    log(`\n✅ Validation complete: ${validFiles}/${totalFiles} files valid`, 'green');
    
    if (issues.length > 0) {
        log('\nIssues found:', 'red');
        issues.forEach(issue => log(issue, 'red'));
    }
}

async function bulkPublish() {
    const confirm = await prompt('Convert ALL drafts to published? (yes/no):');
    if (confirm.toLowerCase() !== 'yes') return;
    
    log('\n📢 Publishing all drafts...', 'yellow');
    
    let count = 0;
    
    async function publishFile(filepath) {
        const content = await fs.readFile(filepath, 'utf-8');
        
        if (content.includes('draft: true')) {
            const updated = content.replace('draft: true', 'draft: false');
            await fs.writeFile(filepath, updated);
            count++;
            log(`  ✅ Published: ${path.relative('content', filepath)}`, 'green');
        }
    }
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                await publishFile(fullPath);
            }
        }
    }
    
    await scanDir('content');
    
    log(`\n✅ Published ${count} drafts`, 'green');
}

async function bulkUpdateDates() {
    const confirm = await prompt('Update ALL content dates to today? (yes/no):');
    if (confirm.toLowerCase() !== 'yes') return;
    
    log('\n📅 Updating dates...', 'yellow');
    
    const today = new Date().toISOString();
    let count = 0;
    
    async function updateFile(filepath) {
        const content = await fs.readFile(filepath, 'utf-8');
        const updated = content.replace(/date:\s*"[^"]*"/g, `date: "${today}"`);
        
        if (updated !== content) {
            await fs.writeFile(filepath, updated);
            count++;
            log(`  ✅ Updated: ${path.relative('content', filepath)}`, 'green');
        }
    }
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                await updateFile(fullPath);
            }
        }
    }
    
    await scanDir('content');
    
    log(`\n✅ Updated ${count} files`, 'green');
}

async function bulkAddTag() {
    const tag = await prompt('Enter tag to add:');
    const section = await prompt('Apply to specific section? (leave empty for all):');
    
    log(`\n🏷️ Adding tag "${tag}"...`, 'yellow');
    
    let count = 0;
    
    async function addTagToFile(filepath) {
        const content = await fs.readFile(filepath, 'utf-8');
        const parsed = parseMarkdownFile(content);
        
        if (parsed.frontmatter.tags) {
            const tags = Array.isArray(parsed.frontmatter.tags) 
                ? parsed.frontmatter.tags 
                : parsed.frontmatter.tags.split(',').map(t => t.trim());
            
            if (!tags.includes(tag)) {
                tags.push(tag);
                const tagLine = `tags: [${tags.map(t => `"${t}"`).join(', ')}]`;
                const updated = content.replace(/tags:\s*\[[^\]]*\]/g, tagLine);
                await fs.writeFile(filepath, updated);
                count++;
                log(`  ✅ Tagged: ${path.relative('content', filepath)}`, 'green');
            }
        }
    }
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                if (!section || fullPath.includes(section)) {
                    await scanDir(fullPath);
                }
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                await addTagToFile(fullPath);
            }
        }
    }
    
    await scanDir('content');
    
    log(`\n✅ Added tag to ${count} files`, 'green');
}

async function bulkExport() {
    log('\n📦 Exporting all content...', 'yellow');
    
    const exportDir = 'exports';
    await fs.mkdir(exportDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
    
    // Export as JSON
    await exportJSON(exportDir, timestamp);
    
    // Export as HTML
    await exportHTML(exportDir, timestamp);
    
    // Export metadata as CSV
    await exportCSV(exportDir, timestamp);
    
    log('\n✅ Bulk export complete!', 'green');
}

async function bulkFindReplace() {
    const findText = await prompt('Find text:');
    const replaceText = await prompt('Replace with:');
    const confirm = await prompt(`Replace "${findText}" with "${replaceText}" in all files? (yes/no):`);
    
    if (confirm.toLowerCase() !== 'yes') return;
    
    log('\n🔄 Finding and replacing...', 'yellow');
    
    let filesModified = 0;
    let totalReplacements = 0;
    
    async function processFile(filepath) {
        const content = await fs.readFile(filepath, 'utf-8');
        const regex = new RegExp(findText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = content.match(regex);
        
        if (matches) {
            const updated = content.replace(regex, replaceText);
            await fs.writeFile(filepath, updated);
            filesModified++;
            totalReplacements += matches.length;
            log(`  ✅ Replaced ${matches.length} instances in: ${path.relative('content', filepath)}`, 'green');
        }
    }
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                await processFile(fullPath);
            }
        }
    }
    
    await scanDir('content');
    
    log(`\n✅ Replaced ${totalReplacements} instances across ${filesModified} files`, 'green');
}

async function contentStats() {
    log('\n📊 Content Statistics', 'bright');
    log('====================\n', 'bright');
    
    const stats = {
        totalFiles: 0,
        totalWords: 0,
        bySection: {},
        byType: {},
        recentFiles: [],
        draftCount: 0,
        publishedCount: 0
    };
    
    async function analyzeFile(filepath) {
        const content = await fs.readFile(filepath, 'utf-8');
        const parsed = parseMarkdownFile(content);
        const section = path.dirname(path.relative('content', filepath));
        const wordCount = parsed.content.split(/\s+/).filter(w => w.length > 0).length;
        const stat = await fs.stat(filepath);
        
        stats.totalFiles++;
        stats.totalWords += wordCount;
        
        // By section
        if (!stats.bySection[section]) {
            stats.bySection[section] = { count: 0, words: 0 };
        }
        stats.bySection[section].count++;
        stats.bySection[section].words += wordCount;
        
        // By type
        const type = parsed.frontmatter.type || 'unknown';
        if (!stats.byType[type]) {
            stats.byType[type] = 0;
        }
        stats.byType[type]++;
        
        // Draft vs Published
        if (parsed.frontmatter.draft === 'true' || parsed.frontmatter.draft === true) {
            stats.draftCount++;
        } else {
            stats.publishedCount++;
        }
        
        // Recent files
        stats.recentFiles.push({
            path: path.relative('content', filepath),
            title: parsed.frontmatter.title || 'Untitled',
            modified: stat.mtime,
            words: wordCount
        });
    }
    
    async function scanDir(dir) {
        const items = await fs.readdir(dir, { withFileTypes: true });
        
        for (const item of items) {
            const fullPath = path.join(dir, item.name);
            
            if (item.isDirectory()) {
                await scanDir(fullPath);
            } else if (item.name.endsWith('.md') && !item.name.startsWith('_')) {
                await analyzeFile(fullPath);
            }
        }
    }
    
    await scanDir('content');
    
    // Sort recent files by modification date
    stats.recentFiles.sort((a, b) => b.modified - a.modified);
    
    // Display statistics
    log('📈 Overall Statistics', 'bright');
    log('--------------------', 'cyan');
    log(`Total Files: ${stats.totalFiles}`, 'cyan');
    log(`Total Words: ${stats.totalWords.toLocaleString()}`, 'cyan');
    log(`Average Words/File: ${Math.round(stats.totalWords / stats.totalFiles)}`, 'cyan');
    log(`Published: ${stats.publishedCount} | Drafts: ${stats.draftCount}`, 'cyan');
    
    log('\n📁 Content by Section', 'bright');
    log('--------------------', 'cyan');
    Object.entries(stats.bySection).forEach(([section, data]) => {
        log(`${section}: ${data.count} files, ${data.words.toLocaleString()} words`, 'cyan');
    });
    
    log('\n🏷️ Content by Type', 'bright');
    log('-----------------', 'cyan');
    Object.entries(stats.byType).forEach(([type, count]) => {
        log(`${type}: ${count} files`, 'cyan');
    });
    
    log('\n🕐 Recently Modified', 'bright');
    log('-------------------', 'cyan');
    stats.recentFiles.slice(0, 5).forEach(file => {
        const timeAgo = getTimeAgo(file.modified);
        log(`${file.title} (${file.words} words) - ${timeAgo}`, 'cyan');
    });
    
    // Insights
    log('\n💡 Insights', 'bright');
    log('----------', 'yellow');
    
    const readingTime = Math.round(stats.totalWords / 200);
    log(`Total reading time: ${readingTime} minutes`, 'yellow');
    
    const mostActive = Object.entries(stats.bySection)
        .sort((a, b) => b[1].count - a[1].count)[0];
    log(`Most active section: ${mostActive[0]} (${mostActive[1].count} files)`, 'yellow');
    
    const draftPercentage = Math.round((stats.draftCount / stats.totalFiles) * 100);
    if (draftPercentage > 30) {
        log(`⚠️ ${draftPercentage}% of content is still in draft`, 'yellow');
    }
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    
    const intervals = [
        { label: 'year', seconds: 31536000 },
        { label: 'month', seconds: 2592000 },
        { label: 'day', seconds: 86400 },
        { label: 'hour', seconds: 3600 },
        { label: 'minute', seconds: 60 }
    ];
    
    for (const interval of intervals) {
        const count = Math.floor(seconds / interval.seconds);
        if (count >= 1) {
            return `${count} ${interval.label}${count !== 1 ? 's' : ''} ago`;
        }
    }
    
    return 'just now';
}

// Main menu
async function mainMenu() {
    log('\n🚀 Content Development Tool', 'bright');
    log('==========================', 'bright');
    
    log('\nOptions:', 'yellow');
    log('  1. Create new content', 'cyan');
    log('  2. List all content', 'cyan');
    log('  3. Validate content', 'cyan');
    log('  4. Preview content', 'cyan');
    log('  5. Export content', 'cyan');
    log('  6. Content statistics', 'cyan');
    log('  7. Bulk operations', 'cyan');
    log('  8. Build site', 'cyan');
    log('  9. Exit', 'cyan');
    
    const choice = await prompt('\nSelect option:');
    
    switch (choice) {
        case '1':
            await createContent();
            break;
        case '2':
            await listContent();
            break;
        case '3':
            await validateContent();
            break;
        case '4':
            await previewContent();
            break;
        case '5':
            await exportContent();
            break;
        case '6':
            await contentStats();
            break;
        case '7':
            await bulkOperations();
            break;
        case '8':
            await buildSite();
            break;
        case '9':
            log('\nGoodbye! 👋', 'green');
            rl.close();
            return;
        default:
            log('Invalid option!', 'red');
    }
    
    // Return to menu
    await mainMenu();
}

// Start the tool
mainMenu().catch(error => {
    log(`Error: ${error.message}`, 'red');
    rl.close();
});