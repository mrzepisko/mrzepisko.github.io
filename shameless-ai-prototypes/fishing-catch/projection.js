// Gameplay stays in flat world coordinates no matter which view is active -
// aim angles, bite radii, and distances are all computed in world space.
// This module only concerns the screen: where a world point actually draws,
// and (for input) where a screen click actually is in world space.
const Projection = (function () {
  function worldToScreen(x, y, config) {
    if (!config.debug.isometric) {
      return { x, y };
    }

    const cx = config.canvas.width / 2;
    const cy = config.canvas.height / 2;
    const dx = x - cx;
    const dy = y - cy;
    const scale = config.iso.scale;
    const ratio = config.iso.verticalRatio;

    return {
      x: cx + (dx - dy) * scale,
      y: cy + (dx + dy) * scale * ratio,
    };
  }

  function screenToWorld(x, y, config) {
    if (!config.debug.isometric) {
      return { x, y };
    }

    const cx = config.canvas.width / 2;
    const cy = config.canvas.height / 2;
    const scale = config.iso.scale;
    const ratio = config.iso.verticalRatio;

    const sx = (x - cx) / scale;
    const sy = (y - cy) / (scale * ratio);
    const dx = (sx + sy) / 2;
    const dy = (sy - sx) / 2;

    return { x: cx + dx, y: cy + dy };
  }

  // A world-space circle of radius r projects to an axis-aligned ellipse in
  // screen space under this transform (a 45-degree rotation plus a
  // vertical squash) - same scale factor as the position transform.
  function worldRadiusToScreenSize(r, config) {
    if (!config.debug.isometric) {
      return { w: r * 2, h: r * 2 };
    }

    const k = config.iso.scale * Math.SQRT2;
    return { w: r * 2 * k, h: r * 2 * k * config.iso.verticalRatio };
  }

  return { worldToScreen, screenToWorld, worldRadiusToScreenSize };
})();
