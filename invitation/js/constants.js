export const pageW = 840;
export const pageH = 1188;

export const safeFontStacks = [
  'Liberation Serif, DejaVu Serif, serif',
  'DejaVu Serif, serif',
  'Noto Serif, serif',
  'Liberation Sans, DejaVu Sans, sans-serif',
  'DejaVu Sans, sans-serif',
  'Noto Sans, sans-serif',
  'URW Chancery L, TeX Gyre Chorus, cursive',
  'TeX Gyre Chorus, cursive',
  'monospace'
];

export const extendedFontStacks = [
  ...safeFontStacks,
  'Inter, system-ui, sans-serif',
  'system-ui, sans-serif',
  'Arial, Helvetica, sans-serif',
  'Helvetica, Arial, sans-serif',
  'Times New Roman, Times, serif',
  'Georgia, serif',
  'Palatino, serif',
  'Garamond, serif',
  'Verdana, sans-serif',
  'Trebuchet MS, sans-serif',
  'Courier New, monospace'
];

export const builtinThemes = {
  confetti: ['#ff1744','#ff9100','#ffea00','#00e676','#00b0ff','#7c4dff','#ff4081','#ff5252','#18ffff','#c6ff00'],
  spring: ['#ff5c8a','#ffb000','#d4ff00','#4cffb0','#40c4ff','#b388ff','#ff80ab','#ffd740','#69f0ae','#ea80fc'],
  berries: ['#d50057','#ff1744','#ff6d00','#ffea00','#aa00ff','#7c4dff','#ff4081','#f50057','#ff8a80','#ffd180'],
  ocean: ['#00b8ff','#00e5ff','#2979ff','#00e676','#76ff03','#18ffff','#40c4ff','#448aff','#64ffda','#ffd600'],
  mono: ['#111827','#374151','#6b7280','#9ca3af','#d1d5db','#ff1744','#ff616f','#f9fafb','#d50000','#e5e7eb'],
  pastel: ['#ff9ec4','#ffbe98','#fff275','#b8ff7a','#7adfff','#c8a2ff','#ffb3de','#b9cfff','#ffe38a','#c7ffd8'],
  earth: ['#c62828','#ef6c00','#f9a825','#c0ca33','#43a047','#00897b','#1e88e5','#8e24aa','#ff7043','#ffd54f'],
  candy: ['#ff1744','#ff4081','#ff80ab','#ea80fc','#b388ff','#8c9eff','#80d8ff','#18ffff','#69f0ae','#ffd740'],
  jewel: ['#f50057','#d500f9','#651fff','#3d5afe','#00b0ff','#00e5ff','#00e676','#76ff03','#ffea00','#ff6d00'],
  sunset: ['#ff1744','#ff5252','#ff6d00','#ff9100','#ffd600','#ff4081','#ff80ab','#ffab40','#ffea00','#ff8a65'],
  botanical: ['#00c853','#64dd17','#aeea00','#ffd600','#ffab00','#ff6d00','#00e5ff','#00b0ff','#69f0ae','#b2ff59'],
  nordic: ['#00b0ff','#40c4ff','#80d8ff','#18ffff','#64ffda','#69f0ae','#b2ff59','#ffd740','#ffab40','#ff6e40'],
  ember: ['#ff6d00','#ff9100','#ff3d00','#ffd600','#ff5722','#ffab40','#ff8f00','#ffca28','#ef5350','#ff7043'],
  midnight: ['#e040fb','#d500f9','#aa00ff','#b388ff','#536dfe','#40c4ff','#ea80fc','#9575cd','#80d8ff','#ce93d8'],
  neon: ['#ff0080','#ff4000','#ffff00','#00ff80','#00ffff','#0080ff','#8000ff','#ff00ff','#80ff00','#ff8000'],
  aurora: ['#00e5ff','#00bcd4','#69f0ae','#76ff03','#40c4ff','#00e676','#64ffda','#b2ff59','#18ffff','#84ffff']
};

export const defaultTextLines = [
  { text: 'Lorem ipsum', font: safeFontStacks[0], size: 18, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 20 },
  { text: '', font: safeFontStacks[0], size: 12, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 0 },
  { text: 'Person One and', font: safeFontStacks[0], size: 34, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 0 },
  { text: 'Person Two', font: safeFontStacks[0], size: 34, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 20 },
  { text: 'lorem ipsum', font: safeFontStacks[0], size: 18, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 0 },
  { text: 'ALLCAPS LOREM IPSUM', font: safeFontStacks[3], size: 18, weight: 700, italic: false, tracking: 2.6, caps: true, gapAfter: 0 },
  { text: 'lorem ipsum', font: safeFontStacks[0], size: 18, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 0 },
  { text: 'date and hour', font: safeFontStacks[0], size: 18, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 0 },
  { text: 'at the place in city', font: safeFontStacks[6], size: 20, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 0 }
];
