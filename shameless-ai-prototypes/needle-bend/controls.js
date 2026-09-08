const CONTROL_SECTIONS = [
  {
    title: 'Needle',
    controls: [
      { label: 'Base Y', path: 'needle.baseY', min: 0, max: 30, step: 1 },
    ],
  },
  {
    title: 'Bend Point 1',
    controls: [
      { label: 'V Lerp', path: 'bend.control1.vLerp', min: 0, max: 1, step: 0.01 },
      { label: 'X Amplitude', path: 'bend.control1.xAmplitude', min: 0, max: 60, step: 1 },
    ],
  },
  {
    title: 'Bend Point 2',
    controls: [
      { label: 'V Lerp', path: 'bend.control2.vLerp', min: 0, max: 1, step: 0.01 },
      { label: 'X Amplitude', path: 'bend.control2.xAmplitude', min: 0, max: 60, step: 1 },
    ],
  },
  {
    title: 'Press',
    controls: [
      { label: 'Max Depth', path: 'press.maxDepth', min: 5, max: 150, step: 5 },
    ],
  },
  {
    title: 'Handle',
    controls: [
      { label: 'Angle Blend', path: 'handle.rotationBlend', min: 0, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Debug',
    controls: [
      { label: 'Show Helpers', path: 'debug.showHelpers', type: 'checkbox' },
    ],
  },
];

function getByPath(obj, path) {
  return path.split('.').reduce((node, key) => node[key], obj);
}

function setByPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  const target = keys.reduce((node, key) => node[key], obj);
  target[last] = value;
}

function formatControlValue(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(3);
}

function buildRangeRow(config, control) {
  const currentValue = getByPath(config, control.path);

  const row = document.createElement('div');
  row.className = 'controls-row';

  const labelEl = document.createElement('label');
  labelEl.textContent = control.label;

  const valueEl = document.createElement('span');
  valueEl.className = 'controls-value';
  valueEl.textContent = formatControlValue(currentValue);

  const input = document.createElement('input');
  input.type = 'range';
  input.min = String(control.min);
  input.max = String(control.max);
  input.step = String(control.step);
  input.value = String(currentValue);

  input.addEventListener('input', () => {
    const value = parseFloat(input.value);
    setByPath(config, control.path, value);
    valueEl.textContent = formatControlValue(value);
  });

  row.appendChild(labelEl);
  row.appendChild(input);
  row.appendChild(valueEl);
  return row;
}

function buildCheckboxRow(config, control) {
  const currentValue = getByPath(config, control.path);

  const row = document.createElement('div');
  row.className = 'controls-row controls-row--checkbox';

  const labelEl = document.createElement('label');
  labelEl.textContent = control.label;

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.checked = Boolean(currentValue);

  input.addEventListener('input', () => {
    setByPath(config, control.path, input.checked);
  });

  row.appendChild(labelEl);
  row.appendChild(input);
  return row;
}

function initControls(config) {
  const panel = document.getElementById('controls');
  if (!panel) {
    return;
  }

  for (const section of CONTROL_SECTIONS) {
    const sectionEl = document.createElement('div');
    sectionEl.className = 'controls-section';

    const heading = document.createElement('h3');
    heading.textContent = section.title;
    sectionEl.appendChild(heading);

    for (const control of section.controls) {
      const row = control.type === 'checkbox' ? buildCheckboxRow(config, control) : buildRangeRow(config, control);
      sectionEl.appendChild(row);
    }

    panel.appendChild(sectionEl);
  }
}
