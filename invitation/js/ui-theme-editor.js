import { state } from './state.js';

let tempThemeColors = ['#ff1744', '#ff9100', '#ffea00', '#00e676', '#00b0ff', '#7c4dff'];

export function setTempThemeColors(colors) {
  tempThemeColors = colors.slice();
}

export function loadCustomThemeColors() {
  if (state.customThemes['custom'] && state.customThemes['custom'].length >= 2) {
    tempThemeColors = state.customThemes['custom'].slice();
  }
  renderCustomThemeEditor();
}

export function syncThemeEditorVisibility() {
  const shouldShow = state.palette === 'custom';
  const group = document.getElementById('customThemeGroup');
  const wasHidden = group.classList.contains('hidden');
  group.classList.toggle('hidden', !shouldShow);
  if (shouldShow && wasHidden) loadCustomThemeColors();
}

export function renderCustomThemeEditor() {
  const box = document.getElementById('customThemeColors');
  box.innerHTML = '';
  tempThemeColors.forEach((color, idx) => {
    const row = document.createElement('div');
    row.className = 'theme-color-row';
    const input = document.createElement('input');
    input.type = 'color';
    input.value = /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#ffffff';
    input.dataset.idx = idx;
    input.className = 'custom-theme-color';
    const del = document.createElement('button');
    del.textContent = 'Delete';
    del.dataset.idx = idx;
    del.className = 'delete-theme-color';
    row.appendChild(input);
    row.appendChild(del);
    box.appendChild(row);
  });
}

export function bindThemeEditorEvents(onThemeSaved) {
  function autoSave() {
    const colors = tempThemeColors.filter(c => /^#[0-9a-fA-F]{6}$/.test(c));
    if (colors.length < 2) return;
    state.customThemes['custom'] = colors;
    if (onThemeSaved) onThemeSaved();
  }

  document.getElementById('addThemeColor').addEventListener('click', () => {
    tempThemeColors.push('#ffffff');
    renderCustomThemeEditor();
    autoSave();
  });

  document.getElementById('customThemeColors').addEventListener('input', e => {
    if (e.target.classList.contains('custom-theme-color')) {
      const idx = Number(e.target.dataset.idx);
      if (Number.isInteger(idx)) {
        tempThemeColors[idx] = e.target.value;
        autoSave();
      }
    }
  });

  document.getElementById('customThemeColors').addEventListener('click', e => {
    if (e.target.classList.contains('delete-theme-color')) {
      const idx = Number(e.target.dataset.idx);
      if (Number.isInteger(idx)) {
        tempThemeColors.splice(idx, 1);
        renderCustomThemeEditor();
        autoSave();
      }
    }
  });
}
