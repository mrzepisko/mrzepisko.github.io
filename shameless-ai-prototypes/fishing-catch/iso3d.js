// Only used in isometric mode - 2D mode keeps the plain vector shapes as-is.
// Loads the real OBJ models once and bakes each to a small offscreen WEBGL
// graphics buffer (a static "sprite"), which the main 2D canvas then just
// draws with p.image() like any other picture. That keeps the rest of the
// game entirely on the regular P2D canvas; only this bake step touches
// WEBGL, and it's deferred until isometric mode is actually switched on
// (never at startup) so a page that never uses it never needs a WebGL
// context at all.
//
// WebGL isn't guaranteed to be available everywhere (disabled, blocked,
// context limits, etc.), so baking is wrapped defensively - if it fails,
// isometric mode just quietly keeps drawing the flat vector shapes instead
// of taking the whole prototype down.
//
// Orientation was calibrated by hand against the actual models (see the
// session that built this): the fish model's head points toward world -X,
// the boat's bow toward world -Z. The fish is baked from directly overhead
// so it can be 2D-rotated to face any swim direction without distortion -
// any camera tilt would make that rotation look wrong except at the exact
// angle it was baked at. The boat never rotates at runtime, so it's baked
// from a nicer 3/4 "hero" angle instead.
const Iso3D = (function () {
  let boatModel = null;
  let fishModel = null;
  let texture = null;
  let boatSprite = null;
  let fishSprite = null;
  let attempted = false;

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

  function bakeSprite(p, model, size, orthoHalfExtent, eye, up) {
    const g = p.createGraphics(size, size, p.WEBGL);
    g.clear();
    g.ortho(-orthoHalfExtent, orthoHalfExtent, -orthoHalfExtent, orthoHalfExtent, -20, 20);
    g.camera(eye[0], eye[1], eye[2], 0, 0, 0, up[0], up[1], up[2]);
    g.noStroke();
    g.texture(texture);
    g.model(model);
    return g;
  }

  function ensureBaked(p, config) {
    if (attempted) {
      return;
    }
    attempted = true; // only ever try once, success or failure

    try {
      const cfg = config.iso;
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

      boatSprite = bakeSprite(p, boatModel, cfg.boatBakeSize, cfg.boatBakeOrtho, boatEye, [0, 1, 0]);
      fishSprite = bakeSprite(p, fishModel, cfg.fishBakeSize, cfg.fishBakeOrtho, [0, -R, 0.0001], [0, 0, -1]);
    } catch (err) {
      console.warn('Iso3D: could not bake 3D sprites, falling back to flat shapes -', err);
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
