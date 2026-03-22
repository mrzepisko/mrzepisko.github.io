import { state } from './state.js';
import { safeRectPx, expandedSafeRectPx, circleIntersectsRect, clamp } from './geometry.js';
import { lineHeight } from './svg-export.js';
import { pageW, pageH } from './constants.js';

export function createSketch(onLayoutNeeded, onUiSync) {
  return p => {
    function currentSafeRect() {
      return safeRectPx(state.safeX, state.safeY, state.safeW, state.safeH);
    }

    function handles(rect) {
      const x0 = rect.cx - rect.w * 0.5;
      const y0 = rect.cy - rect.h * 0.5;
      const x1 = rect.cx + rect.w * 0.5;
      const y1 = rect.cy + rect.h * 0.5;
      return { nw: { x: x0, y: y0 }, ne: { x: x1, y: y0 }, sw: { x: x0, y: y1 }, se: { x: x1, y: y1 } };
    }

    function hitHandle(mx, my, rect) {
      const r = window.matchMedia('(pointer: coarse)').matches ? 28 : 16;
      for (const [name, h] of Object.entries(handles(rect))) if (Math.hypot(mx - h.x, my - h.y) < r) return name;
      return null;
    }

    function pointInRect(mx, my, rect) {
      return Math.abs(mx - rect.cx) <= rect.w * 0.5 && Math.abs(my - rect.cy) <= rect.h * 0.5;
    }

    function drawStar(p, x, y, r) {
      const innerR = r * 0.4;
      p.beginShape();
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const radius = i % 2 === 0 ? r : innerR;
        p.vertex(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius);
      }
      p.endShape(p.CLOSE);
    }

    function drawShape(p, c) {
      p.push();
      p.translate(c.x, c.y);
      p.rotate(c.rotation || 0);
      switch (c.shape) {
        case 'star':
          drawStar(p, 0, 0, c.r);
          break;
        case 'heart': {
          const s = c.r / 16;
          p.beginShape();
          for (let i = 0; i < 60; i++) {
            const t = (i / 60) * Math.PI * 2;
            p.vertex(
              16 * Math.pow(Math.sin(t), 3) * s,
              -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * s - 2.5 * s
            );
          }
          p.endShape(p.CLOSE);
          break;
        }
        case 'triangle':
          p.beginShape();
          p.vertex(0, -c.r);
          p.vertex(c.r * 0.866, c.r * 0.5);
          p.vertex(-c.r * 0.866, c.r * 0.5);
          p.endShape(p.CLOSE);
          break;
        default:
          p.circle(0, 0, c.r * 2);
      }
      p.pop();
    }

    p.setup = () => {
      p.createCanvas(pageW, pageH);
      onLayoutNeeded();
    };

    p.mousePressed = () => {
      if (p.mouseX < 0 || p.mouseX > pageW || p.mouseY < 0 || p.mouseY > pageH) return;
      const rect = currentSafeRect();
      const handle = hitHandle(p.mouseX, p.mouseY, rect);
      state.dragStart = { x: p.mouseX, y: p.mouseY };
      state.safeStart = { ...rect };
      if (handle) state.dragMode = handle;
      else if (pointInRect(p.mouseX, p.mouseY, rect)) state.dragMode = 'move';
    };

    p.mouseDragged = () => {
      if (!state.dragMode || !state.dragStart || !state.safeStart) return;
      const dx = p.mouseX - state.dragStart.x;
      const dy = p.mouseY - state.dragStart.y;
      let rect = { ...state.safeStart };

      if (state.dragMode === 'move') {
        rect.cx += dx;
        rect.cy += dy;
      } else {
        const x0 = state.safeStart.cx - state.safeStart.w * 0.5;
        const y0 = state.safeStart.cy - state.safeStart.h * 0.5;
        const x1 = state.safeStart.cx + state.safeStart.w * 0.5;
        const y1 = state.safeStart.cy + state.safeStart.h * 0.5;
        let nx0 = x0, ny0 = y0, nx1 = x1, ny1 = y1;
        if (state.dragMode.includes('n')) ny0 += dy;
        if (state.dragMode.includes('s')) ny1 += dy;
        if (state.dragMode.includes('w')) nx0 += dx;
        if (state.dragMode.includes('e')) nx1 += dx;
        const minW = 120, minH = 160;
        if (nx1 - nx0 < minW) state.dragMode.includes('w') ? nx0 = nx1 - minW : nx1 = nx0 + minW;
        if (ny1 - ny0 < minH) state.dragMode.includes('n') ? ny0 = ny1 - minH : ny1 = ny0 + minH;
        rect = { cx: (nx0 + nx1) * 0.5, cy: (ny0 + ny1) * 0.5, w: nx1 - nx0, h: ny1 - ny0 };
      }

      rect.w = clamp(rect.w, 120, pageW * 0.9);
      rect.h = clamp(rect.h, 160, pageH * 0.92);
      rect.cx = clamp(rect.cx, rect.w * 0.5, pageW - rect.w * 0.5);
      rect.cy = clamp(rect.cy, rect.h * 0.5, pageH - rect.h * 0.5);
      state.safeX = rect.cx / pageW;
      state.safeY = rect.cy / pageH;
      state.safeW = rect.w / pageW;
      state.safeH = rect.h / pageH;
      onUiSync();
      // No layout regeneration — safe zone only affects visual clipping
    };

    p.mouseReleased = () => {
      state.dragMode = null;
      state.dragStart = null;
      state.safeStart = null;
    };

    p.draw = () => {
      p.rectMode(p.CORNER);
      p.background(state.darkMode ? 20 : 245);
      p.noStroke();
      p.fill(state.darkMode ? 25 : 255);
      p.rect(0, 0, pageW, pageH);

      // Draw shapes, skipping any that intersect the exclusion zone
      const excl = expandedSafeRectPx(state.safeX, state.safeY, state.safeW, state.safeH, state.safeMargin);
      p.noStroke();
      for (const c of state.circles) {
        if (circleIntersectsRect(c, excl)) continue;
        const col = p.color(c.color);
        col.setAlpha(c.alpha);
        p.fill(col);
        drawShape(p, c);
      }

      const safe = currentSafeRect();
      const totalHeight = state.textLines.reduce((sum, line) => sum + lineHeight(line), 0);
      let y = safe.cy - totalHeight * 0.5;

      p.fill(state.darkMode ? 225 : 34);
      p.textAlign(p.CENTER, p.CENTER);
      for (const line of state.textLines) {
        const h = lineHeight(line);
        y += h * 0.5;
        if (line.text) {
          const bold = (line.weight || 400) >= 600;
          const italic = !!line.italic;
          p.textSize(line.size);
          p.textStyle(bold && italic ? p.BOLDITALIC : bold ? p.BOLD : italic ? p.ITALIC : p.NORMAL);
          p.textFont(line.font);
          const content = line.caps ? line.text.toUpperCase() : line.text;
          if (line.tracking > 0) {
            const chars = content.split('');
            let totalWidth = 0;
            for (let i = 0; i < chars.length; i++) {
              totalWidth += p.textWidth(chars[i]);
              if (i + 1 < chars.length) totalWidth += line.tracking;
            }
            let x = safe.cx - totalWidth * 0.5;
            for (let i = 0; i < chars.length; i++) {
              const w = p.textWidth(chars[i]);
              p.text(chars[i], x + w * 0.5, y);
              x += w + line.tracking;
            }
          } else {
            p.text(content, safe.cx, y);
          }
        }
        y += h * 0.5;
      }

      if (state.showGuides || state.showSafe) {
        if (state.showGuides) {
          p.noFill();
          p.stroke(170);
          p.strokeWeight(1);
          p.drawingContext.setLineDash([8, 8]);
          p.rectMode(p.CENTER);
          p.rect(excl.cx, excl.cy, excl.w, excl.h, 12);
        }
        if (state.showSafe) {
          p.noFill();
          p.stroke(60);
          p.strokeWeight(2);
          p.drawingContext.setLineDash([10, 6]);
          p.rectMode(p.CENTER);
          p.rect(safe.cx, safe.cy, safe.w, safe.h, 12);
          p.drawingContext.setLineDash([]);
          for (const h of Object.values(handles(safe))) {
            p.fill(255);
            p.stroke(60);
            p.strokeWeight(2);
            p.circle(h.x, h.y, 12);
          }
        }
        p.drawingContext.setLineDash([]);
      }

      p.noStroke();
      p.fill(state.darkMode ? 200 : 30);
      p.textAlign(p.LEFT, p.TOP);
      p.textStyle(p.NORMAL);
      p.textFont('sans-serif');
      p.textSize(14);
      p.text('Seed: ' + state.seed + '   Shapes: ' + state.circles.length, 16, 16);
    };
  };
}
