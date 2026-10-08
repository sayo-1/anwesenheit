/* =====================================================================
   hilfe.js – kleine Werkzeuge, die in der ganzen App gebraucht werden
   (Datum/Uhrzeit, sicheres HTML, Meldungen, Dialoge, Dateien)
   ===================================================================== */

const Hilfe = (() => {
  /* ---------- Elemente finden ---------- */

  // Kurzschreibweise: Hilfe.$('#inhalt') statt document.querySelector('#inhalt')
  function $(selektor, wurzel = document) {
    return wurzel.querySelector(selektor);
  }

  /* ---------- Sicheres HTML ----------
     Wir bauen viele Teile der Seite als Text mit HTML (innerHTML).
     Würde jemand als Kindernamen z. B. "<img src=x onerror=alert(1)>"
     eingeben, würde der Browser das als echtes HTML ausführen.
     esc() wandelt deshalb die gefährlichen Zeichen in harmlose Codes um.
     REGEL: Alles, was ein Mensch eingegeben hat, kommt durch esc()! */
  function esc(text) {
    return String(text ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#39;');
  }

  /* ---------- Datum und Uhrzeit ---------- */

  function zweistellig(zahl) {
    return String(zahl).padStart(2, '0');
  }

  // Wir speichern Datumswerte als Text "JJJJ-MM-TT" (genau wie <input type="date">).
  // ACHTUNG: new Date().toISOString() wäre falsch, das rechnet in UTC-Zeit
  // und liefert kurz nach Mitternacht noch das Datum von gestern.
  function datumZuISO(datum) {
    return `${datum.getFullYear()}-${zweistellig(datum.getMonth() + 1)}-${zweistellig(datum.getDate())}`;
  }

  function heuteISO() {
    return datumZuISO(new Date());
  }

  function isoZuDatum(iso) {
    const [jahr, monat, tag] = iso.split('-').map(Number);
    return new Date(jahr, monat - 1, tag); // Monate zählen in JavaScript ab 0!
  }

  // art: 'normal' -> "Do., 08.10.2026", 'kurz' -> "08.10.2026", 'lang' -> "Donnerstag, 8. Oktober 2026"
  function formatDatum(iso, art = 'normal') {
    if (!iso) return '';
    const d = isoZuDatum(iso);
    const optionen = {
      kurz: { day: '2-digit', month: '2-digit', year: 'numeric' },
      lang: { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' },
      normal: { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }
    };
    return d.toLocaleDateString('de-DE', optionen[art] || optionen.normal);
  }

  function zeitZuMinuten(hhmm) {
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
  }

  function minutenZuZeit(minuten) {
    const m = ((minuten % 1440) + 1440) % 1440; // bleibt immer zwischen 00:00 und 23:59
    return `${zweistellig(Math.floor(m / 60))}:${zweistellig(m % 60)}`;
  }

  // Aktuelle Uhrzeit, abgerundet auf die letzte Viertelstunde (17:08 -> 17:00)
  function jetztGerundet(schritt = 15) {
    const d = new Date();
    return minutenZuZeit(Math.floor((d.getHours() * 60 + d.getMinutes()) / schritt) * schritt);
  }

  function zeitPlus(hhmm, minuten) {
    return minutenZuZeit(zeitZuMinuten(hhmm) + minuten);
  }

  /* ---------- Kleine Rechen- und Text-Helfer ---------- */

  function vollerName(kind) {
    return `${kind.vorname || ''} ${kind.nachname || ''}`.trim();
  }

  function initialen(kind) {
    // Erster Buchstabe vom Vor- und vom Nachnamen: "Mia Muster" -> "MM"
    const vorne = (kind.vorname || '?').charAt(0);
    const hinten = (kind.nachname || '').charAt(0);
    return (vorne + hinten).toUpperCase();
  }

  // Anwesenheitsquote in Prozent (oder null, wenn es noch keine Trainings gab)
  function quote(anwesend, gesamt) {
    return gesamt ? Math.round((anwesend / gesamt) * 100) : null;
  }

  // CSS-Klasse für die Farbe einer Quote: grün, gelb oder rot
  function quoteKlasse(prozent) {
    if (prozent == null) return 'keine';
    if (prozent >= 75) return 'gut';
    if (prozent >= 50) return 'mittel';
    return 'niedrig';
  }

  // Wandelt eine Liste in eine Map um, damit man schnell per ID nachschlagen kann:
  // karte.get(id) statt liste.find(e => e.id === id)
  function alsKarte(liste) {
    return new Map(liste.map(e => [e.id, e]));
  }

  // Ein Icon aus dem SVG-Sprite in index.html einfügen
  function icon(name, klasse = '') {
    return `<svg class="icon ${klasse}" aria-hidden="true"><use href="#i-${name}"></use></svg>`;
  }

  // Einheitliche Anzeige für leere Listen
  function leererZustand({ icon: iconName = 'info', titel, text = '', aktion = '' }) {
    return `
      <div class="leer">
        <div class="leer-icon">${icon(iconName)}</div>
        <h3>${esc(titel)}</h3>
        ${text ? `<p>${esc(text)}</p>` : ''}
        ${aktion ? `<div class="leer-aktion">${aktion}</div>` : ''}
      </div>`;
  }

  /* ---------- Meldungen ("Toasts") ----------
     Kurze Hinweise, die oben erscheinen und von selbst verschwinden. */
  function zeigeMeldung(text, art = 'info', dauer = 3200) {
    const behaelter = $('#meldungen');
    const meldung = document.createElement('div');
    const icons = { erfolg: 'check', fehler: 'alert', info: 'info' };
    meldung.className = `meldung meldung-${art}`;
    meldung.setAttribute('role', art === 'fehler' ? 'alert' : 'status');
    meldung.innerHTML = `${icon(icons[art] || 'info')}<span>${esc(text)}</span>`;
    behaelter.append(meldung);
    setTimeout(() => {
      meldung.classList.add('weg'); // CSS blendet aus
      setTimeout(() => meldung.remove(), 400);
    }, dauer);
  }

  /* ---------- Dialoge ----------
     Wir nutzen das eingebaute <dialog>-Element des Browsers.
     showModal() legt es über die Seite und dunkelt den Rest ab.
     Jede Dialog-Funktion gibt ein Promise zurück: Der Aufrufer wartet
     mit "await", bis der Dialog geschlossen ist, und bekommt die Antwort. */

  function dialogRahmen({ titel, inhalt, knoepfeHtml, alsFormular = false }) {
    const tag = alsFormular ? 'form' : 'div';
    return `
      <${tag} class="dialog-rahmen">
        <div class="dialog-kopf">
          <h2 class="dialog-titel">${esc(titel)}</h2>
          <button type="button" class="icon-knopf" data-dialog-wert="" aria-label="Schließen">${icon('x')}</button>
        </div>
        <div class="dialog-inhalt">${inhalt}</div>
        <div class="dialog-knoepfe">${knoepfeHtml}</div>
      </${tag}>`;
  }

  // Zeigt den Dialog an und gibt eine Funktion "schliesse(wert)" zurück.
  // Wir räumen direkt beim Schließen auf, statt auf das "close"-Ereignis
  // des Browsers zu warten: Das kommt in manchen Situationen verzögert
  // (z. B. wenn der Tab im Hintergrund ist).
  const offeneDialoge = new Set(); // die "schliesse"-Funktionen aller offenen Dialoge

  function oeffneDialog(dialog, beiSchliessen) {
    let fertig = false;
    function schliesse(wert) {
      if (fertig) return; // nur einmal ausführen
      fertig = true;
      offeneDialoge.delete(schliesse);
      if (dialog.open) dialog.close(wert);
      beiSchliessen(wert);
      dialog.remove();
    }
    offeneDialoge.add(schliesse);

    dialog.addEventListener('click', e => {
      const knopf = e.target.closest('[data-dialog-wert]');
      if (knopf) schliesse(knopf.dataset.dialogWert);
      else if (e.target === dialog) schliesse(''); // Tipp auf den dunklen Hintergrund
    });
    // Die Escape-Taste schließt den Dialog über den Browser -> dann kommt "close"
    dialog.addEventListener('close', () => schliesse(dialog.returnValue));

    document.body.append(dialog);
    dialog.showModal();
    return schliesse;
  }

  // Schließt alle offenen Dialoge wie "Abbrechen" (z. B. beim Wechsel der Ansicht)
  function schliesseAlleDialoge() {
    [...offeneDialoge].forEach(schliesse => schliesse(''));
  }

  /**
   * Allgemeiner Dialog mit eigenen Knöpfen.
   * knoepfe: [{ text, wert, art: 'primaer' | 'leise' | 'gefahr' | 'gefahr-leise', icon }]
   * Ergebnis: der "wert" des gedrückten Knopfes oder null.
   */
  function zeigeDialog({ titel, inhalt = '', knoepfe = [{ text: 'OK', wert: 'ok', art: 'primaer' }], klasse = '', beiOeffnen }) {
    return new Promise(resolve => {
      const dialog = document.createElement('dialog');
      dialog.className = `dialog ${klasse}`;
      const knoepfeHtml = knoepfe.map(k => `
        <button type="button" class="knopf knopf-${k.art || 'leise'}" data-dialog-wert="${esc(k.wert)}">
          ${k.icon ? icon(k.icon) : ''}<span>${esc(k.text)}</span>
        </button>`).join('');
      dialog.innerHTML = dialogRahmen({ titel, inhalt, knoepfeHtml });
      oeffneDialog(dialog, wert => resolve(wert || null));
      if (beiOeffnen) beiOeffnen(dialog);
    });
  }

  // Ja/Nein-Frage. Ergebnis: true oder false.
  async function bestaetige({ titel, text, okText = 'OK', gefahr = false }) {
    const wert = await zeigeDialog({
      titel,
      inhalt: `<p>${esc(text)}</p>`,
      klasse: 'dialog-klein',
      knoepfe: [
        { text: 'Abbrechen', wert: 'nein', art: 'leise' },
        { text: okText, wert: 'ja', art: gefahr ? 'gefahr' : 'primaer' }
      ]
    });
    return wert === 'ja';
  }

  let feldZaehler = 0;

  // Baut das HTML für ein Formularfeld aus einer kleinen Beschreibung.
  function feldHtml(f) {
    const id = `feld-${++feldZaehler}`;
    const pflicht = f.pflicht ? 'required' : '';
    const versteckt = f.versteckt ? 'hidden' : '';

    if (f.typ === 'checkbox') {
      return `
        <label class="schalter-zeile" for="${id}" data-feld="${f.name}" ${versteckt}>
          <span><strong>${esc(f.label)}</strong>${f.beschreibung ? `<small>${esc(f.beschreibung)}</small>` : ''}</span>
          <input type="checkbox" role="switch" class="schalter" id="${id}" name="${f.name}" autocomplete="off" ${f.wert ? 'checked' : ''}>
        </label>`;
    }

    let eingabe;
    if (f.typ === 'select') {
      eingabe = `<select id="${id}" name="${f.name}" autocomplete="off" ${pflicht}>
        ${f.optionen.map(o => `<option value="${esc(o.wert)}" ${String(o.wert) === String(f.wert ?? '') ? 'selected' : ''}>${esc(o.text)}</option>`).join('')}
      </select>`;
    } else if (f.typ === 'textarea') {
      eingabe = `<textarea id="${id}" name="${f.name}" rows="${f.zeilen || 4}" placeholder="${esc(f.platzhalter || '')}" ${pflicht}>${esc(f.wert ?? '')}</textarea>`;
    } else {
      eingabe = `<input id="${id}" name="${f.name}" type="${f.typ || 'text'}" value="${esc(f.wert ?? '')}"
        placeholder="${esc(f.platzhalter || '')}" ${pflicht} ${f.autofokus ? 'autofocus' : ''}
        ${f.min != null ? `min="${f.min}"` : ''} autocomplete="off" ${f.typ === 'text' || !f.typ ? 'autocapitalize="words"' : ''}>`;
    }
    return `
      <div class="feld" data-feld="${f.name}" ${versteckt}>
        <label class="feld-label" for="${id}">${esc(f.label)}</label>
        ${eingabe}
        ${f.beschreibung ? `<small class="feld-hilfe">${esc(f.beschreibung)}</small>` : ''}
      </div>`;
  }

  /**
   * Dialog mit Formularfeldern.
   * felder: [{ name, label, typ: 'text'|'select'|'checkbox'|'textarea'|'number'|..., wert, optionen, pflicht }]
   * pruefe(werte): optional. Gibt einen Fehlertext zurück, wenn etwas nicht stimmt.
   * Ergebnis: Objekt mit allen Werten oder null (abgebrochen).
   */
  function formularDialog({ titel, felder, okText = 'Speichern', hinweis = '', pruefe, beiOeffnen }) {
    return new Promise(resolve => {
      let ergebnis = null;
      const dialog = document.createElement('dialog');
      dialog.className = 'dialog';
      const inhalt = `
        ${hinweis ? `<p class="text-leise">${esc(hinweis)}</p>` : ''}
        ${felder.map(feldHtml).join('')}
        <p class="dialog-fehler" role="alert" hidden></p>`;
      const knoepfeHtml = `
        <button type="button" class="knopf knopf-leise" data-dialog-wert="">Abbrechen</button>
        <button type="submit" class="knopf knopf-primaer">${esc(okText)}</button>`;
      dialog.innerHTML = dialogRahmen({ titel, inhalt, knoepfeHtml, alsFormular: true });

      const formular = dialog.querySelector('form');
      // "submit" kommt erst, wenn die eingebaute Prüfung (z. B. "required") bestanden ist.
      formular.addEventListener('submit', e => {
        e.preventDefault(); // Formulare würden sonst die Seite neu laden
        const werte = {};
        for (const f of felder) {
          const el = formular.elements.namedItem(f.name);
          werte[f.name] = f.typ === 'checkbox' ? el.checked : el.value.trim();
        }
        const fehler = pruefe ? pruefe(werte) : '';
        if (fehler) {
          const fehlerEl = dialog.querySelector('.dialog-fehler');
          fehlerEl.textContent = fehler;
          fehlerEl.hidden = false;
          return;
        }
        ergebnis = werte;
        schliesse('ok');
      });

      const schliesse = oeffneDialog(dialog, () => resolve(ergebnis));
      if (beiOeffnen) beiOeffnen(dialog);
    });
  }

  /* ---------- Dateien ---------- */

  // Erzeugt eine Datei im Speicher (Blob) und lässt den Browser sie herunterladen.
  function ladeHerunter(dateiname, inhalt, typ = 'application/json') {
    const blob = new Blob([inhalt], { type: `${typ};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = dateiname;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000); // Speicher wieder freigeben
  }

  // Öffnet die Dateiauswahl und liefert den Text der gewählten Datei (oder null).
  function waehleDatei(accept = '.json,application/json') {
    return new Promise(resolve => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = accept;
      input.addEventListener('change', async () => {
        const datei = input.files[0];
        resolve(datei ? await datei.text() : null);
      });
      input.addEventListener('cancel', () => resolve(null));
      input.click();
    });
  }

  return {
    $, esc,
    datumZuISO, heuteISO, isoZuDatum, formatDatum, zeitZuMinuten, jetztGerundet, zeitPlus,
    vollerName, initialen, quote, quoteKlasse, alsKarte, icon, leererZustand,
    zeigeMeldung, zeigeDialog, bestaetige, formularDialog, schliesseAlleDialoge,
    ladeHerunter, waehleDatei
  };
})();
