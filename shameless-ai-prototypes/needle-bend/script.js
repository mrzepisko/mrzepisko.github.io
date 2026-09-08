let state;
let config;

function preload() {
  config = loadJSON('config.json');
}

function setup() {
  const margin = 40;
  const referenceSize = config.canvas.width;
  const size = Math.max(100, Math.min(windowWidth - margin * 2, windowHeight - margin * 2));
  const factor = size / referenceSize;

  config.canvas.width = size;
  config.canvas.height = size;
  config.scene.scale *= factor;
  config.surface.thickness *= factor;
  config.surface.marginBottom *= factor;
  config.press.maxDepth *= factor;
  config.scene.horizontalRange *= factor;

  const canvas = createCanvas(config.canvas.width, config.canvas.height);
  canvas.parent('canvas-container');
  state = NeedleModel.createState(config);
  initControls(config);
  initPopup();
}

function draw() {
  NeedleModel.step(state, config, { x: this.mouseX, y: this.mouseY });
  renderFrame(this, state, config);
  updateHud(state, config);
}

function updateHud(state, config) {
  const tEl = document.getElementById('tValue');
  const rotationEl = document.getElementById('rotationValue');
  const stateEl = document.getElementById('pressState');

  if (tEl) {
    tEl.textContent = state.t.toFixed(2);
  }
  if (rotationEl) {
    rotationEl.textContent = ((state.rotation * 180) / Math.PI).toFixed(1);
  }
  if (stateEl) {
    stateEl.textContent = state.t > 0 ? 'Pressing' : 'Free';
  }
}
