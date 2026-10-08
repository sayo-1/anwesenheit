/* =====================================================================
   ansicht-training.js – Training starten und Anwesenheit erfassen
   ---------------------------------------------------------------------
   Ablauf für den Trainer:
   1. Standort und Gruppe antippen (Trainer, Datum, Uhrzeit sind vorausgefüllt)
   2. Kinder antippen = anwesend, nochmal tippen = abwesend
   3. Unten auf "Speichern"
   ===================================================================== */

const TrainingAnsicht = (() => {
  const { esc, icon } = Hilfe;

  // Vorlagen für Hinweise: antippen statt tippen
  const HINWEIS_VORLAGEN = ['später gekommen', 'früher abgeholt', 'verletzt', 'krank', 'nur zugeschaut'];

  // Der "Zustand" ist alles, was sich die Ansicht gerade merkt.
  // Er bleibt erhalten, wenn man kurz in den Verlauf wechselt und zurückkommt.
  const zustand = {
    bereit: false,       // wurde schon ein Training vorbereitet?
    trainingId: null,    // null = neues Training, sonst ID des bearbeiteten Trainings
    standortId: null,
    gruppeId: null,
    datum: '',
    zeitVon: '',
    zeitBis: '',
    zeitManuell: false,  // hat der Trainer die Uhrzeit selbst geändert?
    trainerId: null,
    kopfOffen: true,     // Kopfbereich ausgeklappt? (eingeklappt = mehr Platz für die Kinder)
    kinder: [],          // alle Kinder, die gerade angezeigt werden
    probekinder: [],     // neue Probetrainings-Kinder, die noch nicht gespeichert sind
    anwesenheit: {},     // kindId -> { anwesend: true/false, hinweis: '...' }
    geaendert: false     // gibt es ungespeicherte Änderungen?
  };

  // Stammdaten für die Auswahl-Chips
  const stamm = { standorte: [], gruppen: [], trainer: [] };

  let wurzel = null;   // der Bereich #inhalt, in den wir zeichnen
  let ansicht = null;  // unser aktuelles Element darin
  let naechsteVorlage = {};

  /* ------------------------------------------------------------------
     Anzeigen
     ------------------------------------------------------------------ */

  async function zeige(container) {
    wurzel = container;
    const [standorte, trainer, einstellungen] = await Promise.all([
      Speicher.ladeStandorte(), Speicher.ladeTrainer(), Speicher.ladeEinstellungen()
    ]);

    // Noch gar keine Daten? Dann Willkommens-Bildschirm.
    if (standorte.length === 0) return zeigeWillkommen();

    const aktiveStandorte = standorte.filter(s => s.aktiv !== false);
    if (!zustand.bereit) {
      setzeNeu(einstellungen, aktiveStandorte, naechsteVorlage);
      naechsteVorlage = {};
      await setzeUeblicheZeit();
    }

    // Inaktive ausblenden, außer sie gehören zum gerade bearbeiteten Training
    stamm.standorte = standorte.filter(s => s.aktiv !== false || s.id === zustand.standortId);
    stamm.trainer = trainer.filter(t => t.aktiv !== false || t.id === zustand.trainerId);
    if (!stamm.standorte.some(s => s.id === zustand.standortId)) {
      zustand.standortId = aktiveStandorte[0]?.id || null;
      zustand.gruppeId = null;
    }

    await ladeGruppenUndKinder();
    rendere();
  }

  // Bereitet ein neues, leeres Training vor.
  // "vorlage" kann Werte vorgeben (z. B. die nächste Gruppe nach dem Speichern).
  function setzeNeu(einstellungen, aktiveStandorte, vorlage = {}) {
    const gemerkterStandort = aktiveStandorte.some(s => s.id === einstellungen.standortId) ? einstellungen.standortId : null;
    const standortId = vorlage.standortId || gemerkterStandort || aktiveStandorte[0]?.id || null;
    const zeitVon = vorlage.zeitVon || Hilfe.jetztGerundet();
    // 90 Minuten später, aber nicht über Mitternacht hinaus
    let zeitBis = vorlage.zeitBis || Hilfe.zeitPlus(zeitVon, 90);
    if (zeitBis <= zeitVon) zeitBis = '23:59';

    // Pro Standort merken wir uns die zuletzt benutzte Gruppe
    const gruppeId = vorlage.gruppeId || einstellungen.letzteGruppen?.[standortId] || null;

    Object.assign(zustand, {
      bereit: true,
      trainingId: null,
      standortId,
      gruppeId,
      kopfOffen: !gruppeId, // Gruppe schon bekannt? Dann gleich die Kinder zeigen
      datum: vorlage.datum || Hilfe.heuteISO(),
      zeitVon,
      zeitBis,
      zeitManuell: false,
      trainerId: einstellungen.trainerId || null,
      kinder: [],
      probekinder: [],
      anwesenheit: {},
      geaendert: false
    });
  }

  // Trainings finden meist zur selben Zeit statt. Deshalb übernehmen wir
  // die Uhrzeit vom letzten Training dieser Gruppe (wenn es eins gibt).
  async function setzeUeblicheZeit() {
    if (!zustand.gruppeId || zustand.zeitManuell || zustand.trainingId) return;
    const [letztes] = await Speicher.ladeTrainings({ gruppeId: zustand.gruppeId });
    if (letztes) {
      zustand.zeitVon = letztes.zeitVon;
      zustand.zeitBis = letztes.zeitBis;
    }
  }

  async function ladeGruppenUndKinder() {
    const gruppen = zustand.standortId ? await Speicher.ladeGruppen({ standortId: zustand.standortId }) : [];
    stamm.gruppen = gruppen.filter(g => g.aktiv !== false || (zustand.trainingId && g.id === zustand.gruppeId));
    if (zustand.gruppeId && !stamm.gruppen.some(g => g.id === zustand.gruppeId)) zustand.gruppeId = null;
    if (!zustand.gruppeId) zustand.kopfOffen = true;
    await ladeKinder();
  }

  async function ladeKinder() {
    if (!zustand.gruppeId) {
      zustand.kinder = [];
      return;
    }
    let kinder;
    if (zustand.trainingId) {
      // Beim Bearbeiten: genau die Kinder, die damals auf der Liste standen
      // (auch wenn sie inzwischen inaktiv sind oder die Gruppe gewechselt haben)
      const alle = await Speicher.ladeKinder();
      kinder = alle.filter(k => k.id in zustand.anwesenheit);
    } else {
      kinder = await Speicher.ladeKinder({ gruppeId: zustand.gruppeId, nurAktive: true });
    }
    zustand.kinder = [...kinder, ...zustand.probekinder];
  }

  // Zeichnet die ganze Ansicht neu.
  function rendere() {
    const neu = document.createElement('div');
    neu.className = 'ansicht ansicht-training';
    neu.innerHTML = kopfHtml() + teilnehmerHtml() + aktionsleisteHtml();

    // EIN Event Listener für die ganze Ansicht ("Event-Delegation"):
    // Statt jedem Knopf einen eigenen Listener zu geben, schauen wir
    // beim Klick nach, WELCHES Element getroffen wurde.
    neu.addEventListener('click', beiKlick);
    neu.addEventListener('change', beiAenderung);

    wurzel.replaceChildren(neu);
    ansicht = neu;
    aktualisiereZaehler();
    pruefeDoppeltes();
  }

  /* ------------------------------------------------------------------
     HTML-Bausteine
     ------------------------------------------------------------------ */

  function chipHtml(art, eintrag, gewaehltId, gesperrt) {
    const gewaehlt = eintrag.id === gewaehltId;
    return `
      <button type="button" class="chip" role="radio" aria-checked="${gewaehlt}"
        data-${art}="${esc(eintrag.id)}" ${gesperrt && !gewaehlt ? 'disabled' : ''}>
        ${esc(eintrag.name)}
      </button>`;
  }

  function kopfHtml() {
    const bearbeiten = Boolean(zustand.trainingId);

    const banner = bearbeiten ? `
      <div class="banner banner-info">
        ${icon('edit')}
        <div class="banner-text">
          <strong>Gespeichertes Training</strong>
          <span>Änderungen werden mit „Änderungen speichern“ übernommen.</span>
        </div>
        <button type="button" class="knopf knopf-rand knopf-klein" data-aktion="neu">${icon('plus')}<span>Neu</span></button>
      </div>` : '';

    // Eingeklappt: nur eine Zusammenfassungszeile. Ein Tippen klappt sie auf.
    if (zustand.gruppeId && !zustand.kopfOffen) {
      const gruppe = stamm.gruppen.find(g => g.id === zustand.gruppeId);
      const standort = stamm.standorte.find(s => s.id === zustand.standortId);
      const trainer = stamm.trainer.find(t => t.id === zustand.trainerId);
      return `
        ${banner}
        <button type="button" class="karte kopf-kompakt" data-aktion="kopf-oeffnen" aria-expanded="false">
          <span class="zeile-text">
            <strong>${esc(gruppe?.name)} · ${esc(standort?.name)}</strong>
            <small>${esc(Hilfe.formatDatum(zustand.datum))} · ${esc(zustand.zeitVon)}–${esc(zustand.zeitBis)} · ${esc(trainer?.name || 'kein Trainer')}</small>
          </span>
          <span class="kopf-aendern">${icon('edit')}<span>Ändern</span></span>
        </button>
        <div id="t-doppelt"></div>`;
    }

    const standortChips = stamm.standorte.map(s => chipHtml('standort', s, zustand.standortId, bearbeiten)).join('');
    const gruppenChips = stamm.gruppen.length
      ? stamm.gruppen.map(g => chipHtml('gruppe', g, zustand.gruppeId, bearbeiten)).join('')
      : `<p class="text-leise">Hier gibt es noch keine Gruppen. <a href="#verwaltung/gruppen">Gruppe anlegen</a></p>`;

    const trainerOptionen = [`<option value="">${stamm.trainer.length ? '– bitte wählen –' : '– noch kein Trainer angelegt –'}</option>`]
      .concat(stamm.trainer.map(t =>
        `<option value="${esc(t.id)}" ${t.id === zustand.trainerId ? 'selected' : ''}>${esc(t.name)}</option>`))
      .join('');

    return `
      ${banner}
      <section class="karte kopf-karte" aria-label="Trainingsdaten">
        <div class="feld">
          <span class="feld-label" id="lbl-standort">Standort</span>
          <div class="chips" role="radiogroup" aria-labelledby="lbl-standort">${standortChips}</div>
        </div>
        <div class="feld">
          <span class="feld-label" id="lbl-gruppe">Gruppe</span>
          <div class="chips" role="radiogroup" aria-labelledby="lbl-gruppe">${gruppenChips}</div>
        </div>
        <div class="feld-raster feld-raster-zeit">
          <div class="feld">
            <label class="feld-label" for="t-datum">Datum</label>
            <input type="date" id="t-datum" data-feld="datum" autocomplete="off" value="${esc(zustand.datum)}" required>
          </div>
          <div class="feld">
            <label class="feld-label" for="t-von">Von</label>
            <input type="time" id="t-von" data-feld="zeitVon" autocomplete="off" value="${esc(zustand.zeitVon)}" step="300" required>
          </div>
          <div class="feld">
            <label class="feld-label" for="t-bis">Bis</label>
            <input type="time" id="t-bis" data-feld="zeitBis" autocomplete="off" value="${esc(zustand.zeitBis)}" step="300" required>
          </div>
        </div>
        <div class="feld">
          <label class="feld-label" for="t-trainer">Trainer</label>
          <select id="t-trainer" data-feld="trainerId" autocomplete="off">${trainerOptionen}</select>
        </div>
        ${zustand.gruppeId ? `<button type="button" class="text-knopf" data-aktion="kopf-schliessen">${icon('check')}<span>Fertig</span></button>` : ''}
      </section>
      <div id="t-doppelt"></div>`;
  }

  function kindKarteHtml(kind) {
    const eintrag = zustand.anwesenheit[kind.id] || {};
    const da = Boolean(eintrag.anwesend);
    const unterzeile = [
      kind.probetraining ? '<span class="abzeichen abzeichen-probe">Probetraining</span>' : '',
      kind.aktiv === false ? '<span class="abzeichen">inaktiv</span>' : '',
      eintrag.hinweis ? `<span class="kind-hinweis">${esc(eintrag.hinweis)}</span>` : ''
    ].join('');

    return `
      <div class="kind-karte ${da ? 'ist-da' : ''}" data-karte="${esc(kind.id)}">
        <button type="button" class="kind-umschalter" data-kind="${esc(kind.id)}" aria-pressed="${da}">
          <span class="avatar">
            <span class="avatar-text">${esc(Hilfe.initialen(kind))}</span>
            ${icon('check', 'avatar-haken')}
          </span>
          <span class="kind-text">
            <span class="kind-name">${esc(Hilfe.vollerName(kind))}</span>
            ${unterzeile ? `<span class="kind-unterzeile">${unterzeile}</span>` : ''}
          </span>
        </button>
        <button type="button" class="kind-hinweis-knopf ${eintrag.hinweis ? 'hat-hinweis' : ''}"
          data-aktion="hinweis" data-kind-id="${esc(kind.id)}" aria-label="Hinweis zu ${esc(Hilfe.vollerName(kind))}">
          ${icon('note')}
        </button>
      </div>`;
  }

  function teilnehmerHtml() {
    let inhalt;
    if (!zustand.gruppeId) {
      inhalt = Hilfe.leererZustand({
        icon: 'users', titel: 'Gruppe wählen',
        text: 'Tippe oben auf eine Gruppe. Dann erscheinen hier alle Kinder.'
      });
    } else if (zustand.kinder.length === 0) {
      inhalt = Hilfe.leererZustand({
        icon: 'users', titel: 'Noch keine Kinder in dieser Gruppe',
        text: 'Lege Kinder in der Verwaltung an oder füge ein Probetraining hinzu.',
        aktion: `
          <button type="button" class="knopf knopf-primaer" data-aktion="probe">${icon('user-plus')}<span>Probetraining</span></button>
          <a class="knopf knopf-rand" href="#verwaltung/kinder">Kinder verwalten</a>`
      });
    } else {
      inhalt = `
        <div class="kinder-raster">
          ${zustand.kinder.map(kindKarteHtml).join('')}
          <button type="button" class="kind-neu" data-aktion="probe">${icon('user-plus')}<span>Probetraining hinzufügen</span></button>
        </div>`;
    }

    return `
      <section class="abschnitt" aria-label="Teilnehmer">
        <div class="abschnitt-kopf">
          <h2>Teilnehmer</h2>
          ${zustand.kinder.length ? `<button type="button" class="knopf knopf-leise knopf-klein" data-aktion="alle" id="t-alle">${icon('list-checks')}<span>Alle da</span></button>` : ''}
        </div>
        ${inhalt}
      </section>`;
  }

  function aktionsleisteHtml() {
    return `
      <div class="aktionsleiste">
        <div class="zaehler">
          <span class="zaehler-text" id="t-zaehler"></span>
          <span class="fortschritt" aria-hidden="true"><span id="t-balken"></span></span>
        </div>
        <button type="button" class="knopf knopf-primaer knopf-gross" data-aktion="speichern" ${zustand.gruppeId ? '' : 'disabled'}>
          ${icon('check')}<span>${zustand.trainingId ? 'Änderungen speichern' : 'Speichern'}</span>
        </button>
      </div>`;
  }

  /* ------------------------------------------------------------------
     Kleine Aktualisierungen (ohne alles neu zu zeichnen,
     damit die sanften Übergänge im CSS sichtbar bleiben)
     ------------------------------------------------------------------ */

  function anzahlAnwesend() {
    return zustand.kinder.filter(k => zustand.anwesenheit[k.id]?.anwesend).length;
  }

  function aktualisiereZaehler() {
    const gesamt = zustand.kinder.length;
    const da = anzahlAnwesend();
    ansicht.querySelector('#t-zaehler').innerHTML = `<strong>${da}</strong> von ${gesamt} anwesend`;
    ansicht.querySelector('#t-balken').style.width = gesamt ? `${(da / gesamt) * 100}%` : '0%';
    const alleKnopf = ansicht.querySelector('#t-alle span');
    if (alleKnopf) alleKnopf.textContent = gesamt > 0 && da === gesamt ? 'Alle abwählen' : 'Alle da';
  }

  function findeKarte(kindId) {
    // CSS.escape schützt vor Sonderzeichen in der ID
    return ansicht.querySelector(`[data-karte="${CSS.escape(kindId)}"]`);
  }

  function zeichneKarteNeu(kindId) {
    const kind = zustand.kinder.find(k => k.id === kindId);
    const karte = findeKarte(kindId);
    if (kind && karte) karte.outerHTML = kindKarteHtml(kind);
  }

  async function pruefeDoppeltes() {
    const ziel = ansicht?.querySelector('#t-doppelt');
    if (!ziel) return;
    if (zustand.trainingId || !zustand.gruppeId || !zustand.datum) {
      ziel.innerHTML = '';
      return;
    }
    const vorhandene = await Speicher.ladeTrainings({
      gruppeId: zustand.gruppeId, datumVon: zustand.datum, datumBis: zustand.datum
    });
    const t = vorhandene[0];
    ziel.innerHTML = t ? `
      <div class="banner banner-warnung">
        ${icon('alert')}
        <div class="banner-text">
          <strong>Schon gespeichert</strong>
          <span>An diesem Tag gibt es für die Gruppe bereits ein Training (${esc(t.zeitVon)}–${esc(t.zeitBis)} Uhr, ${t.anzahlAnwesend} von ${t.anzahlGesamt} da).</span>
        </div>
        <button type="button" class="knopf knopf-rand knopf-klein" data-aktion="oeffnen" data-training-id="${esc(t.id)}">Öffnen</button>
      </div>` : '';
  }

  /* ------------------------------------------------------------------
     Ereignisse
     ------------------------------------------------------------------ */

  async function beiKlick(e) {
    const ziel = e.target.closest('button');
    if (!ziel || ziel.disabled) return;
    const d = ziel.dataset; // data-xyz Attribute -> d.xyz
    try {
      if (d.kind) umschalten(d.kind);
      else if (d.standort) await waehleStandort(d.standort);
      else if (d.gruppe) await waehleGruppe(d.gruppe);
      else if (d.aktion === 'hinweis') await bearbeiteHinweis(d.kindId);
      else if (d.aktion === 'probe') await probetrainingHinzufuegen();
      else if (d.aktion === 'alle') alleUmschalten();
      else if (d.aktion === 'speichern') await speichern();
      else if (d.aktion === 'neu') await starteNeu();
      else if (d.aktion === 'oeffnen') await bearbeite(d.trainingId);
      else if (d.aktion === 'kopf-oeffnen' || d.aktion === 'kopf-schliessen') {
        zustand.kopfOffen = d.aktion === 'kopf-oeffnen';
        rendere();
      }
    } catch (fehler) {
      console.error(fehler);
      Hilfe.zeigeMeldung(fehler.message, 'fehler', 5000);
    }
  }

  function beiAenderung(e) {
    const feld = e.target.dataset.feld;
    if (!feld) return;
    zustand[feld] = e.target.value;
    if (feld === 'zeitVon' || feld === 'zeitBis') zustand.zeitManuell = true;
    if (feld === 'datum') pruefeDoppeltes();
    if (zustand.trainingId) zustand.geaendert = true;
  }

  // Ein Tippen auf ein Kind wechselt zwischen anwesend und abwesend
  function umschalten(kindId) {
    const eintrag = zustand.anwesenheit[kindId] ||= { anwesend: false, hinweis: '' };
    eintrag.anwesend = !eintrag.anwesend;
    zustand.geaendert = true;

    const karte = findeKarte(kindId);
    karte.classList.toggle('ist-da', eintrag.anwesend);
    karte.querySelector('.kind-umschalter').setAttribute('aria-pressed', eintrag.anwesend);
    aktualisiereZaehler();
    if (navigator.vibrate) navigator.vibrate(8); // kurzes Vibrieren auf Android-Handys
  }

  function alleUmschalten() {
    const alleDa = anzahlAnwesend() === zustand.kinder.length;
    for (const kind of zustand.kinder) {
      const eintrag = zustand.anwesenheit[kind.id] ||= { anwesend: false, hinweis: '' };
      eintrag.anwesend = !alleDa;
      const karte = findeKarte(kind.id);
      karte.classList.toggle('ist-da', !alleDa);
      karte.querySelector('.kind-umschalter').setAttribute('aria-pressed', !alleDa);
    }
    zustand.geaendert = true;
    aktualisiereZaehler();
  }

  function hatMarkierungen() {
    return zustand.probekinder.length > 0 ||
      Object.values(zustand.anwesenheit).some(a => a.anwesend || a.hinweis);
  }

  function hatUngespeichertes() {
    return zustand.trainingId ? zustand.geaendert : hatMarkierungen();
  }

  // Fragt nach, bevor ungespeicherte Markierungen verloren gehen.
  async function darfVerwerfen() {
    if (!hatUngespeichertes()) return true;
    return Hilfe.bestaetige({
      titel: 'Änderungen verwerfen?',
      text: 'Du hast Änderungen, die noch nicht gespeichert sind. Sie gehen dabei verloren.',
      okText: 'Verwerfen',
      gefahr: true
    });
  }

  function leereListe() {
    zustand.anwesenheit = {};
    zustand.probekinder = [];
    zustand.geaendert = false;
  }

  async function waehleStandort(standortId) {
    if (standortId === zustand.standortId || zustand.trainingId) return;
    if (!(await darfVerwerfen())) return;
    const einstellungen = await Speicher.ladeEinstellungen();
    zustand.standortId = standortId;
    zustand.gruppeId = einstellungen.letzteGruppen?.[standortId] || null;
    leereListe();
    await ladeGruppenUndKinder();
    await setzeUeblicheZeit();
    rendere();
  }

  async function waehleGruppe(gruppeId) {
    if (gruppeId === zustand.gruppeId || zustand.trainingId) return;
    if (!(await darfVerwerfen())) return;
    zustand.gruppeId = gruppeId;
    zustand.kopfOffen = false; // Gruppe gewählt -> Platz für die Kinderliste machen
    leereListe();
    await setzeUeblicheZeit();
    await ladeKinder();
    rendere();
  }

  async function bearbeiteHinweis(kindId) {
    const kind = zustand.kinder.find(k => k.id === kindId);
    if (!kind) return;
    const bisher = zustand.anwesenheit[kindId]?.hinweis || '';
    let textfeld = null;

    const wahl = await Hilfe.zeigeDialog({
      titel: Hilfe.vollerName(kind),
      inhalt: `
        <p class="text-leise">Vorlage antippen oder selbst schreiben.</p>
        <div class="chips">
          ${HINWEIS_VORLAGEN.map(v => `<button type="button" class="chip" data-vorlage="${esc(v)}">${esc(v)}</button>`).join('')}
        </div>
        <div class="feld">
          <label class="feld-label" for="hinweis-text">Hinweis</label>
          <textarea id="hinweis-text" rows="2" placeholder="z. B. Knie geprellt">${esc(bisher)}</textarea>
        </div>`,
      knoepfe: [
        ...(bisher ? [{ text: 'Entfernen', wert: 'entfernen', art: 'gefahr-leise', icon: 'trash' }] : []),
        { text: 'Übernehmen', wert: 'ok', art: 'primaer', icon: 'check' }
      ],
      beiOeffnen: dialog => {
        textfeld = dialog.querySelector('#hinweis-text');
        dialog.addEventListener('click', e => {
          const chip = e.target.closest('[data-vorlage]');
          if (!chip) return;
          const vorlage = chip.dataset.vorlage;
          const aktuell = textfeld.value.trim();
          // Leer -> Vorlage einsetzen, sonst anhängen (aber nicht doppelt)
          textfeld.value = !aktuell ? vorlage : aktuell.includes(vorlage) ? aktuell : `${aktuell}, ${vorlage}`;
        });
      }
    });

    if (wahl !== 'ok' && wahl !== 'entfernen') return;
    const eintrag = zustand.anwesenheit[kindId] ||= { anwesend: false, hinweis: '' };
    eintrag.hinweis = wahl === 'entfernen' ? '' : textfeld.value.trim();
    zustand.geaendert = true;
    zeichneKarteNeu(kindId);
  }

  async function probetrainingHinzufuegen() {
    if (!zustand.gruppeId) {
      Hilfe.zeigeMeldung('Bitte zuerst eine Gruppe wählen.', 'fehler');
      return;
    }
    const werte = await Hilfe.formularDialog({
      titel: 'Probetraining hinzufügen',
      hinweis: 'Das Kind wird als „Probetraining“ markiert und zusammen mit dem Training gespeichert.',
      okText: 'Hinzufügen',
      felder: [
        { name: 'vorname', label: 'Vorname', pflicht: true, autofokus: true },
        { name: 'nachname', label: 'Nachname', platzhalter: 'optional' }
      ],
      pruefe: w => {
        const neuerName = `${w.vorname} ${w.nachname}`.trim().toLowerCase();
        return zustand.kinder.some(k => Hilfe.vollerName(k).toLowerCase() === neuerName)
          ? 'Dieses Kind steht schon in der Liste.' : '';
      }
    });
    if (!werte) return;

    // Vorläufige ID mit "neu-". Die echte ID gibt es erst beim Speichern.
    const kind = {
      id: `neu-${Date.now()}`, gruppeId: zustand.gruppeId,
      vorname: werte.vorname, nachname: werte.nachname,
      aktiv: true, probetraining: true
    };
    zustand.probekinder.push(kind);
    zustand.kinder.push(kind);
    zustand.anwesenheit[kind.id] = { anwesend: true, hinweis: '' };
    zustand.geaendert = true;
    rendere();
    Hilfe.zeigeMeldung(`${Hilfe.vollerName(kind)} ist als anwesend eingetragen.`, 'erfolg');
  }

  /* ------------------------------------------------------------------
     Speichern
     ------------------------------------------------------------------ */

  function pruefeEingaben() {
    if (!zustand.standortId) return 'Bitte einen Standort wählen.';
    if (!zustand.gruppeId) return 'Bitte eine Gruppe wählen.';
    if (!zustand.datum) return 'Bitte ein Datum eingeben.';
    if (!zustand.zeitVon || !zustand.zeitBis) return 'Bitte die Uhrzeit (von und bis) eingeben.';
    // "HH:MM" kann man als Text vergleichen, weil beide gleich aufgebaut sind
    if (zustand.zeitBis <= zustand.zeitVon) return '„Bis“ muss nach „Von“ liegen.';
    if (!zustand.trainerId) return 'Bitte einen Trainer wählen.';
    if (zustand.kinder.length === 0) return 'Die Liste ist leer. Füge zuerst Kinder hinzu.';
    return '';
  }

  async function speichern() {
    const fehler = pruefeEingaben();
    if (fehler) {
      Hilfe.zeigeMeldung(fehler, 'fehler', 4500);
      return;
    }
    const anzahlDa = anzahlAnwesend();
    if (anzahlDa === 0) {
      const trotzdem = await Hilfe.bestaetige({
        titel: 'Niemand anwesend?',
        text: 'Es ist kein Kind als anwesend markiert. Trotzdem speichern?',
        okText: 'Trotzdem speichern'
      });
      if (!trotzdem) return;
    }

    // 1. Neue Probetrainings-Kinder anlegen. Erst dann haben sie eine echte ID.
    for (const probe of zustand.probekinder) {
      const vorlaeufigeId = probe.id;
      const { id, ...daten } = probe; // alles außer der vorläufigen ID
      const gespeichert = await Speicher.speichereKind(daten);
      zustand.anwesenheit[gespeichert.id] = zustand.anwesenheit[vorlaeufigeId];
      delete zustand.anwesenheit[vorlaeufigeId];
      Object.assign(probe, gespeichert); // ändert das Kind auch in zustand.kinder
    }
    zustand.probekinder = [];

    // 2. Training und Anwesenheitsliste speichern
    const liste = zustand.kinder.map(k => ({
      kindId: k.id,
      anwesend: Boolean(zustand.anwesenheit[k.id]?.anwesend),
      hinweis: zustand.anwesenheit[k.id]?.hinweis || ''
    }));
    const warNeu = !zustand.trainingId;
    const training = await Speicher.speichereTraining({
      id: zustand.trainingId || undefined,
      standortId: zustand.standortId,
      gruppeId: zustand.gruppeId,
      datum: zustand.datum,
      zeitVon: zustand.zeitVon,
      zeitBis: zustand.zeitBis,
      trainerId: zustand.trainerId
    }, liste);

    // Ab jetzt "bearbeiten" wir dieses Training
    zustand.trainingId = training.id;
    zustand.anwesenheit = Object.fromEntries(liste.map(a => [a.kindId, { anwesend: a.anwesend, hinweis: a.hinweis }]));
    zustand.geaendert = false;

    // Standort und Gruppe für das nächste Mal merken
    const einstellungen = await Speicher.ladeEinstellungen();
    await Speicher.speichereEinstellungen({
      standortId: zustand.standortId,
      letzteGruppen: { ...(einstellungen.letzteGruppen || {}), [zustand.standortId]: zustand.gruppeId }
    });
    App.aktualisiereProfil();

    rendere();
    await zeigeErfolg(training, anzahlDa, warNeu);
  }

  function naechsteGruppe() {
    const aktive = stamm.gruppen.filter(g => g.aktiv !== false);
    const index = aktive.findIndex(g => g.id === zustand.gruppeId);
    return index >= 0 ? aktive[index + 1] || null : null;
  }

  async function zeigeErfolg(training, anzahlDa, warNeu) {
    const gruppe = stamm.gruppen.find(g => g.id === training.gruppeId);
    const standort = stamm.standorte.find(s => s.id === training.standortId);
    const naechste = warNeu ? naechsteGruppe() : null;

    const wahl = await Hilfe.zeigeDialog({
      titel: warNeu ? 'Training gespeichert' : 'Änderungen gespeichert',
      klasse: 'dialog-klein',
      inhalt: `
        <div class="erfolg">
          <div class="erfolg-icon">${icon('check')}</div>
          <p class="erfolg-zahl"><strong>${anzahlDa}</strong> von ${zustand.kinder.length} anwesend</p>
          <p class="text-leise">
            ${esc(gruppe?.name)} · ${esc(standort?.name)}<br>
            ${esc(Hilfe.formatDatum(training.datum))} · ${esc(training.zeitVon)}–${esc(training.zeitBis)} Uhr
          </p>
        </div>`,
      knoepfe: [
        { text: 'Fertig', wert: 'fertig', art: 'leise' },
        naechste
          ? { text: `Weiter: ${naechste.name}`, wert: 'naechste', art: 'primaer', icon: 'arrow-right' }
          : { text: 'Neues Training', wert: 'neu', art: 'primaer', icon: 'plus' }
      ]
    });

    if (wahl === 'naechste') {
      // Nächste Gruppe beginnt meist, wenn die vorige aufhört
      const dauer = Hilfe.zeitZuMinuten(training.zeitBis) - Hilfe.zeitZuMinuten(training.zeitVon);
      await starteNeu({
        standortId: training.standortId, gruppeId: naechste.id, datum: training.datum,
        zeitVon: training.zeitBis, zeitBis: Hilfe.zeitPlus(training.zeitBis, dauer)
      });
    } else if (wahl === 'neu') {
      await starteNeu();
    }
  }

  /* ------------------------------------------------------------------
     Neu starten / Bearbeiten (auch von anderen Ansichten aufrufbar)
     ------------------------------------------------------------------ */

  async function starteNeu(vorlage = {}) {
    if (!(await darfVerwerfen())) return;
    zustand.bereit = false;
    naechsteVorlage = vorlage;
    await zeige(wurzel);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // Lädt ein gespeichertes Training zum Bearbeiten.
  async function bearbeite(trainingId) {
    if (!(await darfVerwerfen())) return;
    const training = await Speicher.ladeTraining(trainingId);
    if (!training) {
      Hilfe.zeigeMeldung('Dieses Training gibt es nicht mehr.', 'fehler');
      return;
    }
    const anwesenheit = await Speicher.ladeAnwesenheit(trainingId);
    Object.assign(zustand, {
      bereit: true,
      trainingId: training.id,
      standortId: training.standortId,
      gruppeId: training.gruppeId,
      datum: training.datum,
      zeitVon: training.zeitVon,
      zeitBis: training.zeitBis,
      zeitManuell: true,
      trainerId: training.trainerId,
      kopfOffen: false,
      probekinder: [],
      anwesenheit: Object.fromEntries(anwesenheit.map(a => [a.kindId, { anwesend: a.anwesend, hinweis: a.hinweis }])),
      geaendert: false
    });
    if (wurzel && location.hash.startsWith('#training')) {
      await zeige(wurzel);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      location.hash = 'training'; // App.js zeigt dann diese Ansicht an
    }
  }

  // Wird aufgerufen, wenn sich Stammdaten grundlegend geändert haben
  // (Testdaten, Import, Einrichtung). erzwingen = auch ungespeicherte Daten verwerfen.
  function zuruecksetzen(erzwingen = false) {
    if (erzwingen || !hatUngespeichertes()) {
      zustand.bereit = false;
      leereListe();
    }
  }

  // Wird ein Training im Verlauf gelöscht, das hier gerade offen ist,
  // beginnen wir neu.
  function trainingGeloescht(trainingId) {
    if (zustand.trainingId === trainingId) zuruecksetzen(true);
  }

  /* ------------------------------------------------------------------
     Willkommen (beim allerersten Start, wenn es noch keine Daten gibt)
     ------------------------------------------------------------------ */

  function zeigeWillkommen() {
    zustand.bereit = false;
    const el = document.createElement('div');
    el.className = 'ansicht';
    el.innerHTML = `
      <section class="willkommen">
        <div class="willkommen-logo">${icon('clipboard')}</div>
        <h1>Willkommen!</h1>
        <p>Mit dieser App erfasst ihr die Anwesenheit im Training direkt am Handy, statt auf Papier.</p>
        <div class="optionen">
          <button type="button" class="option-karte" data-aktion="testdaten">
            <span class="option-icon">${icon('beaker')}</span>
            <span><strong>Mit Testdaten ausprobieren</strong>
            <small>3 Standorte, 9 Gruppen, 72 erfundene Kinder. Später mit einem Knopf löschbar.</small></span>
          </button>
          <button type="button" class="option-karte" data-aktion="import">
            <span class="option-icon">${icon('upload')}</span>
            <span><strong>Mitgliederliste importieren</strong>
            <small>Die JSON-Datei von einem anderen Trainer laden.</small></span>
          </button>
          <a class="option-karte" href="#verwaltung/standorte">
            <span class="option-icon">${icon('plus')}</span>
            <span><strong>Leer beginnen</strong>
            <small>Standorte, Gruppen und Kinder selbst anlegen.</small></span>
          </a>
        </div>
      </section>`;
    el.addEventListener('click', e => {
      const knopf = e.target.closest('[data-aktion]');
      if (knopf?.dataset.aktion === 'testdaten') App.ladeTestdaten();
      if (knopf?.dataset.aktion === 'import') App.importiereMitglieder();
    });
    wurzel.replaceChildren(el);
  }

  return { zeige, bearbeite, hatUngespeichertes, zuruecksetzen, trainingGeloescht };
})();
