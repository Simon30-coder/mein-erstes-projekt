/* =========================================================================
   GRUNDLAGEN – gemeinsame Hilfsfunktionen
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  /** Globaler Spielzustand. st = aktuelles Spiel, session = Zähler zum Abbrechen laufender Abläufe */
  PG.G = { st: null, session: 0 };

  /** Wird geworfen, wenn ein Spiel verlassen wird, während noch Animationen laufen */
  PG.ABORT = { aborted: true };

  /** Warten (bricht ab, wenn inzwischen ein anderes Spiel läuft) */
  PG.sleep = function (ms) {
    const s = PG.G.session;
    return new Promise(function (resolve, reject) {
      setTimeout(function () { if (s === PG.G.session) resolve(); else reject(PG.ABORT); }, Math.max(0, ms));
    });
  };

  PG.rnd = function (n) { return Math.floor(Math.random() * n); };
  PG.d6 = function () { return 1 + PG.rnd(6); };
  PG.clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };

  PG.shuffle = function (arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = PG.rnd(i + 1);
      const tmp = a[i]; a[i] = a[j]; a[j] = tmp;
    }
    return a;
  };

  PG.range = function (n) { const a = []; for (let i = 0; i < n; i++) a.push(i); return a; };

  PG.esc = function (s) {
    return String(s === undefined || s === null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  PG.reducedMotion = function () {
    try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; }
  };

  /** Tempo-Faktor für KI-Züge und Animationen */
  PG.speed = function () {
    const st = PG.G.st;
    const v = st && st.settings ? st.settings.botSpeed : 'normal';
    return v === 'slow' ? 1.6 : (v === 'fast' ? 0.45 : 1);
  };

  /** Spieler-Hilfen */
  PG.player = function (id) {
    const st = PG.G.st;
    return st ? st.players.find(function (p) { return p.id === id; }) : null;
  };
  PG.current = function () { const st = PG.G.st; return st ? st.players[st.current] : null; };
  PG.initial = function (name) {
    const s = String(name || '?').trim();
    return s ? s.charAt(0).toUpperCase() : '?';
  };

  /** Fortschritt für Ranglisten: Runde und Feld zusammengefasst */
  PG.progress = function (p) { return p.round * 100 + p.pos; };

  PG.lastIndex = function (round) { return PG.BOARDS[round - 1].fields.length - 1; };
  PG.fieldAt = function (round, idx) { return PG.BOARDS[round - 1].fields[idx]; };
  PG.GATE = PG.BOARDS ? PG.BOARDS[0].gate : 13;

  /** Wahlmänner, die ein Spieler in Runde 3 erobert hat */
  PG.claimedEV = function (pid) {
    const st = PG.G.st; if (!st) return 0;
    let sum = 0;
    Object.keys(st.owners).forEach(function (code) { if (st.owners[code] === pid) sum += PG.STATES[code].ev; });
    return sum;
  };
})(window.PG);
