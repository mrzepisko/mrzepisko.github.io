import { state, allThemes, paletteNamesSorted } from './state.js';

export function syncRange(id, raw, labelId, suffix = '') {
  const el = document.getElementById(id);
  const out = document.getElementById(labelId);
  if (el) el.value = String(raw);
  if (out) out.textContent = String(raw) + suffix;
}

export function renderPaletteSelect() {
  const sel = document.getElementById('palette');
  const current = state.palette;
  sel.innerHTML = '';
  for (const name of paletteNamesSorted()) {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    sel.appendChild(opt);
  }
  if (!allThemes()[current]) state.palette = paletteNamesSorted()[0];
  sel.value = state.palette;
}

export function syncUiFromState() {
  document.getElementById('seed').value = state.seed;
  syncRange('shapeCount', state.shapeCount, 'shapeCountValue');
  syncRange('minCircleSize', state.minCircleSize, 'minCircleSizeValue');
  syncRange('maxCircleSize', state.maxCircleSize, 'maxCircleSizeValue');
  syncRange('safeX', Math.round(state.safeX * 100), 'safeXValue', '%');
  syncRange('safeY', Math.round(state.safeY * 100), 'safeYValue', '%');
  syncRange('safeW', Math.round(state.safeW * 100), 'safeWValue', '%');
  syncRange('safeH', Math.round(state.safeH * 100), 'safeHValue', '%');
  syncRange('safeMargin', Math.round(state.safeMargin * 100), 'safeMarginValue', '%');
  syncRange('edgeBias', Math.round(state.edgeBias * 100), 'edgeBiasValue');
  syncRange('overlapBias', Math.round(state.overlapBias * 100), 'overlapBiasValue');
  syncRange('packingTightness', state.packingTightness, 'packingTightnessValue');
  syncRange('transparentRatio', Math.round(state.transparentRatio * 100), 'transparentRatioValue', '%');

  const rawW = state.circleWeight + state.starWeight + state.heartWeight + state.triangleWeight;
  const totalW = rawW || 1;
  const pct = rawW === 0 ? () => 25 : w => Math.round(w / totalW * 100);
  syncRange('circleWeight', state.circleWeight, 'circleWeightValue');
  syncRange('starWeight', state.starWeight, 'starWeightValue');
  syncRange('heartWeight', state.heartWeight, 'heartWeightValue');
  syncRange('triangleWeight', state.triangleWeight, 'triangleWeightValue');
  document.getElementById('circleWeightPct').textContent = pct(state.circleWeight);
  document.getElementById('starWeightPct').textContent = pct(state.starWeight);
  document.getElementById('heartWeightPct').textContent = pct(state.heartWeight);
  document.getElementById('triangleWeightPct').textContent = pct(state.triangleWeight);

  document.getElementById('showGuides').checked = !!state.showGuides;
  document.querySelectorAll('.placement-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.mode === state.placementMode);
  });
  document.getElementById('fontListSource').value = state.fontListSource;
  document.getElementById('minCircleSize').setAttribute('max', String(state.maxCircleSize - 1));
  document.getElementById('maxCircleSize').setAttribute('min', String(state.minCircleSize + 1));
  renderPaletteSelect();
}

export function bindRange(id, key, scale = 1, redrawFn = null) {
  document.getElementById(id).addEventListener('input', e => {
    state[key] = Number(e.target.value) / scale;
    syncUiFromState();
    if (redrawFn) redrawFn();
  });
}
