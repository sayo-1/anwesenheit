/* =====================================================================
   testdaten.js – erzeugt erfundene Testdaten zum Ausprobieren
   ---------------------------------------------------------------------
   ALLE Namen sind ausgedacht. Jeder Eintrag bekommt "testdaten: true",
   damit Speicher.loescheTestdaten() ihn später gezielt entfernen kann.
   ===================================================================== */

const Testdaten = (() => {
  const VORNAMEN = [
    'Mia', 'Leon', 'Emma', 'Noah', 'Lina', 'Ben', 'Sofia', 'Elias', 'Hanna', 'Finn',
    'Lea', 'Paul', 'Mila', 'Jonas', 'Ella', 'Luis', 'Clara', 'Theo', 'Ida', 'Anton',
    'Frieda', 'Karl', 'Nele', 'Moritz', 'Greta', 'Oskar', 'Lotta', 'Henri', 'Romy', 'Milan',
    'Juna', 'Emil', 'Pia', 'Levi', 'Zoe', 'Tom', 'Yarro',
  ];
  const NACHNAMEN = [
    'Muster', 'Beispiel', 'Testfeld', 'Probe', 'Fantasie', 'Sonnenschein', 'Wolkenberg',
    'Blumental', 'Kieselstein', 'Morgenrot', 'Sternfeld', 'Apfelbaum', 'Regenbogen',
    'Wiesengrund', 'Funkelbach', 'Tannenhof', 'Lindenblatt', 'Federleicht', 'Maroo',
  ];
  const STANDORTE = ['Hanau', 'Alzenau', 'BSS'];
  const TRAINER = ['SE', 'SA', 'LAR', 'FER', 'JA','CHRI'];
  // Gruppen von klein bis groß, jeweils mit typischer Trainingszeit
  const GRUPPEN = [
    { name: 'Minis (4–7 J.)', von: '16:00', bis: '16:45' },
    { name: 'Kids (8–10 J.)', von:'17:00', bis: '18:00' },
    { name: 'Teens (11–16 J.)', von: '18:15', bis: '19:15' }
  ];
  // Trainingstage je Standort (0 = Sonntag, 1 = Montag, ...)
  const TRAININGSTAGE = [[1, 3], [2, 4], [1, 5]];
  const HINWEISE_DA = ['später gekommen', 'früher abgeholt', 'verletzt – hat zugeschaut'];
  const HINWEISE_WEG = ['krank', 'abgemeldet'];

  // Mischt eine Liste zufällig (Fisher-Yates-Verfahren)
  function mische(liste) {
    const kopie = [...liste];
    for (let i = kopie.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [kopie[i], kopie[j]] = [kopie[j], kopie[i]];
    }
    return kopie;
  }

  function zufall(liste) {
    return liste[Math.floor(Math.random() * liste.length)];
  }

  function erzeuge() {
    const id = Speicher.neueId;
    const markierung = { testdaten: true, erstelltAm: new Date().toISOString() };
    const paket = { standorte: [], gruppen: [], kinder: [], trainer: [], trainings: [], anwesenheit: [] };

    // Alle Kombinationen aus Vor- und Nachname, gemischt -> keine doppelten Namen
    const namen = mische(VORNAMEN.flatMap(v => NACHNAMEN.map(n => [v, n])));

    paket.trainer = TRAINER.map(name => ({ id: id(), name, aktiv: true, ...markierung }));

    STANDORTE.forEach((standortName, si) => {
      const standort = { id: id(), name: standortName, aktiv: true, reihenfolge: si, ...markierung };
      paket.standorte.push(standort);

      GRUPPEN.forEach((vorlage, gi) => {
        const gruppe = { id: id(), standortId: standort.id, name: vorlage.name, aktiv: true, reihenfolge: gi, ...markierung };
        paket.gruppen.push(gruppe);

        // 8 Kinder pro Gruppe, jedes mit eigener "Wahrscheinlichkeit, da zu sein"
        const kinder = [];
        for (let k = 0; k < 8; k++) {
          const [vorname, nachname] = namen.pop();
          const kind = { id: id(), gruppeId: gruppe.id, vorname, nachname, aktiv: true, probetraining: false, ...markierung };
          kinder.push({ kind, chance: 0.55 + Math.random() * 0.4 });
          paket.kinder.push(kind);
        }

        // Trainings der letzten 3 Wochen an den Trainingstagen dieses Standorts
        for (let tageZurueck = 21; tageZurueck >= 1; tageZurueck--) {
          const tag = new Date();
          tag.setDate(tag.getDate() - tageZurueck);
          if (!TRAININGSTAGE[si].includes(tag.getDay())) continue;

          const training = {
            id: id(), standortId: standort.id, gruppeId: gruppe.id,
            datum: Hilfe.datumZuISO(tag), zeitVon: vorlage.von, zeitBis: vorlage.bis,
            trainerId: paket.trainer[si].id, ...markierung
          };
          paket.trainings.push(training);

          for (const { kind, chance } of kinder) {
            const anwesend = Math.random() < chance;
            let hinweis = '';
            if (Math.random() < 0.12) hinweis = anwesend ? zufall(HINWEISE_DA) : zufall(HINWEISE_WEG);
            paket.anwesenheit.push({ id: id(), trainingId: training.id, kindId: kind.id, anwesend, hinweis });
          }
        }
      });
    });
    return paket;
  }

  // Erzeugt die Testdaten und speichert sie. Gibt zurück, wie viel angelegt wurde.
  async function lade() {
    const paket = erzeuge();
    await Speicher.speichereTestdaten(paket);
    return { kinder: paket.kinder.length, trainings: paket.trainings.length };
  }

  return { lade };
})();
