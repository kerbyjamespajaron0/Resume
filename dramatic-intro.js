/* Measured image/font progress with per-asset deadlines and an independent escape. */
(() => {
  'use strict';
  const P = window.Portfolio;
  if (!P) return;
  const intro = document.getElementById('intro');
  const app = document.getElementById('app');
  const meter = intro.querySelector('[role="progressbar"]');
  const fill = document.getElementById('meter');
  const status = document.getElementById('loading-status');
  const start = performance.now();
  const timers = new Set();
  const images = [];
  const cleanups = [];
  let finished = false;
  let settled = 0;
  let unavailable = 0;
  const reduced = () => document.body.classList.contains('reduced-motion');
  const urls = [...new Set([...document.images].map(image => image.getAttribute('src')).filter(Boolean))];
  const total = urls.length + 1;
  function after(callback, ms) { const id = setTimeout(() => { timers.delete(id); callback(); }, ms); timers.add(id); return id; }
  function progress() {
    if (finished) return;
    const percent = Math.round(settled / total * 100);
    fill.style.width = `${percent}%`; meter.setAttribute('aria-valuenow', String(percent));
    meter.setAttribute('aria-valuetext', `${settled} of ${total} assets checked`);
    status.textContent = `${String(percent).padStart(2, '0')}% / ${settled} OF ${total} ASSETS CHECKED`;
  }
  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout); timers.clear(); cleanups.forEach(clean => clean());
    intro.classList.add('departing');
    intro.setAttribute('aria-busy', 'false');
    const wipe = document.getElementById('wipe');
    document.body.classList.add('intro-transition');
    wipe.classList.add('go');
    if (P.burst) P.burst(innerWidth / 2, innerHeight / 2, true);
    const restoreFocus = intro.contains(document.activeElement);
    let revealed = false;
    const reveal = () => {
      if (revealed) return;
      revealed = true;
      intro.classList.add('hide'); intro.hidden = true;
      // Start the homepage entrance while the middle of the wipe covers it.
      // Interaction remains locked until all three panels have left the screen.
      document.body.classList.add('ready');
    };
    const complete = () => {
      clearTimeout(coverTimer);
      reveal();
      wipe.classList.remove('go');
      document.body.classList.remove('intro-transition');
      P.finishIntro();
      if (restoreFocus) app.focus({ preventScroll: true });
      if (unavailable) console.info(`Portfolio: ${unavailable} preview assets missed the intro deadline; entry remains available.`);
    };
    const duration = getComputedStyle(wipe.firstElementChild).animationDuration.split(',')[0].trim();
    const durationMs = (parseFloat(duration) || 0) * (duration.endsWith('ms') ? 1 : 1000);
    const coverTimer = setTimeout(reveal, reduced() ? 0 : durationMs / 2);
    if (reduced()) complete();
    else P.waitForMotion([...wipe.children]).then(complete);
  }
  window.closeIntro = finish;
  intro.hidden = false; intro.setAttribute('aria-busy', 'true');
  app.inert = true; app.setAttribute('aria-busy', 'true');
  document.querySelector('.site-header').inert = true;
  document.querySelector('.site-footer').inert = true;
  document.getElementById('skip-intro').addEventListener('click', finish);
  const skipKey = event => { if (!finished && !event.repeat && ['Escape', 'Enter'].includes(event.key)) { event.preventDefault(); finish(); } };
  document.addEventListener('keydown', skipKey);
  cleanups.push(() => document.removeEventListener('keydown', skipKey));
  progress();
  const tasks = urls.map(url => new Promise(resolve => {
    const image = new Image(); images.push(image);
    let complete = false;
    const done = failed => {
      if (complete) return; complete = true;
      if (failed) unavailable++;
      image.onload = image.onerror = null; settled++; progress(); resolve();
    };
    image.onload = () => done(false); image.onerror = () => done(true);
    cleanups.push(() => { image.onload = image.onerror = null; });
    image.src = url;
    after(() => done(true), 3200);
    if (image.complete) done(!image.naturalWidth);
  }));
  tasks.push(Promise.race([document.fonts?.ready || Promise.resolve(), new Promise(resolve => after(resolve, 1500))]).then(() => { settled++; progress(); }));
  Promise.allSettled(tasks).then(() => { if (!finished) after(finish, Math.max(0, (reduced() ? 120 : 1100) - (performance.now() - start))); });
  after(finish, 4500);
})();
