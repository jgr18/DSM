/* DSM — Excel-werkbestand (opslaan en openen), naar het voorbeeld van de assessmentplanner.
   Tabbladen (tabkleur per soort):
     grijs  — Toelichting, Instellingen
     groen  — invoer, wordt bij openen weer ingelezen: Activiteiten, Relaties, Keuzepunten, Scenario's, Tears, Interventies
     blauw  — uitvoer van de analyse: DSM oorspronkelijk, DSM voorgesteld, Blokken, Vergelijking, Parallel, Scenariovergelijking
   Bij openen worden alleen de grijze en groene tabbladen gelezen; de uitvoer wordt opnieuw berekend. */
(function (root) {
  'use strict';
  const DSM = root.DSM;
  const M = DSM.model, AN = DSM.analyse;

  const KLEUR = { toelichting: '888780', invoer: '1D9E75', uitvoer: '378ADD' };
  const KOP = { vet: true, vulling: 'E6E6E1', rand: true };
  const KOPM = Object.assign({ midden: true }, KOP);
  const R = { rand: true };
  const SOORTKLEUR = { I: ['93B3EC', '0F2A63', ''], H: ['EBAA72', '4A2200', 'H'], B: ['A9D9C2', '0E2E1E', 'B'], V: ['E4DEFB', '3C3489', '◆'] };
  const DIAG = '6E6E69', BLOK = 'FCF0C6', BLOKRAND = '8A6400', ROOD = 'B42318';
  const BLADNAMEN = { act: 'Activiteiten', rel: 'Relaties', kp: 'Keuzepunten', sc: "Scenario's", tear: 'Tears', iv: 'Interventies', inst: 'Instellingen' };

  const titel = (t, bron, uitleg) => [[{ v: t, stijl: { vet: true } }], [bron || ''], [uitleg || ''], []];
  const jaNee = b => (b ? 'ja' : 'nee');

  /* ---------- matrix als tabblad ---------- */
  function matrixBlad(m, naam, volg, a, uitleg, bron) {
    const pos = {}; volg.forEach((id, i) => { pos[id] = i; });
    const rel = {}; m.relaties.forEach(r => { rel[r.van + '>' + r.naar] = r; });
    const blokVan = {}, groot = {};
    if (a) a.blokken.forEach(b => b.leden.forEach(id => { blokVan[id] = b.id; if (b.leden.length > 1) groot[b.id] = true; }));
    // grenzen van aaneengesloten iteratieblokken in deze volgorde
    const grens = {};
    if (a) a.blokken.filter(b => b.leden.length > 1).forEach(b => {
      const p = b.leden.map(id => pos[id]).filter(x => x !== undefined).sort((x, y) => x - y);
      if (p.length && p[p.length - 1] - p[0] === p.length - 1) grens[b.id] = [p[0], p[p.length - 1]];
    });
    const rijen = titel(naam, bron, uitleg);
    rijen.push([{ v: 'Blok', stijl: KOP }, { v: 'Nr', stijl: KOPM }, { v: 'ID', stijl: KOP }, { v: 'Activiteit', stijl: KOP }, { v: 'Verantwoordelijke', stijl: KOP }]
      .concat(volg.map((id, j) => ({ v: j + 1, stijl: KOPM }))));
    volg.forEach((r, i) => {
      const act = M.vind(m, r), b = blokVan[r];
      const rij = [{ v: b && groot[b] ? b : '', stijl: Object.assign({}, R, b && groot[b] ? { vulling: BLOK } : {}) }, { v: i + 1, stijl: Object.assign({ midden: true }, R) },
        { v: r, stijl: { rand: true, vet: true } }, { v: act.naam, stijl: R }, { v: act.eigenaar || '', stijl: R }];
      volg.forEach((c, j) => {
        let st = { rand: true, midden: true }, v = '';
        const g = b && grens[b] && blokVan[c] === b ? grens[b] : null;
        if (g) { let d = ''; if (i === g[0]) d += 't'; if (i === g[1]) d += 'b'; if (j === g[0]) d += 'l'; if (j === g[1]) d += 'r'; if (d) { st.dik = d; st.dikKleur = BLOKRAND; } }
        if (r === c) { st.vulling = DIAG; st.kleur = 'FFFFFF'; v = i + 1; }
        else {
          const x = rel[c + '>' + r];
          if (x) {
            const k = SOORTKLEUR[x.soort] || SOORTKLEUR.I;
            st.vulling = k[0]; st.kleur = k[1]; st.vet = true; v = k[2];
            if (j > i) { st.kleur = ROOD; v = (k[2] || '') + '↑'; }
          } else if (g) st.vulling = BLOK;
        }
        rij.push({ v, stijl: st });
      });
      rijen.push(rij);
    });
    rijen.push([], [{ v: 'Legenda', stijl: { vet: true } }],
      [{ v: '', stijl: { vulling: SOORTKLEUR.I[0], rand: true } }, 'Informatie: hier zit een afhankelijkheid'],
      [{ v: 'H', stijl: { vulling: SOORTKLEUR.H[0], kleur: SOORTKLEUR.H[1], vet: true, midden: true, rand: true } }, 'Harde voorwaarde'],
      [{ v: 'B', stijl: { vulling: SOORTKLEUR.B[0], kleur: SOORTKLEUR.B[1], vet: true, midden: true, rand: true } }, 'Bescherming'],
      [{ v: '◆', stijl: { vulling: SOORTKLEUR.V[0], kleur: SOORTKLEUR.V[1], vet: true, midden: true, rand: true } }, 'Voorwaardelijk (keuze)'],
      [{ v: '↑', stijl: { kleur: ROOD, vet: true, midden: true, rand: true } }, 'Rode pijl = terugkoppeling (boven de diagonaal): kans op rework'],
      [{ v: '', stijl: { vulling: BLOK, rand: true, dik: 'tblr', dikKleur: BLOKRAND } }, 'Iteratieblok (dikke goudkleurige rand)'],
      [{ v: '1', stijl: { vulling: DIAG, kleur: 'FFFFFF', midden: true, rand: true } }, 'Diagonaal met volgnummer'],
      ['', 'Rij = ontvanger, kolom = leverancier (kolomnummer = volgnummer in de rij).']);
    return { naam, rijen, kolommen: [6, 5, 7, 34, 18].concat(volg.map(() => 4.2)), bevries: { x: 5, y: 5 }, liggend: true, rijhoogte: 18 };
  }

  /* ---------- werkbestand ---------- */
  function werkbestandBladen(m) {
    const datum = new Date().toLocaleString('nl-NL');
    const a = m.analyse || (m.activiteiten.length ? AN.analyseer(m) : null);
    const actueel = m.analyse && m.analyse.structuurversie === m.structuurversie && m.analyse.instellingenversie === m.instellingenversie;
    const bron = m.naam + ' · invoerversie ' + m.invoerversie + ' · ' + datum;
    const K = DSM.keuze, kps = K ? K.keuzepunten(m) : [];
    const bladen = [];

    /* Toelichting */
    const t = [[{ v: 'Werkbestand DSM', stijl: { vet: true } }], [bron], []];
    t.push([{ v: 'Kleuren van de tabbladen', stijl: { vet: true } }]);
    t.push([{ v: 'grijs', stijl: { vulling: KLEUR.toelichting, kleur: 'FFFFFF', vet: true, midden: true } }, 'Toelichting en instellingen']);
    t.push([{ v: 'groen', stijl: { vulling: KLEUR.invoer, kleur: 'FFFFFF', vet: true, midden: true } }, 'Invoer: Activiteiten, Relaties, Keuzepunten, Scenario\'s, Tears, Interventies. Deze tabbladen worden bij "Openen" weer ingelezen.']);
    t.push([{ v: 'blauw', stijl: { vulling: KLEUR.uitvoer, kleur: 'FFFFFF', vet: true, midden: true } }, 'Uitvoer van de analyse. Wordt bij openen niet gelezen, maar opnieuw berekend.']);
    t.push([], [{ v: 'Werken in Excel', stijl: { vet: true } }],
      ['', 'Je kunt de groene tabbladen in Excel aanvullen of wijzigen en het bestand daarna weer openen in de DSM.'],
      ['', 'Activiteiten: de volgorde van de rijen is de oorspronkelijke procesvolgorde. Een nieuwe activiteit zonder ID krijgt bij openen automatisch een nieuwe ID.'],
      ['', 'Relaties: Ontvanger (rij) heeft iets nodig van Leverancier (kolom). Soort: I = informatie, H = harde voorwaarde, B = bescherming, V = voorwaardelijk (keuze).'],
      ['', 'Keuzepunten: de opties volgen uit de V-relaties; hier vul je alleen de vraag en de naam per optie in.'],
      ['', 'Laat de koprijen en de kolomvolgorde staan; de DSM zoekt de koprij aan de hand van de eerste kolomnaam.'],
      [], [{ v: 'Analyse', stijl: { vet: true } }],
      ['', a ? (actueel ? 'De uitvoer is berekend op invoerversie ' + a.invoerversie + '.' : 'De opgeslagen analyse was verouderd; de uitvoer in dit bestand is opnieuw berekend op invoerversie ' + m.invoerversie + '.') : 'Er zijn nog geen activiteiten, dus er is geen uitvoer.']);
    bladen.push({ naam: 'Toelichting', rijen: t, kolommen: [10, 120], tabKleur: KLEUR.toelichting });

    /* Activiteiten */
    const ac = titel('Activiteiten', bron, 'Volgorde van de rijen = oorspronkelijke procesvolgorde. ID leeg laten bij een nieuwe activiteit.');
    ac.push(['ID', 'Activiteit', 'Verantwoordelijke'].map(v => ({ v, stijl: KOP })));
    m.activiteiten.forEach(x => ac.push([{ v: x.id, stijl: { rand: true, vet: true } }, { v: x.naam, stijl: R }, { v: x.eigenaar || '', stijl: R }]));
    bladen.push({ naam: BLADNAMEN.act, rijen: ac, kolommen: [9, 50, 26], bevries: { y: 5 }, tabKleur: KLEUR.invoer });

    /* Relaties */
    const rl = titel('Relaties', bron, 'Ontvanger heeft iets nodig van Leverancier. Soort: I, H, B of V. Namen staan erbij ter controle; bij openen tellen alleen de ID\'s.');
    rl.push(['Ontvanger (ID)', 'Ontvanger', 'Leverancier (ID)', 'Leverancier', 'Soort', 'Welke informatie is nodig?', 'Zekerheid', 'Frequentie', 'Bron'].map(v => ({ v, stijl: KOP })));
    const p0 = {}; m.activiteiten.forEach((x, i) => { p0[x.id] = i; });
    m.relaties.slice().sort((x, y) => (p0[x.naar] - p0[y.naar]) || (p0[x.van] - p0[y.van])).forEach(r => {
      const k = SOORTKLEUR[r.soort] || SOORTKLEUR.I;
      rl.push([{ v: r.naar, stijl: { rand: true, vet: true } }, { v: (M.vind(m, r.naar) || {}).naam || '', stijl: R }, { v: r.van, stijl: { rand: true, vet: true } }, { v: (M.vind(m, r.van) || {}).naam || '', stijl: R },
        { v: r.soort, stijl: { rand: true, midden: true, vet: true, vulling: k[0], kleur: k[1] } }, { v: r.info || '', stijl: R }, { v: r.zekerheid || '', stijl: R }, { v: r.frequentie || '', stijl: R }, { v: r.bron || '', stijl: R }]);
    });
    bladen.push({ naam: BLADNAMEN.rel, rijen: rl, kolommen: [14, 34, 15, 34, 8, 40, 12, 12, 20], bevries: { y: 5 }, tabKleur: KLEUR.invoer, keuzelijsten: [{ bereik: 'E6:E2000', lijst: ['I', 'H', 'B', 'V'] }] });

    /* Keuzepunten */
    const kb = titel('Keuzepunten', bron, 'De opties volgen uit de V-relaties. Vul hier de vraag en de naam per optie in; de kolommen Activiteiten en Samenkomst zijn ter informatie.');
    kb.push(['Beslisactiviteit (ID)', 'Beslisactiviteit', 'Vraag', 'Optie (ID)', 'Naam van de optie', 'Activiteiten in de optie', 'Samenkomst'].map(v => ({ v, stijl: KOP })));
    kps.forEach(k => k.opties.forEach((o, i) => kb.push([{ v: k.id, stijl: Object.assign({ rand: true, vet: true }, i === 0 ? { randBoven: 'dik' } : {}) }, { v: M.vind(m, k.id).naam, stijl: Object.assign({}, R, i === 0 ? { randBoven: 'dik' } : {}) },
      { v: k.vraag, stijl: Object.assign({}, R, i === 0 ? { randBoven: 'dik' } : {}) }, { v: o.kop, stijl: Object.assign({ rand: true, vet: true, vulling: SOORTKLEUR.V[0] }, i === 0 ? { randBoven: 'dik' } : {}) },
      { v: o.naam, stijl: Object.assign({}, R, i === 0 ? { randBoven: 'dik' } : {}) }, { v: o.leden.join(' → '), stijl: Object.assign({ kleur: '5F5E5A' }, R, i === 0 ? { randBoven: 'dik' } : {}) }, { v: k.samenkomst.join(', '), stijl: Object.assign({ kleur: '5F5E5A' }, R, i === 0 ? { randBoven: 'dik' } : {}) }])));
    if (!kps.length) kb.push(['Geen keuzepunten (geen V-relaties).']);
    bladen.push({ naam: BLADNAMEN.kp, rijen: kb, kolommen: [16, 32, 40, 12, 30, 40, 18], bevries: { y: 5 }, tabKleur: KLEUR.invoer });

    /* Scenario's */
    const sb = titel("Scenario's", bron, 'Gekozen opties als "beslisser=optie", gescheiden door ; (bijv. A002=A006). Leeg = alle opties.');
    sb.push(['ID', 'Naam', 'Kopie van', 'Gekozen opties'].map(v => ({ v, stijl: KOP })));
    (m.scenarios || []).forEach(s => sb.push([{ v: s.id, stijl: { rand: true, vet: true } }, { v: s.naam, stijl: R }, { v: s.kopieVan || '', stijl: R }, { v: Object.keys(s.keuzes || {}).map(x => x + '=' + s.keuzes[x]).join('; '), stijl: R }]));
    bladen.push({ naam: BLADNAMEN.sc, rijen: sb, kolommen: [8, 40, 12, 40], bevries: { y: 5 }, tabKleur: KLEUR.invoer });

    /* Tears */
    const tb = titel('Tears', bron, 'Per scenario de bewust doorbroken terugkoppelingen. Afgestemd (ja/nee) is alleen van belang bij B-relaties.');
    tb.push(['Scenario', 'Leverancier (ID)', 'Ontvanger (ID)', 'Soort', 'Aanname', 'Verantwoordelijke', 'Controle na (ID)', 'Gevolgen als de aanname niet klopt', 'Afgestemd met', 'Afgestemd'].map(v => ({ v, stijl: KOP })));
    (m.scenarios || []).forEach(s => s.tears.forEach(x => { const r = M.vindRelatie(m, x.van, x.naar); tb.push([{ v: s.id, stijl: { rand: true, vet: true } }, { v: x.van, stijl: R }, { v: x.naar, stijl: R }, { v: r ? r.soort : '?', stijl: Object.assign({ midden: true }, R) }, { v: x.aanname, stijl: R }, { v: x.verantwoordelijke || '', stijl: R }, { v: x.controleNa || '', stijl: R }, { v: x.gevolgen || '', stijl: R }, { v: x.afgestemdMet || '', stijl: R }, { v: jaNee(x.afgestemd), stijl: Object.assign({ midden: true }, R) }]); }));
    bladen.push({ naam: BLADNAMEN.tear, rijen: tb, kolommen: [9, 14, 14, 7, 40, 20, 14, 40, 20, 10], bevries: { y: 5 }, tabKleur: KLEUR.invoer, keuzelijsten: [{ bereik: 'J6:J2000', lijst: ['ja', 'nee'] }] });

    /* Interventies */
    const ivb = titel('Interventies', bron, 'Logboek van maatregelen om iteratie en rework te beperken. Betreft: ID\'s gescheiden door ; met "relatie A006 → A004", "blok A004 A005", "keuzepunt A002" of "scenario S1". Datum als jjjj-mm-dd.');
    ivb.push(['ID', 'Datum', 'Maatregel', 'Betreft', 'Wat is aangepast of voorgesteld', 'Reden', 'Overlegd met', 'Status'].map(v => ({ v, stijl: KOP })));
    const SKLEUR = { 'Akkoord': ['E1F5EE', '085041'], 'In afwachting': ['FAEEDA', '633806'], 'Niet akkoord': ['FCEBEB', '791F1F'], 'Vervallen': ['F1EFE8', '5F5E5A'] };
    (m.interventies || []).slice().sort((x, y) => (y.datum || '').localeCompare(x.datum || '') || y.id.localeCompare(x.id)).forEach(iv => ivb.push([{ v: iv.id, stijl: { rand: true, vet: true } }, { v: iv.datum, stijl: R }, { v: iv.maatregel, stijl: R }, { v: M.betreftTekst(m, iv.betreft), stijl: Object.assign({ terugloop: true }, R) },
      { v: iv.wat, stijl: Object.assign({ terugloop: true }, R) }, { v: iv.reden, stijl: Object.assign({ terugloop: true }, R) }, { v: iv.overlegdMet, stijl: R }, { v: iv.status, stijl: { rand: true, vet: true, vulling: SKLEUR[iv.status][0], kleur: SKLEUR[iv.status][1] } }]));
    bladen.push({ naam: BLADNAMEN.iv, rijen: ivb, kolommen: [8, 12, 34, 44, 50, 40, 24, 14], bevries: { y: 5 }, tabKleur: KLEUR.invoer, keuzelijsten: [{ bereik: 'C6:C2000', lijst: M.MAATREGELEN }, { bereik: 'H6:H2000', lijst: M.STATUSSEN }] });

    /* Instellingen */
    const ib = [[{ v: 'Instellingen', stijl: { vet: true } }], [bron], ['Wijzig alleen de waarden in kolom B.'], []];
    ib.push(['Instelling', 'Waarde', 'Toelichting'].map(v => ({ v, stijl: KOP })));
    const iRij = (k, v, u) => ib.push([{ v: k, stijl: { rand: true, vet: true } }, { v, stijl: R }, { v: u || '', stijl: { rand: true, kleur: '5F5E5A' } }]);
    iRij('Modelnaam', m.naam); iRij('Invoerversie', m.invoerversie, 'Telt op bij elke wijziging'); iRij('Structuurversie', m.structuurversie);
    iRij('Volgend activiteitnummer', m.volgendeNummer, 'ID\'s worden nooit opnieuw uitgegeven'); iRij('Vervallen ID\'s', (m.vervallenIds || []).join(' '));
    iRij('Volgend scenarionummer', m.volgendeScenario);
    iRij('Minder terugkoppelingen met wisseling van verantwoordelijke', jaNee(m.instellingen.wisselingVoorkeur), 'ja/nee — doel 3 van de doelvolgorde');
    iRij('Volledig doorzoeken tot en met (activiteiten per blok)', m.instellingen.maxExact, '1 tot en met 9');
    iRij('Tijdlimiet per blok (ms)', m.instellingen.tijdlimietMs);
    bladen.push({ naam: BLADNAMEN.inst, rijen: ib, kolommen: [52, 24, 40], tabKleur: KLEUR.toelichting });

    if (!a) return bladen;

    /* Uitvoer: matrixen */
    bladen.push(Object.assign(matrixBlad(m, 'DSM oorspronkelijk', a.oorspronkelijk.filter(id => M.vind(m, id)), a, 'In de volgorde van de activiteitenlijst.', bron), { tabKleur: KLEUR.uitvoer }));
    bladen.push(Object.assign(matrixBlad(m, 'DSM voorgesteld', a.volgorde.filter(id => M.vind(m, id)), a, 'Voorgestelde volgorde: iteratieblokken (Tarjan) topologisch geordend en binnen elk blok geoptimaliseerd.', bron), { tabKleur: KLEUR.uitvoer }));

    /* Blokken en optimalisatie */
    const bb = titel('Blokken en optimalisatie', bron, 'Per iteratieblok de gevonden volgorde en hoe die is bepaald. Bewezen optimaal = alle volgordes doorzocht.');
    bb.push(['Blok', 'Aantal', 'Volgorde in het blok', 'Uitkomst', 'Methode', 'Toelichting'].map(v => ({ v, stijl: KOP })));
    a.blokken.filter(b => b.leden.length > 1).forEach(b => bb.push([{ v: b.id, stijl: { rand: true, vet: true, vulling: BLOK } }, { v: b.leden.length, stijl: R }, { v: (b.volgorde || b.leden).join(' → '), stijl: R },
      { v: b.bewezen ? 'Optimaal — bewezen' : 'Beste gevonden — niet bewezen', stijl: Object.assign({ vet: true }, R, b.bewezen ? { kleur: '0F6E56' } : { kleur: '854F0B' }) }, { v: b.methode || '', stijl: R }, { v: b.reden || '', stijl: R }]));
    if (!a.aantalIteratieblokken) bb.push(['Geen iteratieblokken: de volgorde is zonder terugkoppelingen te maken.']);
    bladen.push({ naam: 'Blokken', rijen: bb, kolommen: [8, 8, 60, 28, 30, 50], bevries: { y: 5 }, tabKleur: KLEUR.uitvoer });

    /* Vergelijking */
    const mo = a.matenOorspronkelijk, mv = a.matenVoorgesteld;
    const vb = titel('Vergelijking', bron, 'Structurele kengetallen van de oorspronkelijke en de voorgestelde volgorde. Geen uren of doorlooptijd.');
    vb.push(['Kengetal', 'Oorspronkelijk', 'Voorgesteld', 'Verschil'].map(v => ({ v, stijl: KOP })));
    [['Terugkoppelingen', 'terugkoppelingen'], ['… met wisseling van verantwoordelijke', 'metWissel'], ['Totale terugkoppelafstand', 'totaleAfstand'], ['Grootste terugkoppelafstand', 'grootsteAfstand'], ['Harde voorwaarden geschonden', 'hardeSchendingen']]
      .forEach(([l, k]) => vb.push([{ v: l, stijl: R }, { v: mo[k], stijl: R }, { v: mv[k], stijl: { rand: true, vet: true } }, { v: mv[k] - mo[k], stijl: Object.assign({}, R, mv[k] < mo[k] ? { kleur: '0F6E56', vet: true } : mv[k] > mo[k] ? { kleur: ROOD, vet: true } : {}) }]));
    vb.push([{ v: 'Iteratieblokken (≥ 2 activiteiten)', stijl: R }, { v: a.aantalIteratieblokken, stijl: R }, { v: a.aantalIteratieblokken, stijl: R }, { v: '', stijl: R }]);
    vb.push([{ v: 'Activiteiten in grootste blok', stijl: R }, { v: a.grootsteBlok, stijl: R }, { v: a.grootsteBlok, stijl: R }, { v: '', stijl: R }]);
    vb.push([], [{ v: 'Terugkoppelingen in de voorgestelde volgorde', stijl: { vet: true } }]);
    vb.push(['Ontvanger', 'Leverancier', 'Soort', 'Afstand'].map(v => ({ v, stijl: KOP })));
    (mv.lijst || []).forEach(x => { const r = M.vindRelatie(m, x.van, x.naar); vb.push([{ v: x.naar + ' ' + ((M.vind(m, x.naar) || {}).naam || ''), stijl: R }, { v: x.van + ' ' + ((M.vind(m, x.van) || {}).naam || ''), stijl: R }, { v: r ? r.soort : '', stijl: Object.assign({ midden: true }, R) }, { v: x.afstand, stijl: R }]); });
    bladen.push({ naam: 'Vergelijking', rijen: vb, kolommen: [44, 40, 14, 12], bevries: { y: 5 }, tabKleur: KLEUR.uitvoer });

    /* Parallel */
    const alt = K ? K.lidmaatschap(m) : {};
    const blokLeden = {}; a.blokken.forEach(b => { blokLeden[b.id] = b.leden; });
    const pb = titel('Parallelle mogelijkheden', bron, 'Activiteiten of blokken op hetzelfde niveau hangen niet (direct of indirect) van elkaar af. ◆ = alternatief van een keuzepunt: niet tegelijk.');
    pb.push(['Niveau', 'Blok', 'Activiteit(en)', 'Alternatief'].map(v => ({ v, stijl: KOP })));
    a.niveaus.forEach((n, ni) => n.blokken.forEach((b, bi) => { const l = blokLeden[b] || []; pb.push([{ v: n.niveau, stijl: Object.assign({ rand: true, vet: bi === 0 }, bi === 0 && ni > 0 ? { randBoven: 'dik' } : {}) }, { v: l.length > 1 ? b : '', stijl: Object.assign({}, R, bi === 0 && ni > 0 ? { randBoven: 'dik' } : {}) }, { v: l.map(id => id + ' ' + ((M.vind(m, id) || {}).naam || '')).join('; '), stijl: Object.assign({}, R, bi === 0 && ni > 0 ? { randBoven: 'dik' } : {}) }, { v: l.length === 1 && alt[l[0]] ? alt[l[0]].map(x => '◆ ' + x.kp + ' optie ' + x.nr + ' (' + x.naam + ')').join('; ') : '', stijl: Object.assign({ kleur: SOORTKLEUR.V[1] }, R, bi === 0 && ni > 0 ? { randBoven: 'dik' } : {}) }]); }));
    bladen.push({ naam: 'Parallel', rijen: pb, kolommen: [8, 8, 70, 40], bevries: { y: 5 }, tabKleur: KLEUR.uitvoer });

    /* Scenariovergelijking */
    if ((m.scenarios || []).length) {
      const SC = DSM.scenario;
      const sv = titel('Scenariovergelijking', bron, 'De basis (DSM analyse zonder tears) naast elk scenario.');
      sv.push([{ v: 'Kengetal', stijl: KOP }, { v: 'Basis', stijl: KOP }].concat(m.scenarios.map(s => ({ v: s.id + ' ' + s.naam, stijl: KOP }))));
      const z = m.scenarios.map(s => { if (!s.analyse) SC.bereken(m, s); return SC.samenvatting(m, s); });
      const rij = (l, b, f) => sv.push([{ v: l, stijl: R }, { v: b, stijl: R }].concat(z.map(x => ({ v: f(x), stijl: R }))));
      rij('Tears', 0, x => x.tears); rij('Terugkoppelingen', mv.terugkoppelingen, x => x.terugkoppelingen); rij('… met wisseling van verantwoordelijke', mv.metWissel, x => x.metWissel);
      rij('Totale terugkoppelafstand', mv.totaleAfstand, x => x.totaleAfstand); rij('Iteratieblokken', a.aantalIteratieblokken, x => x.blokken); rij('Activiteiten in grootste blok', a.grootsteBlok, x => x.grootsteBlok);
      rij('Gekozen opties', '—', x => x.keuzes ? x.keuzes + ' (' + x.weggevallen + ' activiteit(en) vervallen)' : '—'); rij('B-tears niet afgestemd', '—', x => x.bOpen); rij('Controlemomenten vastgelegd', '—', x => x.controles);
      sv.push([{ v: 'Volgorde', stijl: { rand: true, vet: true } }, { v: a.volgorde.join(' '), stijl: R }].concat(z.map(x => ({ v: x.volgorde.join(' '), stijl: R }))));
      bladen.push({ naam: 'Scenariovergelijking', rijen: sv, kolommen: [36, 30].concat(m.scenarios.map(() => 30)), bevries: { x: 1, y: 5 }, tabKleur: KLEUR.uitvoer });
    }
    return bladen;
  }

  /* ---------- openen ---------- */
  const tekst = v => (v === null || v === undefined ? '' : String(v).trim());
  function zoekKop(rijen, eerste) {
    for (let i = 0; i < Math.min(rijen.length, 15); i++) if (tekst((rijen[i] || [])[0]).toLowerCase() === eerste.toLowerCase()) return i;
    return -1;
  }
  function onderKop(rijen, eerste) {
    const k = zoekKop(rijen || [], eerste); if (k < 0) return null;
    return rijen.slice(k + 1).filter(r => r && r.some(c => tekst(c) !== ''));
  }

  async function leesWerkbestand(buffer, bestandsnaam) {
    const wb = await DSM.xlsxLezen.lees(buffer);
    const fouten = [], bron = bestandsnaam || 'Werkbestand';
    const blad = async n => wb.blad(n);
    const ac = onderKop(await blad(BLADNAMEN.act), 'ID');
    if (!ac) { fouten.push({ bron, melding: 'Het tabblad "Activiteiten" (met kolom ID) ontbreekt.', herstel: 'Open een werkbestand dat met "Opslaan" uit de DSM is gemaakt.' }); return { fouten }; }
    const inst = {};
    (onderKop(await blad(BLADNAMEN.inst), 'Instelling') || []).forEach(r => { inst[tekst(r[0])] = r[1]; });
    const m = M.leegModel();
    m.naam = tekst(inst['Modelnaam']) || (bestandsnaam || 'Model').replace(/\.xlsx$/i, '');
    m.invoerversie = Number(inst['Invoerversie']) || 0; m.structuurversie = Number(inst['Structuurversie']) || 0;
    m.volgendeNummer = Number(inst['Volgend activiteitnummer']) || 1;
    m.vervallenIds = tekst(inst["Vervallen ID's"]).split(/[\s,;]+/).filter(Boolean);
    m.volgendeScenario = Number(inst['Volgend scenarionummer']) || 1;
    const wv = tekst(inst['Minder terugkoppelingen met wisseling van verantwoordelijke']).toLowerCase();
    if (wv) m.instellingen.wisselingVoorkeur = wv !== 'nee';
    const mx = Number(inst['Volledig doorzoeken tot en met (activiteiten per blok)']); if (mx >= 1 && mx <= 9) m.instellingen.maxExact = mx;
    const tl = Number(inst['Tijdlimiet per blok (ms)']); if (tl > 0) m.instellingen.tijdlimietMs = tl;

    /* activiteiten: eerst de bekende ID's, daarna nieuwe regels zonder ID een nieuwe ID geven */
    const gezien = new Set(), nieuw = [];
    ac.forEach((r, i) => {
      const id = tekst(r[0]).toUpperCase(), naam = tekst(r[1]), eig = tekst(r[2]);
      const plek = bron + ', Activiteiten rij ' + (i + 6);
      if (!naam) { fouten.push({ bron: plek, melding: 'Activiteit zonder naam.', herstel: 'Vul een naam in of verwijder de regel.' }); return; }
      if (id) {
        if (!/^A\d+$/.test(id)) { fouten.push({ bron: plek, melding: 'Ongeldige ID "' + id + '".', herstel: 'Gebruik de vorm A001, of laat de ID leeg voor een nieuwe activiteit.' }); return; }
        if (gezien.has(id)) { fouten.push({ bron: plek, melding: 'ID ' + id + ' komt dubbel voor.', herstel: 'Geef elke activiteit een eigen ID; laat de ID leeg voor een nieuwe.' }); return; }
        gezien.add(id); m.activiteiten.push({ id, naam, eigenaar: eig });
      } else { const x = { id: null, naam, eigenaar: eig }; m.activiteiten.push(x); nieuw.push(x); }
    });
    const maxNr = m.activiteiten.reduce((x, a) => Math.max(x, a.id ? parseInt(a.id.slice(1), 10) : 0), 0);
    const maxV = m.vervallenIds.reduce((x, id) => Math.max(x, parseInt(id.slice(1), 10) || 0), 0);
    m.volgendeNummer = Math.max(m.volgendeNummer, maxNr + 1, maxV + 1);
    nieuw.forEach(x => { x.id = 'A' + String(m.volgendeNummer++).padStart(3, '0'); });

    const bestaat = id => m.activiteiten.some(a => a.id === id);
    (onderKop(await blad(BLADNAMEN.rel), 'Ontvanger (ID)') || []).forEach((r, i) => {
      const naar = tekst(r[0]).toUpperCase(), van = tekst(r[2]).toUpperCase(), soort = tekst(r[4]).toUpperCase() || 'I';
      const plek = bron + ', Relaties rij ' + (i + 6);
      if (!bestaat(naar) || !bestaat(van)) { fouten.push({ bron: plek, melding: 'Relatie ' + van + ' → ' + naar + ' verwijst naar een onbekende activiteit.', herstel: 'Controleer de ID\'s op het tabblad Activiteiten.' }); return; }
      if (van === naar) { fouten.push({ bron: plek, melding: 'Relatie van een activiteit met zichzelf (' + van + ').', herstel: 'Verwijder deze regel.' }); return; }
      if (!['I', 'H', 'B', 'V', 'A'].includes(soort)) { fouten.push({ bron: plek, melding: 'Onbekende soort "' + soort + '".', herstel: 'Gebruik I, H, B of V.' }); return; }
      if (m.relaties.some(x => x.van === van && x.naar === naar)) { fouten.push({ bron: plek, melding: 'Relatie ' + van + ' → ' + naar + ' staat er dubbel in.', herstel: 'Laat één regel staan.' }); return; }
      m.relaties.push({ van, naar, soort: soort === 'A' ? 'I' : soort, info: tekst(r[5]), zekerheid: tekst(r[6]), frequentie: tekst(r[7]), bron: tekst(r[8]) });
    });

    (onderKop(await blad(BLADNAMEN.kp), 'Beslisactiviteit (ID)') || []).forEach(r => {
      const a = tekst(r[0]).toUpperCase(); if (!bestaat(a)) return;
      const md = m.keuzepunten[a] = m.keuzepunten[a] || { vraag: '', namen: {} };
      if (tekst(r[2])) md.vraag = tekst(r[2]);
      const kop = tekst(r[3]).toUpperCase(), on = tekst(r[4]);
      if (kop && on && bestaat(kop) && on !== (M.vind(m, kop) || {}).naam) md.namen[kop] = on;
    });

    (onderKop(await blad(BLADNAMEN.sc), 'ID') || []).forEach((r, i) => {
      const id = tekst(r[0]).toUpperCase();
      if (!/^S\d+$/.test(id)) { fouten.push({ bron: bron + ", Scenario's rij " + (i + 6), melding: 'Ongeldige scenario-ID "' + id + '".', herstel: 'Gebruik de vorm S1.' }); return; }
      const keuzes = {};
      tekst(r[3]).split(';').map(x => x.trim()).filter(Boolean).forEach(x => { const [b, o] = x.split('=').map(y => y.trim().toUpperCase()); if (bestaat(b) && bestaat(o)) keuzes[b] = o; });
      m.scenarios.push({ id, naam: tekst(r[1]) || id, kopieVan: tekst(r[2]).toUpperCase(), tears: [], keuzes, analyse: null });
    });
    m.volgendeScenario = Math.max(m.volgendeScenario, m.scenarios.reduce((x, s) => Math.max(x, parseInt(s.id.slice(1), 10)), 0) + 1);

    (onderKop(await blad(BLADNAMEN.tear), 'Scenario') || []).forEach((r, i) => {
      const s = m.scenarios.find(x => x.id === tekst(r[0]).toUpperCase());
      const plek = bron + ', Tears rij ' + (i + 6);
      if (!s) { fouten.push({ bron: plek, melding: 'Tear bij onbekend scenario "' + tekst(r[0]) + '".', herstel: 'Zet het scenario eerst op het tabblad Scenario\'s.' }); return; }
      s.tears.push({ van: tekst(r[1]).toUpperCase(), naar: tekst(r[2]).toUpperCase(), aanname: tekst(r[4]), verantwoordelijke: tekst(r[5]), controleNa: tekst(r[6]).toUpperCase(), gevolgen: tekst(r[7]), afgestemdMet: tekst(r[8]), afgestemd: tekst(r[9]).toLowerCase() === 'ja' });
    });

    (onderKop(await blad(BLADNAMEN.iv), 'ID') || []).forEach((r, i) => {
      const plek = bron + ', Interventies rij ' + (i + 6);
      let datum = r[1];
      if (typeof datum === 'number') { const d = new Date(Math.round((datum - 25569) * 86400000)); datum = d.toISOString().slice(0, 10); }
      datum = tekst(datum); const dm = datum.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/); if (dm) datum = dm[3] + '-' + dm[2].padStart(2, '0') + '-' + dm[1].padStart(2, '0');
      const wat = tekst(r[4]);
      if (!wat) { fouten.push({ bron: plek, melding: 'Interventie zonder beschrijving.', herstel: 'Vul "Wat is aangepast of voorgesteld" in of verwijder de regel.' }); return; }
      const maatregel = M.MAATREGELEN.find(x => x.replace(/,/g, '').toLowerCase() === tekst(r[2]).replace(/,/g, '').toLowerCase()) || (tekst(r[2]) ? 'Anders' : '');
      const id = /^I\d+$/i.test(tekst(r[0])) ? tekst(r[0]).toUpperCase() : null;
      const iv = M.schoonInterventie({ id, datum, maatregel, betreft: M.leesBetreft(tekst(r[3])), wat, reden: tekst(r[5]), overlegdMet: tekst(r[6]), status: M.STATUSSEN.find(x => x.toLowerCase() === tekst(r[7]).toLowerCase()) || 'In afwachting' });
      if (!iv.id || m.interventies.some(x => x.id === iv.id)) { const nr = m.interventies.reduce((x, y) => Math.max(x, parseInt(y.id.slice(1), 10) || 0), 0) + 1; iv.id = 'I' + String(nr).padStart(3, '0'); }
      m.interventies.push(iv);
    });

    m.invoerversie++;
    m.structuurversie++;
    return { fouten, model: M.normaliseer(m) };
  }

  DSM.excelio = { werkbestandBladen, leesWerkbestand, matrixBlad };
})(typeof window !== 'undefined' ? window : globalThis);
