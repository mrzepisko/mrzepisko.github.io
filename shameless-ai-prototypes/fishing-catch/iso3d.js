// Only used in isometric mode - 2D mode keeps the plain vector shapes as-is.
// Loads the real OBJ models once, then redraws each into a small offscreen
// WEBGL graphics buffer every frame, which the main 2D canvas then just
// draws with p.image() like any other picture. That keeps the rest of the
// game entirely on the regular P2D canvas; only this step touches WEBGL,
// and it's skipped whenever isometric mode is off, so a page that never
// uses it never needs a WebGL context at all.
//
// This used to render each model ONCE and cache the result forever, on the
// theory that a browser-level "no user input detected" canvas-read
// protection just needed one successful attempt to get past. In practice
// that gate turned out to be far less predictable than that - a handful of
// retries, even ones fired synchronously from real click/touch handlers,
// still weren't reliably enough. So instead of trying to outsmart exactly
// when the browser will allow it: just try again every single frame,
// forever. A frame that gets blocked costs one frame of the flat vector
// fallback, not the rest of the session - and the redraw itself is cheap
// (a handful of triangles into a small buffer), so there's no real cost to
// never giving up.
//
// Orientation was calibrated by hand against the actual models (see the
// session that built this): the fish model's head points toward world -X,
// the boat's bow toward world -Z. The fish is rendered from directly
// overhead so it can be 2D-rotated to face any swim direction without
// distortion - any camera tilt would make that rotation look wrong except
// at the exact angle it was rendered at. The boat never rotates at
// runtime, so it's rendered from a nicer 3/4 "hero" angle instead.
const Iso3D = (function () {
  let boatModel = null;
  let fishModel = null;
  let texture = null;
  let boatGraphics = null;
  let fishGraphics = null;
  let boatSprite = null;
  let fishSprite = null;

  // A cheap, direct check independent of p5/model loading - just "can this
  // browser make a WebGL context at all", used to decide the default view
  // and whether to let the user pick 3D in the first place.
  function isWebGLSupported() {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch (err) {
      return false;
    }
  }

  function preload(p) {
    boatModel = p.loadModel('assets/boat-row-small.obj', false);
    fishModel = p.loadModel('assets/fish.obj', false);
    texture = p.loadImage('assets/Textures/colormap.png');
  }

  function renderInto(g, model, orthoHalfExtent, eye, up) {
    g.clear();
    g.ortho(-orthoHalfExtent, orthoHalfExtent, -orthoHalfExtent, orthoHalfExtent, -20, 20);
    g.camera(eye[0], eye[1], eye[2], 0, 0, 0, up[0], up[1], up[2]);
    g.noStroke();
    g.texture(texture);
    g.model(model);
  }

  function ensureBaked(p, config) {
    try {
      const cfg = config.iso;
      if (!boatGraphics) {
        boatGraphics = p.createGraphics(cfg.boatBakeSize, cfg.boatBakeSize, p.WEBGL);
      }
      if (!fishGraphics) {
        fishGraphics = p.createGraphics(cfg.fishBakeSize, cfg.fishBakeSize, p.WEBGL);
      }

      const elevation = Math.asin(cfg.verticalRatio);
      const azimuth = (cfg.boatAzimuthDegrees * Math.PI) / 180;
      const R = 5;
      // Azimuth is measured off the bow axis (-Z) - 0 would face the bow
      // straight at the camera (flat, no 3/4 depth); a small azimuth keeps
      // the bow clearly pointing "forward" while still showing enough of
      // one side to read as a dimensional hero shot rather than sideways.
      const boatEye = [
        -R * Math.cos(elevation) * Math.sin(azimuth),
        R * Math.sin(elevation),
        -R * Math.cos(elevation) * Math.cos(azimuth),
      ];

      renderInto(boatGraphics, boatModel, cfg.boatBakeOrtho, boatEye, [0, 1, 0]);
      renderInto(fishGraphics, fishModel, cfg.fishBakeOrtho, [0, -R, 0.0001], [0, 0, -1]);
      boatSprite = boatGraphics;
      fishSprite = fishGraphics;
    } catch (err) {
      boatSprite = null;
      fishSprite = null;
    }
  }

  return {
    preload,
    ensureBaked,
    isWebGLSupported,
    getBoatSprite: () => boatSprite,
    getFishSprite: () => fishSprite,
  };
})();
