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
        div.addEventListener('click', () => {
          // single click selects
          entriesBody.querySelectorAll('.entry').forEach(e => e.classList.remove('selected'));
          div.classList.add('selected');
          openProjectPopup(project);
        });
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

/* ---------------- Popup logic (same as previous) ---------------- */

function openProjectPopup(project) {
  popupRoot.innerHTML = '';

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

  // screenshots area
  const ssWrap = document.createElement('div');
  ssWrap.className = 'popup-screenshots';
  popup.appendChild(ssWrap);

  // controls for screenshots
  const controls = document.createElement('div');
  controls.className = 'popup-controls';
  const prevBtn = document.createElement('button');
  prevBtn.className = 'popup-btn';
  prevBtn.textContent = '◀';
  const nextBtn = document.createElement('button');
  nextBtn.className = 'popup-btn';
  nextBtn.textContent = '▶';
  const closeBtn = document.createElement('button');
  closeBtn.className = 'popup-btn close';
  closeBtn.textContent = 'Close';
  controls.appendChild(prevBtn);
  controls.appendChild(nextBtn);
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

  // screenshot handling
  let currentIndex = 0;
  const screenshots = (project.screenshots && project.screenshots.length) ? project.screenshots : [];
  function renderScreenshot(i) {
    ssWrap.innerHTML = ''; // clear
    if (!screenshots.length) {
      const placeholder = document.createElement('div');
      placeholder.className = 'screenshot placeholder';
      placeholder.textContent = '[ no screenshots ]';
      ssWrap.appendChild(placeholder);
      return;
    }
    currentIndex = ((i % screenshots.length) + screenshots.length) % screenshots.length;
    const filename = screenshots[currentIndex];
    const isVideo = filename.endsWith('mp4'); 
    const t = isVideo ? 'video' : 'img';
    const img = document.createElement(t);
    img.className = 'screenshot';
    img.alt = project.title + ' screenshot ' + (currentIndex + 1);
    img.src = `media/${filename}`;
    if (isVideo) {
        img.autoplay = {};
        img.loop = {};
    }
    img.onerror = () => {
      img.replaceWith(createScreenshotFallback(screenshots[currentIndex]));
    };
    ssWrap.appendChild(img);

    // caption
    const caption = document.createElement('div');
    caption.className = 'screenshot-caption';
    caption.textContent = `${currentIndex + 1} / ${screenshots.length}`;
    ssWrap.appendChild(caption);
  }

  function createScreenshotFallback(url) {
    const fb = document.createElement('div');
    fb.className = 'screenshot fallback';
    fb.innerHTML = `<div>Failed to load</div><div>${escapeHtml(url)}</div>`;
    return fb;
  }

  renderScreenshot(currentIndex);

  prevBtn.addEventListener('click', () => renderScreenshot(currentIndex - 1));
  nextBtn.addEventListener('click', () => renderScreenshot(currentIndex + 1));
  closeBtn.addEventListener('click', closePopup);

  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) closePopup();
  });

  function onKey(e) {
    if (e.key === 'Escape') closePopup();
    if (e.key === 'ArrowLeft') renderScreenshot(currentIndex - 1);
    if (e.key === 'ArrowRight') renderScreenshot(currentIndex + 1);
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
