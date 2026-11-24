/* =========================================================================
   SPIELABLAUF – Züge, Feldwirkungen, KI-Entscheidungen, Speichern
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  const t = PG.t, tx = PG.tx, esc = PG.esc;
  const SAVE_KEY = 'pg-save-v1';
  const START_MONEY = 10;
  const START_POLLS = 40;
  let memorySave = null;

  function st() { return PG.G.st; }
  function UI() { return PG.UI; }

  /* -----------------------------------------------------------------------
     SPIELSTAND
     ----------------------------------------------------------------------- */
  function createState(cfg) {
    return {
      v: 1,
      settings: Object.assign({}, cfg.settings, { resources: true }),
      players: cfg.players.map(function (p, i) {
        return {
          id: i, name: p.name, color: p.color, isBot: !!p.isBot, home: p.home,
          round: 1, pos: 0, money: START_MONEY, polls: START_POLLS, bonus: 0,
          skip: 0, qualified: false, rolls: 0
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
      if (!s || s.v !== 1 || !Array.isArray(s.players) || !s.players.length || s.over) return null;
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
    const p = PG.current();
    PG.Board.setView(p.round);
    UI().renderGame();
    window.scrollTo(0, 0);
    loop();
  }

  function newGame(cfg) {
    const s = createState(cfg);
    PG.G.st = s;
    log('logStart');
    begin(s);
  }

  function resume() {
    const s = readSave();
    if (!s) { UI().showScreen('start'); return; }
    s.settings = Object.assign({ finale: 'night', quiz: true, news: true, botSpeed: 'normal', followCam: true }, s.settings || {}, { resources: true });
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

  async function playTurn(p) {
    const s = st();
    if (p.skip > 0) {
      p.skip--;
      UI().setTurnMode(p.isBot ? 'bot' : 'busy');
      log('logSkip', { name: p.name }, p.color);
      await UI().event({ kind: 'bad', eyebrow: t('evBad'), icon: '⏸️', title: t('skipTitle'), text: t('skipText', { name: p.name }), auto: p.isBot });
      return;
    }
    let again = true, guard = 0;
    while (again && guard++ < 6 && !s.over) {
      const ctx = { again: false };
      let roll;
      if (p.isBot) {
        UI().setTurnMode('bot');
        await PG.sleep(600 * PG.speed());
        roll = botWantsAdvisor(p) ? await advisorRoll(p, true) : await plainRoll();
      } else {
        const act = await UI().waitHuman(p);
        roll = act.advisor ? await advisorRoll(p, false) : await plainRoll();
      }
      p.rolls++;
      UI().setTurnMode(p.isBot ? 'bot' : 'busy');
      await resolveRoll(p, roll, ctx);
      again = ctx.again && !s.over && p.skip === 0;
      UI().renderSide();
    }
  }

  async function plainRoll() {
    const v = PG.d6();
    await UI().rollDice([v]);
    return v;
  }

  async function advisorRoll(p, isBot) {
    p.money -= UI().ADVISOR_COST;
    const a = PG.d6(), b = PG.d6();
    log('logAdvisor', { name: p.name, a: a, b: b }, p.color);
    UI().renderPlayers();
    await UI().rollDice([a, b]);
    if (isBot) {
      await PG.sleep(350 * PG.speed());
      return botScore(p, a) >= botScore(p, b) ? a : b;
    }
    if (a === b) return a;
    if (PG.Board.view !== p.round) PG.Board.setView(p.round);
    return UI().chooseDie({ a: a, b: b, infoA: preview(p, a), infoB: preview(p, b) });
  }

  /* -----------------------------------------------------------------------
     BEWEGUNG
     ----------------------------------------------------------------------- */
  function fieldLabel(f) {
    return f.type === 'state' ? tx(PG.STATES[f.state].name) : tx(f.title);
  }

  function preview(p, r) {
    const last = PG.lastIndex(p.round);
    if (p.round === 1 && p.pos === PG.GATE && !p.qualified && r % 2 === 1) {
      return { target: p.pos, tooFar: false, label: t('gateFailTitle') };
    }
    let tgt = p.pos + r;
    if (tgt > last) return { target: -1, tooFar: true, label: '' };
    if (p.round === 1 && !p.qualified && p.pos < PG.GATE && tgt > PG.GATE) tgt = PG.GATE;
    return { target: tgt, tooFar: false, label: fieldLabel(PG.fieldAt(p.round, tgt)) + ' · ' + tgt };
  }

  /** Ziel eines Ereignis-Schritts (null = würde über das Ziel hinausgehen) */
  function computeTarget(p, n) {
    const last = PG.lastIndex(p.round);
    let tgt = p.pos + n;
    if (n > 0) {
      if (tgt > last) return null;
      if (p.round === 1 && !p.qualified && p.pos < PG.GATE && tgt > PG.GATE) tgt = PG.GATE;
    } else {
      const min = (p.round === 1 && p.qualified) ? PG.GATE : 0;
      tgt = Math.max(min, tgt);
    }
    return tgt;
  }

  function stepMs(p, fast) {
    if (fast) return Math.max(70, 130 * PG.speed());
    return p.isBot ? Math.max(90, 230 * PG.speed()) : 250;
  }

  async function resolveRoll(p, r, ctx) {
    const last = PG.lastIndex(p.round);
    log('logRoll', { name: p.name, r: r }, p.color);

    if (p.round === 1 && p.pos === PG.GATE && !p.qualified) {
      if (r % 2 === 0) {
        p.qualified = true;
        log('logGateOk', { name: p.name }, p.color);
        PG.Audio.good();
        await UI().event({ kind: 'gate', eyebrow: t('evGate'), icon: '🏠', title: t('gateOkTitle'), text: t('gateOkText', { r: r }), auto: p.isBot });
      } else {
        log('logGateFail', { name: p.name }, p.color);
        PG.Audio.bad();
        await UI().event({ kind: 'bad', eyebrow: t('evGate'), icon: '🏠', title: t('gateFailTitle'), text: t('gateFailText', { r: r }), auto: p.isBot });
        return;
      }
    }

    let target = p.pos + r;
    if (target > last) {
      log('logOver', { name: p.name }, p.color);
      await UI().event({ kind: 'info', eyebrow: t('evInfo'), icon: '🎯', title: t('overTitle'), text: t('overText', { r: r, need: last - p.pos }), auto: p.isBot });
      return;
    }
    let gateStop = false;
    if (p.round === 1 && !p.qualified && p.pos < PG.GATE && target > PG.GATE) { target = PG.GATE; gateStop = true; }
    await PG.Board.walk(p, target, stepMs(p));
    await landOn(p, false, ctx, gateStop);
  }

  async function moveBy(p, n, ctx) {
    const tgt = computeTarget(p, n);
    if (tgt === null) {
      UI().toast({ icon: '🎯', title: t('overTitle'), text: t('overEffect') });
      await PG.sleep(500);
      return;
    }
    if (tgt === p.pos) return;
    await PG.Board.walk(p, tgt, stepMs(p, true));
    await landOn(p, true, ctx, false);
  }

  /* -----------------------------------------------------------------------
     FELDWIRKUNGEN
     ----------------------------------------------------------------------- */
  function applyRes(p, money, polls) {
    if (!st().settings.resources) return;
    if (money) p.money = Math.max(0, p.money + money);
    if (polls) p.polls = PG.clamp(p.polls + polls, 1, 99);
    UI().renderPlayers();
  }

  function resChips(money, polls) {
    const out = [];
    if (!st().settings.resources) return out;
    if (money) out.push({ label: t('chipMoney', { v: PG.fmt.money(money, true) }), tone: money > 0 ? 'good' : 'bad' });
    if (polls) out.push({ label: t('chipPolls', { v: PG.fmt.polls(polls, true) }), tone: polls > 0 ? 'good' : 'bad' });
    return out;
  }

  function homeName(p) { return tx(PG.STATES[p.home].name); }

  async function landOn(p, via, ctx, gateStop) {
    const f = PG.fieldAt(p.round, p.pos);
    if (f.type !== 'start') log('logLand', { name: p.name, title: f.type === 'state' ? PG.STATES[f.state].name : f.title }, p.color);
    switch (f.type) {
      case 'key': return reachKey(p, f, ctx);
      case 'gate':
        if (!p.qualified) {
          await UI().event({
            kind: 'gate', eyebrow: t('evGate'), icon: f.icon, title: tx(f.title),
            text: (gateStop ? t('gateStop', { f: p.pos }) + ' ' : '') + t('gateArrive'), auto: p.isBot
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
      case 'money':
      case 'polls': return doResource(p, f);
      case 'quiz': return doQuiz(p, ctx);
      case 'news': return doNews(p, ctx);
      case 'again': return doAgain(p, f, ctx);
      case 'skip': return doSkip(p, f);
      case 'duel': return doDuel(p, f, ctx);
    }
  }

  async function doSteps(p, f, ctx) {
    const good = f.steps > 0;
    if (good) PG.Audio.good(); else PG.Audio.bad();
    await UI().event({
      kind: good ? 'good' : 'bad', eyebrow: t(good ? 'evGood' : 'evBad'), icon: f.icon,
      title: tx(f.title), text: tx(f.text, { home: homeName(p) }),
      chips: [{ label: PG.fmt.steps(f.steps), tone: good ? 'good' : 'bad' }].concat(resChips(f.money, f.polls)),
      auto: p.isBot
    });
    applyRes(p, f.money, f.polls);
    await moveBy(p, f.steps, ctx);
  }

  async function doPlain(p, f) {
    UI().toast({ icon: f.icon, title: tx(f.title), text: tx(f.text, { home: homeName(p) }), ms: 4200 });
    await PG.sleep(p.isBot ? 900 * PG.speed() : 500);
  }

  async function doResource(p, f) {
    const s = st();
    const positive = (f.money || 0) + (f.polls || 0) >= 0;
    if (s.settings.resources) { if (positive) PG.Audio.good(); else PG.Audio.bad(); }
    UI().toast({
      icon: f.icon, title: tx(f.title), text: tx(f.text, { home: homeName(p) }),
      chips: resChips(f.money, f.polls), tone: s.settings.resources ? (positive ? 'good' : 'bad') : 'neutral', ms: 3800
    });
    applyRes(p, f.money, f.polls);
    await PG.sleep(p.isBot ? 900 * PG.speed() : 500);
  }

  function drawFrom(deckKey, total, ok) {
    const s = st();
    for (let tries = 0; tries < total * 2 + 2; tries++) {
      if (!s[deckKey].length) s[deckKey] = PG.shuffle(PG.range(total));
      const i = s[deckKey].shift();
      if (!ok || ok(i)) return i;
    }
    return 0;
  }

  async function doQuiz(p, ctx) {
    const s = st();
    if (!s.settings.quiz) return;
    const q = PG.QUIZ[drawFrom('quizDeck', PG.QUIZ.length)];
    const correct = await UI().quiz({
      q: q, player: p, isBot: p.isBot, botCorrect: Math.random() < 0.65,
      rewardText: function (ok) { return ok ? t('quizReward') : t('quizNoReward'); }
    });
    log(correct ? 'logQuizOk' : 'logQuizBad', { name: p.name }, p.color);
    if (correct) applyRes(p, 0, 4);
  }

  function leaderOf() {
    const s = st();
    return s.players.slice().sort(function (a, b) { return PG.progress(b) - PG.progress(a); })[0];
  }

  async function doNews(p, ctx) {
    const s = st();
    if (!s.settings.news) return;
    const res = s.settings.resources;
    const idx = drawFrom('newsDeck', PG.NEWS.length, function (i) {
      const c = PG.NEWS[i];
      return res || c.steps || c.skip || c.again || c.leaderSteps;
    });
    const c = PG.NEWS[idx];
    const chips = [];
    if (c.steps) chips.push({ label: PG.fmt.steps(c.steps), tone: c.steps > 0 ? 'good' : 'bad' });
    chips.push.apply(chips, resChips(c.money, c.polls));
    if (res && c.allPolls) chips.push({ label: t('chipAllPolls', { v: PG.fmt.polls(c.allPolls, true) }), tone: 'bad' });
    if (res && c.collect) chips.push({ label: t('chipCollect', { v: PG.fmt.money(c.collect) }), tone: 'good' });
    if (c.skip) chips.push({ label: t('chipSkip'), tone: 'bad' });
    if (c.again) chips.push({ label: t('chipAgain'), tone: 'good' });
    if (c.leaderSteps) chips.push({ label: t('chipLeader'), tone: 'neutral' });
    PG.Audio.news();
    await UI().event({ kind: 'news', eyebrow: t('evNews'), icon: c.icon, title: tx(c.title), text: tx(c.text), chips: chips, auto: p.isBot, autoBase: 2300 });
    log('logNews', { name: p.name, title: c.title }, p.color);

    applyRes(p, c.money, c.polls);
    if (res && c.allPolls) s.players.forEach(function (q) { q.polls = PG.clamp(q.polls + c.allPolls, 1, 99); });
    if (res && c.collect) {
      s.players.forEach(function (q) {
        if (q.id === p.id) return;
        const pay = Math.min(q.money, c.collect);
        q.money -= pay; p.money += pay;
      });
    }
    if (c.skip) p.skip += c.skip;
    if (c.again) ctx.again = true;
    UI().renderPlayers();
    if (c.leaderSteps) {
      const leader = leaderOf();
      const tgt = computeTarget(leader, c.leaderSteps);
      if (tgt !== null && tgt !== leader.pos) await PG.Board.walk(leader, tgt, stepMs(leader, true));
      if (leader.id !== p.id && PG.Board.view !== p.round && s.settings.followCam) PG.Board.setView(p.round);
    }
    if (c.steps) await moveBy(p, c.steps, ctx);
  }

  async function doAgain(p, f, ctx) {
    PG.Audio.good();
    await UI().event({
      kind: 'good', eyebrow: t('evAgain'), icon: f.icon, title: tx(f.title), text: tx(f.text),
      chips: [{ label: t('chipAgain'), tone: 'good' }], auto: p.isBot, autoBase: 1400
    });
    ctx.again = true;
  }

  async function doSkip(p, f) {
    PG.Audio.bad();
    await UI().event({
      kind: 'bad', eyebrow: t('evBad'), icon: f.icon, title: tx(f.title), text: tx(f.text),
      chips: [{ label: t('chipSkip'), tone: 'bad' }], auto: p.isBot
    });
    p.skip = Math.max(p.skip, 1);
  }

  async function doDuel(p, f, ctx) {
    const s = st();
    const others = s.players.filter(function (q) { return q.id !== p.id; });
    let pool = others.filter(function (q) { return q.round === p.round; });
    if (!pool.length) pool = others;
    const opp = pool.length ? pool[PG.rnd(pool.length)] : { name: t('npcName'), color: '#5B6475', isNpc: true };
    const ra = PG.d6(), rb = PG.d6();
    const tie = ra === rb, win = ra > rb;
    const winner = win ? p : opp, loser = win ? opp : p;
    await UI().duel({
      title: tx(f.title), text: t('duelText', { a: p.name, b: opp.name }), a: p, b: opp, ra: ra, rb: rb,
      resultText: tie ? t('duelTie') : t('duelWinPolls', { name: winner.name, loser: loser.name }),
      tone: tie ? 'neutral' : (win ? 'good' : 'bad'), auto: p.isBot
    });
    log('logDuel', { a: p.name, ra: ra, b: opp.name, rb: rb }, p.color);
    if (!tie) {
      if (!winner.isNpc) winner.polls = PG.clamp(winner.polls + 6, 1, 99);
      if (!loser.isNpc) loser.polls = PG.clamp(loser.polls - 3, 1, 99);
      UI().renderPlayers();
    }
  }

  /** Bonus auf die Würfelprobe um einen Bundesstaat */
  function stateBonus(p, code) {
    const parts = [];
    if (p.polls >= 55) parts.push(t('stateBonusPolls'));
    if (p.home === code) parts.push(t('stateBonusHome'));
    return { value: parts.length, parts: parts };
  }

  async function doState(p, f) {
    const s = st();
    const code = f.state;
    const S = PG.STATES[code];
    const sName = tx(S.name);
    if (s.settings.finale === 'race') {
      UI().toast({ icon: '🎤', title: sName, text: t('stateRace', { state: sName }) });
      await PG.sleep(p.isBot ? 800 * PG.speed() : 400);
      return;
    }
    const ownerId = s.owners[code];
    if (ownerId === p.id) {
      applyRes(p, 0, 2);
      UI().toast({ icon: '🏠', title: sName, text: t('stateOwn', { state: sName, name: p.name }), chips: resChips(0, 2), tone: 'good' });
      await PG.sleep(p.isBot ? 800 * PG.speed() : 400);
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
      isBot: p.isBot, cost: cost, canRetry: p.money >= cost, botRetry: p.money >= cost + 5,
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
     RUNDENWECHSEL & FINALE
     ----------------------------------------------------------------------- */
  async function reachKey(p, f) {
    if (p.round < 3) {
      const next = p.round + 1;
      const nb = PG.BOARDS[next - 1];
      PG.Audio.fanfare();
      log('logRound', { name: p.name, n: next }, p.color);
      await UI().event({
        kind: 'key', eyebrow: t('evKey'), icon: f.icon, title: t('roundDoneTitle', { n: p.round }),
        html: '<p class="card-text">' + esc(tx(f.text)) + '</p>' +
          '<div class="next-round"><span class="nr-num">' + t('roundRoman')[next - 1] + '</span>' +
          '<div><b>' + esc(t('roundN', { n: next })) + ' · ' + esc(tx(nb.title)) + '</b><span>' + esc(tx(nb.question)) + '</span></div></div>',
        button: t('nextRound', { n: next }), auto: p.isBot, autoBase: 2600
      });
      p.round = next;
      p.pos = 0;
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
    if (mode === 'race') {
      endGame(p, null);
      return;
    }
    if (mode === 'hurdle') {
      await UI().event({ kind: 'key', eyebrow: t('evKey'), icon: f.icon, title: t('electionDayTitle'), text: tx(f.text), auto: p.isBot });
      const proj = PG.Election.projection(p);
      await PG.Election.showProjection(p, proj);
      if (proj.ok) {
        endGame(p, { hurdle: proj });
        return;
      }
      log('logHurdleFail', { name: p.name }, p.color);
      if (s.settings.resources) p.polls = PG.clamp(p.polls + 5, 1, 99);
      else p.bonus = (p.bonus || 0) + 5;
      await PG.Board.walk(p, PG.lastIndex(3) - 10, stepMs(p, true));
      return;
    }
    /* Gemeinsamer Wahlabend */
    s.firstArrival = p.id;
    const cands = s.players.filter(function (q) { return q.round === 3; });
    const list = cands.slice();
    let solo = false;
    if (list.length === 1) { list.push(PG.Election.npc()); solo = true; }
    const names = cands.map(function (q) { return q.name; }).join(', ');
    await UI().event({
      kind: 'key', eyebrow: t('evKey'), icon: f.icon, title: t('electionDayTitle'),
      html: '<p class="card-text">' + esc(tx(f.text)) + '</p>' +
        '<p class="card-text">' + esc(t('firstArrival', { name: p.name })) + '</p>' +
        '<p class="card-text"><b>' + esc(solo ? t('electionSolo', { name: p.name }) : t('electionAll', { list: names })) + '</b></p>',
      button: t('toElectionNight'), auto: false
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
      setTimeout(function () {
        if (choice === 'rematch') newGame(cfg); else toMenu();
      }, 0);
    }).catch(function () {});
  }

  /* -----------------------------------------------------------------------
     KI
     ----------------------------------------------------------------------- */
  function botWantsAdvisor(p) {
    const s = st();
    if (!s.settings.resources || p.money < UI().ADVISOR_COST) return false;
    const dist = PG.lastIndex(p.round) - p.pos;
    if (p.round === 1 && p.pos === PG.GATE && !p.qualified) return p.money >= 8;
    if (dist <= 6) return true;
    return p.money >= 18 && Math.random() < 0.3;
  }

  function botScore(p, r) {
    const s = st();
    if (p.round === 1 && p.pos === PG.GATE && !p.qualified) return r % 2 === 0 ? 100 + r : -100;
    const last = PG.lastIndex(p.round);
    let tgt = p.pos + r;
    if (tgt > last) return -50;
    if (p.round === 1 && !p.qualified && p.pos < PG.GATE && tgt > PG.GATE) tgt = PG.GATE;
    const f = PG.fieldAt(p.round, tgt);
    let score = tgt;
    if (f.type === 'key') score += 1000;
    if (f.type === 'steps') score += f.steps * 1.5;
    if (f.type === 'again') score += 4;
    if (f.type === 'skip') score -= 6;
    if (f.type === 'state' && s.owners[f.state] !== p.id) score += (7 - PG.stateNeed(f.state, s.owners[f.state] !== undefined)) * (1 + PG.STATES[f.state].ev / 20);
    return score;
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
    computeTarget: computeTarget
  };

  function boot(data) {
    if (data && typeof data.save === 'string') memorySave = data.save;
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
