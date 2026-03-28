// Node.js script to generate PNG icons for all themes
// Run with: node scripts/generate-icons-node.js

const fs = require('fs');
const path = require('path');

const themes = [
  { name: 'icon-default', color: '#2563eb' },
  { name: 'icon-latte', color: '#fe640b' },
  { name: 'icon-dawn', color: '#ea9d34' },
  { name: 'icon-mint', color: '#0d9488' },
  { name: 'icon-lavender', color: '#a855f7' },
  { name: 'icon-obsidian', color: '#60a5fa' },
  { name: 'icon-nord', color: '#88c0d0' },
  { name: 'icon-tokyo', color: '#7aa2f7' },
  { name: 'icon-dracula', color: '#ff79c6' },
  { name: 'icon-gruvbox', color: '#fe8019' },
  { name: 'icon-blade', color: '#dc2626' },
];

// Create SVG icons (browsers support SVG, and we can convert or use directly)
function generateSVG(color, size = 192) {
  const radius = size * 0.22;
  const s = size * 0.28;
  const cx = size / 2;
  const cy = size / 2;
  
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs>
    <linearGradient id="overlay" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:white;stop-opacity:0.15"/>
      <stop offset="100%" style="stop-color:black;stop-opacity:0.1"/>
    </linearGradient>
  </defs>
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="${color}"/>
  <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#overlay)"/>
  <path d="M${cx},${cy - s} Q${cx + s * 0.3},${cy - s * 0.3} ${cx + s},${cy} Q${cx + s * 0.3},${cy + s * 0.3} ${cx},${cy + s} Q${cx - s * 0.3},${cy + s * 0.3} ${cx - s},${cy} Q${cx - s * 0.3},${cy - s * 0.3} ${cx},${cy - s} Z" fill="white" fill-opacity="0.95"/>
  <circle cx="${cx}" cy="${cy}" r="${s * 0.35}" fill="white" fill-opacity="0.5"/>
</svg>`;
}

// Create PNG data URL using base64 encoding of SVG
function svgToPNGDataURL(svg, size = 192) {
  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

// Main execution
const iconsDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure directory exists
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

console.log('🎨 Generating RamaDone icons...\n');

themes.forEach(theme => {
  const svg = generateSVG(theme.color, 192);
  const svgPath = path.join(iconsDir, `${theme.name}.svg`);
  
  fs.writeFileSync(svgPath, svg);
  console.log(`✅ Created ${theme.name}.svg`);
});

console.log('\n✨ Done! SVG icons created in public/icons/');
console.log('Note: SVG icons work in all modern browsers and PWAs.');
