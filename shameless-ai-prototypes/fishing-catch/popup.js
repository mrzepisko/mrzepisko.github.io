const TUTORIAL_SLIDES = [
  {
    src: 'assets/tutorial/casting.png',
    caption:
      "Drag back like a slingshot, then release. Line color previews the landing zone (green = inside a school); the exact spot then scatters a little within a small radius of your aim.",
  },
  {
    src: 'assets/tutorial/zones.png',
    caption:
      "Each school has two rings. Land inside the inner ring for a fast bite; between the rings the bite gets slower the further out you are. Miss both and you'll reel in junk instead.",
  },
  {
    src: 'assets/tutorial/bite.png',
    caption: "A yellow '!' flashes over the bobber the instant a fish takes interest - the reel-in mini-game starts a moment later.",
  },
  {
    src: 'assets/tutorial/reelbar.png',
    caption:
      'The reel-in bar at a glance: a sliding marker, a hit zone to tag each round, an optional gold quality zone, round pips and lives, a countdown timer, and a flash for the last result.',
  },
  {
    src: 'assets/tutorial/quality.png',
    caption:
      "Tag the gold quality zone before it's used up to earn a bonus star for that round, up to three per catch. Your best quality per level is kept in the catch log.",
  },
  {
    src: 'assets/tutorial/difficulty.png',
    caption:
      "Four tiers, three levels each. Higher tiers shrink the target zone on the map, add more reel-in rounds, and narrow the hit zone dramatically - Extreme III's window is a sliver of Easy I's.",
  },
];

function initTutorialCarousel() {
  const img = document.getElementById('tutorialImg');
  const caption = document.getElementById('tutorialCaption');
  const dotsWrap = document.getElementById('tutorialDots');
  const prevButton = document.getElementById('tutorialPrev');
  const nextButton = document.getElementById('tutorialNext');

  if (!img || !caption || !dotsWrap || !prevButton || !nextButton) {
    return;
  }

  let index = 0;
  const dots = TUTORIAL_SLIDES.map((_, i) => {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = 'tutorial-dot';
    dot.setAttribute('aria-label', `Go to step ${i + 1}`);
    dot.addEventListener('click', () => show(i));
    dotsWrap.appendChild(dot);
    return dot;
  });

  function show(i) {
    index = ((i % TUTORIAL_SLIDES.length) + TUTORIAL_SLIDES.length) % TUTORIAL_SLIDES.length;
    const slide = TUTORIAL_SLIDES[index];
    img.src = slide.src;
    img.alt = `Tutorial step ${index + 1}: ${slide.caption}`;
    caption.textContent = `${index + 1}/${TUTORIAL_SLIDES.length} — ${slide.caption}`;
    dots.forEach((dot, i2) => dot.classList.toggle('active', i2 === index));
  }

  prevButton.addEventListener('click', () => show(index - 1));
  nextButton.addEventListener('click', () => show(index + 1));

  show(0);
}

function initPopup() {
  const overlay = document.getElementById('infoOverlay');
  const closeButton = document.getElementById('infoCloseButton');
  const gotItButton = document.getElementById('infoGotItButton');
  const helpButton = document.getElementById('helpButton');

  if (!overlay) {
    return;
  }

  initTutorialCarousel();

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
