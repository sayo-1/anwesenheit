/* =====================================================================
   app.js – Start der App, Navigation und Aktionen für die ganze App
   ---------------------------------------------------------------------
   Diese Datei wird als LETZTE geladen. Alle anderen Teile (Hilfe,
   Speicher, Ansichten ...) existieren dann schon.
   ===================================================================== */

const App = (() => {
  // Welche Ansicht gehört zu welcher Adresse (#training, #verlauf, ...)?
  const ANSICHTEN = {
    training: TrainingAnsicht,
    verlauf: VerlaufAnsicht,
    kinder: KinderAnsicht,
    verwaltung: VerwaltungAnsicht
  };
  const TITEL = { training: 'Training', verlauf: 'Verlauf', kinder: 'Kinder', verwaltung: 'Verwaltung' };
  const FARBMODI = {
    auto: { icon: 'monitor', text: 'Automatisch' },
    hell: { icon: 'sun', text: 'Hell' },
    dunkel: { icon: 'moon', text: 'Dunkel' }
  };

  let einrichtungGefragt = false; // nur einmal pro Sitzung automatisch fragen
  let letzteAnsicht = '';
  let ansichtsAuftrag = 0; // zählt mit, welche Anzeige die neueste ist

  async function start() {
    await wendeFarbmodusAn();

    Hilfe.$('#farbmodus-knopf').addEventListener('click', wechsleFarbmodus);
    Hilfe.$('#profil-knopf').addEventListener('click', () => oeffneEinrichtung());

    // Navigation über den "Hash" (#training, #verlauf/...). Vorteil: funktioniert
    // ohne Server, und der Zurück-Knopf des Handys springt zur vorigen Ansicht.
    window.addEventListener('hashchange', zeigeAktuelleAnsicht);

    // Warnung, wenn man die Seite mit ungespeicherten Änderungen schließen will
    window.addEventListener('beforeunload', e => {
      if (TrainingAnsicht.hatUngespeichertes()) {
        e.preventDefault();
        e.returnValue = '';
      }
    });

    await aktualisiereProfil();
    await zeigeAktuelleAnsicht();
  }

  /* ------------------------------------------------------------------
     Navigation
     ------------------------------------------------------------------ */

  async function zeigeAktuelleAnsicht() {
    // "#verwaltung/kinder" -> name = "verwaltung", parameter = "kinder"
    const [name, parameter] = location.hash.slice(1).split('/');
    const ansicht = ANSICHTEN[name] ? name : 'training';

    // Offene Dialoge schließen (z. B. wenn jemand die Zurück-Taste des Handys drückt)
    Hilfe.schliesseAlleDialoge();

    document.querySelectorAll('.hauptnavigation a').forEach(link => {
      if (link.dataset.ansicht === ansicht) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
    document.title = `${TITEL[ansicht]} · Anwesenheit`;

    // Die Ansicht zeichnet zuerst in einen neuen, noch unsichtbaren Behälter.
    // Erst wenn sie fertig ist, kommt sie auf die Seite – aber nur, wenn
    // inzwischen keine andere Ansicht gewählt wurde. Sonst könnte bei schnellem
    // Tippen eine langsame, alte Ansicht die neue überschreiben.
    const auftrag = ++ansichtsAuftrag;
    const behaelter = document.createElement('div');
    try {
      await ANSICHTEN[ansicht].zeige(behaelter, parameter);
    } catch (fehler) {
      console.error(fehler);
      behaelter.innerHTML = Hilfe.leererZustand({ icon: 'alert', titel: 'Etwas ist schiefgelaufen', text: fehler.message });
    }
    if (auftrag !== ansichtsAuftrag) return; // veraltet -> nicht anzeigen
    Hilfe.$('#inhalt').replaceChildren(behaelter);

    if (ansicht !== letzteAnsicht) {
      window.scrollTo(0, 0);
      letzteAnsicht = ansicht;
    }
    if (ansicht === 'training') await pruefeEinrichtung();
  }

  function navigiere(ziel) {
    if (location.hash === `#${ziel}`) zeigeAktuelleAnsicht();
    else location.hash = ziel;
  }

  /* ------------------------------------------------------------------
     Einrichtung: Wer bin ich, wo trainiere ich?
     ------------------------------------------------------------------ */

  async function aktualisiereProfil() {
    const [trainer, standorte, e] = await Promise.all([
      Speicher.ladeTrainer(), Speicher.ladeStandorte(), Speicher.ladeEinstellungen()
    ]);
    const ich = trainer.find(t => t.id === e.trainerId);
    const standort = standorte.find(s => s.id === e.standortId);
    const text = ich ? [ich.name, standort?.name].filter(Boolean).join(' · ') : 'Einrichten';
    Hilfe.$('#profil-text').textContent = text;
    Hilfe.$('#profil-knopf').setAttribute('aria-label', `Trainer und Standort: ${text}. Tippen zum Ändern.`);
  }

  // Beim ersten Start (oder wenn der gemerkte Trainer fehlt) automatisch fragen
  async function pruefeEinrichtung() {
    if (einrichtungGefragt) return;
    const [standorte, trainer, e] = await Promise.all([
      Speicher.ladeStandorte({ nurAktive: true }), Speicher.ladeTrainer({ nurAktive: true }), Speicher.ladeEinstellungen()
    ]);
    if (!standorte.length) return; // dann zeigt die Training-Ansicht den Willkommens-Bildschirm
    if (!trainer.some(t => t.id === e.trainerId)) {
      einrichtungGefragt = true;
      await oeffneEinrichtung({ ersterStart: true });
    }
  }

  async function oeffneEinrichtung({ ersterStart = false } = {}) {
    const NEU = '__neu__';
    const [standorte, trainer, e] = await Promise.all([
      Speicher.ladeStandorte({ nurAktive: true }), Speicher.ladeTrainer({ nurAktive: true }), Speicher.ladeEinstellungen()
    ]);
    const trainerBekannt = trainer.some(t => t.id === e.trainerId);
    const startWert = trainerBekannt ? e.trainerId : (trainer.length ? '' : NEU);

    const werte = await Hilfe.formularDialog({
      titel: ersterStart ? 'Wer bist du?' : 'Trainer und Standort',
      hinweis: 'Wird auf diesem Gerät gespeichert und beim nächsten Mal vorausgewählt. Du kannst es jederzeit oben rechts ändern.',
      okText: 'Übernehmen',
      felder: [
        {
          name: 'trainerId', label: 'Dein Name', typ: 'select', wert: startWert,
          optionen: [
            { wert: '', text: '– bitte wählen –' },
            ...trainer.map(t => ({ wert: t.id, text: t.name })),
            { wert: NEU, text: '+ Neuer Trainer …' }
          ]
        },
        { name: 'neuerName', label: 'Name des neuen Trainers', platzhalter: 'Vor- und Nachname', versteckt: startWert !== NEU },
        {
          name: 'standortId', label: 'Dein Standort', typ: 'select',
          wert: standorte.some(s => s.id === e.standortId) ? e.standortId : '',
          optionen: [
            { wert: '', text: standorte.length ? '– bitte wählen –' : '– noch kein Standort angelegt –' },
            ...standorte.map(s => ({ wert: s.id, text: s.name }))
          ]
        }
      ],
      pruefe: w => {
        if (!w.trainerId) return 'Bitte wähle deinen Namen aus.';
        if (w.trainerId === NEU && !w.neuerName) return 'Bitte gib deinen Namen ein.';
        if (standorte.length && !w.standortId) return 'Bitte wähle deinen Standort.';
        return '';
      },
      beiOeffnen: dialog => {
        // Das Namensfeld nur zeigen, wenn "+ Neuer Trainer" gewählt ist
        const auswahl = dialog.querySelector('[name="trainerId"]');
        const neuFeld = dialog.querySelector('[data-feld="neuerName"]');
        auswahl.addEventListener('change', () => {
          neuFeld.hidden = auswahl.value !== NEU;
          if (!neuFeld.hidden) neuFeld.querySelector('input').focus();
        });
      }
    });
    if (!werte) return;

    let trainerId = werte.trainerId;
    if (trainerId === NEU) {
      // Gibt es den Namen schon (vielleicht inaktiv)? Dann diesen nehmen statt doppelt anlegen.
      const alle = await Speicher.ladeTrainer();
      const vorhanden = alle.find(t => t.name.toLowerCase() === werte.neuerName.toLowerCase());
      const gespeichert = await Speicher.speichereTrainer(vorhanden ? { id: vorhanden.id, aktiv: true } : { name: werte.neuerName });
      trainerId = gespeichert.id;
    }
    await Speicher.speichereEinstellungen({ trainerId, standortId: werte.standortId || null });
    await aktualisiereProfil();
    TrainingAnsicht.zuruecksetzen(); // neue Vorauswahl übernehmen (falls nichts Ungespeichertes offen ist)
    Hilfe.zeigeMeldung('Gespeichert. Schön, dass du da bist!', 'erfolg');
    await zeigeAktuelleAnsicht();
  }

  // Entfernt gemerkte IDs, die es nicht mehr gibt (z. B. nach dem Löschen der Testdaten)
  async function bereinigeEinstellungen() {
    const [trainer, standorte, e] = await Promise.all([
      Speicher.ladeTrainer(), Speicher.ladeStandorte(), Speicher.ladeEinstellungen()
    ]);
    await Speicher.speichereEinstellungen({
      trainerId: trainer.some(t => t.id === e.trainerId) ? e.trainerId : null,
      standortId: standorte.some(s => s.id === e.standortId) ? e.standortId : null
    });
  }

  // Nach großen Datenänderungen: alles auf Anfang
  async function nachDatenaenderung() {
    await bereinigeEinstellungen();
    einrichtungGefragt = false;
    TrainingAnsicht.zuruecksetzen(true);
    await aktualisiereProfil();
    await zeigeAktuelleAnsicht();
    await pruefeEinrichtung();
  }

  /* ------------------------------------------------------------------
     Farbmodus (Hell / Dunkel / Automatisch)
     ------------------------------------------------------------------ */

  async function wendeFarbmodusAn() {
    const { farbmodus = 'auto' } = await Speicher.ladeEinstellungen();
    // Das CSS reagiert auf das Attribut data-theme am <html>-Element
    const html = document.documentElement;
    if (farbmodus === 'hell') html.dataset.theme = 'light';
    else if (farbmodus === 'dunkel') html.dataset.theme = 'dark';
    else delete html.dataset.theme;

    const info = FARBMODI[farbmodus] || FARBMODI.auto;
    const knopf = Hilfe.$('#farbmodus-knopf');
    knopf.innerHTML = Hilfe.icon(info.icon);
    knopf.title = `Farbmodus: ${info.text}`;
    knopf.setAttribute('aria-label', `Farbmodus: ${info.text}. Tippen zum Wechseln.`);
  }

  async function setzeFarbmodus(modus) {
    await Speicher.speichereEinstellungen({ farbmodus: modus });
    await wendeFarbmodusAn();
  }

  async function wechsleFarbmodus() {
    const { farbmodus = 'auto' } = await Speicher.ladeEinstellungen();
    const reihenfolge = Object.keys(FARBMODI);
    const naechster = reihenfolge[(reihenfolge.indexOf(farbmodus) + 1) % reihenfolge.length];
    await setzeFarbmodus(naechster);
    Hilfe.zeigeMeldung(`Farbmodus: ${FARBMODI[naechster].text}`, 'info', 1600);
    if (location.hash.startsWith('#verwaltung/daten')) await zeigeAktuelleAnsicht();
  }

  /* ------------------------------------------------------------------
     Aktionen mit Daten (aus Willkommen und Verwaltung aufgerufen)
     ------------------------------------------------------------------ */

  // Liest eine gewählte JSON-Datei ein. Gibt null zurück bei Abbruch oder Fehler.
  async function leseJsonDatei() {
    const text = await Hilfe.waehleDatei();
    if (!text) return null;
    try {
      return JSON.parse(text);
    } catch {
      Hilfe.zeigeMeldung('Die Datei ist keine gültige JSON-Datei.', 'fehler', 5000);
      return null;
    }
  }

  async function ladeTestdaten() {
    try {
      if (await Speicher.hatTestdaten()) {
        Hilfe.zeigeMeldung('Die Testdaten sind bereits geladen.');
        return;
      }
      const ergebnis = await Testdaten.lade();
      Hilfe.zeigeMeldung(`Testdaten geladen: ${ergebnis.kinder} Kinder und ${ergebnis.trainings} Trainings.`, 'erfolg', 4000);
      await nachDatenaenderung();
    } catch (fehler) {
      Hilfe.zeigeMeldung(fehler.message, 'fehler', 5000);
    }
  }

  async function loescheTestdaten() {
    const sicher = await Hilfe.bestaetige({
      titel: 'Testdaten löschen?',
      text: 'Alle erfundenen Standorte, Gruppen, Kinder, Trainer und Trainings werden entfernt. Selbst angelegte Daten bleiben erhalten, außer sie gehören zu einem Test-Standort.',
      okText: 'Testdaten löschen',
      gefahr: true
    });
    if (!sicher) return;
    await Speicher.loescheTestdaten();
    Hilfe.zeigeMeldung('Testdaten gelöscht.', 'erfolg');
    await nachDatenaenderung();
  }

  async function importiereMitglieder() {
    const daten = await leseJsonDatei();
    if (!daten) return;
    try {
      const e = await Speicher.importiereMitglieder(daten);
      await Hilfe.zeigeDialog({
        titel: 'Import abgeschlossen',
        klasse: 'dialog-klein',
        inhalt: `
          <ul class="ergebnis-liste">
            <li><strong>${e.neu}</strong> neu angelegt</li>
            <li><strong>${e.aktualisiert}</strong> aktualisiert</li>
            <li><strong>${e.unveraendert}</strong> waren schon vorhanden</li>
          </ul>
          <p class="text-leise">Gezählt werden Standorte, Gruppen, Kinder und Trainer zusammen.</p>`,
        knoepfe: [{ text: 'OK', wert: 'ok', art: 'primaer' }]
      });
      await nachDatenaenderung();
    } catch (fehler) {
      Hilfe.zeigeMeldung(fehler.message, 'fehler', 5000);
    }
  }

  async function stelleBackupWiederHer() {
    const daten = await leseJsonDatei();
    if (!daten) return;
    if (daten.typ !== 'backup') {
      Hilfe.zeigeMeldung('Diese Datei ist kein Backup dieser App.', 'fehler', 5000);
      return;
    }
    const vom = daten.erstelltAm ? new Date(daten.erstelltAm).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }) : 'unbekannt';
    const sicher = await Hilfe.bestaetige({
      titel: 'Backup wiederherstellen?',
      text: `Backup vom ${vom}: ${daten.kinder?.length ?? 0} Kinder, ${daten.trainings?.length ?? 0} Trainings. ALLE aktuellen Daten auf diesem Gerät werden dadurch ersetzt.`,
      okText: 'Wiederherstellen',
      gefahr: true
    });
    if (!sicher) return;
    try {
      await Speicher.stelleBackupWiederHer(daten);
      Hilfe.zeigeMeldung('Backup wiederhergestellt.', 'erfolg');
      await nachDatenaenderung();
    } catch (fehler) {
      Hilfe.zeigeMeldung(fehler.message, 'fehler', 5000);
    }
  }

  async function loescheAlles() {
    const sicher = await Hilfe.bestaetige({
      titel: 'Alle Daten löschen?',
      text: 'Alle Standorte, Gruppen, Kinder, Trainer und Trainings auf diesem Gerät werden endgültig gelöscht. Tipp: Erstelle vorher ein Backup.',
      okText: 'Alles löschen',
      gefahr: true
    });
    if (!sicher) return;
    await Speicher.loescheAlleDaten();
    Hilfe.zeigeMeldung('Alle Daten wurden gelöscht.', 'erfolg');
    einrichtungGefragt = false;
    TrainingAnsicht.zuruecksetzen(true);
    await aktualisiereProfil();
    navigiere('training');
  }

  return {
    start, navigiere, aktualisiereProfil, oeffneEinrichtung, setzeFarbmodus,
    ladeTestdaten, loescheTestdaten, importiereMitglieder, stelleBackupWiederHer, loescheAlles
  };
})();

// Los geht's!
App.start();
