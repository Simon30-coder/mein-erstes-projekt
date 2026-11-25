/* =========================================================================
   SPIELABLAUF – Züge, Wege, Feldwirkungen, Entscheidungen, Budget, KI
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  const t = PG.t, tx = PG.tx, esc = PG.esc;
  const SAVE_KEY = 'pg-save-v2';
  const START_MONEY = 10;
  const START_POLLS = 40;
  /** Preise im Wahlkampf-Budget (Mio. $) */
  const COSTS = { advisor: 5, tv: 6, smear: 8, office: 7 };
  let memorySave = null;

  function st() { return PG.G.st; }
  function UI() { return PG.UI; }
  function med(name) { return PG.medallion(name); }
  function codeIcon(code) { return '<span class="card-code">' + code + '</span>'; }
  function fieldsOf(round) { return PG.BOARDS[round - 1].fields; }

  /* -----------------------------------------------------------------------
     SPIELSTAND
     ----------------------------------------------------------------------- */
  function createState(cfg) {
    return {
      v: 2,
      settings: Object.assign({}, cfg.settings, { resources: true }),
      players: cfg.players.map(function (p, i) {
        return {
          id: i, name: p.name, color: p.color, isBot: !!p.isBot, home: p.home,
          round: 1, pos: 0, trail: [], money: START_MONEY, polls: START_POLLS, bonus: 0,
          skip: 0, qualified: false, rolls: 0, offices: [], buys: {}, advisor: false
        };
      }),
      current: 0,
      turn: 1,
      owners: {},
      log: [],
      quizDeck: PG.shuffle(PG.range(PG.QUIZ.length)),
      newsDeck: PG.shuffle(PG.range(PG.NEWS.length)),
      firstArrival: null,
      over: false,
      winner: null,
      config: { players: cfg.players }
    };
  }

  function log(k, p, color) {
    const s = st(); if (!s) return;
    s.log.push({ k: k, p: p || {}, c: color || null });
    if (s.log.length > 200) s.log.splice(0, s.log.length - 200);
    UI().renderLog();
  }

  function save() {
    const s = st();
    if (!s || s.over) return;
    try { memorySave = JSON.stringify(s); } catch (e) { return; }
    try { localStorage.setItem(SAVE_KEY, memorySave); } catch (e) { /* nur im Speicher */ }
  }

  function clearSave() {
    memorySave = null;
    try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* egal */ }
  }

  function readSave() {
    let raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) { /* egal */ }
    raw = raw || memorySave;
    if (!raw) return null;
    try {
      const s = JSON.parse(raw);
      if (!s || s.v !== 2 || !Array.isArray(s.players) || !s.players.length || s.over) return null;
      return s;
    } catch (e) { return null; }
  }

  function savedInfo() {
    const s = readSave();
    return s ? { turn: s.turn, players: s.players.length } : null;
  }

  /* -----------------------------------------------------------------------
     START / FORTSETZEN / MENÜ
     ----------------------------------------------------------------------- */
  function begin(state) {
    PG.G.session++;
    UI().abortAll();
    PG.G.st = state;
    UI().showScreen('game');
    PG.Board.setView(PG.current().round);
    UI().renderGame();
    window.scrollTo(0, 0);
    loop();
  }

  function newGame(cfg) {
    PG.G.st = createState(cfg);
    log('logStart');
    begin(PG.G.st);
  }

  function resume() {
    const s = readSave();
    if (!s) { UI().showScreen('start'); return; }
    s.settings = Object.assign({ finale: 'night', quiz: true, news: true, botSpeed: 'normal', followCam: true, autoCloseBots: false }, s.settings || {}, { resources: true });
    begin(s);
  }

  function toMenu() {
    PG.G.session++;
    UI().abortAll();
    PG.G.st = null;
    UI().showScreen('start');
  }

  /* -----------------------------------------------------------------------
     SPIELSCHLEIFE
     ----------------------------------------------------------------------- */
  async function loop() {
    const sess = PG.G.session;
    try {
      while (PG.G.session === sess && st() && !st().over) {
        save();
        const p = PG.current();
        if (st().settings.followCam && PG.Board.view !== p.round) PG.Board.setView(p.round);
        PG.Board.renderTokens();
        UI().renderSide();
        await playTurn(p);
        if (PG.G.session !== sess) return;
        if (st().over) break;
        st().current = (st().current + 1) % st().players.length;
        if (st().current === 0) st().turn++;
      }
    } catch (e) {
      if (e !== PG.ABORT) { console.error(e); }
    }
  }

  /** Karten schließen sich nur bei KI-Zügen selbst – und nur, wenn das in den Einstellungen an ist. */
  function autoFor(p) { return !!(p && p.isBot && st().settings.autoCloseBots); }
  function card(p, o) { return UI().event(Object.assign({ auto: autoFor(p) }, o)); }

  async function playTurn(p) {
    const s = st();
    p.buys = {};
    p.advisor = false;
    if (p.skip > 0) {
      p.skip--;
      UI().setTurnMode(p.isBot ? 'bot' : 'busy');
      log('logSkip', { name: p.name }, p.color);
      await card(p, { kind: 'bad', eyebrow: t('evBad'), icon: med('gavel'), title: t('skipTitle'), text: t('skipText', { name: p.name }) });
      return;
    }
    let again = true, guard = 0;
    while (again && guard++ < 6 && !s.over) {
      const ctx = { again: false };
      if (p.isBot) {
        UI().setTurnMode('bot');
        await PG.sleep(600 * PG.speed());
        botBudget(p);
      } else {
        await UI().waitHuman(p);
      }
      const dice = p.advisor ? [PG.d6(), PG.d6()] : [PG.d6()];
      p.advisor = false;
      UI().setTurnMode(p.isBot ? 'bot' : 'busy');
      await UI().rollDice(dice);
      p.rolls++;
      await resolveDice(p, dice, ctx);
      again = ctx.again && !s.over && p.skip === 0;
      UI().renderSide();
    }
  }

  /* -----------------------------------------------------------------------
     WEGE
     ----------------------------------------------------------------------- */
  /** Alle Felder, die man mit genau n Schritten erreicht (an Gabelungen mehrere). */
  function forwardOptions(p, n) {
    const fields = fieldsOf(p.round);
    const stopAtGate = p.round === 1 && !p.qualified && p.pos < PG.GATE;
    const out = [];
    (function walk(id, left, path) {
      if (left === 0) { out.push({ target: id, path: path, gateStop: false }); return; }
      if (stopAtGate && id === PG.GATE && path.length) { out.push({ target: id, path: path, gateStop: true }); return; }
      const f = fields[id];
      if (!f.next.length) return; /* über das Zielfeld hinaus */
      f.next.forEach(function (nid) { walk(nid, left - 1, path.concat([nid])); });
    })(p.pos, n, []);
    const seen = {};
    return out.filter(function (o) { if (seen[o.target]) return false; seen[o.target] = true; return true; });
  }

  /** Weg zurück (über die Felder, die man wirklich gegangen ist). */
  function backPath(p, n) {
    const fields = fieldsOf(p.round);
    const trail = p.trail.slice();
    let cur = p.pos;
    const ids = [];
    for (let k = 0; k < n; k++) {
      if (p.round === 1 && p.qualified && cur === PG.GATE) break;
      const prev = trail.length ? trail.pop() : fields[cur].prev[0];
      if (prev === undefined) break;
      ids.push(prev);
      cur = prev;
    }
    return ids;
  }

  function distToKey(p) {
    const fields = fieldsOf(p.round);
    const seen = {}; let frontier = [p.pos], d = 0;
    while (frontier.length && d < 100) {
      const next = [];
      for (let i = 0; i < frontier.length; i++) {
        const f = fields[frontier[i]];
        if (f.type === 'key') return d;
        f.next.forEach(function (n) { if (!seen[n]) { seen[n] = true; next.push(n); } });
      }
      frontier = next; d++;
    }
    return d;
  }

  function stepMs(p, fast) {
    if (fast) return Math.max(70, 130 * PG.speed());
    return p.isBot ? Math.max(90, 230 * PG.speed()) : 230;
  }

  async function humanPick(p, opts, showDie) {
    UI().setTurnMode(opts.length > 1 ? 'pickFork' : 'pick');
    const o = await PG.Board.pickTarget(p, opts, showDie);
    UI().setTurnMode('busy');
    return o;
  }

  async function resolveDice(p, dice, ctx) {
    log(dice.length > 1 ? 'logAdvisor' : 'logRoll', { name: p.name, r: dice[0], a: dice[0], b: dice[1] }, p.color);
    let values = dice.slice();

    if (p.round === 1 && p.pos === PG.GATE && !p.qualified) {
      const evens = values.filter(function (v) { return v % 2 === 0; });
      if (!evens.length) {
        log('logGateFail', { name: p.name }, p.color);
        PG.Audio.bad();
        await card(p, { kind: 'bad', eyebrow: t('evGate'), icon: med('house'), title: t('gateFailTitle'), text: t('gateFailText', { r: values.join(' / ') }) });
        return;
      }
      p.qualified = true;
      values = evens;
      log('logGateOk', { name: p.name }, p.color);
      PG.Audio.good();
      await card(p, { kind: 'gate', eyebrow: t('evGate'), icon: med('house'), title: t('gateOkTitle'), text: t('gateOkText', { r: evens.join(' / ') }) });
    }

    const opts = [];
    values.forEach(function (v) {
      forwardOptions(p, v).forEach(function (o) {
        if (!opts.some(function (x) { return x.target === o.target; })) opts.push(Object.assign({ die: v }, o));
      });
    });
    if (!opts.length) {
      log('logOver', { name: p.name }, p.color);
      await card(p, { kind: 'info', eyebrow: t('evInfo'), icon: med('signpost'), title: t('overTitle'), text: t('overText', { r: values.join(' / '), need: distToKey(p) }) });
      return;
    }
    const choice = p.isBot ? bestOption(p, opts) : await humanPick(p, opts, dice.length > 1);
    if (p.isBot && opts.length > 1) await PG.sleep(300 * PG.speed());
    await PG.Board.walkPath(p, choice.path, stepMs(p), 1);
    await landOn(p, false, ctx, choice.gateStop);
  }

  /** Wirkung „n Felder“ durch ein Ereignis */
  async function moveBy(p, n, ctx) {
    if (n > 0) {
      const opts = forwardOptions(p, n);
      if (!opts.length) {
        await card(p, { kind: 'info', eyebrow: t('evInfo'), icon: med('signpost'), title: t('overTitle'), text: t('overEffect') });
        return;
      }
      const o = opts.length === 1 ? opts[0] : (p.isBot ? bestOption(p, opts) : await humanPick(p, opts, false));
      await PG.Board.walkPath(p, o.path, stepMs(p, true), 1);
    } else {
      const ids = backPath(p, -n);
      if (!ids.length) return;
      await PG.Board.walkPath(p, ids, stepMs(p, true), -1);
    }
    await landOn(p, true, ctx, false);
  }

  /* -----------------------------------------------------------------------
     FELDWIRKUNGEN
     ----------------------------------------------------------------------- */
  function applyRes(p, money, polls) {
    if (money) p.money = Math.max(0, p.money + money);
    if (polls) p.polls = PG.clamp(p.polls + polls, 1, 99);
    UI().renderPlayers();
  }

  function fxChips(o) {
    const out = [];
    if (o.steps) out.push({ label: PG.fmt.steps(o.steps), tone: o.steps > 0 ? 'good' : 'bad' });
    if (o.money) out.push({ label: t('chipMoney', { v: PG.fmt.money(o.money, true) }), tone: o.money > 0 ? 'good' : 'bad' });
    if (o.polls) out.push({ label: t('chipPolls', { v: PG.fmt.polls(o.polls, true) }), tone: o.polls > 0 ? 'good' : 'bad' });
    if (o.skip) out.push({ label: t('chipSkip'), tone: 'bad' });
    return out;
  }

  function homeName(p) { return tx(PG.STATES[p.home].name); }

  async function landOn(p, via, ctx, gateStop) {
    const f = PG.fieldAt(p.round, p.pos);
    if (f.type !== 'start') log('logLand', { name: p.name, title: f.type === 'state' ? PG.STATES[f.state].name : f.title }, p.color);
    switch (f.type) {
      case 'key': return reachKey(p, f);
      case 'gate':
        if (!p.qualified) {
          await card(p, {
            kind: 'gate', eyebrow: t('evGate'), icon: med(f.icon), title: tx(f.title),
            text: (gateStop ? t('gateStop', { f: p.pos }) + ' ' : '') + t('gateArrive'), fact: f.fact
          });
        }
        return;
      case 'start': return;
      case 'state': return doState(p, f);
    }
    if (via) return; /* keine Ketten-Wirkungen */
    switch (f.type) {
      case 'steps': return doSteps(p, f, ctx);
      case 'plain': return doPlain(p, f);
      case 'fork': return doPlain(p, f);
      case 'money':
      case 'polls': return doResource(p, f);
      case 'news': return doNews(p, f, ctx);
      case 'again': return doAgain(p, f, ctx);
      case 'skip': return doSkip(p, f);
      case 'debate': return doDebate(p, f);
      case 'choice': return doChoice(p, f, ctx);
    }
  }

  async function doSteps(p, f, ctx) {
    const good = f.steps > 0;
    if (good) PG.Audio.good(); else PG.Audio.bad();
    await card(p, {
      kind: good ? 'good' : 'bad', eyebrow: t(good ? 'evGood' : 'evBad'), icon: med(f.icon),
      title: tx(f.title), text: tx(f.text, { home: homeName(p) }), chips: fxChips(f), fact: f.fact
    });
    applyRes(p, f.money, f.polls);
    await moveBy(p, f.steps, ctx);
  }

  async function doPlain(p, f) {
    const fork = f.type === 'fork';
    await card(p, { kind: fork ? 'fork' : 'plain', eyebrow: fork ? t('evFork') : t('evInfo'), icon: med(f.icon), title: tx(f.title), text: tx(f.text, { home: homeName(p) }), fact: f.fact });
  }

  async function doResource(p, f) {
    const positive = (f.money || 0) + (f.polls || 0) >= 0;
    if (positive) PG.Audio.good(); else PG.Audio.bad();
    await card(p, {
      kind: positive ? 'good' : 'bad', eyebrow: t(positive ? 'evGood' : 'evBad'), icon: med(f.icon),
      title: tx(f.title), text: tx(f.text, { home: homeName(p) }), chips: fxChips(f), fact: f.fact
    });
    applyRes(p, f.money, f.polls);
  }

  function drawFrom(deckKey, total) {
    const s = st();
    if (!s[deckKey].length) s[deckKey] = PG.shuffle(PG.range(total));
    return s[deckKey].shift();
  }

  function leaderOf() {
    return st().players.slice().sort(function (a, b) { return PG.progress(b) - PG.progress(a); })[0];
  }

  async function doNews(p, f, ctx) {
    const s = st();
    if (!s.settings.news) return;
    const c = PG.NEWS[drawFrom('newsDeck', PG.NEWS.length)];
    const chips = fxChips(c);
    if (c.allPolls) chips.push({ label: t('chipAllPolls', { v: PG.fmt.polls(c.allPolls, true) }), tone: 'bad' });
    if (c.leaderSteps) chips.push({ label: t('chipLeader'), tone: 'neutral' });
    PG.Audio.news();
    const special = f.title && tx(f.title) !== t('evNews');
    await card(p, {
      kind: 'news', eyebrow: special ? tx(f.title) : t('evNews'), icon: med(c.icon), title: tx(c.title), text: tx(c.text),
      chips: chips, fact: c.fact || (special ? f.fact : null)
    });
    log('logNews', { name: p.name, title: c.title }, p.color);
    applyRes(p, c.money, c.polls);
    if (c.allPolls) s.players.forEach(function (q) { q.polls = PG.clamp(q.polls + c.allPolls, 1, 99); });
    if (c.skip) p.skip += c.skip;
    UI().renderPlayers();
    if (c.leaderSteps) {
      const leader = leaderOf();
      const ids = backPath(leader, -c.leaderSteps);
      if (ids.length) await PG.Board.walkPath(leader, ids, stepMs(leader, true), -1);
      if (leader.id !== p.id && PG.Board.view !== p.round && s.settings.followCam) PG.Board.setView(p.round);
    }
    if (c.steps) await moveBy(p, c.steps, ctx);
  }

  async function doAgain(p, f, ctx) {
    PG.Audio.good();
    await card(p, { kind: 'good', eyebrow: t('evAgain'), icon: med(f.icon), title: tx(f.title), text: tx(f.text), chips: [{ label: t('chipAgain'), tone: 'good' }], fact: f.fact });
    ctx.again = true;
  }

  async function doSkip(p, f) {
    PG.Audio.bad();
    await card(p, { kind: 'bad', eyebrow: t('evBad'), icon: med(f.icon), title: tx(f.title), text: tx(f.text), chips: [{ label: t('chipSkip'), tone: 'bad' }], fact: f.fact });
    p.skip = Math.max(p.skip, 1);
  }

  /* ----- Entscheidungen ----- */
  function optionValue(p, c) {
    if (c.money < 0 && p.money < -c.money) return -999;
    return (c.money || 0) * 0.5 + (c.polls || 0) + (c.steps || 0) * 3 - (c.skip || 0) * 6;
  }

  async function doChoice(p, f, ctx) {
    let botIdx = -1;
    if (p.isBot) {
      const v0 = optionValue(p, f.choices[0]), v1 = optionValue(p, f.choices[1]);
      botIdx = Math.abs(v0 - v1) < 0.01 ? PG.rnd(2) : (v0 > v1 ? 0 : 1);
    }
    const idx = await UI().choice({
      player: p, icon: med(f.icon), title: tx(f.title), text: tx(f.text, { home: homeName(p) }), fact: f.fact,
      options: f.choices.map(function (c) {
        return { label: tx(c.label), chips: fxChips(c), disabled: c.money < 0 && p.money < -c.money };
      }),
      botIdx: botIdx, auto: autoFor(p)
    });
    const c = f.choices[idx];
    log('logChoice', { name: p.name, opt: c.label }, p.color);
    applyRes(p, c.money, c.polls);
    if (c.skip) p.skip = Math.max(p.skip, c.skip);
    if (c.steps) await moveBy(p, c.steps, ctx);
  }

  /* ----- TV-Debatte (Quiz-Duell) ----- */
  function debateResultText(a, b, aRight, bRight) {
    if (aRight && bRight) return t('debateBoth');
    if (!aRight && !bRight) return t('debateNone');
    return t('duelWinPolls', { name: aRight ? a.name : b.name, loser: aRight ? b.name : a.name });
  }

  async function doDebate(p, f) {
    const s = st();
    const others = s.players.filter(function (q) { return q.id !== p.id; });
    let pool = others.filter(function (q) { return q.round === p.round; });
    if (!pool.length) pool = others;
    const opp = pool.length ? pool[PG.rnd(pool.length)] : { id: 'npc', name: t('npcName'), color: '#5B6475', isNpc: true, isBot: true };
    const auto = autoFor(p) && !!(opp.isBot || opp.isNpc);
    let aRight, bRight;
    if (s.settings.quiz) {
      const q = PG.QUIZ[drawFrom('quizDeck', PG.QUIZ.length)];
      const res = await UI().debate({
        title: tx(f.title), text: tx(f.text), fact: f.fact, q: q, a: p, b: opp,
        aBotRight: Math.random() < 0.65, bBotRight: Math.random() < 0.6, auto: auto,
        resultText: debateResultText
      });
      aRight = res.a; bRight = res.b;
    } else {
      const ra = PG.d6(), rb = PG.d6();
      aRight = ra > rb; bRight = rb > ra;
      await UI().duel({
        title: tx(f.title), text: t('duelText', { a: p.name, b: opp.name }), a: p, b: opp, ra: ra, rb: rb,
        resultText: ra === rb ? t('duelTie') : debateResultText(p, opp, aRight, bRight),
        tone: aRight ? 'good' : (bRight ? 'bad' : 'neutral'), auto: auto
      });
    }
    log('logDebate', { a: p.name, b: opp.name, res: debateResultText(p, opp, aRight, bRight) }, p.color);
    const add = function (q, v) { if (!q.isNpc) q.polls = PG.clamp(q.polls + v, 1, 99); };
    if (aRight && bRight) { add(p, 2); add(opp, 2); }
    else if (aRight) { add(p, 6); add(opp, -3); }
    else if (bRight) { add(opp, 6); add(p, -3); }
    UI().renderPlayers();
  }

  /* ----- Bundesstaaten ----- */
  function stateBonus(p, code) {
    const parts = [];
    if (p.polls >= 55) parts.push(t('stateBonusPolls'));
    if (p.home === code) parts.push(t('stateBonusHome'));
    if (p.offices && p.offices.indexOf(code) >= 0) parts.push(t('stateBonusOffice'));
    return { value: parts.length, parts: parts };
  }

  async function doState(p, f) {
    const s = st();
    const code = f.state;
    const S = PG.STATES[code];
    const sName = tx(S.name);
    if (s.settings.finale === 'race') {
      await card(p, { kind: 'state', eyebrow: t('evState'), icon: codeIcon(code), title: sName, text: t('stateRace', { state: sName }) });
      return;
    }
    const ownerId = s.owners[code];
    if (ownerId === p.id) {
      applyRes(p, 0, 2);
      await card(p, { kind: 'state', eyebrow: t('evState'), icon: codeIcon(code), title: sName, text: t('stateOwn', { state: sName, name: p.name }), chips: fxChips({ polls: 2 }) });
      return;
    }
    const owner = ownerId !== undefined ? PG.player(ownerId) : null;
    const need = PG.stateNeed(code, !!owner);
    const bonus = stateBonus(p, code);
    const cost = PG.stateRetryCost(code);
    const res = await UI().stateChallenge({
      code: code,
      title: owner ? t('stateChOwned', { state: sName }) : t('stateChFree', { state: sName }),
      text: owner ? t('stateChOwnedText', { state: sName, owner: owner.name, need: need })
                  : t('stateChFreeText', { state: sName, ev: S.ev, need: need }),
      need: need, bonus: bonus.value, bonusParts: bonus.parts,
      isBot: p.isBot, auto: autoFor(p), cost: cost, canRetry: p.money >= cost, botRetry: p.money >= cost + 5,
      successText: t('stateWon', { name: p.name, state: sName, ev: S.ev }),
      failText: owner ? t('stateFailOwned', { state: sName, owner: owner.name }) : t('stateFailFree', { state: sName })
    });
    if (res.paid) p.money = Math.max(0, p.money - res.paid);
    if (res.success) {
      s.owners[code] = p.id;
      log('logState', { name: p.name, state: S.name, ev: S.ev }, p.color);
      PG.Board.render();
    } else {
      log('logStateFail', { name: p.name, state: S.name }, p.color);
    }
    UI().renderPlayers();
  }

  /* -----------------------------------------------------------------------
     WAHLKAMPF-BUDGET
     ----------------------------------------------------------------------- */
  function officeOptions(p) {
    const s = st();
    return PG.BOARD_STATES.filter(function (c) { return s.owners[c] !== p.id && p.offices.indexOf(c) < 0; });
  }

  function canBuy(p, kind) {
    if (!p || p.buys[kind]) return false;
    if (p.money < COSTS[kind]) return false;
    if (kind === 'office') return p.round === 3 && officeOptions(p).length > 0;
    if (kind === 'smear') return st().players.length > 1;
    return true;
  }

  function itemName(kind) { return t({ advisor: 'buyAdvisor', tv: 'buyTv', smear: 'buySmear', office: 'buyOffice' }[kind]); }

  function payFor(p, kind) {
    p.money -= COSTS[kind];
    p.buys[kind] = true;
    log('logBuy', { name: p.name, item: itemName(kind) }, p.color);
  }

  /** Wird von den Budget-Knöpfen aufgerufen (nur Menschen, vor dem Würfeln) */
  async function buy(kind) {
    const s = st();
    const p = PG.current();
    if (!p || p.isBot || !canBuy(p, kind)) return;
    try {
      if (kind === 'advisor') {
        payFor(p, kind); p.advisor = true;
        PG.Audio.click();
      } else if (kind === 'tv') {
        payFor(p, kind); p.polls = PG.clamp(p.polls + 4, 1, 99);
        PG.Audio.good();
      } else if (kind === 'smear') {
        const rivals = s.players.filter(function (q) { return q.id !== p.id; });
        const id = await UI().pickPlayer({ title: t('buySmear'), text: t('smearPick'), players: rivals });
        if (id === null || id === undefined || !canBuy(p, kind)) return;
        const q = PG.player(id);
        payFor(p, kind);
        q.polls = PG.clamp(q.polls - 5, 1, 99);
        p.polls = PG.clamp(p.polls - 1, 1, 99);
        log('logSmear', { name: p.name, target: q.name }, p.color);
        PG.Audio.bad();
      } else if (kind === 'office') {
        const code = await UI().pickState({ title: t('buyOffice'), text: t('officePick'), codes: officeOptions(p) });
        if (!code || !canBuy(p, kind)) return;
        payFor(p, kind);
        p.offices.push(code);
        PG.Audio.good();
      }
    } catch (e) {
      if (e !== PG.ABORT) console.error(e);
      return;
    }
    UI().renderSide();
  }

  function botBudget(p) {
    const s = st();
    const dist = distToKey(p);
    const atGate = p.round === 1 && p.pos === PG.GATE && !p.qualified;
    const wantsAdvisor = atGate ? p.money >= 8 : (dist <= 6 ? true : (p.money >= 18 && Math.random() < 0.3));
    const bought = [];
    if (wantsAdvisor && canBuy(p, 'advisor')) { payFor(p, 'advisor'); p.advisor = true; bought.push('advisor'); }
    if (p.money >= 22 && p.polls < 65 && Math.random() < 0.35 && canBuy(p, 'tv')) { payFor(p, 'tv'); p.polls = PG.clamp(p.polls + 4, 1, 99); bought.push('tv'); }
    if (p.round === 3 && p.money >= 20 && Math.random() < 0.25 && canBuy(p, 'office')) {
      const best = officeOptions(p).sort(function (a, b) { return PG.STATES[b].ev - PG.STATES[a].ev; });
      if (best.length) { payFor(p, 'office'); p.offices.push(best[0]); bought.push('office'); }
    }
    if (p.money >= 28 && Math.random() < 0.25 && canBuy(p, 'smear')) {
      const rival = s.players.filter(function (q) { return q.id !== p.id; }).sort(function (a, b) { return b.polls - a.polls; })[0];
      if (rival && rival.polls > p.polls + 5) {
        payFor(p, 'smear');
        rival.polls = PG.clamp(rival.polls - 5, 1, 99);
        p.polls = PG.clamp(p.polls - 1, 1, 99);
        log('logSmear', { name: p.name, target: rival.name }, p.color);
        bought.push('smear');
      }
    }
    if (bought.length) {
      UI().toast({ icon: PG.icon('briefcase'), title: p.name, text: t('botBought', { items: bought.map(itemName).join(', ') }) });
      UI().renderSide();
    }
  }

  /* -----------------------------------------------------------------------
     RUNDENWECHSEL & FINALE
     ----------------------------------------------------------------------- */
  async function reachKey(p, f) {
    if (p.round < 3) {
      const next = p.round + 1;
      const nb = PG.BOARDS[next - 1];
      PG.Audio.fanfare();
      log('logRound', { name: p.name, n: next }, p.color);
      await card(p, {
        kind: 'key', eyebrow: t('evKey'), icon: med(f.icon), title: t('roundDoneTitle', { n: p.round }),
        html: '<p class="card-text">' + esc(tx(f.text)) + '</p>' +
          '<div class="next-round"><span class="nr-num">' + t('roundRoman')[next - 1] + '</span>' +
          '<div><b>' + esc(t('roundN', { n: next })) + ' · ' + esc(tx(nb.title)) + '</b><span>' + esc(tx(nb.question)) + '</span></div></div>',
        button: t('nextRound', { n: next }), fact: f.fact
      });
      p.round = next;
      p.pos = 0;
      p.trail = [];
      if (st().settings.followCam || !p.isBot) PG.Board.setView(next);
      else PG.Board.renderTokens();
      UI().renderRoundChrome();
      UI().renderSide();
      return;
    }
    await finale(p, f);
  }

  async function finale(p, f) {
    const s = st();
    const mode = s.settings.finale;
    PG.Audio.fanfare();
    if (mode === 'race') { endGame(p, null); return; }
    if (mode === 'hurdle') {
      await card(p, { kind: 'key', eyebrow: t('evKey'), icon: med(f.icon), title: t('electionDayTitle'), text: tx(f.text), fact: f.fact });
      const proj = PG.Election.projection(p);
      await PG.Election.showProjection(p, proj);
      if (proj.ok) { endGame(p, { hurdle: proj }); return; }
      log('logHurdleFail', { name: p.name }, p.color);
      p.polls = PG.clamp(p.polls + 5, 1, 99);
      await PG.Board.walkPath(p, backPath(p, 10), stepMs(p, true), -1);
      return;
    }
    s.firstArrival = p.id;
    const cands = s.players.filter(function (q) { return q.round === 3; });
    const list = cands.slice();
    let solo = false;
    if (list.length === 1) { list.push(PG.Election.npc()); solo = true; }
    const names = cands.map(function (q) { return q.name; }).join(', ');
    await UI().event({
      kind: 'key', eyebrow: t('evKey'), icon: med(f.icon), title: t('electionDayTitle'),
      html: '<p class="card-text">' + esc(tx(f.text)) + '</p>' +
        '<p class="card-text">' + esc(t('firstArrival', { name: p.name })) + '</p>' +
        '<p class="card-text"><b>' + esc(solo ? t('electionSolo', { name: p.name }) : t('electionAll', { list: names })) + '</b></p>',
      button: t('toElectionNight'), fact: f.fact, auto: false
    });
    const result = PG.Election.simulate(list);
    await PG.Election.showNight(result, list);
    const winner = result.winner === 'npc' ? null : PG.player(result.winner);
    endGame(winner, { night: result });
  }

  function standings(winner, info) {
    const s = st();
    const evOf = function (p) {
      if (info && info.night && info.night.ev[p.id] !== undefined) return info.night.ev[p.id];
      if (info && info.hurdle && winner && p.id === winner.id) return info.hurdle.total;
      return PG.claimedEV(p.id);
    };
    const showEv = s.settings.finale !== 'race';
    return s.players.slice().sort(function (a, b) {
      if (winner && a.id === winner.id) return -1;
      if (winner && b.id === winner.id) return 1;
      return (evOf(b) - evOf(a)) || (PG.progress(b) - PG.progress(a));
    }).map(function (p) {
      const parts = [t('reached', { r: p.round, f: p.pos })];
      if (showEv && evOf(p)) parts.push(evOf(p) + ' ' + t('evShort'));
      parts.push(t('statRolls', { n: p.rolls }));
      return { p: p, line: parts.join(' · ') };
    });
  }

  function endGame(winner, info) {
    const s = st();
    s.over = true;
    s.winner = winner ? winner.id : 'npc';
    if (winner) log('logWin', { name: winner.name }, winner.color); else log('logNpcWin');
    clearSave();
    UI().setTurnMode('busy');
    UI().renderSide();
    const cfg = { players: s.config.players, settings: Object.assign({}, s.settings) };
    UI().victory({ winner: winner, npc: !winner, standings: standings(winner, info) }).then(function (choice) {
      setTimeout(function () { if (choice === 'rematch') newGame(cfg); else toMenu(); }, 0);
    }).catch(function () {});
  }

  /* -----------------------------------------------------------------------
     KI
     ----------------------------------------------------------------------- */
  function fieldValue(p, f) {
    const s = st();
    switch (f.type) {
      case 'key': return 1000;
      case 'steps': return f.steps * 1.5 + (f.polls || 0) * 0.3;
      case 'money': case 'polls': return (f.money || 0) * 0.4 + (f.polls || 0) * 0.8;
      case 'again': return 4;
      case 'skip': return -6;
      case 'choice': return Math.max(optionValue(p, f.choices[0]), optionValue(p, f.choices[1])) * 0.5;
      case 'state': return s.owners[f.state] === p.id ? 1 : (7 - PG.stateNeed(f.state, s.owners[f.state] !== undefined)) * (1 + PG.STATES[f.state].ev / 20);
      case 'news': case 'debate': return 1;
      default: return 0;
    }
  }

  function bestOption(p, opts) {
    let best = opts[0], bestScore = -1e9;
    opts.forEach(function (o) {
      const score = o.path.length + fieldValue(p, PG.fieldAt(p.round, o.target)) + Math.random() * 0.5;
      if (score > bestScore) { bestScore = score; best = o; }
    });
    return best;
  }

  /* -----------------------------------------------------------------------
     START DER SEITE
     ----------------------------------------------------------------------- */
  PG.Game = {
    newGame: newGame,
    resume: resume,
    toMenu: toMenu,
    save: save,
    savedInfo: savedInfo,
    buy: buy,
    canBuy: canBuy,
    distToKey: distToKey,
    COSTS: COSTS
  };

  function boot(data) {
    if (data && typeof data.save === 'string') memorySave = data.save;
    PG.injectIconDefs();
    PG.UI.init();
    PG.UI.showScreen('start');
    if (data && data.inGame && readSave()) resume();
  }

  const hot = window.claude && window.claude.hot;
  if (hot && typeof hot.snapshot === 'function') {
    try { hot.snapshot(function () { return { save: memorySave, inGame: !!(PG.G.st && !PG.G.st.over) }; }); } catch (e) { /* egal */ }
  }
  if (hot && typeof hot.ready === 'function') hot.ready(boot);
  else boot((hot && hot.data) || {});
})(window.PG);
