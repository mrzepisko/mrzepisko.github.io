import { pageW, pageH } from './constants.js';

export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }

export function safeRectPx(safeX, safeY, safeW, safeH) {
  return { cx: safeX * pageW, cy: safeY * pageH, w: safeW * pageW, h: safeH * pageH };
}

export function expandedSafeRectPx(safeX, safeY, safeW, safeH, safeMargin) {
  const r = safeRectPx(safeX, safeY, safeW, safeH);
  const m = safeMargin * Math.min(pageW, pageH);
  return { cx: r.cx, cy: r.cy, w: r.w + m * 2, h: r.h + m * 2 };
}

export function circleIntersectsRect(circle, rect) {
  const dx = Math.abs(circle.x - rect.cx);
  const dy = Math.abs(circle.y - rect.cy);
  const hx = rect.w * 0.5;
  const hy = rect.h * 0.5;
  if (dx > hx + circle.r) return false;
  if (dy > hy + circle.r) return false;
  if (dx <= hx || dy <= hy) return true;
  const cx = dx - hx;
  const cy = dy - hy;
  return cx * cx + cy * cy <= circle.r * circle.r;
}

export function distToEdge(x, y) { return Math.min(x, pageW - x, y, pageH - y); }
