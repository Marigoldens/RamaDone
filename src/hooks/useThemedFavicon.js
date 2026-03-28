import { useEffect } from 'react';

// All 11 theme color mappings for favicons and meta theme-color
export const THEME_COLORS = {
  // Light themes
  default: { primary: '#2563eb' },
  latte: { primary: '#fe640b' },
  dawn: { primary: '#ea9d34' },
  mint: { primary: '#0d9488' },
  lavender: { primary: '#a855f7' },
  
  // Dark themes  
  obsidian: { primary: '#60a5fa' },
  nord: { primary: '#88c0d0' },
  tokyo: { primary: '#7aa2f7' },
  dracula: { primary: '#ff79c6' },
  gruvbox: { primary: '#fe8019' },
  blade: { primary: '#dc2626' },
};

/**
 * Generate an inline SVG data URL for the favicon
 * This bypasses browser caching entirely
 */
function generateFaviconSVG(color) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
    <rect width="100" height="100" rx="22" fill="${color}"/>
    <rect width="100" height="100" rx="22" fill="url(#o)"/>
    <defs>
      <linearGradient id="o" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="white" stop-opacity="0.15"/>
        <stop offset="100%" stop-color="black" stop-opacity="0.1"/>
      </linearGradient>
    </defs>
    <path d="M50,22 Q56,30 68,50 Q56,70 50,78 Q44,70 32,50 Q44,30 50,22 Z" fill="white" fill-opacity="0.95"/>
    <circle cx="50" cy="50" r="10" fill="white" fill-opacity="0.5"/>
  </svg>`;
  
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Hook to dynamically update favicon, apple-touch-icon, and theme-color based on active theme
 * Uses inline SVG data URLs to bypass browser caching
 */
export function useThemedFavicon(themeName = 'default') {
  useEffect(() => {
    const theme = THEME_COLORS[themeName] || THEME_COLORS.default;
    const iconDataUrl = generateFaviconSVG(theme.primary);
    
    // 1. Force favicon reload by removing and re-adding
    const existingFavicon = document.querySelector('link[rel="icon"]');
    if (existingFavicon) {
      existingFavicon.remove();
    }
    
    const faviconLink = document.createElement('link');
    faviconLink.rel = 'icon';
    faviconLink.type = 'image/svg+xml';
    faviconLink.href = iconDataUrl;
    document.head.appendChild(faviconLink);
    
    // 2. Force apple-touch-icon reload
    const existingApple = document.querySelector('link[rel="apple-touch-icon"]');
    if (existingApple) {
      existingApple.remove();
    }
    
    const appleTouchIcon = document.createElement('link');
    appleTouchIcon.rel = 'apple-touch-icon';
    appleTouchIcon.href = iconDataUrl;
    document.head.appendChild(appleTouchIcon);
    
    // 3. Update theme-color meta tag
    let themeColorMeta = document.querySelector('meta[name="theme-color"]');
    if (!themeColorMeta) {
      themeColorMeta = document.createElement('meta');
      themeColorMeta.name = 'theme-color';
      document.head.appendChild(themeColorMeta);
    }
    themeColorMeta.content = theme.primary;
    
    // 4. Update apple-mobile-web-app-status-bar-style
    let appleStatusMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusMeta) {
      const isDarkTheme = ['obsidian', 'nord', 'tokyo', 'dracula', 'gruvbox', 'blade'].includes(themeName);
      appleStatusMeta.content = isDarkTheme ? 'black-translucent' : 'default';
    }
    
    // 5. Update msapplication-TileColor
    let msTileColor = document.querySelector('meta[name="msapplication-TileColor"]');
    if (!msTileColor) {
      msTileColor = document.createElement('meta');
      msTileColor.name = 'msapplication-TileColor';
      document.head.appendChild(msTileColor);
    }
    msTileColor.content = theme.primary;
    
    // 6. Store theme preference
    try {
      localStorage.setItem('pwa-theme', themeName);
    } catch (e) {}
    
  }, [themeName]);
}

/**
 * Generate a PNG icon using canvas
 */
export function generateIconPNG(primaryColor, size = 192) {
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

/**
 * Download generated icon as PNG file
 */
export function downloadIcon(dataUrl, filename) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

