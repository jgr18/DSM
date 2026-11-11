/* DSM-werkbank — procesanalyse.
   Betekenis: relatie van → naar = "naar heeft informatie van van nodig"; van moet dus vóór naar staan.
   1. Iteratieblokken: sterk samenhangende componenten (Tarjan). Zelfiteraties worden apart geteld.
   2. Blokken topologisch geordend; bij keuze gaat het blok met de laagste ID voor.
   3. Binnen elk blok een volgorde met deze doelvolgorde:
      harde voorwaarden respecteren → minder terugkoppelingen → (optioneel) minder terugkoppelingen
      met wisseling van verantwoordelijke → kleinere totale terugkoppelafstand → laagste-ID-volgorde.
   Omdat blokken aaneengesloten en topologisch staan, ontstaan terugkoppelingen alleen binnen blokken;
   is elk blok exact doorzocht, dan is de totale volgorde bewezen optimaal voor deze doelvolgorde. */
(function (root) {
  'use strict';
  const DSM = root.DSM = root.DSM || {};

  const cmpId = (a, b) => (a < b ? -1 : a > b ? 1 : 0);

  function opvolgers(ids, relaties, filter) {
    const opv = {}; ids.forEach(id => { opv[id] = []; });
    relaties.forEach(r => {
      if (r.van !== r.naar && opv[r.van] && opv[r.naar] && (!filter || filter(r))) opv[r.van].push(r.naar);
    });
    Object.keys(opv).forEach(k => opv[k].sort(cmpId));
    return opv;
  }

  /* Tarjan, iteratief (geen recursiediepte-probleem bij grote modellen). */
  function tarjan(ids, opv) {
    let teller = 0;
    const index = {}, laag = {}, opStapel = {}, stapel = [], comps = [];
    for (const start of ids) {
      if (index[start] !== undefined) continue;
      index[start] = laag[start] = teller++; stapel.push(start); opStapel[start] = true;
      const werk = [[start, 0]];
      while (werk.length) {
        const top = werk[werk.length - 1], v = top[0], buren = opv[v];
        if (top[1] < buren.length) {
          const w = buren[top[1]++];
          if (index[w] === undefined) { index[w] = laag[w] = teller++; stapel.push(w); opStapel[w] = true; werk.push([w, 0]); }
          else if (opStapel[w]) laag[v] = Math.min(laag[v], index[w]);
        } else {
          werk.pop();
          if (werk.length) { const u = werk[werk.length - 1][0]; laag[u] = Math.min(laag[u], laag[v]); }
          if (laag[v] === index[v]) {
            const comp = []; let w;
            do { w = stapel.pop(); opStapel[w] = false; comp.push(w); } while (w !== v);
            comps.push(comp.sort(cmpId));
          }
        }
      }
    }
    return comps;
  }

  function vergelijkSleutel(a, b) {
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
    return 0;
  }
  function vergelijkVolgorde(a, b) {
    for (let i = 0; i < a.length; i++) { const c = cmpId(a[i], b[i]); if (c) return c; }
    return 0;
  }

  function kostenBinnen(volg, intern, eigenaar, voorkeur) {
    const pos = {}; volg.forEach((id, i) => { pos[id] = i; });
    let hard = 0, fb = 0, wissel = 0, afstand = 0;
    for (const r of intern) {
      const d = pos[r.van] - pos[r.naar];
      if (d > 0) {
        fb++; afstand += d;
        if (r.soort === 'H') hard++;
        if ((eigenaar[r.van] || '') !== (eigenaar[r.naar] || '')) wissel++;
      }
    }
    return { sleutel: voorkeur ? [hard, fb, wissel, afstand] : [hard, fb, afstand], hard, fb, wissel, afstand };
  }

  function beter(kA, volgA, kB, volgB) {
    const c = vergelijkSleutel(kA.sleutel, kB.sleutel);
    return c < 0 || (c === 0 && vergelijkVolgorde(volgA, volgB) < 0);
  }

  /* Exact: alle volgordes in lexicografische ID-volgorde; vervangen alleen bij strikt beter,
     zodat bij gelijkstand automatisch de laagste-ID-volgorde overblijft. */
  function exact(leden, intern, eigenaar, voorkeur) {
    const n = leden.length, gebruikt = new Array(n).fill(false), huidig = [];
    let best = null, bestK = null, onderzocht = 0;
    (function stap() {
      if (huidig.length === n) {
        onderzocht++;
        const k = kostenBinnen(huidig, intern, eigenaar, voorkeur);
        if (!best || vergelijkSleutel(k.sleutel, bestK.sleutel) < 0) { best = huidig.slice(); bestK = k; }
        return;
      }
      for (let i = 0; i < n; i++) {
        if (gebruikt[i]) continue;
        gebruikt[i] = true; huidig.push(leden[i]); stap(); huidig.pop(); gebruikt[i] = false;
      }
    })();
    return { volgorde: best, kosten: bestK, bewezen: true, methode: 'Volledige enumeratie', onderzocht, reden: 'Alle ' + onderzocht + ' volgordes onderzocht' };
  }

  /* Heuristisch: gulzige start + lokaal verplaatsen tot geen verbetering of tijdlimiet. */
  function heuristisch(leden, intern, eigenaar, voorkeur, tijdlimietMs) {
    const start = Date.now();
    const rest = leden.slice(), volg = [];
    while (rest.length) {
      let keus = null, keusScore = null;
      for (const id of rest) {
        let hardIn = 0, inn = 0;
        for (const r of intern) if (r.naar === id && rest.includes(r.van)) { inn++; if (r.soort === 'H') hardIn++; }
        const score = [hardIn, inn];
        if (!keus || score[0] < keusScore[0] || (score[0] === keusScore[0] && (score[1] < keusScore[1] || (score[1] === keusScore[1] && id < keus)))) { keus = id; keusScore = score; }
      }
      volg.push(keus); rest.splice(rest.indexOf(keus), 1);
    }
    let best = volg, bestK = kostenBinnen(best, intern, eigenaar, voorkeur), onderzocht = 1, verbeterd = true, reden = 'Geen verbetering meer gevonden door verplaatsen (lokaal optimum)';
    while (verbeterd) {
      verbeterd = false;
      for (let i = 0; i < best.length && !verbeterd; i++) {
        for (let j = 0; j < best.length; j++) {
          if (i === j) continue;
          const kand = best.slice(); const [x] = kand.splice(i, 1); kand.splice(j, 0, x);
          const k = kostenBinnen(kand, intern, eigenaar, voorkeur); onderzocht++;
          if (beter(k, kand, bestK, best)) { best = kand; bestK = k; verbeterd = true; break; }
        }
        if (Date.now() - start > tijdlimietMs) { reden = 'Tijdlimiet van ' + Math.round(tijdlimietMs / 1000) + ' s bereikt'; verbeterd = false; break; }
      }
    }
    return { volgorde: best, kosten: bestK, bewezen: false, methode: 'Gulzige start + lokaal verplaatsen', onderzocht, reden };
  }

  function maten(model, volgorde) {
    const pos = {}; volgorde.forEach((id, i) => { pos[id] = i; });
    const eig = {}; model.activiteiten.forEach(a => { eig[a.id] = a.eigenaar || ''; });
    const lijst = [];
    let hard = 0, wissel = 0, afstand = 0, max = 0;
    model.relaties.forEach(r => {
      if (r.van === r.naar || pos[r.van] === undefined || pos[r.naar] === undefined) return;
      const d = pos[r.van] - pos[r.naar];
      if (d > 0) {
        const w = eig[r.van] !== eig[r.naar];
        lijst.push({ van: r.van, naar: r.naar, soort: r.soort, afstand: d, wissel: w });
        afstand += d; if (d > max) max = d; if (w) wissel++; if (r.soort === 'H') hard++;
      }
    });
    return { terugkoppelingen: lijst.length, metWissel: wissel, totaleAfstand: afstand, grootsteAfstand: max, hardeSchendingen: hard, lijst };
  }

  function analyseer(model) {
    const t0 = Date.now();
    const inst = model.instellingen;
    const ids = model.activiteiten.map(a => a.id);
    const eig = {}; model.activiteiten.forEach(a => { eig[a.id] = a.eigenaar || ''; });
    const opv = opvolgers(ids, model.relaties);
    const comps = tarjan(ids, opv);

    const blokVan = {};
    comps.forEach((c, i) => c.forEach(id => { blokVan[id] = i; }));
    const blokOpv = comps.map(() => new Set()), inGraad = comps.map(() => 0);
    model.relaties.forEach(r => {
      const a = blokVan[r.van], b = blokVan[r.naar];
      if (a === undefined || b === undefined || a === b || blokOpv[a].has(b)) return;
      blokOpv[a].add(b); inGraad[b]++;
    });
    const klaar = []; comps.forEach((c, i) => { if (!inGraad[i]) klaar.push(i); });
    const topo = [], niveau = comps.map(() => 1);
    while (klaar.length) {
      klaar.sort((x, y) => cmpId(comps[x][0], comps[y][0]));
      const b = klaar.shift(); topo.push(b);
      blokOpv[b].forEach(n => { niveau[n] = Math.max(niveau[n], niveau[b] + 1); if (--inGraad[n] === 0) klaar.push(n); });
    }

    const blokken = [], volgorde = [], tegenspraken = [];
    topo.forEach((ci, nr) => {
      const leden = comps[ci];
      const blok = { id: 'B' + (nr + 1), leden, niveau: niveau[ci], zelfiteratie: leden.length === 1 && model.zelfiteraties.includes(leden[0]) };
      if (leden.length > 1) {
        const set = new Set(leden);
        const intern = model.relaties.filter(r => set.has(r.van) && set.has(r.naar) && r.van !== r.naar);
        const res = leden.length <= inst.maxExact ? exact(leden, intern, eig, inst.wisselingVoorkeur) : heuristisch(leden, intern, eig, inst.wisselingVoorkeur, inst.tijdlimietMs);
        Object.assign(blok, { volgorde: res.volgorde, methode: res.methode, bewezen: res.bewezen, onderzocht: res.onderzocht, reden: res.reden });
        const hardOpv = opvolgers(leden, intern, r => r.soort === 'H');
        tarjan(leden, hardOpv).filter(c => c.length > 1).forEach(c => tegenspraken.push({ blok: blok.id, leden: c }));
        blok.zelfiteraties = leden.filter(id => model.zelfiteraties.includes(id));
        volgorde.push(...res.volgorde);
      } else {
        blok.volgorde = leden.slice(); blok.bewezen = true; blok.methode = '—';
        volgorde.push(leden[0]);
      }
      blokken.push(blok);
    });

    const perNiveau = {};
    blokken.forEach(b => { (perNiveau[b.niveau] = perNiveau[b.niveau] || []).push(b.id); });
    const niveaus = Object.keys(perNiveau).map(Number).sort((a, b) => a - b).map(n => ({ niveau: n, blokken: perNiveau[n] }));

    const groot = blokken.filter(b => b.leden.length > 1);
    return {
      invoerversie: model.invoerversie,
      structuurversie: model.structuurversie,
      instellingenversie: model.instellingenversie,
      instellingen: Object.assign({}, inst),
      tijdstip: new Date().toISOString(),
      rekentijdMs: Date.now() - t0,
      oorspronkelijk: ids.slice(),
      volgorde,
      blokken,
      niveaus,
      tegenspraken,
      bewezen: groot.every(b => b.bewezen),
      matenOorspronkelijk: maten(model, ids),
      matenVoorgesteld: maten(model, volgorde),
      aantalIteratieblokken: groot.length,
      grootsteBlok: blokken.reduce((x, b) => Math.max(x, b.leden.length), 0),
      aantalZelfiteraties: model.zelfiteraties.filter(id => ids.includes(id)).length
    };
  }

  /* Wie raakt mogelijk een wijziging in activiteit id? Alleen langs de relaties. */
  function impact(model, id) {
    const ids = model.activiteiten.map(a => a.id);
    const opv = opvolgers(ids, model.relaties);
    const direct = (opv[id] || []).slice();
    const gezien = new Set([id, ...direct]), via = {}, rij = direct.slice(), indirect = [];
    while (rij.length) {
      const v = rij.shift();
      opv[v].forEach(w => { if (!gezien.has(w)) { gezien.add(w); via[w] = v; indirect.push(w); rij.push(w); } });
    }
    return { direct, indirect: indirect.map(w => ({ id: w, via: via[w] })) };
  }

  DSM.analyse = { tarjan, opvolgers, analyseer, maten, impact };
})(typeof window !== 'undefined' ? window : globalThis);
