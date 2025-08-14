// Image optimization tool
const sharp = require('sharp');
const fs = require('fs').promises;
const path = require('path');
const glob = require('glob').sync;

async function optimizeImages() {
    const images = glob('static/media/**/*.{jpg,png}');
    for (const img of images) {
        console.log(`Optimizing ${img}...`);
    }
}

if (require.main === module) {
    optimizeImages();
}

module.exports = { optimizeImages };
