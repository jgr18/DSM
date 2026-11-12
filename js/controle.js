/* DSM-werkbank — controlevoorbeelden. Draai via controle.html; elke controle meldt geslaagd of niet. */
(function (root) {
  'use strict';
  const DSM = root.DSM;
  const M = DSM.model, A = DSM.analyse;

  function bouw(namen, relaties, zelf) {
    const m = M.leegModel();
    M.plakActiviteiten(m, namen.join('\n'));
    (relaties || []).forEach(r => M.zetRelatie(m, r[0], r[1], r[2] || 'I'));
    (zelf || []).forEach(id => M.wisselZelfiteratie(m, id));
    return m;
  }
  const blokLeden = res => res.blokken.map(b => b.leden.join(' '));
  const gelijk = (a, b) => JSON.stringify(a) === JSON.stringify(b);

  const controles = [
    {
      naam: 'Keten zonder cycli',
      uitleg: 'A001 → A002 → A003: drie losse blokken, volgorde blijft, geen terugkoppelingen.',
      test() {
        const r = A.analyseer(bouw(['a', 'b', 'c'], [['A001', 'A002'], ['A002', 'A003']]));
        return { ok: gelijk(r.volgorde, ['A001', 'A002', 'A003']) && r.matenVoorgesteld.terugkoppelingen === 0 && r.aantalIteratieblokken === 0, detail: r.volgorde.join(' ') };
      }
    },
    {
      naam: 'Omgekeerd ingevoerde keten',
      uitleg: 'Invoer A001..A003, maar A003 levert aan A002 en A002 aan A001: de voorgestelde volgorde draait om.',
      test() {
        const r = A.analyseer(bouw(['a', 'b', 'c'], [['A003', 'A002'], ['A002', 'A001']]));
        return { ok: gelijk(r.volgorde, ['A003', 'A002', 'A001']) && r.matenOorspronkelijk.terugkoppelingen === 2 && r.matenVoorgesteld.terugkoppelingen === 0, detail: r.volgorde.join(' ') };
      }
    },
    {
      naam: 'Cyclus wordt één iteratieblok',
      uitleg: 'A001 ↔ A002 vormt een blok; A003 staat erna.',
      test() {
        const r = A.analyseer(bouw(['a', 'b', 'c'], [['A001', 'A002'], ['A002', 'A001'], ['A002', 'A003']]));
        return { ok: gelijk(blokLeden(r), ['A001 A002', 'A003']) && r.matenVoorgesteld.terugkoppelingen === 1, detail: blokLeden(r).join(' | ') };
      }
    },
    {
      naam: 'Losse blokken op ID geordend',
      uitleg: 'Zonder relaties blijft elke activiteit een eigen blok, op volgorde van ID.',
      test() {
        const m = bouw(['a', 'b', 'c']); M.verplaatsActiviteit(m, 'A003', -1); M.verplaatsActiviteit(m, 'A003', -1);
        const r = A.analyseer(m);
        return { ok: gelijk(r.volgorde, ['A001', 'A002', 'A003']) && r.blokken.length === 3, detail: 'invoer ' + r.oorspronkelijk.join(' ') + ' → ' + r.volgorde.join(' ') };
      }
    },
    {
      naam: 'Zelfiteratie apart herkend',
      uitleg: 'Een zelfiteratie maakt geen iteratieblok, maar wordt wel geteld.',
      test() {
        const r = A.analyseer(bouw(['a', 'b'], [['A001', 'A002']], ['A002']));
        const b = r.blokken.find(x => x.leden[0] === 'A002');
        return { ok: r.aantalIteratieblokken === 0 && r.aantalZelfiteraties === 1 && b.zelfiteratie === true, detail: 'zelfiteraties: ' + r.aantalZelfiteraties };
      }
    },
    {
      naam: 'Harde voorwaarde gaat vóór minder terugkoppelingen',
      uitleg: 'A001 →H A002, A002 →I A001: A001 moet eerst, ook al geeft dat één terugkoppeling.',
      test() {
        const r = A.analyseer(bouw(['a', 'b'], [['A001', 'A002', 'H'], ['A002', 'A001', 'I']]));
        return { ok: gelijk(r.volgorde, ['A001', 'A002']) && r.matenVoorgesteld.hardeSchendingen === 0, detail: r.volgorde.join(' ') };
      }
    },
    {
      naam: 'Harde tegenspraak gemeld',
      uitleg: 'A001 →H A002 en A002 →H A001 kan niet allebei; de tool meldt de tegenspraak.',
      test() {
        const r = A.analyseer(bouw(['a', 'b'], [['A001', 'A002', 'H'], ['A002', 'A001', 'H']]));
        return { ok: r.tegenspraken.length === 1 && r.matenVoorgesteld.hardeSchendingen === 1, detail: r.tegenspraken.map(t => t.leden.join(' ')).join(', ') };
      }
    },
    {
      naam: 'Gewijzigde regelvolgorde geeft zelfde uitkomst',
      uitleg: 'Dezelfde relaties in andere volgorde ingevoerd leveren dezelfde blokken en volgorde.',
      test() {
        const rel = [['A001', 'A002'], ['A002', 'A003'], ['A003', 'A001'], ['A003', 'A004'], ['A004', 'A005', 'H'], ['A005', 'A004']];
        const r1 = A.analyseer(bouw(['a', 'b', 'c', 'd', 'e'], rel));
        const r2 = A.analyseer(bouw(['a', 'b', 'c', 'd', 'e'], rel.slice().reverse()));
        return { ok: gelijk(r1.volgorde, r2.volgorde) && gelijk(blokLeden(r1), blokLeden(r2)), detail: r1.volgorde.join(' ') };
      }
    },
    {
      naam: 'Alle activiteiten en relaties behouden',
      uitleg: 'De voorgestelde volgorde bevat elke activiteit precies één keer; het aantal relaties verandert niet.',
      test() {
        const m = bouw(['a', 'b', 'c', 'd'], [['A001', 'A002'], ['A002', 'A001'], ['A004', 'A003']]);
        const n = m.relaties.length, r = A.analyseer(m);
        return { ok: r.volgorde.length === 4 && new Set(r.volgorde).size === 4 && m.relaties.length === n, detail: r.volgorde.join(' ') };
      }
    },
    {
      naam: 'Actualiteit: analyse verouderd na wijziging',
      uitleg: 'Na een nieuwe relatie is de analyse verouderd; een naamswijziging maakt hem niet verouderd.',
      test() {
        const m = bouw(['a', 'b']); m.analyse = A.analyseer(m);
        const s1 = M.analyseStatus(m).status;
        M.wijzigActiviteit(m, 'A001', 'naam', 'andere naam');
        const s2 = M.analyseStatus(m).status;
        M.zetRelatie(m, 'A001', 'A002', 'I');
        const s3 = M.analyseStatus(m).status;
        return { ok: s1 === 'actueel' && s2 === 'actueel' && s3 === 'verouderd', detail: [s1, s2, s3].join(' → ') };
      }
    },
    {
      naam: 'ID\'s worden niet hergebruikt',
      uitleg: 'Na verwijderen van A002 krijgt een nieuwe activiteit A003, niet A002.',
      test() {
        const m = bouw(['a', 'b']); M.verwijderActiviteit(m, 'A002');
        const res = M.plakActiviteiten(m, 'c');
        return { ok: gelijk(res.toegevoegd, ['A003']), detail: 'nieuwe ID: ' + res.toegevoegd.join(' ') };
      }
    },
    {
      naam: 'Ongeldig relatiepaar afgewezen',
      uitleg: 'Een relatie van een activiteit naar zichzelf wordt geweigerd met een herstelactie.',
      test() {
        const m = bouw(['a']); const f = M.zetRelatie(m, 'A001', 'A001', 'I');
        return { ok: !!f && m.relaties.length === 0, detail: f ? f.melding : 'geen melding' };
      }
    },
    {
      naam: 'Tear doorbreekt een cyclus; relatie blijft bewaard',
      uitleg: 'A001 ↔ A002 is een blok. Een tear op de A-relatie A002 → A001 heft het blok op in het scenario; in het basismodel blijft de relatie staan.',
      test() {
        const S = DSM.scenario, m = bouw(['a', 'b'], [['A001', 'A002', 'I'], ['A002', 'A001', 'A']]); S.zorgVoor(m);
        const sc = S.nieuwScenario(m, 'T'); const f = S.zetTear(m, sc.id, { van: 'A002', naar: 'A001', aanname: 'schatting', controleNa: 'A002' });
        const r = S.bereken(m, sc), basis = A.analyseer(m);
        return { ok: !f && r.aantalIteratieblokken === 0 && basis.aantalIteratieblokken === 1 && m.relaties.length === 2 && gelijk(r.volgorde, ['A001', 'A002']), detail: 'scenario: ' + blokLeden(r).join(' | ') + ' · basis: ' + blokLeden(basis).join(' | ') };
      }
    },
    {
      naam: 'Harde voorwaarde kan niet worden getear\'d',
      uitleg: 'Een tear op een H-relatie wordt geweigerd met een melding en herstelactie.',
      test() {
        const S = DSM.scenario, m = bouw(['a', 'b'], [['A001', 'A002', 'H'], ['A002', 'A001', 'I']]); S.zorgVoor(m);
        const sc = S.nieuwScenario(m, 'T'); const f = S.zetTear(m, sc.id, { van: 'A001', naar: 'A002', aanname: 'x' });
        return { ok: !!f && sc.tears.length === 0, detail: f ? f.melding : 'geen melding' };
      }
    },
    {
      naam: 'B-tear zonder afstemming telt mee als open punt',
      uitleg: 'Een B-tear die nog niet is afgestemd doorbreekt de cyclus wel, maar staat als "niet afgestemd" in de samenvatting.',
      test() {
        const S = DSM.scenario, m = bouw(['a', 'b'], [['A001', 'A002', 'I'], ['A002', 'A001', 'B']]); S.zorgVoor(m);
        const sc = S.nieuwScenario(m, 'T'); S.zetTear(m, sc.id, { van: 'A002', naar: 'A001', aanname: 'binnen norm', afgestemd: false }); S.bereken(m, sc);
        const z = S.samenvatting(m, sc);
        return { ok: z.tears === 1 && z.bOpen === 1 && z.blokken === 0, detail: 'tears ' + z.tears + ', B open ' + z.bOpen + ', blokken ' + z.blokken };
      }
    },
    {
      naam: 'Scenario verouderd na wijziging; tear ongeldig zonder relatie',
      uitleg: 'Na het wissen van de getearde relatie in de basis staat het scenario op verouderd en wordt de tear als ongeldig gemeld.',
      test() {
        const S = DSM.scenario, m = bouw(['a', 'b'], [['A001', 'A002', 'I'], ['A002', 'A001', 'A']]); S.zorgVoor(m);
        const sc = S.nieuwScenario(m, 'T'); S.zetTear(m, sc.id, { van: 'A002', naar: 'A001', aanname: 'x' }); S.bereken(m, sc);
        const voor = S.status(m, sc).status; M.wisRelatie(m, 'A002', 'A001');
        const na = S.status(m, sc).status, b = S.beoordeel(m, sc)[0];
        return { ok: voor === 'actueel' && na === 'verouderd' && !b.geldig && b.fouten.length === 1, detail: voor + ' → ' + na + '; ' + (b.fouten[0] ? b.fouten[0].melding : '') };
      }
    },
    {
      naam: '100 activiteiten binnen redelijke tijd',
      uitleg: 'Een model van 100 activiteiten met een keten en enkele terugkoppelingen wordt geanalyseerd.',
      test() {
        const namen = []; for (let i = 1; i <= 100; i++) namen.push('Activiteit ' + i);
        const rel = []; for (let i = 1; i < 100; i++) rel.push([M.maakId(i), M.maakId(i + 1)]);
        for (let i = 10; i <= 100; i += 10) rel.push([M.maakId(i), M.maakId(i - 9)]);
        const m = bouw(namen, rel); m.instellingen.tijdlimietMs = 2000;
        const t = Date.now(), r = A.analyseer(m), ms = Date.now() - t;
        return { ok: r.volgorde.length === 100 && ms < 10000, detail: ms + ' ms, ' + r.aantalIteratieblokken + ' blok(ken), bewezen: ' + (r.bewezen ? 'ja' : 'nee') };
      }
    }
  ];

  function draaiAlle() {
    return controles.map(c => {
      try { const r = c.test(); return { naam: c.naam, uitleg: c.uitleg, ok: !!r.ok, detail: r.detail }; }
      catch (e) { return { naam: c.naam, uitleg: c.uitleg, ok: false, detail: 'Fout: ' + e.message }; }
    });
  }

  DSM.controle = { controles, draaiAlle };
})(typeof window !== 'undefined' ? window : globalThis);
