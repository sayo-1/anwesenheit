/* =====================================================================
   ansicht-kinder.js – Übersicht pro Kind: Anwesenheitsquote und Tage
   ===================================================================== */

const KinderAnsicht = (() => {
  const { esc, icon } = Hilfe;

  const filter = { standortId: '', gruppeId: '', suche: '', sortierung: 'name' };

  let wurzel = null;
  let ansicht = null;
  let daten = { kinder: [], statistik: {}, gruppen: new Map(), standorte: new Map() };

  async function zeige(container) {
    wurzel = container;
    const [standorte, gruppen, kinder, statistik] = await Promise.all([
      Speicher.ladeStandorte(), Speicher.ladeGruppen(),
      Speicher.ladeKinder({ nurAktive: true }), Speicher.ladeAnwesenheitsStatistik()
    ]);
    daten = { kinder, statistik, gruppen: Hilfe.alsKarte(gruppen), standorte: Hilfe.alsKarte(standorte) };

    if (filter.gruppeId && filter.standortId && daten.gruppen.get(filter.gruppeId)?.standortId !== filter.standortId) {
      filter.gruppeId = '';
    }
    const gruppenAuswahl = gruppen.filter(g => !filter.standortId || g.standortId === filter.standortId);
    const option = (wert, text, gewaehlt) =>
      `<option value="${esc(wert)}" ${wert === gewaehlt ? 'selected' : ''}>${esc(text)}</option>`;

    const el = document.createElement('div');
    el.className = 'ansicht';
    el.innerHTML = `
      <div class="seiten-kopf"><h1>Kinder</h1></div>

      <section class="karte filter-karte" aria-label="Filter">
        <div class="suchfeld">
          ${icon('search')}
          <input type="search" id="k-suche" data-filter="suche" value="${esc(filter.suche)}"
            placeholder="Name suchen" aria-label="Name suchen" autocomplete="off">
        </div>
        <div class="feld-raster feld-raster-3">
          <div class="feld">
            <label class="feld-label" for="k-standort">Standort</label>
            <select id="k-standort" data-filter="standortId" autocomplete="off">
              <option value="">Alle</option>
              ${standorte.map(s => option(s.id, s.name, filter.standortId)).join('')}
            </select>
          </div>
          <div class="feld">
            <label class="feld-label" for="k-gruppe">Gruppe</label>
            <select id="k-gruppe" data-filter="gruppeId" autocomplete="off">
              <option value="">Alle</option>
              ${gruppenAuswahl.map(g => option(g.id,
                filter.standortId ? g.name : `${g.name} · ${daten.standorte.get(g.standortId)?.name || ''}`,
                filter.gruppeId)).join('')}
            </select>
          </div>
          <div class="feld">
            <label class="feld-label" for="k-sortierung">Sortieren</label>
            <select id="k-sortierung" data-filter="sortierung" autocomplete="off">
              ${option('name', 'Name', filter.sortierung)}
              ${option('quote-hoch', 'Quote hoch → niedrig', filter.sortierung)}
              ${option('quote-niedrig', 'Quote niedrig → hoch', filter.sortierung)}
            </select>
          </div>
        </div>
      </section>

      <div id="k-liste"></div>`;

    // "input" feuert bei jedem Buchstaben, "change" erst beim Verlassen des Feldes
    el.addEventListener('input', e => {
      if (e.target.dataset.filter !== 'suche') return;
      filter.suche = e.target.value;
      rendereListe(); // nur die Liste neu zeichnen, damit das Suchfeld den Fokus behält
    });
    el.addEventListener('change', async e => {
      const schluessel = e.target.dataset.filter;
      if (!schluessel || schluessel === 'suche') return;
      filter[schluessel] = e.target.value;
      if (schluessel === 'standortId') {
        filter.gruppeId = '';
        await zeige(wurzel); // Gruppen-Auswahl muss sich ändern
      } else {
        rendereListe();
      }
    });
    el.addEventListener('click', e => {
      const zeile = e.target.closest('[data-kind]');
      if (zeile) zeigeDetails(zeile.dataset.kind);
    });

    wurzel.replaceChildren(el);
    ansicht = el;
    rendereListe();
  }

  function gefilterteKinder() {
    const suche = filter.suche.trim().toLowerCase();
    const liste = daten.kinder.filter(k => {
      const gruppe = daten.gruppen.get(k.gruppeId);
      return (!filter.standortId || gruppe?.standortId === filter.standortId) &&
        (!filter.gruppeId || k.gruppeId === filter.gruppeId) &&
        (!suche || Hilfe.vollerName(k).toLowerCase().includes(suche));
    });

    // Kinder ohne Trainings (Quote = null) kommen beim Sortieren nach Quote ans Ende
    const quoteVon = k => {
      const s = daten.statistik[k.id];
      return s ? Hilfe.quote(s.anwesend, s.gesamt) : null;
    };
    if (filter.sortierung !== 'name') {
      const richtung = filter.sortierung === 'quote-hoch' ? -1 : 1;
      liste.sort((a, b) => {
        const qa = quoteVon(a), qb = quoteVon(b);
        if (qa == null) return 1;
        if (qb == null) return -1;
        return (qa - qb) * richtung;
      });
    }
    return liste;
  }

  function rendereListe() {
    const ziel = ansicht.querySelector('#k-liste');
    const kinder = gefilterteKinder();

    if (daten.kinder.length === 0) {
      ziel.innerHTML = Hilfe.leererZustand({
        icon: 'users', titel: 'Noch keine Kinder',
        text: 'Lege Kinder in der Verwaltung an.',
        aktion: `<a class="knopf knopf-primaer" href="#verwaltung/kinder">${icon('user-plus')}<span>Kinder anlegen</span></a>`
      });
      return;
    }
    if (kinder.length === 0) {
      ziel.innerHTML = Hilfe.leererZustand({ icon: 'search', titel: 'Kein Kind gefunden', text: 'Prüfe die Schreibweise oder die Filter.' });
      return;
    }

    ziel.innerHTML = `
      <p class="zusammenfassung">${kinder.length} ${kinder.length === 1 ? 'Kind' : 'Kinder'}</p>
      <div class="liste">${kinder.map(kindZeileHtml).join('')}</div>`;
  }

  function kindZeileHtml(kind) {
    const s = daten.statistik[kind.id] || { anwesend: 0, gesamt: 0 };
    const q = Hilfe.quote(s.anwesend, s.gesamt);
    const klasse = Hilfe.quoteKlasse(q);
    const gruppe = daten.gruppen.get(kind.gruppeId);
    return `
      <button type="button" class="listen-zeile" data-kind="${esc(kind.id)}">
        <span class="avatar">${esc(Hilfe.initialen(kind))}</span>
        <span class="zeile-text">
          <strong>${esc(Hilfe.vollerName(kind))}${kind.probetraining ? ' <span class="abzeichen abzeichen-probe">Probe</span>' : ''}</strong>
          <small>${esc(gruppe?.name || '')} · ${esc(daten.standorte.get(gruppe?.standortId)?.name || '')}</small>
        </span>
        <span class="quote-block">
          <span class="quote-zahl ${klasse}">${q == null ? '–' : `${q} %`}</span>
          <span class="quote-balken"><span class="${klasse}" style="width:${q || 0}%"></span></span>
          <small>${s.gesamt ? `${s.anwesend} von ${s.gesamt}` : 'noch nichts'}</small>
        </span>
      </button>`;
  }

  async function zeigeDetails(kindId) {
    const kind = daten.kinder.find(k => k.id === kindId);
    if (!kind) return;
    const eintraege = await Speicher.ladeAnwesenheitFuerKind(kindId);
    const s = daten.statistik[kindId] || { anwesend: 0, gesamt: 0, zuletztDa: null };
    const q = Hilfe.quote(s.anwesend, s.gesamt);
    const gruppe = daten.gruppen.get(kind.gruppeId);

    const wahl = await Hilfe.zeigeDialog({
      titel: Hilfe.vollerName(kind),
      inhalt: `
        <div class="kind-detail">
          <!-- Der Ring wird per CSS (conic-gradient) aus der Variable --wert gezeichnet -->
          <div class="quote-ring ${Hilfe.quoteKlasse(q)}" style="--wert:${q || 0}">
            <span>${q == null ? '–' : `${q}<small>%</small>`}</span>
          </div>
          <div>
            <p><strong>${s.anwesend} von ${s.gesamt}</strong> Trainings anwesend</p>
            <p class="text-leise">${esc(gruppe?.name || '')} · ${esc(daten.standorte.get(gruppe?.standortId)?.name || '')}</p>
            <p class="text-leise">${s.zuletztDa ? `Zuletzt da: ${esc(Hilfe.formatDatum(s.zuletztDa))}` : 'Noch nie anwesend'}</p>
          </div>
        </div>
        <h3 class="unter-titel">Trainings</h3>
        ${eintraege.length ? `
          <ul class="anwesenheits-liste">
            ${eintraege.map(e => `
              <li class="${e.anwesend ? 'da' : 'fehlt'}">
                <span class="status-punkt">${icon(e.anwesend ? 'check' : 'x')}</span>
                <span class="zeile-text">
                  <strong>${esc(Hilfe.formatDatum(e.training.datum))}</strong>
                  <small>${esc(daten.gruppen.get(e.training.gruppeId)?.name || '')} · ${esc(e.training.zeitVon)}–${esc(e.training.zeitBis)}${e.hinweis ? ` · ${esc(e.hinweis)}` : ''}</small>
                </span>
              </li>`).join('')}
          </ul>` : '<p class="text-leise">Für dieses Kind wurde noch kein Training gespeichert.</p>'}`,
      knoepfe: [
        { text: 'Schließen', wert: '', art: 'leise' },
        { text: 'Bearbeiten', wert: 'bearbeiten', art: 'rand', icon: 'edit' }
      ]
    });

    if (wahl === 'bearbeiten' && await VerwaltungAnsicht.bearbeiteKind(kindId)) {
      await zeige(wurzel);
    }
  }

  return { zeige };
})();
