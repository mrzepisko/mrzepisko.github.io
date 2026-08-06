let _resetRequested = false;

function initInput() {
  const button = document.getElementById('resetButton');
  if (button) {
    button.addEventListener('click', () => {
      _resetRequested = true;
    });
  }
}

function readInput(p) {
  let target = null;

  if (p.touches && p.touches.length > 0) {
    const touch = p.touches[0];
    if (touch.x >= 0 && touch.x <= p.width && touch.y >= 0 && touch.y <= p.height) {
      target = { x: touch.x, y: touch.y };
    }
  } else if (p.mouseIsPressed) {
    if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
      target = { x: p.mouseX, y: p.mouseY };
    }
  }

  const resetRequested = _resetRequested;
  _resetRequested = false;

  return { target, resetRequested };
}
