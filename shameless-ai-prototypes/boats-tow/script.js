let state;
let config;
let accumulator = 0;

function preload() {
  config = loadJSON('config.json');
}

function setup() {
  const canvas = createCanvas(config.canvas.width, config.canvas.height);
  canvas.parent('canvas-container');
  state = PhysicsRunner.createState(config);
  initInput();
  initControls(config);
  initPopup();
}

function draw() {
  const input = readInput(this);

  accumulator += deltaTime / 1000;
  let steps = 0;
  while (accumulator >= config.simulation.fixedTimestepSeconds && steps < config.simulation.maxStepsPerFrame) {
    PhysicsRunner.step(state, input, config.simulation.fixedTimestepSeconds, config);
    accumulator -= config.simulation.fixedTimestepSeconds;
    steps++;
  }

  renderFrame(this, state, config);
  updateHud(state, config);
}

function updateHud(state, config) {
  const readoutEl = document.getElementById('hud-readout');
  const tensionEl = document.getElementById('tensionValue');
  const thresholdEl = document.getElementById('thresholdValue');
  const stateEl = document.getElementById('ropeState');

  if (readoutEl) {
    readoutEl.style.display = config.debug.showTensionValue ? 'block' : 'none';
  }
  if (tensionEl) {
    tensionEl.textContent = Math.round(state.rope.tension);
  }
  if (thresholdEl) {
    thresholdEl.textContent = Math.round(state.rope.snapThreshold);
  }
  if (stateEl) {
    stateEl.textContent = state.rope.snapped ? 'SNAPPED' : 'Attached';
  }
}
