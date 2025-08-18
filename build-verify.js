#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Build Verification Script');
console.log('============================');

// Check if public directory exists
if (fs.existsSync('public')) {
    console.log('✅ Public directory exists');
    
    // Check for key files
    const keyFiles = [
        'public/index.html',
        'public/tools/index.html', 
        'public/writing/index.html',
        'public/css/main.css'
    ];
    
    keyFiles.forEach(file => {
        if (fs.existsSync(file)) {
            console.log(`✅ ${file} exists`);
        } else {
            console.log(`❌ ${file} missing`);
        }
    });
    
    // Check navigation in index.html
    const indexContent = fs.readFileSync('public/index.html', 'utf8');
    if (indexContent.includes('href=/tools/') || indexContent.includes('href="/tools/"')) {
        console.log('✅ Tools navigation found in index.html');
    } else {
        console.log('❌ Tools navigation missing in index.html');
    }
    
    if (indexContent.includes('href=/writing/') || indexContent.includes('href="/writing/"')) {
        console.log('✅ Writing navigation found in index.html');
    } else {
        console.log('❌ Writing navigation missing in index.html');
    }
    
} else {
    console.log('❌ Public directory does not exist');
    process.exit(1);
}

console.log('\n🚀 Build verification complete');