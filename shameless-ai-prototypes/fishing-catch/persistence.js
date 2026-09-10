// Everything this prototype keeps between visits, in one localStorage key.
// Deliberately narrow: just the catch/junk/lost counts, the difficulty
// catch log, whether the tutorial popup has been seen, and the 2D/3D view
// choice - nothing else (no config overrides, no in-progress cast/reel
// state) survives a reload.
const Persistence = (function () {
  const STORAGE_KEY = 'fishing-catch-save-v1';

  function load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      return null;
    }
  }

  function write(patch) {
    try {
      const existing = load() || {};
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, ...patch }));
    } catch (err) {
      // localStorage unavailable (private mode, quota, disabled) - the
      // game still works, it just won't remember anything between visits.
    }
  }

  function saveStats(state) {
    write({
      catchCount: state.catchCount,
      trashCount: state.trashCount,
      escapedCount: state.escapedCount,
      catchLog: state.catchLog,
    });
  }

  function applyStats(state) {
    const saved = load();
    if (!saved) {
      return;
    }
    if (typeof saved.catchCount === 'number') {
      state.catchCount = saved.catchCount;
    }
    if (typeof saved.trashCount === 'number') {
      state.trashCount = saved.trashCount;
    }
    if (typeof saved.escapedCount === 'number') {
      state.escapedCount = saved.escapedCount;
    }
    if (saved.catchLog && typeof saved.catchLog === 'object') {
      state.catchLog = saved.catchLog;
    }
  }

  function hasSeenTutorial() {
    const saved = load();
    return !!(saved && saved.tutorialSeen);
  }

  function markTutorialSeen() {
    write({ tutorialSeen: true });
  }

  function saveViewMode(isometric) {
    write({ isometric });
  }

  // Only overrides the caller's default when there's an actual saved
  // choice AND the browser can still render it - a saved "3D" preference
  // from a device that supported WebGL should never force 3D on one that
  // doesn't now.
  function applyViewMode(config, webglSupported) {
    if (!webglSupported) {
      config.debug.isometric = false;
      return;
    }
    const saved = load();
    if (saved && typeof saved.isometric === 'boolean') {
      config.debug.isometric = saved.isometric;
    }
  }

  function clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (err) {
      // ignore
    }
  }

  return { saveStats, applyStats, hasSeenTutorial, markTutorialSeen, saveViewMode, applyViewMode, clear };
})();
