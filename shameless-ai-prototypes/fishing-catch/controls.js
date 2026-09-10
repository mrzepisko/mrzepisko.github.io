const CONTROL_SECTIONS = [
  {
    title: 'Cast',
    controls: [{ label: 'Power Mult', path: 'cast.powerMultiplier', min: 0.5, max: 6, step: 0.1 }],
  },
  {
    title: 'Reel QTE',
    controls: [
      { label: 'Miss Slow Mult', path: 'qte.missSlowMultiplier', min: 0.1, max: 1, step: 0.05 },
      { label: 'Quality Width', path: 'qte.qualityWidthRatio', min: 0.1, max: 0.8, step: 0.05 },
    ],
  },
  {
    title: 'Fish School',
    controls: [{ label: 'Fish Speed', path: 'schools.fishSpeed', min: 0, max: 200, step: 5 }],
  },
  {
    title: 'Debug',
    controls: [
      { label: 'School Radii', path: 'debug.showSchoolRadii', type: 'checkbox' },
      { label: 'Labels', path: 'debug.showLabels', type: 'checkbox' },
      { label: 'Aim Prediction', path: 'debug.showAimPrediction', type: 'checkbox' },
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

// The tuning panel is hidden by default on small/short screens (see the
// mobile rules in styles.css) since it would otherwise cover most of the
// canvas - "cfg" gets it back on demand there, and lets it be tucked away
// on any screen size that wants the extra room. Closing is a separate,
// unconditional button on the panel itself (like the help popup's own
// close button), since it only ever needs to do one thing.
function initConfigToggle() {
  const panel = document.getElementById('controls');
  const openButton = document.getElementById('configToggleButton');
  const closeButton = document.getElementById('controlsCloseButton');
  if (!panel) {
    return;
  }

  if (openButton) {
    openButton.addEventListener('click', () => {
      const isHidden = getComputedStyle(panel).display === 'none';
      panel.style.display = isHidden ? 'block' : 'none';
    });
  }
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      panel.style.display = 'none';
    });
  }
}
