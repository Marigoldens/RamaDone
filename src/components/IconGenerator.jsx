import { useState, useCallback } from 'react';
import { THEME_COLORS, generateIconPNG, downloadIcon } from '../hooks/useThemedFavicon';

/**
 * Temporary Icon Generator Component for all 11 themes
 */
export default function IconGenerator() {
  const [generated, setGenerated] = useState([]);

  const generateAllIcons = useCallback(() => {
    const themes = [
      { name: 'icon-default', color: '#2563eb', label: 'Paper White' },
      { name: 'icon-latte', color: '#fe640b', label: 'Latte' },
      { name: 'icon-dawn', color: '#ea9d34', label: 'Dawn' },
      { name: 'icon-mint', color: '#0d9488', label: 'Mint' },
      { name: 'icon-lavender', color: '#a855f7', label: 'Lavender' },
      { name: 'icon-obsidian', color: '#60a5fa', label: 'Obsidian' },
      { name: 'icon-nord', color: '#88c0d0', label: 'Nord' },
      { name: 'icon-tokyo', color: '#7aa2f7', label: 'Tokyo Night' },
      { name: 'icon-dracula', color: '#ff79c6', label: 'Dracula' },
      { name: 'icon-gruvbox', color: '#fe8019', label: 'Gruvbox' },
      { name: 'icon-blade', color: '#dc2626', label: 'Blade' },
    ];

    const results = [];
    
    themes.forEach((theme, index) => {
      setTimeout(() => {
        const dataUrl = generateIconPNG(theme.color, 192);
        downloadIcon(dataUrl, `${theme.name}.png`);
        results.push(theme.name);
        setGenerated([...results]);
      }, index * 300);
    });
  }, []);

  const previewThemes = [
    { name: 'icon-default', label: 'Paper White', color: '#2563eb' },
    { name: 'icon-latte', label: 'Latte', color: '#fe640b' },
    { name: 'icon-dawn', label: 'Dawn', color: '#ea9d34' },
    { name: 'icon-mint', label: 'Mint', color: '#0d9488' },
    { name: 'icon-lavender', label: 'Lavender', color: '#a855f7' },
    { name: 'icon-obsidian', label: 'Obsidian', color: '#60a5fa' },
    { name: 'icon-nord', label: 'Nord', color: '#88c0d0' },
    { name: 'icon-tokyo', label: 'Tokyo Night', color: '#7aa2f7' },
    { name: 'icon-dracula', label: 'Dracula', color: '#ff79c6' },
    { name: 'icon-gruvbox', label: 'Gruvbox', color: '#fe8019' },
    { name: 'icon-blade', label: 'Blade', color: '#dc2626' },
  ];

  return (
    <div style={{ 
      padding: '2rem', 
      background: 'var(--c-surface)', 
      color: 'var(--c-text)',
      fontFamily: 'Inter, sans-serif'
    }}>
      <h2 style={{ marginBottom: '1rem' }}>🎨 Icon Generator - 11 Themes</h2>
      <p style={{ marginBottom: '1.5rem', color: 'var(--c-text-muted)' }}>
        Generate PNG icons for all 11 color themes. Click below to download all files, 
        then move them to <code>/public/icons/</code>.
      </p>
      
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          onClick={generateAllIcons}
          style={{
            padding: '0.75rem 1.5rem',
            background: 'linear-gradient(135deg, var(--c-accent), var(--c-primary))',
            color: 'white',
            border: 'none',
            borderRadius: '0.75rem',
            fontWeight: '600',
            cursor: 'pointer',
          }}
        >
          Generate All 11 Icons
        </button>
      </div>

      {generated.length > 0 && (
        <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'var(--c-surface-elevated)', borderRadius: '0.5rem' }}>
          <p style={{ margin: 0, color: '#22c55e' }}>
            ✅ Generated {generated.length}/11: {generated.join(', ')}
          </p>
        </div>
      )}

      <h3 style={{ marginBottom: '1rem' }}>Icon Preview</h3>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', 
        gap: '1rem' 
      }}>
        {previewThemes.map(({ name, label, color }) => (
          <IconPreview key={name} name={name} label={label} color={color} />
        ))}
      </div>
    </div>
  );
}

function IconPreview({ name, label, color }) {
  const canvasRef = useCallback((node) => {
    if (node) {
      const ctx = node.getContext('2d');
      const size = 96;
      node.width = size;
      node.height = size;
      
      // Rounded rect
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
      ctx.fillStyle = color;
      ctx.fill();
      
      // Add subtle gradient overlay
      const gradient = ctx.createLinearGradient(0, 0, size, size);
      gradient.addColorStop(0, 'rgba(255,255,255,0.15)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.1)');
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Draw diamond
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = 0.95;
      const cx = size / 2;
      const cy = size / 2;
      const s = size * 0.28;
      
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.quadraticCurveTo(cx + s * 0.3, cy - s * 0.3, cx + s, cy);
      ctx.quadraticCurveTo(cx + s * 0.3, cy + s * 0.3, cx, cy + s);
      ctx.quadraticCurveTo(cx - s * 0.3, cy + s * 0.3, cx - s, cy);
      ctx.quadraticCurveTo(cx - s * 0.3, cy - s * 0.3, cx, cy - s);
      ctx.closePath();
      ctx.fill();
      
      // Center highlight
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.fill();
    }
  }, [color]);

  return (
    <div style={{ textAlign: 'center' }}>
      <canvas
        ref={canvasRef}
        style={{
          width: '72px',
          height: '72px',
          borderRadius: '16px',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      />
      <p style={{ 
        marginTop: '0.5rem', 
        fontSize: '0.75rem', 
        fontWeight: 500,
        color: 'var(--c-text)'
      }}>
        {label}
      </p>
      <code style={{ 
        fontSize: '0.65rem', 
        color: 'var(--c-text-muted)',
        background: 'var(--c-surface-elevated)',
        padding: '0.2rem 0.4rem',
        borderRadius: '0.25rem'
      }}>
        {name}.png
      </code>
    </div>
  );
}
