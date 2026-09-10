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

// p5 binds mouse/touch listeners on the whole document, not just the
// canvas - without this, pressing a HUD button (Reset, ?, cfg...) also
// starts an aim, since that press still reaches mousePressed/touchStarted.
// Releasing is deliberately NOT gated the same way: a drag that started on
// the canvas and ends over a button must still register as a release, or
// _aimActive would get stuck true forever.
function isCanvasTarget(event) {
  const canvas = document.querySelector('#canvas-container canvas');
  return !!(canvas && event && event.target === canvas);
}

function handlePressStart(event) {
  if (InputGate.isSuspended() || !isCanvasTarget(event)) {
    return;
  }
  _aimActive = true;
  _hitPressed = true;
  _pressEdge = true;
}

function handlePressEnd() {
  if (InputGate.isSuspended()) {
    _aimActive = false;
    return;
  }
  if (_aimActive) {
    _justReleased = true;
  }
  _aimActive = false;
}

function mousePressed(event) {
  handlePressStart(event);
}

function mouseReleased() {
  handlePressEnd();
}

// p5 calls these instead of mousePressed/mouseReleased for touch input, so
// dragging to aim and tapping the reel bar both work on a phone - without
// them, touch never triggers the mouse callbacks at all (unlike a real
// mouse click, a touch tap has no browser-synthesized mousedown fallback
// once the touch's own default handling is suppressed for the drag).
//
// These fire for EVERY touch on the page, not just the canvas (same reason
// isCanvasTarget exists above). Returning false suppresses the browser's
// default touch behavior - which is exactly what we want for a canvas drag
// (no page scroll), but for a touch that lands on a button it would also
// swallow the compatibility click the button relies on to fire at all,
// which is why a tap on a button needed two or three tries to register.
// A touch's target is fixed to wherever it started for its whole gesture
// (unlike mouse, which retargets as the pointer moves), so this stays
// consistent from touchStarted through touchEnded.
function touchStarted(event) {
  handlePressStart(event);
  return !isCanvasTarget(event);
}

function touchEnded(event) {
  handlePressEnd();
  return !isCanvasTarget(event);
}

function touchMoved(event) {
  return !isCanvasTarget(event);
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
