// test-setup.js - Run this to test if everything is set up correctly
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Hugo Tools Setup...\n');

// Check for required files
const requiredFiles = [
    'unified-server.js',
    'static/admin/dashboard.html',
    'static/admin/review.html',
    'static/admin/bulk-upload.html',
    'static/admin/api-client.js',
    'package.json'
];

let allGood = true;

requiredFiles.forEach(file => {
    if (fs.existsSync(file)) {
        console.log(`✅ ${file} exists`);
    } else {
        console.log(`❌ ${file} missing`);
        allGood = false;
    }
});

if (allGood) {
    console.log('\n🎉 Setup complete! Run "npm run dev" to start.');
} else {
    console.log('\n⚠️  Some files are missing. Please check the setup.');
}
