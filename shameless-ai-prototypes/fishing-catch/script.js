let state;
let config;
let accumulator = 0;
let lastMode = null;

function preload() {
  config = loadJSON('config.json');
  Iso3D.preload(this);
}

function setup() {
  const canvas = createCanvas(config.canvas.width, config.canvas.height);
  canvas.parent('canvas-container');

  const webglSupported = Iso3D.isWebGLSupported();
  config.debug.isometric = webglSupported;
  Persistence.applyViewMode(config, webglSupported);
  initViewToggle(webglSupported);

  state = FishingRunner.createState(config);
  Persistence.applyStats(state);
  initInput();
  initControls(config);
  initConfigToggle();
  initPopup();
}

function initViewToggle(webglSupported) {
  const button = document.getElementById('viewToggleButton');
  if (!button) {
    return;
  }

  function updateLabel() {
    button.textContent = config.debug.isometric ? '3D' : '2D';
  }

  if (!webglSupported) {
    button.disabled = true;
    button.title = 'WebGL is not available in this browser - 3D view is disabled';
    config.debug.isometric = false;
  } else {
    button.addEventListener('click', () => {
      config.debug.isometric = !config.debug.isometric;
      updateLabel();
      Persistence.saveViewMode(config.debug.isometric);
    });
  }

  updateLabel();
}

function draw() {
  const input = readInput(this, config);

  accumulator += deltaTime / 1000;
  let steps = 0;
  while (accumulator >= config.simulation.fixedTimestepSeconds && steps < config.simulation.maxStepsPerFrame) {
    FishingRunner.step(state, input, config.simulation.fixedTimestepSeconds, config);
    accumulator -= config.simulation.fixedTimestepSeconds;
    steps++;
  }

  // A catch/junk/lost result only ever changes the counts and catch log at
  // the instant its mode is entered - saving right on that edge (instead
  // of every frame) keeps this from hitting localStorage 60 times a second.
  if (state.mode === 'result' && lastMode !== 'result') {
    Persistence.saveStats(state);
  }
  lastMode = state.mode;

  renderFrame(this, state, config);
  updateHud(state, config);
  updateCatchLog(state, config);
}

function updateHud(state, config) {
  const readoutEl = document.getElementById('hud-readout');
  const modeEl = document.getElementById('modeValue');
  const catchEl = document.getElementById('catchValue');
  const trashEl = document.getElementById('trashValue');
  const escapedEl = document.getElementById('escapedValue');
  const avgCatchEl = document.getElementById('avgCatchValue');
  const avgStepEl = document.getElementById('avgStepValue');

  if (readoutEl) {
    readoutEl.style.display = config.debug.showHudReadout ? 'block' : 'none';
  }
  if (modeEl) {
    modeEl.textContent = state.mode;
  }
  if (catchEl) {
    catchEl.textContent = state.catchCount;
  }
  if (trashEl) {
    trashEl.textContent = state.trashCount;
  }
  if (escapedEl) {
    escapedEl.textContent = state.escapedCount;
  }
  if (avgCatchEl) {
    const stats = state.stats;
    avgCatchEl.textContent =
      stats.catchDurationCount > 0 ? `${(stats.catchDurationTotal / stats.catchDurationCount).toFixed(1)}s` : '-';
  }
  if (avgStepEl) {
    const stats = state.stats;
    avgStepEl.textContent =
      stats.roundCountTotal > 0 ? `${(stats.roundTimeTotal / stats.roundCountTotal).toFixed(2)}s` : '-';
  }
}

function updateCatchLog(state, config) {
  const cells = document.querySelectorAll('#catchLogTable td[data-level]');
  cells.forEach((cell) => {
    const level = parseInt(cell.dataset.level, 10);
    const quality = state.catchLog[level];

    if (quality === undefined) {
      cell.textContent = '';
    } else if (quality <= 0) {
      cell.textContent = '✓';
      cell.style.color = '#8b93a1';
    } else {
      cell.textContent = config.qte.starChar.repeat(quality);
      cell.style.color = config.qte.qualityColor;
    }
  });
}
