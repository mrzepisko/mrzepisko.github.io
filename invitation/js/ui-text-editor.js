import { state, fontOptions } from './state.js';
import { clamp } from './geometry.js';

export function makeFontSelect(value, idx) {
  const sel = document.createElement('select');
  sel.dataset.idx = idx;
  sel.className = 'line-font';
  for (const f of fontOptions()) {
    const opt = document.createElement('option');
    opt.value = f;
    opt.textContent = f.split(',')[0].trim();
    opt.title = f;
    sel.appendChild(opt);
  }
  if (![...sel.options].some(o => o.value === value)) {
    const opt = document.createElement('option');
    opt.value = value;
    opt.textContent = value.split(',')[0].trim();
    opt.title = value;
    sel.appendChild(opt);
  }
  sel.value = value;
  return sel;
}

export function renderTextLinesEditor() {
  const box = document.getElementById('textLinesContainer');
  box.innerHTML = '';
  state.textLines.forEach((line, idx) => {
    const card = document.createElement('div');
    card.className = 'line-card';

    const toolbar = document.createElement('div');
    toolbar.className = 'line-toolbar';
    toolbar.innerHTML = '<strong>Line ' + (idx + 1) + '</strong>';
    const tools = document.createElement('div');
    tools.innerHTML =
      '<button data-action="up" data-idx="' + idx + '">Up</button> ' +
      '<button data-action="down" data-idx="' + idx + '">Down</button> ' +
      '<button data-action="delete" data-idx="' + idx + '">Delete</button>';
    toolbar.appendChild(tools);
    card.appendChild(toolbar);

    const textWrap = document.createElement('div');
    textWrap.className = 'line-text-wrap';
    const label = document.createElement('label');
    label.textContent = 'Text';
    const input = document.createElement('textarea');
    input.value = line.text;
    input.dataset.idx = idx;
    input.className = 'line-text';
    textWrap.appendChild(label);
    textWrap.appendChild(input);
    card.appendChild(textWrap);

    const row1 = document.createElement('div');
    row1.className = 'line-grid three';
    row1.innerHTML = '<label>Font</label><label>Size</label><label></label>';
    const fontSel = makeFontSelect(line.font, idx);
    const size = document.createElement('input');
    size.type = 'number'; size.min = '8'; size.max = '120'; size.value = line.size;
    size.dataset.idx = idx; size.className = 'line-size';

    const styleWrap = document.createElement('div');
    styleWrap.className = 'line-style-wrap';
    const boldBtn = document.createElement('button');
    boldBtn.textContent = 'B';
    boldBtn.className = 'line-style-btn' + ((line.weight || 400) >= 600 ? ' active' : '');
    boldBtn.dataset.action = 'bold'; boldBtn.dataset.idx = idx;
    const italicBtn = document.createElement('button');
    italicBtn.textContent = 'I';
    italicBtn.className = 'line-style-btn line-style-italic' + (line.italic ? ' active' : '');
    italicBtn.dataset.action = 'italic'; italicBtn.dataset.idx = idx;
    styleWrap.appendChild(boldBtn);
    styleWrap.appendChild(italicBtn);

    row1.appendChild(fontSel); row1.appendChild(size); row1.appendChild(styleWrap);
    card.appendChild(row1);

    const adv = document.createElement('details');
    adv.className = 'line-advanced';
    if (line.advancedOpen) adv.open = true;
    adv.addEventListener('toggle', () => {
      if (state.textLines[idx]) state.textLines[idx].advancedOpen = adv.open;
    });
    const sum = document.createElement('summary');
    sum.className = 'line-advanced-summary';
    sum.textContent = 'Advanced';
    adv.appendChild(sum);

    const row2 = document.createElement('div');
    row2.className = 'line-grid three';
    row2.innerHTML = '<label>Tracking</label><label>Gap after</label><label>Caps</label>';
    const tracking = document.createElement('input');
    tracking.type = 'number'; tracking.step = '0.1'; tracking.min = '0'; tracking.max = '30';
    tracking.value = line.tracking; tracking.dataset.idx = idx; tracking.className = 'line-tracking';
    const gapAfter = document.createElement('input');
    gapAfter.type = 'number'; gapAfter.step = '1'; gapAfter.min = '0'; gapAfter.max = '120';
    gapAfter.value = line.gapAfter; gapAfter.dataset.idx = idx; gapAfter.className = 'line-gap';
    const caps = document.createElement('input');
    caps.type = 'checkbox'; caps.checked = !!line.caps; caps.dataset.idx = idx; caps.className = 'line-caps';
    row2.appendChild(tracking); row2.appendChild(gapAfter); row2.appendChild(caps);
    adv.appendChild(row2);
    card.appendChild(adv);

    box.appendChild(card);
  });
}

export function bindTextLinesEvents(onRedraw) {
  document.getElementById('textLinesContainer').addEventListener('input', e => {
    const idx = Number(e.target.dataset.idx);
    if (!Number.isInteger(idx) || !state.textLines[idx]) return;
    const line = state.textLines[idx];
    if (e.target.classList.contains('line-text')) line.text = e.target.value;
    if (e.target.classList.contains('line-font')) line.font = e.target.value;
    if (e.target.classList.contains('line-size')) line.size = clamp(Number(e.target.value) || 18, 8, 120);
    if (e.target.classList.contains('line-tracking')) line.tracking = Math.max(0, Number(e.target.value) || 0);
    if (e.target.classList.contains('line-gap')) line.gapAfter = Math.max(0, Number(e.target.value) || 0);
    if (e.target.classList.contains('line-caps')) line.caps = !!e.target.checked;
  });

  document.getElementById('textLinesContainer').addEventListener('click', e => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const idx = Number(btn.dataset.idx);
    const action = btn.dataset.action;
    if (!Number.isInteger(idx) || !state.textLines[idx]) return;
    const line = state.textLines[idx];
    if (action === 'delete') state.textLines.splice(idx, 1);
    if (action === 'up' && idx > 0) [state.textLines[idx - 1], state.textLines[idx]] = [state.textLines[idx], state.textLines[idx - 1]];
    if (action === 'down' && idx + 1 < state.textLines.length) [state.textLines[idx + 1], state.textLines[idx]] = [state.textLines[idx], state.textLines[idx + 1]];
    if (action === 'bold') { line.weight = (line.weight || 400) >= 600 ? 400 : 700; }
    if (action === 'italic') { line.italic = !line.italic; }
    renderTextLinesEditor();
  });
}
