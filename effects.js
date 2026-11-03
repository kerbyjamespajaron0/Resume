/* Small event-driven visual effects; no permanent background rendering loop. */
(() => {
  'use strict';
  const P = window.Portfolio;
  if (!P) return;
  const abort = new AbortController();
  const listen = (target, name, callback, options = {}) => target.addEventListener(name, callback, { ...options, signal: abort.signal });
  const body = document.body;
  const sparkLayer = document.getElementById('sparks');
  const coarse = matchMedia('(pointer: coarse)');
  const reduced = () => body.classList.contains('reduced-motion');
  const intense = () => !reduced() && !P.settings.performance;
  const timers = new Set();
  function later(callback, delay) { const timer = setTimeout(() => { timers.delete(timer); callback(); }, delay); timers.add(timer); return timer; }
  function splitText(element) {
    let index = 0;
    const nodes = [...element.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
    for (const node of nodes) {
      const fragment = document.createDocumentFragment();
      for (const character of node.textContent) {
        const span = document.createElement('span');
        span.className = 'letter'; span.style.setProperty('--i', index++); span.textContent = character;
        fragment.append(span);
      }
      node.replaceWith(fragment);
    }
  }
  document.querySelectorAll('[data-split],.section-nav button').forEach(element => {
    if (!element.hasAttribute('aria-hidden') && !element.hasAttribute('aria-label')) element.setAttribute('aria-label', element.textContent.trim());
    splitText(element);
  });
  document.querySelectorAll('.timeline-item,.contactlinks a,.project,.tech-tags').forEach(element => {
    element.style.setProperty('--order', [...element.parentElement.children].indexOf(element));
  });
  document.querySelectorAll('.tech-tags').forEach(tags => [...tags.children].forEach((tag, index) => tag.style.setProperty('--order', index)));
  function burst(x, y, large = false) {
    if (reduced() || sparkLayer.childElementCount > 60) return;
    const count = P.settings.performance ? (large ? 8 : 4) : (large ? 32 : 9);
    const colors = ['#f6f2e9', '#df1430', '#f5d87a'];
    for (let index = 0; index < count; index++) {
      const spark = document.createElement('i');
      const angle = index / count * Math.PI * 2;
      const distance = (large ? 140 : 35) + Math.random() * (large ? 220 : 65);
      spark.className = 'spark';
      spark.style.left = `${x}px`; spark.style.top = `${y}px`;
      spark.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      spark.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      spark.style.setProperty('--color', colors[index % colors.length]);
      spark.style.setProperty('--size', `${3 + Math.random() * 4}px`);
      sparkLayer.append(spark); later(() => spark.remove(), 800);
    }
  }
  P.burst = burst;
  listen(document, 'click', event => {
    const button = event.target.closest('button,.contactlinks a');
    if (!button) return;
    const bounds = button.getBoundingClientRect();
    // Keyboard-activated controls have no pointer coordinates.
    burst(event.detail ? event.clientX : bounds.left + bounds.width / 2, event.detail ? event.clientY : bounds.top + bounds.height / 2);
    if (button.closest('.section-nav')) {
      button.classList.remove('scattering'); void button.offsetWidth; button.classList.add('scattering');
      later(() => button.classList.remove('scattering'), 700);
    }
  });
  let pointerFrame = 0;
  let pointer = null;
  function updatePointer() {
    pointerFrame = 0;
    if (!pointer || !intense() || coarse.matches || document.hidden || P.dialog.open) return;
    const { x, y, target } = pointer;
    const nx = (x / innerWidth - .5) * 2, ny = (y / innerHeight - .5) * 2;
    body.style.setProperty('--mouse-x', `${x}px`); body.style.setProperty('--mouse-y', `${y}px`);
    body.style.setProperty('--parallax-x', `${nx * 9}px`); body.style.setProperty('--parallax-y', `${ny * 6}px`);
    body.style.setProperty('--layer-x', `${nx * -15}px`); body.style.setProperty('--layer-y', `${ny * -10}px`);
    body.style.setProperty('--project-x', `${nx * -10}px`);
    body.classList.add('pointer-active');
    const card = target.closest?.('.project,.portrait-tilt');
    if (card) {
      const box = card.getBoundingClientRect();
      const dx = (x - box.left) / box.width - .5, dy = (y - box.top) / box.height - .5;
      if (card.matches('.project')) { card.style.setProperty('--tilt-x', `${dx * 6}deg`); card.style.setProperty('--tilt-y', `${-dy * 5}deg`); }
      else card.style.transform = `perspective(700px) rotateY(${dx * 10}deg) rotateX(${-dy * 8}deg)`;
    }
    const magnetic = target.closest?.('.magnetic');
    if (magnetic) {
      const box = magnetic.getBoundingClientRect();
      magnetic.style.transform = `translate(${(x - box.left - box.width / 2) * .035}px,${(y - box.top - box.height / 2) * .09}px)`;
    }
  }
  listen(document, 'pointermove', event => { pointer = { x: event.clientX, y: event.clientY, target: event.target }; if (!pointerFrame && intense() && !coarse.matches) pointerFrame = requestAnimationFrame(updatePointer); }, { passive: true });
  listen(document, 'pointerout', event => {
    for (const selector of ['.project', '.portrait-tilt', '.magnetic']) {
      const element = event.target.closest?.(selector);
      if (element && !element.contains(event.relatedTarget)) { element.style.removeProperty('--tilt-x'); element.style.removeProperty('--tilt-y'); element.style.removeProperty('transform'); }
    }
    if (!event.relatedTarget) body.classList.remove('pointer-active');
  }, { passive: true });
  function ambient() {
    document.querySelectorAll('.ambient-particle').forEach(particle => particle.remove());
    if (reduced() || P.current !== 5 || document.hidden) return;
    const scene = P.scenes[5];
    const count = P.settings.performance ? 0 : 10;
    for (let index = 0; index < count; index++) {
      const particle = document.createElement('i'); particle.className = 'ambient-particle'; particle.setAttribute('aria-hidden', 'true');
      particle.style.setProperty('--left', `${index * 9 + 2}%`); particle.style.setProperty('--delay', `${index * -.9}s`); scene.append(particle);
    }
  }
  function restartSkills() {
    const tracks = P.scenes[3].querySelectorAll('.skill-track>i');
    tracks.forEach(track => { track.classList.remove('bar-enter'); });
    requestAnimationFrame(() => tracks.forEach(track => track.classList.add('bar-enter')));
  }
  listen(document, 'portfolio:navigate', () => { ambient(); if (P.current === 3) restartSkills(); });
  listen(document.querySelector('.skill-tabs'), 'click', restartSkills);
  listen(document.querySelector('.skill-tabs'), 'keydown', event => { if (['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) restartSkills(); });
  listen(document, 'portfolio:settings', () => {
    ambient();
    if (!intense()) {
      body.classList.remove('pointer-active');
      ['--parallax-x', '--parallax-y', '--layer-x', '--layer-y', '--project-x'].forEach(name => body.style.removeProperty(name));
      document.querySelectorAll('.project,.portrait-tilt,.magnetic').forEach(el => { el.style.removeProperty('transform'); el.style.removeProperty('--tilt-x'); el.style.removeProperty('--tilt-y'); });
    }
  });
  listen(document, 'visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(pointerFrame); pointerFrame = 0; } ambient(); });
  listen(window, 'pagehide', event => { if (!event.persisted) { abort.abort(); cancelAnimationFrame(pointerFrame); timers.forEach(clearTimeout); } });
})();
