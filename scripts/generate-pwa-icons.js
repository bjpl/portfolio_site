#!/usr/bin/env node

import { createCanvas } from 'canvas';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Icon sizes to generate
const iconSizes = [
  32, 48, 72, 96, 128, 144, 152, 180, 192, 256, 384, 512,
  // Microsoft tile sizes
  70, 150, 310,
  // Apple launch screen sizes (simplified)
  640, 750, 1125, 1242
];

// Custom sizes for specific use cases
const customSizes = [
  { name: 'apple-touch-icon', size: 180 },
  { name: 'favicon', size: 32 },
  { name: 'shortcut-blog', size: 96 },
  { name: 'shortcut-tools', size: 96 },
  { name: 'shortcut-about', size: 96 },
  { name: 'notification-image', size: 512 },
  { name: 'og-image', size: 1200, height: 630 },
  // Microsoft tile specific
  { name: 'icon-310x150', size: 310, height: 150 }
];

const outputDir = path.join(__dirname, '..', 'public', 'images', 'pwa');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

function generateIcon(size, filename = null, height = null) {
  const actualHeight = height || size;
  const canvas = createCanvas(size, actualHeight);
  const ctx = canvas.getContext('2d');
  
  // Create gradient background
  const gradient = ctx.createLinearGradient(0, 0, size, actualHeight);
  gradient.addColorStop(0, '#4A90E2');
  gradient.addColorStop(0.5, '#5BA3F5');
  gradient.addColorStop(1, '#6BB6FF');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, actualHeight);
  
  // Add subtle pattern
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < size; i += 20) {
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, actualHeight);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  
  // Add initials or logo
  const fontSize = Math.max(size * 0.25, 16);
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  
  const text = size >= 96 ? 'BL' : 'B';
  ctx.fillText(text, size / 2, actualHeight / 2);
  
  // Add subtle shadow
  ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;
  
  // Create filename
  const finalFilename = filename || `icon-${size}x${actualHeight}.png`;
  const outputPath = path.join(outputDir, finalFilename);
  
  // Save PNG
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outputPath, buffer);
  
  console.log(`Generated: ${finalFilename} (${size}x${actualHeight})`);
}

function generateOGImage() {
  const width = 1200;
  const height = 630;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');
  
  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#4A90E2');
  gradient.addColorStop(0.5, '#5BA3F5');
  gradient.addColorStop(1, '#6BB6FF');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
  
  // Add geometric pattern
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  for (let i = 0; i < width; i += 60) {
    for (let j = 0; j < height; j += 60) {
      ctx.beginPath();
      ctx.arc(i, j, 20, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  
  // Main title
  ctx.font = 'bold 72px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 4;
  
  ctx.fillText('Brandon JP Lambert', width / 2, height / 2 - 40);
  
  // Subtitle
  ctx.font = '36px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.fillText('Educator & Developer', width / 2, height / 2 + 40);
  
  // Save
  const buffer = canvas.toBuffer('image/png');
  const outputPath = path.join(outputDir, 'og-image.jpg');
  fs.writeFileSync(outputPath, buffer);
  
  console.log('Generated: og-image.jpg (1200x630)');
}

function generateScreenshots() {
  // Generate placeholder screenshots for PWA manifest
  const sizes = [
    { name: 'screenshot-wide', width: 1280, height: 800 },
    { name: 'screenshot-narrow', width: 750, height: 1334 }
  ];
  
  sizes.forEach(({ name, width, height }) => {
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // Background
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#f8f9fa');
    gradient.addColorStop(1, '#e9ecef');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    
    // Header area
    ctx.fillStyle = '#4A90E2';
    ctx.fillRect(0, 0, width, Math.min(100, height * 0.15));
    
    // Title
    const fontSize = Math.min(width * 0.04, 48);
    ctx.font = `bold ${fontSize}px Arial, sans-serif`;
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText('Brandon Lambert Portfolio', width / 2, Math.min(60, height * 0.08));
    
    // Content areas
    ctx.fillStyle = '#ffffff';
    const cardHeight = height * 0.2;
    const cardMargin = width * 0.05;
    
    for (let i = 0; i < 3; i++) {
      const y = height * 0.25 + (cardHeight + 20) * i;
      ctx.fillRect(cardMargin, y, width - cardMargin * 2, cardHeight);
      
      // Card content
      ctx.fillStyle = '#6c757d';
      ctx.font = `${fontSize * 0.6}px Arial, sans-serif`;
      ctx.textAlign = 'left';
      ctx.fillText(`Content Section ${i + 1}`, cardMargin + 20, y + 40);
    }
    
    // Save
    const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });
    const outputPath = path.join(outputDir, `${name}.jpg`);
    fs.writeFileSync(outputPath, buffer);
    
    console.log(`Generated: ${name}.jpg (${width}x${height})`);
  });
}

// Main execution
console.log('Generating PWA icons and assets...');

try {
  // Generate standard icon sizes
  iconSizes.forEach(size => {
    generateIcon(size);
  });
  
  // Generate custom icons
  customSizes.forEach(({ name, size, height }) => {
    generateIcon(size, `${name}.png`, height);
  });
  
  // Generate OG image
  generateOGImage();
  
  // Generate screenshots
  generateScreenshots();
  
  console.log('\n✅ PWA icons and assets generated successfully!');
  console.log(`📁 Output directory: ${outputDir}`);
  console.log(`📊 Total files generated: ${iconSizes.length + customSizes.length + 4}`);
  
} catch (error) {
  console.error('❌ Error generating PWA assets:', error.message);
  
  if (error.message.includes('canvas')) {
    console.log('\n💡 To install canvas dependency:');
    console.log('   npm install canvas');
    console.log('   or');
    console.log('   yarn add canvas');
  }
  
  process.exit(1);
}