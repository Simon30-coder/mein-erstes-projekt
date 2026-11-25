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
     Jedes Brett ist in Reihen aufgebaut (immer 7 Spalten breit):
       ROW([...])            – eine Reihe mit bis zu 7 Feldern
       CONN(feld)            – ein Verbindungsfeld an der Seite (dann geht es andersherum weiter)
       FORK(split, A, B, merge) – Weggabelung: zwei Wege mit je 5 Feldern

     Feldtypen (type):
       start, plain, steps, gate, key, news, money, polls, again, skip,
       debate (TV-Debatte als Quiz-Duell), state (Bundesstaat), choice (Entscheidung), fork

     Wirkungen: steps (vor/zurück), money (Mio. $), polls (%), skip (aussetzen)
     choices: [Option A, Option B] – jede Option hat label + Wirkungen
     text = was passiert (mit Hintergrund), fact = „Wusstest du?“

     Regel: Zusätzliche Schritte nach vorne gibt es nur für Dinge, die man im
     echten Leben wirklich braucht, um Präsident zu werden.
     ----------------------------------------------------------------------- */
  PG.COLS = 7;

  const F = function (type, icon, title, text, extra) {
    return Object.assign({ type: type, icon: icon, title: title, text: text || null }, extra || {});
  };
  const CH = function (label, fx) { return Object.assign({ label: label }, fx || {}); };
  const NEWS = function () { return F('news', 'newspaper', L('Breaking News', 'Breaking News'), null); };
  const STATE = function (code) { return F('state', null, null, null, { state: code }); };
  const DEBATE = function (title, text, fact) { return F('debate', 'podium', title, text, { fact: fact }); };
  const ROW = function (fields) { return { kind: 'row', fields: fields }; };
  const CONN = function (f) { return { kind: 'conn', fields: [f] }; };
  const FORK = function (split, a, b, merge) { return { kind: 'fork', split: split, a: a, b: b, merge: merge }; };

  const BOARD_DEFS = [
    /* ===================== RUNDE 1: Voraussetzungen & Lebenslauf ===================== */
    {
      id: 1,
      title: L('Qualifikation', 'Qualification'),
      question: L('Bist du überhaupt qualifiziert, Präsident zu werden?', 'Are you even qualified to become President?'),
      intro: L(
        'Artikel II der Verfassung verlangt drei Dinge: in den USA geboren, mindestens 35 Jahre alt, 14 Jahre Wohnsitz in den USA. Danach baust du deinen Lebenslauf auf und meldest deine Kandidatur an.',
        'Article II of the Constitution demands three things: natural-born citizen, at least 35 years old, 14 years of US residence. Then you build your résumé and register your candidacy.'
      ),
      gate: 13,
      layout: [
        ROW([
          F('start', 'torch', L('Du willst Präsident werden', 'You want to become President'),
            L('Willkommen im Rennen! Zuerst prüft die Verfassung, ob du überhaupt antreten darfst.', 'Welcome to the race! First the Constitution checks whether you may run at all.'),
            { fact: L('Seit 1789 gab es 45 verschiedene Präsidenten. Grover Cleveland und Donald Trump zählen doppelt, weil sie zwei getrennte Amtszeiten hatten.', 'Since 1789 there have been 45 different presidents. Grover Cleveland and Donald Trump count twice because they served two separate terms.') }),
          F('steps', 'passport', L('Geboren in Kuba', 'Born in Cuba'),
            L('Nur wer als US-Bürger geboren wurde („natural born citizen“), darf Präsident werden. 1 Schritt zurück.', 'Only someone born a US citizen (a “natural born citizen”) may become President. 1 step back.'),
            { steps: -1, fact: L('Arnold Schwarzenegger war Gouverneur von Kalifornien, durfte aber nie Präsident werden: Er wurde in Österreich geboren.', 'Arnold Schwarzenegger was Governor of California but could never run for President: he was born in Austria.') }),
          F('polls', 'flag', L('Geboren in den USA', 'Born in the USA'),
            L('Du bist „natural born citizen“. Voraussetzung Nr. 1 erfüllt!', 'You are a natural-born citizen. Requirement no. 1 fulfilled!'),
            { polls: 2, fact: L('Martin Van Buren (1837) war der erste Präsident, der schon als US-Bürger geboren wurde. Alle vor ihm kamen noch als britische Untertanen zur Welt.', 'Martin Van Buren (1837) was the first President born a US citizen. Everyone before him was born a British subject.') }),
          F('steps', 'passport', L('Geboren in Mexiko', 'Born in Mexico'),
            L('Nicht in den USA geboren, also nicht wählbar. 3 Schritte zurück.', 'Not born in the USA, so not eligible. 3 steps back.'),
            { steps: -3 }),
          F('plain', 'palm', L('Geboren auf Hawaii', 'Born in Hawaii'),
            L('Hawaii ist seit 1959 ein US-Bundesstaat, also alles in Ordnung. Trotzdem wollen manche Leute deine Geburtsurkunde sehen. Du bleibst stehen.', 'Hawaii has been a US state since 1959, so you’re fine. Still, some people demand to see your birth certificate. You stay where you are.'),
            { fact: L('Barack Obama wurde 1961 in Honolulu geboren. Trotzdem behaupteten sogenannte „Birther“ jahrelang das Gegenteil.', 'Barack Obama was born in Honolulu in 1961. Even so, so-called “birthers” claimed otherwise for years.') }),
          F('steps', 'passport', L('Geboren im Iran', 'Born in Iran'),
            L('Nicht in den USA geboren, also nicht wählbar. 5 Schritte zurück.', 'Not born in the USA, so not eligible. 5 steps back.'),
            { steps: -5 }),
          F('polls', 'flag', L('Geboren in den USA', 'Born in the USA'),
            L('Geboren im Land der unbegrenzten Möglichkeiten. Voraussetzung erfüllt!', 'Born in the land of opportunity. Requirement fulfilled!'),
            { polls: 2 })
        ]),
        CONN(F('steps', 'cake', L('35 Jahre oder älter', '35 or older'),
          L('Du hast das Mindestalter von 35 Jahren erreicht. 6 Schritte vor!', 'You have reached the minimum age of 35. 6 steps forward!'),
          { steps: 6, fact: L('Der jüngste gewählte Präsident war John F. Kennedy mit 43 Jahren.', 'The youngest President ever elected was John F. Kennedy at 43.') })),
        ROW([
          F('steps', 'baby', L('Unter 35', 'Under 35'), L('Zu jung für das Weiße Haus! 2 Schritte zurück.', 'Too young for the White House! 2 steps back.'),
            { steps: -2, fact: L('Für den Senat reichen 30 Jahre, für das Repräsentantenhaus sogar 25.', 'For the Senate 30 is enough, for the House just 25.') }),
          F('steps', 'cake', L('35 Jahre oder älter', '35 or older'), L('Alt genug für das Amt. 4 Schritte vor!', 'Old enough for the job. 4 steps forward!'), { steps: 4 }),
          F('steps', 'noentry', L('Nope! Zu jung', 'Nope! Too young'), L('Die Verfassung sagt Nein. 4 Schritte zurück.', 'The Constitution says no. 4 steps back.'), { steps: -4 }),
          F('steps', 'noentry', L('Nope! Zu jung', 'Nope! Too young'), L('Komm in ein paar Jahren wieder. 5 Schritte zurück.', 'Come back in a few years. 5 steps back.'), { steps: -5 }),
          F('steps', 'cake', L('35 Jahre oder älter', '35 or older'), L('Alter passt. 1 Schritt vor!', 'Age checks out. 1 step forward!'), { steps: 1 }),
          F('gate', 'house', L('14 Jahre Wohnsitz', '14 years of residence'),
            L('Sperre! Hier muss jeder anhalten. Du musst 14 Jahre in den USA gewohnt haben: Würfle eine gerade Zahl (2, 4 oder 6), um weiterzuziehen.', 'Barrier! Everyone has to stop here. You must have lived in the US for 14 years: roll an even number (2, 4 or 6) to move on.'),
            { fact: L('Die 14 Jahre müssen nicht direkt vor der Wahl liegen: Herbert Hoover lebte vorher lange in China und London.', 'The 14 years don’t have to come right before the election: Herbert Hoover lived in China and London for years.') }),
          F('choice', 'moneybag', L('Du kommst aus einer reichen Familie', 'You come from a rich family'),
            L('Deine Eltern bieten dir an, den Start deiner Kampagne zu bezahlen. Aber viele Wähler mögen keine Kandidaten, die sich alles kaufen.', 'Your parents offer to pay for your campaign launch. But many voters dislike candidates who buy everything.'),
            { fact: L('Beide Roosevelts und John F. Kennedy stammten aus sehr reichen Familien.', 'Both Roosevelts and John F. Kennedy came from very wealthy families.'),
              choices: [CH(L('Familiengeld nehmen', 'Take the family money'), { money: 8, polls: -2 }), CH(L('„Ich schaffe das allein“', '“I’ll do it on my own”'), { polls: 3 })] })
        ]),
        CONN(F('choice', 'speech', L('Parteikollege sagt etwas Unangebrachtes', 'Party member says something inappropriate'),
          L('Ein Parteikollege hat sich im Fernsehen danebenbenommen. Jetzt fragen alle Reporter, was du davon hältst.', 'A fellow party member misbehaved on TV. Now every reporter asks what you think.'),
          { choices: [CH(L('Klar distanzieren', 'Distance yourself'), { polls: -3 }), CH(L('Ihn verteidigen', 'Defend him'), { steps: -1, money: 2 })] })),
        FORK(
          F('fork', 'signpost', L('Weggabelung: Dein Lebenslauf', 'Fork: your résumé'),
            L('Die meisten Präsidenten hatten vorher eine große Karriere. Wähle beim Weiterziehen deinen Weg: Militär oder Jura & Politik.', 'Most presidents had a big career first. Choose your path when you move on: military or law & politics.'),
            { fact: L('Mehr als die Hälfte aller Präsidenten war vorher beim Militär.', 'More than half of all presidents served in the military.') }),
          { label: L('Militär', 'Military'), fields: [
            F('polls', 'pillars', L('Offiziersschule West Point', 'West Point military academy'), L('Du schließt die berühmte Militärakademie ab.', 'You graduate from the famous military academy.'),
              { polls: 3, fact: L('Ulysses S. Grant und Dwight D. Eisenhower waren beide in West Point.', 'Ulysses S. Grant and Dwight D. Eisenhower both went to West Point.') }),
            F('choice', 'plane', L('Auslandseinsatz', 'Deployment abroad'), L('Deine Einheit wird ins Ausland geschickt. Gehst du mit?', 'Your unit is being deployed abroad. Do you go?'),
              { fact: L('John F. Kennedy wurde im Zweiten Weltkrieg als Kommandant eines Torpedoboots zum Kriegshelden.', 'John F. Kennedy became a war hero in World War II as commander of a torpedo boat.'),
                choices: [CH(L('Freiwillig mitgehen', 'Volunteer'), { skip: 1, polls: 6 }), CH(L('Stabsstelle in Washington', 'Staff job in Washington'), { polls: 2 })] }),
            F('polls', 'helmet', L('Du bist Veteran!', 'You are a veteran!'), L('Du hast deinem Land gedient. Das beeindruckt viele Wähler.', 'You served your country. Many voters are impressed.'),
              { polls: 6, fact: L('Dwight D. Eisenhower war im Zweiten Weltkrieg Oberbefehlshaber der Alliierten in Europa.', 'Dwight D. Eisenhower was Supreme Allied Commander in Europe in World War II.') }),
            NEWS(),
            F('polls', 'medal', L('Orden für Tapferkeit', 'Medal for bravery'), L('Du bekommst eine Auszeichnung für deinen Einsatz.', 'You are decorated for your service.'),
              { polls: 4, fact: L('George H. W. Bush war mit 18 Jahren einer der jüngsten Piloten der US-Marine.', 'George H. W. Bush was one of the youngest naval aviators at just 18.') })
          ] },
          { label: L('Jura & Politik', 'Law & politics'), fields: [
            F('money', 'gradcap', L('Jurastudium in Harvard', 'Law school at Harvard'), L('Die Studiengebühren sind teuer, aber der Abschluss öffnet Türen.', 'Tuition is expensive, but the degree opens doors.'),
              { money: -2, polls: 3, fact: L('Acht Präsidenten haben in Harvard studiert, mehr als an jeder anderen Uni.', 'Eight presidents studied at Harvard, more than at any other university.') }),
            F('money', 'scales', L('Du bist Anwalt', 'You are an attorney'), L('Du verdienst gut in einer großen Kanzlei.', 'You earn well at a big law firm.'),
              { money: 4, polls: 2, fact: L('Mehr als die Hälfte aller Präsidenten waren Anwälte, zum Beispiel Abraham Lincoln.', 'More than half of all presidents were lawyers, Abraham Lincoln among them.') }),
            F('polls', 'gavel', L('Staatsanwalt: großer Prozess gewonnen', 'Prosecutor: big trial won'), L('Du bringst einen bekannten Betrüger hinter Gitter.', 'You put a notorious fraudster behind bars.'),
              { polls: 4 }),
            NEWS(),
            F('money', 'cityhall', L('Zum Bürgermeister gewählt', 'Elected mayor'), L('Deine Stadt wählt dich. Jetzt hast du Erfahrung in der Verwaltung und Unterstützer.', 'Your city elects you. Now you have experience in office and supporters.'),
              { money: 2, polls: 3, fact: L('Grover Cleveland war Bürgermeister von Buffalo, dann Gouverneur von New York und schließlich Präsident.', 'Grover Cleveland was Mayor of Buffalo, then Governor of New York, and finally President.') })
          ] },
          F('money', 'telescope', L('Erkundungskomitee gegründet', 'Exploratory committee formed'),
            L('Bevor du offiziell kandidierst, testet ein „Exploratory Committee“, ob du genug Unterstützer hättest. Es darf schon Geld sammeln.', 'Before you officially run, an exploratory committee tests whether you’d have enough support. It may already raise money.'),
            { money: 4 })
        ),
        CONN(F('choice', 'tornado', L('Tornados in deiner Heimat', 'Tornadoes back home'),
          L('Tornados verwüsten deine Heimatregion und die Lokalregierung deiner Partei reagiert zu spät. Was machst du?', 'Tornadoes devastate your home region and your party’s local government reacts too late. What do you do?'),
          { fact: L('Wie Politiker auf Naturkatastrophen reagieren, beeinflusst ihre Umfragewerte stark, etwa nach Hurrikan Katrina 2005.', 'How politicians respond to disasters strongly affects their polls, as after Hurricane Katrina in 2005.'),
            choices: [CH(L('Sofort hinfahren und helfen', 'Go there and help'), { money: -2, polls: 3 }), CH(L('Aus der Ferne posten', 'Post from afar'), { steps: -1, polls: -3 })] })),
        ROW([
          F('money', 'dinner', L('Spendenessen in der Heimatstadt', 'Hometown fundraiser dinner'), L('Deine Nachbarn zahlen für ein Abendessen mit dir.', 'Your neighbours pay for a dinner with you.'),
            { money: 3, fact: L('Eine Einzelperson darf einem Kandidaten pro Wahl höchstens 3.500 Dollar spenden (Stand 2025).', 'An individual may give a candidate at most 3,500 dollars per election (as of 2025).') }),
          F('choice', 'camera', L('Peinliche Fotos aus der Studienzeit', 'Embarrassing college photos'), L('Alte Partyfotos von dir tauchen im Internet auf.', 'Old party pictures of you surface online.'),
            { choices: [CH(L('Öffentlich entschuldigen', 'Apologise publicly'), { polls: -3 }), CH(L('Als Jugendsünde abtun', 'Brush it off'), { steps: -2 })] }),
          DEBATE(L('Podiumsdiskussion im Rathaus', 'Town hall panel'), L('Du diskutierst mit einem Rivalen vor Publikum.', 'You debate a rival in front of an audience.'),
            L('Bei einer „Town Hall“ stellen normale Bürger die Fragen, nicht Journalisten.', 'At a town hall, ordinary citizens ask the questions, not journalists.')),
          NEWS(),
          F('steps', 'quill', L('Unterschriften für den Stimmzettel', 'Signatures for the ballot'),
            L('Ohne genug Unterschriften kommst du in vielen Staaten gar nicht auf den Stimmzettel. Geschafft! 2 Schritte vor.', 'Without enough signatures you can’t even get on the ballot in many states. Done! 2 steps forward.'),
            { steps: 2 }),
          F('choice', 'document', L('Deine Steuererklärung', 'Your tax returns'), L('Journalisten wollen deine Steuererklärung sehen.', 'Journalists want to see your tax returns.'),
            { fact: L('Seit den 1970er-Jahren veröffentlichen fast alle Kandidaten freiwillig ihre Steuererklärung. Pflicht ist das nicht.', 'Since the 1970s almost every candidate has released their tax returns voluntarily. It isn’t required.'),
              choices: [CH(L('Veröffentlichen', 'Release them'), { polls: 3 }), CH(L('Geheim halten', 'Keep them secret'), { polls: -2, money: 3 })] }),
          F('money', 'coins', L('Kleinspenden-Welle', 'Small-donor wave'), L('Tausende Fans spenden je 20 oder 30 Dollar über deine Website.', 'Thousands of fans donate 20 or 30 dollars each on your website.'),
            { money: 4, fact: L('Bernie Sanders sammelte 2016 Millionen Kleinspenden, im Schnitt 27 Dollar.', 'In 2016 Bernie Sanders collected millions of small donations averaging 27 dollars.') })
        ]),
        CONN(F('steps', 'clipboard', L('Bei der Wahlbehörde angemeldet', 'Registered with the FEC'),
          L('Wer mehr als 5.000 Dollar sammelt, muss sich bei der Bundeswahlkommission (FEC) als Kandidat anmelden. Erledigt! 1 Schritt vor.', 'Anyone raising more than 5,000 dollars must register as a candidate with the Federal Election Commission. Done! 1 step forward.'),
          { steps: 1 })),
        ROW([
          F('key', 'megaphone', L('Kandidatur angekündigt!', 'Candidacy announced!'),
            L('Du verkündest vor jubelnden Anhängern: „Ich kandidiere für das Amt des Präsidenten!“ Weiter zu Runde 2.', 'You announce to cheering supporters: “I am running for President!” On to round 2.'))
        ])
      ]
    },

    /* ===================== RUNDE 2: Vorwahlen bis Parteitag ===================== */
    {
      id: 2,
      title: L('Nominierung', 'Nomination'),
      question: L('Wirst du Präsidentschaftskandidat deiner Partei?', 'Will you become your party’s presidential nominee?'),
      intro: L(
        'Die Vorwahlen beginnen: In Caucuses und Primaries sammelst du Delegierte. Wer die Mehrheit hat, wird auf dem Nationalen Parteitag zum Kandidaten gekürt.',
        'The primaries begin: in caucuses and primaries you collect delegates. Whoever has the majority is crowned nominee at the National Convention.'
      ),
      layout: [
        ROW([
          F('start', 'rosette', L('Kandidat aus deinem Bundesstaat', 'Candidate from your state'),
            L('Dein Heimatstaat {home} schickt dich ins Rennen um die Nominierung.', 'Your home state {home} sends you into the race for the nomination.'),
            { fact: L('Jede Partei bestimmt ihren Kandidaten in Vorwahlen in allen 50 Staaten.', 'Each party picks its nominee in primaries across all 50 states.') }),
          F('choice', 'hotdog', L('Iowa State Fair', 'Iowa State Fair'), L('Vor dem ersten Caucus besuchen alle Kandidaten die Landwirtschaftsmesse in Iowa. Was isst du vor den Kameras?', 'Before the first caucus every candidate visits the Iowa State Fair. What do you eat in front of the cameras?'),
            { fact: L('Frittiertes am Stiel vor laufender Kamera zu essen ist in Iowa eine Tradition für Kandidaten.', 'Eating deep-fried food on a stick on camera is a candidate tradition in Iowa.'),
              choices: [CH(L('Frittierte Butter am Stiel', 'Deep-fried butter on a stick'), { polls: 4, money: -1 }), CH(L('Lieber Spenden sammeln', 'Raise money instead'), { money: 3 })] }),
          NEWS(),
          F('polls', 'handshake', L('Mächtige Freunde empfehlen dich', 'Powerful friends recommend you'), L('Bekannte Senatoren und Gouverneure sprechen sich öffentlich für dich aus.', 'Well-known senators and governors publicly endorse you.'),
            { polls: 5, fact: L('Solche Unterstützungserklärungen („Endorsements“) helfen vor allem unbekannten Kandidaten.', 'Endorsements help unknown candidates the most.') }),
          F('choice', 'microphone', L('Einladung in eine Late-Night-Show', 'Late-night show invitation'), L('Eine bekannte Late-Night-Show lädt dich ein. Am selben Abend wäre aber auch ein Spendendinner.', 'A famous late-night show invites you. But there’s a fundraising dinner the same evening.'),
            { fact: L('Bill Clinton spielte 1992 in einer Late-Night-Show Saxofon und wurde damit bei jungen Wählern bekannt.', 'In 1992 Bill Clinton played the saxophone on late-night TV and won over young voters.'),
              choices: [CH(L('In die Show gehen', 'Do the show'), { polls: 5 }), CH(L('Zum Spendendinner', 'Go to the dinner'), { money: 4 })] }),
          F('choice', 'chartdown', L('Der Präsident macht deine Partei unbeliebt', 'The President makes your party unpopular'), L('Der amtierende Präsident aus deiner Partei hat miese Umfragewerte. Wie gehst du damit um?', 'The sitting President from your party has terrible approval ratings. How do you handle it?'),
            { choices: [CH(L('Vom Präsidenten distanzieren', 'Distance yourself'), { polls: -3 }), CH(L('Loyal bleiben', 'Stay loyal'), { steps: -1, money: 3 })] }),
          F('steps', 'ballotbox', L('Sieg in New Hampshire', 'New Hampshire win'), L('Du gewinnst die erste Primary und damit die ersten Delegierten. 2 Schritte vor!', 'You win the first primary and your first delegates. 2 steps forward!'),
            { steps: 2, fact: L('New Hampshire hat sogar per Landesgesetz festgelegt, dass es die erste Primary abhält.', 'New Hampshire even has a state law saying it holds the first primary.') })
        ]),
        CONN(DEBATE(L('Vorwahl-Debatte', 'Primary debate'), L('Die Kandidaten deiner Partei streiten im Fernsehen.', 'Your party’s candidates clash on TV.'),
          L('2015 standen bei einer Debatte der Republikaner zehn Kandidaten gleichzeitig auf der Bühne.', 'In 2015 ten Republican candidates shared one debate stage.'))),
        FORK(
          F('fork', 'signpost', L('Weggabelung: Deine Vorwahl-Strategie', 'Fork: your primary strategy'),
            L('Wie finanzierst du den Vorwahlkampf? Graswurzel heißt viele kleine Unterstützer, Großspender heißt viel Geld, aber auch mehr Skandale.', 'How do you fund the primaries? Grassroots means many small supporters, big donors means lots of money but more scandals.'),
            { fact: L('Seit dem Urteil „Citizens United“ (2010) dürfen Super PACs unbegrenzt Geld sammeln.', 'Since the Citizens United ruling (2010), Super PACs may raise unlimited money.') }),
          { label: L('Graswurzel', 'Grassroots'), fields: [
            F('polls', 'door', L('Freiwillige klopfen an Türen', 'Volunteers knock on doors'), L('Hunderte Freiwillige reden an der Haustür mit Wählern.', 'Hundreds of volunteers talk to voters on their doorsteps.'), { polls: 4 }),
            F('money', 'coins', L('Kleinspenden-Welle', 'Small-donor wave'), L('Nach deiner Rede spenden Tausende kleine Beträge.', 'After your speech thousands give small amounts.'), { money: 4 }),
            F('money', 'cap', L('Merch ausverkauft', 'Merch sold out'), L('Deine Wahlkampf-Kappen sind überall ausverkauft. Jeder Kauf ist eine Spende an deine Kampagne.', 'Your campaign caps are sold out everywhere. Every purchase is a donation to your campaign.'),
              { money: 3, fact: L('Wer im Wahlkampf-Shop eine Kappe kauft, gilt rechtlich als Spender.', 'Buying a cap from the campaign store legally counts as a donation.') }),
            NEWS(),
            F('polls', 'bus', L('Bus-Tour durch Kleinstädte', 'Bus tour through small towns'), L('Du besuchst Orte, in die sonst nie ein Kandidat kommt.', 'You visit towns no candidate ever comes to.'),
              { polls: 3, fact: L('John McCain nannte seinen Wahlkampfbus im Jahr 2000 „Straight Talk Express“.', 'In 2000 John McCain called his campaign bus the “Straight Talk Express”.') })
          ] },
          { label: L('Großspender', 'Big donors'), fields: [
            F('money', 'safe', L('Super PAC gegründet', 'Super PAC launched'), L('Ein Super PAC sammelt unbegrenzt Geld für dich.', 'A Super PAC raises unlimited money for you.'), { money: 8 }),
            F('money', 'champagne', L('Spendengala in Hollywood', 'Hollywood fundraising gala'), L('Stars zahlen viel Geld für ein Foto mit dir.', 'Stars pay a fortune for a photo with you.'), { money: 6 }),
            F('choice', 'spy', L('Affäre mit einem chinesischen Spion', 'Affair with a Chinese spy'), L('Herausgekommen: Du hattest eine Affäre mit einem chinesischen Spion. Riesenskandal!', 'It’s out: you had an affair with a Chinese spy. Huge scandal!'),
              { fact: L('Gary Hart musste 1987 wegen einer Affäre aus dem Rennen aussteigen, obwohl er Favorit war.', 'In 1987 Gary Hart had to quit the race over an affair, although he was the front-runner.'),
                choices: [CH(L('Krisen-PR bezahlen', 'Pay for crisis PR'), { money: -8, steps: -3, polls: -5 }), CH(L('Aussitzen', 'Sit it out'), { steps: -6, polls: -10 })] }),
            F('skip', 'gavel', L('Ethik-Untersuchung', 'Ethics investigation'), L('Ein Ausschuss prüft, woher deine Großspenden kommen. Setze eine Runde aus.', 'A committee investigates where your big donations come from. Miss a turn.'), {}),
            F('choice', 'tophat', L('Dinner mit einem Milliardär', 'Dinner with a billionaire'), L('Ein Milliardär will dich unterstützen, erwartet aber Gefallen.', 'A billionaire wants to back you but expects favours.'),
              { fact: L('Michael Bloomberg gab 2020 rund eine Milliarde Dollar aus eigener Tasche für seine Vorwahlkampagne aus.', 'In 2020 Michael Bloomberg spent about a billion dollars of his own money on his primary campaign.'),
                choices: [CH(L('Geld annehmen', 'Take the money'), { money: 8, polls: -3 }), CH(L('Ablehnen', 'Decline'), { polls: 2 })] })
          ] },
          F('again', 'lightning', L('Super Tuesday', 'Super Tuesday'),
            L('In über einem Dutzend Staaten wird am selben Tag gewählt. Du sammelst jede Menge Delegierte: Würfle nochmal!', 'More than a dozen states vote on the same day. You collect loads of delegates: roll again!'),
            { fact: L('Am Super Tuesday wird rund ein Drittel aller Delegierten vergeben.', 'About a third of all delegates are awarded on Super Tuesday.') })
        ),
        CONN(F('polls', 'scroll', L('Obama hilft bei deiner Rede', 'Obama helps with your speech'),
          L('Barack Obama hilft dir, eine überzeugende Rede für den Nationalen Parteitag zu schreiben.', 'Barack Obama helps you write a convincing speech for the National Convention.'),
          { polls: 6, fact: L('Obamas Rede auf dem Parteitag 2004 machte ihn über Nacht bekannt. Vier Jahre später war er Präsident.', 'Obama’s 2004 convention speech made him famous overnight. Four years later he was President.') })),
        ROW([
          DEBATE(L('Letzte Vorwahl-Debatte', 'Final primary debate'), L('Nur noch zwei Kandidaten sind übrig.', 'Only two candidates are left.'),
            L('Die erste Fernsehdebatte überhaupt war 1960 zwischen Kennedy und Nixon.', 'The very first televised debate was Kennedy vs. Nixon in 1960.')),
          NEWS(),
          F('steps', 'trophy', L('Du gewinnst die Vorwahlen!', 'You win the primaries!'), L('Du hast die Mehrheit der Delegierten. Ab zum Parteitag: 4 Schritte vor!', 'You have the majority of delegates. Off to the convention: 4 steps forward!'),
            { steps: 4, polls: 3, fact: L('2024 brauchte man bei den Republikanern 1.215 Delegierte für die Nominierung.', 'In 2024 a Republican needed 1,215 delegates to win the nomination.') }),
          F('polls', 'balloons', L('Ballons und Konfetti', 'Balloons and confetti'), L('Deine Anhänger feiern dich schon wie den Sieger.', 'Your supporters already celebrate you like the winner.'),
            { polls: 3, fact: L('Am Ende jedes Parteitags fallen tausende Ballons von der Hallendecke.', 'At the end of every convention thousands of balloons drop from the ceiling.') }),
          NEWS(),
          F('polls', 'document', L('Parteiprogramm geschrieben', 'Party platform written'), L('Du setzt deine wichtigsten Ideen ins Parteiprogramm.', 'You get your key ideas into the party platform.'),
            { polls: 3, fact: L('Das Parteiprogramm heißt „Platform“, die einzelnen Punkte heißen „Planks“, also Bretter.', 'The party programme is called the platform, its individual points are called planks.') }),
          F('key', 'laurel', L('Sieg auf dem Nationalen Parteitag', 'You win the National Convention'),
            L('Die Delegierten haben entschieden: Du bist offiziell Präsidentschaftskandidat! Weiter zu Runde 3.', 'The delegates have decided: you are officially the presidential nominee! On to round 3.'))
        ])
      ]
    },

    /* ===================== RUNDE 3: Wahlkampf bis Wahltag ===================== */
    {
      id: 3,
      title: L('Wahlkampf', 'Campaign'),
      question: L('Gewinnst du die Wahl und ziehst ins Weiße Haus?', 'Will you win the election and move into the White House?'),
      intro: L(
        'Der eigentliche Wahlkampf! Auf jedem Bundesstaat hältst du eine Kundgebung: Schaffst du die Würfelprobe, gehören dir seine Wahlmänner. 270 von 538 brauchst du für den Sieg.',
        'The real campaign! On every state you hold a rally: pass the dice check and its electoral votes are yours. You need 270 of 538 to win.'
      ),
      layout: [
        ROW([
          F('start', 'flag', L('Präsidentschaftskandidat', 'Presidential nominee'),
            L('Jetzt beginnt der eigentliche Wahlkampf. Erobere Bundesstaaten und erreiche den Wahltag!', 'Now the real campaign begins. Win states and make it to Election Day!')),
          STATE('NV'),
          F('steps', 'duo', L('Vizepräsident ausgewählt', 'Running mate chosen'),
            L('Ohne Vizepräsidenten kein Wahlticket: Du stellst deinen „Running Mate“ vor. 2 Schritte vor!', 'No running mate, no ticket: you introduce your vice-presidential pick. 2 steps forward!'),
            { steps: 2, polls: 2, fact: L('Den Vizepräsidenten sucht sich der Kandidat selbst aus. Gewählt werden beide zusammen.', 'The nominee picks the running mate. Both are elected together.') }),
          NEWS(),
          F('choice', 'briefcase', L('Großspender wollen dich unterstützen', 'Big donors want to back you'), L('Reiche Spender bieten viel Geld. Viele Wähler finden das aber verdächtig.', 'Wealthy donors offer a lot of money. But many voters find that suspicious.'),
            { choices: [CH(L('Geld annehmen', 'Take the money'), { money: 10, polls: -2 }), CH(L('Ablehnen', 'Decline'), { polls: 3 })] }),
          STATE('TX'),
          F('steps', 'chartup', L('Hohe Inflation', 'High inflation'), L('Die Preise steigen und die Wähler sind sauer auf die Politik. 2 Schritte zurück.', 'Prices are rising and voters are angry at politicians. 2 steps back.'),
            { steps: -2, polls: -4, fact: L('Hohe Preise kosteten Jimmy Carter 1980 die Wiederwahl.', 'High prices cost Jimmy Carter re-election in 1980.') })
        ]),
        CONN(DEBATE(L('Erste TV-Debatte', 'First TV debate'), L('Millionen schauen zu, wie du gegen einen Rivalen antrittst.', 'Millions watch you face a rival.'),
          L('Rund 70 Millionen Menschen sahen 1960 die erste TV-Debatte zwischen Kennedy und Nixon.', 'About 70 million people watched the first TV debate between Kennedy and Nixon in 1960.'))),
        FORK(
          F('fork', 'signpost', L('Weggabelung: Rust Belt oder Sun Belt?', 'Fork: Rust Belt or Sun Belt?'),
            L('Wo machst du Wahlkampf? Im Rust Belt mit seinen alten Industriestaaten oder im wachsenden Sun Belt im Süden?', 'Where do you campaign? In the Rust Belt’s old industrial states or the growing Sun Belt in the south?'),
            { fact: L('Pennsylvania, Michigan und Wisconsin haben 2016, 2020 und 2024 die Wahl entschieden.', 'Pennsylvania, Michigan and Wisconsin decided the elections of 2016, 2020 and 2024.') }),
          { label: L('Rust Belt', 'Rust Belt'), fields: [
            STATE('PA'),
            F('polls', 'fist', L('Gewerkschaft unterstützt dich', 'Union endorsement'), L('Die Autoarbeiter-Gewerkschaft ruft zur Wahl für dich auf.', 'The autoworkers’ union calls on members to vote for you.'),
              { polls: 4, fact: L('In Michigan sind die Mitglieder der Autoarbeiter-Gewerkschaft UAW eine wichtige Wählergruppe.', 'In Michigan, members of the autoworkers’ union UAW are a key voting bloc.') }),
            STATE('MI'),
            F('polls', 'factory', L('Rede vor einer Fabrik', 'Speech at a factory'), L('Du versprichst neue Industrie-Jobs.', 'You promise new factory jobs.'),
              { polls: 3, fact: L('Der Rust Belt heißt so wegen der vielen stillgelegten, rostenden Fabriken.', 'The Rust Belt is named after its many closed, rusting factories.') }),
            STATE('WI')
          ] },
          { label: L('Sun Belt', 'Sun Belt'), fields: [
            STATE('AZ'),
            F('polls', 'tv', L('Werbung auf Spanisch', 'Ads in Spanish'), L('Du schaltest Werbespots für Latino-Wähler.', 'You run ads aimed at Latino voters.'),
              { polls: 3, fact: L('Fast ein Drittel der Menschen in Arizona sind Latinos.', 'Almost a third of Arizona’s population is Latino.') }),
            STATE('GA'),
            F('polls', 'clipboard', L('Wähler registrieren in Atlanta', 'Registering voters in Atlanta'), L('Deine Freiwilligen registrieren Tausende neue Wähler.', 'Your volunteers register thousands of new voters.'),
              { polls: 3, fact: L('Georgia wählte 2020 zum ersten Mal seit 1992 wieder einen Demokraten.', 'In 2020 Georgia voted for a Democrat for the first time since 1992.') }),
            STATE('NC')
          ] },
          F('polls', 'carriage', L('Du hast ein Enkelkind', 'You have a grandchild'), L('Süße Familienfotos gehen um die Welt.', 'Cute family photos go around the world.'), { polls: 4 })
        ),
        CONN(F('choice', 'rocket', L('Elon Musk will deine Kampagne finanzieren', 'Elon Musk wants to fund your campaign'),
          L('Elon Musk bietet dir Millionen an. Das Geld wäre riesig, aber er ist bei vielen Wählern umstritten.', 'Elon Musk offers you millions. The money would be huge, but he is controversial with many voters.'),
          { fact: L('Elon Musk gab 2024 mehr als 250 Millionen Dollar für den Wahlkampf aus.', 'Elon Musk spent more than 250 million dollars on the 2024 election.'),
            choices: [CH(L('Annehmen', 'Accept'), { money: 20, polls: -5 }), CH(L('Ablehnen', 'Decline'), { polls: 3 })] })),
        ROW([
          STATE('FL'),
          F('choice', 'bomb', L('Du willst einen Krieg mit dem Iran beginnen', 'You want to start a war with Iran'), L('Du hast angekündigt, den Iran anzugreifen. Die Wähler wollen keinen neuen Krieg.', 'You announced you would attack Iran. Voters don’t want a new war.'),
            { fact: L('Laut Verfassung kann nur der Kongress einen Krieg erklären, der Präsident ist aber Oberbefehlshaber.', 'Under the Constitution only Congress can declare war, but the President is commander-in-chief.'),
              choices: [CH(L('Dabei bleiben', 'Stick with it'), { steps: -4, polls: -8 }), CH(L('Zurückrudern', 'Back down'), { steps: -1, polls: -4 })] }),
          F('steps', 'map', L('Auf dem Stimmzettel in allen 50 Staaten', 'On the ballot in all 50 states'),
            L('Jeder Bundesstaat hat eigene Regeln. Du hast sie alle erfüllt und stehst überall auf dem Stimmzettel. 2 Schritte vor!', 'Every state has its own rules. You met them all and are on the ballot everywhere. 2 steps forward!'),
            { steps: 2, fact: L('In den USA organisiert jeder Bundesstaat seine Wahl selbst, mit eigenen Fristen und Regeln.', 'In the US every state runs its own election, with its own deadlines and rules.') }),
          F('polls', 'coffee', L('Frühstück im Diner', 'Breakfast at a diner'), L('Pancakes mit echten Wählern. Die Kameras lieben es.', 'Pancakes with real voters. The cameras love it.'), { polls: 3 }),
          STATE('OH'),
          F('choice', 'comb', L('Du hast gelbe Haare', 'You have yellow hair'), L('Deine Frisur ist Thema in jeder Talkshow.', 'Your hairdo is the talk of every talk show.'),
            { choices: [CH(L('Frisur behalten', 'Keep the hair'), { steps: -1 }), CH(L('Ab zum Friseur', 'Get a haircut'), { money: -2 })] }),
          F('news', 'pumpkin', L('October Surprise', 'October Surprise'), null,
            { fact: L('„October Surprise“ nennt man eine Enthüllung kurz vor der Wahl, die das Rennen noch drehen kann.', 'An “October surprise” is a late revelation that can still turn the race.') })
        ]),
        CONN(DEBATE(L('Zweite TV-Debatte', 'Second TV debate'), L('Die letzte große Debatte vor der Wahl.', 'The last big debate before the election.'),
          L('Präsidentschaftsdebatten gehören zu den meistgesehenen Sendungen des Jahres in den USA.', 'Presidential debates are among the most-watched broadcasts of the year in the US.'))),
        ROW([
          F('polls', 'moon', L('Dein Gegner ist schläfrig', 'Your opponent is sleepy'), L('Dein Gegner ist schläfrig und kann nicht richtig sprechen. Das hilft dir.', 'Your opponent is sleepy and can’t speak properly. That helps you.'), { polls: 5 }),
          STATE('NY'),
          F('steps', 'scissors', L('Gerrymandering!', 'Gerrymandered!'), L('Deine Hochburg wurde per Gerrymandering in Stücke geschnitten. 3 Schritte zurück.', 'Your stronghold has been gerrymandered to pieces. 3 steps back.'),
            { steps: -3, polls: -5, fact: L('Der Begriff stammt von Gouverneur Elbridge Gerry, dessen Wahlkreis 1812 aussah wie ein Salamander.', 'The term comes from Governor Elbridge Gerry, whose 1812 district looked like a salamander.') }),
          F('money', 'phone', L('Spenden-Telefonmarathon', 'Fundraising phone-a-thon'), L('Deine Freiwilligen telefonieren die ganze Nacht mit möglichen Spendern.', 'Your volunteers call potential donors all night long.'), { money: 5 }),
          STATE('IL'),
          F('choice', 'oil', L('Öl-Konzern bietet Unterstützung', 'Oil company offers support'), L('Ein Öl-Konzern will einen Super PAC für dich finanzieren. Umweltschützer wären empört.', 'An oil company wants to fund a Super PAC for you. Environmentalists would be furious.'),
            { fact: L('Firmen dürfen Kandidaten nicht direkt Geld geben, nur über PACs und Super PACs.', 'Companies may not give money to candidates directly, only through PACs and Super PACs.'),
              choices: [CH(L('Annehmen', 'Accept'), { money: 12, polls: -4 }), CH(L('Ablehnen', 'Decline'), { polls: 3 })] }),
          F('polls', 'stars', L('Kundgebung mit 50.000 Menschen', 'Rally with 50,000 people'), L('Das Stadion ist voll und die Bilder laufen auf allen Sendern.', 'The stadium is packed and the pictures are on every channel.'), { polls: 4 })
        ]),
        CONN(STATE('CA')),
        ROW([
          F('choice', 'folder', L('Du stehst in den Epstein-Akten', 'You are in the Epstein files'), L('Dein Name taucht in den Epstein-Akten auf. Die Presse spricht über nichts anderes.', 'Your name shows up in the Epstein files. The press talks about nothing else.'),
            { fact: L('Die Epstein-Akten sind Ermittlungsunterlagen über den 2019 gestorbenen Jeffrey Epstein.', 'The Epstein files are investigation records about Jeffrey Epstein, who died in 2019.'),
              choices: [CH(L('Teure Anwälte einschalten', 'Hire expensive lawyers'), { money: -15, steps: -4, polls: -8 }), CH(L('Aussitzen', 'Sit it out'), { steps: -10, polls: -15 })] }),
          F('polls', 'sunrise', L('Letzter Wahlkampftag', 'Final campaign day'), L('Du besuchst vier Swing States an einem einzigen Tag.', 'You visit four swing states in a single day.'), { polls: 3 }),
          F('key', 'eagle', L('Wahltag!', 'Election Day!'), L('Der Dienstag nach dem ersten Montag im November: Amerika wählt!', 'The Tuesday after the first Monday in November: America votes!'),
            { fact: L('Diese Regel für den Wahltag gilt seit 1845.', 'This Election Day rule has applied since 1845.') })
        ])
      ]
    }
  ];

  /* Bretter aufbauen: Felder durchnummerieren, Wege (next/prev) und Positionen im Raster festlegen */
  function buildBoard(def) {
    const C = PG.COLS;
    const fields = [];
    let r = 0, dir = 1, prevIds = [];
    function add(f, pos) {
      const id = fields.length;
      f.id = id; f.pos = pos; f.next = []; f.prev = [];
      fields.push(f);
      prevIds.forEach(function (pid) { fields[pid].next.push(id); f.prev.push(pid); });
      prevIds = [id];
      return id;
    }
    def.layout.forEach(function (seg) {
      if (seg.kind === 'row') {
        seg.fields.forEach(function (f, k) { add(f, { r: r, c: dir === 1 ? k : C - 1 - k, rs: 1 }); });
        r += 1;
      } else if (seg.kind === 'conn') {
        add(seg.fields[0], { r: r, c: dir === 1 ? C - 1 : 0, rs: 1 });
        r += 1;
        dir = -dir;
      } else if (seg.kind === 'fork') {
        const fid = add(seg.split, { r: r, c: dir === 1 ? 0 : C - 1, rs: 2 });
        seg.split.lanes = [seg.a.label, seg.b.label];
        const ends = [];
        [seg.a, seg.b].forEach(function (lane, li) {
          prevIds = [fid];
          lane.fields.forEach(function (f, k) { f.lane = li; f.laneLabel = lane.label; add(f, { r: r + li, c: dir === 1 ? 1 + k : C - 2 - k, rs: 1 }); });
          ends.push(prevIds[0]);
        });
        prevIds = ends;
        add(seg.merge, { r: r, c: dir === 1 ? C - 1 : 0, rs: 2 });
        r += 2;
      }
    });
    return { id: def.id, title: def.title, question: def.question, intro: def.intro, gate: def.gate, fields: fields, rows: r };
  }

  PG.BOARDS = BOARD_DEFS.map(buildBoard);

  /* Bundesstaaten, die als Felder auf dem Brett von Runde 3 liegen */
  PG.BOARD_STATES = PG.BOARDS[2].fields.filter(function (f) { return f.type === 'state'; }).map(function (f) { return f.state; });

  /** Würfelprobe für einen Bundesstaat: je mehr Wahlmänner, desto schwerer. Fremde Staaten +1. */
  PG.stateNeed = function (code, ownedByOther) {
    const ev = PG.STATES[code].ev;
    let need = ev <= 8 ? 3 : (ev <= 15 ? 4 : (ev <= 20 ? 5 : 6));
    if (ownedByOther) need = Math.min(6, need + 1);
    return need;
  };
  /** Preis für einen zweiten Versuch (Werbekampagne) in Mio. $ */
  PG.stateRetryCost = function (code) { return 2 + Math.ceil(PG.STATES[code].ev / 10); };

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
     Wirkungen: steps (nur zurück), polls, money, skip, allPolls, leaderSteps
     ----------------------------------------------------------------------- */
  PG.NEWS = [
    { icon: 'smartphone', title: L('Dein TikTok-Video geht viral', 'Your TikTok goes viral'),
      text: L('Ein Video von dir beim Tanzen auf einer Hochzeit hat 40 Millionen Aufrufe. Junge Wähler feiern dich.', 'A video of you dancing at a wedding gets 40 million views. Young voters love it.'), polls: 6,
      fact: L('Viele junge Amerikaner informieren sich vor allem über soziale Medien über Politik.', 'Many young Americans get their political news mainly from social media.') },
    { icon: 'microphone', title: L('Versprecher im Live-Interview', 'Live interview blunder'),
      text: L('Im Live-Interview verwechselst du Österreich mit Australien. Das Video läuft überall. 1 Feld zurück.', 'In a live interview you mix up Austria and Australia. The clip is everywhere. 1 space back.'), steps: -1, polls: -4 },
    { icon: 'hotdog', title: L('Grillfest am 4. Juli', 'Fourth of July cookout'),
      text: L('Am Unabhängigkeitstag grillst du mit Wählern im Park und gewinnst das Hotdog-Wettessen.', 'On Independence Day you grill with voters in the park and win the hot dog eating contest.'), polls: 3,
      fact: L('Beim berühmten Hotdog-Wettessen in New York schaffte der Rekordhalter 76 Hotdogs in 10 Minuten.', 'At New York’s famous hot dog eating contest the record holder ate 76 hot dogs in 10 minutes.') },
    { icon: 'speech', title: L('Wütender Post um 3 Uhr nachts', 'Angry post at 3 a.m.'),
      text: L('Du schreibst nachts einen wütenden Post über einen Journalisten. Am Morgen ist die Empörung groß.', 'At night you post an angry message about a journalist. By morning there’s outrage.'), polls: -5 },
    { icon: 'moneybag', title: L('Milliardär spendet an deinen Super PAC', 'Billionaire gives to your Super PAC'),
      text: L('Ein Milliardär überweist zehn Millionen Dollar an einen Super PAC, der für dich wirbt.', 'A billionaire wires ten million dollars to a Super PAC that campaigns for you.'), money: 10,
      fact: L('Super PACs dürfen unbegrenzt Geld sammeln, sich aber nicht direkt mit dem Kandidaten absprechen.', 'Super PACs may raise unlimited money but must not coordinate directly with the candidate.') },
    { icon: 'document', title: L('Steuerprüfung', 'Tax audit'),
      text: L('Die Steuerbehörde prüft deine Firma. Deine Anwälte kosten ein Vermögen.', 'The tax office audits your company. Your lawyers cost a fortune.'), money: -5 },
    { icon: 'tv', title: L('Spott in der Late-Night-Show', 'Mocked on late-night TV'),
      text: L('Ein Comedian imitiert dich jede Woche in „Saturday Night Live“. Ganz Amerika lacht über dich.', 'A comedian impersonates you every week on “Saturday Night Live”. All of America laughs at you.'), polls: -3,
      fact: L('„Saturday Night Live“ parodiert seit 1975 jeden Präsidentschaftskandidaten.', '“Saturday Night Live” has parodied every presidential candidate since 1975.') },
    { icon: 'stars', title: L('Ein Superstar unterstützt dich', 'A superstar endorses you'),
      text: L('Eine weltberühmte Sängerin ruft ihre Fans auf, für dich zu stimmen.', 'A world-famous singer calls on her fans to vote for you.'), polls: 5,
      fact: L('Nach einem Aufruf von Taylor Swift besuchten 2024 Hunderttausende die offizielle Seite zur Wählerregistrierung.', 'After a post by Taylor Swift in 2024, hundreds of thousands visited the official voter registration site.') },
    { icon: 'tornado', title: L('Du hilfst nach dem Hurrikan', 'You help after the hurricane'),
      text: L('Nach einem Hurrikan in Florida packst du beim Aufräumen selbst mit an. Die Bilder gehen um die Welt.', 'After a hurricane in Florida you help with the clean-up yourself. The pictures go around the world.'), polls: 4 },
    { icon: 'chartdown', title: L('Börsencrash!', 'Stock market crash!'),
      text: L('Die Börse stürzt ab und die Menschen haben Angst um ihr Geld. Alle Kandidaten verlieren 3 % in den Umfragen.', 'The stock market crashes and people fear for their savings. Every candidate loses 3% in the polls.'), allPolls: -3,
      fact: L('Wirtschaftskrisen schaden meist der Partei des amtierenden Präsidenten, wie 2008.', 'Economic crises usually hurt the sitting President’s party, as in 2008.') },
    { icon: 'newspaper', title: L('Große Zeitung empfiehlt dich', 'Major newspaper endorses you'),
      text: L('Die Redaktion schreibt: „Die beste Wahl für Amerika.“', 'The editorial board writes: “The best choice for America.”'), polls: 4,
      fact: L('Einige große Zeitungen wie die Washington Post geben seit 2024 keine Wahlempfehlung mehr ab.', 'Some major newspapers such as the Washington Post stopped endorsing candidates in 2024.') },
    { icon: 'envelope', title: L('E-Mail-Leak', 'Email leak'),
      text: L('Hacker veröffentlichen alte E-Mails von dir. Du musst einen Tag lang Fragen beantworten. Setze eine Runde aus.', 'Hackers publish old emails of yours. You spend a whole day answering questions. Miss a turn.'), skip: 1,
      fact: L('2016 bestimmten geleakte E-Mails wochenlang den Wahlkampf.', 'In 2016 leaked emails dominated the campaign for weeks.') },
    { icon: 'bus', title: L('Panne mit dem Wahlkampfbus', 'Campaign bus breaks down'),
      text: L('Dein Bus bleibt mitten im Nirgendwo in Nebraska liegen. Du verpasst zwei Auftritte. 2 Felder zurück.', 'Your bus breaks down in the middle of nowhere in Nebraska. You miss two events. 2 spaces back.'), steps: -2 },
    { icon: 'plane', title: L('Privatjet geliehen', 'Borrowed a private jet'),
      text: L('Ein Unterstützer leiht dir seinen Jet. So schaffst du drei Kundgebungen an einem Tag.', 'A supporter lends you his jet, so you manage three rallies in one day.'), polls: 3 },
    { icon: 'chartup', title: L('Momentum!', 'Momentum!'),
      text: L('Eine neue Umfrage sieht dich vorne. Plötzlich wollen alle zu den Gewinnern gehören.', 'A new poll puts you ahead. Suddenly everyone wants to back the winner.'), polls: 5 },
    { icon: 'cap', title: L('Merch ausverkauft', 'Merch sold out'),
      text: L('Deine Kappen und T-Shirts sind ausverkauft. Jeder Kauf zählt als Spende für deine Kampagne.', 'Your caps and T-shirts are sold out. Every purchase counts as a donation to your campaign.'), money: 4 },
    { icon: 'folder', title: L('Schmutzkampagne', 'Smear campaign'),
      text: L('Unbekannte verbreiten Gerüchte über den Spitzenreiter des Rennens. Er verliert 2 Felder.', 'Someone spreads rumours about the front-runner of the race. They lose 2 spaces.'), leaderSteps: -2 },
    { icon: 'fist', title: L('Gewerkschaft unterstützt dich', 'Union endorsement'),
      text: L('Eine große Gewerkschaft ruft ihre Mitglieder auf, dich zu wählen, und spendet für deinen Wahlkampf.', 'A big union calls on its members to vote for you and donates to your campaign.'), polls: 4, money: 3 },
    { icon: 'dog', title: L('Dein Hund beißt einen Reporter', 'Your dog bites a reporter'),
      text: L('Bei einem Fototermin schnappt dein Hund nach einem Reporter. Das Video läuft in Dauerschleife.', 'At a photo op your dog snaps at a reporter. The clip runs on a loop.'), polls: -3,
      fact: L('Fast alle Präsidenten hatten Haustiere im Weißen Haus, Calvin Coolidge sogar einen Waschbären.', 'Almost every President had pets in the White House; Calvin Coolidge even had a raccoon.') },
    { icon: 'baseball', title: L('Perfekter erster Wurf', 'Perfect first pitch'),
      text: L('Du wirfst den ersten Ball beim Baseball-Spiel, und zwar perfekt. Das Stadion jubelt.', 'You throw the ceremonial first pitch at a baseball game, and it’s perfect. The stadium roars.'), polls: 3,
      fact: L('Seit William Taft 1910 werfen Präsidenten traditionell den ersten Ball der Baseball-Saison.', 'Since William Taft in 1910, presidents have traditionally thrown the season’s first pitch.') },
    { icon: 'smartphone', title: L('Hackerangriff auf deine Kampagne', 'Hackers attack your campaign'),
      text: L('Hacker greifen deine Wählerdatenbank an. Die neue IT-Sicherheit ist teuer.', 'Hackers attack your voter database. New IT security is expensive.'), money: -3 },
    { icon: 'speech', title: L('Fake News über dich', 'Fake news about you'),
      text: L('Ein erfundenes Gerücht über dich verbreitet sich rasend schnell in sozialen Netzwerken.', 'A made-up rumour about you spreads like wildfire on social media.'), polls: -4 },
    { icon: 'map', title: L('Bundesstaaten verwechselt', 'Mixed up the states'),
      text: L('Du rufst in Ohio ins Mikrofon: „Hallo Iowa!“ Die Menge buht. 1 Feld zurück.', 'You shout “Hello Iowa!” at a rally in Ohio. The crowd boos. 1 space back.'), steps: -1, polls: -3 },
    { icon: 'dinner', title: L('Dinner mit Großspendern', 'Dinner with big donors'),
      text: L('Ein Abendessen in New York, 50.000 Dollar pro Teller.', 'A dinner in New York at 50,000 dollars a plate.'), money: 6 },
    { icon: 'clipboard', title: L('Wählerregistrierung boomt', 'Voter registration boom'),
      text: L('Deine Freiwilligen registrieren Tausende neue Wähler, die dich unterstützen.', 'Your volunteers register thousands of new voters who support you.'), polls: 4,
      fact: L('In den USA muss man sich vor der Wahl registrieren lassen, sonst darf man meist nicht wählen.', 'In the US you must register before the election, otherwise you usually can’t vote.') }
  ];
})(window.PG);
