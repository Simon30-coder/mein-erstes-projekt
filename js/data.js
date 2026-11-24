/* =========================================================================
   SPIELDATEN – Spielfelder, Bundesstaaten, Quizfragen, Breaking News
   -------------------------------------------------------------------------
   Hier kannst du das Spiel am einfachsten verändern:
   - Felder umstellen, Texte ändern, Schritte anpassen (PG.BOARDS)
   - Neue Quizfragen oder News-Karten hinzufügen (PG.QUIZ / PG.NEWS)
   Jeder Text hat eine deutsche (de) und eine englische (en) Version.
   ========================================================================= */
window.PG = window.PG || {};

(function (PG) {
  'use strict';

  /** Kurzschreibweise für zweisprachige Texte */
  const L = (de, en) => ({ de: de, en: en || de });

  /* -----------------------------------------------------------------------
     SPIELER-FARBEN & KI-NAMEN
     ----------------------------------------------------------------------- */
  PG.COLORS = [
    '#C8102E', '#1D4ED8', '#15803D', '#D99A00', '#7C3AED',
    '#EA580C', '#0891B2', '#DB2777', '#7A4A1E', '#475569',
    '#65A30D', '#0F766E', '#9F1239', '#0EA5E9', '#A21CAF'
  ];

  PG.BOT_NAMES = [
    'Abe', 'Teddy', 'Ike', 'Jack', 'Franklin', 'Harry', 'Lyndon',
    'Ronnie', 'Jimmy', 'Ulysses', 'Grover', 'Woody', 'Cal', 'Herbert'
  ];

  /* -----------------------------------------------------------------------
     BUNDESSTAATEN
     [Kürzel, Name (en), Wahlmänner, Spalte, Zeile (Kachelkarte), Wahllokale schließen (ET), Name (de, optional)]
     Wahlmänner nach der Volkszählung 2020 (gültig für die Wahlen 2024 und 2028).
     ----------------------------------------------------------------------- */
  const STATE_ROWS = [
    ['AK', 'Alaska', 3, 0, 0, '01:00'],
    ['ME', 'Maine', 4, 10, 0, '20:00'],
    ['WI', 'Wisconsin', 10, 5, 1, '21:00'],
    ['VT', 'Vermont', 3, 9, 1, '19:00'],
    ['NH', 'New Hampshire', 4, 10, 1, '20:00'],
    ['WA', 'Washington', 12, 0, 2, '23:00'],
    ['ID', 'Idaho', 4, 1, 2, '23:00'],
    ['MT', 'Montana', 4, 2, 2, '22:00'],
    ['ND', 'North Dakota', 3, 3, 2, '21:00'],
    ['MN', 'Minnesota', 10, 4, 2, '21:00'],
    ['IL', 'Illinois', 19, 5, 2, '20:00'],
    ['MI', 'Michigan', 15, 6, 2, '21:00'],
    ['NY', 'New York', 28, 8, 2, '21:00'],
    ['MA', 'Massachusetts', 11, 9, 2, '20:00'],
    ['OR', 'Oregon', 8, 0, 3, '23:00'],
    ['NV', 'Nevada', 6, 1, 3, '22:00'],
    ['WY', 'Wyoming', 3, 2, 3, '21:00'],
    ['SD', 'South Dakota', 3, 3, 3, '21:00'],
    ['IA', 'Iowa', 6, 4, 3, '22:00'],
    ['IN', 'Indiana', 11, 5, 3, '19:00'],
    ['OH', 'Ohio', 17, 6, 3, '19:30'],
    ['PA', 'Pennsylvania', 19, 7, 3, '20:00'],
    ['NJ', 'New Jersey', 14, 8, 3, '20:00'],
    ['CT', 'Connecticut', 7, 9, 3, '20:00'],
    ['RI', 'Rhode Island', 4, 10, 3, '20:00'],
    ['CA', 'California', 54, 0, 4, '23:00', 'Kalifornien'],
    ['UT', 'Utah', 6, 1, 4, '22:00'],
    ['CO', 'Colorado', 10, 2, 4, '21:00'],
    ['NE', 'Nebraska', 5, 3, 4, '21:00'],
    ['MO', 'Missouri', 10, 4, 4, '20:00'],
    ['KY', 'Kentucky', 8, 5, 4, '19:00'],
    ['WV', 'West Virginia', 4, 6, 4, '19:30'],
    ['VA', 'Virginia', 13, 7, 4, '19:00'],
    ['MD', 'Maryland', 10, 8, 4, '20:00'],
    ['DE', 'Delaware', 3, 9, 4, '20:00'],
    ['AZ', 'Arizona', 11, 1, 5, '21:00'],
    ['NM', 'New Mexico', 5, 2, 5, '21:00'],
    ['KS', 'Kansas', 6, 3, 5, '21:00'],
    ['AR', 'Arkansas', 6, 4, 5, '20:30'],
    ['TN', 'Tennessee', 11, 5, 5, '20:00'],
    ['NC', 'North Carolina', 16, 6, 5, '19:30'],
    ['SC', 'South Carolina', 9, 7, 5, '19:00'],
    ['DC', 'Washington, D.C.', 3, 8, 5, '20:00'],
    ['OK', 'Oklahoma', 7, 3, 6, '20:00'],
    ['LA', 'Louisiana', 8, 4, 6, '21:00'],
    ['MS', 'Mississippi', 6, 5, 6, '20:00'],
    ['AL', 'Alabama', 9, 6, 6, '20:00'],
    ['GA', 'Georgia', 16, 7, 6, '19:00'],
    ['HI', 'Hawaii', 4, 0, 7, '00:00'],
    ['TX', 'Texas', 40, 3, 7, '21:00'],
    ['FL', 'Florida', 30, 8, 7, '20:00']
  ];

  PG.STATES = {};
  STATE_ROWS.forEach(function (r) {
    PG.STATES[r[0]] = {
      code: r[0], name: L(r[6] || r[1], r[1]), ev: r[2],
      col: r[3], row: r[4], close: r[5]
    };
  });
  PG.STATE_CODES = STATE_ROWS.map(function (r) { return r[0]; });
  PG.TOTAL_EV = STATE_ROWS.reduce(function (s, r) { return s + r[2]; }, 0); // 538
  PG.WIN_EV = 270;

  /* -----------------------------------------------------------------------
     SPIELFELDER
     type:
       start  – Startfeld
       plain  – nur Text, keine Wirkung
       steps  – vor/zurück (steps: +/-)
       gate   – Sperre: gerade Zahl würfeln (Runde 1)
       key    – Schlüsselfeld: genau landen → nächste Runde
       quiz   – Quizfrage
       news   – Breaking-News-Karte ziehen
       money  – Spenden (money: +/- Mio. $)
       polls  – Umfragewerte (polls: +/- %)
       again  – nochmal würfeln
       skip   – eine Runde aussetzen
       duel   – TV-Duell gegen einen Mitspieler
       state  – Bundesstaat (nur Runde 3)
     Zusätzlich können steps-Felder auch money/polls haben (wirkt nur mit „Ressourcen").
     ----------------------------------------------------------------------- */
  const F = function (type, icon, title, text, extra) {
    return Object.assign({ type: type, icon: icon, title: title, text: text || null }, extra || {});
  };
  const QUIZ = function () { return F('quiz', '❓', L('Quizfrage', 'Quiz'), null); };
  const NEWS = function () { return F('news', '📰', L('Breaking News', 'Breaking News'), null); };
  const STATE = function (code) { return F('state', '🗳️', null, null, { state: code }); };

  PG.BOARDS = [
    /* ===================== RUNDE 1 ===================== */
    {
      id: 1,
      title: L('Qualifikation', 'Qualification'),
      question: L('Bist du überhaupt qualifiziert, Präsident zu werden?', 'Are you even qualified to become President?'),
      intro: L(
        'Artikel II der US-Verfassung verlangt drei Dinge: Du musst in den USA geboren sein, mindestens 35 Jahre alt sein und 14 Jahre in den USA gewohnt haben. Danach geht es in die Vorwahlen deiner Partei.',
        'Article II of the US Constitution demands three things: you must be a natural-born citizen, at least 35 years old and a US resident for 14 years. After that come your party’s primaries.'
      ),
      gate: 13,
      fields: [
        F('start', '🗽', L('Du willst Präsident werden', 'You want to become President'),
          L('Willkommen im Rennen! Zuerst prüft die Verfassung, ob du überhaupt antreten darfst.',
            'Welcome to the race! First the Constitution checks whether you may run at all.')),
        F('steps', '🇨🇺', L('Geboren in Kuba', 'Born in Cuba'),
          L('Nur gebürtige US-Bürger dürfen Präsident werden. 1 Schritt zurück.', 'Only natural-born citizens can become President. 1 step back.'),
          { steps: -1 }),
        F('polls', '🇺🇸', L('Geboren in den USA', 'Born in the USA'),
          L('Perfekt: Du bist ein „natural born citizen“. Voraussetzung Nr. 1 erfüllt!', 'Perfect: you are a natural-born citizen. Requirement no. 1 fulfilled!'),
          { polls: 2 }),
        F('steps', '🇲🇽', L('Geboren in Mexiko', 'Born in Mexico'),
          L('Leider nicht in den USA geboren. 3 Schritte zurück.', 'Sadly not born in the USA. 3 steps back.'),
          { steps: -3 }),
        F('plain', '🌺', L('Geboren auf Hawaii', 'Born in Hawaii'),
          L('Hawaii ist ein US-Bundesstaat, also alles in Ordnung. Trotzdem wollen manche Leute deine Geburtsurkunde sehen. Du bleibst stehen.',
            'Hawaii is a US state, so you’re fine. Still, some people demand to see your birth certificate. You stay where you are.')),
        F('steps', '🇮🇷', L('Geboren im Iran', 'Born in Iran'),
          L('Nicht in den USA geboren. 5 Schritte zurück.', 'Not born in the USA. 5 steps back.'),
          { steps: -5 }),
        F('polls', '🇺🇸', L('Geboren in den USA', 'Born in the USA'),
          L('Geboren im Land der unbegrenzten Möglichkeiten. Voraussetzung erfüllt!', 'Born in the land of opportunity. Requirement fulfilled!'),
          { polls: 2 }),
        F('steps', '🎂', L('35 Jahre oder älter', '35 or older'),
          L('Du hast das Mindestalter von 35 Jahren erreicht. 6 Schritte vor!', 'You have reached the minimum age of 35. 6 steps forward!'),
          { steps: 6 }),
        F('steps', '🧒', L('Unter 35', 'Under 35'),
          L('Zu jung für das Weiße Haus! 2 Schritte zurück.', 'Too young for the White House! 2 steps back.'),
          { steps: -2 }),
        F('steps', '🎂', L('35 Jahre oder älter', '35 or older'),
          L('Alt genug für das Amt. 4 Schritte vor!', 'Old enough for the job. 4 steps forward!'),
          { steps: 4 }),
        F('steps', '🚫', L('Nope! Zu jung', 'Nope! Too young'),
          L('Die Verfassung sagt Nein. 4 Schritte zurück.', 'The Constitution says no. 4 steps back.'),
          { steps: -4 }),
        F('steps', '🚫', L('Nope! Zu jung', 'Nope! Too young'),
          L('Komm in ein paar Jahren wieder. 5 Schritte zurück.', 'Come back in a few years. 5 steps back.'),
          { steps: -5 }),
        F('steps', '🎂', L('35 Jahre oder älter', '35 or older'),
          L('Alter passt. 1 Schritt vor!', 'Age checks out. 1 step forward!'),
          { steps: 1 }),
        F('gate', '🏠', L('14 Jahre Wohnsitz', '14 years of residence'),
          L('Sperre! Hier muss jeder anhalten. Du musst 14 Jahre in den USA gewohnt haben: Würfle eine gerade Zahl (2, 4 oder 6), um weiterzuziehen.',
            'Barrier! Everyone has to stop here. You must have lived in the US for 14 years: roll an even number (2, 4 or 6) to move on.')),
        QUIZ(),
        F('steps', '🗣️', L('Parteikollege sagt etwas Unangebrachtes', 'Party member says something inappropriate'),
          L('Ein Parteikollege hat sich im Fernsehen danebenbenommen und alle fragen dich dazu. 1 Schritt zurück.',
            'A fellow party member misbehaved on TV and everyone asks you about it. 1 step back.'),
          { steps: -1, polls: -3 }),
        F('money', '💵', L('Spendenessen in der Heimatstadt', 'Hometown fundraiser dinner'),
          L('Deine Nachbarn sammeln für deinen Wahlkampf.', 'Your neighbours raise money for your campaign.'),
          { money: 3 }),
        NEWS(),
        F('steps', '🌪️', L('Lokalregierung reagiert zu spät auf Tornados', 'Local government reacted late to tornadoes'),
          L('Deine Partei regiert vor Ort und hat bei den Tornados zu spät reagiert. 1 Schritt zurück.',
            'Your party runs the local government and reacted too late to the tornadoes. 1 step back.'),
          { steps: -1, polls: -3 }),
        F('polls', '🎤', L('Rede im Rathaus', 'Town hall speech'),
          L('Deine Rede im Rathaus kommt richtig gut an.', 'Your town hall speech goes down really well.'),
          { polls: 4 }),
        QUIZ(),
        F('steps', '📉', L('Der Präsident macht deine Partei unbeliebt', 'The President makes your party unpopular'),
          L('Der amtierende Präsident aus deiner Partei hat miese Umfragewerte. Das färbt auf dich ab. 1 Schritt zurück.',
            'The sitting President from your party has terrible approval ratings. It rubs off on you. 1 step back.'),
          { steps: -1, polls: -4 }),
        NEWS(),
        F('money', '🧢', L('Kleinspenden-Welle', 'Small-donor wave'),
          L('Tausende Fans spenden je 20 Dollar.', 'Thousands of fans donate 20 dollars each.'),
          { money: 4 }),
        QUIZ(),
        F('steps', '🗳️', L('Du gewinnst die Vorwahl!', 'You win the primary!'),
          L('Die Wähler deiner Partei haben entschieden: Du gewinnst die Vorwahl. 5 Schritte vor!',
            'Your party’s voters have spoken: you win the primary. 5 steps forward!'),
          { steps: 5, polls: 5 }),
        NEWS(),
        F('polls', '🌽', L('Hotdog auf der Iowa State Fair', 'Hot dog at the Iowa State Fair'),
          L('Ein Pflichttermin für jeden Kandidaten. Du isst den Hotdog ohne Kleckern.', 'A must for every candidate. You eat the hot dog without a single stain.'),
          { polls: 3 }),
        F('again', '⚡', L('Wahlkampf-Schwung', 'Campaign momentum'),
          L('Du hast Rückenwind. Würfle nochmal!', 'You’ve got the wind at your back. Roll again!')),
        NEWS(),
        F('key', '🔑', L('Vorwahl gewonnen: Du bist Delegierter!', 'Primary won: you are a delegate!'),
          L('Du hast die Vorwahl in deinem Bundesstaat gewonnen und fährst zum Nationalen Parteitag. Weiter zu Runde 2!',
            'You won the primary in your state and head to the National Convention. On to round 2!'))
      ]
    },

    /* ===================== RUNDE 2 ===================== */
    {
      id: 2,
      title: L('Nominierung', 'Nomination'),
      question: L('Wirst du Präsidentschaftskandidat deiner Partei?', 'Will you become your party’s presidential nominee?'),
      intro: L(
        'Jetzt kämpfst du um die Delegierten. Am Ende entscheidet der Nationale Parteitag, wer für die Partei ins Rennen ums Weiße Haus geht.',
        'Now you fight for delegates. In the end the National Convention decides who runs for the White House on the party ticket.'
      ),
      fields: [
        F('start', '🎖️', L('Kandidat aus deinem Bundesstaat', 'Candidate from your state'),
          L('Dein Heimatstaat {home} schickt dich ins Rennen um die Nominierung.', 'Your home state {home} sends you into the race for the nomination.')),
        NEWS(),
        QUIZ(),
        F('again', '⚡', L('Super Tuesday', 'Super Tuesday'),
          L('In über einem Dutzend Staaten wird am selben Tag gewählt. Würfle nochmal!', 'More than a dozen states vote on the same day. Roll again!')),
        F('money', '💰', L('Super PAC gegründet', 'Super PAC launched'),
          L('Ein Super PAC sammelt unbegrenzt Geld für dich.', 'A Super PAC raises unlimited money for you.'),
          { money: 8 }),
        F('steps', '🤝', L('Mächtige Freunde empfehlen dich', 'Powerful friends recommend you'),
          L('Einflussreiche Leute sprechen sich für dich aus. 2 Schritte vor!', 'Influential people endorse you. 2 steps forward!'),
          { steps: 2, polls: 3 }),
        F('duel', '📺', L('Vorwahl-Debatte', 'Primary debate'),
          L('TV-Duell gegen einen Mitspieler: Beide würfeln. Gewinnst du, geht es 2 Felder vor. Verlierst du, geht es 2 Felder zurück.',
            'TV duel against another player: both roll. Win and you move 2 forward. Lose and you move 2 back.')),
        F('polls', '🎙️', L('Auftritt in einer Late-Night-Show', 'Late-night show appearance'),
          L('Du bist witzig und das Publikum lacht mit dir, nicht über dich.', 'You’re funny, and the audience laughs with you, not at you.'),
          { polls: 5 }),
        F('steps', '🕵️', L('Affäre mit einem chinesischen Spion', 'Affair with a Chinese spy'),
          L('Du hattest eine Affäre mit einem chinesischen Spion. Riesenskandal! 6 Schritte zurück.',
            'You had an affair with a Chinese spy. Huge scandal! 6 steps back.'),
          { steps: -6, polls: -10 }),
        NEWS(),
        F('money', '🥂', L('Spendengala in Hollywood', 'Hollywood fundraising gala'),
          L('Stars zahlen viel Geld für ein Foto mit dir.', 'Stars pay a fortune for a photo with you.'),
          { money: 5 }),
        F('skip', '⚖️', L('Ethik-Untersuchung', 'Ethics investigation'),
          L('Ein Ausschuss prüft deine Finanzen. Setze eine Runde aus.', 'A committee is looking into your finances. Miss a turn.')),
        F('steps', '✍️', L('Obama hilft bei deiner Rede', 'Obama helps with your speech'),
          L('Barack Obama hilft dir, eine überzeugende Rede für den Nationalen Parteitag zu schreiben. 2 Schritte vor!',
            'Barack Obama helps you write a convincing speech for the National Convention. 2 steps forward!'),
          { steps: 2, polls: 5 }),
        QUIZ(),
        F('polls', '🎈', L('Ballons und Konfetti', 'Balloons and confetti'),
          L('Der Parteitag beginnt und die Halle jubelt dir zu.', 'The convention begins and the hall cheers for you.'),
          { polls: 3 }),
        F('steps', '📈', L('Hohe Inflation', 'High inflation'),
          L('Die Preise steigen und die Wähler sind sauer. 2 Schritte zurück.', 'Prices are rising and voters are angry. 2 steps back.'),
          { steps: -2, polls: -4 }),
        NEWS(),
        F('key', '👑', L('Sieg auf dem Nationalen Parteitag', 'You win the National Convention'),
          L('Die Delegierten haben entschieden: Du bist offiziell Präsidentschaftskandidat! Weiter zu Runde 3.',
            'The delegates have decided: you are officially the presidential nominee! On to round 3.'))
      ]
    },

    /* ===================== RUNDE 3 ===================== */
    {
      id: 3,
      title: L('Wahlkampf', 'Campaign'),
      question: L('Gewinnst du die Wahl und ziehst ins Weiße Haus?', 'Will you win the election and move into the White House?'),
      intro: L(
        'Der eigentliche Wahlkampf! Erobere Bundesstaaten und ihre Wahlmänner. 270 von 538 Stimmen im Electoral College brauchst du für den Sieg.',
        'The real campaign! Win states and their electoral votes. You need 270 of the 538 votes in the Electoral College.'
      ),
      fields: [
        F('start', '🇺🇸', L('Präsidentschaftskandidat', 'Presidential nominee'),
          L('Jetzt beginnt der eigentliche Wahlkampf. Erobere Bundesstaaten und erreiche den Wahltag!',
            'Now the real campaign begins. Win states and make it to Election Day!')),
        F('steps', '💎', L('Du kommst aus einer reichen Familie', 'You come from a rich family'),
          L('Papa finanziert den Start deiner Kampagne. 2 Schritte vor!', 'Dad bankrolls your campaign launch. 2 steps forward!'),
          { steps: 2, money: 10 }),
        STATE('NV'),
        NEWS(),
        STATE('AZ'),
        F('steps', '🎖️', L('Du bist Veteran!', 'You are a veteran!'),
          L('Du hast deinem Land gedient. Das beeindruckt viele Wähler. 5 Schritte vor!', 'You served your country. Many voters are impressed. 5 steps forward!'),
          { steps: 5, polls: 5 }),
        STATE('WI'),
        F('steps', '⚖️', L('Du bist Anwalt', 'You are an attorney'),
          L('Du kennst die Gesetze in- und auswendig. 3 Schritte vor!', 'You know the law inside out. 3 steps forward!'),
          { steps: 3, polls: 2 }),
        QUIZ(),
        STATE('MI'),
        F('money', '📞', L('Spenden-Telefonmarathon', 'Fundraising phone-a-thon'),
          L('Deine Freiwilligen telefonieren die ganze Nacht.', 'Your volunteers work the phones all night.'),
          { money: 5 }),
        F('steps', '💼', L('Großspender unterstützen dich', 'Big donors back you'),
          L('Die großen Spender stehen hinter dir. 3 Schritte vor!', 'The big donors are behind you. 3 steps forward!'),
          { steps: 3, money: 10 }),
        STATE('GA'),
        F('steps', '🚀', L('Elon Musk finanziert deine Kampagne', 'Elon Musk funds your campaign'),
          L('Elon Musk überweist dir ein paar Millionen. 4 Schritte vor!', 'Elon Musk wires you a few million. 4 steps forward!'),
          { steps: 4, money: 20 }),
        STATE('NC'),
        F('steps', '👶', L('Du hast ein Enkelkind', 'You have a grandchild'),
          L('Süße Familienfotos gehen um die Welt. 3 Schritte vor!', 'Cute family photos go around the world. 3 steps forward!'),
          { steps: 3, polls: 3 }),
        NEWS(),
        F('steps', '👱', L('Du hast gelbe Haare', 'You have yellow hair'),
          L('Deine Frisur ist Thema in jeder Talkshow. 1 Schritt zurück.', 'Your hairdo is the talk of every talk show. 1 step back.'),
          { steps: -1 }),
        STATE('IL'),
        QUIZ(),
        F('steps', '💣', L('Du willst einen Krieg mit dem Iran beginnen', 'You want to start a war with Iran'),
          L('Die Wähler wollen keinen neuen Krieg. 4 Schritte zurück.', 'Voters don’t want a new war. 4 steps back.'),
          { steps: -4, polls: -8 }),
        STATE('PA'),
        NEWS(),
        F('steps', '😴', L('Dein Gegner ist schläfrig', 'Your opponent is sleepy'),
          L('Dein Gegner ist schläfrig und kann nicht richtig sprechen. 2 Schritte vor!', 'Your opponent is sleepy and can’t speak properly. 2 steps forward!'),
          { steps: 2, polls: 3 }),
        STATE('OH'),
        F('polls', '☕', L('Frühstück im Diner', 'Breakfast at a diner'),
          L('Pancakes mit echten Wählern. Die Kameras lieben es.', 'Pancakes with real voters. The cameras love it.'),
          { polls: 3 }),
        STATE('FL'),
        F('steps', '🎙️', L('Stark in der TV-Debatte', 'Strong in the TV debate'),
          L('Du hast in der Präsidentschaftsdebatte gezeigt, was du kannst. 3 Schritte vor!',
            'You showed real skill in the presidential debate. 3 steps forward!'),
          { steps: 3, polls: 8 }),
        NEWS(),
        STATE('NY'),
        QUIZ(),
        F('steps', '💸', L('Große Zahlung für deine Kampagne', 'Large payment to your campaign'),
          L('Ein dicker Scheck landet auf deinem Konto. 2 Schritte vor!', 'A fat cheque lands in your account. 2 steps forward!'),
          { steps: 2, money: 10 }),
        F('steps', '✂️', L('Gerrymandering!', 'Gerrymandered!'),
          L('Deine Hochburg wurde per Gerrymandering in Stücke geschnitten. 3 Schritte zurück.',
            'Your stronghold has been gerrymandered to pieces. 3 steps back.'),
          { steps: -3, polls: -5 }),
        STATE('TX'),
        STATE('CA'),
        F('steps', '📁', L('Du stehst in den Epstein-Akten', 'You are in the Epstein files'),
          L('Dein Name taucht in den Epstein-Akten auf. 10 Schritte zurück!', 'Your name shows up in the Epstein files. 10 steps back!'),
          { steps: -10, polls: -15 }),
        F('key', '🦅', L('Wahltag!', 'Election Day!'),
          L('Der Dienstag nach dem ersten Montag im November: Amerika wählt!', 'The Tuesday after the first Monday in November: America votes!'))
      ]
    }
  ];

  /* Bundesstaaten, die als Felder auf dem Brett von Runde 3 liegen */
  PG.BOARD_STATES = PG.BOARDS[2].fields.filter(function (f) { return f.type === 'state'; }).map(function (f) { return f.state; });

  /* -----------------------------------------------------------------------
     QUIZFRAGEN  (c = Index der richtigen Antwort, x = Erklärung)
     ----------------------------------------------------------------------- */
  PG.QUIZ = [
    { q: L('Wie alt muss man mindestens sein, um US-Präsident zu werden?', 'What is the minimum age to become US President?'),
      a: [L('30 Jahre', '30 years'), L('35 Jahre', '35 years'), L('40 Jahre', '40 years'), L('45 Jahre', '45 years')], c: 1,
      x: L('Das steht in Artikel II der Verfassung.', 'That is set out in Article II of the Constitution.') },
    { q: L('Wie viele Jahre muss man mindestens in den USA gewohnt haben?', 'How many years must a candidate have lived in the US?'),
      a: [L('7'), L('10'), L('14'), L('21')], c: 2,
      x: L('14 Jahre Wohnsitz verlangt die Verfassung.', 'The Constitution requires 14 years of residence.') },
    { q: L('Wie viele Wahlmänner-Stimmen braucht man, um Präsident zu werden?', 'How many electoral votes do you need to win?'),
      a: [L('218'), L('256'), L('270'), L('300')], c: 2,
      x: L('270 ist die absolute Mehrheit von 538.', '270 is the absolute majority of 538.') },
    { q: L('Wie viele Wahlmänner gibt es insgesamt im Electoral College?', 'How many electors are in the Electoral College?'),
      a: [L('435'), L('500'), L('538'), L('600')], c: 2,
      x: L('435 Abgeordnete + 100 Senatoren + 3 für Washington, D.C.', '435 representatives + 100 senators + 3 for Washington, D.C.') },
    { q: L('Wie lange dauert eine Amtszeit des Präsidenten?', 'How long is a presidential term?'),
      a: [L('4 Jahre', '4 years'), L('5 Jahre', '5 years'), L('6 Jahre', '6 years'), L('8 Jahre', '8 years')], c: 0,
      x: L('Gewählt wird alle vier Jahre.', 'Elections are held every four years.') },
    { q: L('Wie oft darf man höchstens zum Präsidenten gewählt werden?', 'How many times can a person be elected President?'),
      a: [L('Einmal', 'Once'), L('Zweimal', 'Twice'), L('Dreimal', 'Three times'), L('Unbegrenzt', 'Unlimited')], c: 1,
      x: L('Das regelt der 22. Verfassungszusatz von 1951.', 'The 22nd Amendment (1951) sets this limit.') },
    { q: L('Wann ist in den USA Wahltag?', 'When is Election Day in the US?'),
      a: [L('Am Dienstag nach dem ersten Montag im November', 'The Tuesday after the first Monday in November'),
          L('Am ersten Sonntag im November', 'The first Sunday in November'),
          L('Am 4. Juli', 'On July 4th'), L('Am 1. Januar', 'On January 1st')], c: 0,
      x: L('Diese Regel gilt seit 1845.', 'This rule has been in place since 1845.') },
    { q: L('An welchem Tag wird der neue Präsident vereidigt?', 'On which day is the new President sworn in?'),
      a: [L('20. Januar', 'January 20'), L('1. Januar', 'January 1'), L('4. Juli', 'July 4'), L('3. November', 'November 3')], c: 0,
      x: L('Seit 1937 ist der 20. Januar der „Inauguration Day“.', 'Since 1937, January 20 has been Inauguration Day.') },
    { q: L('Welcher Bundesstaat hat die meisten Wahlmänner?', 'Which state has the most electoral votes?'),
      a: [L('Texas'), L('Kalifornien', 'California'), L('Florida'), L('New York')], c: 1,
      x: L('Kalifornien hat 54 Wahlmänner.', 'California has 54 electoral votes.') },
    { q: L('Wer war der erste Präsident der USA?', 'Who was the first President of the United States?'),
      a: [L('Thomas Jefferson'), L('George Washington'), L('Abraham Lincoln'), L('John Adams')], c: 1,
      x: L('George Washington regierte von 1789 bis 1797.', 'George Washington served from 1789 to 1797.') },
    { q: L('Wo wohnt und arbeitet der Präsident?', 'Where does the President live and work?'),
      a: [L('Im Kapitol', 'In the Capitol'), L('Im Pentagon', 'In the Pentagon'), L('Im Weißen Haus', 'In the White House'), L('Im Empire State Building', 'In the Empire State Building')], c: 2,
      x: L('1600 Pennsylvania Avenue, Washington, D.C.', '1600 Pennsylvania Avenue, Washington, D.C.') },
    { q: L('Welches Tier ist das Symbol der Republikaner?', 'Which animal is the symbol of the Republicans?'),
      a: [L('Esel', 'Donkey'), L('Elefant', 'Elephant'), L('Adler', 'Eagle'), L('Bär', 'Bear')], c: 1,
      x: L('Der Elefant ist das Symbol der „Grand Old Party“.', 'The elephant stands for the „Grand Old Party“.') },
    { q: L('Welches Tier ist das Symbol der Demokraten?', 'Which animal is the symbol of the Democrats?'),
      a: [L('Esel', 'Donkey'), L('Elefant', 'Elephant'), L('Bison'), L('Pferd', 'Horse')], c: 0,
      x: L('Der Esel steht seit dem 19. Jahrhundert für die Demokraten.', 'The donkey has represented the Democrats since the 19th century.') },
    { q: L('Wer machte den Elefanten mit seinen Karikaturen zum Symbol der Republikaner?', 'Whose cartoons made the elephant the symbol of the Republicans?'),
      a: [L('Thomas Nast'), L('Walt Disney'), L('Andy Warhol'), L('Norman Rockwell')], c: 0,
      x: L('Thomas Nast wurde 1840 in Landau in der Pfalz geboren.', 'Thomas Nast was born in 1840 in Landau, Germany.') },
    { q: L('Wie heißt der Tag, an dem viele Staaten gleichzeitig Vorwahlen abhalten?', 'What is the day called when many states hold primaries at once?'),
      a: [L('Super Tuesday'), L('Black Friday'), L('Election Monday'), L('Primary Sunday')], c: 0,
      x: L('Am Super Tuesday wird in über einem Dutzend Staaten gewählt.', 'On Super Tuesday more than a dozen states vote.') },
    { q: L('Wo finden traditionell die allerersten Vorwahlen statt?', 'Where are the very first primary contests traditionally held?'),
      a: [L('Iowa'), L('Texas'), L('Kalifornien', 'California'), L('Alaska')], c: 0,
      x: L('Die „Iowa Caucuses“ eröffnen traditionell den Vorwahlkampf.', 'The Iowa caucuses traditionally kick off the primary season.') },
    { q: L('Was passiert, wenn kein Kandidat 270 Wahlmänner bekommt?', 'What happens if no candidate gets 270 electoral votes?'),
      a: [L('Es wird gelost', 'They draw lots'), L('Das Repräsentantenhaus wählt den Präsidenten', 'The House of Representatives picks the President'),
          L('Es gibt eine komplett neue Wahl', 'A completely new election is held'), L('Der Oberste Gerichtshof entscheidet', 'The Supreme Court decides')], c: 1,
      x: L('Dabei hat jede Staaten-Delegation genau eine Stimme.', 'Each state delegation gets exactly one vote.') },
    { q: L('Wer wird Präsident, wenn der Präsident zurücktritt?', 'Who becomes President if the President resigns?'),
      a: [L('Der Vizepräsident', 'The Vice President'), L('Der Außenminister', 'The Secretary of State'),
          L('Der Oberste Richter', 'The Chief Justice'), L('Der Sprecher des Repräsentantenhauses', 'The Speaker of the House')], c: 0,
      x: L('So geschah es 1974, als Gerald Ford auf Richard Nixon folgte.', 'That happened in 1974 when Gerald Ford succeeded Richard Nixon.') },
    { q: L('Wie heißt der Parteitag, auf dem der Kandidat offiziell nominiert wird?', 'What is the event called where the nominee is officially chosen?'),
      a: [L('National Convention'), L('Super Bowl'), L('State of the Union'), L('Town Hall')], c: 0,
      x: L('Dort stimmen die Delegierten aus allen Staaten ab.', 'There, delegates from every state cast their votes.') },
    { q: L('Was ist ein „Swing State“?', 'What is a “swing state”?'),
      a: [L('Ein Staat mit vielen Spielplätzen', 'A state with lots of playgrounds'),
          L('Ein Staat, in dem mal die eine, mal die andere Partei gewinnt', 'A state that can go either way'),
          L('Der Staat mit den meisten Einwohnern', 'The most populous state'),
          L('Ein Staat ohne Wahlrecht', 'A state without voting rights')], c: 1,
      x: L('Pennsylvania, Michigan oder Georgia sind typische Swing States.', 'Pennsylvania, Michigan and Georgia are typical swing states.') },
    { q: L('Wie viele Bundesstaaten haben die USA?', 'How many states does the US have?'),
      a: [L('48'), L('50'), L('51'), L('52')], c: 1,
      x: L('Die letzten beiden waren 1959 Alaska und Hawaii.', 'The last two were Alaska and Hawaii in 1959.') },
    { q: L('Wie viele Wahlmänner hat die Hauptstadt Washington, D.C.?', 'How many electoral votes does Washington, D.C. have?'),
      a: [L('0'), L('1'), L('3'), L('5')], c: 2,
      x: L('Seit dem 23. Verfassungszusatz von 1961 sind es 3.', 'Since the 23rd Amendment (1961) it has 3.') },
    { q: L('Welcher Präsident war am längsten im Amt?', 'Which President served the longest?'),
      a: [L('Franklin D. Roosevelt'), L('George Washington'), L('Ronald Reagan'), L('Barack Obama')], c: 0,
      x: L('Er wurde viermal gewählt und regierte 12 Jahre.', 'He was elected four times and served 12 years.') },
    { q: L('Wie heißt das Flugzeug des Präsidenten?', 'What is the President’s plane called?'),
      a: [L('Air Force One'), L('Eagle One'), L('Liberty Jet'), L('USA Express')], c: 0,
      x: L('So heißt jedes Flugzeug der Air Force, in dem der Präsident sitzt.', 'That’s the call sign of any Air Force plane carrying the President.') },
    { q: L('Welche zwei Staaten vergeben ihre Wahlmänner nicht nach „Winner takes all“?', 'Which two states don’t use “winner takes all”?'),
      a: [L('Maine und Nebraska', 'Maine and Nebraska'), L('Texas und Ohio', 'Texas and Ohio'),
          L('Kalifornien und New York', 'California and New York'), L('Alaska und Hawaii', 'Alaska and Hawaii')], c: 0,
      x: L('Dort gibt es zusätzlich Stimmen pro Wahlbezirk.', 'They also award votes by congressional district.') },
    { q: L('Wer war der erste afroamerikanische Präsident?', 'Who was the first African-American President?'),
      a: [L('Barack Obama'), L('Joe Biden'), L('Bill Clinton'), L('Jimmy Carter')], c: 0,
      x: L('Obama regierte von 2009 bis 2017.', 'Obama served from 2009 to 2017.') },
    { q: L('Wie heißt die jährliche Rede des Präsidenten vor dem Kongress?', 'What is the President’s annual address to Congress called?'),
      a: [L('State of the Union'), L('Gettysburg Address'), L('Inaugural Ball'), L('Capitol Speech')], c: 0,
      x: L('Sie heißt „Rede zur Lage der Nation“.', 'It reports on the state of the nation.') },
    { q: L('Wer wählt den Präsidenten offiziell?', 'Who formally elects the President?'),
      a: [L('Das Electoral College', 'The Electoral College'), L('Der Senat', 'The Senate'),
          L('Der Oberste Gerichtshof', 'The Supreme Court'), L('Die Gouverneure', 'The governors')], c: 0,
      x: L('Die Wahlmänner stimmen im Dezember ab.', 'The electors cast their votes in December.') },
    { q: L('In welchem Jahr wurde die US-Verfassung unterzeichnet?', 'In which year was the US Constitution signed?'),
      a: [L('1776'), L('1787'), L('1812'), L('1865')], c: 1,
      x: L('1776 war die Unabhängigkeitserklärung.', '1776 was the Declaration of Independence.') },
    { q: L('Wie viele Senatoren hat jeder Bundesstaat?', 'How many senators does each state have?'),
      a: [L('1'), L('2'), L('3'), L('Je nach Einwohnerzahl', 'Depends on population')], c: 1,
      x: L('100 Senatoren für 50 Staaten.', '100 senators for 50 states.') },
    { q: L('Wie viele Abgeordnete hat das Repräsentantenhaus?', 'How many members does the House of Representatives have?'),
      a: [L('100'), L('270'), L('435'), L('538')], c: 2,
      x: L('Die Zahl ist seit 1913 festgelegt.', 'The number has been fixed since 1913.') },
    { q: L('Wie berechnet sich die Zahl der Wahlmänner eines Staates?', 'How is a state’s number of electors calculated?'),
      a: [L('Senatoren + Abgeordnete', 'Senators + Representatives'), L('Nach der Fläche', 'By area'),
          L('Jeder Staat hat 10', 'Every state has 10'), L('Per Losverfahren', 'By lottery')], c: 0,
      x: L('Darum hat jeder Staat mindestens 3 Wahlmänner.', 'That’s why every state has at least 3 electors.') },
    { q: L('Wer ist auf der 1-Dollar-Note abgebildet?', 'Who is on the one-dollar bill?'),
      a: [L('George Washington'), L('Abraham Lincoln'), L('Thomas Jefferson'), L('Benjamin Franklin')], c: 0,
      x: L('Lincoln ist auf dem 5-Dollar-Schein.', 'Lincoln is on the five-dollar bill.') },
    { q: L('Was ist eine „Lame Duck“?', 'What is a “lame duck”?'),
      a: [L('Ein Präsident, dessen Nachfolger schon gewählt ist', 'A President whose successor has already been elected'),
          L('Ein Haustier im Weißen Haus', 'A White House pet'),
          L('Eine schlechte Wahlkampfrede', 'A bad campaign speech'), L('Ein verlorener Bundesstaat', 'A lost state')], c: 0,
      x: L('Die „lahme Ente“ regiert noch bis zum 20. Januar.', 'The lame duck stays in office until January 20.') },
    { q: L('Welche Farbe steht in den USA für die Republikaner?', 'Which colour stands for the Republicans?'),
      a: [L('Rot', 'Red'), L('Blau', 'Blue'), L('Grün', 'Green'), L('Gelb', 'Yellow')], c: 0,
      x: L('Darum spricht man von „Red States“ und „Blue States“.', 'Hence “red states” and “blue states”.') },
    { q: L('Wer war Präsident während des Amerikanischen Bürgerkriegs?', 'Who was President during the American Civil War?'),
      a: [L('Abraham Lincoln'), L('Ulysses S. Grant'), L('Andrew Jackson'), L('Theodore Roosevelt')], c: 0,
      x: L('Lincoln regierte von 1861 bis 1865.', 'Lincoln served from 1861 to 1865.') },
    { q: L('Der wievielte Präsident ist Donald Trump in seiner zweiten Amtszeit?', 'Which number President is Donald Trump in his second term?'),
      a: [L('45.', '45th'), L('46.', '46th'), L('47.', '47th'), L('48.', '48th')], c: 2,
      x: L('In seiner ersten Amtszeit war er der 45. Präsident.', 'In his first term he was the 45th President.') },
    { q: L('Aus welchem pfälzischen Dorf stammte Donald Trumps Großvater?', 'Which German village did Donald Trump’s grandfather come from?'),
      a: [L('Kallstadt'), L('Rothenburg'), L('Oberammergau'), L('Bad Dürkheim')], c: 0,
      x: L('Friedrich Trump wanderte 1885 aus Kallstadt aus.', 'Friedrich Trump emigrated from Kallstadt in 1885.') },
    { q: L('Wie heißt das berühmte Arbeitszimmer des Präsidenten?', 'What is the President’s famous office called?'),
      a: [L('Oval Office'), L('Square Room'), L('Situation Kitchen'), L('Lincoln Garage')], c: 0,
      x: L('Es liegt im Westflügel des Weißen Hauses.', 'It is in the West Wing of the White House.') },
    { q: L('Wie lange dauert es vom Wahltag bis zur Amtseinführung?', 'How long is it from Election Day to Inauguration?'),
      a: [L('Etwa 1 Woche', 'About 1 week'), L('Etwa 1 Monat', 'About 1 month'), L('Etwa 2,5 Monate', 'About 2.5 months'), L('Etwa 6 Monate', 'About 6 months')], c: 2,
      x: L('Von Anfang November bis zum 20. Januar.', 'From early November to January 20.') }
  ];

  /* -----------------------------------------------------------------------
     BREAKING NEWS – Ereigniskarten
     Wirkungen: steps, polls, money, skip, again, allPolls, leaderSteps, collect
     ----------------------------------------------------------------------- */
  PG.NEWS = [
    { icon: '📱', title: L('Dein TikTok-Video geht viral', 'Your TikTok goes viral'),
      text: L('Dein Tanz zum Wahlkampfsong hat 40 Millionen Aufrufe.', 'Your dance to the campaign song gets 40 million views.'), polls: 6 },
    { icon: '🎤', title: L('Versprecher im Live-Interview', 'Live interview blunder'),
      text: L('Du verwechselst Österreich mit Australien.', 'You mix up Austria and Australia.'), steps: -1, polls: -4 },
    { icon: '🌭', title: L('Hotdog-Wettessen gewonnen', 'Hot dog contest won'),
      text: L('Zwölf Hotdogs in zehn Minuten. Amerika ist beeindruckt.', 'Twelve hot dogs in ten minutes. America is impressed.'), polls: 3 },
    { icon: '🌙', title: L('Post um 3 Uhr nachts', 'Post at 3 a.m.'),
      text: L('Dein nächtlicher Social-Media-Post sorgt für Empörung.', 'Your late-night social media post causes outrage.'), polls: -5 },
    { icon: '💰', title: L('Milliardär spendet', 'Billionaire donates'),
      text: L('Ein Milliardär überweist dir zehn Millionen Dollar.', 'A billionaire wires you ten million dollars.'), money: 10 },
    { icon: '🧾', title: L('Steuerprüfung', 'Tax audit'),
      text: L('Deine Anwälte kosten ein Vermögen.', 'Your lawyers cost a fortune.'), money: -5 },
    { icon: '📺', title: L('Spott in der Late-Night-Show', 'Mocked on late-night TV'),
      text: L('Ein Comedian imitiert dich und ganz Amerika lacht.', 'A comedian impersonates you and all of America laughs.'), polls: -3 },
    { icon: '⭐', title: L('Hollywood-Star unterstützt dich', 'Hollywood star endorses you'),
      text: L('Ein Superstar trägt dein Wahlkampf-T-Shirt.', 'A superstar wears your campaign T-shirt.'), polls: 5, steps: 1 },
    { icon: '🌀', title: L('Helfer nach dem Hurrikan', 'Hurricane helper'),
      text: L('Du packst nach dem Hurrikan selbst beim Aufräumen mit an.', 'You personally help clean up after the hurricane.'), polls: 4 },
    { icon: '📉', title: L('Börsencrash!', 'Stock market crash!'),
      text: L('Die Börse stürzt ab. Alle Kandidaten verlieren 3 % in den Umfragen.', 'Markets plunge. Every candidate loses 3 % in the polls.'), allPolls: -3 },
    { icon: '🗞️', title: L('Große Zeitung empfiehlt dich', 'Major newspaper endorses you'),
      text: L('Die Redaktion schreibt: „Die beste Wahl für Amerika.“', 'The editorial board writes: “The best choice for America.”'), polls: 4 },
    { icon: '📧', title: L('E-Mail-Leak', 'Email leak'),
      text: L('Alte E-Mails von dir tauchen auf. Setze eine Runde aus.', 'Old emails of yours surface. Miss a turn.'), skip: 1 },
    { icon: '🚌', title: L('Panne mit dem Wahlkampfbus', 'Campaign bus breaks down'),
      text: L('Mitten im Nirgendwo in Nebraska. 2 Felder zurück.', 'In the middle of nowhere in Nebraska. 2 spaces back.'), steps: -2 },
    { icon: '✈️', title: L('Privatjet geliehen', 'Borrowed a private jet'),
      text: L('Ein Unterstützer leiht dir seinen Jet. 2 Felder vor.', 'A supporter lends you his jet. 2 spaces forward.'), steps: 2 },
    { icon: '🎲', title: L('Momentum!', 'Momentum!'),
      text: L('Die Stimmung kippt zu deinen Gunsten. Würfle nochmal!', 'The mood swings your way. Roll again!'), again: true },
    { icon: '🧢', title: L('Merch ausverkauft', 'Merch sold out'),
      text: L('Deine Kappen sind überall ausverkauft.', 'Your caps are sold out everywhere.'), money: 4 },
    { icon: '🗑️', title: L('Schmutzkampagne', 'Smear campaign'),
      text: L('Gegen den Spitzenreiter des Spiels läuft eine Schmutzkampagne. Er geht 2 Felder zurück.', 'A smear campaign hits the overall front-runner. They go back 2 spaces.'), leaderSteps: -2 },
    { icon: '✊', title: L('Gewerkschaft unterstützt dich', 'Union endorsement'),
      text: L('Die Arbeiter stehen hinter dir.', 'The workers are behind you.'), polls: 4, money: 3 },
    { icon: '🐶', title: L('Dein Hund beißt einen Reporter', 'Your dog bites a reporter'),
      text: L('Das Video läuft in Dauerschleife.', 'The clip runs on a loop.'), polls: -3 },
    { icon: '🏈', title: L('Perfekter erster Wurf', 'Perfect first pitch'),
      text: L('Dein Wurf zum Spielbeginn ist perfekt. Das Stadion jubelt.', 'Your ceremonial first throw is perfect. The stadium roars.'), polls: 3 },
    { icon: '🎁', title: L('Fairplay-Spende', 'Fair-play donation'),
      text: L('Alle Mitspieler spenden dir je 1 Mio. $.', 'Every other player donates 1 million $ to you.'), collect: 1 },
    { icon: '🤥', title: L('Fake News über dich', 'Fake news about you'),
      text: L('Ein erfundenes Gerücht verbreitet sich rasend schnell.', 'A made-up rumour spreads like wildfire.'), polls: -4 },
    { icon: '🗺️', title: L('Bundesstaaten verwechselt', 'Mixed up the states'),
      text: L('Du rufst in Ohio: „Hallo Iowa!“ 1 Feld zurück.', 'You shout “Hello Iowa!” in Ohio. 1 space back.'), steps: -1, polls: -3 },
    { icon: '🎻', title: L('Dinner mit Großspendern', 'Dinner with big donors'),
      text: L('Ein Abendessen für 50.000 $ pro Teller.', 'A dinner at 50,000 $ a plate.'), money: 6 },
    { icon: '📋', title: L('Wählerregistrierung boomt', 'Voter registration boom'),
      text: L('Deine Freiwilligen registrieren Tausende neue Wähler. 1 Feld vor.', 'Your volunteers register thousands of new voters. 1 space forward.'), polls: 3, steps: 1 }
  ];
})(window.PG);
