/* =========================================================================
   SOUND – kleine Klänge, direkt im Browser erzeugt (keine Audiodateien nötig)
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  let ctx = null;
  let enabled = true;
  try { enabled = localStorage.getItem('pg-sound') !== 'off'; } catch (e) { /* egal */ }

  function ac() {
    if (!enabled) return null;
    if (!ctx) {
      try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; }
    }
    if (ctx && ctx.state === 'suspended') { ctx.resume().catch(function () {}); }
    return ctx;
  }

  function tone(freq, dur, opts) {
    const c = ac(); if (!c) return;
    opts = opts || {};
    const t0 = c.currentTime + (opts.when || 0);
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = opts.type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slide) osc.frequency.exponentialRampToValueAtTime(opts.slide, t0 + dur);
    const vol = opts.vol || 0.12;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  function noise(dur, when, vol) {
    const c = ac(); if (!c) return;
    const t0 = c.currentTime + (when || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur));
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = c.createBufferSource();
    src.buffer = buf;
    const filter = c.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1800 + Math.random() * 1200;
    const gain = c.createGain();
    gain.gain.value = vol || 0.25;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start(t0);
  }

  PG.Audio = {
    get enabled() { return enabled; },
    set: function (on) {
      enabled = !!on;
      try { localStorage.setItem('pg-sound', enabled ? 'on' : 'off'); } catch (e) { /* egal */ }
    },
    unlock: function () { ac(); },
    dice: function () {
      for (let i = 0; i < 7; i++) noise(0.04, i * 0.09 + Math.random() * 0.03, 0.18);
    },
    step: function () { tone(520 + Math.random() * 60, 0.07, { type: 'triangle', vol: 0.06 }); },
    good: function () {
      [523, 659, 784].forEach(function (f, i) { tone(f, 0.22, { type: 'triangle', when: i * 0.08, vol: 0.1 }); });
    },
    bad: function () {
      tone(392, 0.18, { type: 'sawtooth', vol: 0.05 });
      tone(311, 0.3, { type: 'sawtooth', when: 0.14, vol: 0.05, slide: 240 });
    },
    news: function () {
      [880, 880, 1175].forEach(function (f, i) { tone(f, 0.12, { type: 'square', when: i * 0.13, vol: 0.04 }); });
    },
    click: function () { tone(880, 0.05, { type: 'sine', vol: 0.05 }); },
    claim: function () {
      tone(660, 0.12, { type: 'triangle', vol: 0.09 });
      tone(990, 0.2, { type: 'triangle', when: 0.09, vol: 0.09 });
    },
    fanfare: function () {
      const notes = [392, 523, 659, 784, 659, 784, 1046];
      const times = [0, 0.14, 0.28, 0.42, 0.62, 0.74, 0.9];
      notes.forEach(function (f, i) {
        tone(f, i === notes.length - 1 ? 0.7 : 0.18, { type: 'sawtooth', when: times[i], vol: 0.05 });
        tone(f / 2, i === notes.length - 1 ? 0.7 : 0.18, { type: 'triangle', when: times[i], vol: 0.05 });
      });
    },
    pop: function () { tone(300 + Math.random() * 300, 0.06, { type: 'sine', vol: 0.05 }); }
  };
})(window.PG);
