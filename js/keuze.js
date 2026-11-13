/* DSM — voorwaardelijke relaties (◆, soort V) en keuzepunten.
   - Alle ◆-relaties die uit dezelfde activiteit vertrekken, vormen één keuzepunt; die activiteit neemt het besluit.
   - Elke ◆ is een optie; precies één optie wordt uitgevoerd. Er kunnen 2 of meer opties zijn.
   - Welke activiteiten bij een optie horen, leidt de DSM af uit de relaties: een activiteit hoort bij een optie
     als ze alleen via die optie bereikbaar is. Wat via twee of meer opties bereikbaar is, is gemeenschappelijk;
     de eerste gemeenschappelijke activiteiten zijn de samenkomst.
   - Activiteiten waar de beslisactiviteit zelf (direct of indirect) van afhangt en die vóór haar in de lijst staan,
     horen nooit bij een optie. */
(function (root) {
  'use strict';
  const DSM = root.DSM;
  const M = DSM.model;

  function meta(m, a) {
    if (!m.keuzepunten || typeof m.keuzepunten !== 'object') m.keuzepunten = {};
    if (!m.keuzepunten[a]) m.keuzepunten[a] = { vraag: '', namen: {} };
    if (!m.keuzepunten[a].namen) m.keuzepunten[a].namen = {};
    return m.keuzepunten[a];
  }
  const volgnr = m => { const p = {}; m.activiteiten.forEach((a, i) => { p[a.id] = i; }); return p; };

  /* Alle keuzepunten met opties, leden, samenkomst en meldingen. */
  function keuzepunten(m) {
    const pos = volgnr(m), uit = {}, inn = {};
    m.activiteiten.forEach(a => { uit[a.id] = []; inn[a.id] = []; });
    m.relaties.forEach(r => { if (uit[r.van] && inn[r.naar]) { uit[r.van].push(r.naar); inn[r.naar].push(r.van); } });
    const beslissers = [...new Set(m.relaties.filter(r => r.soort === 'V' && uit[r.van]).map(r => r.van))].sort((x, y) => pos[x] - pos[y]);
    return beslissers.map(a => {
      const koppen = m.relaties.filter(r => r.van === a && r.soort === 'V' && inn[r.naar]).map(r => r.naar).sort((x, y) => pos[x] - pos[y]);
      // voorgangers van a (waar a van afhangt): nooit lid van een optie
      // Voorgangers van a die vóór a in de lijst staan (de oorspronkelijke procesvolgorde) horen nooit bij een optie.
      const anc = new Set([a]), st = [a];
      while (st.length) { const x = st.pop(); inn[x].forEach(v => { if (!anc.has(v)) { anc.add(v); st.push(v); } }); }
      const voor = new Set([...anc].filter(x => x === a || pos[x] < pos[a]));
      const bereik = {};
      koppen.forEach(k => {
        const z = new Set(), s = [];
        if (!voor.has(k)) { z.add(k); s.push(k); }
        while (s.length) { const x = s.pop(); uit[x].forEach(n => { if (!voor.has(n) && !z.has(n)) { z.add(n); s.push(n); } }); }
        bereik[k] = z;
      });
      const teller = {};
      koppen.forEach(k => bereik[k].forEach(x => { teller[x] = (teller[x] || 0) + 1; }));
      const md = meta(m, a), meldingen = [];
      const opties = koppen.map((k, i) => ({
        nr: i + 1, kop: k, naam: md.namen[k] || M.vind(m, k).naam,
        leden: [...bereik[k]].filter(x => teller[x] === 1).sort((x, y) => pos[x] - pos[y])
      }));
      const lid = {}; opties.forEach(o => o.leden.forEach(x => { lid[x] = o.kop; }));
      const gemeen = Object.keys(teller).filter(x => teller[x] > 1);
      const samenkomst = gemeen.filter(x => inn[x].some(v => lid[v])).sort((x, y) => pos[x] - pos[y]);
      if (koppen.length < 2) meldingen.push({ soort: 'let', bron: 'Keuzepunt ' + a, melding: 'Keuzepunt met maar één optie: er valt niets te kiezen.', herstel: 'Leg een tweede ◆-relatie vast vanuit ' + a + ', of maak van deze relatie een gewone relatie.' });
      opties.forEach(o => { if (!o.leden.includes(o.kop)) meldingen.push({ soort: 'let', bron: 'Keuzepunt ' + a + ', optie ' + o.kop, melding: o.kop + ' is ook via een andere optie bereikbaar, of ' + a + ' hangt er zelf van af.', herstel: 'Controleer de relaties van ' + o.kop + '.' }); });
      return { id: a, vraag: md.vraag || '', opties, samenkomst, lid, meldingen };
    });
  }

  /* Bij welk keuzepunt en welke optie hoort een activiteit? { id → [{kp, optie}] } */
  function lidmaatschap(m) {
    const uitk = {};
    keuzepunten(m).forEach(k => k.opties.forEach(o => o.leden.forEach(x => { (uitk[x] = uitk[x] || []).push({ kp: k.id, nr: o.nr, naam: o.naam }); })));
    return uitk;
  }

  /* Activiteiten die wegvallen als per keuzepunt een optie is gekozen. keuzes = { beslisser: kop } */
  function uitgesloten(m, keuzes) {
    const weg = new Set();
    if (!keuzes) return weg;
    keuzepunten(m).forEach(k => {
      const gekozen = keuzes[k.id]; if (!gekozen || !k.opties.some(o => o.kop === gekozen)) return;
      k.opties.filter(o => o.kop !== gekozen).forEach(o => o.leden.forEach(x => weg.add(x)));
    });
    return weg;
  }

  function zetVraag(m, a, tekst) { meta(m, a).vraag = (tekst || '').trim(); m.invoerversie++; }
  function zetOptieNaam(m, a, kop, tekst) { const md = meta(m, a); const t = (tekst || '').trim(); if (t) md.namen[kop] = t; else delete md.namen[kop]; m.invoerversie++; }

  DSM.keuze = { keuzepunten, lidmaatschap, uitgesloten, zetVraag, zetOptieNaam };
})(typeof window !== 'undefined' ? window : globalThis);
