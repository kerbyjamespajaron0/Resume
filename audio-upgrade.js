/* One soundtrack, one audio context. All sounds follow the saved Help settings. */
(() => {
  'use strict';
  const P = window.Portfolio;
  const music = document.getElementById('soundtrack');
  if (!P || !music) return;
  const canvas = document.getElementById('audio-visualizer');
  const painter = canvas?.getContext('2d');
  const status = document.getElementById('sound-state');
  const toggle = document.getElementById('sound-toggle');
  const listeners = new AbortController();
  const signal = listeners.signal;
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const oscillators = new Set();
  const lastSound = new Map();
  let context = null;
  let mediaSource = null;
  let analyser = null;
  let spectrum = null;
  let sfxBus = null;
  let sfxAnalyser = null;
  let graphConnected = false;
  let analysisMode = 'native';
  let lastError = null;
  let queuedSounds = [];
  const audioDeadlines = new Map();
  let pendingPlay = null;
  let playSequence = 0;
  let blocked = false;
  let failed = false;
  let mediaPlaying = false;
  let destroyed = false;
  let interacted = false;
  let fadeFrame = 0;
  let fadeDeadline = 0;
  let visualFrame = 0;
  let visibilityTimer = 0;
  let lastVisualTime = 0;
  const listen = (target, type, callback, options = {}) => {
    target?.addEventListener(type, callback, { ...options, signal });
  };
  const unit = value => Math.max(0, Math.min(1, Number(value) || 0));
  const settings = () => P.settings;
  const targetVolume = () => unit(settings().musicVolume);
  const reducedMotion = () => settings().reducedMotion || matchMedia('(prefers-reduced-motion: reduce)').matches;
  music.loop = true;
  music.preload = 'metadata';
  music.muted = Boolean(settings().muted);
  music.volume = targetVolume();

  function state() {
    const contextState = context?.state || (AudioContextClass ? 'not-started' : 'unavailable');
    const musicAudible = mediaPlaying && music.readyState >= 2 && !music.seeking && !document.hidden && !settings().muted && !music.muted && !music.paused && !music.ended && music.volume > 0 && (!graphConnected || contextState === 'running');
    const effectsReady = !settings().muted && unit(settings().sfxVolume) > 0 && Boolean(sfxBus) && contextState === 'running';
    return {
      muted: Boolean(settings().muted),
      musicVolume: targetVolume(),
      sfxVolume: unit(settings().sfxVolume),
      playing: musicAudible,
      musicAudible,
      effectsReady,
      paused: music.paused,
      blocked,
      unavailable: failed,
      currentTime: Number.isFinite(music.currentTime) ? music.currentTime : 0,
      duration: Number.isFinite(music.duration) ? music.duration : null,
      hasAnalyser: Boolean(analyser && contextState === 'running'),
      contextState,
      graphConnected,
      nativePlayback: !graphConnected,
      analysisMode,
      protocol: window.location?.protocol || '',
      elementVolume: music.volume,
      effectiveMusicVolume: music.muted || settings().muted ? 0 : music.volume,
      volumesZero: targetVolume() === 0 && unit(settings().sfxVolume) === 0,
      lastError
    };
  }

  function updateStatus() {
    const audio = state();
    const enabled = audio.musicAudible || audio.effectsReady;
    if (status) status.textContent = audio.muted ? 'SOUND OFF' : audio.volumesZero ? 'VOLUME / H' : audio.musicAudible ? 'WE ARE! / ON' : audio.effectsReady ? 'SFX / ON' : 'CLICK FOR SOUND';
    if (toggle) {
      toggle.setAttribute('aria-pressed', String(enabled));
      toggle.setAttribute('aria-label', audio.volumesZero ? 'Sound levels are zero. Open the guide to adjust volume.' : enabled ? 'Mute music and sound effects (M)' : 'Enable music and sound effects');
      toggle.dataset.playing = String(audio.musicAudible);
    }
    P.emit('audio', audio);
  }

  function stopFade() {
    cancelAnimationFrame(fadeFrame);
    clearTimeout(fadeDeadline);
    fadeFrame = 0;
    fadeDeadline = 0;
  }

  function fadeTo(value, milliseconds = 260) {
    stopFade();
    const start = music.volume;
    const end = unit(value);
    if (reducedMotion() || document.hidden || milliseconds <= 0) {
      music.volume = end;
      return;
    }
    const began = performance.now();
    // A throttled animation frame must never strand an enabled track at silence.
    fadeDeadline = setTimeout(() => {
      cancelAnimationFrame(fadeFrame);
      fadeFrame = 0;
      fadeDeadline = 0;
      if (!destroyed) music.volume = end;
      if (!destroyed) updateStatus();
    }, milliseconds + 100);
    const step = time => {
      if (destroyed) return;
      const fraction = Math.min(1, (time - began) / milliseconds);
      music.volume = unit(start + (end - start) * fraction);
      if (fraction < 1) fadeFrame = requestAnimationFrame(step);
      else { fadeFrame = 0; clearTimeout(fadeDeadline); fadeDeadline = 0; updateStatus(); }
    };
    fadeFrame = requestAnimationFrame(step);
  }

  function drawIdle() {
    if (!painter || !canvas) return;
    painter.clearRect(0, 0, canvas.width, canvas.height);
    painter.fillStyle = '#827c7c';
    painter.fillRect(1, Math.floor(canvas.height / 2), canvas.width - 2, 1);
  }

  function stopVisualizer() {
    cancelAnimationFrame(visualFrame);
    visualFrame = 0;
    drawIdle();
  }

  function startVisualizer() {
    if (!painter || !canvas || !analyser || !spectrum || visualFrame || reducedMotion() || document.hidden || music.paused || music.muted) {
      if (music.paused || music.muted || reducedMotion()) stopVisualizer();
      return;
    }
    const draw = time => {
      visualFrame = 0;
      if (destroyed || document.hidden || music.paused || music.muted || reducedMotion()) {
        drawIdle();
        return;
      }
      if (time - lastVisualTime > (settings().performance ? 100 : 40)) {
        lastVisualTime = time;
        analyser.getByteFrequencyData(spectrum);
        painter.clearRect(0, 0, canvas.width, canvas.height);
        const bars = 14;
        const spacing = canvas.width / bars;
        const floor = canvas.height - 2;
        for (let i = 0; i < bars; i++) {
          // Log-spaced bins reflect the actual soundtrack; no random animation.
          const from = Math.floor(Math.pow(i / bars, 2) * spectrum.length);
          const to = Math.max(from + 1, Math.floor(Math.pow((i + 1) / bars, 2) * spectrum.length));
          let sum = 0;
          for (let n = from; n < to; n++) sum += spectrum[n];
          const height = Math.max(1, (sum / (to - from) / 255) * (canvas.height - 4));
          painter.fillStyle = i < 10 ? '#fff8e8' : '#ff3153';
          painter.fillRect(i * spacing + 1, floor - height, Math.max(1, spacing - 2), height);
        }
      }
      visualFrame = requestAnimationFrame(draw);
    };
    visualFrame = requestAnimationFrame(draw);
  }

  function bounded(promise, milliseconds = 1200) {
    return new Promise(resolve => {
      const timer = setTimeout(() => { audioDeadlines.delete(timer); resolve(null); }, milliseconds);
      audioDeadlines.set(timer, resolve);
      Promise.resolve(promise).then(value => {
        clearTimeout(timer); audioDeadlines.delete(timer); resolve(value);
      }, error => {
        lastError = error?.name || 'AudioError';
        clearTimeout(timer); audioDeadlines.delete(timer); resolve(null);
      });
    });
  }

  function connectMusicAnalysis() {
    if (mediaSource || graphConnected || !context || context.state !== 'running') return;
    const location = window.location;
    let sameOriginHttp = false;
    try {
      const url = new URL(music.currentSrc || music.src, location?.href);
      sameOriginHttp = ['http:', 'https:'].includes(location?.protocol) && url.origin === location.origin;
    } catch { /* Unknown or opaque origins retain the native soundtrack route. */ }
    // file:// media has an opaque origin. Routing it through Web Audio can return
    // zeros even while HTMLMediaElement.currentTime advances, so keep native audio.
    if (!sameOriginHttp) { analysisMode = 'native-origin'; return; }
    try {
      analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.78;
      spectrum = new Uint8Array(analyser.frequencyBinCount);
      mediaSource = context.createMediaElementSource(music);
      mediaSource.connect(analyser);
      analyser.connect(context.destination);
      graphConnected = true;
      analysisMode = 'same-origin-analyser';
    } catch (error) {
      lastError = error?.name || 'AnalysisError';
      if (mediaSource) {
        try { mediaSource.disconnect(); mediaSource.connect(context.destination); graphConnected = true; } catch { /* Unsupported graph. */ }
      }
      analyser = null;
      spectrum = null;
      analysisMode = graphConnected ? 'direct-context' : 'native-unsupported';
    }
  }

  function contextReady() {
    if (!context || context.state !== 'running' || destroyed) return;
    if (document.hidden) { queuedSounds = []; pauseForBackground(); return; }
    connectMusicAnalysis();
    const recent = queuedSounds.filter(sound => performance.now() - sound.time <= 400);
    queuedSounds = [];
    recent.forEach(sound => playSfx(sound.kind));
    startVisualizer();
    updateStatus();
  }

  function activateContext() {
    if (!AudioContextClass || destroyed) return Promise.resolve(null);
    try {
      // Creation and resume happen synchronously inside the genuine event handler.
      // A new gesture can retry resume even if a previous browser promise hung.
      if (!context) {
        context = new AudioContextClass();
        sfxBus = context.createGain();
        sfxBus.gain.value = settings().muted ? 0 : unit(settings().sfxVolume);
        try {
          sfxAnalyser = context.createAnalyser();
          sfxAnalyser.fftSize = 256;
          sfxAnalyser.smoothingTimeConstant = 0.5;
          sfxBus.connect(sfxAnalyser);
          sfxAnalyser.connect(context.destination);
        } catch { sfxAnalyser = null; sfxBus.connect(context.destination); }
        listen(context, 'statechange', () => {
          if (context.state === 'running') contextReady();
          else { stopVisualizer(); updateStatus(); }
        });
      }
      if (context.state === 'running') { contextReady(); return Promise.resolve(context); }
      if (context.state === 'closed') return Promise.resolve(null);
      // Includes Safari's interrupted state as well as suspended contexts.
      const resumed = context.resume();
      return bounded(Promise.resolve(resumed).then(() => {
        contextReady();
        return context.state === 'running' ? context : null;
      }));
    } catch (error) {
      lastError = error?.name || 'AudioContextError';
      updateStatus();
      return Promise.resolve(null);
    }
  }

  function attemptPlayback(explicit = false) {
    if (destroyed || settings().muted || document.hidden || (failed && !explicit)) return Promise.resolve(false);
    if (!music.paused) {
      if (music.volume < targetVolume() && !fadeFrame) fadeTo(targetVolume());
      return Promise.resolve(true);
    }
    if (pendingPlay && !explicit) return pendingPlay;
    if (failed && explicit) {
      failed = false;
      if (music.error) music.load();
    }
    const sequence = ++playSequence;
    stopFade();
    // The initial attempt is audible so browser autoplay policy applies normally.
    // A low, nonzero fade start also prevents a pending play promise stranding silence.
    music.volume = interacted ? Math.min(targetVolume(), 0.04) : targetVolume();
    let playback;
    try { playback = music.play(); }
    catch (error) { playback = Promise.reject(error); }
    pendingPlay = bounded(Promise.resolve(playback).then(() => {
      if (!destroyed && sequence === playSequence) {
        blocked = false;
        lastError = null;
        if (document.hidden) pauseForBackground();
        else fadeTo(targetVolume(), 450);
      }
      return true;
    }, error => {
      if (!destroyed && sequence === playSequence) {
        blocked = error?.name === 'NotAllowedError';
        lastError = error?.name || 'PlaybackError';
        if (error?.name === 'NotSupportedError') failed = true;
      }
      return false;
    }), 1400).then(result => {
      if (!destroyed && sequence === playSequence) { pendingPlay = null; updateStatus(); }
      return result === true;
    });
    return pendingPlay;
  }

  function gesture(event) {
    // Explicit sound controls own their activation; capture must not start audio
    // just before their click decides whether to enable or mute it.
    if (event?.target?.closest?.('#sound-toggle,[data-guide="mute"],[data-guide="test-sound"]')) return;
    if (settings().muted || destroyed) return;
    interacted = true;
    void activateContext();
    void attemptPlayback(true);
  }

  const patterns = {
    hover: [[620, 0.05, 'sine', 0, 0.035, 700]],
    selection: [[700, 0.08, 'triangle', 0, 0.06, 900], [1050, 0.08, 'sine', 0.06, 0.04, 800]],
    navigation: [[145, 0.16, 'triangle', 0, 0.075, 80], [440, 0.14, 'sine', 0.10, 0.055, 620]],
    transition: [[110, 0.3, 'sawtooth', 0, 0.028, 65], [330, 0.24, 'triangle', 0.12, 0.055, 880]],
    achievement: [[523, 0.16, 'sine', 0, 0.07, 523], [659, 0.16, 'sine', 0.12, 0.07, 659], [784, 0.32, 'triangle', 0.24, 0.07, 1046]],
    game: [[380, 0.1, 'triangle', 0, 0.06, 140]],
    success: [[523, 0.12, 'triangle', 0, 0.06, 660], [784, 0.22, 'sine', 0.1, 0.07, 1046]],
    miss: [[170, 0.15, 'triangle', 0, 0.055, 90]]
  };

  function playSfx(kind = 'selection') {
    if (destroyed || document.hidden || settings().muted || unit(settings().sfxVolume) === 0) return;
    if (!context || context.state !== 'running' || !sfxBus) {
      if (AudioContextClass && kind !== 'hover') {
        queuedSounds = queuedSounds.filter(sound => sound.kind !== kind && performance.now() - sound.time <= 400);
        queuedSounds.push({ kind, time: performance.now() });
        queuedSounds = queuedSounds.slice(-2);
      }
      return;
    }
    const now = performance.now();
    const quietPeriod = kind === 'hover' ? 150 : kind === 'navigation' || kind === 'transition' ? 250 : 85;
    if (now - (lastSound.get(kind) ?? -Infinity) < quietPeriod || oscillators.size > 14) return;
    lastSound.set(kind, now);
    const beginning = context.currentTime;
    (patterns[kind] || patterns.selection).forEach(([frequency, length, shape, delay, volume, endFrequency]) => {
      const oscillator = context.createOscillator();
      const envelope = context.createGain();
      const at = beginning + delay;
      oscillator.type = shape;
      oscillator.frequency.setValueAtTime(frequency, at);
      oscillator.frequency.exponentialRampToValueAtTime(endFrequency, at + length);
      envelope.gain.setValueAtTime(0.0001, at);
      envelope.gain.exponentialRampToValueAtTime(Math.min(0.18, volume * 2.5), at + Math.min(0.012, length / 3));
      envelope.gain.exponentialRampToValueAtTime(0.0001, at + length);
      oscillator.connect(envelope);
      envelope.connect(sfxBus);
      oscillators.add(oscillator);
      oscillator.onended = () => {
        oscillator.disconnect();
        envelope.disconnect();
        oscillators.delete(oscillator);
      };
      oscillator.start(at);
      oscillator.stop(at + length + 0.015);
    });
  }

  function applySettings() {
    if (destroyed) return;
    music.muted = Boolean(settings().muted);
    if (sfxBus && context) {
      sfxBus.gain.cancelScheduledValues(context.currentTime);
      sfxBus.gain.setTargetAtTime(settings().muted ? 0 : unit(settings().sfxVolume), context.currentTime, 0.025);
    }
    fadeTo(document.hidden ? 0 : targetVolume());
    if (settings().muted) stopVisualizer();
    else {
      void attemptPlayback();
      if (reducedMotion()) stopVisualizer();
      else startVisualizer();
    }
    updateStatus();
  }

  function toggleMute() {
    P.saveSettings({ muted: !settings().muted });
    if (!settings().muted) gesture();
    return !settings().muted;
  }

  function enable() {
    if (destroyed) return Promise.resolve(state());
    interacted = true;
    if (settings().muted) P.saveSettings({ muted: false });
    // Invoke both APIs before yielding so this method can be called directly
    // from the footer or Help's genuine Enable & test sound click.
    const activation = activateContext();
    const playback = attemptPlayback(true);
    return bounded(Promise.allSettled([activation, playback]), 1550).then(() => {
      if (!destroyed) updateStatus();
      return state();
    });
  }

  function testSound() {
    return enable().then(() => {
      if (!destroyed && state().effectsReady) playSfx('success');
      if (!destroyed) updateStatus();
      return state();
    });
  }

  function footerSoundAction() {
    const audio = state();
    if (audio.volumesZero && !audio.muted) {
      P.openHelp?.();
      return;
    }
    if (audio.musicAudible || audio.effectsReady) toggleMute();
    else void enable();
  }

  function restart() {
    if (destroyed) return;
    try { music.currentTime = 0; } catch { /* Metadata may still be loading. */ }
    if (!settings().muted) {
      gesture();
      fadeTo(targetVolume(), 450);
    }
    updateStatus();
  }

  function pauseForBackground() {
    clearTimeout(visibilityTimer);
    visibilityTimer = 0;
    stopFade();
    music.volume = 0;
    music.pause();
    stopVisualizer();
    if (context?.state === 'running') void context.suspend().catch(() => {});
  }

  function destroy() {
    if (destroyed) return;
    destroyed = true;
    listeners.abort();
    queuedSounds = [];
    audioDeadlines.forEach((resolve, timer) => { clearTimeout(timer); resolve(null); });
    audioDeadlines.clear();
    clearTimeout(visibilityTimer);
    stopFade();
    stopVisualizer();
    music.pause();
    oscillators.forEach(oscillator => { try { oscillator.stop(); } catch { /* Tone already ended. */ } });
    if (context && context.state !== 'closed') void context.close().catch(() => {});
  }

  window.PortfolioAudio = {
    playSfx,
    enable,
    testSound,
    toggleMute,
    restart,
    setMusicVolume(value) { P.saveSettings({ musicVolume: unit(value) }); },
    setSfxVolume(value) { P.saveSettings({ sfxVolume: unit(value) }); },
    getState: state,
    getAnalyser: () => analyser,
    getSfxAnalyser: () => sfxAnalyser,
    destroy
  };

  listen(document, 'pointerdown', gesture, { capture: true, passive: true });
  listen(document, 'pointerup', gesture, { capture: true, passive: true });
  listen(document, 'touchend', gesture, { capture: true, passive: true });
  listen(document, 'click', gesture, { capture: true, passive: true });
  listen(document, 'keydown', event => {
    const typing = P.isTyping ? P.isTyping(event.target) : event.target.closest?.('input, textarea, select, [contenteditable="true"]');
    if (typing || event.ctrlKey || event.metaKey || event.altKey || event.repeat || event.isComposing) return;
    const key = event.key.toLowerCase();
    if (key === 'm') { event.preventDefault(); toggleMute(); }
    else if (key === 'r') { event.preventDefault(); restart(); }
    else gesture(event);
  }, { capture: true });
  listen(toggle, 'click', footerSoundAction);
  listen(document, 'pointerover', event => {
    const interactive = event.target.closest?.('button, a, [role="button"]');
    if (!interactive || interactive.contains(event.relatedTarget)) return;
    playSfx('hover');
  }, { passive: true });
  listen(document, 'focusin', event => { if (event.target.matches?.('button, a, [role="button"]')) playSfx('hover'); });
  listen(document, 'click', event => { if (event.target.closest?.('button, a, [role="button"]')) playSfx('selection'); }, { passive: true });
  listen(document, 'portfolio:navigate', () => playSfx('navigation'));
  listen(document, 'portfolio:intro-end', () => playSfx('transition'));
  listen(document, 'portfolio:achievement', () => playSfx('achievement'));
  listen(document, 'portfolio:sfx', event => playSfx(event.detail?.kind || 'selection'));
  listen(document, 'portfolio:settings', applySettings);
  listen(music, 'playing', () => {
    mediaPlaying = true;
    blocked = false;
    if (document.hidden) { pauseForBackground(); return; }
    if (!settings().muted && !document.hidden) fadeTo(targetVolume(), 450);
    updateStatus();
    startVisualizer();
  });
  listen(music, 'pause', () => { mediaPlaying = false; updateStatus(); stopVisualizer(); });
  listen(music, 'ended', () => { mediaPlaying = false; updateStatus(); stopVisualizer(); });
  listen(music, 'waiting', () => { mediaPlaying = false; updateStatus(); stopVisualizer(); });
  listen(music, 'seeking', updateStatus);
  listen(music, 'seeked', updateStatus);
  listen(music, 'error', () => { mediaPlaying = false; failed = true; updateStatus(); stopVisualizer(); });
  listen(music, 'volumechange', () => {
    if (music.muted || music.volume === 0) stopVisualizer();
    else startVisualizer();
  });
  listen(document, 'visibilitychange', () => {
    clearTimeout(visibilityTimer);
    if (document.hidden) {
      fadeTo(0, 120);
      stopVisualizer();
      visibilityTimer = setTimeout(() => {
        if (document.hidden) pauseForBackground();
      }, 130);
    } else if (!settings().muted) {
      if (context) void activateContext();
      void attemptPlayback();
      if (!music.paused) fadeTo(targetVolume(), 450);
    }
  });
  listen(window, 'pagehide', event => {
    if (!event.persisted) destroy();
    else {
      music.pause();
      stopFade();
      stopVisualizer();
      if (context?.state === 'running') void context.suspend().catch(() => {});
    }
  });
  listen(window, 'pageshow', () => {
    if (!settings().muted) {
      if (context) void activateContext();
      void attemptPlayback();
    }
  });
  drawIdle();
  updateStatus();
  void attemptPlayback();
})();
