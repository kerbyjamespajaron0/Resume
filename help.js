/* The captain's guide shares the site's native dialog and navigation controller. */
(() => {
  'use strict';
  const P = window.Portfolio;
  if (!P) return;
  const names = ['Home', 'Education', 'Projects', 'Skills', 'About', 'Contact'];
  const percent = value => Math.round(Math.max(0, Math.min(1, Number(value) || 0)) * 100);
  const checked = value => value ? ' checked' : '';
  const panel = () => document.getElementById('dialog-content');
  let audioTestPending = false;

  function audioStateMessage(state) {
    if (!state) return 'Sound controls are unavailable.';
    if (state.muted) return 'Music and sound effects are muted.';
    const musicVolume = Number(state.musicVolume) || 0;
    const sfxVolume = Number(state.sfxVolume) || 0;
    if (musicVolume === 0 && sfxVolume === 0) return 'Music and effects volumes are both zero.';
    const audible = state.musicAudible ?? state.playing;
    const playbackActive = state.playing || state.paused === false;
    const music = musicVolume === 0 ? 'Music volume is zero.' : state.unavailable ? 'The soundtrack is unavailable.' : audible ? `Music is playing at ${percent(musicVolume)}%.` : state.blocked || (playbackActive && state.contextState !== 'running' && !state.nativePlayback) ? 'Music is waiting to be enabled.' : playbackActive ? 'Music is starting.' : 'Music is paused.';
    return `${music} ${sfxVolume === 0 ? 'Effects volume is zero.' : `Effects: ${percent(sfxVolume)}%.`}`;
  }

  function updateAudioState(state = window.PortfolioAudio?.getState?.()) {
    const status = document.getElementById('guide-audio-status');
    if (status) status.textContent = audioStateMessage(state);
  }

  function testSound(button) {
    if (audioTestPending) return;
    const feedback = document.getElementById('guide-audio-test-feedback');
    const audio = window.PortfolioAudio;
    if (!audio?.testSound) {
      if (feedback) feedback.textContent = 'The sound test is unavailable. Reload the page to try again.';
      return;
    }
    audioTestPending = true;
    button.setAttribute('aria-busy', 'true');
    if (feedback) feedback.textContent = 'Enabling sound and sending a short test tone…';
    let result;
    try {
      // Keep the unlock call inside the real click event; do not defer activation.
      result = audio.testSound();
    } catch {
      result = Promise.reject(new Error('Audio activation failed'));
    }
    Promise.resolve(result).then(() => {
      const state = audio.getState?.();
      updateAudioState(state);
      if (!feedback?.isConnected) return;
      if (!state || state.muted) {
        feedback.textContent = 'Sound is still muted. Use Unmute, then try the test again.';
      } else if (Number(state.musicVolume) === 0 && Number(state.sfxVolume) === 0) {
        feedback.textContent = 'Sound enabled, but both volumes are zero. Raise a volume and test again.';
      } else if (Number(state.sfxVolume) === 0) {
        feedback.textContent = `Raise the effects volume to hear the test tone. ${audioStateMessage(state)}`;
      } else if (state.effectsReady === false || (state.contextState && state.contextState !== 'running')) {
        feedback.textContent = `The test tone could not start. Try again or check your browser's sound setting. ${audioStateMessage(state)}`;
      } else {
        feedback.textContent = `${state.effectsReady ? 'Test tone sent.' : 'Sound test requested.'} ${audioStateMessage(state)} If you hear nothing, check the tab and device volume.`;
      }
    }).catch(() => {
      updateAudioState();
      if (feedback?.isConnected) feedback.textContent = 'The sound test could not start. Check your browser sound setting and try again.';
    }).finally(() => {
      audioTestPending = false;
      button.removeAttribute('aria-busy');
    });
  }

  function openHelp() {
    const s = P.settings;
    P.openDialog({
      title: "CAPTAIN'S GUIDE",
      className: 'help-dialog',
      content: `<p class="guide-lead">Your next island is a keypress away.</p>
        <div class="guide-shortcuts" aria-label="Keyboard shortcuts">
          <span><kbd>←</kbd><kbd>→</kbd> Change section</span>
          <span><kbd>H</kbd><kbd>?</kbd> Open this guide</span>
          <span><kbd>M</kbd> Mute / unmute</span>
          <span><kbd>R</kbd> Restart music</span>
          <span><kbd>Esc</kbd> Close dialog / return home</span>
        </div>
        <p class="guide-copy">Scroll to read a section. Swipe sideways to sail between islands on your phone. You can also use the section navigation.</p>
        <div class="guide-actions">
          <button type="button" class="guide-action" data-guide="map"><span>01 / EXPLORE</span>Grand Line map <b aria-hidden="true">↗</b></button>
          <button type="button" class="guide-action" data-guide="crew"><span>02 / THE STRAW HATS</span>Character gallery <b aria-hidden="true">↗</b></button>
          <button type="button" class="guide-action" data-guide="quest"><span>03 / SIDE QUEST</span>Treasure hunt <b aria-hidden="true">↗</b></button>
        </div>
        <section class="guide-settings" aria-labelledby="sound-settings-title">
          <div class="settings-heading"><h3 id="sound-settings-title">SOUND ON DECK</h3><div class="guide-sound-actions"><button type="button" class="small-action sound-test-action" data-guide="test-sound" aria-describedby="guide-audio-test-feedback">Enable &amp; test sound</button><button type="button" class="small-action" data-guide="mute" aria-pressed="${Boolean(s.muted)}">${s.muted ? 'Unmute' : 'Mute'}</button></div></div>
          <p id="guide-audio-status" class="guide-audio-status" role="status" aria-live="polite"></p>
          <p id="guide-audio-test-feedback" class="guide-audio-test-feedback" role="status" aria-live="polite" aria-atomic="true"></p>
          <label class="volume-setting" for="guide-music"><span>Music <output id="guide-music-value" for="guide-music">${percent(s.musicVolume)}%</output></span><input id="guide-music" type="range" min="0" max="100" step="1" value="${percent(s.musicVolume)}" data-volume="music" aria-describedby="music-note"></label>
          <label class="volume-setting" for="guide-sfx"><span>Sound effects <output id="guide-sfx-value" for="guide-sfx">${percent(s.sfxVolume)}%</output></span><input id="guide-sfx" type="range" min="0" max="100" step="1" value="${percent(s.sfxVolume)}" data-volume="sfx"></label>
          <p class="settings-note" id="music-note">The existing “We Are!” soundtrack starts after a normal interaction if your browser blocks autoplay. Your choices are saved on this device.</p>
        </section>
        <section class="guide-settings" aria-labelledby="motion-settings-title"><h3 id="motion-settings-title">SET YOUR PACE</h3>
          <label class="mode-setting"><span><b>Cinematic mode</b><small>Emphasize the artwork and transitions.</small></span><input type="checkbox" data-setting="cinematic"${checked(s.cinematic)}></label>
          <label class="mode-setting"><span><b>Performance mode</b><small>Fewer particles, lighter shadows and effects.</small></span><input type="checkbox" data-setting="performance"${checked(s.performance)}></label>
          <label class="mode-setting"><span><b>Reduced motion</b><small>Disable intensive motion. Your device preference is respected.</small></span><input type="checkbox" data-setting="reducedMotion"${checked(s.reducedMotion)}></label>
        </section>
        <details class="guide-secrets"><summary>A message in a bottle</summary><p>Try the pirate mark five times, or type <kbd>onepiece</kbd> while exploring. Visit every island and inspect the crew to earn visitor achievements.</p></details>
        <div class="guide-achievements" id="guide-achievements"></div>`
    });
    updateAudioState();
    P.renderAchievements?.();
  }

  function openMap() {
    const visited = P.visited || new Set([0]);
    P.openDialog({
      title: 'THE GRAND LINE',
      className: 'map-dialog',
      content: `<p class="guide-lead">Six islands. One developer's journey.</p>
        <nav class="grand-line-map" aria-label="Grand Line section navigation">
          ${names.map((name, i) => `<button type="button" class="map-island${i === P.current ? ' is-current' : ''}${visited.has(i) ? ' is-visited' : ''}" data-island="${i}"${i === P.current ? ' aria-current="page"' : ''}><span class="island-number" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span><strong>${name}</strong><small>${i === P.current ? 'You are here' : visited.has(i) ? 'Charted island' : 'Set sail'}</small><span class="island-compass" aria-hidden="true">✦</span></button>`).join('')}
        </nav><p class="settings-note">Exploration is counted by distinct sections visited on this device.</p>
        <button type="button" class="small-action" data-guide="help">← Captain's guide</button>`
    });
  }

  P.openHelp = openHelp;
  P.openMap = openMap;
  document.addEventListener('click', event => {
    const target = event.target.closest('[data-open-help], [data-guide], [data-island]');
    if (!target) return;
    if (target.matches('[data-open-help]')) { openHelp(); return; }
    if (!panel()?.contains(target)) return;
    if (target.hasAttribute('data-island')) {
      const destination = Number(target.dataset.island);
      P.closeDialog();
      P.go(destination);
      return;
    }
    switch (target.dataset.guide) {
      case 'help': openHelp(); break;
      case 'map': openMap(); break;
      case 'crew': P.openCrew?.(); break;
      case 'quest': P.openQuest?.(); break;
      case 'mute': window.PortfolioAudio?.toggleMute(); break;
      case 'test-sound': testSound(target); break;
    }
  });
  document.addEventListener('input', event => {
    if (!panel()?.contains(event.target)) return;
    const type = event.target.dataset.volume;
    if (!type) return;
    const value = Number(event.target.value) / 100;
    if (type === 'music') window.PortfolioAudio?.setMusicVolume(value);
    else window.PortfolioAudio?.setSfxVolume(value);
    const output = document.getElementById(`guide-${type}-value`);
    if (output) output.textContent = `${Math.round(value * 100)}%`;
  });
  document.addEventListener('change', event => {
    if (!panel()?.contains(event.target)) return;
    const setting = event.target.dataset.setting;
    if (['cinematic', 'performance', 'reducedMotion'].includes(setting)) {
      P.saveSettings({ [setting]: event.target.checked });
    }
  });
  document.addEventListener('portfolio:settings', () => {
    const mute = panel()?.querySelector('[data-guide="mute"]');
    if (mute) {
      mute.textContent = P.settings.muted ? 'Unmute' : 'Mute';
      mute.setAttribute('aria-pressed', String(Boolean(P.settings.muted)));
    }
    panel()?.querySelectorAll('[data-setting]').forEach(input => {
      input.checked = Boolean(P.settings[input.dataset.setting]);
    });
    updateAudioState();
  });
  document.addEventListener('portfolio:audio', event => updateAudioState(event.detail));
  document.addEventListener('keydown', event => {
    if (event.repeat || event.isComposing || event.altKey || event.ctrlKey || event.metaKey || P.isTyping(event.target)) return;
    const intro = document.getElementById('intro');
    const introOpen = intro && !intro.hidden && !intro.classList.contains('hide');
    if ((event.key.toLowerCase() === 'h' || event.key === '?') && !introOpen) {
      event.preventDefault();
      openHelp();
    }
  });
})();
