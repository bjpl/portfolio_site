#!/usr/bin/env node

/**
 * Update Admin Config Script
 * Updates all admin HTML files to use the new client-config.js
 */

const fs = require('fs').promises;
const path = require('path');

const ADMIN_DIR = path.join(__dirname, '..', 'static', 'admin');
const OLD_CONFIG_PATTERN = /<!-- Supabase Configuration[\s\S]*?<script src="\/js\/config\/supabase-config\.js"><\/script>/;
const NEW_CONFIG = `<!-- CRITICAL: Client Configuration - MUST load first for browser compatibility -->
    <script src="/js/config/client-config.js"></script>
    
    <!-- Legacy compatibility scripts -->
    <script src="/js/config/supabase-config.js"></script>`;

async function updateAdminFiles() {
    try {
        // Get all HTML files in admin directory
        const files = await fs.readdir(ADMIN_DIR);
        const htmlFiles = files.filter(file => file.endsWith('.html'));
        
        console.log(`Found ${htmlFiles.length} HTML files to process...`);
        
        for (const file of htmlFiles) {
            const filePath = path.join(ADMIN_DIR, file);
            let content = await fs.readFile(filePath, 'utf8');
            
            if (OLD_CONFIG_PATTERN.test(content)) {
                content = content.replace(OLD_CONFIG_PATTERN, NEW_CONFIG);
                await fs.writeFile(filePath, content, 'utf8');
                console.log(`✅ Updated: ${file}`);
            } else {
                console.log(`⏩ Skipped: ${file} (no matching pattern)`);
            }
        }
        
        console.log('🎉 All admin files updated successfully!');
        
    } catch (error) {
        console.error('❌ Error updating admin files:', error);
        process.exit(1);
    }
}

updateAdminFiles();