# Leitfaden: Anwesenheits-App für das Gym

Dieser Leitfaden begleitet den Bau einer kleinen Web-App, die die Anwesenheitsliste auf Papier ersetzt.
Jedes Kapitel entspricht einer Etappe. Wer die Kapitel der Reihe nach durcharbeitet,
kann die App komplett selbst nachbauen.

**Technik:** nur HTML, CSS und JavaScript, keine Frameworks, keine Build-Tools.
**Daten:** nur erfundene Testnamen, keine echten Kinderdaten.

## Projektstruktur

```
anwesenheit-app/
├── index.html                 ← Grundgerüst: Kopfzeile, Navigation, Icons, Skripte
├── css/
│   └── style.css              ← das gesamte Aussehen (hell/dunkel, Handy/Desktop, Druck)
├── js/
│   ├── hilfe.js               ← Werkzeuge: Datum, sicheres HTML, Dialoge, Meldungen, Dateien
│   ├── speicher.js            ← die EINZIGE Datei, die localStorage benutzt
│   ├── testdaten.js           ← erzeugt erfundene Testdaten
│   ├── export.js              ← Mitgliederliste, Backup, CSV, Druckansicht
│   ├── ansicht-training.js    ← Training starten, Kinder abhaken, speichern
│   ├── ansicht-verlauf.js     ← vergangene Trainings filtern und ansehen
│   ├── ansicht-kinder.js      ← Übersicht und Anwesenheitsquote pro Kind
│   ├── ansicht-verwaltung.js  ← Standorte, Gruppen, Kinder, Trainer, Daten
│   └── app.js                 ← Start, Navigation, Einrichtung (wird zuletzt geladen)
└── LEITFADEN.md               ← diese Datei
```

## So öffnest du die App

1. Den Ordner `anwesenheit-app` im Explorer öffnen.
2. Doppelklick auf `index.html`. Die Datei öffnet sich im Browser.
3. Nach jeder Änderung an einer Datei: speichern und im Browser **F5** drücken (neu laden).

Tipp: Mit **F12** öffnest du die Entwicklerwerkzeuge (DevTools). Die brauchst du ständig zur Fehlersuche.
Für die Handy-Ansicht drückst du in den DevTools auf das kleine Handy/Tablet-Symbol (oder **Strg+Umschalt+M**).

Wie du die App aufs Handy bringst, steht in [Kapitel 2](#kapitel-2-die-fertige-app-im-überblick).

---

## Kapitel 1: Das HTML-Grundgerüst

> **Hinweis:** Dieses Kapitel beschreibt die allererste Version (Etappe 1). Die `index.html` wurde
> danach durch die vollständige App ersetzt (ab Kapitel 2). Die Grundlagen hier – Labels, Feldtypen,
> `id`/`for`, Viewport – gelten aber weiterhin und stecken überall in der neuen App.

### Was wurde gebaut?

Eine Seite mit einem Formular, das genauso aufgebaut ist wie die Papierliste:

- **Kopfbereich** („Training“): Standort, Gruppe, Trainer, Datum, Uhrzeit von und bis
- **Teilnehmerliste**: 5 Testkinder, jedes mit einer Checkbox „anwesend“ und einem Textfeld „Hinweis“

Die Seite sieht noch schlicht aus und tut noch nichts. Das ist Absicht.
HTML beschreibt nur die **Struktur**, also *was* auf der Seite ist.
Aussehen (CSS, Etappe 2) und Verhalten (JavaScript, Etappe 3) kommen später.

### Die wichtigsten Code-Stellen

#### 1. Der Kopf der Datei

```html
<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anwesenheitsliste</title>
</head>
```

| Zeile | Bedeutung |
|---|---|
| `<!DOCTYPE html>` | „Das ist modernes HTML5.“ Ohne diese Zeile nutzt der Browser einen alten Kompatibilitätsmodus. |
| `<html lang="de">` | Die Seite ist deutsch. Das ist wichtig für Vorleseprogramme und Übersetzer. |
| `<meta charset="UTF-8">` | Zeichensatz, damit ä, ö, ü und ß richtig erscheinen. |
| `<meta name="viewport" ...>` | **Die wichtigste Zeile für Handys.** Ohne sie stellt das Handy die Seite wie auf einem PC dar, nur winzig verkleinert. |
| `<title>` | Text im Browser-Tab. |

#### 2. Semantische Bereiche

```html
<header> ... </header>
<main> ... </main>
```

Diese Elemente verhalten sich wie normale Kästen (`<div>`), sagen aber zusätzlich, *welche Rolle* der Inhalt hat:
`<header>` ist der Seitenkopf, `<main>` der Hauptinhalt.

#### 3. Formular und Fieldsets

```html
<form id="trainings-formular">
  <fieldset>
    <legend>Training</legend>
    ...
  </fieldset>
  <fieldset>
    <legend>Teilnehmer</legend>
    ...
  </fieldset>
</form>
```

- `<form>` umschließt alle Eingabefelder. Über die `id` finden wir das Formular später in JavaScript.
- `<fieldset>` bündelt zusammengehörige Felder, `<legend>` ist die Überschrift dazu.
  So entsprechen die beiden Bereiche genau der Papierliste.

#### 4. Label + Feld: immer als Paar

```html
<label for="trainer">Trainer</label>
<input type="text" id="trainer" name="trainer" placeholder="z. B. Alex Trainer" autocomplete="name" required>
```

- `for="trainer"` im Label verweist auf `id="trainer"` im Feld. **Die beiden Namen müssen exakt gleich sein.**
- Dadurch gilt: Wer auf die Beschriftung tippt, aktiviert das Feld. Auf dem Handy ist das eine größere Trefferfläche.
- `name` ist der Name, unter dem der Wert später weitergegeben wird.
- `placeholder` ist grauer Beispieltext.
- `required` heißt, das Feld ist Pflicht.
- `autocomplete="name"`: Das Handy darf Namen vorschlagen. Das spart Tippen.

#### 5. Auswahllisten statt Tippen

```html
<select id="standort" name="standort" required>
  <option value="">– bitte wählen –</option>
  <option value="nord">Standort Nord</option>
  <option value="mitte">Standort Mitte</option>
  <option value="sued">Standort Süd</option>
</select>
```

- `<select>` ist eine Auswahlliste. Damit gibt es keine Tippfehler, und alle Trainer verwenden dieselben Namen.
- `value` ist der Wert für den Computer (kurz, ohne Umlaute und Leerzeichen),
  der Text zwischen den Tags ist für Menschen.
- Die erste Option hat `value=""` (leer). So ist anfangs nichts gewählt, und `required` meldet, wenn man es vergisst.

#### 6. Spezielle Feldtypen für Datum und Uhrzeit

```html
<input type="date" id="datum" name="datum" required>
<input type="time" id="zeit-von" name="zeit-von" required>
```

Mit `type="date"` und `type="time"` zeigt das Handy automatisch einen Kalender bzw. eine Uhrzeit-Auswahl an.
Das bedeutet wenig Tippen und immer das richtige Format.

#### 7. Ein Kind in der Teilnehmerliste

```html
<li>
  <input type="checkbox" id="kind-1" name="anwesend-kind-1">
  <label for="kind-1">Mia Muster</label>
  <input type="text" name="hinweis-kind-1" placeholder="Hinweis (z. B. später gekommen)" aria-label="Hinweis zu Mia Muster">
</li>
```

| Teil | Bedeutung |
|---|---|
| `<li>` | Ein Listeneintrag, also ein Kind. Alle Kinder stehen in `<ul id="teilnehmer-liste">`. |
| `type="checkbox"` | Kästchen zum Abhaken. Hier bedeutet es „anwesend“. |
| `id="kind-1"` | **Muss für jedes Kind anders sein** (kind-1, kind-2, ...). |
| `<label for="kind-1">` | Der Name des Kindes. Wer darauf tippt, setzt das Häkchen. |
| `aria-label` | Das Hinweis-Feld hat keine sichtbare Beschriftung. `aria-label` verrät Vorleseprogrammen trotzdem, wozu es gehört. |

#### 8. Warum gibt es noch keinen Speichern-Button?

Ein Button in einem Formular würde die Seite beim Klick neu laden, und alle Eingaben wären weg.
Den Button bauen wir in Etappe 4 zusammen mit dem JavaScript, das das Neuladen verhindert und wirklich speichert.

### Neue Begriffe

- **HTML-Element / Tag:** Ein Baustein der Seite, z. B. `<input>`. Die meisten haben ein Start- und ein End-Tag (`<li> ... </li>`).
  Manche wie `<input>` und `<meta>` haben kein End-Tag.
- **Attribut:** Eine Zusatzangabe in einem Tag, z. B. `type="date"` oder `id="trainer"`.
- **id:** Ein eindeutiger Name für ein Element. Jede id darf auf der Seite **nur einmal** vorkommen.
- **name:** Der Name, unter dem der Wert eines Feldes weitergegeben wird.
- **Formular (`<form>`):** Ein Behälter für Eingabefelder.
- **Semantisches HTML:** Elemente danach auswählen, *was* der Inhalt ist (Liste, Kopf, Hauptteil), nicht danach, wie er aussehen soll.
- **Viewport:** Der sichtbare Bereich des Bildschirms. Das Viewport-Meta-Tag sorgt dafür, dass Handys die Seite in echter Größe zeigen.
- **Barrierefreiheit:** Die Seite soll auch mit Vorleseprogrammen oder großen Fingern gut bedienbar sein. `label` und `aria-label` helfen dabei.

### Typische Fehler und wie man sie findet

| Problem | Ursache | So findest du es |
|---|---|---|
| Tippen auf den Namen setzt kein Häkchen | `for` im Label und `id` der Checkbox passen nicht zusammen (Tippfehler, z. B. `kind-1` und `kind1`) | F12 drücken, im Reiter **Elements** beide Werte vergleichen |
| Tippen auf „Leon“ hakt „Mia“ ab | Beim Kopieren eines `<li>` wurde die `id` nicht geändert, zwei Checkboxen heißen `kind-1` | In der Datei mit **Strg+F** nach `id="kind-1"` suchen. Es darf nur einen Treffer geben. |
| Umlaute erscheinen als `Ã¼` o. ä. | `<meta charset="UTF-8">` fehlt oder die Datei wurde nicht als UTF-8 gespeichert | Meta-Tag prüfen. Im Editor unten rechts nachsehen, ob „UTF-8“ steht. |
| Auf dem Handy ist alles winzig | Das Viewport-Meta-Tag fehlt | `<head>` prüfen |
| Ein Teil der Seite fehlt oder ist verrutscht | Ein End-Tag fehlt, z. B. `</li>` oder `</select>` | Einrückung prüfen. Den Code auf https://validator.w3.org/#validate_by_input einfügen, dort werden Fehler mit Zeilennummer gemeldet. |
| Änderungen erscheinen nicht | Datei nicht gespeichert oder Browser nicht neu geladen | Speichern, dann im Browser **F5** |

### Übungsaufgabe zu Kapitel 1

1. **Ein sechstes Kind hinzufügen:** Kopiere ein komplettes `<li> ... </li>` und füge es am Ende der Liste ein.
   Ändere **alle** Stellen, die zum Kind gehören: `id`, `for`, beide `name`, den Namen und das `aria-label`.
   Teste danach, ob ein Tippen auf den neuen Namen das richtige Häkchen setzt.
2. **Bonus:** Füge im Kopfbereich ein Feld **„Bemerkung zum Training“** hinzu (z. B. „Halle war kalt“).
   Tipp: Für mehrzeiligen Text gibt es das Element `<textarea>`. Vergiss das passende `<label>` nicht.

---

## Kapitel 2: Die fertige App im Überblick

### Was die App kann

| Bereich | Funktion |
|---|---|
| **Training** | Standort und Gruppe antippen. Trainer, Datum und Uhrzeit sind vorausgefüllt (die Uhrzeit kommt vom letzten Training dieser Gruppe). Kinder antippen = anwesend, nochmal = abwesend. Pro Kind ein Hinweis mit Vorlagen („später gekommen“ …). Live-Zähler „7 von 12 anwesend“. Probetraining schnell hinzufügen. Speichern mit Bestätigung, danach direkt „Weiter: nächste Gruppe“. |
| **Verlauf** | Alle Trainings, nach Monat gruppiert. Filter nach Standort, Gruppe und Zeitraum. Details ansehen, bearbeiten, drucken (wie die Papierliste), löschen. CSV-Export für Excel. |
| **Kinder** | Jedes Kind mit Anwesenheitsquote („80 % · 8 von 10“). Suche, Filter, Sortierung. Details: an welchen Tagen da oder nicht da. |
| **Verwaltung** | Standorte, Gruppen, Kinder, Trainer anlegen, bearbeiten, deaktivieren. Mehrere Kinder auf einmal einfügen. |
| **Verwaltung › Daten** | Mitgliederliste exportieren/importieren (ohne Doppelte), Backup erstellen/wiederherstellen, Testdaten laden/löschen, Hell-/Dunkelmodus, alles löschen. |

### App öffnen

**Am Computer:** Doppelklick auf `index.html`. Die App läuft direkt aus der Datei. Das klappt, weil wir
bewusst nur „klassische“ `<script>`-Dateien benutzen und keine Dateien nachladen.

**Am Handy** braucht die App eine Internet-Adresse. Am einfachsten mit Netlify:

1. Am Computer <https://app.netlify.com/drop> öffnen (kostenloses Konto nötig).
2. Den **ganzen Ordner** `anwesenheit-app` auf die Seite ziehen.
3. Netlify zeigt eine Adresse wie `https://xyz-123.netlify.app`. Diese am Handy öffnen.
4. Als App-Symbol auf den Startbildschirm legen:
   - **iPhone (Safari):** Teilen-Symbol → „Zum Home-Bildschirm“
   - **Android (Chrome):** Menü ⋮ → „Zum Startbildschirm hinzufügen“

Netlify liefert nur die **Dateien** aus. Die Daten (Kinder, Trainings) liegen trotzdem nur im Browser
des jeweiligen Handys, nicht bei Netlify.

### Erster Start

1. Es erscheint „Willkommen!“ mit drei Möglichkeiten: **Testdaten**, **Mitgliederliste importieren** oder **Leer beginnen**.
2. Danach fragt die App: „Wer bist du?“ Hier wählst du deinen Namen und deinen Standort (oder legst dich als neuen Trainer an).
   Das wird gespeichert und ist beim nächsten Mal vorausgewählt. Ändern kannst du es jederzeit über den Knopf oben rechts.

### Bedienung im Training (mit einer Hand)

1. App öffnen. Standort ist vorausgewählt, die zuletzt benutzte Gruppe meist auch.
2. Gruppe antippen. Der Kopfbereich klappt zu einer Zeile zusammen, damit die Kinder Platz haben („Ändern“ klappt ihn wieder auf).
3. Kinder antippen. Sie werden grün mit Haken.
4. Sprechblase rechts neben einem Kind = Hinweis. Vorlage antippen, „Übernehmen“.
5. Kind fehlt in der Liste? „Probetraining hinzufügen“ ganz unten.
6. Unten auf **Speichern**. Danach direkt „Weiter: nächste Gruppe“ oder „Fertig“.

Ein gespeichertes Training kannst du jederzeit im **Verlauf** öffnen und **bearbeiten**.

### Wichtig: Jedes Gerät hat seine eigenen Daten

Solange es keine Online-Datenbank gibt, sieht Trainer A nicht, was Trainer B auf seinem Handy einträgt.
So arbeitet ihr trotzdem gemeinsam:

- **Gleiche Kinderliste für alle:** Eine Person pflegt die Kinder, exportiert die *Mitgliederliste* und
  schickt die Datei an die anderen. Die importieren sie. Beim Import wird nichts doppelt angelegt.
  Das kann man beliebig oft wiederholen.
- **Trainings zusammenführen:** Jeder Trainer exportiert seine Trainings als CSV. Die Dateien lassen sich in Excel zusammenkopieren.
- **Sicherung:** Regelmäßig ein **Backup** erstellen. Wer im Browser „Websitedaten löschen“ wählt, löscht sonst auch die App-Daten.

> **Datenschutz:** Sobald echte Kinderdaten eingetragen werden, sprich mit dem Verein über den Datenschutz
> (DSGVO). Mitgliederlisten nur über sichere Wege verschicken, nicht in öffentliche Gruppen.

---

## Kapitel 3: Wie die App aufgebaut ist (Dateien und Datenfluss)

### Drei Schichten

Die App ist in drei Schichten aufgeteilt. Jede hat genau eine Aufgabe:

| Schicht | Dateien | Aufgabe |
|---|---|---|
| **Aussehen** | `index.html`, `css/style.css` | Grundgerüst und Gestaltung |
| **Ansichten** | `js/ansicht-*.js`, `js/app.js` | zeigen Daten an und reagieren auf Tippen |
| **Speicher** | `js/speicher.js` | liest und schreibt die Daten |

Dazu kommen Helfer, die alle benutzen: `hilfe.js` (Werkzeuge), `export.js` (Dateien erzeugen), `testdaten.js`.

### Der Datenfluss beim Speichern

```
 Trainer tippt "Speichern"
        │
        ▼
 ansicht-training.js   speichern()
        │  prüft die Eingaben
        │  ruft auf:  await Speicher.speichereTraining(training, anwesenheitListe)
        ▼
 speicher.js           speichereTraining()
        │  wandelt die Daten in Text um (JSON) und schreibt sie in localStorage
        │  gibt das gespeicherte Training (mit ID) zurück
        ▼
 ansicht-training.js   zeichnet sich neu und zeigt "Training gespeichert"
```

Lesen funktioniert genauso, nur andersherum: Die Ansicht fragt `Speicher.ladeKinder(...)`,
bekommt eine Liste zurück und baut daraus HTML.

### Reihenfolge der Skripte

In `index.html` stehen die Skripte in einer festen Reihenfolge:

```html
<script src="js/hilfe.js"></script>
<script src="js/speicher.js"></script>
...
<script src="js/app.js"></script>
```

`app.js` kommt zuletzt, weil es beim Laden sofort `App.start()` aufruft und dafür alle anderen Teile braucht.
Jede Datei legt genau **ein** globales Objekt an (`Hilfe`, `Speicher`, `TrainingAnsicht`, `App` …).
So kommen sich die Dateien nicht in die Quere.

### Navigation über den „Hash“

Die Adresse endet z. B. auf `#verlauf` oder `#verwaltung/kinder`. Der Teil nach `#` heißt **Hash**.
Ändert er sich (Tippen auf einen Link, Zurück-Taste), meldet der Browser das Ereignis `hashchange`.
`app.js` hört darauf und zeigt die passende Ansicht:

```js
window.addEventListener('hashchange', zeigeAktuelleAnsicht);

async function zeigeAktuelleAnsicht() {
  const [name, parameter] = location.hash.slice(1).split('/'); // "#verwaltung/kinder" -> "verwaltung", "kinder"
  const ansicht = ANSICHTEN[name] ? name : 'training';          // unbekannt -> Training
  ...
  await ANSICHTEN[ansicht].zeige(behaelter, parameter);
}
```

Vorteil: Es funktioniert ohne Server, und die Zurück-Taste am Handy springt zur vorigen Ansicht.

### Wie eine Ansicht sich zeichnet

Alle Ansichten arbeiten nach demselben Muster:

1. **Daten laden:** `const kinder = await Speicher.ladeKinder({ gruppeId })`
2. **HTML als Text bauen:** mit Template-Strings (`` `...${wert}...` ``)
3. **Einsetzen:** `wurzel.replaceChildren(neuesElement)`
4. **Auf Tippen reagieren:** *ein* Event Listener für die ganze Ansicht (siehe Kapitel 5)

### Das Datenmodell

Jede Sammlung wird später eine Tabelle in der Datenbank. Jeder Eintrag hat eine eindeutige `id`
sowie `erstelltAm` und `geaendertAm` (Zeitstempel).

| Sammlung | Felder | gehört zu |
|---|---|---|
| `standorte` | `name`, `aktiv`, `reihenfolge` | – |
| `gruppen` | `name`, `standortId`, `aktiv`, `reihenfolge` | Standort |
| `kinder` | `vorname`, `nachname`, `gruppeId`, `aktiv`, `probetraining` | Gruppe |
| `trainer` | `name`, `aktiv` | – |
| `trainings` | `standortId`, `gruppeId`, `datum`, `zeitVon`, `zeitBis`, `trainerId` | Standort, Gruppe, Trainer |
| `anwesenheit` | `trainingId`, `kindId`, `anwesend`, `hinweis` | Training, Kind |

Verbindungen entstehen über IDs: Ein Kind hat `gruppeId`, das ist die `id` seiner Gruppe.
In der Datenbank-Sprache heißt so ein Verweis **Fremdschlüssel**.

Zusätzlich gibt es `einstellungen` (wer ist der Trainer auf **diesem** Gerät, welcher Standort,
Farbmodus). Das ist bewusst keine Sammlung, denn jedes Handy hat seine eigenen Einstellungen.

---

## Kapitel 4: Die lokale Speicherung (localStorage)

### Was ist localStorage?

Ein kleiner Speicher im Browser. Er funktioniert wie ein Schrank mit beschrifteten Schubladen:
Jede Schublade hat einen **Schlüssel** (Namen) und enthält **Text**.

```js
localStorage.setItem('gruss', 'Hallo');   // speichern
localStorage.getItem('gruss');            // -> "Hallo"
localStorage.removeItem('gruss');         // löschen
```

Wichtige Eigenschaften:
- Die Daten bleiben erhalten, auch wenn man den Browser schließt.
- Sie gehören zu **einem Browser auf einem Gerät** und zu **einer Adresse**. Die Datei auf dem PC
  (`file:///...`) und die Netlify-Adresse haben also getrennte Speicher!
- Platz: meist ca. 5 MB. Das reicht für viele Jahre Trainings.
- Es passt nur **Text** hinein.

### Listen als Text speichern: JSON

Weil nur Text hineinpasst, wandeln wir Listen mit **JSON** um:

```js
const kinder = [{ vorname: 'Mia', nachname: 'Muster' }];
const text = JSON.stringify(kinder);  // -> '[{"vorname":"Mia","nachname":"Muster"}]'
const zurueck = JSON.parse(text);     // -> wieder eine echte Liste
```

In der App liegt jede Sammlung in einem eigenen Schlüssel: `anwesenheit.kinder`,
`anwesenheit.trainings` usw. Das Präfix `anwesenheit.` verhindert Verwechslungen mit anderen Seiten.

**Selbst ansehen:** F12 → Reiter **Application** (bzw. „Anwendung“) → links **Local Storage** → die Adresse anklicken.

### Warum ist alles in `speicher.js` gekapselt?

**Regel: Nur `speicher.js` darf `localStorage` benutzen.** Alle anderen Dateien sprechen ausschließlich
mit den Funktionen von `Speicher`:

```js
// In einer Ansicht – so ist es richtig:
const kinder = await Speicher.ladeKinder({ gruppeId: zustand.gruppeId, nurAktive: true });

// So NICHT (würde die Regel brechen):
const kinder = JSON.parse(localStorage.getItem('anwesenheit.kinder'));
```

Warum der Aufwand? Stell dir `speicher.js` wie eine **Steckdose** vor. Die Ansichten sind Geräte, die
nur wissen: „Stecker rein, Strom kommt.“ Ob der Strom aus dem Kraftwerk oder vom Solardach kommt,
ist ihnen egal. Wenn wir später auf Supabase umsteigen, tauschen wir nur das „Kraftwerk“
(das Innere von `speicher.js`) aus. Alle Ansichten bleiben unverändert.

**Prüfen kannst du die Regel so:** In VS Code mit **Strg+Umschalt+F** nach `localStorage` suchen.
Treffer darf es nur in `speicher.js` geben (und in Kommentaren).

### Warum sind alle Speicher-Funktionen `async`?

localStorage antwortet sofort. Eine Online-Datenbank braucht aber Zeit, weil die Anfrage durchs
Internet geht. Damit wir später nichts umbauen müssen, sind schon jetzt alle Funktionen `async`:

```js
async function ladeStandorte({ nurAktive = false } = {}) {
  return lies('standorte').filter(s => !nurAktive || s.aktiv !== false).sort(nachReihenfolge);
}
```

- `async` vor einer Funktion heißt: Sie gibt ein **Promise** zurück („Versprechen: Das Ergebnis kommt gleich“).
- `await` heißt: „Warte hier, bis das Ergebnis da ist.“ `await` darf nur in `async`-Funktionen stehen.

```js
const standorte = await Speicher.ladeStandorte(); // wartet, dann ist standorte eine Liste
```

Vergisst man `await`, bekommt man statt der Liste ein Promise-Objekt. Das ist einer der häufigsten Fehler (siehe Kapitel 7).

### Die zentrale Funktion: `speichereEintrag`

Fast alle Speicher-Funktionen benutzen diese eine Funktion zum Anlegen **oder** Ändern:

```js
function speichereEintrag(sammlung, eintrag, standard = {}) {
  const liste = lies(sammlung);                                   // 1. ganze Liste laden
  const zeit = jetzt();
  const index = eintrag.id ? liste.findIndex(e => e.id === eintrag.id) : -1; // 2. gibt es ihn schon?
  let gespeichert;

  if (index === -1) {                                             // 3a. neu anlegen
    gespeichert = { ...standard, erstelltAm: zeit, ...eintrag, id: eintrag.id || neueId(), geaendertAm: zeit };
    liste.push(gespeichert);
  } else {                                                        // 3b. vorhandenen ändern
    gespeichert = { ...liste[index], ...eintrag, geaendertAm: zeit };
    liste[index] = gespeichert;
  }

  schreib(sammlung, liste);                                       // 4. ganze Liste zurückschreiben
  return gespeichert;
}
```

- `...` (**Spread**) kopiert alle Felder eines Objekts. Steht ein Feld mehrmals da, gewinnt das **letzte**.
  `{ ...alt, ...neu }` heißt also: „alles vom alten Eintrag, überschrieben mit dem Neuen“.
- `standard` enthält Werte **nur fürs Neuanlegen** (z. B. `aktiv: true`). Beim Ändern würden sie sonst
  versehentlich z. B. ein deaktiviertes Kind wieder aktivieren.

### IDs

Jeder Eintrag bekommt eine **UUID**, z. B. `9c15a791-d716-4e99-804b-adee9f1c931d`
(`crypto.randomUUID()`). Die ist weltweit eindeutig, auch wenn zwei Handys gleichzeitig Einträge anlegen.
Supabase benutzt dasselbe Format.

### Deaktivieren statt löschen

Standorte, Gruppen, Kinder und Trainer werden nicht gelöscht, sondern bekommen `aktiv: false`.
Grund: Alte Trainings verweisen per `kindId` auf das Kind. Wäre das Kind gelöscht, stünde im
Verlauf nur „(unbekannt)“. Inaktive Einträge verschwinden aus der Auswahl, die Geschichte bleibt vollständig.

### Import ohne Doppelte

`Speicher.importiereMitglieder()` geht jeden Eintrag der Datei durch und sucht ihn so auf dem Gerät:

1. **Gleiche ID?** Dann ist es derselbe Eintrag (die Liste stammt aus einem früheren Export) → aktualisieren.
2. **Gleicher Name?** (bei Kindern: gleicher Vor- und Nachname in derselben Gruppe, ohne Groß/Klein) → aktualisieren.
3. Sonst → **neu anlegen**, und zwar mit der ID aus der Datei. So haben danach alle Geräte dieselben IDs.

Die `idKarte` merkt sich dabei „ID in der Datei → ID auf diesem Gerät“. Das ist wichtig, wenn z. B.
eine Gruppe über ihren Namen gefunden wurde: Die Kinder der Datei zeigen dann auf die *alte* Gruppen-ID
und müssen auf die *lokale* umgebogen werden.

### Testdaten

Jeder Testeintrag hat `testdaten: true`. `Speicher.loescheTestdaten()` entfernt genau diese
(und alles, was an einem Test-Standort hängt). Deine eigenen Einträge bleiben stehen.

### Grenzen von localStorage

- Löscht jemand im Browser die Websitedaten, sind die Daten weg → **Backup**!
- Im privaten Modus („Inkognito“) wird beim Schließen alles gelöscht.
- Kein Austausch zwischen Geräten (dafür kommt später die Datenbank).

---

## Kapitel 5: Die wichtigsten Code-Stellen

### 5.1 Ein Objekt pro Datei (das Modul-Muster)

```js
const Speicher = (() => {
  const PREFIX = 'anwesenheit.';      // privat
  function lies(sammlung) { ... }     // privat

  async function ladeKinder() { ... }

  return { ladeKinder, ... };         // nur das hier ist öffentlich
})();
```

`(() => { ... })()` ist eine Funktion, die **sofort** ausgeführt wird (IIFE). Alles darin ist
von außen unsichtbar. Nur was im `return` steht, ist als `Speicher.ladeKinder` erreichbar.
So kann niemand aus Versehen `lies()` direkt aufrufen.

### 5.2 HTML aus Text bauen – und warum `esc()` so wichtig ist

```js
return `
  <span class="kind-name">${esc(Hilfe.vollerName(kind))}</span>`;
```

`${...}` setzt einen Wert in den Text ein. **Alles, was ein Mensch eingegeben hat, kommt durch `esc()`.**
Warum? Gäbe jemand als Namen `<img src=x onerror=alert(1)>` ein, würde der Browser das als echten
Code ausführen. Das nennt man **XSS** (Cross-Site-Scripting). `esc()` macht aus `<` ein harmloses `&lt;`.

### 5.3 Event-Delegation: ein Listener für alles

Statt jedem Kind einen eigenen Event Listener zu geben, hört **ein** Listener auf der ganzen Ansicht zu:

```js
neu.addEventListener('click', beiKlick);

async function beiKlick(e) {
  const ziel = e.target.closest('button');   // welcher Knopf wurde getroffen?
  if (!ziel || ziel.disabled) return;
  const d = ziel.dataset;                    // alle data-...-Attribute
  if (d.kind) umschalten(d.kind);            // <button data-kind="123">
  else if (d.aktion === 'speichern') await speichern();
  ...
}
```

- `e.target` ist das genau angetippte Element (z. B. das Haken-Icon).
- `closest('button')` läuft nach oben bis zum nächsten Knopf.
- `data-kind="123"` im HTML wird in JavaScript zu `ziel.dataset.kind`.

Vorteil: Funktioniert auch für Elemente, die später neu gezeichnet werden, und es gibt keine doppelten Listener.

### 5.4 Zustand und schnelles Umschalten

`ansicht-training.js` merkt sich alles im Objekt `zustand` (gewählte Gruppe, Uhrzeit, wer da ist …).
Beim Antippen eines Kindes wird **nicht** die ganze Seite neu gezeichnet, sondern nur eine CSS-Klasse umgeschaltet.
Dadurch bleibt der sanfte Farbübergang sichtbar:

```js
function umschalten(kindId) {
  const eintrag = zustand.anwesenheit[kindId] ||= { anwesend: false, hinweis: '' };
  eintrag.anwesend = !eintrag.anwesend;                      // true <-> false
  zustand.geaendert = true;

  const karte = findeKarte(kindId);
  karte.classList.toggle('ist-da', eintrag.anwesend);         // CSS färbt grün
  karte.querySelector('.kind-umschalter').setAttribute('aria-pressed', eintrag.anwesend);
  aktualisiereZaehler();                                     // "7 von 12 anwesend"
  if (navigator.vibrate) navigator.vibrate(8);               // kurzes Vibrieren (Android)
}
```

`a ||= b` heißt: „Wenn `a` noch leer ist, setze es auf `b`.“

### 5.5 Dialoge, auf die man warten kann

```js
const sicher = await Hilfe.bestaetige({
  titel: 'Training löschen?', text: '…', okText: 'Endgültig löschen', gefahr: true
});
if (!sicher) return;
```

`bestaetige()` gibt ein Promise zurück, das erst erfüllt wird, wenn ein Knopf gedrückt wurde.
Mit `await` liest sich der Code dadurch wie ein Gespräch: fragen → Antwort abwarten → weitermachen.
Intern nutzt `hilfe.js` das eingebaute `<dialog>`-Element (`dialog.showModal()`).

### 5.6 Der Speichern-Ablauf

`speichern()` in `ansicht-training.js` macht nacheinander:

1. `pruefeEingaben()`: Gruppe gewählt? „Bis“ nach „Von“? Trainer gesetzt? Sonst Fehlermeldung.
2. Ist niemand abgehakt → Nachfrage „Trotzdem speichern?“
3. Neue Probetrainings-Kinder anlegen (erst dadurch bekommen sie eine echte ID statt `neu-…`).
4. `Speicher.speichereTraining(training, liste)`: Training und Anwesenheitsliste speichern.
5. Standort und Gruppe für das nächste Mal merken.
6. Erfolgsdialog mit „Weiter: nächste Gruppe“.

Ab jetzt ist `zustand.trainingId` gesetzt. Erneutes Speichern **ändert** dasselbe Training, statt ein neues anzulegen.

### 5.7 Schnelles Wechseln der Ansichten sicher machen

Tippt man schnell auf „Verlauf“ und dann „Kinder“, laufen zwei Ladevorgänge gleichzeitig. Ist der
erste langsamer, würde er die neuere Ansicht überschreiben. Diesen Fehler nennt man **Race Condition**.
Die Lösung in `app.js`: Jeder Auftrag bekommt eine Nummer, und nur der neueste darf anzeigen.

```js
const auftrag = ++ansichtsAuftrag;
await ANSICHTEN[ansicht].zeige(behaelter, parameter);
if (auftrag !== ansichtsAuftrag) return;   // inzwischen wurde etwas anderes gewählt
Hilfe.$('#inhalt').replaceChildren(behaelter);
```

### 5.8 CSS: Variablen, Dunkelmodus, Mobile first

**Farben als Variablen.** Alle Farben stehen oben in `:root`:

```css
:root {
  --primaer: #3d5afe;
  --da: #11965a;        /* grün für "anwesend" */
}
.chip[aria-checked="true"] { background: var(--primaer); }
```

Für den **Dunkelmodus** werden nur die Variablen neu belegt:
- automatisch über `@media (prefers-color-scheme: dark)`, wenn das Handy dunkel eingestellt ist,
- fest über `:root[data-theme="dark"]`, wenn man in der App „Dunkel“ wählt (`app.js` setzt das Attribut).

**Mobile first:** Die normalen Regeln sind fürs Handy. Erst `@media (min-width: 900px)` macht daraus das
Desktop-Layout (Navigation links statt unten).

**Die klebende Aktionsleiste** („7 von 12 anwesend | Speichern“) nutzt `position: sticky; bottom: …`.
Sie bleibt beim Scrollen unten am Bildschirm, direkt über der Navigation.

**Drucken:** `@media print` blendet die App aus und zeigt nur `#druckbereich`, den `export.js` vorher
mit einer Tabelle im Stil der Papierliste füllt.

### 5.9 CSV für Excel

```js
const csv = '﻿' + zeilen.map(z => z.map(csvZelle).join(';')).join('\r\n');
```

- `;` als Trennzeichen, weil das deutsche Excel das erwartet.
- `﻿` (BOM) am Anfang, damit Excel die Umlaute richtig erkennt.
- `csvZelle()` setzt Werte mit `;` oder `"` in Anführungszeichen und schützt vor Werten, die mit `=` beginnen
  (Excel würde sie sonst als Formel ausführen).

---

## Kapitel 6: Neue Begriffe einfach erklärt

| Begriff | Erklärung |
|---|---|
| **localStorage** | Kleiner Speicher im Browser für Text. Bleibt nach dem Schließen erhalten. |
| **JSON** | Textformat für Daten. `JSON.stringify()` macht Text aus Daten, `JSON.parse()` umgekehrt. |
| **Kapselung** | Ein Teil des Programms versteckt, *wie* er arbeitet, und bietet nur klare Funktionen an (hier: `speicher.js`). |
| **Promise** | Ein „Versprechen“ auf ein Ergebnis, das später kommt. |
| **async / await** | `async` = Funktion liefert ein Promise. `await` = auf das Ergebnis warten. |
| **IIFE** | Funktion, die sofort ausgeführt wird: `(() => { ... })()`. Hält Dinge privat. |
| **Template-String** | Text in Backticks, in den man mit `${...}` Werte einsetzen kann. |
| **Event Listener** | Eine Funktion, die der Browser aufruft, wenn etwas passiert (Klick, Änderung …). |
| **Event-Delegation** | Ein Listener auf einem Eltern-Element statt vieler Listener auf den Kindern. |
| **data-Attribut** | Eigene Zusatzinfos im HTML (`data-kind="123"`), in JS über `element.dataset.kind`. |
| **Zustand (State)** | Alles, was sich eine Ansicht gerade merkt (z. B. wer abgehakt ist). |
| **Hash / hashchange** | Teil der Adresse nach `#`. Ändert er sich, meldet der Browser `hashchange`. |
| **UUID** | Lange Zufalls-ID, die weltweit eindeutig ist. |
| **Fremdschlüssel** | Ein Feld, das auf die ID eines anderen Eintrags zeigt (`gruppeId`). |
| **Spread `...`** | Kopiert alle Felder eines Objekts oder alle Elemente einer Liste. |
| **XSS** | Angriff, bei dem eingegebener Text als Code ausgeführt wird. Schutz: `esc()`. |
| **Race Condition** | Fehler, weil zwei Vorgänge gleichzeitig laufen und das Ergebnis von der Reihenfolge abhängt. |
| **CSS-Variable** | `--name: wert;` einmal festlegen, mit `var(--name)` überall benutzen. |
| **Media Query** | `@media (...)`: CSS-Regeln nur unter Bedingungen (Bildschirmbreite, Dunkelmodus, Drucken). |
| **sticky** | Element scrollt mit, bleibt aber an einer Kante „kleben“. |
| **`<dialog>`** | Eingebautes HTML-Element für Fenster über der Seite. `showModal()` öffnet es. |
| **Blob** | Eine Datei im Arbeitsspeicher. Damit erzeugen wir Downloads (CSV, JSON). |
| **CSV** | Tabelle als Textdatei, eine Zeile pro Datensatz. Excel kann sie öffnen. |
| **BOM** | Unsichtbares Zeichen am Dateianfang, das Excel sagt: „Das ist UTF-8.“ |

---

## Kapitel 7: Typische Fehler und wie man sie findet

### Das wichtigste Werkzeug: die Konsole

**F12 → Reiter „Console“**. Rote Zeilen sind Fehler, mit Dateiname und Zeilennummer (anklickbar).
Du kannst dort auch selbst Befehle ausprobieren, z. B.:

```js
await Speicher.ladeKinder()                                         // alle Kinder anzeigen
JSON.parse(localStorage.getItem('anwesenheit.trainings')).length    // wie viele Trainings?
```

Eigene Kontrollausgaben im Code: `console.log('Gruppe:', zustand.gruppeId);`
Programm an einer Stelle anhalten: `debugger;` in den Code schreiben (bei offenen DevTools).

### Häufige Fehler

| Problem | Ursache | So findest du es / Lösung |
|---|---|---|
| Statt der Liste steht `[object Promise]` da, oder `.filter is not a function` | `await` vergessen | Vor jeden `Speicher.`-Aufruf gehört `await`. Die Funktion drumherum muss `async` sein. |
| `X is not defined` in der Konsole | Skript-Reihenfolge in `index.html` falsch oder Tippfehler im Namen | Reihenfolge der `<script>`-Zeilen prüfen. Groß-/Kleinschreibung beachten (`Speicher`, nicht `speicher`). |
| Ein Klick tut nichts | Das `data-…`-Attribut im HTML passt nicht zu `beiKlick` | Im Elements-Reiter das Attribut ansehen. Schreibweise vergleichen (`data-aktion="speichern"`). |
| Seite bleibt bei „Lädt …“ | JavaScript-Fehler beim Start | Konsole öffnen. Der erste rote Fehler ist meist die Ursache. |
| Kindername zeigt `&lt;` o. ä. | `esc()` doppelt angewendet | Text nur einmal durch `esc()` schicken, direkt beim Einsetzen ins HTML. |
| Daten am Handy fehlen, die am PC da sind | Jedes Gerät/jede Adresse hat eigenen Speicher | Mitgliederliste bzw. Backup exportieren und am anderen Gerät importieren. |
| Nach einer Code-Änderung sieht man das Alte | Datei nicht gespeichert oder Browser-Cache | Speichern. Dann **Strg+F5** (lädt ohne Cache neu). |
| Umlaute in Excel kaputt | CSV ohne BOM oder falsch geöffnet | Unsere CSV hat den BOM. Am besten in Excel per Doppelklick öffnen. |
| Import meldet „keine gültige JSON-Datei“ | Datei wurde verändert oder ist keine Export-Datei | Datei mit einem Texteditor öffnen. Sie muss mit `{` beginnen und `"typ"` enthalten. |
| „Speichern fehlgeschlagen. Der Browser-Speicher ist voll …“ | Privater Modus oder Speicher voll | Normales Browserfenster nutzen. Backup erstellen, alte Daten löschen. |

### Stolperfallen, die beim Bau wirklich passiert sind

- **Der Browser füllt Felder nach dem Neuladen „hilfsbereit“ wieder aus** (Formular-Wiederherstellung).
  Dadurch war nach F5 plötzlich ein Filter gesetzt. Lösung: `autocomplete="off"` an den Feldern.
- **Das `close`-Ereignis von Dialogen kommt manchmal verspätet** (z. B. wenn der Tab im Hintergrund ist).
  Deshalb räumt `hilfe.js` Dialoge direkt in der eigenen Funktion `schliesse()` auf, statt nur auf das Ereignis zu warten.
- **Schnelles Wechseln der Ansichten** konnte eine alte Ansicht über die neue legen (Race Condition, siehe 5.7).
- **Alte Dateien aus dem Cache:** Der Browser hat geänderte `.js`-Dateien nicht neu geladen. Bei Zweifeln **Strg+F5**.

---

## Kapitel 8: Später – Umstieg auf eine Online-Datenbank (Supabase)

### Was bleibt gleich?

- `index.html`, `style.css`
- alle Ansichten (`ansicht-*.js`), `app.js`, `hilfe.js`, `export.js`

Sie benutzen ja nur `Speicher.xyz()`. Genau dafür haben wir die Kapselung gebaut.

### Was ändert sich?

**1. Tabellen anlegen.** Jede Sammlung wird eine Tabelle, z. B. (vereinfacht, SQL):

```sql
create table gruppen (
  id uuid primary key default gen_random_uuid(),
  standort_id uuid not null references standorte(id),
  name text not null,
  aktiv boolean not null default true,
  reihenfolge int
);
create table anwesenheit (
  id uuid primary key default gen_random_uuid(),
  training_id uuid not null references trainings(id) on delete cascade,
  kind_id uuid not null references kinder(id),
  anwesend boolean not null,
  hinweis text default ''
);
```

**2. Das Innere von `speicher.js` neu schreiben.** Die Funktionsnamen und Rückgabewerte bleiben gleich.
Beispiel (zur Orientierung, noch nicht getestet):

```js
// in index.html vor speicher.js:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
const db = supabase.createClient('https://DEIN-PROJEKT.supabase.co', 'DEIN-ANON-KEY');

async function ladeKinder({ gruppeId, nurAktive = false } = {}) {
  let abfrage = db.from('kinder').select('*').order('vorname');
  if (gruppeId) abfrage = abfrage.eq('gruppe_id', gruppeId);
  if (nurAktive) abfrage = abfrage.eq('aktiv', true);
  const { data, error } = await abfrage;
  if (error) throw new Error('Kinder konnten nicht geladen werden.');
  // Datenbank-Spalten (gruppe_id) in unsere Feldnamen (gruppeId) übersetzen
  return data.map(k => ({ id: k.id, gruppeId: k.gruppe_id, vorname: k.vorname, nachname: k.nachname, aktiv: k.aktiv, probetraining: k.probetraining }));
}
```

Weil schon jetzt überall `await` steht, merken die Ansichten keinen Unterschied.

**3. Neu dazu kommen:**
- **Anmeldung (Login)** für Trainer (Supabase Auth). Dafür braucht es einen Anmelde-Bildschirm.
- **Zugriffsregeln (Row Level Security):** Nur angemeldete Trainer dürfen Daten lesen und schreiben.
- **Gleichzeitiges Arbeiten:** Alle Trainer sehen dieselben Daten, auf Wunsch live aktualisiert (Supabase Realtime).
- **Offline-Fähigkeit:** Hallen haben oft schlechtes Netz. Man kann Trainings zuerst lokal speichern
  und senden, sobald wieder Internet da ist. Das ist eine eigene Etappe.
- **Fehler durch das Netz:** Jeder Aufruf kann scheitern (kein Internet). Die Ansichten fangen Fehler
  schon jetzt mit `try/catch` ab und zeigen eine Meldung.

**4. Was wegfällt oder sich ändert:**
- Mitgliederlisten per Datei zu verschicken ist nicht mehr nötig. Der Import bleibt aber praktisch für den Umzug der lokalen Daten.
- `einstellungen` (wer bin ich, welcher Standort) bleiben lokal im Gerät. Die Funktionen dafür dürfen weiter localStorage benutzen.
- **Datenschutz:** Kinderdaten liegen dann auf einem Server. Serverstandort EU wählen und mit dem Verein klären (Auftragsverarbeitung, Einwilligungen).

**Tipp für den Umstieg:** Die alte Datei nicht löschen, sondern als `speicher-lokal.js` kopieren und die
neue Version daneben bauen. In `index.html` lässt sich dann per `<script>`-Zeile umschalten.

---

## Kapitel 9: Übungsaufgaben

Die Aufgaben werden nach unten schwieriger. Jede berührt eine andere Schicht.

1. **Neue Hinweis-Vorlage** (JavaScript, leicht):
   Füge in `ansicht-training.js` zur Liste `HINWEIS_VORLAGEN` den Eintrag `'ohne Sportsachen'` hinzu.
   Teste: Erscheint der neue Knopf im Hinweis-Fenster?

2. **Eigene Farbe** (CSS, leicht):
   Ändere in `style.css` die Variable `--primaer` auf die Farbe eures Vereins. Prüfe Hell- **und** Dunkelmodus.
   Tipp: Für den Dunkelmodus gibt es `--primaer` noch zweimal weiter unten.

3. **Andere Trainingsdauer** (JavaScript, leicht):
   Ein neues Training dauert standardmäßig 90 Minuten. Finde in `setzeNeu()` die Stelle und mach 60 daraus.

4. **Bemerkung zum Training** (alle Schichten, mittel – die Übung aus Kapitel 1, jetzt richtig):
   - Im Kopfbereich (`kopfHtml()`) ein `<textarea>` mit `data-feld="bemerkung"` einbauen.
   - In `zustand` ein Feld `bemerkung: ''` ergänzen, in `setzeNeu()` und `bearbeite()` setzen.
   - In `speichern()` beim Aufruf von `Speicher.speichereTraining` `bemerkung: zustand.bemerkung` mitgeben.
   - Im Verlauf (`zeigeDetails`) und im CSV (`trainingsAlsCsv`) anzeigen.
   - `speicher.js` musst du **nicht** ändern. Überlege, warum.

5. **Geburtsjahr beim Kind** (mittel):
   Ergänze im Kind-Dialog (`bearbeiteKind` in `ansicht-verwaltung.js`) ein Feld
   `{ name: 'geburtsjahr', label: 'Geburtsjahr', typ: 'number' }` und zeige das Alter in der Kinder-Übersicht an.
   Denk an den Import: Soll `geburtsjahr` dort mit übernommen werden? (Tipp: die Liste der Felder in `importiereMitglieder`.)

**Vorgehen bei allen Aufgaben:** Erst die Stelle mit **Strg+Umschalt+F** suchen. Dann in kleinen Schritten
ändern, nach jedem Schritt speichern, F5 drücken und in der Konsole auf rote Fehler achten.
