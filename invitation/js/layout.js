import { pageW, pageH } from './constants.js';
import { rngFactory, rngRange, weightedRadius } from './rng.js';
import { circleIntersectsRect, distToEdge, clamp } from './geometry.js';

function layoutScoreAgainstExisting(x, y, r, circles, packingTightness, overlapBias) {
  let overlapCount = 0;
  let overlapAreaScore = 0;
  let attractionScore = 0;
  let hardReject = false;

  const packing = packingTightness / 100;
  const overlapWanted = overlapBias / 100;
  const preferredFactor = 1.18 - packing * 0.55 - overlapWanted * 0.33;
  const minimumFactor = 0.94 - packing * 0.28 - overlapWanted * 0.24;

  for (const c of circles) {
    const d = Math.hypot(c.x - x, c.y - y);
    const sum = c.r + r;
    const preferred = sum * preferredFactor;
    const minimum = sum * minimumFactor;

    if (d < minimum) {
      hardReject = true;
      break;
    }

    if (d < sum) {
      const overlapDepth = 1 - d / sum;
      overlapCount += 1;
      overlapAreaScore += overlapDepth;
    }

    const delta = Math.abs(d - preferred);
    attractionScore += 1 / (1 + delta * 0.08);
  }

  return { overlapCount, overlapAreaScore, attractionScore, hardReject };
}

export function generateLayout(params, themes) {
  const {
    seed, shapeCount,
    circleWeight, starWeight, heartWeight, triangleWeight,
    edgeBias, overlapBias, transparentRatio, minCircleSize, maxCircleSize,
    packingTightness, palette: paletteName, placementMode
  } = params;

  const rng = rngFactory(seed);
  const circles = [];
  const palette = themes[paletteName] || Object.values(themes)[0];
  const paletteUsage = new Array(palette.length).fill(0);

  // Build shuffled shape sequence from weights
  const shapeTypes = ['circle', 'star', 'heart', 'triangle'];
  const rawWeights = [circleWeight, starWeight, heartWeight, triangleWeight];
  const totalWeight = rawWeights.reduce((a, b) => a + b, 0);
  const shapeSequence = [];
  if (totalWeight === 0) {
    const perShape = Math.floor(shapeCount / 4);
    const rem = shapeCount % 4;
    for (let s = 0; s < 4; s++) {
      const n = perShape + (s < rem ? 1 : 0);
      for (let k = 0; k < n; k++) shapeSequence.push(shapeTypes[s]);
    }
  } else {
    let assigned = 0;
    for (let s = 0; s < 4; s++) {
      const n = s < 3
        ? Math.round(rawWeights[s] / totalWeight * shapeCount)
        : shapeCount - assigned;
      for (let k = 0; k < Math.max(0, n); k++) shapeSequence.push(shapeTypes[s]);
      assigned += n;
    }
  }
  for (let j = shapeSequence.length - 1; j > 0; j--) {
    const k = Math.floor(rng() * (j + 1));
    [shapeSequence[j], shapeSequence[k]] = [shapeSequence[k], shapeSequence[j]];
  }

  for (let i = 0; i < shapeCount; i++) {
    let best = null;

    for (let attempt = 0; attempt < 44; attempt++) {
      const r = weightedRadius(rng, minCircleSize, maxCircleSize);
      let x, y;

      if (circles.length > 0 && rng() < (overlapBias / 100) * 0.75) {
        const anchor = circles[Math.floor(rng() * circles.length)];
        const angle = rngRange(rng, 0, Math.PI * 2);
        const orbitFactor = rngRange(
          rng,
          0.92 - (overlapBias / 100) * 0.18 - (packingTightness / 100) * 0.08,
          1.26 - (packingTightness / 100) * 0.22
        );
        const dist = (anchor.r + r) * orbitFactor;
        x = anchor.x + Math.cos(angle) * dist;
        y = anchor.y + Math.sin(angle) * dist;
      } else {
        const edgeMix = placementMode !== 'uniform' && rng() < edgeBias;
        if (edgeMix) {
          const side = Math.floor(rng() * 4);
          if (side === 0) { x = rngRange(rng, r, pageW - r); y = rngRange(rng, r * 0.2, pageH * 0.22); }
          else if (side === 1) { x = rngRange(rng, pageW * 0.78, pageW - r * 0.2); y = rngRange(rng, r, pageH - r); }
          else if (side === 2) { x = rngRange(rng, r, pageW * 0.2); y = rngRange(rng, r, pageH - r); }
          else { x = rngRange(rng, r, pageW - r); y = rngRange(rng, pageH * 0.78, pageH - r * 0.2); }
        } else {
          x = rngRange(rng, r, pageW - r);
          y = rngRange(rng, r, pageH - r);
        }
      }

      if (x < r || x > pageW - r || y < r || y > pageH - r) continue;
      const candidate = { x, y, r };

      const pair = layoutScoreAgainstExisting(x, y, r, circles, packingTightness, overlapBias);
      if (pair.hardReject) continue;

      let colorIndex = 0;
      let bestColorScore = -1e9;
      for (let cIdx = 0; cIdx < palette.length; cIdx++) {
        let colorScore = -paletteUsage[cIdx] * 0.9;
        for (const c of circles) {
          if (c.colorIndex !== cIdx) continue;
          const d = Math.hypot(c.x - x, c.y - y);
          if (d < 180) colorScore -= (180 - d) / 180 * 1.8;
        }
        colorScore += rng() * 0.2;
        if (colorScore > bestColorScore) {
          bestColorScore = colorScore;
          colorIndex = cIdx;
        }
      }

      let score = 0;
      if (placementMode !== 'uniform') score += (1 - clamp(distToEdge(x, y) / 180, 0, 1)) * (0.35 + edgeBias * 0.55);
      score += pair.attractionScore * (0.12 + (packingTightness / 100) * 0.18);
      score += pair.overlapCount * (overlapBias / 100) * 0.95;
      score += pair.overlapAreaScore * (overlapBias / 100) * 1.5;
      score += rng() * 0.2;

      candidate.colorIndex = colorIndex;
      candidate.color = palette[colorIndex];
      candidate.alpha = rng() < transparentRatio ? rngRange(rng, 90, 180) : 255;
      candidate.score = score;

      if (!best || candidate.score > best.score) best = candidate;
    }

    if (best) {
      delete best.score;
      best.shape = shapeSequence[i] || 'circle';
      best.rotation = rng() * Math.PI * 2;
      circles.push(best);
      paletteUsage[best.colorIndex] += 1;
    }
  }

  return circles;
}
