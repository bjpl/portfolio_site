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
    
    const issues = [];
    
    async function checkFile(filepath) {
        const content = await fs.readFile(filepath, 'utf-8');
        const filename = path.basename(filepath);
        
        // Check for required frontmatter
        if (!content.includes('title:')) {
            issues.push(`${filename}: Missing title`);
        }
        if (!content.includes('date:')) {
            issues.push(`${filename}: Missing date`);
        }
        
        // Check for empty content
        const lines = content.split('\n');
        const contentStart = lines.findIndex(line => line === '---', 1) + 1;
        const actualContent = lines.slice(contentStart).join('\n').trim();
        
        if (actualContent.length < 50) {
            issues.push(`${filename}: Content too short (${actualContent.length} chars)`);
        }
        
        // Check for broken links
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        let match;
        while ((match = linkRegex.exec(content)) !== null) {
            const url = match[2];
            if (url.startsWith('/') || url.startsWith('./')) {
                // Check if local file exists
                const localPath = path.join('static', url);
                try {
                    await fs.access(localPath);
                } catch {
                    issues.push(`${filename}: Broken link to ${url}`);
                }
            }
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
    
    if (issues.length === 0) {
        log('✅ All content validated successfully!', 'green');
    } else {
        log(`Found ${issues.length} issues:`, 'red');
        issues.forEach(issue => log(`  ⚠️  ${issue}`, 'yellow'));
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

// Main menu
async function mainMenu() {
    log('\n🚀 Content Development Tool', 'bright');
    log('==========================', 'bright');
    
    log('\nOptions:', 'yellow');
    log('  1. Create new content', 'cyan');
    log('  2. List all content', 'cyan');
    log('  3. Validate content', 'cyan');
    log('  4. Preview content', 'cyan');
    log('  5. Build site', 'cyan');
    log('  6. Exit', 'cyan');
    
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
            await buildSite();
            break;
        case '6':
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