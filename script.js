/* Portfolio controller: one navigation lock, shared dialogs, and saved preferences. */
(() => {
  'use strict';
  const body = document.body;
  body.classList.add('js');
  const scenes = [...document.querySelectorAll('.scene')];
  const app = document.getElementById('app');
  const dialog = document.getElementById('portfolio-dialog');
  const wipe = document.getElementById('wipe');
  const motionPreference = matchMedia('(prefers-reduced-motion: reduce)');
  const abort = new AbortController();
  const listen = (target, event, callback, options = {}) => target.addEventListener(event, callback, { ...options, signal: abort.signal });
  const storage = { get(key) { try { return localStorage.getItem(key); } catch { return null; } }, set(key, value) { try { localStorage.setItem(key, value); } catch { /* Settings remain available in memory. */ } } };
  let saved = {};
  try { saved = JSON.parse(storage.get('kjp-v5-settings')) || {}; } catch { /* Invalid stored data uses defaults. */ }
  const defaults = { muted: storage.get('kjp-music-muted') === 'true', musicVolume: .38, sfxVolume: .45, cinematic: false, performance: (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4, reducedMotion: motionPreference.matches };
  const settings = { ...defaults };
  for (const key of Object.keys(defaults)) {
    if (typeof defaults[key] === 'boolean' && typeof saved[key] === 'boolean') settings[key] = saved[key];
    if (typeof defaults[key] === 'number' && Number.isFinite(saved[key])) settings[key] = Math.max(0, Math.min(1, saved[key]));
  }
  let current = 0;
  let busy = false;
  let introDone = false;
  let transitionTimer = 0;
  let priorFocus = null;
  let onDialogClose = null;
  const motionWaiters = new Set();
  const emit = (name, detail = {}) => document.dispatchEvent(new CustomEvent(`portfolio:${name}`, { detail }));
  const isTyping = target => Boolean(target?.closest?.('input,textarea,select,[contenteditable]:not([contenteditable="false"]),[role="textbox"]'));
  function applySettings() {
    body.classList.toggle('performance-mode', settings.performance);
    body.classList.toggle('reduced-motion', settings.reducedMotion || motionPreference.matches);
    body.classList.toggle('cinematic-mode', settings.cinematic);
  }
  function saveSettings(patch) {
    for (const key of Object.keys(defaults)) {
      if (!(key in patch)) continue;
      if (typeof defaults[key] === 'boolean') settings[key] = Boolean(patch[key]);
      else if (Number.isFinite(Number(patch[key]))) settings[key] = Math.max(0, Math.min(1, Number(patch[key])));
    }
    applySettings();
    storage.set('kjp-v5-settings', JSON.stringify(settings));
    emit('settings', { ...settings });
  }
  applySettings();
  listen(motionPreference, 'change', () => { applySettings(); emit('settings', { ...settings }); });
  scenes.forEach((scene, index) => { scene.inert = index !== 0; scene.setAttribute('aria-hidden', String(index !== 0)); });

  function waitForMotion(elements) {
    const animations = elements.flatMap(element => element.getAnimations?.() || []).filter(animation => {
      const end = animation.effect?.getComputedTiming().endTime;
      return Number.isFinite(end) && animation.playState !== 'finished';
    });
    if (!animations.length) return Promise.resolve();
    const remaining = Math.max(0, ...animations.map(animation => {
      const end = animation.effect.getComputedTiming().endTime;
      return Math.max(0, end - (Number(animation.currentTime) || 0));
    }));
    return new Promise(resolve => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        clearTimeout(deadline);
        motionWaiters.delete(finish);
        resolve();
      };
      // Cancellation (including a motion preference change) also releases the
      // lock. The measured deadline covers interrupted browser animation events.
      const deadline = setTimeout(finish, Math.min(3000, remaining + 120));
      motionWaiters.add(finish);
      Promise.allSettled(animations.map(animation => animation.finished)).then(finish);
    });
  }

  function go(destination) {
    const next = Math.max(0, Math.min(scenes.length - 1, Number(destination)));
    if (!Number.isInteger(next) || next === current || busy || !introDone || dialog.open) return false;
    const from = current;
    busy = true;
    const reduced = body.classList.contains('reduced-motion');
    body.classList.add('navigating');
    wipe.classList.toggle('closing', next === 0 && from !== 0);
    wipe.classList.add('go');
    const wipeMotion = reduced ? Promise.resolve() : waitForMotion([...wipe.children]);
    if (next === 0) emit('sfx', { kind: 'transition' });
    const activate = () => {
      const previous = scenes[from];
      previous.classList.remove('active');
      previous.classList.add(next > from ? 'exit-left' : 'exit-right');
      previous.inert = true;
      previous.setAttribute('aria-hidden', 'true');
      current = next;
      const scene = scenes[current];
      scene.inert = false;
      scene.setAttribute('aria-hidden', 'false');
      scene.classList.add('active');
      document.querySelectorAll('.section-nav [data-go]').forEach(button => {
        if (Number(button.dataset.go) === current) button.setAttribute('aria-current', 'page');
        else button.removeAttribute('aria-current');
      });
      const count = document.getElementById('count');
      count.textContent = `${String(current + 1).padStart(2, '0')} / ${String(scenes.length).padStart(2, '0')}`;
      count.classList.remove('changing');
      void count.offsetWidth;
      count.classList.add('changing');
      document.getElementById('section-label').textContent = scene.dataset.name;
      document.getElementById('navigation-announcement').textContent = `${scene.dataset.name}, section ${current + 1} of ${scenes.length}`;
      if (previous.contains(document.activeElement)) {
        const heading = scene.querySelector('h1,h2');
        heading.tabIndex = -1;
        heading.focus({ preventScroll: true });
      }
      emit('navigate', { from, to: current });
      return reduced ? Promise.resolve() : waitForMotion([scene, previous]);
    };
    const finish = () => {
      busy = false;
      body.classList.remove('navigating');
      wipe.classList.remove('go', 'closing');
      scenes.forEach(scene => scene.classList.remove('exit-left', 'exit-right'));
    };
    if (reduced) { activate(); finish(); }
    else {
      transitionTimer = window.setTimeout(() => {
        Promise.all([wipeMotion, activate()]).then(finish);
      }, 160);
    }
    return true;
  }

  function closeDialog() { if (dialog.open) dialog.close(); }
  function openDialog({ title, content, className = '', onClose = null }) {
    if (!dialog.open) priorFocus = document.activeElement;
    onDialogClose?.();
    onDialogClose = onClose;
    dialog.className = className;
    document.getElementById('dialog-title').textContent = title;
    document.getElementById('dialog-content').innerHTML = content;
    const toast = document.getElementById('toast');
    dialog.querySelector('.dialog-shell').append(toast);
    if (!dialog.open) dialog.showModal();
    dialog.scrollTop = 0;
    dialog.querySelector('.dialog-close').focus({ preventScroll: true });
    return dialog;
  }
  listen(dialog.querySelector('.dialog-close'), 'click', closeDialog);
  listen(dialog, 'click', event => { if (event.target === dialog) { const box = dialog.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) closeDialog(); } });
  listen(dialog, 'close', () => {
    onDialogClose?.();
    onDialogClose = null;
    body.append(document.getElementById('toast'));
    if (priorFocus?.isConnected && !priorFocus.closest('[inert]')) priorFocus.focus({ preventScroll: true });
    else document.querySelector('.section-nav [aria-current]')?.focus({ preventScroll: true });
  });
  listen(dialog, 'keydown', event => {
    if (event.key !== 'Tab') return;
    const stops = [...dialog.querySelectorAll('button:not(:disabled),a[href],input,select,textarea,[tabindex="0"],summary')].filter(el => el.getClientRects().length);
    if (!stops.length) return;
    if (event.shiftKey && document.activeElement === stops[0]) { event.preventDefault(); stops.at(-1).focus(); }
    else if (!event.shiftKey && document.activeElement === stops.at(-1)) { event.preventDefault(); stops[0].focus(); }
  });

  function finishIntro() {
    app.inert = false;
    document.querySelector('.site-header').inert = false;
    document.querySelector('.site-footer').inert = false;
    body.classList.remove('intro-transition');
    if (introDone) return;
    wipe.classList.remove('go');
    introDone = true;
    body.classList.add('ready');
    app.removeAttribute('aria-busy');
    emit('intro-end');
  }
  window.Portfolio = { scenes, settings, emit, saveSettings, isTyping, go, openDialog, closeDialog, waitForMotion, finishIntro, dialog, get current() { return current; }, get busy() { return busy; }, get introDone() { return introDone; } };
  window.go = go;
  listen(document, 'click', event => { const trigger = event.target.closest('[data-go]'); if (trigger) go(Number(trigger.dataset.go)); });
  listen(document, 'keydown', event => {
    if (event.defaultPrevented || event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || isTyping(event.target) || dialog.open || !introDone) return;
    if (event.target.closest('.projects,.skill-tabs')) return;
    let to;
    if (['ArrowRight', 'ArrowDown', 'PageDown'].includes(event.key)) to = current + 1;
    if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) to = current - 1;
    if (event.key === 'Home' || event.key === 'Escape') to = 0;
    if (event.key === 'End') to = scenes.length - 1;
    if (to !== undefined) { event.preventDefault(); go(to); }
  });
  let lastWheel = 0;
  listen(app, 'wheel', event => {
    if (dialog.open || !introDone || busy || Math.abs(event.deltaY) < 15) return;
    if (event.target.closest('.projects')) return;
    let el = event.target;
    while (el && app.contains(el)) {
      if (el.scrollHeight > el.clientHeight + 3 && /auto|scroll/.test(getComputedStyle(el).overflowY)) return;
      el = el.parentElement;
    }
    if (Date.now() - lastWheel < 900) return;
    lastWheel = Date.now();
    go(current + (event.deltaY > 0 ? 1 : -1));
  }, { passive: true });
  let touch = null;
  listen(app, 'touchstart', event => { touch = event.touches.length === 1 ? { x: event.touches[0].clientX, y: event.touches[0].clientY, target: event.target } : null; }, { passive: true });
  listen(app, 'touchcancel', () => { touch = null; }, { passive: true });
  listen(app, 'touchend', event => {
    if (!touch || dialog.open || event.touches.length || !event.changedTouches.length) { touch = null; return; }
    const start = touch;
    touch = null;
    if (start.target.closest('.projects,input,button,a,.skill-tabs')) return;
    const dx = event.changedTouches[0].clientX - start.x;
    const dy = event.changedTouches[0].clientY - start.y;
    // Vertical gestures always remain available for reading long sections.
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.4) go(current + (dx < 0 ? 1 : -1));
  }, { passive: true });

  const tabs = [...document.querySelectorAll('[data-skill]')];
  function selectSkill(tab) {
    tabs.forEach(button => { const selected = tab === button; button.setAttribute('aria-selected', String(selected)); button.tabIndex = selected ? 0 : -1; document.getElementById(button.getAttribute('aria-controls')).hidden = !selected; });
    emit('sfx', { kind: 'selection' });
  }
  tabs.forEach(tab => listen(tab, 'click', () => selectSkill(tab)));
  listen(document.querySelector('.skill-tabs'), 'keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return;
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    const index = tabs.indexOf(document.activeElement);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    selectSkill(tabs[next]); tabs[next].focus();
  });

  const projectDetails = [
    { title: 'NAILS BY MICHELLE', status: 'Personal project · Completion and public deployment unverified', image: 'project-nails.svg', description: 'A salon booking and management website using PHP and MySQL.', features: ['Appointments, schedules, and salon services', 'Promotions and customer accounts', 'Administrator dashboard'], tech: ['PHP', 'MySQL', 'JavaScript'] },
    { title: 'KERLOV.TV', status: 'In development', image: 'project-kerlov.svg', description: 'A movie, anime, and series discovery website project with a cinematic browsing experience.', features: ['Trailer previews and content browsing', 'Watchlists and user profiles', 'Admin experience'], tech: ['Next.js', 'TypeScript', 'Supabase'] },
    { title: 'INKVERSE', status: 'In development', image: 'project-inkverse.svg', description: 'A manga, manhwa, and manhua reader website project.', features: ['Title catalogs and chapter reading', 'Release synchronization', 'Admin dashboard'], tech: ['PHP', 'MySQL', 'APIs'] },
    { title: 'YAPO REFILLING AND LAUNDRY STATION', status: 'Capstone · Proposed system', image: 'project-yapo.svg', description: 'A proposed Web-Based Multi-Branch Operations Management System for two water-refilling and laundry branches.', features: ['Point of sale, inventory, and service orders', 'Delivery status', 'Sales analytics'], tech: ['Web application', 'POS', 'Inventory'] },
    { title: 'ONE PIECE DEVELOPER PORTFOLIO', status: 'Personal project · Running in this browser', image: 'portfolio-preview.png', description: 'An interactive personal portfolio built with HTML, CSS, and JavaScript, combining manga art direction with accessible navigation.', features: ['Six sliding sections and responsive project carousel', 'Shared accessible guide, character gallery, and treasure hunt', 'Browser-compliant soundtrack, synthesized effects, and motion settings'], tech: ['HTML', 'CSS', 'JavaScript'] },
    { title: 'CISCO NETWORK SECURITY', status: 'Academic networking and security projects', image: 'project-cisco.svg', description: 'Academic Packet Tracer labs exploring networking and secure infrastructure.', features: ['VLANs, routing, and OSPF authentication', 'SSH, NTP, and Syslog', 'RADIUS and TACACS+'], tech: ['Cisco', 'Packet Tracer', 'Network security'] }
  ];
  function openProject(index) {
    const item = projectDetails[index];
    if (!item) return;
    openDialog({ title: item.title, className: 'project-dialog', content: `<p class="detail-status">${item.status}</p><img class="project-detail-image" src="assets/${item.image}" alt="${index === 4 ? 'Actual screenshot of this local portfolio' : 'Illustrative concept preview, not an actual project screenshot'}" width="640" height="380"><p class="preview-caption">${index === 4 && item.image.endsWith('.png') ? 'Screenshot of this portfolio running locally.' : 'Illustrative concept preview. An original project screenshot has not been supplied.'}</p><p>${item.description}</p><ul class="detail-features">${item.features.map(feature => `<li>${feature}</li>`).join('')}</ul><div class="tech-tags">${item.tech.map(tag => `<span>${tag}</span>`).join('')}</div>${index === 4 ? '<button class="detail-action" id="view-portfolio">EXPLORE THIS PORTFOLIO ↗</button>' : '<p class="no-demo">No verified public demo link has been supplied.</p>'}` });
    window.Portfolio.unlock?.('project');
  }
  window.Portfolio.openProject = openProject;
  window.Portfolio.projectDetails = projectDetails;
  listen(document, 'click', event => {
    const trigger = event.target.closest('[data-project-open]');
    if (trigger) openProject(Number(trigger.dataset.projectOpen));
    else if (event.target.closest('.project') && !event.target.closest('a,button')) openProject(Number(event.target.closest('.project').dataset.project));
    if (event.target.closest('#view-portfolio')) { closeDialog(); go(0); }
  });
  const deck = document.querySelector('.projects');
  const cards = [...deck.children];
  let cardIndex = 0;
  function updateDeck() {
    const position = deck.scrollLeft;
    cardIndex = cards.reduce((best, card, index) => Math.abs(card.offsetLeft - cards[0].offsetLeft - position) < Math.abs(cards[best].offsetLeft - cards[0].offsetLeft - position) ? index : best, 0);
    document.getElementById('project-index').textContent = String(cardIndex + 1).padStart(2, '0');
    document.getElementById('projects-prev').disabled = position < 5;
    document.getElementById('projects-next').disabled = position >= deck.scrollWidth - deck.clientWidth - 5;
  }
  function slideDeck(direction) { const index = Math.max(0, Math.min(cards.length - 1, cardIndex + direction)); deck.scrollTo({ left: cards[index].offsetLeft - cards[0].offsetLeft, behavior: body.classList.contains('reduced-motion') ? 'instant' : 'smooth' }); }
  listen(document.getElementById('projects-prev'), 'click', () => slideDeck(-1));
  listen(document.getElementById('projects-next'), 'click', () => slideDeck(1));
  listen(deck, 'scroll', updateDeck, { passive: true });
  let dragging = null;
  let suppressDeckClick = false;
  listen(deck, 'pointerdown', event => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || event.target.closest('button,a')) return;
    dragging = { id: event.pointerId, x: event.clientX, scroll: deck.scrollLeft, moved: false };
  });
  listen(deck, 'pointermove', event => {
    if (!dragging || event.pointerId !== dragging.id || !event.buttons) return;
    const dx = event.clientX - dragging.x;
    if (Math.abs(dx) > 6) {
      dragging.moved = true;
      deck.style.scrollSnapType = 'none';
      if (!deck.hasPointerCapture(event.pointerId)) deck.setPointerCapture(event.pointerId);
      deck.scrollLeft = dragging.scroll - dx;
      event.preventDefault();
    }
  });
  const stopDrag = event => {
    if (!dragging) return;
    suppressDeckClick = dragging.moved;
    if (deck.hasPointerCapture(dragging.id)) deck.releasePointerCapture(dragging.id);
    dragging = null;
    deck.style.removeProperty('scroll-snap-type');
    if (event.type === 'pointercancel') suppressDeckClick = false;
  };
  listen(deck, 'pointerup', stopDrag);
  listen(deck, 'pointercancel', stopDrag);
  listen(deck, 'pointerleave', event => { if (dragging && !dragging.moved) stopDrag(event); });
  listen(deck, 'dragstart', event => event.preventDefault());
  listen(deck, 'click', event => { if (suppressDeckClick) { event.preventDefault(); event.stopPropagation(); suppressDeckClick = false; } }, { capture: true });
  listen(deck, 'keydown', event => { if (event.altKey || event.ctrlKey || event.metaKey || event.isComposing) return; if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') { event.preventDefault(); slideDeck(event.key === 'ArrowRight' ? 1 : -1); } });
  listen(window, 'resize', updateDeck);
  updateDeck();
  // A final safety release makes entry possible even if the optional intro script fails.
  const introWatchdog = setTimeout(() => {
    if (!introDone) { document.getElementById('intro').classList.add('hide'); document.getElementById('intro').hidden = true; window.Portfolio.finishIntro(); }
  }, 6500);
  listen(document, 'portfolio:intro-end', () => clearTimeout(introWatchdog));
  listen(window, 'pagehide', event => { if (!event.persisted) { clearTimeout(transitionTimer); clearTimeout(introWatchdog); motionWaiters.forEach(finish => finish()); abort.abort(); } });
})();
