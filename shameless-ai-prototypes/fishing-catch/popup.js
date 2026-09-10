function initPopup() {
  const overlay = document.getElementById('infoOverlay');
  const closeButton = document.getElementById('infoCloseButton');
  const gotItButton = document.getElementById('infoGotItButton');
  const helpButton = document.getElementById('helpButton');

  if (!overlay) {
    return;
  }

  function openOverlay() {
    overlay.hidden = false;
    InputGate.suspend('popup');
  }

  function closeOverlay() {
    overlay.hidden = true;
    InputGate.resume('popup');
  }

  if (closeButton) {
    closeButton.addEventListener('click', closeOverlay);
  }
  if (gotItButton) {
    gotItButton.addEventListener('click', closeOverlay);
  }
  if (helpButton) {
    helpButton.addEventListener('click', openOverlay);
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) {
      closeOverlay();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !overlay.hidden) {
      closeOverlay();
    }
  });

  openOverlay();
}
