/* =====================================================================
   export.js – Daten als Datei herausgeben
   (Mitgliederliste, Backup, CSV für Excel, Druckansicht wie auf Papier)
   ===================================================================== */

const Export = (() => {
  const { esc } = Hilfe; // "Destructuring": holt esc aus Hilfe, damit wir kürzer schreiben können

  // Lädt alle Stammdaten und macht daraus Nachschlage-Tabellen (Map: id -> Eintrag)
  async function ladeNachschlagewerke() {
    const [standorte, gruppen, trainer, kinder] = await Promise.all([
      Speicher.ladeStandorte(), Speicher.ladeGruppen(), Speicher.ladeTrainer(), Speicher.ladeKinder()
    ]);
    return {
      standorte: Hilfe.alsKarte(standorte),
      gruppen: Hilfe.alsKarte(gruppen),
      trainer: Hilfe.alsKarte(trainer),
      kinder: Hilfe.alsKarte(kinder)
    };
  }

  /* ---------- JSON-Dateien ---------- */

  async function mitgliederliste() {
    const daten = await Speicher.exportiereMitglieder();
    // JSON.stringify(daten, null, 2) rückt den Text ein, damit er lesbar bleibt
    Hilfe.ladeHerunter(`mitgliederliste-${Hilfe.heuteISO()}.json`, JSON.stringify(daten, null, 2));
    return daten;
  }

  async function backup() {
    const daten = await Speicher.erstelleBackup();
    Hilfe.ladeHerunter(`anwesenheit-backup-${Hilfe.heuteISO()}.json`, JSON.stringify(daten, null, 2));
    await Speicher.speichereEinstellungen({ letztesBackup: new Date().toISOString() });
    return daten;
  }

  /* ---------- CSV für Excel ----------
     CSV = "Comma Separated Values": eine Textdatei, eine Zeile pro Datensatz.
     Das deutsche Excel erwartet Semikolon (;) als Trennzeichen. */

  function csvZelle(wert) {
    let text = String(wert ?? '');
    // Schutz: Beginnt ein Wert mit = + - @, würde Excel ihn als Formel ausführen.
    if (/^[=+\-@]/.test(text)) text = "'" + text;
    // Enthält der Wert ein Trennzeichen, Anführungszeichen oder einen Zeilenumbruch,
    // muss er in "..." stehen, und " wird verdoppelt.
    if (/[;"\r\n]/.test(text)) text = '"' + text.replaceAll('"', '""') + '"';
    return text;
  }

  async function trainingsAlsCsv(trainings) {
    const n = await ladeNachschlagewerke();
    const zeilen = [[
      'Datum', 'Wochentag', 'Von', 'Bis', 'Standort', 'Gruppe', 'Trainer',
      'Vorname', 'Nachname', 'Anwesend', 'Hinweis', 'Probetraining'
    ]];
    // Älteste zuerst – so liest man eine Tabelle normalerweise
    const sortiert = [...trainings].sort((a, b) => (a.datum + a.zeitVon).localeCompare(b.datum + b.zeitVon));

    for (const t of sortiert) {
      const anwesenheit = await Speicher.ladeAnwesenheit(t.id);
      for (const a of anwesenheit) {
        const kind = n.kinder.get(a.kindId) || { vorname: '(unbekannt)', nachname: '' };
        zeilen.push([
          Hilfe.formatDatum(t.datum, 'kurz'),
          Hilfe.isoZuDatum(t.datum).toLocaleDateString('de-DE', { weekday: 'long' }),
          t.zeitVon, t.zeitBis,
          n.standorte.get(t.standortId)?.name || '',
          n.gruppen.get(t.gruppeId)?.name || '',
          n.trainer.get(t.trainerId)?.name || '',
          kind.vorname, kind.nachname,
          a.anwesend ? 'ja' : 'nein',
          a.hinweis,
          kind.probetraining ? 'ja' : ''
        ]);
      }
    }
    // ﻿ ("BOM") am Anfang sagt Excel: Die Datei ist UTF-8 -> Umlaute stimmen.
    const csv = '﻿' + zeilen.map(z => z.map(csvZelle).join(';')).join('\r\n');
    Hilfe.ladeHerunter(`trainings-${Hilfe.heuteISO()}.csv`, csv, 'text/csv');
    return zeilen.length - 1;
  }

  /* ---------- Druckansicht im Stil der Papierliste ----------
     Wir füllen den versteckten Bereich #druckbereich und rufen window.print() auf.
     Das CSS (@media print) blendet beim Drucken alles andere aus. */

  async function druckeTraining(trainingId) {
    const training = await Speicher.ladeTraining(trainingId);
    if (!training) return;
    const anwesenheit = await Speicher.ladeAnwesenheit(trainingId);
    const n = await ladeNachschlagewerke();

    const zeilen = anwesenheit
      .map(a => ({ ...a, kind: n.kinder.get(a.kindId) || { vorname: '(unbekannt)', nachname: '' } }))
      .sort((a, b) => Hilfe.vollerName(a.kind).localeCompare(Hilfe.vollerName(b.kind), 'de'));
    const anzahlDa = zeilen.filter(z => z.anwesend).length;

    Hilfe.$('#druckbereich').innerHTML = `
      <div class="papier">
        <h1>Anwesenheitsliste</h1>
        <table class="papier-kopf">
          <tr><th>Trainingsort</th><td>${esc(n.standorte.get(training.standortId)?.name)}</td>
              <th>Gruppe</th><td>${esc(n.gruppen.get(training.gruppeId)?.name)}</td></tr>
          <tr><th>Trainer</th><td>${esc(n.trainer.get(training.trainerId)?.name)}</td>
              <th>Datum</th><td>${esc(Hilfe.formatDatum(training.datum))}</td></tr>
          <tr><th>Uhrzeit</th><td colspan="3">von ${esc(training.zeitVon)} bis ${esc(training.zeitBis)} Uhr</td></tr>
        </table>
        <table class="papier-liste">
          <thead><tr><th class="nr">Nr.</th><th>Name</th><th class="da">Anwesend</th><th>Hinweise</th></tr></thead>
          <tbody>
            ${zeilen.map((z, i) => `
              <tr class="${z.anwesend ? '' : 'fehlt'}">
                <td class="nr">${i + 1}</td>
                <td>${esc(Hilfe.vollerName(z.kind))}${z.kind.probetraining ? ' <em>(Probetraining)</em>' : ''}</td>
                <td class="da">${z.anwesend ? '✓' : '–'}</td>
                <td>${esc(z.hinweis)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
        <p class="papier-fuss">
          <strong>Anwesend: ${anzahlDa} von ${zeilen.length}</strong>
          <span>Erstellt am ${esc(Hilfe.formatDatum(Hilfe.heuteISO(), 'kurz'))}</span>
        </p>
      </div>`;
    window.print();
  }

  return { mitgliederliste, backup, trainingsAlsCsv, druckeTraining };
})();
