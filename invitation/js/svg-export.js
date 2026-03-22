import { pageW, pageH } from './constants.js';
import { safeRectPx, expandedSafeRectPx, circleIntersectsRect } from './geometry.js';

export function escapeXml(v) {
  return String(v)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export function lineHeight(line) {
  return Math.round(line.size * 1.4 + line.gapAfter);
}

export function buildSvgString(circles, textLines, safeRect, exclusionRect = null, bgColor = '#ffffff', textColor = '#222222') {
  function starPoints(x, y, r) {
    const innerR = r * 0.4;
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI / 5) * i - Math.PI / 2;
      const radius = i % 2 === 0 ? r : innerR;
      pts.push((x + Math.cos(angle) * radius).toFixed(2) + ',' + (y + Math.sin(angle) * radius).toFixed(2));
    }
    return pts.join(' ');
  }

  function shapeToSvg(c) {
    const fill = ' fill="' + escapeXml(c.color) + '" fill-opacity="' + (c.alpha / 255).toFixed(4) + '"';
    const rot = c.rotation ? ' transform="rotate(' + (c.rotation * 180 / Math.PI).toFixed(2) + ',' + c.x.toFixed(2) + ',' + c.y.toFixed(2) + ')"' : '';
    switch (c.shape) {
      case 'star':
        return '<polygon points="' + starPoints(c.x, c.y, c.r) + '"' + fill + rot + '/>';
      case 'heart': {
        const s = c.r / 16;
        const pts = [];
        for (let i = 0; i < 60; i++) {
          const t = (i / 60) * Math.PI * 2;
          const px = c.x + 16 * Math.pow(Math.sin(t), 3) * s;
          const py = c.y - (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s - 2.5 * s;
          pts.push(px.toFixed(2) + ',' + py.toFixed(2));
        }
        return '<polygon points="' + pts.join(' ') + '"' + fill + rot + '/>';
      }
      case 'triangle':
        return '<polygon points="' +
          c.x.toFixed(2) + ',' + (c.y - c.r).toFixed(2) + ' ' +
          (c.x + c.r * 0.866).toFixed(2) + ',' + (c.y + c.r * 0.5).toFixed(2) + ' ' +
          (c.x - c.r * 0.866).toFixed(2) + ',' + (c.y + c.r * 0.5).toFixed(2) +
          '"' + fill + rot + '/>';
      default:
        return '<circle cx="' + c.x.toFixed(2) + '" cy="' + c.y.toFixed(2) + '" r="' + c.r.toFixed(2) + '"' + fill + '/>';
    }
  }

  const parts = [];
  parts.push('<?xml version="1.0" encoding="UTF-8"?>');
  parts.push('<svg xmlns="http://www.w3.org/2000/svg" width="210mm" height="297mm" viewBox="0 0 ' + pageW + ' ' + pageH + '">');
  parts.push('<rect width="100%" height="100%" fill="' + escapeXml(bgColor) + '"/>');

  for (const c of circles) {
    if (exclusionRect && circleIntersectsRect(c, exclusionRect)) continue;
    parts.push(shapeToSvg(c));
  }

  const totalHeight = textLines.reduce((sum, line) => sum + lineHeight(line), 0);
  let y = safeRect.cy - totalHeight * 0.5;
  parts.push('<g fill="' + escapeXml(textColor) + '" text-anchor="middle">');
  for (const line of textLines) {
    const h = lineHeight(line);
    y += h * 0.5;
    if (line.text) {
      const content = line.caps ? line.text.toUpperCase() : line.text;
      const spacing = line.tracking > 0 ? ' letter-spacing="' + escapeXml((line.tracking / Math.max(line.size, 1)).toFixed(4) + 'em') + '"' : '';
      const italic = line.italic ? ' font-style="italic"' : '';
      parts.push('<text x="' + safeRect.cx.toFixed(2) + '" y="' + y.toFixed(2) + '" font-size="' + line.size + '" font-weight="' + (line.weight || 400) + '" font-family="' + escapeXml(line.font) + '" dominant-baseline="middle"' + spacing + italic + '>' + escapeXml(content) + '</text>');
    }
    y += h * 0.5;
  }
  parts.push('</g>');
  parts.push('</svg>');

  return parts.join('');
}

export function exportCurrentSvg(state, themes) {
  const safe = safeRectPx(state.safeX, state.safeY, state.safeW, state.safeH);
  const excl = expandedSafeRectPx(state.safeX, state.safeY, state.safeW, state.safeH, state.safeMargin);
  const svg = buildSvgString(state.circles, state.textLines, safe, excl);
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'invitation-layout-' + String(state.palette).replace(/[^a-z0-9_-]+/gi, '-').toLowerCase() + '-seed-' + state.seed + '.svg';
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
