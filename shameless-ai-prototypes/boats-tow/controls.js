const CONTROL_SECTIONS = [
  {
    title: 'Player',
    controls: [
      { label: 'Accel', path: 'player.accel', min: 0, max: 1000, step: 10 },
      { label: 'Max Speed', path: 'player.maxSpeed', min: 0, max: 400, step: 5 },
      { label: 'Drag', path: 'player.drag', min: 0.9, max: 1, step: 0.001 },
    ],
  },
  {
    title: 'Towed Object',
    controls: [
      { label: 'Mass Ratio', path: 'towed.massRatio', min: 0.5, max: 10, step: 0.1 },
      { label: 'Linear Drag', path: 'towed.linearDrag', min: 0.9, max: 1, step: 0.001 },
      { label: 'Angular Drag', path: 'towed.angularDrag', min: 0.5, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'Rope',
    controls: [
      { label: 'Max Length', path: 'rope.maxLength', min: 40, max: 400, step: 5 },
      { label: 'Stiffness', path: 'rope.stiffness', min: 1, max: 150, step: 1 },
      { label: 'Damping', path: 'rope.damping', min: 0, max: 40, step: 0.5 },
      { label: 'Snap Extra %', path: 'rope.snapExtraPercent', min: 0, max: 2, step: 0.05 },
      { label: 'Snap Flat Min', path: 'rope.snapFlatMin', min: 0, max: 1000, step: 10 },
      { label: 'Snap Sustain (s)', path: 'rope.snapSustainSeconds', min: 0.02, max: 1, step: 0.01 },
    ],
  },
  {
    title: 'River',
    controls: [
      { label: 'Force X', path: 'river.force.x', min: -400, max: 400, step: 5 },
    ],
  },
  {
    title: 'Vortex',
    controls: [
      { label: 'Pull Strength', path: 'vortex.pullStrength', min: 0, max: 600, step: 10 },
      { label: 'Swirl Strength', path: 'vortex.swirlStrength', min: 0, max: 600, step: 10 },
    ],
  },
  {
    title: 'Collision',
    controls: [
      { label: 'Restitution', path: 'collision.restitution', min: 0, max: 1, step: 0.05 },
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
      sectionEl.appendChild(row);
    }

    panel.appendChild(sectionEl);
  }
}
