/* Optional crew gallery, treasure hunt, visitor achievements, and pirate secrets. */
(() => {
  'use strict';
  const P = window.Portfolio;
  if (!P) return;
  const storage = {
    get(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } },
    set(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* Private mode can disable storage. */ } }
  };
  const definitions = {
    explorer: ['Grand Line explorer', 'Visit all six portfolio sections.'],
    crew: ['Straw Hat ally', 'Meet Luffy, Zoro, Sanji, and Chopper.'],
    treasure: ['Treasure hunter', 'Find the treasure in the mini-game.'],
    project: ['Under the hood', 'Open a project to inspect the details.'],
    secret: ['Pirate signal', 'Discover a hidden pirate interaction.']
  };
  const savedAchievements = storage.get('kjp-v5-achievements', []);
  P.achievements = new Set(Array.isArray(savedAchievements) ? savedAchievements.filter(id => typeof id === 'string') : []);
  const savedVisited = storage.get('kjp-v5-visited', [0]);
  P.visited = new Set((Array.isArray(savedVisited) ? savedVisited : [0]).filter(i => Number.isInteger(i) && i >= 0 && i < P.scenes.length));
  P.visited.add(P.current || 0);
  let toastTimer = 0;
  const panel = () => document.getElementById('dialog-content');
  function toast(message) {
    const el = document.getElementById('toast');
    if (!el) return;
    clearTimeout(toastTimer);
    el.textContent = message;
    el.classList.add('show');
    toastTimer = window.setTimeout(() => el.classList.remove('show'), 3400);
  }
  P.toast = toast;
  P.renderAchievements = () => {
    const box = document.getElementById('guide-achievements');
    if (!box) return;
    box.innerHTML = `<h3>YOUR EXPLORATION // ${Object.keys(definitions).filter(id => P.achievements.has(id)).length} / ${Object.keys(definitions).length}</h3><ul class="achievement-list">${Object.entries(definitions).map(([id, values]) => `<li class="${P.achievements.has(id) ? 'earned' : ''}"><strong>${values[0]}${P.achievements.has(id) ? ' — unlocked' : ''}</strong>${values[1]}</li>`).join('')}</ul>`;
  };
  P.unlock = id => {
    if (P.achievements.has(id)) return false;
    P.achievements.add(id);
    storage.set('kjp-v5-achievements', [...P.achievements]);
    P.renderAchievements();
    const title = definitions[id]?.[0] || 'New discovery';
    toast(`Achievement unlocked: ${title}`);
    P.emit('achievement', { id, title });
    return true;
  };
  function updateProgress() {
    const label = document.getElementById('exploration-label');
    const fill = document.getElementById('exploration-fill');
    const amount = Math.round(P.visited.size / P.scenes.length * 100);
    if (label) label.textContent = `${P.visited.size} / ${P.scenes.length} ISLANDS EXPLORED`;
    if (fill) {
      fill.style.transform = `scaleX(${P.visited.size / P.scenes.length})`;
      const parent = fill.closest('[role="progressbar"]');
      parent?.setAttribute('aria-valuenow', String(amount));
      parent?.setAttribute('aria-valuetext', `${P.visited.size} of ${P.scenes.length} sections explored`);
    }
    storage.set('kjp-v5-visited', [...P.visited]);
    if (P.visited.size === P.scenes.length) P.unlock('explorer');
  }
  document.addEventListener('portfolio:navigate', event => {
    P.visited.add(event.detail.to);
    updateProgress();
  });
  updateProgress();

  const crew = [
    { id: 'luffy', name: 'MONKEY D. LUFFY', role: 'CAPTAIN', image: 'assets/onepiece-1.webp', line: 'A new adventure starts with a little courage.', effect: 'rubber' },
    { id: 'luffy', name: 'LUFFY / RED EDITION', role: 'CAPTAIN · ALTERNATE ART', image: 'assets/onepiece-2.webp', line: 'Keep moving toward the next horizon.', effect: 'rubber' },
    { id: 'zoro', name: 'RORONOA ZORO', role: 'SWORDSMAN', image: 'assets/onepiece-3.webp', line: 'Keep your focus. Find your own direction.', effect: 'sword' },
    { id: 'sanji', name: 'VINSMOKE SANJI', role: 'COOK', image: 'assets/onepiece-4.webp', line: 'Bring a little fire to everything you create.', effect: 'ember' },
    { id: 'chopper', name: 'TONY TONY CHOPPER', role: 'DOCTOR', image: 'assets/onepiece-5.webp', line: 'Stay curious. There is always more to learn.', effect: 'bloom' }
  ];
  const crewSeen = new Set();
  let crewIndex = 0;
  function markCrew(index) {
    crewSeen.add(crew[index].id);
    if (crewSeen.size >= 4) P.unlock('crew');
  }
  function crewStage(index) {
    const member = crew[index];
    return `<div class="crew-stage crew-${member.effect}" data-character="${member.id}"><div class="crew-art"><img src="${member.image}" alt="${member.name}, existing One Piece artwork" width="1500" height="1200"><span class="crew-impact" aria-hidden="true">${member.id === 'zoro' ? '斬' : member.id === 'sanji' ? '炎' : member.id === 'chopper' ? '✚' : 'ドン'}</span></div><div class="crew-caption"><span>${member.role} // ${String(index + 1).padStart(2, '0')}</span><h3>${member.name}</h3><p class="manga-bubble">${member.line}</p><small>Character artwork gallery · portfolio atmosphere</small></div></div>`;
  }
  function selectCrew(index) {
    crewIndex = (index + crew.length) % crew.length;
    const stage = document.getElementById('crew-stage-wrap');
    if (!stage) return;
    stage.innerHTML = crewStage(crewIndex);
    panel()?.querySelectorAll('[data-crew-index]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.crewIndex) === crewIndex)));
    const counter = document.getElementById('crew-current');
    if (counter) counter.textContent = `${crewIndex + 1} / ${crew.length}`;
    markCrew(crewIndex);
    P.emit('sfx', { kind: 'transition' });
  }
  P.openCrew = () => {
    crewIndex = 0;
    P.openDialog({
      title: 'MEET THE CREW',
      className: 'crew-dialog',
      content: `<p class="guide-lead">The Straw Hats behind the adventure.</p><div id="crew-stage-wrap" aria-live="polite">${crewStage(crewIndex)}</div>
        <div class="crew-controls"><button type="button" class="small-action" data-crew-step="-1" aria-label="Previous character">← Previous</button><span id="crew-current" aria-live="polite">1 / ${crew.length}</span><button type="button" class="small-action" data-crew-step="1" aria-label="Next character">Next →</button></div>
        <div class="crew-thumbnails" aria-label="Choose a character">${crew.map((member, i) => `<button type="button" data-crew-index="${i}" aria-pressed="${i === crewIndex}" aria-label="View ${member.name}"><img src="${member.image}" alt="" width="120" height="88"><span>${member.id === 'luffy' && i === 1 ? 'LUFFY II' : member.id.toUpperCase()}</span></button>`).join('')}</div>
        <button type="button" class="small-action" data-guide="help">← Captain's guide</button>`
    });
    markCrew(crewIndex);
  };

  let round = null;
  let best = Math.max(0, Number(storage.get('kjp-v5-quest-best', 0)) || 0);
  function randomChest() {
    if (window.crypto?.getRandomValues) { const data = new Uint32Array(1); crypto.getRandomValues(data); return data[0] % 9; }
    return Math.floor(Math.random() * 9);
  }
  function newRound() {
    round = { winner: randomChest(), attempts: 0, found: false, opened: new Set(), score: 0 };
    const grid = document.getElementById('quest-grid');
    if (grid) grid.innerHTML = Array.from({ length: 9 }, (_, i) => `<button type="button" class="treasure-chest" data-chest="${i}" aria-label="Open chest ${i + 1}"><svg viewBox="0 0 72 58" aria-hidden="true" focusable="false"><path d="M12 25V15Q12 5 23 5h26q11 0 11 10v10M8 26h56v25H8z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M22 5v46M50 5v46M8 33h56" fill="none" stroke="currentColor" stroke-width="3"/><path d="M31 25h10v15H31z" fill="currentColor"/></svg><span>CHEST ${String(i + 1).padStart(2, '0')}</span></button>`).join('');
    updateQuest('One chest holds the treasure. Choose your first chest.');
  }
  function updateQuest(message) {
    const status = document.getElementById('quest-status');
    const attempts = document.getElementById('quest-attempts');
    const score = document.getElementById('quest-score');
    const bestLabel = document.getElementById('quest-best');
    if (status) status.textContent = message;
    if (attempts) attempts.textContent = String(round.attempts);
    if (score) score.textContent = String(round.score);
    if (bestLabel) bestLabel.textContent = String(best);
  }
  P.openQuest = () => {
    P.openDialog({
      title: 'TREASURE HUNT',
      className: 'quest-dialog',
      content: `<p class="guide-lead">Nine chests. One hidden treasure.</p><p class="quest-rules">Find it in fewer attempts for a higher score: 900 points on your first try, then 100 fewer for each empty chest. Every round is a fresh hunt.</p>
        <div class="quest-scoreboard"><div><span>ATTEMPTS</span><strong id="quest-attempts">0</strong></div><div><span>SCORE</span><strong id="quest-score">0</strong></div><div><span>PERSONAL BEST</span><strong id="quest-best">${best}</strong></div></div>
        <div class="quest-grid" id="quest-grid" aria-label="Treasure chests"></div><p id="quest-status" class="quest-status" role="status"></p><div class="quest-actions"><button type="button" class="quest-restart" data-quest-restart>↻ New hunt</button><button type="button" class="small-action" data-guide="help">← Captain's guide</button></div>`
    });
    newRound();
  };
  function openChest(button) {
    if (!round || round.found || round.opened.has(Number(button.dataset.chest))) return;
    const index = Number(button.dataset.chest);
    round.opened.add(index);
    round.attempts += 1;
    const won = index === round.winner;
    button.disabled = true;
    button.classList.add(won ? 'treasure-found' : 'treasure-empty');
    button.innerHTML = won ? '<span class="chest-reveal" aria-hidden="true">✦</span><span>TREASURE!</span>' : '<span class="chest-reveal" aria-hidden="true">×</span><span>EMPTY</span>';
    button.setAttribute('aria-label', `Chest ${index + 1}: ${won ? 'treasure found' : 'empty'}`);
    if (won) {
      round.found = true;
      round.score = (10 - round.attempts) * 100;
      best = Math.max(best, round.score);
      storage.set('kjp-v5-quest-best', best);
      panel()?.querySelectorAll('[data-chest]').forEach(chest => { chest.disabled = true; });
      if (!P.unlock('treasure')) P.emit('sfx', { kind: 'achievement' });
      updateQuest(`Treasure found in ${round.attempts} ${round.attempts === 1 ? 'attempt' : 'attempts'}! ${round.score} points. Start a new hunt to play again.`);
    } else {
      P.emit('sfx', { kind: 'game' });
      updateQuest(`Chest ${index + 1} is empty. ${9 - round.attempts} chests remain. Keep searching!`);
    }
  }
  document.addEventListener('click', event => {
    const button = event.target.closest('#open-crew, #open-quest, [data-crew-index], [data-crew-step], [data-chest], [data-quest-restart]');
    if (!button) return;
    if (button.id === 'open-crew') { P.openCrew(); return; }
    if (button.id === 'open-quest') { P.openQuest(); return; }
    if (!panel()?.contains(button)) return;
    if (button.hasAttribute('data-crew-index')) selectCrew(Number(button.dataset.crewIndex));
    else if (button.hasAttribute('data-crew-step')) selectCrew(crewIndex + Number(button.dataset.crewStep));
    else if (button.hasAttribute('data-chest')) openChest(button);
    else if (button.hasAttribute('data-quest-restart')) { newRound(); P.emit('sfx', { kind: 'selection' }); }
  });

  let markClicks = 0;
  let markTime = 0;
  let secretKeys = '';
  let keyTime = 0;
  function pirateSignal() {
    P.unlock('secret');
    toast('PIRATE SIGNAL RECEIVED // The next adventure is yours.');
    document.body.classList.remove('pirate-signal');
    void document.body.offsetWidth;
    document.body.classList.add('pirate-signal');
    P.emit('sfx', { kind: 'transition' });
  }
  document.addEventListener('click', event => {
    if (!event.target.closest('#pirate-mark')) return;
    const now = Date.now();
    markClicks = now - markTime > 5000 ? 1 : markClicks + 1;
    markTime = now;
    if (markClicks >= 5) { markClicks = 0; pirateSignal(); }
  });
  document.addEventListener('keydown', event => {
    if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || P.isTyping(event.target) || document.getElementById('portfolio-dialog')?.open) return;
    if (event.key.length !== 1) return;
    const now = Date.now();
    if (now - keyTime > 2200) secretKeys = '';
    keyTime = now;
    secretKeys = (secretKeys + event.key.toLowerCase()).slice(-8);
    if (secretKeys === 'onepiece') { secretKeys = ''; pirateSignal(); }
  });
  document.body.addEventListener('animationend', event => {
    if (event.animationName === 'pirateSignal') document.body.classList.remove('pirate-signal');
  });
  window.addEventListener('pagehide', () => clearTimeout(toastTimer));
})();
