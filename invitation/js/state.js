import { builtinThemes, defaultTextLines, safeFontStacks, extendedFontStacks } from './constants.js';

export const state = {
  seed: 12345,
  shapeCount: 88,
  circleWeight: 25,
  starWeight: 25,
  heartWeight: 25,
  triangleWeight: 25,
  safeX: 0.52,
  safeY: 0.50,
  safeW: 0.42,
  safeH: 0.64,
  safeMargin: 0.08,
  edgeBias: 0.82,
  overlapBias: 0.34,
  transparentRatio: 0.42,
  minCircleSize: 20,
  maxCircleSize: 58,
  packingTightness: 42,
  showGuides: true,
  showSafe: true,
  palette: 'confetti',
  circles: [],
  dragMode: null,
  dragStart: null,
  safeStart: null,
  fontListSource: 'safe',
  textLines: JSON.parse(JSON.stringify(defaultTextLines)),
  customThemes: {},
  collapsedGroups: {},
  placementMode: 'edge',
  darkMode: false
};

export function allThemes() {
  return { ...builtinThemes, ...state.customThemes };
}

export function paletteNamesSorted() {
  return Object.keys(allThemes()).sort((a, b) => a.localeCompare(b));
}

export function fontOptions() {
  return state.fontListSource === 'extended' ? extendedFontStacks : safeFontStacks;
}

export function currentConfig() {
  return {
    version: 2,
    seed: state.seed,
    shapeCount: state.shapeCount,
    circleWeight: state.circleWeight,
    starWeight: state.starWeight,
    heartWeight: state.heartWeight,
    triangleWeight: state.triangleWeight,
    safeX: state.safeX,
    safeY: state.safeY,
    safeW: state.safeW,
    safeH: state.safeH,
    safeMargin: state.safeMargin,
    edgeBias: state.edgeBias,
    overlapBias: state.overlapBias,
    transparentRatio: state.transparentRatio,
    minCircleSize: state.minCircleSize,
    maxCircleSize: state.maxCircleSize,
    packingTightness: state.packingTightness,
    showGuides: state.showGuides,
    showSafe: state.showSafe,
    darkMode: state.darkMode,
    palette: state.palette,
    fontListSource: state.fontListSource,
    textLines: JSON.parse(JSON.stringify(state.textLines)),
    customThemes: JSON.parse(JSON.stringify(state.customThemes)),
    collapsedGroups: JSON.parse(JSON.stringify(state.collapsedGroups)),
    placementMode: state.placementMode
  };
}

export function applyConfig(cfg, { onThemesChanged, onStateChanged, onLayoutNeeded } = {}) {
  if (!cfg || typeof cfg !== 'object') return;
  const numeric = ['seed','shapeCount','circleWeight','starWeight','heartWeight','triangleWeight','safeX','safeY','safeW','safeH','safeMargin','edgeBias','overlapBias','transparentRatio','minCircleSize','maxCircleSize','packingTightness'];
  for (const k of numeric) if (typeof cfg[k] === 'number' && Number.isFinite(cfg[k])) state[k] = cfg[k];
  if (typeof cfg.circleCount === 'number' && !('shapeCount' in cfg)) state.shapeCount = cfg.circleCount;
  if (typeof cfg.showGuides === 'boolean') state.showGuides = cfg.showGuides;
  if (typeof cfg.showSafe === 'boolean') state.showSafe = cfg.showSafe;
  if (typeof cfg.darkMode === 'boolean') state.darkMode = cfg.darkMode;
  if (typeof cfg.fontListSource === 'string') state.fontListSource = cfg.fontListSource;
  if (cfg.customThemes && typeof cfg.customThemes === 'object') state.customThemes = JSON.parse(JSON.stringify(cfg.customThemes));
  if (onThemesChanged) onThemesChanged();
  if (typeof cfg.palette === 'string' && allThemes()[cfg.palette]) state.palette = cfg.palette;
  if (Array.isArray(cfg.textLines) && cfg.textLines.length) state.textLines = JSON.parse(JSON.stringify(cfg.textLines));
  if (cfg.collapsedGroups && typeof cfg.collapsedGroups === 'object') state.collapsedGroups = { ...cfg.collapsedGroups };
  if (cfg.placementMode === 'uniform' || cfg.placementMode === 'edge') state.placementMode = cfg.placementMode;
  if (onStateChanged) onStateChanged();
  if (onLayoutNeeded) onLayoutNeeded();
}
