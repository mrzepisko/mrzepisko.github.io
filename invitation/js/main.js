import { state, allThemes, paletteNamesSorted, currentConfig, applyConfig, fontOptions } from './state.js';
import { generateLayout } from './layout.js';
import { exportCurrentSvg } from './svg-export.js';
import { syncUiFromState, renderPaletteSelect, bindRange } from './ui-controls.js';
import { renderTextLinesEditor, bindTextLinesEvents } from './ui-text-editor.js';
import { renderCustomThemeEditor, bindThemeEditorEvents, syncThemeEditorVisibility, setTempThemeColors, loadCustomThemeColors } from './ui-theme-editor.js';
import { createSketch } from './sketch.js';
import { defaultTextLines } from './constants.js';
import { pageW, pageH } from './constants.js';

// Reassign alphas deterministically from seed + transparentRatio, no RNG consumed from layout
function updateAlphas() {
  state.circles.forEach((c, i) => {
    let h = ((state.seed * 2654435761) >>> 0) + i * 2246822519;
    h = ((h ^ (h >>> 16)) >>> 0);
    h = (Math.imul(h, 0x45d9f3b) >>> 0);
    h = ((h ^ (h >>> 16)) >>> 0);
    const r = h / 0xffffffff;
    if (r < state.transparentRatio) {
      let h2 = (Math.imul(h + 1, 0x45d9f3b) >>> 0);
      h2 = ((h2 ^ (h2 >>> 16)) >>> 0);
      c.alpha = 90 + Math.round((h2 / 0xffffffff) * 90);
    } else {
      c.alpha = 255;
    }
  });
}

// Full layout regeneration — use only when seed/count/sizes/biases change
function redraw() {
  state.circles = generateLayout(state, allThemes());
  updateAlphas();
  recolorInPlace(); // assign colors without saving (redraw saves at the end)
  try { localStorage.setItem('invitation-config', JSON.stringify(currentConfig())); } catch {}
}

// Recolor existing circles using spatial anti-clustering, same logic as generateLayout
function recolorInPlace() {
  if (!state.circles.length) return;
  const palette = allThemes()[state.palette] || Object.values(allThemes())[0];
  const paletteUsage = new Array(palette.length).fill(0);
  for (let i = 0; i < state.circles.length; i++) {
    const c = state.circles[i];
    let colorIndex = 0;
    let bestScore = -1e9;
    for (let cIdx = 0; cIdx < palette.length; cIdx++) {
      let score = -paletteUsage[cIdx] * 0.9;
      for (let j = 0; j < i; j++) {
        const o = state.circles[j];
        if (o.colorIndex !== cIdx) continue;
        const d = Math.hypot(o.x - c.x, o.y - c.y);
        if (d < 180) score -= (180 - d) / 180 * 1.8;
      }
      if (score > bestScore) { bestScore = score; colorIndex = cIdx; }
    }
    c.colorIndex = colorIndex;
    c.color = palette[colorIndex];
    paletteUsage[colorIndex] += 1;
  }
}

function recolor() {
  if (!state.circles.length) { redraw(); return; }
  recolorInPlace();
  try { localStorage.setItem('invitation-config', JSON.stringify(currentConfig())); } catch {}
}

function applyCollapsedGroups() {
  document.querySelectorAll('.group[id]').forEach(group => {
    group.classList.toggle('collapsed', !!state.collapsedGroups[group.id]);
  });
}

function fullSync() {
  syncUiFromState();
  renderTextLinesEditor();
  renderCustomThemeEditor();
  syncThemeEditorVisibility();
  applyCollapsedGroups();
}

// ---- Dark mode ----

function applyDarkMode(dark) {
  state.darkMode = dark;
  document.body.classList.toggle('dark', dark);
  const btn = document.getElementById('darkToggle');
  if (btn) btn.textContent = dark ? 'Light' : 'Dark';
  try { localStorage.setItem('invitation-darkmode', dark ? '1' : '0'); } catch {}
}

// ---- Collapsible groups (all groups with an id, including customThemeGroup) ----

document.querySelectorAll('.group[id] h2').forEach(h2 => {
  const group = h2.closest('.group');
  h2.addEventListener('click', () => {
    if (group.classList.contains('hidden')) return; // don't collapse when group is hidden
    group.classList.toggle('collapsed');
    state.collapsedGroups[group.id] = group.classList.contains('collapsed');
  });
});

// ---- Placement mode toggle ----

document.querySelectorAll('.placement-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    state.placementMode = btn.dataset.mode;
    syncUiFromState();
    redraw();
  });
});

// ---- Layout sliders (affect circle placement → need redraw) ----

bindRange('shapeCount', 'shapeCount', 1, redraw);
bindRange('circleWeight', 'circleWeight', 1, redraw);
bindRange('starWeight', 'starWeight', 1, redraw);
bindRange('heartWeight', 'heartWeight', 1, redraw);
bindRange('triangleWeight', 'triangleWeight', 1, redraw);
bindRange('edgeBias', 'edgeBias', 100, redraw);
bindRange('overlapBias', 'overlapBias', 100, redraw);
bindRange('packingTightness', 'packingTightness', 1, redraw);
bindRange('transparentRatio', 'transparentRatio', 100, () => {
  updateAlphas();
  try { localStorage.setItem('invitation-config', JSON.stringify(currentConfig())); } catch {}
});

// Min/max circle size with cross-enforcement
document.getElementById('minCircleSize').addEventListener('input', e => {
  state.minCircleSize = Number(e.target.value);
  if (state.minCircleSize >= state.maxCircleSize) {
    state.maxCircleSize = Math.min(state.minCircleSize + 1, 140);
  }
  syncUiFromState();
  redraw();
});

document.getElementById('maxCircleSize').addEventListener('input', e => {
  state.maxCircleSize = Number(e.target.value);
  if (state.maxCircleSize <= state.minCircleSize) {
    state.minCircleSize = Math.max(state.maxCircleSize - 1, 6);
  }
  syncUiFromState();
  redraw();
});

// ---- Safe zone sliders (affect visual clipping only → no redraw) ----

bindRange('safeX', 'safeX', 100, null);
bindRange('safeY', 'safeY', 100, null);
bindRange('safeW', 'safeW', 100, null);
bindRange('safeH', 'safeH', 100, null);
bindRange('safeMargin', 'safeMargin', 100, null);

// ---- Seeds ----

document.getElementById('seed').addEventListener('change', e => {
  state.seed = Math.max(1, Number(e.target.value) || 1);
  redraw();
});

document.getElementById('reroll').addEventListener('click', () => {
  state.seed = Math.floor(Math.random() * 999999) + 1;
  syncUiFromState();
  redraw();
});

document.getElementById('redraw').addEventListener('click', redraw);

// ---- Theme (palette change → recolor only, no repositioning) ----

document.getElementById('palette').addEventListener('change', e => {
  state.palette = e.target.value;
  syncThemeEditorVisibility();
  applyCollapsedGroups();
  recolor();
});

document.getElementById('nextTheme').addEventListener('click', () => {
  const names = paletteNamesSorted();
  const idx = names.indexOf(state.palette);
  state.palette = names[(idx + 1 + names.length) % names.length];
  syncUiFromState();
  syncThemeEditorVisibility();
  applyCollapsedGroups();
  recolor();
});

document.getElementById('newCustomTheme').addEventListener('click', () => {
  if (!state.customThemes['custom']) {
    state.customThemes['custom'] = ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#00b0ff', '#7c4dff'];
  }
  state.palette = 'custom';
  renderPaletteSelect();
  syncThemeEditorVisibility();
  applyCollapsedGroups();
  recolor();
});

// ---- Custom theme import/export ----

document.getElementById('exportTheme').addEventListener('click', () => {
  const colors = state.customThemes['custom'];
  if (!colors) return;
  const blob = new Blob([JSON.stringify({ name: 'custom', colors }, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'custom-theme.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById('importTheme').addEventListener('click', () => document.getElementById('importThemeFile').click());
document.getElementById('importThemeFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    const data = JSON.parse(await file.text());
    const valid = (Array.isArray(data.colors) ? data.colors : []).filter(c => /^#[0-9a-fA-F]{6}$/.test(c));
    if (valid.length < 2) throw new Error('need 2+ colors');
    state.customThemes['custom'] = valid;
    setTempThemeColors(valid);
    if (state.palette !== 'custom') {
      state.palette = 'custom';
      renderPaletteSelect();
      syncThemeEditorVisibility();
      applyCollapsedGroups();
    } else {
      loadCustomThemeColors();
    }
    recolor();
  } catch {
    alert('Failed to import theme JSON.');
  }
  e.target.value = '';
});

// ---- Misc controls ----

document.getElementById('showGuides').addEventListener('change', e => { state.showGuides = e.target.checked; });
document.getElementById('toggleSafe').addEventListener('click', () => { state.showSafe = !state.showSafe; });
document.getElementById('centerSafe').addEventListener('click', () => {
  state.safeX = 0.5; state.safeY = 0.5; syncUiFromState();
  // No redraw — safe zone doesn't affect circle positions
});

document.getElementById('exportSvg').addEventListener('click', () => exportCurrentSvg(state, allThemes()));

document.getElementById('randomizeAll').addEventListener('click', () => {
  const ri = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  state.shapeCount = ri(20, 240);
  state.circleWeight = ri(0, 100);
  state.starWeight = ri(0, 100);
  state.heartWeight = ri(0, 100);
  state.triangleWeight = ri(0, 100);
  state.minCircleSize = ri(6, 79);
  state.maxCircleSize = ri(state.minCircleSize + 1, 140);
  state.edgeBias = ri(0, 100) / 100;
  state.overlapBias = ri(0, 100) / 100;
  state.packingTightness = ri(0, 100);
  state.transparentRatio = ri(0, 100) / 100;
  syncUiFromState();
  redraw();
});
document.getElementById('darkToggle').addEventListener('click', () => applyDarkMode(!state.darkMode));
document.getElementById('mobileExportSvg').addEventListener('click', () => exportCurrentSvg(state, allThemes()));
document.getElementById('mobileRandomizeAll').addEventListener('click', () => document.getElementById('randomizeAll').click());

// ---- Save / Load config ----

document.getElementById('saveConfig').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify(currentConfig(), null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'invitation-config-' + String(state.palette).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() + '-seed-' + state.seed + '.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
});

document.getElementById('loadConfig').addEventListener('click', () => document.getElementById('loadConfigFile').click());
document.getElementById('loadConfigFile').addEventListener('change', async e => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;
  try {
    applyConfig(JSON.parse(await file.text()), {
      onThemesChanged: () => { renderPaletteSelect(); syncThemeEditorVisibility(); applyCollapsedGroups(); },
      onStateChanged: () => { fullSync(); applyDarkMode(state.darkMode); },
      onLayoutNeeded: redraw
    });
  } catch {
    alert('Failed to load config JSON.');
  }
  e.target.value = '';
});

// ---- Fonts / Text ----

document.getElementById('fontListSource').addEventListener('change', e => {
  state.fontListSource = e.target.value;
  renderTextLinesEditor();
});

document.getElementById('applyFontsToAll').addEventListener('click', () => {
  const base = fontOptions()[0];
  state.textLines.forEach(line => { line.font = base; });
  renderTextLinesEditor();
});

document.getElementById('normalizeSizes').addEventListener('click', () => {
  state.textLines.forEach(line => {
    if (line.text.trim() === '') line.size = 12;
    else if (line.size > 28) line.size = 34;
    else line.size = 18;
  });
  renderTextLinesEditor();
});

document.getElementById('addTextLine').addEventListener('click', () => {
  state.textLines.push({ text: 'new line', font: fontOptions()[0], size: 18, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 0 });
  renderTextLinesEditor();
});

document.getElementById('addBlankLine').addEventListener('click', () => {
  state.textLines.push({ text: '', font: fontOptions()[0], size: 12, weight: 400, italic: false, tracking: 0, caps: false, gapAfter: 0 });
  renderTextLinesEditor();
});

document.getElementById('resetTextLines').addEventListener('click', () => {
  state.textLines = JSON.parse(JSON.stringify(defaultTextLines));
  renderTextLinesEditor();
});

bindTextLinesEvents(redraw);
// Custom theme color changes: recolor only, don't move circles
bindThemeEditorEvents(() => { renderPaletteSelect(); syncThemeEditorVisibility(); recolor(); });

// ---- Session restore ----

try {
  const saved = localStorage.getItem('invitation-config');
  if (saved) applyConfig(JSON.parse(saved), {
    onThemesChanged: renderPaletteSelect,
    onStateChanged: fullSync,
  });
} catch {}

fullSync();

// ---- Dark mode restore ----

try {
  const stored = localStorage.getItem('invitation-darkmode');
  applyDarkMode(stored !== null ? stored === '1' : state.darkMode);
} catch {}

// ---- Zoom (CSS dimension-based, no transform) ----

let zoom = 1.0;
let fitMode = false;

function isMobileLayout() {
  return window.matchMedia(
    '(max-width: 767px), (orientation: landscape) and (max-height: 550px)'
  ).matches;
}

function fitZoom() {
  const panelW = isMobileLayout() ? 0 : 360;
  const pad = 40;
  const zoomBarEl = document.getElementById('zoom-bar');
  const overhead = (zoomBarEl ? zoomBarEl.offsetHeight + 12 : 0) + 20;
  const availW = window.innerWidth - panelW - pad;
  const availH = window.innerHeight - pad - overhead;
  return Math.min(availW / pageW, availH / pageH, 1);
}

let saveZoomTimer = 0;
function saveZoom() {
  clearTimeout(saveZoomTimer);
  saveZoomTimer = setTimeout(() => {
    try { localStorage.setItem('invitation-zoom', JSON.stringify({ fitMode, zoom })); } catch {}
  }, 300);
}

function applyZoom(z) {
  zoom = Math.max(0.1, z);
  const canvas = document.querySelector('#canvas-host canvas');
  if (canvas) {
    canvas.style.width = (pageW * zoom) + 'px';
    canvas.style.height = (pageH * zoom) + 'px';
  }
  const pct = Math.round(zoom * 100);
  document.getElementById('zoomSlider').value = String(pct);
  document.getElementById('zoomValue').textContent = pct + '%';
  saveZoom();
}

// ---- Panel toggle (mobile) ----

const panel = document.querySelector('.panel');

document.getElementById('panel-toggle').addEventListener('click', () => {
  panel.classList.add('panel-open');
});

document.getElementById('panel-close').addEventListener('click', () => {
  panel.classList.remove('panel-open');
});

document.getElementById('zoomSlider').addEventListener('input', e => {
  fitMode = false;
  applyZoom(Number(e.target.value) / 100);
});

document.getElementById('zoomFit').addEventListener('click', () => {
  fitMode = true;
  applyZoom(fitZoom());
});

document.getElementById('zoom100').addEventListener('click', () => {
  fitMode = false;
  applyZoom(1);
});

window.addEventListener('resize', () => {
  if (fitMode) applyZoom(fitZoom());
  if (!isMobileLayout()) panel.classList.remove('panel-open');
});

// Defer p5 init to 'load' so readyState === 'complete', ensuring p5 runs setup()
// synchronously — the canvas exists before applyZoom is called.
window.addEventListener('load', () => {
  // eslint-disable-next-line no-undef
  new p5(createSketch(redraw, syncUiFromState), document.getElementById('canvas-host'));

  // Canvas now exists. Restore zoom; default to fit.
  try {
    const saved = JSON.parse(localStorage.getItem('invitation-zoom') || 'null');
    if (saved && !saved.fitMode) {
      fitMode = false;
      applyZoom(saved.zoom);
    } else {
      fitMode = true;
      applyZoom(fitZoom());
    }
  } catch {
    fitMode = true;
    applyZoom(fitZoom());
  }
});
