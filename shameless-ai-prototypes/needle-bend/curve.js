const NeedleModel = (function () {
  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function lerpValue(a, b, t) {
    return a + (b - a) * t;
  }

  function lerpPoint(a, b, t) {
    return { x: lerpValue(a.x, b.x, t), y: lerpValue(a.y, b.y, t) };
  }

  function touchAnchorY(config, rotation) {
    const span = config.needle.tipY - config.needle.baseY;
    const tipOffsetY = span * config.scene.scale * Math.cos(rotation);
    const baselineY = config.canvas.height - config.surface.marginBottom - config.surface.thickness;
    return baselineY - tipOffsetY;
  }

  function flattenRotation(config) {
    const span = config.needle.tipY - config.needle.baseY;
    const p2Full = { x: config.bend.control2.xAmplitude, y: span * config.bend.control2.vLerp };
    const v = { x: -p2Full.x, y: span - p2Full.y };
    return Math.PI - Math.atan2(v.y, v.x);
  }

  function toolRotation(config, t) {
    return lerpValue(0, flattenRotation(config), t);
  }

  function handleRotation(p0, p1, p2, blend) {
    const v1 = { x: p1.x - p0.x, y: p1.y - p0.y };
    const v2 = { x: p2.x - p1.x, y: p2.y - p1.y };
    const v = lerpPoint(v1, v2, blend);
    return Math.atan2(v.y, v.x) - Math.PI / 2;
  }

  function solveT(config, cursorY) {
    function candidateT(t) {
      const rotation = toolRotation(config, t);
      const touchY = touchAnchorY(config, rotation);
      const overshoot = Math.max(cursorY - touchY, 0);
      return clamp(overshoot / config.press.maxDepth, 0, 1);
    }

    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 24; i++) {
      const mid = (lo + hi) / 2;
      if (candidateT(mid) > mid) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return (lo + hi) / 2;
  }

  function targetAnchorX(cursorX, config) {
    const centerX = config.canvas.width / 2;
    const t = clamp(cursorX / config.canvas.width, 0, 1);
    return lerpValue(centerX - config.scene.horizontalRange, centerX + config.scene.horizontalRange, t);
  }

  function createState(config) {
    const centerX = config.canvas.width / 2;
    const p3y = config.needle.tipY - config.needle.baseY;
    return {
      p0: { x: 0, y: 0 },
      p1: { x: 0, y: 0 },
      p2: { x: 0, y: 0 },
      p3: { x: 0, y: p3y },
      anchor: { x: centerX, y: 0 },
      t: 0,
      rotation: 0,
      handleRotation: 0,
    };
  }

  function step(state, config, cursor) {
    const t = solveT(config, cursor.y);
    const rotation = toolRotation(config, t);
    const touchY = touchAnchorY(config, rotation);

    state.anchor.x = lerpValue(state.anchor.x, targetAnchorX(cursor.x, config), config.scene.horizontalSmoothing);
    state.anchor.y = Math.min(cursor.y, touchY);

    state.p0.x = 0;
    state.p0.y = 0;
    state.p3.x = 0;
    state.p3.y = config.needle.tipY - config.needle.baseY;

    state.p1.x = t * config.bend.control1.xAmplitude;
    state.p1.y = lerpValue(state.p0.y, state.p3.y, config.bend.control1.vLerp);

    state.p2.x = t * config.bend.control2.xAmplitude;
    state.p2.y = lerpValue(state.p0.y, state.p3.y, config.bend.control2.vLerp);

    state.t = t;
    state.rotation = rotation;
    state.handleRotation = handleRotation(state.p0, state.p1, state.p2, config.handle.rotationBlend);
  }

  return { createState, step };
})();
