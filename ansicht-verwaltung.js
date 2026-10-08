/* =====================================================================
   ansicht-verwaltung.js – Standorte, Gruppen, Kinder, Trainer, Daten
   ---------------------------------------------------------------------
   Einträge werden nicht gelöscht, sondern DEAKTIVIERT. So bleiben alte
   Trainings vollständig: Ein Kind, das aufgehört hat, steht weiterhin
   in den Anwesenheitslisten von früher.
   ===================================================================== */

const VerwaltungAnsicht = (() => {
  const { esc, icon } = Hilfe;

  const REITER = [
    { id: 'kinder', text: 'Kinder' },
    { id: 'gruppen', text: 'Gruppen' },
    { id: 'standorte', text: 'Standorte' },
    { id: 'trainer', text: 'Trainer' },
    { id: 'daten', text: 'Daten' }
  ];

  const filter = { standortId: '', gruppeId: '', inaktive: false };
  let reiter = 'kinder';
  let wurzel = null;
  let n = {}; // Stammdaten dieser Ansicht

  async function ladeStamm() {
    const [standorte, gruppen, kinder, trainer, einstellungen] = await Promise.all([
      Speicher.ladeStandorte(), Speicher.ladeGruppen(), Speicher.ladeKinder(),
      Speicher.ladeTrainer(), Speicher.ladeEinstellungen()
    ]);
    n = {
      standorte, gruppen, kinder, trainer, einstellungen,
      standortKarte: Hilfe.alsKarte(standorte),
      gruppenKarte: Hilfe.alsKarte(gruppen)
    };
  }

  async function zeige(container, parameter) {
    wurzel = container;
    if (REITER.some(r => r.id === parameter)) reiter = parameter;
    await ladeStamm();

    if (filter.standortId && !n.standortKarte.has(filter.standortId)) filter.standortId = '';
    if (filter.gruppeId && (!n.gruppenKarte.has(filter.gruppeId) ||
      (filter.standortId && n.gruppenKarte.get(filter.gruppeId).standortId !== filter.standortId))) filter.gruppeId = '';

    const inhalt = {
      kinder: kinderHtml, gruppen: gruppenHtml, standorte: standorteHtml, trainer: trainerHtml, daten: datenHtml
    }[reiter];

    const el = document.createElement('div');
    el.className = 'ansicht';
    el.innerHTML = `
      <div class="seiten-kopf"><h1>Verwaltung</h1></div>
      <nav class="reiter" aria-label="Bereiche der Verwaltung">
        ${REITER.map(r => `<a href="#verwaltung/${r.id}" class="reiter-link" ${r.id === reiter ? 'aria-current="page"' : ''}>${r.text}</a>`).join('')}
      </nav>
      <div class="reiter-inhalt">${await inhalt()}</div>`;

    el.addEventListener('click', beiKlick);
    el.addEventListener('change', beiAenderung);
    wurzel.replaceChildren(el);
  }

  /* ------------------------------------------------------------------
     Kleine Bausteine
     ------------------------------------------------------------------ */

  function gruppenLabel(g) {
    return `${g.name} · ${n.standortKarte.get(g.standortId)?.name || '?'}`;
  }

  function option(wert, text, gewaehlt) {
    return `<option value="${esc(wert)}" ${wert === gewaehlt ? 'selected' : ''}>${esc(text)}</option>`;
  }

  function zeileHtml({ art, id, titel, unter, avatar, abzeichen = '', inaktiv }) {
    return `
      <button type="button" class="listen-zeile ${inaktiv ? 'ist-inaktiv' : ''}" data-bearbeite="${art}" data-id="${esc(id)}">
        ${avatar ? `<span class="avatar">${esc(avatar)}</span>` : ''}
        <span class="zeile-text"><strong>${esc(titel)}</strong>${unter ? `<small>${esc(unter)}</small>` : ''}</span>
        ${abzeichen}${inaktiv ? '<span class="abzeichen">inaktiv</span>' : ''}
        ${icon('chevron-right', 'zeile-pfeil')}
      </button>`;
  }

  function aktivFeld(eintrag, beschreibung) {
    return { name: 'aktiv', label: 'Aktiv', typ: 'checkbox', wert: eintrag ? eintrag.aktiv !== false : true, beschreibung };
  }

  /* ------------------------------------------------------------------
     Reiter: Kinder
     ------------------------------------------------------------------ */

  function kinderHtml() {
    if (!n.gruppen.length) {
      return Hilfe.leererZustand({
        icon: 'users', titel: 'Zuerst Standort und Gruppe anlegen',
        text: 'Kinder gehören immer zu einer Gruppe, und Gruppen zu einem Standort.',
        aktion: `<a class="knopf knopf-primaer" href="#verwaltung/${n.standorte.length ? 'gruppen' : 'standorte'}">Los geht's</a>`
      });
    }
    const gruppenAuswahl = n.gruppen.filter(g => !filter.standortId || g.standortId === filter.standortId);
    const kinder = n.kinder.filter(k => {
      const g = n.gruppenKarte.get(k.gruppeId);
      return (!filter.standortId || g?.standortId === filter.standortId) &&
        (!filter.gruppeId || k.gruppeId === filter.gruppeId) &&
        (filter.inaktive || k.aktiv !== false);
    });

    return `
      <div class="werkzeugleiste">
        <button type="button" class="knopf knopf-primaer" data-aktion="kind-neu">${icon('user-plus')}<span>Kind hinzufügen</span></button>
        <button type="button" class="knopf knopf-rand" data-aktion="kinder-mehrere">${icon('list-checks')}<span>Mehrere</span></button>
      </div>
      <section class="karte filter-karte" aria-label="Filter">
        <div class="feld-raster feld-raster-2">
          <div class="feld">
            <label class="feld-label" for="vw-standort">Standort</label>
            <select id="vw-standort" data-filter="standortId" autocomplete="off">
              <option value="">Alle Standorte</option>
              ${n.standorte.map(s => option(s.id, s.name, filter.standortId)).join('')}
            </select>
          </div>
          <div class="feld">
            <label class="feld-label" for="vw-gruppe">Gruppe</label>
            <select id="vw-gruppe" data-filter="gruppeId" autocomplete="off">
              <option value="">Alle Gruppen</option>
              ${gruppenAuswahl.map(g => option(g.id, filter.standortId ? g.name : gruppenLabel(g), filter.gruppeId)).join('')}
            </select>
          </div>
        </div>
        <label class="schalter-zeile kompakt">
          <span>Inaktive Kinder anzeigen</span>
          <input type="checkbox" role="switch" class="schalter" data-filter="inaktive" autocomplete="off" ${filter.inaktive ? 'checked' : ''}>
        </label>
      </section>
      <p class="zusammenfassung">${kinder.length} ${kinder.length === 1 ? 'Kind' : 'Kinder'}</p>
      ${kinder.length ? `<div class="liste">${kinder.map(k => {
        const g = n.gruppenKarte.get(k.gruppeId);
        return zeileHtml({
          art: 'kind', id: k.id, titel: Hilfe.vollerName(k), avatar: Hilfe.initialen(k),
          unter: g ? gruppenLabel(g) : 'ohne Gruppe', inaktiv: k.aktiv === false,
          abzeichen: k.probetraining ? '<span class="abzeichen abzeichen-probe">Probe</span>' : ''
        });
      }).join('')}</div>` : Hilfe.leererZustand({ icon: 'users', titel: 'Keine Kinder', text: 'Hier gibt es noch keine Kinder. Füge oben welche hinzu.' })}`;
  }

  // Öffentlich, damit auch die Kinder-Übersicht ein Kind bearbeiten kann.
  // Gibt true zurück, wenn gespeichert wurde.
  async function bearbeiteKind(kindId) {
    await ladeStamm();
    const kind = kindId ? n.kinder.find(k => k.id === kindId) : null;
    const gruppen = n.gruppen.filter(g => g.aktiv !== false || g.id === kind?.gruppeId);

    const werte = await Hilfe.formularDialog({
      titel: kind ? 'Kind bearbeiten' : 'Kind hinzufügen',
      felder: [
        { name: 'vorname', label: 'Vorname', wert: kind?.vorname, pflicht: true, autofokus: !kind },
        { name: 'nachname', label: 'Nachname', wert: kind?.nachname },
        {
          name: 'gruppeId', label: 'Gruppe', typ: 'select', pflicht: true,
          wert: kind?.gruppeId || filter.gruppeId,
          optionen: [{ wert: '', text: '– bitte wählen –' }, ...gruppen.map(g => ({ wert: g.id, text: gruppenLabel(g) }))]
        },
        { name: 'probetraining', label: 'Probetraining', typ: 'checkbox', wert: kind?.probetraining, beschreibung: 'Noch kein festes Mitglied' },
        aktivFeld(kind, 'Inaktive Kinder erscheinen nicht mehr in der Anwesenheitsliste. Alte Trainings bleiben erhalten.')
      ],
      pruefe: w => {
        const name = `${w.vorname} ${w.nachname}`.trim().toLowerCase();
        const doppelt = n.kinder.some(k => k.id !== kind?.id && k.gruppeId === w.gruppeId && Hilfe.vollerName(k).toLowerCase() === name);
        return doppelt ? 'In dieser Gruppe gibt es schon ein Kind mit diesem Namen.' : '';
      }
    });
    if (!werte) return false;
    await Speicher.speichereKind({ ...(kind ? { id: kind.id } : {}), ...werte });
    Hilfe.zeigeMeldung(kind ? 'Änderungen gespeichert.' : `${werte.vorname} wurde hinzugefügt.`, 'erfolg');
    return true;
  }

  async function kinderMehrere() {
    const werte = await Hilfe.formularDialog({
      titel: 'Mehrere Kinder hinzufügen',
      hinweis: 'Ein Kind pro Zeile, z. B. „Mia Muster“. Das erste Wort ist der Vorname. Namen, die es in der Gruppe schon gibt, werden übersprungen.',
      okText: 'Hinzufügen',
      felder: [
        {
          name: 'gruppeId', label: 'Gruppe', typ: 'select', pflicht: true, wert: filter.gruppeId,
          optionen: [{ wert: '', text: '– bitte wählen –' }, ...n.gruppen.filter(g => g.aktiv !== false).map(g => ({ wert: g.id, text: gruppenLabel(g) }))]
        },
        { name: 'namen', label: 'Namen', typ: 'textarea', zeilen: 8, pflicht: true, platzhalter: 'Mia Muster\nLeon Beispiel\nEmma Testfeld' }
      ]
    });
    if (!werte) return;

    const vorhandene = new Set(n.kinder.filter(k => k.gruppeId === werte.gruppeId).map(k => Hilfe.vollerName(k).toLowerCase()));
    let neu = 0;
    let uebersprungen = 0;
    for (const zeile of werte.namen.split('\n')) {
      const teile = zeile.trim().split(/\s+/).filter(Boolean); // an Leerzeichen/Tabs trennen
      if (!teile.length) continue;
      const [vorname, ...rest] = teile;
      const nachname = rest.join(' ');
      const schluessel = `${vorname} ${nachname}`.trim().toLowerCase();
      if (vorhandene.has(schluessel)) {
        uebersprungen++;
        continue;
      }
      vorhandene.add(schluessel);
      await Speicher.speichereKind({ vorname, nachname, gruppeId: werte.gruppeId });
      neu++;
    }
    Hilfe.zeigeMeldung(`${neu} Kinder hinzugefügt${uebersprungen ? `, ${uebersprungen} übersprungen (schon vorhanden)` : ''}.`, 'erfolg', 4500);
  }

  /* ------------------------------------------------------------------
     Reiter: Gruppen
     ------------------------------------------------------------------ */

  function gruppenHtml() {
    if (!n.standorte.length) {
      return Hilfe.leererZustand({
        icon: 'pin', titel: 'Zuerst einen Standort anlegen', text: 'Gruppen gehören immer zu einem Standort.',
        aktion: `<a class="knopf knopf-primaer" href="#verwaltung/standorte">Zu den Standorten</a>`
      });
    }
    const standorte = n.standorte.filter(s => !filter.standortId || s.id === filter.standortId);
    return `
      <div class="werkzeugleiste">
        <button type="button" class="knopf knopf-primaer" data-aktion="gruppe-neu">${icon('plus')}<span>Gruppe hinzufügen</span></button>
      </div>
      ${standorte.map(s => {
        const gruppen = n.gruppen.filter(g => g.standortId === s.id);
        return `
          <h2 class="monat">${esc(s.name)}</h2>
          ${gruppen.length ? `<div class="liste">${gruppen.map(g => zeileHtml({
            art: 'gruppe', id: g.id, titel: g.name, inaktiv: g.aktiv === false,
            unter: `${n.kinder.filter(k => k.gruppeId === g.id && k.aktiv !== false).length} aktive Kinder`
          })).join('')}</div>` : '<p class="text-leise leer-klein">Noch keine Gruppen an diesem Standort.</p>'}`;
      }).join('')}`;
  }

  async function bearbeiteGruppe(gruppeId) {
    const gruppe = gruppeId ? n.gruppenKarte.get(gruppeId) : null;
    const werte = await Hilfe.formularDialog({
      titel: gruppe ? 'Gruppe bearbeiten' : 'Gruppe hinzufügen',
      felder: [
        { name: 'name', label: 'Name', wert: gruppe?.name, pflicht: true, autofokus: !gruppe, platzhalter: 'z. B. Kids (7–10 J.)' },
        {
          name: 'standortId', label: 'Standort', typ: 'select', pflicht: true,
          wert: gruppe?.standortId || filter.standortId || (n.standorte.length === 1 ? n.standorte[0].id : ''),
          optionen: [{ wert: '', text: '– bitte wählen –' }, ...n.standorte.map(s => ({ wert: s.id, text: s.name }))]
        },
        {
          name: 'position', label: 'Position (1 = kleinste Gruppe)', typ: 'number', min: 1,
          wert: gruppe ? (gruppe.reihenfolge ?? 0) + 1 : '', platzhalter: 'automatisch'
        },
        aktivFeld(gruppe, 'Inaktive Gruppen erscheinen nicht mehr beim Trainingsstart.')
      ]
    });
    if (!werte) return;
    const gespeichert = await Speicher.speichereGruppe({
      ...(gruppe ? { id: gruppe.id } : {}),
      name: werte.name, standortId: werte.standortId, aktiv: werte.aktiv
    });
    if (werte.position) await sortiereGruppen(gespeichert, Number(werte.position));
    Hilfe.zeigeMeldung(gruppe ? 'Gruppe gespeichert.' : `Gruppe „${werte.name}“ angelegt.`, 'erfolg');
  }

  // Setzt eine Gruppe an die gewünschte Position (1 = erste) und lässt die
  // anderen Gruppen desselben Standorts nachrücken: 0, 1, 2, ...
  async function sortiereGruppen(gruppe, position) {
    const andere = (await Speicher.ladeGruppen({ standortId: gruppe.standortId })).filter(g => g.id !== gruppe.id);
    const index = Math.min(Math.max(position - 1, 0), andere.length);
    andere.splice(index, 0, gruppe); // an der Stelle "index" einfügen
    for (const [neueReihenfolge, g] of andere.entries()) {
      if (g.reihenfolge !== neueReihenfolge) await Speicher.speichereGruppe({ id: g.id, reihenfolge: neueReihenfolge });
    }
  }

  /* ------------------------------------------------------------------
     Reiter: Standorte
     ------------------------------------------------------------------ */

  function standorteHtml() {
    return `
      <div class="werkzeugleiste">
        <button type="button" class="knopf knopf-primaer" data-aktion="standort-neu">${icon('plus')}<span>Standort hinzufügen</span></button>
      </div>
      ${n.standorte.length ? `<div class="liste">${n.standorte.map(s => {
        const gruppen = n.gruppen.filter(g => g.standortId === s.id);
        const ids = new Set(gruppen.map(g => g.id));
        const kinder = n.kinder.filter(k => ids.has(k.gruppeId) && k.aktiv !== false).length;
        return zeileHtml({
          art: 'standort', id: s.id, titel: s.name, inaktiv: s.aktiv === false,
          unter: `${gruppen.length} Gruppen · ${kinder} aktive Kinder`
        });
      }).join('')}</div>` : Hilfe.leererZustand({ icon: 'pin', titel: 'Noch keine Standorte', text: 'Lege zuerst die Standorte an, an denen ihr trainiert.' })}`;
  }

  async function bearbeiteStandort(standortId) {
    const standort = standortId ? n.standortKarte.get(standortId) : null;
    const werte = await Hilfe.formularDialog({
      titel: standort ? 'Standort bearbeiten' : 'Standort hinzufügen',
      felder: [
        { name: 'name', label: 'Name', wert: standort?.name, pflicht: true, autofokus: !standort, platzhalter: 'z. B. Halle Nord' },
        aktivFeld(standort, 'Inaktive Standorte erscheinen nicht mehr beim Trainingsstart.')
      ],
      pruefe: w => n.standorte.some(s => s.id !== standort?.id && s.name.toLowerCase() === w.name.toLowerCase())
        ? 'Diesen Standort gibt es schon.' : ''
    });
    if (!werte) return;
    await Speicher.speichereStandort({ ...(standort ? { id: standort.id } : {}), ...werte });
    Hilfe.zeigeMeldung(standort ? 'Standort gespeichert.' : `Standort „${werte.name}“ angelegt.`, 'erfolg');
  }

  /* ------------------------------------------------------------------
     Reiter: Trainer
     ------------------------------------------------------------------ */

  function trainerHtml() {
    return `
      <div class="werkzeugleiste">
        <button type="button" class="knopf knopf-primaer" data-aktion="trainer-neu">${icon('plus')}<span>Trainer hinzufügen</span></button>
      </div>
      ${n.trainer.length ? `<div class="liste">${n.trainer.map(t => zeileHtml({
        art: 'trainer', id: t.id, titel: t.name, inaktiv: t.aktiv === false,
        avatar: t.name.split(' ').map(teil => teil[0]).join('').slice(0, 2).toUpperCase(),
        abzeichen: t.id === n.einstellungen.trainerId ? '<span class="abzeichen abzeichen-du">Du</span>' : ''
      })).join('')}</div>` : Hilfe.leererZustand({ icon: 'user', titel: 'Noch keine Trainer' })}`;
  }

  async function bearbeiteTrainer(trainerId) {
    const trainer = trainerId ? n.trainer.find(t => t.id === trainerId) : null;
    const werte = await Hilfe.formularDialog({
      titel: trainer ? 'Trainer bearbeiten' : 'Trainer hinzufügen',
      felder: [
        { name: 'name', label: 'Name', wert: trainer?.name, pflicht: true, autofokus: !trainer, platzhalter: 'Vor- und Nachname' },
        aktivFeld(trainer, 'Inaktive Trainer stehen nicht mehr in der Auswahl.')
      ],
      pruefe: w => n.trainer.some(t => t.id !== trainer?.id && t.name.toLowerCase() === w.name.toLowerCase())
        ? 'Diesen Trainer gibt es schon.' : ''
    });
    if (!werte) return;
    await Speicher.speichereTrainer({ ...(trainer ? { id: trainer.id } : {}), ...werte });
    await App.aktualisiereProfil();
    Hilfe.zeigeMeldung(trainer ? 'Trainer gespeichert.' : `${werte.name} angelegt.`, 'erfolg');
  }

  /* ------------------------------------------------------------------
     Reiter: Daten (Export, Import, Backup, Testdaten, Darstellung)
     ------------------------------------------------------------------ */

  async function datenHtml() {
    const [belegung, hatTest] = await Promise.all([Speicher.ladeSpeicherbelegung(), Speicher.hatTestdaten()]);
    const letztesBackup = n.einstellungen.letztesBackup
      ? new Date(n.einstellungen.letztesBackup).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' })
      : null;
    const farbmodus = n.einstellungen.farbmodus || 'auto';

    return `
      <section class="karte daten-karte">
        <div class="daten-kopf">
          <span class="option-icon">${icon('users')}</span>
          <div>
            <h2>Mitgliederliste</h2>
            <p>Standorte, Gruppen, Kinder und Trainer als Datei weitergeben, damit alle Trainer mit derselben Liste starten. Beim Import wird nichts doppelt angelegt.</p>
          </div>
        </div>
        <div class="knopf-reihe">
          <button type="button" class="knopf knopf-rand" data-aktion="mitglieder-export">${icon('download')}<span>Exportieren</span></button>
          <button type="button" class="knopf knopf-rand" data-aktion="mitglieder-import">${icon('upload')}<span>Importieren</span></button>
        </div>
      </section>

      <section class="karte daten-karte">
        <div class="daten-kopf">
          <span class="option-icon">${icon('database')}</span>
          <div>
            <h2>Backup</h2>
            <p>Sichert alles, auch alle Trainings. Damit kannst du Daten wiederherstellen oder auf ein neues Gerät umziehen.</p>
            <p class="text-leise">${letztesBackup ? `Letztes Backup: ${esc(letztesBackup)}` : 'Auf diesem Gerät wurde noch kein Backup erstellt.'}</p>
          </div>
        </div>
        <div class="knopf-reihe">
          <button type="button" class="knopf knopf-primaer" data-aktion="backup-erstellen">${icon('download')}<span>Backup erstellen</span></button>
          <button type="button" class="knopf knopf-rand" data-aktion="backup-laden">${icon('upload')}<span>Wiederherstellen</span></button>
        </div>
      </section>

      <section class="karte daten-karte">
        <div class="daten-kopf">
          <span class="option-icon">${icon('beaker')}</span>
          <div>
            <h2>Testdaten</h2>
            <p>${hatTest
              ? 'Testdaten sind geladen. Löschen entfernt nur die erfundenen Einträge, deine eigenen bleiben.'
              : '3 Standorte mit je 3 Gruppen und 8 erfundenen Kindern, dazu Trainings der letzten 3 Wochen.'}</p>
          </div>
        </div>
        <div class="knopf-reihe">
          ${hatTest
            ? `<button type="button" class="knopf knopf-gefahr-leise" data-aktion="testdaten-loeschen">${icon('trash')}<span>Testdaten löschen</span></button>`
            : `<button type="button" class="knopf knopf-rand" data-aktion="testdaten-laden">${icon('beaker')}<span>Testdaten laden</span></button>`}
        </div>
      </section>

      <section class="karte daten-karte">
        <div class="daten-kopf">
          <span class="option-icon">${icon('sun')}</span>
          <div>
            <h2>Darstellung</h2>
            <p>Hell, dunkel oder automatisch wie am Gerät eingestellt.</p>
          </div>
        </div>
        <div class="segment" role="radiogroup" aria-label="Farbmodus">
          ${[['auto', 'Automatisch'], ['hell', 'Hell'], ['dunkel', 'Dunkel']].map(([wert, text]) => `
            <button type="button" role="radio" aria-checked="${farbmodus === wert}" data-farbmodus="${wert}">${text}</button>`).join('')}
        </div>
      </section>

      <section class="karte daten-karte">
        <div class="daten-kopf">
          <span class="option-icon">${icon('info')}</span>
          <div>
            <h2>Speicher</h2>
            <p>Die Daten liegen nur in diesem Browser auf diesem Gerät (ca. ${belegung.kilobyte} KB belegt). Wer den Browserverlauf komplett löscht, löscht auch diese Daten. Erstelle deshalb regelmäßig ein Backup.</p>
          </div>
        </div>
        <div class="knopf-reihe">
          <button type="button" class="knopf knopf-gefahr-leise" data-aktion="alles-loeschen">${icon('trash')}<span>Alle Daten löschen</span></button>
        </div>
      </section>`;
  }

  /* ------------------------------------------------------------------
     Ereignisse
     ------------------------------------------------------------------ */

  async function beiAenderung(e) {
    const schluessel = e.target.dataset.filter;
    if (!schluessel) return;
    filter[schluessel] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    if (schluessel === 'standortId') filter.gruppeId = '';
    await zeige(wurzel);
  }

  async function beiKlick(e) {
    const ziel = e.target.closest('button');
    if (!ziel || ziel.disabled) return;
    const { aktion, bearbeite, id, farbmodus } = ziel.dataset;

    // Diese Aktionen kümmern sich selbst um das Neuzeichnen (über App.js)
    const appAktionen = {
      'mitglieder-import': App.importiereMitglieder,
      'backup-laden': App.stelleBackupWiederHer,
      'testdaten-laden': App.ladeTestdaten,
      'testdaten-loeschen': App.loescheTestdaten,
      'alles-loeschen': App.loescheAlles
    };

    try {
      if (appAktionen[aktion]) return await appAktionen[aktion]();
      if (farbmodus) await App.setzeFarbmodus(farbmodus);
      else if (bearbeite === 'kind') await bearbeiteKind(id);
      else if (bearbeite === 'gruppe') await bearbeiteGruppe(id);
      else if (bearbeite === 'standort') await bearbeiteStandort(id);
      else if (bearbeite === 'trainer') await bearbeiteTrainer(id);
      else if (aktion === 'kind-neu') await bearbeiteKind(null);
      else if (aktion === 'kinder-mehrere') await kinderMehrere();
      else if (aktion === 'gruppe-neu') await bearbeiteGruppe(null);
      else if (aktion === 'standort-neu') await bearbeiteStandort(null);
      else if (aktion === 'trainer-neu') await bearbeiteTrainer(null);
      else if (aktion === 'mitglieder-export') {
        const daten = await Export.mitgliederliste();
        Hilfe.zeigeMeldung(`Mitgliederliste mit ${daten.kinder.length} Kindern heruntergeladen.`, 'erfolg');
      } else if (aktion === 'backup-erstellen') {
        await Export.backup();
        Hilfe.zeigeMeldung('Backup heruntergeladen. Bewahre die Datei gut auf.', 'erfolg');
      } else return;

      // Neu zeichnen, damit Änderungen sichtbar werden.
      // (Die Training-Ansicht lädt Stammdaten bei jedem Öffnen selbst neu.)
      await zeige(wurzel);
    } catch (fehler) {
      console.error(fehler);
      Hilfe.zeigeMeldung(fehler.message, 'fehler', 5000);
    }
  }

  return { zeige, bearbeiteKind };
})();
