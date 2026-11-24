/* =========================================================================
   OBERFLÄCHE – Startbildschirm, Spielansicht, Würfel, Karten & Dialoge
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  const t = PG.t, tx = PG.tx, esc = PG.esc;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };
  const $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  const ADVISOR_COST = 5;
  const MAX_PLAYERS = 15;

  /* -----------------------------------------------------------------------
     ICONS (einfache Linien-Icons)
     ----------------------------------------------------------------------- */
  const svg = function (inner) {
    return '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  };
  const ICON = {
    soundOn: svg('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M18.5 5.5a9 9 0 0 1 0 13"/>'),
    soundOff: svg('<path d="M11 5 6 9H3v6h3l5 4z"/><path d="m16 9.5 5 5"/><path d="m21 9.5-5 5"/>'),
    book: svg('<path d="M3 5h6a3 3 0 0 1 3 3v12a2.5 2.5 0 0 0-2.5-2.5H3z"/><path d="M21 5h-6a3 3 0 0 0-3 3v12a2.5 2.5 0 0 1 2.5-2.5H21z"/>'),
    sliders: svg('<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>'),
    menu: svg('<path d="M4 7h16M4 12h16M4 17h16"/>'),
    minus: svg('<path d="M6 12h12"/>'),
    plus: svg('<path d="M12 6v12M6 12h12"/>'),
    bot: svg('<rect x="5" y="8" width="14" height="11" rx="3"/><path d="M12 4v4"/><circle cx="9.5" cy="13.5" r="1.2" fill="currentColor"/><circle cx="14.5" cy="13.5" r="1.2" fill="currentColor"/>')
  };

  /* -----------------------------------------------------------------------
     EINSTELLUNGEN & SETUP (werden im Browser gemerkt)
     ----------------------------------------------------------------------- */
  const DEFAULT_SETTINGS = { finale: 'night', quiz: true, news: true, resources: true, botSpeed: 'normal', followCam: true };

  function randomHome() {
    const codes = PG.STATE_CODES.filter(function (c) { return c !== 'DC'; });
    return codes[PG.rnd(codes.length)];
  }

  function loadSetup() {
    const base = { humans: 1, bots: 3, players: [], settings: Object.assign({}, DEFAULT_SETTINGS) };
    try {
      const s = JSON.parse(localStorage.getItem('pg-setup') || 'null');
      if (s && typeof s === 'object') {
        if (s.humans >= 1 && s.humans <= MAX_PLAYERS) base.humans = s.humans;
        if (s.bots >= 0 && s.bots <= MAX_PLAYERS) base.bots = s.bots;
        if (Array.isArray(s.players)) base.players = s.players.slice(0, MAX_PLAYERS).filter(function (p) { return p && typeof p === 'object'; });
        if (s.settings) base.settings = Object.assign({}, DEFAULT_SETTINGS, s.settings);
      }
    } catch (e) { /* ignorieren */ }
    if (base.humans + base.bots > MAX_PLAYERS) base.bots = MAX_PLAYERS - base.humans;
    for (let i = 0; i < MAX_PLAYERS; i++) {
      const p = base.players[i] || {};
      base.players[i] = {
        name: typeof p.name === 'string' ? p.name.slice(0, 18) : '',
        color: PG.COLORS.indexOf(p.color) >= 0 ? p.color : PG.COLORS[i],
        home: PG.STATES[p.home] && p.home !== 'DC' ? p.home : randomHome()
      };
    }
    return base;
  }

  let setup = loadSetup();
  function saveSetup() {
    try { localStorage.setItem('pg-setup', JSON.stringify(setup)); } catch (e) { /* ignorieren */ }
  }

  function defaultName(i) { return (PG.I18N.lang === 'de' ? 'Spieler ' : 'Player ') + (i + 1); }

  /* -----------------------------------------------------------------------
     MODALE KARTEN
     ----------------------------------------------------------------------- */
  const openModals = [];
  let overlayRoot = null;

  function chipsHTML(chips) {
    if (!chips || !chips.length) return '';
    return '<ul class="chips">' + chips.map(function (c) {
      return '<li class="chip chip--' + (c.tone || 'neutral') + '">' + esc(c.label) + '</li>';
    }).join('') + '</ul>';
  }

  function autoMs(base) { return Math.round((base || 1800) * PG.speed()); }

  /**
   * Öffnet eine Karte. Gibt ein Promise mit dem Wert des gedrückten Knopfs zurück.
   * o: { kind, eyebrow, icon, title, text, html, chips, buttons:[{label,value,cls}], auto(ms), dismissable, wide, onMount(card, close) }
   */
  function modal(o) {
    return new Promise(function (resolve, reject) {
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap' + (o.wide ? ' is-wide' : '') + (o.layer ? ' is-' + o.layer : '');
      const titleId = 'mt-' + Math.random().toString(36).slice(2, 8);
      const buttons = (o.buttons || []).map(function (b, i) {
        return '<button type="button" class="btn ' + (b.cls || (i === 0 ? 'btn-gold' : 'btn-outline')) + '" data-v="' + i + '">' + esc(b.label) + '</button>';
      }).join('');
      wrap.innerHTML =
        '<div class="modal-backdrop"></div>' +
        '<div class="card card--' + (o.kind || 'info') + '" role="dialog" aria-modal="true"' + (o.title ? ' aria-labelledby="' + titleId + '"' : '') + '>' +
        (o.eyebrow ? '<div class="card-band"><span>' + esc(o.eyebrow) + '</span></div>' : '') +
        '<div class="card-body">' +
        (o.icon ? '<div class="card-icon" aria-hidden="true">' + o.icon + '</div>' : '') +
        (o.title ? '<h2 class="card-title" id="' + titleId + '">' + esc(o.title) + '</h2>' : '') +
        (o.html || (o.text ? '<p class="card-text">' + esc(o.text) + '</p>' : '')) +
        chipsHTML(o.chips) +
        '</div>' +
        '<div class="card-actions">' + buttons + '</div>' +
        (o.auto ? '<div class="card-timer"><span style="animation-duration:' + o.auto + 'ms"></span></div>' : '') +
        '</div>';
      overlayRoot.appendChild(wrap);
      const card = $('.card', wrap);
      let done = false, timer = null;
      const entry = { wrap: wrap, abort: function () { if (done) return; done = true; clearTimeout(timer); wrap.remove(); reject(PG.ABORT); } };
      openModals.push(entry);

      function close(val) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        const i = openModals.indexOf(entry); if (i >= 0) openModals.splice(i, 1);
        wrap.classList.add('is-leaving');
        setTimeout(function () { wrap.remove(); }, 160);
        document.removeEventListener('keydown', onKey);
        resolve(val);
      }
      function onKey(e) {
        if (openModals[openModals.length - 1] !== entry) return;
        if (e.key === 'Escape' && o.dismissable) { e.preventDefault(); close(null); }
      }
      document.addEventListener('keydown', onKey);
      $$('.card-actions .btn', wrap).forEach(function (btn) {
        btn.addEventListener('click', function () {
          PG.Audio.click();
          const b = o.buttons[+btn.dataset.v];
          close(b.value !== undefined ? b.value : +btn.dataset.v);
        });
      });
      if (o.dismissable) $('.modal-backdrop', wrap).addEventListener('click', function () { close(null); });
      if (o.auto) {
        timer = setTimeout(function () { close(o.autoValue); }, o.auto);
        card.addEventListener('click', function (e) { if (!e.target.closest('button')) close(o.autoValue); });
      }
      if (o.onMount) o.onMount(card, close);
      requestAnimationFrame(function () {
        wrap.classList.add('is-in');
        const first = $('.card-actions .btn', wrap);
        if (first && !o.noFocus) first.focus({ preventScroll: true });
      });
    });
  }

  function abortAll() {
    openModals.slice().forEach(function (m) { m.abort(); });
    openModals.length = 0;
    if (pendingAction) { const p = pendingAction; pendingAction = null; p.reject(PG.ABORT); }
    $$('.night, .victory', document).forEach(function (el) { el.remove(); });
  }

  /** Standard-Ereigniskarte: Menschen klicken „Weiter“, KI-Züge schließen sich selbst. */
  function event(o) {
    return modal({
      kind: o.kind || 'info',
      eyebrow: o.eyebrow,
      icon: o.icon,
      title: o.title,
      text: o.text,
      html: o.html,
      chips: o.chips,
      buttons: o.auto ? [] : [{ label: o.button || t('ok') }],
      auto: o.auto ? autoMs(o.autoBase || 1900) : 0
    });
  }

  /* -----------------------------------------------------------------------
     TOASTS (kleine Hinweise ohne Klick)
     ----------------------------------------------------------------------- */
  function toast(o) {
    const root = $('#toastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = 'toast toast--' + (o.tone || 'neutral');
    el.innerHTML = (o.icon ? '<span class="toast-icon" aria-hidden="true">' + o.icon + '</span>' : '') +
      '<div class="toast-body">' + (o.title ? '<strong>' + esc(o.title) + '</strong>' : '') +
      (o.text ? '<span>' + esc(o.text) + '</span>' : '') + chipsHTML(o.chips) + '</div>';
    root.appendChild(el);
    while (root.children.length > 3) root.firstChild.remove();
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    setTimeout(function () { el.classList.remove('is-in'); setTimeout(function () { el.remove(); }, 300); }, o.ms || 3200);
  }

  /* -----------------------------------------------------------------------
     WÜRFEL (3D)
     ----------------------------------------------------------------------- */
  const PIPS = { 1: [5], 2: [3, 7], 3: [3, 5, 7], 4: [1, 3, 7, 9], 5: [1, 3, 5, 7, 9], 6: [1, 3, 4, 6, 7, 9] };
  const FACE_ROT = { 1: [0, 0], 2: [-90, 0], 3: [0, -90], 4: [0, 90], 5: [90, 0], 6: [0, 180] };

  function facePips(v) {
    return PIPS[v].map(function (k) {
      return '<i style="grid-row:' + Math.ceil(k / 3) + ';grid-column:' + (((k - 1) % 3) + 1) + '"></i>';
    }).join('');
  }

  function dieHTML(extraCls) {
    let faces = '';
    for (let v = 1; v <= 6; v++) faces += '<div class="die-face f' + v + '">' + facePips(v) + '</div>';
    return '<div class="die ' + (extraCls || '') + '"><div class="die-cube" data-x="0" data-y="0">' + faces + '</div></div>';
  }

  function flatDieHTML(v) {
    return '<span class="die-flat" aria-hidden="true">' + facePips(v) + '</span>';
  }

  function rollCube(dieEl, value, dur) {
    const cube = $('.die-cube', dieEl);
    if (!cube) return Promise.resolve();
    dur = PG.reducedMotion() ? 200 : (dur || 900);
    const spinsX = (+cube.dataset.sx || 0) + 2 + PG.rnd(2);
    const spinsY = (+cube.dataset.sy || 0) + 2 + PG.rnd(2);
    cube.dataset.sx = spinsX; cube.dataset.sy = spinsY;
    const rot = FACE_ROT[value];
    cube.style.transition = 'transform ' + dur + 'ms cubic-bezier(.15,.75,.25,1)';
    cube.style.transform = 'rotateX(' + (spinsX * 360 + rot[0]) + 'deg) rotateY(' + (spinsY * 360 + rot[1]) + 'deg)';
    dieEl.classList.remove('is-landed');
    return PG.sleep(dur).then(function () { dieEl.classList.add('is-landed'); });
  }

  function rollDice(values) {
    const a = $('#dieA'), b = $('#dieB');
    PG.Audio.dice();
    b.hidden = values.length < 2;
    const jobs = [rollCube(a, values[0], 950 * Math.min(1, PG.speed() + 0.2))];
    if (values.length > 1) jobs.push(rollCube(b, values[1], 1050 * Math.min(1, PG.speed() + 0.2)));
    return Promise.all(jobs);
  }

  /* -----------------------------------------------------------------------
     TOPBAR
     ----------------------------------------------------------------------- */
  function renderTopbar() {
    const inGame = !!PG.G.st && !$('#screenGame').hidden;
    $('#brandName').textContent = t('appName');
    $('#brandHome').setAttribute('aria-label', t('appName'));
    const lang = PG.I18N.lang;
    $('#langSwitch').innerHTML =
      '<button type="button" data-lang="de" class="' + (lang === 'de' ? 'is-on' : '') + '" aria-pressed="' + (lang === 'de') + '">DE</button>' +
      '<button type="button" data-lang="en" class="' + (lang === 'en' ? 'is-on' : '') + '" aria-pressed="' + (lang === 'en') + '">EN</button>';
    $('#langSwitch').setAttribute('aria-label', t('langLabel'));
    const snd = $('#btnSound');
    snd.innerHTML = PG.Audio.enabled ? ICON.soundOn : ICON.soundOff;
    snd.setAttribute('aria-label', PG.Audio.enabled ? t('btnSoundOn') : t('btnSoundOff'));
    snd.title = snd.getAttribute('aria-label');
    $('#btnRules').innerHTML = ICON.book + '<span class="btn-label">' + esc(t('btnRules')) + '</span>';
    $('#btnSettings').innerHTML = ICON.sliders + '<span class="btn-label">' + esc(t('btnSettings')) + '</span>';
    $('#btnMenu').innerHTML = ICON.menu + '<span class="btn-label">' + esc(t('btnMenu')) + '</span>';
    $('#btnSettings').hidden = !inGame;
    $('#btnMenu').hidden = !inGame;
  }

  /* -----------------------------------------------------------------------
     STARTBILDSCHIRM
     ----------------------------------------------------------------------- */
  function whiteHouseSVG() {
    /* Ring aus 50 Sternen – einer pro Bundesstaat */
    let stars = '';
    for (let i = 0; i < 50; i++) {
      const a = (i / 50) * Math.PI * 2 - Math.PI / 2;
      const x = 200 + Math.cos(a) * 168, y = 150 + Math.sin(a) * 120;
      stars += '<use href="#pgStar" x="' + (x - 5).toFixed(1) + '" y="' + (y - 5).toFixed(1) + '" width="10" height="10"/>';
    }
    let cols = '';
    for (let i = 0; i < 6; i++) cols += '<rect x="' + (166 + i * 13) + '" y="112" width="5" height="62" rx="1.5" class="wh-col"/>';
    let wins = '';
    [74, 98, 122, 256, 280, 304].forEach(function (x) {
      wins += '<rect x="' + x + '" y="124" width="14" height="18" rx="1" class="wh-win"/><rect x="' + x + '" y="152" width="14" height="18" rx="1" class="wh-win"/>';
    });
    return '<svg class="wh" viewBox="0 0 400 300" role="img" aria-label="White House">' +
      '<defs><symbol id="pgStar" viewBox="0 0 10 10"><path d="M5 0.4 6.2 3.6 9.6 3.7 6.9 5.8 7.9 9.2 5 7.2 2.1 9.2 3.1 5.8 0.4 3.7 3.8 3.6z"/></symbol>' +
      '<linearGradient id="whLawn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="var(--lawn-1)"/><stop offset="1" stop-color="var(--lawn-2)"/></linearGradient></defs>' +
      '<g class="wh-stars">' + stars + '</g>' +
      '<ellipse cx="200" cy="236" rx="190" ry="34" fill="url(#whLawn)"/>' +
      '<g class="wh-house">' +
      '<rect x="60" y="112" width="280" height="68" class="wh-wall"/>' +
      '<rect x="56" y="104" width="288" height="9" class="wh-cornice"/>' +
      '<rect x="60" y="96" width="280" height="8" class="wh-balustrade"/>' +
      wins +
      '<path d="M150 112 L200 76 L250 112 Z" class="wh-pediment"/>' +
      '<rect x="152" y="108" width="96" height="6" class="wh-cornice"/>' +
      cols +
      '<rect x="190" y="146" width="20" height="28" rx="10" class="wh-door"/>' +
      '<rect x="48" y="178" width="304" height="8" class="wh-cornice"/>' +
      '<line x1="200" y1="76" x2="200" y2="40" class="wh-pole"/>' +
      '<g class="wh-flag"><rect x="200" y="40" width="30" height="18" fill="var(--paper)"/>' +
      '<rect x="200" y="40" width="30" height="2.6" fill="var(--red)"/><rect x="200" y="45.2" width="30" height="2.6" fill="var(--red)"/>' +
      '<rect x="200" y="50.4" width="30" height="2.6" fill="var(--red)"/><rect x="200" y="55.6" width="30" height="2.4" fill="var(--red)"/>' +
      '<rect x="200" y="40" width="12" height="9.6" fill="var(--navy-500)"/></g>' +
      '</g>' +
      '<path d="M170 232 Q200 214 230 232" class="wh-path"/>' +
      '</svg>';
  }

  function stepperHTML(id, value, label, hint) {
    return '<div class="stepper-row">' +
      '<div class="stepper-text"><label for="' + id + '">' + esc(label) + '</label><small>' + esc(hint) + '</small></div>' +
      '<div class="stepper">' +
      '<button type="button" class="stepper-btn" data-step="-1" data-for="' + id + '" aria-label="−">' + ICON.minus + '</button>' +
      '<output id="' + id + '" class="stepper-val">' + value + '</output>' +
      '<button type="button" class="stepper-btn" data-step="1" data-for="' + id + '" aria-label="+">' + ICON.plus + '</button>' +
      '</div></div>';
  }

  function homeOptions(selected) {
    const codes = PG.STATE_CODES.filter(function (c) { return c !== 'DC'; })
      .sort(function (a, b) { return tx(PG.STATES[a].name).localeCompare(tx(PG.STATES[b].name)); });
    return codes.map(function (c) {
      return '<option value="' + c + '"' + (c === selected ? ' selected' : '') + '>' + esc(tx(PG.STATES[c].name)) + '</option>';
    }).join('');
  }

  /** Spielerliste, wie sie beim Start entstehen würde */
  function plannedPlayers() {
    const list = [];
    const used = {};
    for (let i = 0; i < setup.humans; i++) {
      const sp = setup.players[i];
      list.push({ slot: i, isBot: false, name: sp.name || defaultName(i), rawName: sp.name, color: sp.color, home: sp.home });
      used[sp.color] = true;
    }
    const freeColors = PG.COLORS.filter(function (c) { return !used[c]; });
    for (let j = 0; j < setup.bots; j++) {
      list.push({ slot: setup.humans + j, isBot: true, name: PG.BOT_NAMES[j % PG.BOT_NAMES.length], color: freeColors[j % freeColors.length], home: null });
    }
    return list;
  }

  function playerRowsHTML() {
    return plannedPlayers().map(function (p) {
      if (p.isBot) {
        return '<li class="setup-player is-bot">' +
          '<span class="swatch" style="--c:' + p.color + '">' + esc(PG.initial(p.name)) + '</span>' +
          '<span class="setup-botname">' + esc(p.name) + '</span>' +
          '<span class="tag tag--ai">' + ICON.bot + t('ai') + '</span></li>';
      }
      const i = p.slot;
      return '<li class="setup-player">' +
        '<button type="button" class="swatch swatch-btn" data-color-slot="' + i + '" style="--c:' + p.color + '" aria-label="' + esc(t('changeColor')) + '">' + esc(PG.initial(p.name)) + '</button>' +
        '<input id="pname' + i + '" class="input" type="text" maxlength="18" autocomplete="off" data-name-slot="' + i + '" value="' + esc(p.rawName) + '" placeholder="' + esc(defaultName(i)) + '" aria-label="' + esc(t('namePh')) + ' ' + (i + 1) + '">' +
        '<select id="phome' + i + '" class="select" data-home-slot="' + i + '" aria-label="' + esc(t('homeState')) + '">' + homeOptions(p.home) + '</select>' +
        '</li>';
    }).join('');
  }

  function settingsFormHTML(s, prefix) {
    const radio = function (val, label, desc, rec) {
      return '<label class="choice' + (s.finale === val ? ' is-on' : '') + '">' +
        '<input type="radio" name="' + prefix + 'finale" id="' + prefix + 'finale-' + val + '" value="' + val + '"' + (s.finale === val ? ' checked' : '') + '>' +
        '<span class="choice-head">' + esc(label) + (rec ? ' <em class="tag tag--rec">' + esc(t('recommended')) + '</em>' : '') + '</span>' +
        '<span class="choice-desc">' + esc(desc) + '</span></label>';
    };
    const toggle = function (key, label, desc) {
      return '<label class="toggle">' +
        '<input type="checkbox" id="' + prefix + key + '" data-key="' + key + '"' + (s[key] ? ' checked' : '') + '>' +
        '<span class="toggle-ui" aria-hidden="true"></span>' +
        '<span class="toggle-text"><b>' + esc(label) + '</b>' + (desc ? '<small>' + esc(desc) + '</small>' : '') + '</span></label>';
    };
    const speed = ['slow', 'normal', 'fast'].map(function (v) {
      const lbl = { slow: t('speedSlow'), normal: t('speedNormal'), fast: t('speedFast') }[v];
      return '<label class="seg' + (s.botSpeed === v ? ' is-on' : '') + '"><input type="radio" name="' + prefix + 'speed" id="' + prefix + 'speed-' + v + '" value="' + v + '"' + (s.botSpeed === v ? ' checked' : '') + '>' + esc(lbl) + '</label>';
    }).join('');
    return '<fieldset class="fs"><legend>' + esc(t('finaleTitle')) + '</legend><div class="choices">' +
      radio('night', t('finaleNight'), t('finaleNightDesc'), true) +
      radio('hurdle', t('finaleHurdle'), t('finaleHurdleDesc')) +
      radio('race', t('finaleRace'), t('finaleRaceDesc')) +
      '</div></fieldset>' +
      '<fieldset class="fs"><legend>' + esc(t('extrasTitle')) + '</legend><div class="toggles">' +
      toggle('quiz', t('optQuiz'), t('optQuizDesc')) +
      toggle('news', t('optNews'), t('optNewsDesc')) +
      toggle('resources', t('optRes'), t('optResDesc')) +
      '</div></fieldset>' +
      '<fieldset class="fs"><legend>' + esc(t('botSpeed')) + '</legend><div class="segs">' + speed + '</div>' +
      toggle('followCam', t('followCam'), '') +
      '</fieldset>';
  }

  function bindSettingsForm(root, s, prefix, onChange) {
    $$('input[name="' + prefix + 'finale"]', root).forEach(function (inp) {
      inp.addEventListener('change', function () {
        s.finale = inp.value;
        $$('.choice', root).forEach(function (c) { c.classList.toggle('is-on', $('input', c).checked); });
        onChange();
      });
    });
    $$('input[name="' + prefix + 'speed"]', root).forEach(function (inp) {
      inp.addEventListener('change', function () {
        s.botSpeed = inp.value;
        $$('.seg', root).forEach(function (c) { c.classList.toggle('is-on', $('input', c).checked); });
        onChange();
      });
    });
    $$('input[type="checkbox"][data-key]', root).forEach(function (inp) {
      inp.addEventListener('change', function () { s[inp.dataset.key] = inp.checked; onChange(); });
    });
  }

  function renderStart() {
    const scr = $('#screenStart');
    const save = PG.Game.savedInfo();
    const total = setup.humans + setup.bots;
    const roman = t('roundRoman');
    scr.innerHTML =
      '<div class="start">' +
      '<section class="hero">' +
      '<div class="hero-copy">' +
      '<p class="eyebrow">★ ' + (PG.I18N.lang === 'de' ? 'Präsidentschaftswahl 2028' : 'Presidential Election 2028') + ' ★</p>' +
      '<h1 class="hero-title">' + esc(t('appName')) + '</h1>' +
      '<p class="hero-tag">' + esc(t('tagline')) + '</p>' +
      '<h2 class="rounds-title">' + esc(t('roundsTitle')) + '</h2>' +
      '<ol class="round-steps">' +
      [1, 2, 3].map(function (n) {
        const b = PG.BOARDS[n - 1];
        return '<li><span class="rs-num">' + roman[n - 1] + '</span><div><b>' + esc(tx(b.title)) + '</b><span>' + esc(t('r' + n + 'Fact')) + '</span></div></li>';
      }).join('') +
      '</ol></div>' +
      '<div class="hero-art">' + whiteHouseSVG() + '</div>' +
      '</section>' +
      '<section class="setup" aria-labelledby="setupTitle">' +
      (save ? '<div class="resume"><button type="button" class="btn btn-gold btn-block" id="btnResume">' + esc(t('continueGame')) + '</button>' +
        '<small>' + esc(t('savedInfo', { turn: save.turn, n: save.players })) + '</small><span class="or">' + esc(t('or')) + '</span></div>' : '') +
      '<h2 id="setupTitle" class="setup-title">' + esc(t('setupTitle')) + '</h2>' +
      '<div class="steppers">' +
      stepperHTML('stHumans', setup.humans, t('humans'), t('humansHint')) +
      stepperHTML('stBots', setup.bots, t('bots'), t('botsHint')) +
      '</div>' +
      '<p class="seats"><span class="seats-bar"><span style="width:' + (total / MAX_PLAYERS * 100).toFixed(1) + '%"></span></span>' + esc(t('seats', { n: total })) + '</p>' +
      '<h3 class="setup-sub">' + esc(t('playersHeading')) + '</h3>' +
      '<ol class="setup-players" id="setupPlayers">' + playerRowsHTML() + '</ol>' +
      '<details class="setup-more" id="setupMore"' + (loadOpenState() ? ' open' : '') + '><summary>' + esc(t('rulesExtras')) + '</summary>' +
      '<div class="settings-form" id="setupSettings">' + settingsFormHTML(setup.settings, 'su-') + '</div></details>' +
      '<button type="button" class="btn btn-red btn-block btn-lg" id="btnStart">' + esc(t('startGame')) + '</button>' +
      '</section>' +
      '</div>';

    if (save) $('#btnResume').addEventListener('click', function () { PG.Audio.unlock(); PG.Game.resume(); });
    $$('.stepper-btn', scr).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const d = +btn.dataset.step;
        if (btn.dataset.for === 'stHumans') {
          setup.humans = PG.clamp(setup.humans + d, 1, MAX_PLAYERS);
          if (setup.humans + setup.bots > MAX_PLAYERS) setup.bots = MAX_PLAYERS - setup.humans;
        } else {
          setup.bots = PG.clamp(setup.bots + d, 0, MAX_PLAYERS - setup.humans);
        }
        saveSetup();
        PG.Audio.click();
        renderStart();
        const again = $('[data-for="' + btn.dataset.for + '"][data-step="' + d + '"]');
        if (again) again.focus();
      });
    });
    bindSetupPlayers();
    bindSettingsForm($('#setupSettings'), setup.settings, 'su-', saveSetup);
    $('#setupMore').addEventListener('toggle', function () {
      try { localStorage.setItem('pg-more', $('#setupMore').open ? '1' : '0'); } catch (e) { /* egal */ }
    });
    $('#btnStart').addEventListener('click', startNewGame);
  }

  function loadOpenState() {
    try { return localStorage.getItem('pg-more') !== '0'; } catch (e) { return true; }
  }

  function bindSetupPlayers() {
    const root = $('#setupPlayers');
    $$('[data-name-slot]', root).forEach(function (inp) {
      inp.addEventListener('input', function () {
        const i = +inp.dataset.nameSlot;
        setup.players[i].name = inp.value.slice(0, 18);
        const sw = $('[data-color-slot="' + i + '"]', root);
        if (sw) sw.textContent = PG.initial(inp.value || defaultName(i));
        saveSetup();
      });
    });
    $$('[data-home-slot]', root).forEach(function (sel) {
      sel.addEventListener('change', function () { setup.players[+sel.dataset.homeSlot].home = sel.value; saveSetup(); });
    });
    $$('[data-color-slot]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        const i = +btn.dataset.colorSlot;
        const taken = {};
        for (let k = 0; k < setup.humans; k++) if (k !== i) taken[setup.players[k].color] = true;
        let idx = PG.COLORS.indexOf(setup.players[i].color);
        for (let n = 0; n < PG.COLORS.length; n++) {
          idx = (idx + 1) % PG.COLORS.length;
          if (!taken[PG.COLORS[idx]]) break;
        }
        setup.players[i].color = PG.COLORS[idx];
        saveSetup();
        PG.Audio.click();
        $('#setupPlayers').innerHTML = playerRowsHTML();
        bindSetupPlayers();
        const again = $('[data-color-slot="' + i + '"]');
        if (again) again.focus();
      });
    });
  }

  function startNewGame() {
    PG.Audio.unlock();
    /* Farbkonflikte zwischen Menschen auflösen */
    const seen = {};
    for (let i = 0; i < setup.humans; i++) {
      if (seen[setup.players[i].color]) {
        setup.players[i].color = PG.COLORS.find(function (c) { return !seen[c]; }) || setup.players[i].color;
      }
      seen[setup.players[i].color] = true;
    }
    saveSetup();
    const players = plannedPlayers().map(function (p) {
      return { name: p.name.trim() || defaultName(p.slot), color: p.color, isBot: p.isBot, home: p.home || randomHome() };
    });
    PG.Game.newGame({ players: players, settings: Object.assign({}, setup.settings) });
  }

  /* -----------------------------------------------------------------------
     SPIELANSICHT
     ----------------------------------------------------------------------- */
  function showScreen(name) {
    $('#screenStart').hidden = name !== 'start';
    $('#screenGame').hidden = name !== 'game';
    $('#ticker').hidden = name !== 'game';
    document.body.classList.toggle('in-game', name === 'game');
    renderTopbar();
    if (name === 'start') { renderStart(); window.scrollTo(0, 0); }
  }

  function renderRoundChrome() {
    const st = PG.G.st; if (!st) return;
    const view = PG.Board.view;
    const roman = t('roundRoman');
    const counts = [0, 0, 0];
    st.players.forEach(function (p) { counts[p.round - 1]++; });
    $('#roundTabs').innerHTML = [1, 2, 3].map(function (n) {
      const b = PG.BOARDS[n - 1];
      return '<button type="button" role="tab" class="rtab' + (n === view ? ' is-on' : '') + '" data-round="' + n + '" aria-selected="' + (n === view) + '">' +
        '<span class="rtab-num">' + roman[n - 1] + '</span>' +
        '<span class="rtab-title">' + esc(tx(b.title)) + '</span>' +
        '<span class="rtab-count" title="' + esc(t('playersInRound', { n: counts[n - 1] })) + '">' + counts[n - 1] + '</span>' +
        '</button>';
    }).join('');
    const b = PG.BOARDS[view - 1];
    $('#roundHead').innerHTML =
      '<p class="rh-eyebrow">' + esc(t('round')) + ' ' + roman[view - 1] + ' · ' + esc(tx(b.title)) + '</p>' +
      '<h2 class="rh-question">' + esc(tx(b.question)) + '</h2>' +
      '<p class="rh-intro">' + esc(tx(b.intro)) + '</p>';
  }

  function turnPanelSkeleton() {
    $('#turnPanel').innerHTML =
      '<div class="turn-head">' +
      '<span class="turn-token" id="turnToken"></span>' +
      '<div class="turn-who"><span class="turn-label">' + esc(t('nowPlaying')) + '</span><strong class="turn-name" id="turnName"></strong></div>' +
      '<span class="turn-where" id="turnWhere"></span>' +
      '</div>' +
      '<div class="dice-row">' + dieHTML().replace('class="die ', 'id="dieA" class="die ') + dieHTML('die--b').replace('class="die ', 'id="dieB" hidden class="die ') + '</div>' +
      '<p class="turn-msg" id="turnMsg" aria-live="polite"></p>' +
      '<div class="turn-actions">' +
      '<button type="button" class="btn btn-gold btn-lg" id="btnRoll"></button>' +
      '<button type="button" class="btn btn-outline" id="btnAdvisor"></button>' +
      '</div>';
    $('#btnRoll').addEventListener('click', function () { takeAction(false); });
    $('#btnAdvisor').addEventListener('click', function () { takeAction(true); });
  }

  let pendingAction = null;
  let turnMode = 'busy';

  function takeAction(advisor) {
    if (!pendingAction) return;
    const p = PG.current();
    if (advisor && (!PG.G.st.settings.resources || p.money < ADVISOR_COST)) return;
    const a = pendingAction; pendingAction = null;
    turnMode = 'busy';
    PG.Audio.unlock();
    renderTurn();
    a.resolve({ advisor: advisor });
  }

  function waitHuman() {
    turnMode = 'human';
    renderTurn();
    return new Promise(function (resolve, reject) {
      pendingAction = { resolve: resolve, reject: reject };
      const btn = $('#btnRoll');
      if (btn && !openModals.length) btn.focus({ preventScroll: true });
    });
  }

  function setTurnMode(mode) { turnMode = mode; renderTurn(); }

  function renderTurn() {
    const st = PG.G.st; if (!st) return;
    const p = PG.current(); if (!p) return;
    if (!$('#turnName')) turnPanelSkeleton();
    $('#turnToken').style.setProperty('--c', p.color);
    $('#turnToken').textContent = PG.initial(p.name);
    $('#turnName').innerHTML = esc(p.name) + (p.isBot ? ' <span class="tag tag--ai">' + ICON.bot + t('ai') + '</span>' : '');
    $('#turnWhere').textContent = t('round') + ' ' + t('roundRoman')[p.round - 1] + ' · ' + t('posShort', { f: p.pos });
    const last = PG.lastIndex(p.round);
    let msg;
    if (p.skip > 0) msg = t('skipHint', { name: p.name });
    else if (turnMode === 'bot') msg = t('botThinking', { name: p.name });
    else if (p.round === 1 && p.pos === PG.GATE && !p.qualified) msg = t('gateHint');
    else if (last - p.pos <= 6) msg = t('exactHint', { n: last - p.pos });
    else msg = t('rollPrompt', { name: p.name });
    if (turnMode === 'busy' && !p.isBot) msg = '';
    $('#turnMsg').textContent = msg;
    const btnRoll = $('#btnRoll'), btnAdv = $('#btnAdvisor');
    btnRoll.textContent = t('roll');
    btnRoll.disabled = turnMode !== 'human';
    btnAdv.hidden = !st.settings.resources;
    btnAdv.textContent = t('advisor', { c: PG.fmt.money(ADVISOR_COST) });
    btnAdv.title = t('advisorHint');
    btnAdv.disabled = turnMode !== 'human' || p.money < ADVISOR_COST;
    $('#turnPanel').classList.toggle('is-human', turnMode === 'human');
    $('#turnPanel').style.setProperty('--c', p.color);
  }

  function renderPlayers() {
    const st = PG.G.st; if (!st) return;
    const cur = PG.current();
    const res = st.settings.resources;
    const roman = t('roundRoman');
    const showEV = st.settings.finale !== 'race';
    $('#playersTitle').textContent = t('playersTitle');
    $('#playersList').innerHTML = st.players.map(function (p) {
      const ev = PG.claimedEV(p.id);
      return '<li class="pl' + (cur && p.id === cur.id ? ' is-current' : '') + '">' +
        '<button type="button" class="pl-token" data-round="' + p.round + '" style="--c:' + p.color + '" title="' + esc(t('roundN', { n: p.round })) + '">' + esc(PG.initial(p.name)) + '</button>' +
        '<div class="pl-main"><span class="pl-name">' + esc(p.name) + (p.isBot ? ' <span class="pl-bot" title="' + esc(t('ai')) + '">' + ICON.bot + '</span>' : '') + '</span>' +
        '<span class="pl-meta"><b>' + roman[p.round - 1] + '</b> · ' + esc(t('posShort', { f: p.pos })) +
        (p.skip > 0 ? ' · <em>' + esc(t('skipping')) + '</em>' : '') + '</span></div>' +
        '<div class="pl-stats">' +
        (res ? '<span title="' + esc(t('money')) + '">' + esc(PG.fmt.money(p.money)) + '</span><span title="' + esc(t('polls')) + '">' + esc(PG.fmt.polls(p.polls)) + '</span>' : '') +
        (showEV && ev ? '<span class="pl-ev" title="' + esc(t('ev')) + '">' + ev + ' ' + esc(t('evShort')) + '</span>' : '') +
        '</div></li>';
    }).join('');
  }

  function logText(e) {
    const p = {};
    Object.keys(e.p || {}).forEach(function (k) {
      const v = e.p[k];
      p[k] = (v && typeof v === 'object' && (v.de || v.en)) ? tx(v) : v;
    });
    return t(e.k, p);
  }

  function renderLog() {
    const st = PG.G.st; if (!st) return;
    $('#logTitle').textContent = t('logTitle');
    const items = st.log.slice(-40).reverse();
    $('#logList').innerHTML = items.map(function (e) {
      return '<li' + (e.c ? ' style="--c:' + e.c + '"' : '') + '>' + esc(logText(e)) + '</li>';
    }).join('');
    const tk = st.log.slice(-6).reverse().map(logText);
    $('#ticker').innerHTML = '<span class="ticker-label">' + esc(t('live')) + '</span>' +
      '<div class="ticker-track"><div class="ticker-move">' +
      '<span>' + tk.map(esc).join(' <b>+++</b> ') + '</span>' +
      '<span aria-hidden="true">' + tk.map(esc).join(' <b>+++</b> ') + '</span>' +
      '</div></div>';
  }

  function renderSide() { renderTurn(); renderPlayers(); renderLog(); }

  function renderGame() {
    renderTopbar();
    renderRoundChrome();
    PG.Board.render();
    turnPanelSkeleton();
    renderSide();
  }

  /* -----------------------------------------------------------------------
     FELD-INFO (Klick auf ein Feld)
     ----------------------------------------------------------------------- */
  function fieldInfo(round, idx) {
    const st = PG.G.st; if (!st) return;
    const f = PG.fieldAt(round, idx);
    const cur = PG.current();
    const home = cur ? tx(PG.STATES[cur.home].name) : '';
    let title, text, icon = f.icon, chips = [];
    if (f.type === 'state') {
      const s = PG.STATES[f.state];
      title = tx(s.name);
      icon = '<span class="card-code">' + s.code + '</span>';
      const owner = st.owners[f.state] !== undefined ? PG.player(st.owners[f.state]) : null;
      text = s.ev + ' ' + t('ev') + (owner ? ' · ' + owner.name : '');
    } else {
      title = tx(f.title);
      if (f.type === 'quiz') text = t('optQuizDesc');
      else if (f.type === 'news') text = t('optNewsDesc');
      else text = tx(f.text, { home: home });
      if (f.steps) chips.push({ label: PG.fmt.steps(f.steps), tone: f.steps > 0 ? 'good' : 'bad' });
      if (st.settings.resources && f.money) chips.push({ label: t('chipMoney', { v: PG.fmt.money(f.money, true) }), tone: f.money > 0 ? 'good' : 'bad' });
      if (st.settings.resources && f.polls) chips.push({ label: t('chipPolls', { v: PG.fmt.polls(f.polls, true) }), tone: f.polls > 0 ? 'good' : 'bad' });
    }
    modal({
      kind: PG.Board.category(f), eyebrow: t('roundN', { n: round }) + ' · ' + t('posShort', { f: idx }),
      icon: icon, title: title, text: text, chips: chips,
      buttons: [{ label: t('close'), cls: 'btn-outline' }], dismissable: true, layer: 'peek'
    }).catch(function () {});
  }

  /* -----------------------------------------------------------------------
     SPEZIELLE KARTEN
     ----------------------------------------------------------------------- */

  /** Quiz. Gibt true (richtig) / false (falsch) zurück. */
  function quiz(o) {
    const q = o.q;
    const order = PG.shuffle([0, 1, 2, 3]);
    const html =
      '<p class="quiz-for">' + esc(t('quizFor', { name: o.player.name })) + '</p>' +
      '<p class="quiz-q">' + esc(tx(q.q)) + '</p>' +
      '<div class="quiz-opts">' + order.map(function (ai, k) {
        return '<button type="button" class="quiz-opt" data-a="' + ai + '"' + (o.isBot ? ' disabled' : '') + '><span class="quiz-letter">' + 'ABCD'[k] + '</span><span>' + esc(tx(q.a[ai])) + '</span></button>';
      }).join('') + '</div>' +
      '<div class="quiz-result" hidden></div>';
    let result = false;
    return modal({
      kind: 'quiz', eyebrow: t('evQuiz'), icon: '❓', html: html, buttons: [], noFocus: o.isBot,
      onMount: function (card, close) {
        function reveal(choice) {
          result = choice === q.c;
          $$('.quiz-opt', card).forEach(function (b) {
            b.disabled = true;
            const a = +b.dataset.a;
            if (a === q.c) b.classList.add('is-correct');
            else if (a === choice) b.classList.add('is-wrong');
          });
          if (result) PG.Audio.good(); else PG.Audio.bad();
          const r = $('.quiz-result', card);
          r.hidden = false;
          r.className = 'quiz-result ' + (result ? 'is-good' : 'is-bad');
          r.innerHTML = '<b>' + esc(result ? t('quizCorrect') : t('quizWrong')) + '</b> ' +
            (result ? '' : esc(t('quizAnswer', { a: tx(q.a[q.c]) })) + ' ') + esc(tx(q.x)) +
            '<span class="quiz-reward">' + esc(o.rewardText(result)) + '</span>';
          const actions = $('.card-actions', card);
          if (o.isBot) {
            const bar = document.createElement('div');
            bar.className = 'card-timer';
            const ms = autoMs(2200);
            bar.innerHTML = '<span style="animation-duration:' + ms + 'ms"></span>';
            card.appendChild(bar);
            setTimeout(function () { close(result); }, ms);
            card.addEventListener('click', function () { close(result); });
          } else {
            actions.innerHTML = '<button type="button" class="btn btn-gold">' + esc(t('ok')) + '</button>';
            const btn = $('.btn', actions);
            btn.addEventListener('click', function () { close(result); });
            btn.focus({ preventScroll: true });
          }
        }
        if (o.isBot) {
          setTimeout(function () {
            if (!card.isConnected) return;
            let pick = q.c;
            if (!o.botCorrect) { const wrong = [0, 1, 2, 3].filter(function (x) { return x !== q.c; }); pick = wrong[PG.rnd(3)]; }
            const btn = $('.quiz-opt[data-a="' + pick + '"]', card);
            if (btn) btn.classList.add('is-picked');
            setTimeout(function () { if (card.isConnected) reveal(pick); }, autoMs(700));
          }, autoMs(1100));
        } else {
          $$('.quiz-opt', card).forEach(function (b) {
            b.addEventListener('click', function () { reveal(+b.dataset.a); });
          });
          setTimeout(function () { const f = $('.quiz-opt', card); if (f) f.focus({ preventScroll: true }); }, 30);
        }
      }
    }).then(function () { return result; });
  }

  /** TV-Duell / Würfelduell. Würfe werden vorher bestimmt, hier nur gezeigt. */
  function duel(o) {
    const side = function (pl, cls) {
      return '<div class="duel-side ' + cls + '"><span class="turn-token" style="--c:' + pl.color + '">' + esc(PG.initial(pl.name)) + '</span>' +
        '<b>' + esc(pl.name) + '</b>' + dieHTML('die--sm') + '</div>';
    };
    const html = '<p class="card-text">' + esc(o.text) + '</p>' +
      '<div class="duel">' + side(o.a, 'duel-a') + '<span class="duel-vs">VS</span>' + side(o.b, 'duel-b') + '</div>' +
      '<p class="duel-result" hidden></p>';
    return modal({
      kind: 'duel', eyebrow: o.eyebrow || t('evDuel'), icon: o.icon || '📺', title: o.title, html: html, buttons: [], noFocus: true,
      onMount: function (card, close) {
        const actions = $('.card-actions', card);
        function go() {
          actions.innerHTML = '';
          PG.Audio.dice();
          Promise.all([
            rollCube($('.duel-a .die', card), o.ra, 900),
            rollCube($('.duel-b .die', card), o.rb, 1000)
          ]).then(function () {
            const r = $('.duel-result', card);
            r.hidden = false;
            r.textContent = o.resultText;
            r.className = 'duel-result ' + (o.tone === 'good' ? 'is-good' : (o.tone === 'bad' ? 'is-bad' : ''));
            if (o.tone === 'good') PG.Audio.good(); else if (o.tone === 'bad') PG.Audio.bad();
            if (o.auto) {
              setTimeout(function () { close(); }, autoMs(1500));
            } else {
              actions.innerHTML = '<button type="button" class="btn btn-gold">' + esc(t('ok')) + '</button>';
              const b = $('.btn', actions);
              b.addEventListener('click', function () { close(); });
              b.focus({ preventScroll: true });
            }
          }).catch(function () {});
        }
        if (o.auto) setTimeout(function () { if (card.isConnected) go(); }, autoMs(700));
        else {
          actions.innerHTML = '<button type="button" class="btn btn-gold btn-lg">' + esc(t('duelRoll')) + '</button>';
          const b = $('.btn', actions);
          b.addEventListener('click', go);
          b.focus({ preventScroll: true });
        }
      }
    });
  }

  /** Berater: zwischen zwei Würfen wählen. Gibt den gewählten Wert zurück. */
  function chooseDie(o) {
    const opt = function (v, info, i) {
      return '<button type="button" class="pick" data-i="' + i + '">' + flatDieHTML(v) +
        '<span class="pick-val">' + v + '</span>' +
        '<span class="pick-to">' + (info.tooFar ? esc(t('advisorTooFar')) : esc(t('advisorTo')) + ' <b>' + esc(info.label) + '</b>') + '</span></button>';
    };
    const html = '<p class="card-text">' + esc(t('advisorPick')) + '</p><div class="picks">' + opt(o.a, o.infoA, 0) + opt(o.b, o.infoB, 1) + '</div>';
    return modal({
      kind: 'good', eyebrow: t('advisorTitle'), icon: '🧑‍💼', html: html, buttons: [], noFocus: true,
      onMount: function (card, close) {
        $$('.pick', card).forEach(function (b) {
          const i = +b.dataset.i;
          const target = i === 0 ? o.infoA.target : o.infoB.target;
          b.addEventListener('mouseenter', function () { PG.Board.highlight(target); });
          b.addEventListener('focus', function () { PG.Board.highlight(target); });
          b.addEventListener('mouseleave', function () { PG.Board.highlight(-1); });
          b.addEventListener('click', function () { PG.Board.highlight(-1); close(i === 0 ? o.a : o.b); });
        });
        setTimeout(function () { const f = $('.pick', card); if (f) f.focus({ preventScroll: true }); }, 30);
      }
    });
  }

  /* -----------------------------------------------------------------------
     MENÜS
     ----------------------------------------------------------------------- */
  function openRules() {
    modal({
      kind: 'info', eyebrow: t('appName'), title: t('rulesTitle'),
      html: '<div class="rules">' + t('rulesHtml') + '</div>',
      buttons: [{ label: t('close') }], dismissable: true, wide: true, layer: 'peek'
    }).catch(function () {});
  }

  function openSettings() {
    const st = PG.G.st; if (!st) return;
    modal({
      kind: 'info', eyebrow: t('appName'), title: t('settingsTitle'),
      html: '<p class="card-text">' + esc(t('settingsLive')) + '</p><div class="settings-form" id="liveSettings">' + settingsFormHTML(st.settings, 'lv-') + '</div>',
      buttons: [{ label: t('close') }], dismissable: true, wide: true, layer: 'peek',
      onMount: function (card) {
        bindSettingsForm($('#liveSettings', card), st.settings, 'lv-', function () {
          setup.settings = Object.assign({}, st.settings);
          saveSetup();
          PG.Game.save();
          PG.Board.render();
          renderSide();
        });
      }
    }).catch(function () {});
  }

  function openMenu() {
    modal({
      kind: 'info', eyebrow: t('appName'), title: t('menuTitle'), text: t('menuText'),
      buttons: [{ label: t('toMainMenu'), value: 'menu', cls: 'btn-red' }, { label: t('cancel'), value: null, cls: 'btn-outline' }],
      dismissable: true, layer: 'peek'
    }).then(function (v) { if (v === 'menu') PG.Game.toMenu(); }).catch(function () {});
  }

  /* -----------------------------------------------------------------------
     SIEGERBILDSCHIRM
     ----------------------------------------------------------------------- */
  function confetti(host) {
    if (PG.reducedMotion()) return;
    const c = document.createElement('canvas');
    c.className = 'confetti';
    host.appendChild(c);
    const ctx = c.getContext('2d');
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    function size() { c.width = host.clientWidth * dpr; c.height = host.clientHeight * dpr; }
    size();
    const colors = ['#C8102E', '#F4F1E8', '#1E3A8A', '#D8B25C', '#FFFFFF'];
    const parts = [];
    for (let i = 0; i < 180; i++) {
      parts.push({
        x: Math.random() * c.width, y: -Math.random() * c.height * 0.8,
        w: (6 + Math.random() * 8) * dpr, h: (3 + Math.random() * 5) * dpr,
        vy: (1.5 + Math.random() * 3) * dpr, vx: (Math.random() - 0.5) * 2 * dpr,
        r: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.2,
        col: colors[i % colors.length], star: i % 9 === 0
      });
    }
    const t0 = performance.now();
    function frame(now) {
      if (!c.isConnected) return;
      ctx.clearRect(0, 0, c.width, c.height);
      parts.forEach(function (p) {
        p.x += p.vx + Math.sin((now + p.y) / 400) * 0.6; p.y += p.vy; p.r += p.vr;
        if (p.y > c.height + 20 && now - t0 < 6000) { p.y = -20; p.x = Math.random() * c.width; }
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.col;
        if (p.star) { ctx.font = (14 * dpr) + 'px serif'; ctx.fillText('★', 0, 0); } else ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      });
      if (now - t0 < 9000) requestAnimationFrame(frame); else c.remove();
    }
    requestAnimationFrame(frame);
  }

  /** o: { winner (Spieler oder null), npc (bool), standings:[{p, line}] } → 'rematch' | 'new' */
  function victory(o) {
    return new Promise(function (resolve, reject) {
      const el = document.createElement('div');
      el.className = 'victory' + (o.npc ? ' is-defeat' : '');
      const w = o.winner;
      const seal = '<div class="seal" style="--c:' + (w ? w.color : 'var(--slate)') + '"><svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<defs><path id="sealArc" d="M100 100 m-74 0 a74 74 0 1 1 148 0 a74 74 0 1 1 -148 0"/></defs>' +
        '<circle cx="100" cy="100" r="96" class="seal-ring"/><circle cx="100" cy="100" r="62" class="seal-core"/>' +
        '<text class="seal-text"><textPath href="#sealArc" startOffset="0">' +
        (o.npc ? '★ ELECTION NIGHT ★ ELECTION NIGHT ★ ELECTION NIGHT ★' : '★ PRESIDENT OF THE UNITED STATES ★ 2029 ★') +
        '</textPath></text></svg>' +
        '<span class="seal-initial">' + esc(w ? PG.initial(w.name) : '★') + '</span></div>';
      const rows = o.standings.map(function (s, i) {
        return '<li class="' + (w && s.p.id === w.id ? 'is-winner' : '') + '"><span class="st-rank">' + (i + 1) + '</span>' +
          '<span class="turn-token" style="--c:' + s.p.color + '">' + esc(PG.initial(s.p.name)) + '</span>' +
          '<span class="st-name">' + esc(s.p.name) + (w && s.p.id === w.id ? ' <em class="tag tag--rec">' + esc(t('winnerTag')) + '</em>' : '') + '</span>' +
          '<span class="st-line">' + esc(s.line) + '</span></li>';
      }).join('');
      el.innerHTML = '<div class="victory-inner" role="dialog" aria-modal="true" aria-labelledby="vicTitle">' +
        '<p class="eyebrow">' + esc(o.npc ? t('defeatEyebrow') : t('victoryEyebrow')) + '</p>' +
        seal +
        '<h1 class="victory-title" id="vicTitle">' + esc(o.npc ? t('defeatTitle') : t('victoryTitle', { name: w.name })) + '</h1>' +
        '<p class="victory-oath">' + esc(o.npc ? t('defeatText') : t('victoryOath')) + '</p>' +
        '<h2 class="victory-sub">' + esc(t('standings')) + '</h2>' +
        '<ol class="standings">' + rows + '</ol>' +
        '<div class="victory-actions"><button type="button" class="btn btn-gold btn-lg" data-v="rematch">' + esc(t('rematch')) + '</button>' +
        '<button type="button" class="btn btn-outline btn-lg" data-v="new">' + esc(t('newGame')) + '</button></div>' +
        '</div>';
      document.body.appendChild(el);
      requestAnimationFrame(function () { el.classList.add('is-in'); });
      if (!o.npc) { PG.Audio.fanfare(); confetti(el); } else PG.Audio.bad();
      $$('.victory-actions .btn', el).forEach(function (b) {
        b.addEventListener('click', function () { el.remove(); resolve(b.dataset.v); });
      });
      const first = $('.victory-actions .btn', el);
      if (first) first.focus({ preventScroll: true });
      const sess = PG.G.session;
      const iv = setInterval(function () { if (sess !== PG.G.session) { clearInterval(iv); el.remove(); reject(PG.ABORT); } }, 500);
    });
  }

  /* -----------------------------------------------------------------------
     START
     ----------------------------------------------------------------------- */
  function init() {
    overlayRoot = $('#overlayRoot');
    PG.I18N.setLang(PG.I18N.lang);
    PG.Board.init($('#board'));

    $('#langSwitch').addEventListener('click', function (e) {
      const b = e.target.closest('[data-lang]'); if (!b) return;
      PG.I18N.setLang(b.dataset.lang);
      refreshLanguage();
    });
    $('#btnSound').addEventListener('click', function () {
      PG.Audio.set(!PG.Audio.enabled);
      if (PG.Audio.enabled) PG.Audio.click();
      renderTopbar();
    });
    $('#btnRules').addEventListener('click', openRules);
    $('#btnSettings').addEventListener('click', openSettings);
    $('#btnMenu').addEventListener('click', openMenu);
    $('#brandHome').addEventListener('click', function () {
      if (PG.G.st && !$('#screenGame').hidden) openMenu();
    });
    $('#roundTabs').addEventListener('click', function (e) {
      const b = e.target.closest('[data-round]'); if (!b) return;
      PG.Board.setView(+b.dataset.round);
    });
    $('#playersList').addEventListener('click', function (e) {
      const b = e.target.closest('[data-round]'); if (!b) return;
      PG.Board.setView(+b.dataset.round);
    });
    document.addEventListener('keydown', function (e) {
      if (!pendingAction || openModals.length) return;
      if (e.target && /INPUT|SELECT|TEXTAREA|BUTTON/.test(e.target.tagName)) return;
      if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); takeAction(false); }
    });
  }

  function refreshLanguage() {
    renderTopbar();
    if (!$('#screenStart').hidden) renderStart();
    if (PG.G.st && !$('#screenGame').hidden) {
      renderRoundChrome();
      PG.Board.render();
      const keepMode = turnMode;
      turnPanelSkeleton();
      turnMode = keepMode;
      renderSide();
    }
  }

  PG.UI = {
    init: init,
    ICON: ICON,
    ADVISOR_COST: ADVISOR_COST,
    modal: modal,
    event: event,
    toast: toast,
    quiz: quiz,
    duel: duel,
    chooseDie: chooseDie,
    victory: victory,
    fieldInfo: fieldInfo,
    rollDice: rollDice,
    waitHuman: waitHuman,
    setTurnMode: setTurnMode,
    abortAll: abortAll,
    showScreen: showScreen,
    renderGame: renderGame,
    renderSide: renderSide,
    renderPlayers: renderPlayers,
    renderLog: renderLog,
    renderTurn: renderTurn,
    renderRoundChrome: renderRoundChrome,
    renderTopbar: renderTopbar,
    autoMs: autoMs,
    chipsHTML: chipsHTML,
    dieHTML: dieHTML,
    get setup() { return setup; },
    get busy() { return openModals.length > 0; }
  };
})(window.PG);
