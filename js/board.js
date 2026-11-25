/* =========================================================================
   SPIELBRETT – Felder im Raster (7 Spalten), Wege, Figuren, Zielauswahl
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  const t = PG.t, tx = PG.tx, esc = PG.esc;
  const GAP = 8;

  let boardEl = null;
  let view = 1;
  let tileEls = {};
  let lastWidth = 0;
  let pick = null; /* { targets: {id: opt}, resolve, reject } */

  function category(f) {
    switch (f.type) {
      case 'start': return 'start';
      case 'key': return 'key';
      case 'gate': return 'gate';
      case 'news': return 'news';
      case 'state': return 'state';
      case 'debate': return 'duel';
      case 'choice': return 'choice';
      case 'fork': return 'fork';
      case 'steps': return f.steps > 0 ? 'good' : 'bad';
      case 'skip': return 'bad';
      case 'polls': return (f.polls || 0) + (f.money || 0) < 0 ? 'bad' : 'good';
      case 'money': return (f.money || 0) < 0 ? 'bad' : 'good';
      case 'again': return 'good';
      default: return 'plain';
    }
  }

  function isOff(f) {
    const s = PG.G.st ? PG.G.st.settings : null;
    if (!s) return false;
    if (f.type === 'news' && !s.news) return true;
    if (f.type === 'state' && s.finale === 'race') return true;
    return false;
  }

  function badge(f) {
    switch (f.type) {
      case 'steps': return (f.steps > 0 ? '+' : '−') + Math.abs(f.steps);
      case 'money': return PG.fmt.money(f.money, true) + (f.polls ? ' · ' + PG.fmt.polls(f.polls, true) : '');
      case 'polls': return (f.money ? PG.fmt.money(f.money, true) + ' · ' : '') + PG.fmt.polls(f.polls, true);
      case 'again': return '×2';
      case 'skip': return '⏸';
      case 'gate': return '2 · 4 · 6';
      case 'choice': return 'A / B';
      case 'debate': return '±%';
      default: return '';
    }
  }

  function fieldTitle(f) { return f.type === 'state' ? tx(PG.STATES[f.state].name) : tx(f.title); }

  function tileHTML(f) {
    const st = PG.G.st;
    const cat = category(f);
    const off = isOff(f);
    const p = f.pos;
    let style = 'grid-row:' + (p.r + 1) + ' / span ' + p.rs + ';grid-column:' + (p.c + 1) + ';';
    let cls = 'tile tile--' + cat + (off ? ' is-off' : '') + (p.rs > 1 ? ' is-tall' : '');
    if (f.lane !== undefined) cls += f.lane === 0 ? ' lane-a' : ' lane-b';
    let icon, fx = badge(f), extra = '';
    if (f.type === 'state') {
      const s = PG.STATES[f.state];
      icon = '<span class="tile-code">' + s.code + '</span>';
      fx = s.ev + ' ' + t('evShort');
      const owner = st && st.owners[f.state] !== undefined ? PG.player(st.owners[f.state]) : null;
      if (owner && !off) {
        cls += ' is-owned';
        style += '--owner:' + owner.color + ';';
        extra += '<span class="tile-owner" title="' + esc(owner.name) + '">' + esc(PG.initial(owner.name)) + '</span>';
      }
      if (!off) extra += '<span class="tile-need">' + PG.stateNeed(f.state, !!owner) + '+</span>';
    } else {
      icon = PG.icon(f.icon);
    }
    if (f.type === 'fork' && f.lanes) {
      extra += '<span class="tile-lanes"><span class="ln ln-a">▲ ' + esc(tx(f.lanes[0])) + '</span><span class="ln ln-b">▼ ' + esc(tx(f.lanes[1])) + '</span></span>';
    }
    if (f.lane !== undefined && f.type !== 'state') extra += '<span class="tile-lane">' + (f.lane === 0 ? '▲' : '▼') + '</span>';
    return '<button type="button" class="' + cls + '" style="' + style + '" data-idx="' + f.id + '" aria-label="' + esc(fieldTitle(f) + ' (' + f.id + ')') + '">' +
      '<span class="tile-num">' + f.id + '</span>' +
      '<span class="tile-icon">' + icon + '</span>' +
      '<span class="tile-title">' + esc(fieldTitle(f)) + '</span>' +
      (fx ? '<span class="tile-fx">' + esc(fx) + '</span>' : '') +
      extra + '<span class="tile-die" aria-hidden="true"></span></button>';
  }

  function render() {
    const st = PG.G.st;
    if (!st || !boardEl) return;
    const b = PG.BOARDS[view - 1];
    const C = PG.COLS;
    const w = boardEl.clientWidth || 800;
    lastWidth = w;
    const tileW = (w - (C - 1) * GAP) / C;
    const tiny = tileW < 74;
    const tileH = tiny ? Math.round(tileW * 1.08) : Math.max(84, Math.round(tileW * 0.95));
    boardEl.style.setProperty('--cols', C);
    boardEl.style.setProperty('--tile-w', tileW + 'px');
    boardEl.style.setProperty('--tile-h', tileH + 'px');
    boardEl.style.setProperty('--gap', GAP + 'px');
    boardEl.style.gridTemplateRows = 'repeat(' + b.rows + ', var(--tile-h))';
    boardEl.classList.toggle('is-tiny', tiny);
    boardEl.classList.toggle('is-compact', !tiny && tileW < 104);
    let html = '';
    b.fields.forEach(function (f) { html += tileHTML(f); });
    html += '<svg class="board-path" aria-hidden="true"></svg><div class="board-arrows" aria-hidden="true"></div><div class="tokens" aria-hidden="true"></div>';
    boardEl.innerHTML = html;
    boardEl.dataset.round = String(view);
    tileEls = {};
    Array.prototype.forEach.call(boardEl.querySelectorAll('.tile'), function (el) { tileEls[el.dataset.idx] = el; });
    drawPath();
    renderTokens(true);
    if (pick && pick.round === view) applyTargets();
  }

  function centerOf(el) { return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 }; }

  function drawPath() {
    const svg = boardEl.querySelector('.board-path');
    const arrows = boardEl.querySelector('.board-arrows');
    if (!svg) return;
    const W = boardEl.scrollWidth, H = boardEl.scrollHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    const b = PG.BOARDS[view - 1];
    let d = '', ah = '';
    b.fields.forEach(function (f) {
      const a = centerOf(tileEls[f.id]);
      f.next.forEach(function (nid) {
        const n = PG.BOARDS[view - 1].fields[nid];
        let bpt = centerOf(tileEls[nid]);
        /* Bei hohen Feldern (Gabelung) zur passenden Reihe zeigen */
        let ax = a.x, ay = a.y, bx = bpt.x, by = bpt.y;
        if (f.pos.rs > 1) ay = by;
        if (n.pos.rs > 1) by = ay;
        d += 'M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + 'L' + bx.toFixed(1) + ' ' + by.toFixed(1);
        const ang = Math.atan2(by - ay, bx - ax) * 180 / Math.PI;
        ah += '<span class="arrow" style="left:' + ((ax + bx) / 2).toFixed(1) + 'px;top:' + ((ay + by) / 2).toFixed(1) + 'px;transform:translate(-50%,-50%) rotate(' + ang.toFixed(0) + 'deg)"></span>';
      });
    });
    svg.innerHTML = '<path d="' + d + '" class="path-glow"/><path d="' + d + '" class="path-line"/>';
    arrows.innerHTML = ah;
  }

  function tokenEl(layer, p) {
    let tok = layer.querySelector('[data-pid="' + p.id + '"]');
    if (!tok) {
      tok = document.createElement('div');
      tok.className = 'token no-anim';
      tok.dataset.pid = String(p.id);
      tok.innerHTML = '<span class="token-body"></span>';
      layer.appendChild(tok);
    }
    tok.style.setProperty('--c', p.color);
    tok.querySelector('.token-body').textContent = PG.initial(p.name);
    tok.title = p.name;
    return tok;
  }

  function renderTokens(instant) {
    const st = PG.G.st;
    if (!st || !boardEl) return;
    const layer = boardEl.querySelector('.tokens');
    if (!layer) return;
    const cur = PG.current();
    const groups = {};
    st.players.filter(function (p) { return p.round === view; }).forEach(function (p) { (groups[p.pos] = groups[p.pos] || []).push(p); });
    const seen = {};
    Object.keys(groups).forEach(function (k) {
      const list = groups[k];
      list.sort(function (a, b) { return (cur && a.id === cur.id) - (cur && b.id === cur.id); });
      const tile = tileEls[k];
      if (!tile) return;
      const tw = tile.offsetWidth, th = tile.offsetHeight;
      const c = centerOf(tile);
      const n = list.length;
      const gc = n <= 1 ? 1 : (n <= 4 ? 2 : (n <= 9 ? 3 : 4));
      const gr = Math.ceil(n / gc);
      const base = PG.clamp(tw * 0.34, 16, 32);
      const size = Math.min(base, (tw * 0.95) / gc, (Math.min(th, tw * 1.1) * 0.8) / gr);
      const bottomY = tile.offsetTop + th - size * 0.5 - Math.max(3, th * 0.05);
      list.forEach(function (p, j) {
        const col = j % gc, row = Math.floor(j / gc);
        const x = c.x + (col - (gc - 1) / 2) * size * 0.9;
        const y = bottomY - (gr - 1 - row) * size * 0.82;
        const tok = tokenEl(layer, p);
        tok.style.setProperty('--size', size.toFixed(1) + 'px');
        tok.style.transform = 'translate(' + (x - size / 2).toFixed(1) + 'px,' + (y - size / 2).toFixed(1) + 'px)';
        tok.classList.toggle('is-active', !!cur && p.id === cur.id);
        tok.style.zIndex = (cur && p.id === cur.id) ? 5 : 1;
        seen[p.id] = true;
      });
    });
    Array.prototype.slice.call(layer.children).forEach(function (el) { if (!seen[el.dataset.pid]) el.remove(); });
    if (instant !== false) void layer.offsetWidth;
    Array.prototype.slice.call(layer.querySelectorAll('.no-anim')).forEach(function (el) {
      requestAnimationFrame(function () { el.classList.remove('no-anim'); });
    });
  }

  function hop(p, ms) {
    if (!boardEl || PG.reducedMotion()) return;
    const tok = boardEl.querySelector('.token[data-pid="' + p.id + '"] .token-body');
    if (!tok || !tok.animate) return;
    tok.animate([
      { transform: 'translateY(0) scale(1)' },
      { transform: 'translateY(-16px) scale(1.12)' },
      { transform: 'translateY(0) scale(1)' }
    ], { duration: Math.max(140, ms * 0.95), easing: 'ease-out' });
  }

  function scrollToTile(idx) {
    const tile = tileEls[idx];
    if (!tile || !tile.scrollIntoView) return;
    const r = tile.getBoundingClientRect();
    const vh = window.innerHeight || 800;
    if (r.top < 70 || r.bottom > vh - 190) {
      try { tile.scrollIntoView({ block: 'center', behavior: PG.reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { /* alt */ }
    }
  }

  /** Figur Feld für Feld entlang eines Weges bewegen. dir = +1 vorwärts, -1 rückwärts. */
  async function walkPath(p, ids, ms, dir) {
    const st = PG.G.st;
    if (p.round !== view && st.settings.followCam) {
      setView(p.round);
      await PG.sleep(120);
    }
    const visible = p.round === view;
    if (visible) scrollToTile(p.pos);
    for (let i = 0; i < ids.length; i++) {
      if (dir > 0) p.trail.push(p.pos);
      else p.trail.pop();
      p.pos = ids[i];
      if (visible) { renderTokens(false); hop(p, ms); PG.Audio.step(); }
      await PG.sleep(visible ? ms : 0);
    }
    if (visible) scrollToTile(p.pos);
    PG.UI.renderSide();
  }

  /* ---------- Zielfelder zum Antippen ---------- */
  function applyTargets() {
    Object.keys(tileEls).forEach(function (id) {
      const el = tileEls[id];
      const opt = pick && pick.targets[id];
      el.classList.toggle('is-target', !!opt);
      const die = el.querySelector('.tile-die');
      if (die) die.textContent = opt && pick.showDie ? String(opt.die) : '';
    });
  }

  /** Wartet, bis der Spieler eines der Zielfelder antippt. opts: [{target, path, die}] */
  function pickTarget(p, opts, showDie) {
    if (view !== p.round) setView(p.round);
    return new Promise(function (resolve, reject) {
      const targets = {};
      opts.forEach(function (o) { targets[o.target] = o; });
      pick = { round: p.round, targets: targets, resolve: resolve, reject: reject, showDie: !!showDie };
      applyTargets();
      const first = tileEls[opts[0].target];
      if (first) {
        scrollToTile(opts[0].target);
        try { first.focus({ preventScroll: true }); } catch (e) { /* egal */ }
      }
    });
  }

  function clearPick(abort) {
    const p = pick;
    pick = null;
    applyTargets();
    if (abort && p) p.reject(PG.ABORT);
  }

  function setView(r) {
    if (r < 1 || r > 3) return;
    view = r;
    render();
    if (PG.UI && PG.UI.renderRoundChrome) PG.UI.renderRoundChrome();
  }

  function highlight(idx) {
    Object.keys(tileEls).forEach(function (id) { tileEls[id].classList.toggle('is-hint', +id === idx); });
  }

  function init(el) {
    boardEl = el;
    if (window.ResizeObserver) {
      new ResizeObserver(function () {
        if (!PG.G.st || !boardEl.offsetParent) return;
        if (Math.abs(boardEl.clientWidth - lastWidth) > 2) render();
      }).observe(boardEl);
    } else {
      window.addEventListener('resize', function () { if (PG.G.st) render(); });
    }
    boardEl.addEventListener('click', function (e) {
      const tile = e.target.closest('.tile');
      if (!tile) return;
      const id = tile.dataset.idx;
      if (pick && pick.round === view && pick.targets[id]) {
        const opt = pick.targets[id];
        const res = pick.resolve;
        pick = null;
        applyTargets();
        PG.Audio.click();
        res(opt);
        return;
      }
      if (pick && pick.round === view) {
        tile.classList.remove('is-shake'); void tile.offsetWidth; tile.classList.add('is-shake');
      }
      if (PG.UI) PG.UI.fieldInfo(view, +id);
    });
  }

  PG.Board = {
    init: init,
    render: render,
    renderTokens: renderTokens,
    walkPath: walkPath,
    pickTarget: pickTarget,
    clearPick: clearPick,
    setView: setView,
    highlight: highlight,
    category: category,
    fieldTitle: fieldTitle,
    isOff: isOff,
    get view() { return view; },
    get picking() { return !!pick; }
  };
})(window.PG);
