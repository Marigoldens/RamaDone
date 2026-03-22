const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'components', 'Gym', 'GymView.jsx');
let code = fs.readFileSync(targetPath, 'utf8');

// Replace standard colors
code = code.replace(/bg-\[#0a0a0a\]/g, 'bg-background');
code = code.replace(/bg-\[#141414\]/g, 'bg-surface');
code = code.replace(/text-white(?!\/)/g, 'text-primary');

// Opacities of white
code = code.replace(/text-white\/[78]0/g, 'text-secondary');
code = code.replace(/text-white\/[2345]0/g, 'text-muted');
code = code.replace(/border-white\/(5|10|20|30|40|50)/g, 'border-border');

// Handle bg-white/X combinations.
code = code.replace(/hover:bg-white\/[0-9]+/g, 'hover:bg-surface-elevated');
code = code.replace(/group-hover:bg-white\/[0-9]+/g, 'group-hover:bg-surface-elevated');
code = code.replace(/active:bg-white\/[0-9]+/g, 'active:bg-surface-elevated');
code = code.replace(/bg-white\/[0-9]+/g, 'bg-surface-elevated');
code = code.replace(/hover:border-white\/[0-9]+/g, 'hover:border-border');
code = code.replace(/focus:border-white\/[0-9]+/g, 'focus:border-border');

// Replace custom gradients and specific brand colors
code = code.replace(/from-purple-[456]00/g, 'from-brand');
code = code.replace(/to-pink-[456]00/g, 'to-accent');
code = code.replace(/text-purple-[34]00/g, 'text-brand');
code = code.replace(/bg-purple-500\/10/g, 'bg-brand/10');
code = code.replace(/bg-purple-500\/20/g, 'bg-brand/20');
code = code.replace(/bg-purple-500/g, 'bg-brand');
code = code.replace(/border-purple-500/g, 'border-brand');
code = code.replace(/shadow-\[0_0_15px_rgba\(168,85,247,0\.4\)]/g, 'shadow-lg shadow-brand/20');
code = code.replace(/shadow-\[0_4px_20px_rgba\(168,85,247,0\.3\)]/g, 'shadow-xl shadow-brand/20');

// Additional adjustments
code = code.replace(/bg-clip-text text-transparent bg-gradient-to-r from-white to-white\/70/g, 'bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary');
code = code.replace(/shadow-purple-500\/20/g, 'shadow-brand/20');
code = code.replace(/focus:border-purple-500\/50/g, 'focus:border-brand/50');
code = code.replace(/text-red-400/g, 'text-red-500'); // Standardize reds
code = code.replace(/bg-red-[45]00\/[12]0/g, 'bg-red-500/10');
code = code.replace(/border-red-500\/[12]0/g, 'border-red-500/20');
code = code.replace(/hover:bg-red-500\/[12]0/g, 'hover:bg-red-500/20');

// Re-write
fs.writeFileSync(targetPath, code, 'utf8');
console.log('Updated GymView.jsx');
