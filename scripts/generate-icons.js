/**
 * Icon Generator Script for RamaDone - All 11 Themes
 * Run this in the browser console to generate all themed PNG icons
 */

function generateIcon(primaryColor, size = 192) {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  
  // Create rounded rectangle path
  const radius = size * 0.22;
  
  ctx.beginPath();
  ctx.moveTo(radius, 0);
  ctx.lineTo(size - radius, 0);
  ctx.quadraticCurveTo(size, 0, size, radius);
  ctx.lineTo(size, size - radius);
  ctx.quadraticCurveTo(size, size, size - radius, size);
  ctx.lineTo(radius, size);
  ctx.quadraticCurveTo(0, size, 0, size - radius);
  ctx.lineTo(0, radius);
  ctx.quadraticCurveTo(0, 0, radius, 0);
  ctx.closePath();
  
  // Fill with primary color
  ctx.fillStyle = primaryColor;
  ctx.fill();
  
  // Add subtle gradient overlay
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, 'rgba(255,255,255,0.15)');
  gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
  ctx.fillStyle = gradient;
  ctx.fill();
  
  // Add sparkle/diamond shape in white
  ctx.fillStyle = '#ffffff';
  ctx.globalAlpha = 0.95;
  
  const cx = size / 2;
  const cy = size / 2;
  const s = size * 0.28;
  
  // Draw diamond
  ctx.beginPath();
  ctx.moveTo(cx, cy - s);
  ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.3, cx + s, cy);
  ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.3, cx, cy + s);
  ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.3, cx - s, cy);
  ctx.quadraticCurveTo(cx - s * 0.3, cy - s * 0.3, cx, cy - s);
  ctx.closePath();
  ctx.fill();
  
  // Add center highlight dot
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.fill();
  
  return canvas.toDataURL('image/png');
}

function downloadIcon(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// All 11 themes with their primary accent colors
const themes = [
  { name: 'icon-default', color: '#2563eb', label: 'Paper White' },      // Blue
  { name: 'icon-latte', color: '#fe640b', label: 'Latte' },              // Orange
  { name: 'icon-dawn', color: '#ea9d34', label: 'Dawn' },                 // Peach
  { name: 'icon-mint', color: '#0d9488', label: 'Mint' },                // Teal
  { name: 'icon-lavender', color: '#a855f7', label: 'Lavender' },        // Purple
  { name: 'icon-obsidian', color: '#60a5fa', label: 'Obsidian' },         // Light Blue
  { name: 'icon-nord', color: '#88c0d0', label: 'Nord' },                // Arctic Blue
  { name: 'icon-tokyo', color: '#7aa2f7', label: 'Tokyo Night' },        // Cornflower
  { name: 'icon-dracula', color: '#ff79c6', label: 'Dracula' },           // Pink
  { name: 'icon-gruvbox', color: '#fe8019', label: 'Gruvbox' },          // Orange
  { name: 'icon-blade', color: '#dc2626', label: 'Blade' },               // Red
];

console.log('🎨 Generating 11 RamaDone themed icons...');

themes.forEach((theme, index) => {
  setTimeout(() => {
    const dataUrl = generateIcon(theme.color, 192);
    downloadIcon(dataUrl, `${theme.name}.png`);
    console.log(`✅ Generated ${theme.name}.png (${theme.label})`);
  }, index * 300);
});

console.log('⏳ Icons downloading... Check your Downloads folder.');
console.log('📁 After download, move all .png files to /public/icons/');
