# Der Weg ins Weiße Haus 🇺🇸

Ein digitales Brettspiel im Browser: Wer schafft es in drei Runden, Präsident der Vereinigten Staaten zu werden?

| Runde | Leitfrage | Inhalt |
|---|---|---|
| **I · Qualifikation** | Bist du überhaupt qualifiziert? | Geburtsort, Mindestalter 35, Sperre „14 Jahre Wohnsitz“, Vorwahl |
| **II · Nominierung** | Wirst du Kandidat deiner Partei? | Super Tuesday, TV-Debatte, Skandale, Nationaler Parteitag |
| **III · Wahlkampf** | Gewinnst du die Wahl? | Bundesstaaten erobern, 270 von 538 Wahlmännern, Wahlabend |

## Spielen

**Einfach `index.html` doppelklicken.** Das Spiel läuft direkt im Browser, ohne Installation und ohne Server.

- 1 bis 15 Spieler. Freie Plätze können mit KI-Gegnern aufgefüllt werden (0 KI = nur Menschen).
- Alle spielen abwechselnd an einem Gerät (PC, Tablet oder Handy).
- Sprache umschaltbar: Deutsch / Englisch (oben rechts).
- Das Spiel speichert nach jedem Zug automatisch. Über „Menü → Zum Hauptmenü“ kann man später weiterspielen.

## Regeln in Kürze

- Würfeln und so viele Felder vorziehen. Das Feld, auf dem du landest, wirkt: vor, zurück, Spenden, Umfragen, Quiz oder News.
- **Gelbe Sperre (Runde 1):** Jeder muss dort anhalten und braucht eine **gerade Zahl**, um weiterzuziehen.
- **Goldene Schlüsselfelder:** Das letzte Feld jeder Runde. Man muss **genau** darauf landen, sonst bleibt man stehen.
- **Bundesstaaten (Runde 3):** Landest du auf einem freien Staat, gehört er dir. Mit besseren Umfragewerten oder einer Werbekampagne kannst du ihn anderen abnehmen.
- **Berater:** Für 5 Mio. $ wirfst du zwei Würfel und nimmst den besseren.
- **Wahlabend:** Die US-Karte färbt sich Staat für Staat. Wer 270 Wahlmänner hat, gewinnt. Schafft das niemand, entscheidet wie in echt das Repräsentantenhaus (jeder Staat hat eine Stimme).

## Einstellungen (auch während des Spiels änderbar)

| Einstellung | Möglichkeiten |
|---|---|
| Spielende | **Gemeinsamer Wahlabend** (empfohlen) · **270-Hürde** · **Einfaches Rennen** |
| Extras | Wissens-Quiz · Breaking-News-Karten · Spenden & Umfragen (jeweils an/aus) |
| KI-Tempo | Gemütlich · Normal · Schnell |
| Ansicht | Brett wechselt automatisch zur Runde des Spielers am Zug |

## Selbst etwas ändern

| Was? | Wo? |
|---|---|
| Felder umstellen, Texte ändern, Schritte anpassen | `js/data.js` → `PG.BOARDS` |
| Neue Quizfragen | `js/data.js` → `PG.QUIZ` |
| Neue Breaking-News-Karten | `js/data.js` → `PG.NEWS` |
| Texte der Oberfläche (Knöpfe, Regeln …) | `js/i18n.js` |
| Farben und Schriften | `css/style.css` (ganz oben, `:root`) |

Jeder Text hat eine deutsche und eine englische Version, z. B. `L('Hohe Inflation', 'High inflation')`.

**Achtung bei Runde 1:** Die Schritte sind so gewählt, dass alle „35+“-Felder genau auf der Sperre (Feld 13) landen und „Du gewinnst die Vorwahl“ (+5) genau auf dem Schlüsselfeld. Wer dort Felder verschiebt, sollte die Schrittzahlen mit anpassen.

## Dateien

```
index.html        Grundgerüst der Seite
css/style.css     Gestaltung
js/data.js        Spielfelder, Bundesstaaten, Quiz, News
js/i18n.js        Texte Deutsch/Englisch
js/core.js        Hilfsfunktionen
js/audio.js       Soundeffekte (im Browser erzeugt)
js/board.js       Spielbrett und Figuren
js/ui.js          Startbildschirm, Karten, Würfel, Menüs
js/election.js    Wahlabend mit US-Karte
js/game.js        Spielablauf, Regeln, KI
```

## Online stellen (optional)

Mit **GitHub Pages** bekommt das Spiel eine eigene Internetadresse:
Repository → *Settings* → *Pages* → bei *Branch* den gewünschten Branch und `/ (root)` wählen → *Save*.
Nach ein bis zwei Minuten ist das Spiel unter `https://<dein-name>.github.io/mein-erstes-projekt/` erreichbar.
