/* =========================================================================
   WAHLABEND – Auszählung der 538 Wahlmänner auf der US-Kachelkarte
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  const t = PG.t, tx = PG.tx, esc = PG.esc;
  const $ = function (sel, root) { return (root || document).querySelector(sel); };

  const NPC_COLOR = '#5B6475';

  function npc() {
    return { id: 'npc', name: t('npcLong'), color: NPC_COLOR, polls: 46, money: 0, home: null, isNpc: true };
  }

  /** Wirksame Umfragewerte am Wahlabend */
  function effPolls(c, withArrival) {
    const st = PG.G.st;
    if (c.isNpc) return c.polls;
    let v = st.settings.resources ? c.polls + Math.min(10, Math.floor(c.money / 5)) : 50;
    if (withArrival && st.firstArrival === c.id) v += 5;
    return v;
  }

  function closeMinutes(hhmm) {
    const p = hhmm.split(':');
    let m = parseInt(p[0], 10) * 60 + parseInt(p[1], 10);
    if (m < 12 * 60) m += 24 * 60; /* nach Mitternacht */
    return m;
  }

  /** Reihenfolge, in der die Staaten ausgezählt werden (nach Schließung der Wahllokale) */
  function revealSlots() {
    const groups = {};
    PG.STATE_CODES.forEach(function (c) { (groups[PG.STATES[c].close] = groups[PG.STATES[c].close] || []).push(c); });
    return Object.keys(groups).sort(function (a, b) { return closeMinutes(a) - closeMinutes(b); })
      .map(function (time) { return { time: time, codes: PG.shuffle(groups[time]) }; });
  }

  /**
   * Gemeinsamer Wahlabend: Alle Kandidaten treten an.
   * Eroberte Staaten sind sicher, alle anderen entscheiden Umfragewerte (+ Heimatbonus + Zufall).
   */
  function simulate(cands) {
    const st = PG.G.st;
    const ids = cands.map(function (c) { return c.id; });
    const winners = {}, campaigned = {};
    const ev = {}, states = {};
    cands.forEach(function (c) { ev[c.id] = 0; states[c.id] = 0; });
    PG.STATE_CODES.forEach(function (code) {
      const owner = st.owners[code];
      let w;
      if (owner !== undefined && ids.indexOf(owner) >= 0) {
        w = owner; campaigned[code] = true;
      } else {
        let best = -1e9;
        cands.forEach(function (c) {
          const score = effPolls(c, true) + (c.home === code ? 12 : 0) + (Math.random() * 44 - 22);
          if (score > best) { best = score; w = c.id; }
        });
      }
      winners[code] = w;
      ev[w] += PG.STATES[code].ev;
      if (code !== 'DC') states[w] += 1;
    });
    let winner = null, contingent = false;
    const byEv = cands.slice().sort(function (a, b) { return ev[b.id] - ev[a.id]; });
    if (ev[byEv[0].id] >= PG.WIN_EV) {
      winner = byEv[0].id;
    } else {
      contingent = true;
      const byStates = cands.slice().sort(function (a, b) {
        return (states[b.id] - states[a.id]) || (ev[b.id] - ev[a.id]) || (effPolls(b, true) - effPolls(a, true));
      });
      winner = byStates[0].id;
    }
    return { winners: winners, campaigned: campaigned, ev: ev, states: states, winner: winner, contingent: contingent };
  }

  /** 270-Hürde: Hochrechnung für einen einzelnen Spieler */
  function projection(p) {
    const st = PG.G.st;
    const claimed = [], othersOwned = [];
    PG.STATE_CODES.forEach(function (code) {
      const o = st.owners[code];
      if (o === p.id) claimed.push(code);
      else if (o !== undefined) othersOwned.push(code);
    });
    /* Alle Staaten, die niemand im Wahlkampf erobert hat, werden über die Umfragewerte verteilt:
       25 % Umfragen = nichts davon, 75 % = alles. */
    const free = PG.STATE_CODES.filter(function (c) { return st.owners[c] === undefined; });
    const pool = free.reduce(function (s, c) { return s + PG.STATES[c].ev; }, 0);
    const polls = PG.clamp(effPolls(p, false), 0, 99);
    const quota = Math.round(PG.clamp((polls - 25) / 50, 0, 1) * pool);
    let list = PG.shuffle(free);
    if (list.indexOf(p.home) >= 0) list = [p.home].concat(list.filter(function (c) { return c !== p.home; }));
    let acc = 0;
    const extra = [];
    list.forEach(function (c) {
      if (acc + PG.STATES[c].ev <= quota) { extra.push(c); acc += PG.STATES[c].ev; }
    });
    const claimedEV = claimed.reduce(function (s, c) { return s + PG.STATES[c].ev; }, 0);
    return { claimed: claimed, othersOwned: othersOwned, extra: extra, claimedEV: claimedEV, extraEV: acc, total: claimedEV + acc, polls: polls, ok: claimedEV + acc >= PG.WIN_EV };
  }

  /* -----------------------------------------------------------------------
     ANZEIGE
     ----------------------------------------------------------------------- */
  function mapHTML() {
    return PG.STATE_CODES.map(function (code) {
      const s = PG.STATES[code];
      return '<div class="ms" data-code="' + code + '" style="grid-column:' + (s.col + 1) + ';grid-row:' + (s.row + 1) + '" title="' + esc(tx(s.name)) + '">' +
        '<b>' + code + '</b><small>' + s.ev + '</small></div>';
    }).join('');
  }

  function tallyHTML(cands) {
    return cands.map(function (c) {
      return '<div class="tl" data-cid="' + c.id + '" style="--c:' + c.color + '">' +
        '<span class="tl-swatch">' + esc(PG.initial(c.name)) + '</span>' +
        '<span class="tl-name">' + esc(c.name) + '</span>' +
        '<span class="tl-num">0</span>' +
        '<div class="tl-bar"><span class="tl-fill"></span><i class="tl-270" title="270"></i></div>' +
        '</div>';
    }).join('');
  }

  function shell(title, eyebrow, cands) {
    const el = document.createElement('div');
    el.className = 'night';
    el.innerHTML =
      '<div class="night-inner" role="dialog" aria-modal="true" aria-labelledby="nightTitle">' +
      '<header class="night-head">' +
      '<div><p class="eyebrow">' + esc(eyebrow) + '</p><h2 class="night-title" id="nightTitle">' + esc(title) + '</h2></div>' +
      '<div class="night-clock" id="nightClock"></div>' +
      '</header>' +
      '<div class="night-body">' +
      '<div class="usmap" id="usMap">' + mapHTML() + '</div>' +
      '<div class="tally-wrap"><div class="tally-head"><span>' + esc(t('ev')) + '</span><span>270 / 538</span></div><div class="tally" id="tally">' + tallyHTML(cands) + '</div></div>' +
      '</div>' +
      '<p class="night-caption" id="nightCaption" aria-live="polite"></p>' +
      '<p class="night-hint">' + esc(t('campaignedHint')) + '</p>' +
      '<footer class="night-actions">' +
      '<button type="button" class="btn btn-outline" id="nightSkip">' + esc(t('skip')) + '</button>' +
      '<button type="button" class="btn btn-gold btn-lg" id="nightDone" hidden></button>' +
      '</footer></div>';
    document.body.appendChild(el);
    requestAnimationFrame(function () { el.classList.add('is-in'); });
    return el;
  }

  function setBar(el, cid, value, max) {
    const row = $('.tl[data-cid="' + cid + '"]', el);
    if (!row) return;
    $('.tl-num', row).textContent = value;
    $('.tl-fill', row).style.width = (Math.min(1, value / max) * 100).toFixed(1) + '%';
  }

  function paint(el, code, color, campaigned) {
    const tile = $('.ms[data-code="' + code + '"]', el);
    if (!tile) return;
    tile.style.setProperty('--c', color);
    tile.classList.add('is-called');
    if (campaigned) tile.classList.add('is-campaigned');
  }

  function finish(el, label) {
    return new Promise(function (resolve) {
      $('#nightSkip', el).hidden = true;
      const done = $('#nightDone', el);
      done.textContent = label;
      done.hidden = false;
      done.focus({ preventScroll: true });
      done.addEventListener('click', function () {
        el.classList.remove('is-in');
        setTimeout(function () { el.remove(); }, 200);
        resolve();
      });
    });
  }

  /** Animierter Wahlabend. Gibt ein Promise zurück, das nach „Zum Ergebnis“ erfüllt wird. */
  async function showNight(result, cands) {
    const el = shell(t('nightTitle'), t('nightEyebrow'), cands);
    const cap = $('#nightCaption', el);
    const clock = $('#nightClock', el);
    const byId = {};
    cands.forEach(function (c) { byId[c.id] = c; });
    let skip = false;
    $('#nightSkip', el).addEventListener('click', function () { skip = true; });
    const wait = function (ms) { return skip ? Promise.resolve() : PG.sleep(PG.reducedMotion() ? ms / 3 : ms); };

    try {
      cap.textContent = t('nightIntro');
      clock.textContent = PG.fmt.clock('18:00');
      await wait(1400);
      const totals = {};
      cands.forEach(function (c) { totals[c.id] = 0; });
      let crossed = false;
      const slots = revealSlots();
      for (let s = 0; s < slots.length; s++) {
        clock.textContent = PG.fmt.clock(slots[s].time);
        for (let i = 0; i < slots[s].codes.length; i++) {
          const code = slots[s].codes[i];
          const st = PG.STATES[code];
          const w = byId[result.winners[code]];
          const big = st.ev >= 15 || result.campaigned[code];
          await wait(big ? 650 : 260);
          paint(el, code, w.color, result.campaigned[code]);
          totals[w.id] += st.ev;
          setBar(el, w.id, totals[w.id], PG.TOTAL_EV);
          if (!skip) PG.Audio.pop();
          if (big) cap.textContent = t('projection', { name: w.name, state: tx(st.name), ev: st.ev });
          if (!crossed && totals[w.id] >= PG.WIN_EV) {
            crossed = true;
            cap.textContent = t('crosses', { name: w.name });
            $('.tl[data-cid="' + w.id + '"]', el).classList.add('is-leader');
            if (!skip) PG.Audio.good();
            await wait(1300);
          }
        }
        await wait(380);
      }
      const winner = byId[result.winner];
      if (result.contingent) {
        cap.innerHTML = '<b>' + esc(t('houseTitle')) + '</b> ' + esc(t('houseText'));
        $('.tally-head span', el).textContent = t('houseCol');
        $('.tally-head span:last-child', el).textContent = '26 / 50';
        cands.forEach(function (c) { setBar(el, c.id, result.states[c.id], 50); });
        el.querySelectorAll('.tl-270').forEach(function (i) { i.style.left = '52%'; });
        await PG.sleep(skip ? 600 : 2600);
      }
      el.querySelectorAll('.tl').forEach(function (r) { r.classList.toggle('is-leader', String(r.dataset.cid) === String(winner.id)); r.classList.toggle('is-out', String(r.dataset.cid) !== String(winner.id)); });
      cap.innerHTML = '<b class="cap-win">' + esc(winner.isNpc ? t('npcWinnerLine') : t('winnerLine', { name: winner.name })) + '</b>';
      if (!winner.isNpc) PG.Audio.fanfare(); else PG.Audio.bad();
      await finish(el, winner.isNpc ? t('toResult') : t('toInauguration'));
    } catch (e) {
      el.remove();
      throw e;
    }
  }

  /** 270-Hürde: Hochrechnung für einen Spieler anzeigen */
  async function showProjection(p, proj) {
    const st = PG.G.st;
    const el = shell(t('hurdleTitle', { name: p.name }), t('nightEyebrow'), [p]);
    const cap = $('#nightCaption', el);
    const clock = $('#nightClock', el);
    clock.textContent = PG.fmt.clock('23:00');
    let skip = false;
    $('#nightSkip', el).addEventListener('click', function () { skip = true; });
    const wait = function (ms) { return skip ? Promise.resolve() : PG.sleep(PG.reducedMotion() ? ms / 3 : ms); };
    try {
      let total = 0;
      cap.textContent = t('hurdleClaimed', { ev: proj.claimedEV });
      await wait(700);
      for (let i = 0; i < proj.claimed.length; i++) {
        const code = proj.claimed[i];
        await wait(320);
        paint(el, code, p.color, true);
        total += PG.STATES[code].ev;
        setBar(el, p.id, total, PG.TOTAL_EV);
        if (!skip) PG.Audio.pop();
      }
      proj.othersOwned.forEach(function (code) {
        const o = PG.player(st.owners[code]);
        if (o) paint(el, code, o.color, true);
      });
      await wait(900);
      cap.textContent = t('hurdlePolls', { p: PG.fmt.polls(proj.polls), ev: proj.extraEV });
      for (let i = 0; i < proj.extra.length; i++) {
        await wait(170);
        paint(el, proj.extra[i], p.color, false);
        total += PG.STATES[proj.extra[i]].ev;
        setBar(el, p.id, total, PG.TOTAL_EV);
        if (!skip) PG.Audio.pop();
      }
      await wait(900);
      if (proj.ok) {
        $('.tl', el).classList.add('is-leader');
        cap.innerHTML = '<b class="cap-win">' + esc(t('hurdleOk', { ev: proj.total })) + '</b>';
        PG.Audio.fanfare();
        await finish(el, t('toInauguration'));
      } else {
        cap.innerHTML = '<b>' + esc(t('hurdleFail', { ev: proj.total })) + '</b>';
        PG.Audio.bad();
        await finish(el, t('hurdleBack'));
      }
    } catch (e) {
      el.remove();
      throw e;
    }
  }

  PG.Election = {
    npc: npc,
    simulate: simulate,
    projection: projection,
    showNight: showNight,
    showProjection: showProjection,
    effPolls: effPolls
  };
})(window.PG);
