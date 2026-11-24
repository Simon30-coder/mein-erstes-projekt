/* =========================================================================
   SPIELBRETT – zeichnet die Felder als Schlangenpfad und bewegt die Figuren
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  const t = PG.t, tx = PG.tx, esc = PG.esc;
  const GAP = 10;

  let boardEl = null;
  let view = 1;
  let cols = 0;
  let tileEls = [];
  let lastWidth = 0;

  /* Pfad wie in der Skizze: Reihe nach rechts, ein Verbindungsfeld nach unten, Reihe nach links … */
  function layoutPath(n, C) {
    const out = [];
    let r = 0, dir = 1, i = 0;
    while (i < n) {
      for (let k = 0; k < C && i < n; k++, i++) {
        out.push({ r: r, c: dir === 1 ? k : C - 1 - k });
      }
      if (i >= n) break;
      r++;
      out.push({ r: r, c: dir === 1 ? C - 1 : 0 });
      i++;
      r++;
      dir = -dir;
    }
    return out;
  }

  function category(f) {
    switch (f.type) {
      case 'start': return 'start';
      case 'key': return 'key';
      case 'gate': return 'gate';
      case 'quiz': return 'quiz';
      case 'news': return 'news';
      case 'state': return 'state';
      case 'duel': return 'duel';
      case 'steps': return f.steps > 0 ? 'good' : 'bad';
      case 'skip': return 'bad';
      case 'polls': return f.polls < 0 ? 'bad' : 'good';
      case 'money': return f.money < 0 ? 'bad' : 'good';
      case 'again': return 'good';
      default: return 'plain';
    }
  }

  function isOff(f) {
    const s = PG.G.st ? PG.G.st.settings : null;
    if (!s) return false;
    if (f.type === 'quiz' && !s.quiz) return true;
    if (f.type === 'news' && !s.news) return true;
    if ((f.type === 'money' || f.type === 'polls') && !s.resources) return true;
    if (f.type === 'state' && s.finale === 'race') return true;
    return false;
  }

  function badge(f) {
    const s = PG.G.st ? PG.G.st.settings : {};
    switch (f.type) {
      case 'steps': return (f.steps > 0 ? '+' : '−') + Math.abs(f.steps);
      case 'money': return s.resources ? PG.fmt.money(f.money, true) : '';
      case 'polls': return s.resources ? PG.fmt.polls(f.polls, true) : '';
      case 'again': return '×2';
      case 'skip': return '⏸';
      case 'gate': return '2 · 4 · 6';
      case 'quiz': return s.quiz ? '+2' : '';
      case 'duel': return '±2';
      default: return '';
    }
  }

  function tileHTML(f, i, p) {
    const st = PG.G.st;
    const cat = category(f);
    const off = isOff(f);
    let title, icon, fx, extraCls = '', style = 'grid-row:' + (p.r + 1) + ';grid-column:' + (p.c + 1) + ';';
    let ownerBadge = '';
    if (f.type === 'state') {
      const s = PG.STATES[f.state];
      title = tx(s.name);
      icon = '<span class="tile-code">' + s.code + '</span>';
      fx = s.ev + ' ' + t('evShort');
      const owner = st && st.owners[f.state] !== undefined ? PG.player(st.owners[f.state]) : null;
      if (owner && !off) {
        extraCls = ' is-owned';
        style += '--owner:' + owner.color + ';';
        ownerBadge = '<span class="tile-owner" title="' + esc(owner.name) + '">' + esc(PG.initial(owner.name)) + '</span>';
      }
    } else {
      title = tx(f.title);
      icon = f.icon;
      fx = badge(f);
    }
    const label = (f.type === 'state' ? tx(PG.STATES[f.state].name) : tx(f.title)) + ' (' + i + ')';
    return '<button type="button" class="tile tile--' + cat + (off ? ' is-off' : '') + extraCls + '" style="' + style +
      '" data-idx="' + i + '" aria-label="' + esc(label) + '">' +
      '<span class="tile-num">' + i + '</span>' +
      '<span class="tile-icon" aria-hidden="true">' + icon + '</span>' +
      '<span class="tile-title">' + esc(title) + '</span>' +
      (fx ? '<span class="tile-fx">' + esc(fx) + '</span>' : '') +
      ownerBadge +
      '</button>';
  }

  function render() {
    const st = PG.G.st;
    if (!st || !boardEl) return;
    const b = PG.BOARDS[view - 1];
    const n = b.fields.length;
    const w = boardEl.clientWidth || 800;
    lastWidth = w;
    const C = PG.clamp(Math.floor((w + GAP) / (112 + GAP)), 4, 9);
    cols = C;
    const tileW = (w - (C - 1) * GAP) / C;
    const tileH = Math.max(72, Math.round(tileW * 0.94));
    boardEl.style.setProperty('--cols', C);
    boardEl.style.setProperty('--tile-w', tileW + 'px');
    boardEl.style.setProperty('--tile-h', tileH + 'px');
    boardEl.style.setProperty('--gap', GAP + 'px');
    boardEl.classList.toggle('is-compact', tileW < 96);

    const pos = layoutPath(n, C);
    const rowsUsed = pos[pos.length - 1].r + 1;
    let html = '';
    /* Beschriftungen in den freien Flächen neben den Verbindungsfeldern */
    if (rowsUsed > 2 && C > 3) {
      html += '<div class="board-mark board-mark--title" style="grid-row:2;grid-column:1 / ' + C + ';">' +
        '<span class="mark-round">' + t('round') + ' ' + t('roundRoman')[view - 1] + '</span>' +
        '<span class="mark-title">' + esc(tx(b.title)) + '</span></div>';
    }
    if (rowsUsed > 4 && C > 3) {
      html += '<div class="board-mark board-mark--question" style="grid-row:4;grid-column:2 / ' + (C + 1) + ';">' +
        esc(tx(b.question)) + '</div>';
    }
    b.fields.forEach(function (f, i) { html += tileHTML(f, i, pos[i]); });
    html += '<svg class="board-path" aria-hidden="true"></svg><div class="board-arrows" aria-hidden="true"></div><div class="tokens" aria-hidden="true"></div>';
    boardEl.innerHTML = html;
    boardEl.dataset.round = String(view);
    tileEls = Array.prototype.slice.call(boardEl.querySelectorAll('.tile'));
    drawPath();
    renderTokens(true);
  }

  function centerOf(el) {
    return { x: el.offsetLeft + el.offsetWidth / 2, y: el.offsetTop + el.offsetHeight / 2 };
  }

  function drawPath() {
    const svg = boardEl.querySelector('.board-path');
    const arrows = boardEl.querySelector('.board-arrows');
    if (!svg || !tileEls.length) return;
    const W = boardEl.scrollWidth, H = boardEl.scrollHeight;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H);
    svg.setAttribute('width', W);
    svg.setAttribute('height', H);
    const pts = tileEls.map(centerOf);
    const d = pts.map(function (p, i) { return (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1); }).join(' ');
    svg.innerHTML = '<path d="' + d + '" class="path-glow"/><path d="' + d + '" class="path-line"/>';
    let ah = '';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      ah += '<span class="arrow" style="left:' + ((a.x + b.x) / 2).toFixed(1) + 'px;top:' + ((a.y + b.y) / 2).toFixed(1) +
        'px;transform:translate(-50%,-50%) rotate(' + ang.toFixed(0) + 'deg)"></span>';
    }
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
    const here = st.players.filter(function (p) { return p.round === view; });
    const groups = {};
    here.forEach(function (p) { (groups[p.pos] = groups[p.pos] || []).push(p); });
    const seen = {};
    Object.keys(groups).forEach(function (k) {
      const list = groups[k];
      /* aktiver Spieler zuletzt, damit er oben liegt */
      list.sort(function (a, b) { return (cur && a.id === cur.id) - (cur && b.id === cur.id); });
      const tile = tileEls[+k];
      if (!tile) return;
      const tw = tile.offsetWidth, th = tile.offsetHeight;
      const c = centerOf(tile);
      const n = list.length;
      const gc = n <= 1 ? 1 : (n <= 4 ? 2 : (n <= 9 ? 3 : 4));
      const gr = Math.ceil(n / gc);
      const base = PG.clamp(tw * 0.34, 18, 30);
      const size = Math.min(base, (tw * 0.92) / gc, (th * 0.74) / gr);
      /* Figuren stehen unten im Feld, damit der Feldname lesbar bleibt */
      const bottomY = tile.offsetTop + th - size * 0.5 - Math.max(4, th * 0.05);
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
    Array.prototype.slice.call(layer.children).forEach(function (el) {
      if (!seen[el.dataset.pid]) el.remove();
    });
    if (instant !== false) {
      void layer.offsetWidth; /* Layout erzwingen, damit neue Figuren ohne Animation erscheinen */
    }
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
    if (r.top < 70 || r.bottom > vh - 150) {
      try { tile.scrollIntoView({ block: 'center', behavior: PG.reducedMotion() ? 'auto' : 'smooth' }); } catch (e) { /* alt */ }
    }
  }

  async function walk(p, target, ms) {
    const st = PG.G.st;
    if (p.round !== view && st.settings.followCam) {
      setView(p.round);
      await PG.sleep(120);
    }
    const visible = p.round === view;
    if (visible) scrollToTile(p.pos);
    const dir = target > p.pos ? 1 : -1;
    while (p.pos !== target) {
      p.pos += dir;
      if (visible) { renderTokens(false); hop(p, ms); PG.Audio.step(); }
      await PG.sleep(visible ? ms : 0);
    }
    if (visible) scrollToTile(p.pos);
    PG.UI.renderSide();
  }

  function setView(r) {
    if (r < 1 || r > 3) return;
    view = r;
    render();
    if (PG.UI && PG.UI.renderRoundChrome) PG.UI.renderRoundChrome();
  }

  function highlight(idx) {
    tileEls.forEach(function (el, i) { el.classList.toggle('is-target', i === idx); });
  }

  function init(el) {
    boardEl = el;
    if (window.ResizeObserver) {
      const ro = new ResizeObserver(function () {
        if (!PG.G.st || !boardEl.offsetParent) return;
        const w = boardEl.clientWidth;
        if (Math.abs(w - lastWidth) > 2) render();
      });
      ro.observe(boardEl);
    } else {
      window.addEventListener('resize', function () { if (PG.G.st) render(); });
    }
    boardEl.addEventListener('click', function (e) {
      const tile = e.target.closest('.tile');
      if (!tile || !PG.UI) return;
      PG.UI.fieldInfo(view, +tile.dataset.idx);
    });
  }

  PG.Board = {
    init: init,
    render: render,
    renderTokens: renderTokens,
    walk: walk,
    setView: setView,
    highlight: highlight,
    category: category,
    isOff: isOff,
    get view() { return view; },
    get cols() { return cols; }
  };
})(window.PG);
