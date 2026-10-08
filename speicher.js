/* =====================================================================
   speicher.js – die Speicher-Schicht der App
   ---------------------------------------------------------------------
   WICHTIG: Das ist die EINZIGE Datei, die localStorage benutzt.
   Alle anderen Dateien rufen nur Funktionen von "Speicher" auf,
   z. B. Speicher.ladeKinder() oder Speicher.speichereTraining().

   Warum? Wenn wir später auf eine Online-Datenbank (z. B. Supabase)
   umsteigen, schreiben wir nur DIESE Datei neu. Der Rest der App merkt
   davon nichts, solange die Funktionen gleich heißen und dasselbe
   zurückgeben.

   Warum sind alle öffentlichen Funktionen "async"?
   localStorage antwortet sofort. Eine Online-Datenbank braucht aber Zeit
   (Internet!). Damit wir später nichts umbauen müssen, tun wir schon
   jetzt so, als würde jede Speicher-Aktion etwas dauern: Jede Funktion
   gibt ein Promise zurück, und der Aufrufer wartet mit "await" darauf.
   ===================================================================== */

// Das (() => { ... })() nennt man IIFE ("sofort ausgeführte Funktion").
// Alles darin ist privat. Nur was wir am Ende mit "return" herausgeben,
// ist von außen als Speicher.xyz erreichbar.
const Speicher = (() => {
  // Alle Schlüssel beginnen mit diesem Präfix. So kommen wir nicht mit
  // anderen Seiten durcheinander, die im selben Browser localStorage nutzen.
  const PREFIX = 'anwesenheit.';
  const DATENVERSION = 1;

  // Jede "Sammlung" entspricht später einer Tabelle in der Datenbank.
  const SAMMLUNGEN = ['standorte', 'gruppen', 'kinder', 'trainer', 'trainings', 'anwesenheit'];

  /* ------------------------------------------------------------------
     Interne Helfer (von außen nicht sichtbar)
     ------------------------------------------------------------------ */

  // Liest eine Sammlung. localStorage kann nur Text speichern, deshalb
  // wandelt JSON.parse den Text wieder in eine JavaScript-Liste um.
  function lies(sammlung) {
    try {
      const roh = localStorage.getItem(PREFIX + sammlung);
      return roh ? JSON.parse(roh) : [];
    } catch (fehler) {
      console.error(`Konnte "${sammlung}" nicht lesen:`, fehler);
      return [];
    }
  }

  // Schreibt eine ganze Sammlung zurück (JSON.stringify macht Text daraus).
  function schreib(sammlung, liste) {
    try {
      localStorage.setItem(PREFIX + sammlung, JSON.stringify(liste));
    } catch (fehler) {
      console.error(`Konnte "${sammlung}" nicht speichern:`, fehler);
      throw new Error('Speichern fehlgeschlagen. Der Browser-Speicher ist voll oder gesperrt (z. B. im privaten Modus).');
    }
  }

  // Jeder Eintrag bekommt eine weltweit eindeutige ID (UUID).
  // Supabase verwendet dasselbe Format, deshalb passen die Daten später direkt.
  function neueId() {
    if (window.crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    // Ersatz für ältere Browser: bekannte Kurzform, die eine UUID aus Zufallszahlen baut.
    return '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, c =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
  }

  function jetzt() {
    return new Date().toISOString();
  }

  // "  Mia   Muster " und "mia muster" sollen als gleich gelten (für den Import).
  function normalisiere(text) {
    return String(text ?? '').trim().toLowerCase().replace(/\s+/g, ' ');
  }

  // Sortiert nach dem Feld "reihenfolge", bei Gleichstand nach Name.
  function nachReihenfolge(a, b) {
    return (a.reihenfolge ?? 999) - (b.reihenfolge ?? 999) ||
      String(a.name).localeCompare(String(b.name), 'de');
  }

  // Legt einen Eintrag neu an (ohne id) oder aktualisiert ihn (mit id).
  // "standard" enthält Werte, die NUR beim Neuanlegen gesetzt werden.
  function speichereEintrag(sammlung, eintrag, standard = {}) {
    const liste = lies(sammlung);
    const zeit = jetzt();
    const index = eintrag.id ? liste.findIndex(e => e.id === eintrag.id) : -1;
    let gespeichert;

    if (index === -1) {
      // "..." (Spread) kopiert alle Felder. Spätere Felder überschreiben frühere.
      gespeichert = { ...standard, erstelltAm: zeit, ...eintrag, id: eintrag.id || neueId(), geaendertAm: zeit };
      liste.push(gespeichert);
    } else {
      gespeichert = { ...liste[index], ...eintrag, geaendertAm: zeit };
      liste[index] = gespeichert;
    }

    schreib(sammlung, liste);
    return gespeichert;
  }

  function alsKarte(liste) {
    return new Map(liste.map(e => [e.id, e]));
  }

  /* ------------------------------------------------------------------
     Standorte
     ------------------------------------------------------------------ */

  async function ladeStandorte({ nurAktive = false } = {}) {
    return lies('standorte')
      .filter(s => !nurAktive || s.aktiv !== false)
      .sort(nachReihenfolge);
  }

  async function speichereStandort(standort) {
    return speichereEintrag('standorte', standort, { aktiv: true, reihenfolge: lies('standorte').length });
  }

  /* ------------------------------------------------------------------
     Gruppen (gehören zu einem Standort)
     ------------------------------------------------------------------ */

  async function ladeGruppen({ standortId, nurAktive = false } = {}) {
    return lies('gruppen')
      .filter(g => (!standortId || g.standortId === standortId) && (!nurAktive || g.aktiv !== false))
      .sort(nachReihenfolge);
  }

  async function speichereGruppe(gruppe) {
    const anzahlAmStandort = lies('gruppen').filter(g => g.standortId === gruppe.standortId).length;
    return speichereEintrag('gruppen', gruppe, { aktiv: true, reihenfolge: anzahlAmStandort });
  }

  /* ------------------------------------------------------------------
     Kinder (gehören zu einer Gruppe)
     ------------------------------------------------------------------ */

  async function ladeKinder({ gruppeId, standortId, nurAktive = false } = {}) {
    let kinder = lies('kinder');
    if (gruppeId) kinder = kinder.filter(k => k.gruppeId === gruppeId);
    if (standortId) {
      const gruppenIds = new Set(lies('gruppen').filter(g => g.standortId === standortId).map(g => g.id));
      kinder = kinder.filter(k => gruppenIds.has(k.gruppeId));
    }
    if (nurAktive) kinder = kinder.filter(k => k.aktiv !== false);
    return kinder.sort((a, b) =>
      a.vorname.localeCompare(b.vorname, 'de') || (a.nachname || '').localeCompare(b.nachname || '', 'de'));
  }

  async function ladeKind(id) {
    return lies('kinder').find(k => k.id === id) || null;
  }

  async function speichereKind(kind) {
    return speichereEintrag('kinder', kind, { aktiv: true, probetraining: false });
  }

  /* ------------------------------------------------------------------
     Trainer
     ------------------------------------------------------------------ */

  async function ladeTrainer({ nurAktive = false } = {}) {
    return lies('trainer')
      .filter(t => !nurAktive || t.aktiv !== false)
      .sort((a, b) => a.name.localeCompare(b.name, 'de'));
  }

  async function speichereTrainer(trainer) {
    return speichereEintrag('trainer', trainer, { aktiv: true });
  }

  /* ------------------------------------------------------------------
     Trainings und Anwesenheit
     ------------------------------------------------------------------ */

  // Lädt Trainings, optional gefiltert. Zusätzlich wird für jedes Training
  // gezählt, wie viele Kinder da waren (anzahlAnwesend / anzahlGesamt).
  // Datumswerte sind Text im Format JJJJ-MM-TT. Dieses Format kann man
  // einfach mit < und > vergleichen, weil das Jahr vorne steht.
  async function ladeTrainings({ standortId, gruppeId, datumVon, datumBis } = {}) {
    const zaehler = {};
    for (const a of lies('anwesenheit')) {
      const z = zaehler[a.trainingId] ||= { anwesend: 0, gesamt: 0 };
      z.gesamt++;
      if (a.anwesend) z.anwesend++;
    }
    return lies('trainings')
      .filter(t =>
        (!standortId || t.standortId === standortId) &&
        (!gruppeId || t.gruppeId === gruppeId) &&
        (!datumVon || t.datum >= datumVon) &&
        (!datumBis || t.datum <= datumBis))
      .map(t => ({ ...t, anzahlAnwesend: zaehler[t.id]?.anwesend || 0, anzahlGesamt: zaehler[t.id]?.gesamt || 0 }))
      .sort((a, b) => (b.datum + b.zeitVon).localeCompare(a.datum + a.zeitVon)); // neueste zuerst
  }

  async function ladeTraining(id) {
    return lies('trainings').find(t => t.id === id) || null;
  }

  async function ladeAnwesenheit(trainingId) {
    return lies('anwesenheit').filter(a => a.trainingId === trainingId);
  }

  // Speichert ein Training UND seine Anwesenheitsliste.
  // anwesenheitListe = [{ kindId, anwesend: true/false, hinweis: '...' }, ...]
  // Beim Bearbeiten wird die alte Anwesenheit dieses Trainings komplett ersetzt.
  async function speichereTraining(training, anwesenheitListe) {
    const gespeichert = speichereEintrag('trainings', training);
    const andere = lies('anwesenheit').filter(a => a.trainingId !== gespeichert.id);
    const neue = anwesenheitListe.map(a => ({
      id: neueId(),
      trainingId: gespeichert.id,
      kindId: a.kindId,
      anwesend: Boolean(a.anwesend),
      hinweis: (a.hinweis || '').trim()
    }));
    schreib('anwesenheit', [...andere, ...neue]);
    return gespeichert;
  }

  async function loescheTraining(id) {
    schreib('trainings', lies('trainings').filter(t => t.id !== id));
    schreib('anwesenheit', lies('anwesenheit').filter(a => a.trainingId !== id));
  }

  // Alle Anwesenheits-Einträge eines Kindes, jeweils mit dem Training dazu.
  async function ladeAnwesenheitFuerKind(kindId) {
    const trainings = alsKarte(lies('trainings'));
    return lies('anwesenheit')
      .filter(a => a.kindId === kindId && trainings.has(a.trainingId))
      .map(a => ({ ...a, training: trainings.get(a.trainingId) }))
      .sort((a, b) => (b.training.datum + b.training.zeitVon).localeCompare(a.training.datum + a.training.zeitVon));
  }

  // Zählt für jedes Kind: wie oft auf der Liste, wie oft da, wann zuletzt da.
  // Ergebnis: { kindId: { anwesend, gesamt, zuletztDa } }
  async function ladeAnwesenheitsStatistik() {
    const trainings = alsKarte(lies('trainings'));
    const statistik = {};
    for (const a of lies('anwesenheit')) {
      const training = trainings.get(a.trainingId);
      if (!training) continue;
      const s = statistik[a.kindId] ||= { anwesend: 0, gesamt: 0, zuletztDa: null };
      s.gesamt++;
      if (a.anwesend) {
        s.anwesend++;
        if (!s.zuletztDa || training.datum > s.zuletztDa) s.zuletztDa = training.datum;
      }
    }
    return statistik;
  }

  /* ------------------------------------------------------------------
     Einstellungen dieses Geräts (welcher Trainer, welcher Standort ...)
     Das ist bewusst KEINE Sammlung: Jedes Handy hat seine eigenen
     Einstellungen, auch später mit Online-Datenbank.
     ------------------------------------------------------------------ */

  async function ladeEinstellungen() {
    try {
      return JSON.parse(localStorage.getItem(PREFIX + 'einstellungen')) || {};
    } catch {
      return {};
    }
  }

  async function speichereEinstellungen(aenderungen) {
    const neu = { ...(await ladeEinstellungen()), ...aenderungen };
    localStorage.setItem(PREFIX + 'einstellungen', JSON.stringify(neu));
    return neu;
  }

  /* ------------------------------------------------------------------
     Mitgliederliste exportieren und importieren
     ------------------------------------------------------------------ */

  async function exportiereMitglieder() {
    return {
      typ: 'mitgliederliste',
      version: DATENVERSION,
      exportiertAm: jetzt(),
      standorte: lies('standorte'),
      gruppen: lies('gruppen'),
      kinder: lies('kinder'),
      trainer: lies('trainer')
    };
  }

  // Führt eine importierte Mitgliederliste mit den vorhandenen Daten zusammen.
  // Doppelte werden so erkannt:
  //   1. gleiche ID (die Daten stammen aus demselben Export) oder
  //   2. gleicher Name (z. B. Kind mit gleichem Vor- und Nachnamen in derselben Gruppe).
  // Gefundene Einträge werden aktualisiert, neue angelegt. Nichts wird doppelt angelegt.
  async function importiereMitglieder(daten) {
    if (!daten || !['mitgliederliste', 'backup'].includes(daten.typ)) {
      throw new Error('Diese Datei ist keine Mitgliederliste dieser App.');
    }
    const ergebnis = { neu: 0, aktualisiert: 0, unveraendert: 0 };
    // Merkt sich: ID in der Datei -> ID auf diesem Gerät.
    // Nötig, wenn ein Eintrag über den Namen gefunden wurde und hier eine andere ID hat.
    const idKarte = new Map();

    function fuehreZusammen(sammlung, importListe, schluessel, felder, vorbereiten) {
      const lokal = lies(sammlung);
      for (const roh of Array.isArray(importListe) ? importListe : []) {
        const eintrag = vorbereiten({ ...roh });
        if (!eintrag) continue; // ungültiger Eintrag -> überspringen

        const treffer = lokal.find(e => eintrag.id && e.id === eintrag.id) ||
          lokal.find(e => schluessel(e) === schluessel(eintrag));

        if (treffer) {
          idKarte.set(roh.id, treffer.id);
          const geaendert = felder.some(f => eintrag[f] !== undefined && eintrag[f] !== treffer[f]);
          if (geaendert) {
            felder.forEach(f => { if (eintrag[f] !== undefined) treffer[f] = eintrag[f]; });
            treffer.geaendertAm = jetzt();
            ergebnis.aktualisiert++;
          } else {
            ergebnis.unveraendert++;
          }
        } else {
          // Neue Einträge behalten ihre ID aus der Datei. So haben alle Geräte,
          // die dieselbe Liste importieren, dieselben IDs.
          const neu = { erstelltAm: jetzt(), ...eintrag, id: eintrag.id || neueId() };
          idKarte.set(roh.id, neu.id);
          lokal.push(neu);
          ergebnis.neu++;
        }
      }
      schreib(sammlung, lokal);
    }

    fuehreZusammen('standorte', daten.standorte,
      e => normalisiere(e.name), ['name', 'aktiv', 'reihenfolge'],
      e => (e.name ? e : null));

    const standortIds = () => new Set(lies('standorte').map(s => s.id));
    fuehreZusammen('gruppen', daten.gruppen,
      e => e.standortId + '|' + normalisiere(e.name), ['name', 'standortId', 'aktiv', 'reihenfolge'],
      e => {
        e.standortId = idKarte.get(e.standortId) || e.standortId;
        return e.name && standortIds().has(e.standortId) ? e : null;
      });

    const gruppenIds = () => new Set(lies('gruppen').map(g => g.id));
    fuehreZusammen('kinder', daten.kinder,
      e => e.gruppeId + '|' + normalisiere(e.vorname) + '|' + normalisiere(e.nachname),
      ['vorname', 'nachname', 'gruppeId', 'aktiv', 'probetraining'],
      e => {
        e.gruppeId = idKarte.get(e.gruppeId) || e.gruppeId;
        return e.vorname && gruppenIds().has(e.gruppeId) ? e : null;
      });

    fuehreZusammen('trainer', daten.trainer,
      e => normalisiere(e.name), ['name', 'aktiv'],
      e => (e.name ? e : null));

    return ergebnis;
  }

  /* ------------------------------------------------------------------
     Komplettes Backup
     ------------------------------------------------------------------ */

  async function erstelleBackup() {
    const backup = { typ: 'backup', version: DATENVERSION, erstelltAm: jetzt() };
    for (const s of SAMMLUNGEN) backup[s] = lies(s);
    return backup;
  }

  // Ersetzt ALLE Daten durch das Backup. Geht etwas schief,
  // wird der vorherige Stand wiederhergestellt.
  async function stelleBackupWiederHer(daten) {
    if (!daten || daten.typ !== 'backup') throw new Error('Diese Datei ist kein Backup dieser App.');
    for (const s of SAMMLUNGEN) {
      if (!Array.isArray(daten[s])) throw new Error(`Im Backup fehlt der Bereich "${s}".`);
    }
    const vorher = {};
    for (const s of SAMMLUNGEN) vorher[s] = localStorage.getItem(PREFIX + s);
    try {
      for (const s of SAMMLUNGEN) schreib(s, daten[s]);
    } catch (fehler) {
      for (const s of SAMMLUNGEN) {
        if (vorher[s] === null) localStorage.removeItem(PREFIX + s);
        else localStorage.setItem(PREFIX + s, vorher[s]);
      }
      throw fehler;
    }
  }

  /* ------------------------------------------------------------------
     Testdaten: Jeder Testeintrag trägt "testdaten: true".
     So können wir sie später gezielt löschen, ohne echte Daten anzufassen.
     ------------------------------------------------------------------ */

  async function speichereTestdaten(paket) {
    for (const s of SAMMLUNGEN) {
      if (paket[s]) schreib(s, [...lies(s), ...paket[s]]);
    }
  }

  async function hatTestdaten() {
    return SAMMLUNGEN.some(s => lies(s).some(e => e.testdaten));
  }

  async function loescheTestdaten() {
    const standorte = lies('standorte');
    const gruppen = lies('gruppen');
    const kinder = lies('kinder');
    const trainings = lies('trainings');

    const testStandorte = new Set(standorte.filter(s => s.testdaten).map(s => s.id));
    // Auch selbst angelegte Gruppen/Kinder an einem Test-Standort verschwinden mit,
    // sonst blieben sie "verwaist" ohne Standort zurück.
    const testGruppen = new Set(gruppen.filter(g => g.testdaten || testStandorte.has(g.standortId)).map(g => g.id));
    const testKinder = new Set(kinder.filter(k => k.testdaten || testGruppen.has(k.gruppeId)).map(k => k.id));
    const testTrainings = new Set(trainings
      .filter(t => t.testdaten || testGruppen.has(t.gruppeId) || testStandorte.has(t.standortId))
      .map(t => t.id));

    schreib('standorte', standorte.filter(s => !testStandorte.has(s.id)));
    schreib('gruppen', gruppen.filter(g => !testGruppen.has(g.id)));
    schreib('kinder', kinder.filter(k => !testKinder.has(k.id)));
    schreib('trainer', lies('trainer').filter(t => !t.testdaten));
    schreib('trainings', trainings.filter(t => !testTrainings.has(t.id)));
    schreib('anwesenheit', lies('anwesenheit').filter(a => !testTrainings.has(a.trainingId) && !testKinder.has(a.kindId)));
  }

  /* ------------------------------------------------------------------
     Alles löschen und Speicherbelegung
     ------------------------------------------------------------------ */

  async function loescheAlleDaten() {
    const { farbmodus } = await ladeEinstellungen(); // den Farbmodus behalten wir
    for (const s of SAMMLUNGEN) localStorage.removeItem(PREFIX + s);
    localStorage.setItem(PREFIX + 'einstellungen', JSON.stringify(farbmodus ? { farbmodus } : {}));
  }

  async function ladeSpeicherbelegung() {
    let zeichen = 0;
    for (let i = 0; i < localStorage.length; i++) {
      const schluessel = localStorage.key(i);
      if (schluessel.startsWith(PREFIX)) zeichen += schluessel.length + (localStorage.getItem(schluessel) || '').length;
    }
    return { kilobyte: Math.max(1, Math.round(zeichen / 1024)) };
  }

  /* ------------------------------------------------------------------
     Öffentliche Schnittstelle: NUR diese Funktionen darf der Rest nutzen.
     ------------------------------------------------------------------ */
  return {
    neueId,
    ladeStandorte, speichereStandort,
    ladeGruppen, speichereGruppe,
    ladeKinder, ladeKind, speichereKind,
    ladeTrainer, speichereTrainer,
    ladeTrainings, ladeTraining, ladeAnwesenheit, speichereTraining, loescheTraining,
    ladeAnwesenheitFuerKind, ladeAnwesenheitsStatistik,
    ladeEinstellungen, speichereEinstellungen,
    exportiereMitglieder, importiereMitglieder,
    erstelleBackup, stelleBackupWiederHer,
    speichereTestdaten, hatTestdaten, loescheTestdaten,
    loescheAlleDaten, ladeSpeicherbelegung
  };
})();
