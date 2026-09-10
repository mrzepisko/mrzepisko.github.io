// Small state machine gating raw input: gameplay only reacts to the mouse/
// keyboard while nothing else (a popup, a slider drag) is claiming it.
// Reasons are tracked by name so two overlapping causes (e.g. a popup opened
// while a slider was mid-drag) can't clobber each other's suspend/resume.
const InputGate = (function () {
  const suspendReasons = new Set();

  function suspend(reason) {
    suspendReasons.add(reason);
  }

  function resume(reason) {
    suspendReasons.delete(reason);
  }

  function isSuspended() {
    return suspendReasons.size > 0;
  }

  return { suspend, resume, isSuspended };
})();

let _aimActive = false;
let _justReleased = false;
let _hitPressed = false;
let _pressEdge = false;
let _resetRequested = false;

function initInput() {
  const button = document.getElementById('resetButton');
  if (button) {
    button.addEventListener('click', () => {
      _resetRequested = true;
    });
  }

  const panel = document.getElementById('controls');
  if (panel) {
    panel.addEventListener('mousedown', () => InputGate.suspend('controls'));
    panel.addEventListener('touchstart', () => InputGate.suspend('controls'));
  }
  document.addEventListener('mouseup', () => InputGate.resume('controls'));
  document.addEventListener('touchend', () => InputGate.resume('controls'));
}

function mousePressed() {
  if (InputGate.isSuspended()) {
    return;
  }
  _aimActive = true;
  _hitPressed = true;
  _pressEdge = true;
}

function mouseReleased() {
  if (InputGate.isSuspended()) {
    _aimActive = false;
    return;
  }
  if (_aimActive) {
    _justReleased = true;
  }
  _aimActive = false;
}

function keyPressed() {
  if (InputGate.isSuspended()) {
    return false;
  }
  if (this.key === ' ') {
    _hitPressed = true;
    return false;
  }
}

function readInput(p, config) {
  const mouseX = p.constrain(p.mouseX, 0, p.width);
  const mouseY = p.constrain(p.mouseY, 0, p.height);
  // Gameplay (aim angle/distance, bite radii, etc.) always works in flat
  // world space - in isometric view the raw cursor position has to be
  // un-projected back to world coordinates before any of that math runs.
  const world = Projection.screenToWorld(mouseX, mouseY, config);

  const input = {
    mouseX,
    mouseY,
    worldMouseX: world.x,
    worldMouseY: world.y,
    aimActive: _aimActive,
    justReleased: _justReleased,
    hitPressed: _hitPressed,
    pressEdge: _pressEdge,
    resetRequested: _resetRequested,
  };

  _justReleased = false;
  _hitPressed = false;
  _pressEdge = false;
  _resetRequested = false;

  return input;
}
