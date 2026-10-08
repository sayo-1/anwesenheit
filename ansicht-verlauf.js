/* =====================================================================
   ansicht-verlauf.js – vergangene Trainings filtern und ansehen
   ===================================================================== */

const VerlaufAnsicht = (() => {
  const { esc, icon } = Hilfe;

  // Die Filter bleiben erhalten, wenn man die Ansicht wechselt und zurückkommt
  const filter = { standortId: '', gruppeId: '', datumVon: '', datumBis: '' };

  let wurzel = null;
  let trainings = [];  // die aktuell angezeigten (gefilterten) Trainings
  let n = {};          // Nachschlagewerke: n.standorte.get(id) usw.

  async function zeige(container) {
    wurzel = container;
    const [standorte, gruppen, trainer] = await Promise.all([
      Speicher.ladeStandorte(), Speicher.ladeGruppen(), Speicher.ladeTrainer()
    ]);
    n = { standorte: Hilfe.alsKarte(standorte), gruppen: Hilfe.alsKarte(gruppen), trainer: Hilfe.alsKarte(trainer) };

    // Passt die gewählte Gruppe nicht zum gewählten Standort? Dann Gruppe zurücksetzen.
    if (filter.gruppeId && filter.standortId && n.gruppen.get(filter.gruppeId)?.standortId !== filter.standortId) {
      filter.gruppeId = '';
    }
    trainings = await Speicher.ladeTrainings(filter);

    const gruppenAuswahl = gruppen.filter(g => !filter.standortId || g.standortId === filter.standortId);
    const option = (wert, text, gewaehlt) =>
      `<option value="${esc(wert)}" ${wert === gewaehlt ? 'selected' : ''}>${esc(text)}</option>`;

    const el = document.createElement('div');
    el.className = 'ansicht';
    el.innerHTML = `
      <div class="seiten-kopf">
        <h1>Verlauf</h1>
        <button type="button" class="knopf knopf-rand knopf-klein" data-aktion="csv" ${trainings.length ? '' : 'disabled'}>
          ${icon('download')}<span>CSV</span>
        </button>
      </div>

      <section class="karte filter-karte" aria-label="Filter">
        <div class="feld-raster feld-raster-2">
          <div class="feld">
            <label class="feld-label" for="v-standort">Standort</label>
            <select id="v-standort" data-filter="standortId" autocomplete="off">
              <option value="">Alle Standorte</option>
              ${standorte.map(s => option(s.id, s.name, filter.standortId)).join('')}
            </select>
          </div>
          <div class="feld">
            <label class="feld-label" for="v-gruppe">Gruppe</label>
            <select id="v-gruppe" data-filter="gruppeId" autocomplete="off">
              <option value="">Alle Gruppen</option>
              ${gruppenAuswahl.map(g => option(g.id,
                filter.standortId ? g.name : `${g.name} · ${n.standorte.get(g.standortId)?.name || ''}`,
                filter.gruppeId)).join('')}
            </select>
          </div>
          <div class="feld">
            <label class="feld-label" for="v-von">Von</label>
            <input type="date" id="v-von" data-filter="datumVon" autocomplete="off" value="${esc(filter.datumVon)}">
          </div>
          <div class="feld">
            <label class="feld-label" for="v-bis">Bis</label>
            <input type="date" id="v-bis" data-filter="datumBis" autocomplete="off" value="${esc(filter.datumBis)}">
          </div>
        </div>
        ${filterAktiv() ? `<button type="button" class="text-knopf" data-aktion="zuruecksetzen">${icon('x')}<span>Filter zurücksetzen</span></button>` : ''}
      </section>

      ${zusammenfassungHtml()}
      ${listeHtml()}`;

    el.addEventListener('change', beiAenderung);
    el.addEventListener('click', beiKlick);
    wurzel.replaceChildren(el);
  }

  function filterAktiv() {
    return Object.values(filter).some(Boolean);
  }

  function zusammenfassungHtml() {
    if (!trainings.length) return '';
    const da = trainings.reduce((summe, t) => summe + t.anzahlAnwesend, 0);
    const gesamt = trainings.reduce((summe, t) => summe + t.anzahlGesamt, 0);
    const q = Hilfe.quote(da, gesamt);
    return `<p class="zusammenfassung">${trainings.length} ${trainings.length === 1 ? 'Training' : 'Trainings'}${q != null ? ` · Ø ${q} % anwesend` : ''}</p>`;
  }

  function listeHtml() {
    if (!trainings.length) {
      return filterAktiv()
        ? Hilfe.leererZustand({
            icon: 'filter', titel: 'Keine Trainings gefunden',
            text: 'Für diese Filter gibt es keine Einträge.',
            aktion: `<button type="button" class="knopf knopf-rand" data-aktion="zuruecksetzen">Filter zurücksetzen</button>`
          })
        : Hilfe.leererZustand({
            icon: 'history', titel: 'Noch keine Trainings',
            text: 'Gespeicherte Trainings erscheinen hier.',
            aktion: `<a class="knopf knopf-primaer" href="#training">${icon('clipboard')}<span>Training starten</span></a>`
          });
    }

    // Nach Monat gruppieren: Jedes Mal, wenn der Monat wechselt, kommt eine Überschrift
    let html = '';
    let monat = '';
    for (const t of trainings) {
      const m = t.datum.slice(0, 7); // "2026-10"
      if (m !== monat) {
        if (monat) html += '</div>';
        monat = m;
        const name = Hilfe.isoZuDatum(`${m}-01`).toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
        html += `<h2 class="monat">${esc(name)}</h2><div class="liste">`;
      }
      html += trainingZeileHtml(t);
    }
    return html + '</div>';
  }

  function trainingZeileHtml(t) {
    const d = Hilfe.isoZuDatum(t.datum);
    const q = Hilfe.quote(t.anzahlAnwesend, t.anzahlGesamt);
    return `
      <button type="button" class="listen-zeile" data-training="${esc(t.id)}">
        <span class="datum-block">
          <span class="datum-tag">${d.getDate()}</span>
          <span class="datum-wt">${esc(d.toLocaleDateString('de-DE', { weekday: 'short' }).replace('.', ''))}</span>
        </span>
        <span class="zeile-text">
          <strong>${esc(n.gruppen.get(t.gruppeId)?.name || 'Unbekannte Gruppe')}</strong>
          <small>${esc(n.standorte.get(t.standortId)?.name || '')} · ${esc(t.zeitVon)}–${esc(t.zeitBis)} · ${esc(n.trainer.get(t.trainerId)?.name || 'ohne Trainer')}</small>
        </span>
        <span class="quote-pille ${Hilfe.quoteKlasse(q)}">${t.anzahlAnwesend}/${t.anzahlGesamt}</span>
        ${icon('chevron-right', 'zeile-pfeil')}
      </button>`;
  }

  /* ---------- Ereignisse ---------- */

  async function beiAenderung(e) {
    const schluessel = e.target.dataset.filter;
    if (!schluessel) return;
    filter[schluessel] = e.target.value;
    if (schluessel === 'standortId') filter.gruppeId = '';
    await zeige(wurzel);
  }

  async function beiKlick(e) {
    const ziel = e.target.closest('button');
    if (!ziel || ziel.disabled) return;
    try {
      if (ziel.dataset.training) await zeigeDetails(ziel.dataset.training);
      else if (ziel.dataset.aktion === 'zuruecksetzen') {
        Object.keys(filter).forEach(k => (filter[k] = ''));
        await zeige(wurzel);
      } else if (ziel.dataset.aktion === 'csv') {
        const zeilen = await Export.trainingsAlsCsv(trainings);
        Hilfe.zeigeMeldung(`CSV mit ${trainings.length} Trainings (${zeilen} Zeilen) heruntergeladen.`, 'erfolg');
      }
    } catch (fehler) {
      console.error(fehler);
      Hilfe.zeigeMeldung(fehler.message, 'fehler', 5000);
    }
  }

  /* ---------- Details eines Trainings ---------- */

  async function zeigeDetails(trainingId) {
    const t = await Speicher.ladeTraining(trainingId);
    if (!t) return;
    const [anwesenheit, kinder] = await Promise.all([Speicher.ladeAnwesenheit(trainingId), Speicher.ladeKinder()]);
    const kinderKarte = Hilfe.alsKarte(kinder);

    // Anwesende zuerst, dann alphabetisch
    const zeilen = anwesenheit
      .map(a => ({ ...a, kind: kinderKarte.get(a.kindId) || { vorname: '(unbekannt)', nachname: '' } }))
      .sort((a, b) => (b.anwesend - a.anwesend) || Hilfe.vollerName(a.kind).localeCompare(Hilfe.vollerName(b.kind), 'de'));
    const da = zeilen.filter(z => z.anwesend).length;
    const q = Hilfe.quote(da, zeilen.length);
    const gruppenName = n.gruppen.get(t.gruppeId)?.name || 'Training';

    const wahl = await Hilfe.zeigeDialog({
      titel: gruppenName,
      inhalt: `
        <dl class="info-liste">
          <div><dt>Datum</dt><dd>${esc(Hilfe.formatDatum(t.datum, 'lang'))}</dd></div>
          <div><dt>Uhrzeit</dt><dd>${esc(t.zeitVon)}–${esc(t.zeitBis)} Uhr</dd></div>
          <div><dt>Standort</dt><dd>${esc(n.standorte.get(t.standortId)?.name || '–')}</dd></div>
          <div><dt>Trainer</dt><dd>${esc(n.trainer.get(t.trainerId)?.name || '–')}</dd></div>
        </dl>
        <div class="statistik">
          <span><strong>${da} von ${zeilen.length}</strong> anwesend</span>
          <span class="quote-pille ${Hilfe.quoteKlasse(q)}">${q ?? 0} %</span>
        </div>
        <ul class="anwesenheits-liste">
          ${zeilen.map(z => `
            <li class="${z.anwesend ? 'da' : 'fehlt'}">
              <span class="status-punkt">${icon(z.anwesend ? 'check' : 'x')}</span>
              <span class="zeile-text">
                <strong>${esc(Hilfe.vollerName(z.kind))}${z.kind.probetraining ? ' <span class="abzeichen abzeichen-probe">Probe</span>' : ''}</strong>
                ${z.hinweis ? `<small>${esc(z.hinweis)}</small>` : ''}
              </span>
            </li>`).join('')}
        </ul>`,
      knoepfe: [
        { text: 'Löschen', wert: 'loeschen', art: 'gefahr-leise', icon: 'trash' },
        { text: 'Drucken', wert: 'drucken', art: 'leise', icon: 'printer' },
        { text: 'Bearbeiten', wert: 'bearbeiten', art: 'primaer', icon: 'edit' }
      ]
    });

    if (wahl === 'bearbeiten') {
      await TrainingAnsicht.bearbeite(trainingId);
    } else if (wahl === 'drucken') {
      await Export.druckeTraining(trainingId);
    } else if (wahl === 'loeschen') {
      const sicher = await Hilfe.bestaetige({
        titel: 'Training löschen?',
        text: `Das Training vom ${Hilfe.formatDatum(t.datum)} (${gruppenName}) wird mit der Anwesenheitsliste gelöscht. Das kann nicht rückgängig gemacht werden.`,
        okText: 'Endgültig löschen',
        gefahr: true
      });
      if (!sicher) return;
      await Speicher.loescheTraining(trainingId);
      TrainingAnsicht.trainingGeloescht(trainingId);
      Hilfe.zeigeMeldung('Training gelöscht.', 'erfolg');
      await zeige(wurzel);
    }
  }

  return { zeige };
})();
