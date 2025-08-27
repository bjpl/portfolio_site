#!/usr/bin/env node

/**
 * Simple PWA icon generator using SVG
 * Creates placeholder icons for development/testing
 */

const fs = require('fs');
const path = require('path');

const outputDir = path.join(__dirname, '..', 'public', 'images', 'pwa');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Icon configurations
const iconConfigs = [
  // Standard PWA icons
  { name: 'icon-32x32', size: 32 },
  { name: 'icon-48x48', size: 48 },
  { name: 'icon-72x72', size: 72 },
  { name: 'icon-96x96', size: 96 },
  { name: 'icon-128x128', size: 128 },
  { name: 'icon-144x144', size: 144 },
  { name: 'icon-152x152', size: 152 },
  { name: 'icon-180x180', size: 180 },
  { name: 'icon-192x192', size: 192 },
  { name: 'icon-256x256', size: 256 },
  { name: 'icon-384x384', size: 384 },
  { name: 'icon-512x512', size: 512 },
  
  // Apple touch icon
  { name: 'apple-touch-icon', size: 180 },
  
  // Shortcuts
  { name: 'shortcut-blog', size: 96, icon: '📝' },
  { name: 'shortcut-tools', size: 96, icon: '🛠️' },
  { name: 'shortcut-about', size: 96, icon: '👨‍💼' },
  
  // Microsoft tiles
  { name: 'icon-70x70', size: 70 },
  { name: 'icon-150x150', size: 150 },
  { name: 'icon-310x150', size: 310, height: 150 },
  { name: 'icon-310x310', size: 310 },
];

function generateSVGIcon(size, height = null, emoji = null, text = null) {
  const actualHeight = height || size;
  const displayText = text || (size >= 96 ? 'BL' : 'B');
  
  return `<svg width="${size}" height="${actualHeight}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A90E2"/>
      <stop offset="50%" style="stop-color:#5BA3F5"/>
      <stop offset="100%" style="stop-color:#6BB6FF"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bgGradient)" rx="${Math.min(size * 0.1, 20)}"/>
  
  <!-- Pattern overlay -->
  <rect width="100%" height="100%" fill="rgba(255,255,255,0.05)" rx="${Math.min(size * 0.1, 20)}"/>
  
  ${emoji ? `
  <!-- Emoji icon -->
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-size="${size * 0.4}" fill="white">${emoji}</text>
  ` : `
  <!-- Text logo -->
  <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" 
        font-size="${Math.max(size * 0.25, 12)}" fill="white"
        style="text-shadow: 0 2px 4px rgba(0,0,0,0.3)">${displayText}</text>
  `}
</svg>`;
}

function generateScreenshotSVG(width, height, orientation) {
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <!-- Background -->
  <rect width="100%" height="100%" fill="#f8f9fa"/>
  
  <!-- Header -->
  <rect width="100%" height="${height * 0.15}" fill="#4A90E2"/>
  <text x="50%" y="${height * 0.08}" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" 
        font-size="${Math.min(width * 0.04, 32)}" fill="white">Brandon Lambert Portfolio</text>
  
  <!-- Content cards -->
  ${[0, 1, 2].map(i => {
    const cardHeight = height * 0.18;
    const cardY = height * 0.25 + (cardHeight + 20) * i;
    const cardMargin = width * 0.05;
    
    return `
    <rect x="${cardMargin}" y="${cardY}" width="${width - cardMargin * 2}" height="${cardHeight}" 
          fill="white" stroke="#e9ecef" rx="8"/>
    <rect x="${cardMargin + 20}" y="${cardY + 20}" width="${(width - cardMargin * 2) * 0.6}" height="16" 
          fill="#6c757d" rx="4"/>
    <rect x="${cardMargin + 20}" y="${cardY + 45}" width="${(width - cardMargin * 2) * 0.8}" height="12" 
          fill="#adb5bd" rx="2"/>
    <rect x="${cardMargin + 20}" y="${cardY + 65}" width="${(width - cardMargin * 2) * 0.5}" height="12" 
          fill="#adb5bd" rx="2"/>
    `;
  }).join('')}
  
  <!-- Footer -->
  <text x="50%" y="${height * 0.95}" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-size="12" fill="#6c757d">
    Education • Technology • Innovation
  </text>
</svg>`;
}

function generateOGImageSVG() {
  const width = 1200;
  const height = 630;
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#4A90E2"/>
      <stop offset="50%" style="stop-color:#5BA3F5"/>
      <stop offset="100%" style="stop-color:#6BB6FF"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#ogBg)"/>
  
  <!-- Pattern -->
  ${Array.from({length: 20}, (_, i) => 
    Array.from({length: 10}, (_, j) => 
      `<circle cx="${i * 60 + 30}" cy="${j * 63 + 30}" r="15" 
               fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="2"/>`
    ).join('')
  ).join('')}
  
  <!-- Main content -->
  <text x="50%" y="40%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="bold" 
        font-size="64" fill="white"
        style="text-shadow: 0 4px 8px rgba(0,0,0,0.5)">
    Brandon JP Lambert
  </text>
  
  <text x="50%" y="60%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="normal" 
        font-size="32" fill="rgba(255,255,255,0.9)"
        style="text-shadow: 0 2px 4px rgba(0,0,0,0.3)">
    Educator &amp; Developer
  </text>
  
  <!-- Subtitle -->
  <text x="50%" y="75%" dominant-baseline="middle" text-anchor="middle" 
        font-family="Arial, sans-serif" font-weight="normal" 
        font-size="20" fill="rgba(255,255,255,0.8)">
    Language Learning • Educational Technology • Innovation
  </text>
</svg>`;
}

console.log('Creating simple SVG-based PWA icons...');

try {
  let generatedCount = 0;
  
  // Generate icons
  iconConfigs.forEach(({ name, size, height, icon }) => {
    const svg = generateSVGIcon(size, height, icon);
    const filePath = path.join(outputDir, `${name}.svg`);
    fs.writeFileSync(filePath, svg);
    console.log(`✓ Generated: ${name}.svg (${size}x${height || size})`);
    generatedCount++;
  });
  
  // Generate screenshots
  const screenshots = [
    { name: 'screenshot-wide', width: 1280, height: 800 },
    { name: 'screenshot-narrow', width: 750, height: 1334 }
  ];
  
  screenshots.forEach(({ name, width, height }) => {
    const svg = generateScreenshotSVG(width, height, name.includes('wide') ? 'landscape' : 'portrait');
    const filePath = path.join(outputDir, `${name}.svg`);
    fs.writeFileSync(filePath, svg);
    console.log(`✓ Generated: ${name}.svg (${width}x${height})`);
    generatedCount++;
  });
  
  // Generate OG image
  const ogSvg = generateOGImageSVG();
  const ogPath = path.join(outputDir, 'og-image.svg');
  fs.writeFileSync(ogPath, ogSvg);
  console.log(`✓ Generated: og-image.svg (1200x630)`);
  generatedCount++;
  
  // Create a simple notification image
  const notificationSvg = generateSVGIcon(512, 512, '🔔', 'BL');
  const notificationPath = path.join(outputDir, 'notification-image.svg');
  fs.writeFileSync(notificationPath, notificationSvg);
  console.log(`✓ Generated: notification-image.svg (512x512)`);
  generatedCount++;
  
  // Create action icons
  const actionIcons = [
    { name: 'action-open', emoji: '📱' },
    { name: 'action-dismiss', emoji: '✖️' }
  ];
  
  actionIcons.forEach(({ name, emoji }) => {
    const svg = generateSVGIcon(48, 48, emoji);
    const filePath = path.join(outputDir, `${name}.svg`);
    fs.writeFileSync(filePath, svg);
    console.log(`✓ Generated: ${name}.svg (48x48)`);
    generatedCount++;
  });
  
  console.log(`\n🎉 Successfully generated ${generatedCount} PWA assets!`);
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`\n💡 Note: These are SVG placeholders for development.`);
  console.log(`   For production, consider using PNG/WebP formats for better browser compatibility.`);
  
} catch (error) {
  console.error('❌ Error generating PWA assets:', error.message);
  process.exit(1);
}