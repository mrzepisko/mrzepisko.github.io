export function rngFactory(seed) {
  let s = seed >>> 0;
  return function() {
    s = (1664525 * s + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function rngRange(rng, a, b) { return a + (b - a) * rng(); }

export function weightedRadius(rng, minSize, maxSize) {
  const lo = Math.min(minSize, maxSize - 1);
  const hi = Math.max(maxSize, lo + 1);
  const span = hi - lo;
  const t = rng();
  if (t < 0.3) return rngRange(rng, lo, lo + span * 0.38);
  if (t < 0.8) return rngRange(rng, lo + span * 0.18, lo + span * 0.72);
  return rngRange(rng, lo + span * 0.52, hi);
}
