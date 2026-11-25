# Wahlkampf-Fieber 🇺🇸

Ein digitales Brettspiel im Browser: Wer schafft es in drei Runden, Präsident der Vereinigten Staaten zu werden?

| Runde | Leitfrage | Inhalt |
|---|---|---|
| **I · Qualifikation** | Bist du überhaupt qualifiziert? | Geburtsort, Mindestalter 35, Sperre „14 Jahre Wohnsitz“, Weggabelung **Militär oder Jura & Politik**, Anmeldung der Kandidatur |
| **II · Nominierung** | Wirst du Kandidat deiner Partei? | Iowa, New Hampshire, Weggabelung **Graswurzel oder Großspender**, Super Tuesday, Debatten, Nationaler Parteitag |
| **III · Wahlkampf** | Gewinnst du die Wahl? | Vizepräsident, Weggabelung **Rust Belt oder Sun Belt**, Bundesstaaten erobern, TV-Debatten, Wahlabend |

## Spielen

**Einfach `index.html` doppelklicken.** Das Spiel läuft direkt im Browser, ohne Installation und ohne Server.

- 1 bis 15 Spieler. Freie Plätze können mit KI-Gegnern aufgefüllt werden (0 KI = nur Menschen).
- Alle spielen abwechselnd an einem Gerät (PC, Tablet oder Handy).
- Sprache umschaltbar: Deutsch / Englisch (oben rechts).
- Das Spiel speichert nach jedem Zug automatisch. Über „Menü → Zum Hauptmenü“ kann man später weiterspielen.

## So läuft ein Zug

1. **Wahlkampf-Budget (freiwillig):** Vor dem Würfeln kannst du Geld ausgeben:
   - **Berater** (5 Mio. $): Du würfelst mit 2 Würfeln und suchst dir das Zielfeld aus.
   - **TV-Spot** (6 Mio. $): +4 % Umfragen.
   - **Schmutzkampagne** (8 Mio. $): Ein Rivale verliert 5 %, du selbst 1 %.
   - **Wahlkampfbüro** (7 Mio. $, Runde 3): +1 auf die Würfelprobe in einem Bundesstaat.
2. **Würfeln:** Das Zielfeld leuchtet. **Tippe darauf**, um deine Figur zu ziehen. An Weggabelungen leuchten zwei Felder und du wählst deinen Weg.
3. **Feld:** Jede Karte erklärt, was passiert, und bringt oft einen „Wusstest du?“-Fakt. Karten schließt du selbst, auch die der KI.

## Regeln in Kürze

- **Gelbe Sperre (Runde 1):** Jeder muss dort anhalten und braucht eine **gerade Zahl**, um weiterzuziehen.
- **Goldene Zielfelder:** Das letzte Feld jeder Runde. Man muss **genau** darauf landen, sonst bleibt man stehen.
- **Entscheidungen:** Auf vielen Feldern wählst du zwischen zwei Möglichkeiten, z. B. Elon Musks Geld annehmen (+20 Mio. $, aber −5 % Umfragen) oder ablehnen (+3 %).
- **Vorteile:** Zusätzliche Schritte gibt es nur für das, was man im echten Leben wirklich braucht (Mindestalter, Unterschriften für den Stimmzettel, Anmeldung bei der Wahlbehörde, Delegierte, Vizepräsident). Alle anderen Vorteile bringen Spenden oder Umfragewerte.
- **TV-Debatten:** Zwei Kandidaten beantworten dieselbe Quizfrage. Richtig = +6 % Umfragen, der andere verliert 3 %.
- **Bundesstaaten (Runde 3):** Auf jedem Staat musst du die Zahl auf dem Feld würfeln (3+ bis 6+, je nach Wahlmännern). Umfragewerte ab 55 %, der Heimatstaat und ein Wahlkampfbüro geben je +1. Gehört der Staat schon jemand anderem, ist es um 1 schwerer. Misslingt es, kann man mit Spenden einen zweiten Versuch kaufen.
- **Wahlabend:** Die US-Karte färbt sich Staat für Staat. Wer 270 Wahlmänner hat, gewinnt. Schafft das niemand, entscheidet wie in echt das Repräsentantenhaus (jeder Staat hat eine Stimme).

## Einstellungen (auch während des Spiels änderbar)

| Einstellung | Möglichkeiten |
|---|---|
| Spielende | **Gemeinsamer Wahlabend** (empfohlen) · **270-Hürde** · **Einfaches Rennen** |
| Extras | TV-Debatten als Quiz-Duell · Breaking-News-Karten (jeweils an/aus) |
| KI | Tempo (Gemütlich · Normal · Schnell) · KI-Karten automatisch schließen (an/aus) |
| Ansicht | Brett wechselt automatisch zur Runde des Spielers am Zug |

## Selbst etwas ändern

| Was? | Wo? |
|---|---|
| Felder, Weggabelungen, Entscheidungen, Texte, Fakten | `js/data.js` → `BOARD_DEFS` |
| Quizfragen für die TV-Debatten | `js/data.js` → `PG.QUIZ` |
| Breaking-News-Karten | `js/data.js` → `PG.NEWS` |
| Die gezeichneten Bilder (Gravur-Stil) | `js/icons.js` |
| Texte der Oberfläche (Knöpfe, Regeln …) | `js/i18n.js` |
| Farben und Schriften | `css/style.css` (ganz oben, `:root`) |

Jedes Brett besteht aus Reihen mit 7 Feldern (`ROW`), Verbindungsfeldern an der Seite (`CONN`) und Weggabelungen mit zwei Wegen à 5 Feldern (`FORK`). Jeder Text hat eine deutsche und eine englische Version, z. B. `L('Hohe Inflation', 'High inflation')`.

**Achtung beim Verschieben:** Manche Schritte sind genau abgezählt. In Runde 1 landen alle „35+“-Felder genau auf der Sperre (Feld 13), und „Bei der Wahlbehörde angemeldet“ (+1) führt genau aufs Ziel. In Runde 2 führt „Du gewinnst die Vorwahlen“ (+4) genau zum Parteitag.

## Dateien

```
index.html        Grundgerüst der Seite
css/style.css     Gestaltung
js/data.js        Spielfelder, Bundesstaaten, Quiz, News
js/i18n.js        Texte Deutsch/Englisch
js/core.js        Hilfsfunktionen
js/icons.js       Bilder im Gravur-Stil
js/audio.js       Soundeffekte (im Browser erzeugt)
js/board.js       Spielbrett, Figuren, Zielfelder
js/ui.js          Startbildschirm, Karten, Würfel, Budget, Menüs
js/election.js    Wahlabend mit US-Karte
js/game.js        Spielablauf, Regeln, KI
```

## Online stellen (optional)

Mit **GitHub Pages** bekommt das Spiel eine eigene Internetadresse:
Repository → *Settings* → *Pages* → bei *Branch* den gewünschten Branch und `/ (root)` wählen → *Save*.
Nach ein bis zwei Minuten ist das Spiel unter `https://<dein-name>.github.io/mein-erstes-projekt/` erreichbar.
