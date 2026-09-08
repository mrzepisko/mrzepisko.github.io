/* Interactive portfolio (JSON-drivgr
   - Loads data.json
   - Renders left sections and right entries
   - Adds path/stats decoration
   - Pane focus toggling (Tab / click)
   - Command line with simple commands
   - Open project popup (same as before)
*/

const sectionsBody = document.getElementById('sections');
const entriesBody = document.getElementById('entries');
const leftPathEl = document.getElementById('left-path');
const rightPathEl = document.getElementById('right-path');
const leftStatsEl = document.getElementById('left-stats');
const rightStatsEl = document.getElementById('right-stats');
const cmdInput = document.getElementById('cmdline');
const cmdExecBtn = document.getElementById('cmd-exec');
const popupRoot = document.getElementById('popup-root');

let portfolioData = null;
let focusedPane = 'left'; // 'left' or 'right'
const skins = ['classic', 'hacker', 'light','dogglatte', 'groovy', 'vampire', 'neon', 'pastel'];
let currentSkinIndex = skins.indexOf(document.body.className.replace('skin-', '')) >= 0 ? skins.indexOf(document.body.className.replace('skin-', '')) : 0;

// load JSON
fetch('data.json')
  .then(r => r.json())
  .then(data => {
    portfolioData = data;
    renderSections(data.sections);
    if (data.sections && data.sections.length) {
      selectSectionByIndex(0);
    }
  })
  .catch(err => {
    entriesBody.textContent = 'Failed to load data.json — open console for details';
    console.error(err);
  });

/* ---------------- Render sections (left pane) ---------------- */
function renderSections(sections) {
  sectionsBody.innerHTML = '';
  sections.forEach((s, idx) => {
    const div = document.createElement('div');
    div.className = 'section-entry';
    div.textContent = s.title;
    div.dataset.index = idx;
    div.dataset.sectionId = s.id;
    div.addEventListener('click', () => {
      selectSectionByIndex(idx);
      focusPane('right');
    });
    sectionsBody.appendChild(div);
  });
}

/* select section by index and render its entries */
function selectSectionByIndex(idx) {
  const list = portfolioData.sections;
  if (!list || idx < 0 || idx >= list.length) return;
  // visually mark selection
  sectionsBody.querySelectorAll('.section-entry').forEach(el => el.classList.remove('selected'));
  const target = sectionsBody.querySelector(`.section-entry[data-index="${idx}"]`);
  if (target) target.classList.add('selected');

  const id = list[idx].title.replace(/[\s/]+/g, '_').toLowerCase();
  // render entries
  renderEntries(list[idx], id);

  // update paths
  leftPathEl.textContent = `/home/mrzepisko/portfolio`;
  rightPathEl.textContent = `/home/mrzepisko/portfolio/${id}`;
 // update stats
  updatePaneStats('left', list.length);
  updatePaneStats('right', list[idx].entries.length, estimateSize(list[idx]));
  const pane = document.querySelector('[data-pane="right"]');
}

/* render entries into right pane */
function renderEntries(section, id) {
  entriesBody.innerHTML = '';
  if (!section.entries || section.entries.length === 0) {
    const p = document.createElement('div');
    p.className = 'entry entry-text';
    p.textContent = '(no entries)';
    entriesBody.appendChild(p);
    return;
  }
  section.entries.forEach((entry, idx) => {
    const div = document.createElement('div');
    div.className = 'entry';
    div.dataset.index = idx;

    // types: text, link, project
    if (entry.type === 'text') {
      div.classList.add('entry-text');
      const pre = document.createElement('pre');
      pre.textContent = entry.content;
      div.appendChild(pre);
    } else if (entry.type === 'link') {
      const a = document.createElement('a');
      a.href = entry.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = entry.label;
      div.appendChild(a);
    } else if (entry.type === 'project') {
      const project = findProjectById(entry.projectId);
      if (project) {
        div.textContent = `${project.title} (${project.year}) — ${project.platform || 'Unknown'}`;
        div.dataset.projectId = project.id;
        // div.addEventListener('dblclick', () => openProjectPopup(project)); // double click to open
        div.addEventListener('click', () => openProjectPopup(project));
      } else {
        div.textContent = entry.label || '(unknown project)';
      }
    } else {
      div.textContent = JSON.stringify(entry);
    }

    // if (idx === 0) div.classList.add('selected');
    entriesBody.appendChild(div);
  });

  // update right stats in case of different section
  const sec = section;
  entriesBody.className = 'pane-body';
  entriesBody.classList.add(`section-${id.replaceAll('_', '-')}`);
  updatePaneStats('right', sec.entries.length, estimateSize(sec));
}

/* ---------------- utilities ---------------- */
function findProjectById(id) {
  if (!portfolioData || !portfolioData.projects) return null;
  return portfolioData.projects.find(p => p.id === id) || null;
}

/* project siblings within the currently selected section, for popup prev/next */
function getProjectSiblings(project) {
  const secIdx = getSelectedSectionIndex();
  const section = (secIdx !== null && portfolioData.sections[secIdx]) ? portfolioData.sections[secIdx] : null;
  const list = section
    ? section.entries.filter(e => e.type === 'project').map(e => findProjectById(e.projectId)).filter(Boolean)
    : [project];
  let index = list.findIndex(p => p.id === project.id);
  if (index < 0) { list.unshift(project); index = 0; }
  return { list, index };
}

/* Estimate directory size lightly (for fun) */
function estimateSize(section) {
  let kb = 0;
  (section.entries || []).forEach(e => {
    if (e.type === 'project') {
      const p = findProjectById(e.projectId);
      const shots = (p && p.screenshots) ? p.screenshots.length : 0;
      kb += 300 + shots * 600; // base 300KB per project + 600KB per screenshot
    } else if (e.type === 'link') {
      kb += 5;
    } else if (e.type === 'text') {
      kb += Math.max(1, Math.ceil((e.content || '').length / 80));
    }
  });
  // return nicely formatted
  if (kb < 1024) return `${kb} KB`;
  return `${(kb/1024).toFixed(1)} MB`;
}

function updatePaneStats(pane, itemCount, sizeHint) {
  const el = pane === 'left' ? leftStatsEl : rightStatsEl;
  el.textContent = `${itemCount} items — ${sizeHint || '~0 KB'}`;
}

/* ---------------- pane focus & keyboard ---------------- */
function focusPane(pane) {
  focusedPane = pane;
  document.querySelectorAll('.pane').forEach(p => p.classList.remove('focus'));
  const el = pane === 'left' ? document.getElementById('sections-pane') : document.getElementById('entries-pane');
  if (el) el.classList.add('focus');

  // move focus visually to command input for convenience
  // cmdInput.focus();
}

// pane click to focus
document.getElementById('sections-pane').addEventListener('click', () => focusPane('left'));
document.getElementById('entries-pane').addEventListener('click', () => focusPane('right'));

// Tab to toggle focus
document.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    focusPane(focusedPane === 'left' ? 'right' : 'left');
  }
  // F9 skin cycle
  if (e.key === 'F9') {
    currentSkinIndex = (currentSkinIndex + 1) % skins.length;
    const skin = skins[currentSkinIndex];
    document.body.className = `skin-${skin}`;
    localStorage.setItem('skin', skin);
  }
  // Enter opens selected entry if focused on entries
  if (e.key === 'Enter' && document.activeElement !== cmdInput) {
    if (focusedPane === 'right') {
      const sel = entriesBody.querySelector('.entry.selected');
      if (sel && sel.dataset.projectId) {
        const proj = findProjectById(sel.dataset.projectId);
        if (proj) openProjectPopup(proj);
      } else if (sel) {
        const a = sel.querySelector('a');
        if (a) a.click();
      }
    }
  }
});

/* ---------------- command line ---------------- */
cmdExecBtn.addEventListener('click', () => executeCommand(cmdInput.value.trim()));
cmdInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    executeCommand(cmdInput.value.trim());
  }
});

function executeCommand(cmd) {
  if (!cmd) return;
  const parts = cmd.split(/\s+/);
  const verb = parts[0].toLowerCase();
  const arg = parts.slice(1).join(' ');

  switch (verb) {
    case 'help':
      showCommandOutput([
        'Commands:',
        '  ls                 — re-list the focused pane',
        '  open <n>           — open nth entry in right pane (1-based)',
        "  cd <sectionId>     — change left selection to sectionId (e.g. 'cd gamejams')",
        ` skin <name>        — set skin (${skins.join(', ').trimEnd()})`,
        '  clear              — clear right pane (temporary)',
        '  quit               — clear and show goodbye'
      ]);
      break;

    case 'ls':
      // simply re-render current selection
      const selIdx = getSelectedSectionIndex();
      if (selIdx !== null) selectSectionByIndex(selIdx);
      break;

    case 'open':
      if (focusedPane === 'right') {
        const n = parseInt(parts[1], 10);
        if (!isNaN(n)) {
          const entry = entriesBody.querySelector(`.entry[data-index="${n-1}"]`);
          if (entry) {
            entry.click();
            // open if project
            if (entry.dataset.projectId) {
              const proj = findProjectById(entry.dataset.projectId);
              if (proj) openProjectPopup(proj);
            } else {
              // if it's a link, follow
              const a = entry.querySelector('a');
              if (a) window.open(a.href, '_blank', 'noopener');
            }
          } else {
            showCommandOutput([`open: entry ${n} not found`]);
          }
        } else {
          showCommandOutput(['open: invalid index (use open <n>)']);
        }
      } else {
        showCommandOutput(['open: focus right pane to open entries']);
      }
      break;

    case 'cd':
      if (!arg) { showCommandOutput(['cd: missing sectionId']); break; }
      const idx = portfolioData.sections.findIndex(s => s.id === arg || s.title.toLowerCase() === arg.toLowerCase());
      if (idx >= 0) {
        selectSectionByIndex(idx);
        focusPane('right');
      } else showCommandOutput([`cd: Permission denied`]);
      break;

    case 'skin':
      if (!arg) { showCommandOutput(['skin: missing name']); break; }
      {
        const name = arg.toLowerCase();
        if (skins.includes(name)) {
          currentSkinIndex = skins.indexOf(name);
          document.body.className = `skin-${name}`;
           localStorage.setItem('skin', name);   
          showCommandOutput([`skin: switched to ${arg}`]);
        } else showCommandOutput([`skin: unknown skin '${arg}'`]);
      }
      break;

    case 'clear':
      entriesBody.innerHTML = '';
      showCommandOutput(['(cleared)']);
      break;

    case 'quit':
      entriesBody.innerHTML = '';
      showCommandOutput(['Goodbye.']);
      break;

    default:
      showCommandOutput([`Unknown command: ${verb} — type 'help' for a list.`]);
      break;
  }

  cmdInput.value = '';
}

/* prints a small text block in right pane */
function showCommandOutput(lines) {
  entriesBody.innerHTML = '';
  lines.forEach((line, i) => {
    const d = document.createElement('div');
    d.className = 'entry entry-text';
    d.textContent = line;
    entriesBody.appendChild(d);
  });
  updatePaneStats('right', entriesBody.querySelectorAll('.entry').length, '~0 KB');
}

/* find currently selected section index */
function getSelectedSectionIndex() {
  const el = sectionsBody.querySelector('.section-entry.selected');
  return el ? parseInt(el.dataset.index, 10) : null;
}

// skin footer
const footer = document.getElementById("change-skin");
footer.addEventListener('click', () => {
	currentSkinIndex = (currentSkinIndex + 1) % skins.length;
    const skin = skins[currentSkinIndex];
    document.body.className = `skin-${skin}`;
    localStorage.setItem('skin', skin);
});

/* ---------------- Popup logic (same as previous) ---------------- */

function openProjectPopup(project) {
  popupRoot.innerHTML = '';

  entriesBody.querySelectorAll('.entry').forEach(e => {
    e.classList.toggle('selected', e.dataset.projectId === project.id);
  });

  const overlay = document.createElement('div');
  overlay.className = 'popup-overlay';
  overlay.tabIndex = -1;

  const popup = document.createElement('div');
  popup.className = 'popup';

  // header (title)
  const hdr = document.createElement('div');
  hdr.className = 'popup-header';
  hdr.innerHTML = `<span class="popup-title">${escapeHtml(project.title)}</span><span class="popup-year">${project.year || ''}</span>`;
  popup.appendChild(hdr);

  // meta (role/platform)
  const meta = document.createElement('div');
  meta.className = 'popup-meta';
  meta.textContent = `${project.role || 'Role: —'}  •  ${project.platform || 'Platform: —'}`;
  popup.appendChild(meta);

  // description
  const desc = document.createElement('pre');
  desc.className = 'popup-desc';
  desc.textContent = project.description || '(No description provided)';
  popup.appendChild(desc);

  // screenshots area (thumbnail grid)
  const ssWrap = document.createElement('div');
  ssWrap.className = 'screenshot-grid';
  popup.appendChild(ssWrap);

  // controls (project prev/next, then close)
  const controls = document.createElement('div');
  controls.className = 'popup-controls';
  const siblings = getProjectSiblings(project);
  let prevProjectBtn = null;
  let nextProjectBtn = null;
  if (siblings.list.length > 1) {
    prevProjectBtn = document.createElement('button');
    prevProjectBtn.className = 'popup-btn';
    prevProjectBtn.textContent = '◀';
    prevProjectBtn.setAttribute('aria-label', 'Previous project');
    nextProjectBtn = document.createElement('button');
    nextProjectBtn.className = 'popup-btn';
    nextProjectBtn.textContent = '▶';
    nextProjectBtn.setAttribute('aria-label', 'Next project');
    controls.appendChild(prevProjectBtn);
    controls.appendChild(nextProjectBtn);
  }
  const closeBtn = document.createElement('button');
  closeBtn.className = 'popup-btn close';
  closeBtn.textContent = 'Close';
  controls.appendChild(closeBtn);
  popup.appendChild(controls);

  // links list
  if (project.links && project.links.length) {
    const linksBox = document.createElement('div');
    linksBox.className = 'popup-links';
    project.links.forEach(link => {
      const a = document.createElement('a');
      a.href = link.url;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.textContent = link.label;
      linksBox.appendChild(a);
    });
    popup.appendChild(linksBox);
  }

  overlay.appendChild(popup);
  popupRoot.appendChild(overlay);
  popupRoot.setAttribute('aria-hidden', 'false');

  // screenshot thumbnails
  const screenshots = (project.screenshots && project.screenshots.length) ? project.screenshots : [];
  renderThumbnails();

  function renderThumbnails() {
    ssWrap.innerHTML = '';
    if (!screenshots.length) {
      const empty = document.createElement('div');
      empty.className = 'screenshot-grid-empty';
      empty.textContent = '[ no screenshots ]';
      ssWrap.appendChild(empty);
      return;
    }
    screenshots.forEach((filename, idx) => {
      ssWrap.appendChild(createThumb(filename, idx));
    });
  }

  function createThumb(filename, idx) {
    const isVideo = /\.mp4$/i.test(filename);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'thumb';
    btn.dataset.index = idx;
    btn.setAttribute('aria-label', `Open screenshot ${idx + 1} of ${screenshots.length}`);

    const placeholder = document.createElement('span');
    placeholder.className = 'thumb-placeholder';
    btn.appendChild(placeholder);

    const media = document.createElement(isVideo ? 'video' : 'img');
    media.className = 'thumb-img';
    media.src = `media/${filename}`;
    if (isVideo) {
      media.muted = true;
      media.preload = 'metadata';
      media.playsInline = true;
    } else {
      media.alt = `${project.title} screenshot ${idx + 1}`;
      media.loading = 'lazy';
      media.decoding = 'async';
    }
    media.addEventListener(isVideo ? 'loadeddata' : 'load', () => {
      btn.classList.add('loaded');
    }, { once: true });
    media.addEventListener('error', () => {
      btn.classList.add('loaded', 'errored');
      media.replaceWith(createFallbackEl(filename));
    }, { once: true });
    btn.appendChild(media);

    if (isVideo) {
      const badge = document.createElement('span');
      badge.className = 'thumb-video-badge';
      badge.textContent = '▶';
      btn.appendChild(badge);
    }

    btn.addEventListener('click', () => openLightbox(idx, btn));
    return btn;
  }

  function createFallbackEl(filename) {
    const fb = document.createElement('span');
    fb.className = 'thumb-fallback';
    fb.textContent = 'Failed to load';
    fb.title = filename;
    return fb;
  }

  closeBtn.addEventListener('click', closePopup);
  if (prevProjectBtn) prevProjectBtn.addEventListener('click', () => switchProject(-1));
  if (nextProjectBtn) nextProjectBtn.addEventListener('click', () => switchProject(1));

  function switchProject(delta) {
    if (siblings.list.length <= 1) return;
    const nextIndex = ((siblings.index + delta) % siblings.list.length + siblings.list.length) % siblings.list.length;
    const nextProject = siblings.list[nextIndex];
    closePopup();
    openProjectPopup(nextProject);
  }

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closePopup();
  });

  /* ---------- lightbox (screenshot viewer, layered above this popup) ---------- */
  let lightbox = null; // { overlay, stage, caption, index, trigger }

  function openLightbox(startIndex, trigger) {
    if (!screenshots.length) return;

    const lbOverlay = document.createElement('div');
    lbOverlay.className = 'lightbox-overlay';
    lbOverlay.tabIndex = -1;

    const lb = document.createElement('div');
    lb.className = 'lightbox';

    const stage = document.createElement('div');
    stage.className = 'lightbox-stage';

    const lbControls = document.createElement('div');
    lbControls.className = 'lightbox-controls';
    const prevBtn = document.createElement('button');
    prevBtn.className = 'lightbox-btn';
    prevBtn.textContent = '◀';
    prevBtn.setAttribute('aria-label', 'Previous screenshot');
    const nextBtn = document.createElement('button');
    nextBtn.className = 'lightbox-btn';
    nextBtn.textContent = '▶';
    nextBtn.setAttribute('aria-label', 'Next screenshot');
    const lbCloseBtn = document.createElement('button');
    lbCloseBtn.className = 'lightbox-btn close';
    lbCloseBtn.textContent = 'Close';
    lbControls.appendChild(prevBtn);
    lbControls.appendChild(nextBtn);
    lbControls.appendChild(lbCloseBtn);

    const caption = document.createElement('div');
    caption.className = 'lightbox-caption';

    lb.appendChild(stage);
    lb.appendChild(lbControls);
    lb.appendChild(caption);
    lbOverlay.appendChild(lb);
    popupRoot.appendChild(lbOverlay);

    lightbox = { overlay: lbOverlay, stage, caption, index: startIndex, trigger };

    prevBtn.addEventListener('click', () => showLightboxMedia(lightbox.index - 1));
    nextBtn.addEventListener('click', () => showLightboxMedia(lightbox.index + 1));
    lbCloseBtn.addEventListener('click', closeLightbox);
    lbOverlay.addEventListener('click', (ev) => {
      if (ev.target.closest('.lightbox-media, .lightbox-btn')) return;
      closeLightbox();
    });

    showLightboxMedia(startIndex);
    lbOverlay.focus();
  }

  function showLightboxMedia(i) {
    if (!lightbox) return;
    const index = ((i % screenshots.length) + screenshots.length) % screenshots.length;
    lightbox.index = index;
    const filename = screenshots[index];
    const isVideo = /\.mp4$/i.test(filename);

    lightbox.stage.classList.remove('loaded');
    lightbox.stage.innerHTML = '';
    const spinner = document.createElement('span');
    spinner.className = 'lightbox-placeholder';
    lightbox.stage.appendChild(spinner);

    const media = document.createElement(isVideo ? 'video' : 'img');
    media.className = 'lightbox-media';
    media.src = `media/${filename}`;
    if (isVideo) {
      media.controls = true;
      media.autoplay = true;
      media.loop = true;
      media.muted = true;
      media.playsInline = true;
    } else {
      media.alt = `${project.title} screenshot ${index + 1}`;
      media.decoding = 'async';
    }
    media.addEventListener(isVideo ? 'loadeddata' : 'load', () => {
      lightbox.stage.classList.add('loaded');
    }, { once: true });
    media.addEventListener('error', () => {
      lightbox.stage.classList.add('loaded');
      const fb = document.createElement('div');
      fb.className = 'lightbox-fallback';
      fb.innerHTML = `<div>Failed to load</div><div>${escapeHtml(filename)}</div>`;
      media.replaceWith(fb);
    }, { once: true });
    lightbox.stage.appendChild(media);

    lightbox.caption.textContent = `${index + 1} / ${screenshots.length}`;
  }

  function closeLightbox() {
    if (!lightbox) return;
    const trigger = lightbox.trigger;
    lightbox.overlay.remove();
    lightbox = null;
    if (trigger) trigger.focus();
  }

  function onKey(e) {
    if (lightbox) {
      if (e.key === 'Escape') closeLightbox();
      else if (e.key === 'ArrowLeft') showLightboxMedia(lightbox.index - 1);
      else if (e.key === 'ArrowRight') showLightboxMedia(lightbox.index + 1);
      return;
    }
    if (e.key === 'Escape') closePopup();
    else if (e.key === 'ArrowLeft') switchProject(-1);
    else if (e.key === 'ArrowRight') switchProject(1);
  }
  document.addEventListener('keydown', onKey);
  overlay.focus();

  function closePopup() {
    document.removeEventListener('keydown', onKey);
    popupRoot.innerHTML = '';
    popupRoot.setAttribute('aria-hidden', 'true');
  }
}

/* helper */
function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}
