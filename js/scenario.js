/* DSM-werkbank — scenario's en tears.
   Een tear doorbreekt in één scenario bewust een terugkoppeling: de ontvanger begint met een aanname.
   De oorspronkelijke relatie blijft in het basismodel staan; alleen in het scenario telt hij niet mee.
   Regels per soort:
   - I (informatie, blauw vakje): tear mag, met waarschuwing: kans op rework bij de ontvanger.
     (Tot v0.5 bestond ook A, aanname toegestaan; die is samengevoegd met I.)
   - B (bescherming): tear mag alleen met afstemming met wie de grenzen stelt; zonder afstemming
     rekent hij wel mee (verkenning), maar staat hij als open punt "B-tear niet afgestemd".
   - H (harde voorwaarde): tear is niet toegestaan. */
(function (root) {
  'use strict';
  const DSM = root.DSM;
  const M = DSM.model, AN = DSM.analyse;

  function zorgVoor(m) {
    if (!Array.isArray(m.scenarios)) m.scenarios = [];
    if (!m.volgendeScenario) m.volgendeScenario = m.scenarios.reduce((x, s) => Math.max(x, parseInt(String(s.id).slice(1), 10) || 0), 0) + 1;
    m.scenarios.forEach(s => {
      s.tears = (s.tears || []).map(t => Object.assign({ aanname: '', verantwoordelijke: '', controleNa: '', gevolgen: '', afgestemdMet: '', afgestemd: false }, t));
      if (s.analyse === undefined) s.analyse = null;
      if (!s.keuzes || typeof s.keuzes !== 'object') s.keuzes = {};
    });
    return m;
  }
  const vindScenario = (m, id) => (m.scenarios || []).find(s => s.id === id) || null;
  const vindTear = (s, van, naar) => s.tears.find(t => t.van === van && t.naar === naar) || null;

  function nieuwScenario(m, naam, kopieVan) {
    zorgVoor(m);
    const id = 'S' + (m.volgendeScenario++);
    const bron = kopieVan ? vindScenario(m, kopieVan) : null;
    const s = { id, naam: (naam || '').trim() || (bron ? 'Kopie van ' + bron.naam : 'Nieuw scenario'), kopieVan: bron ? bron.id : '', tears: bron ? JSON.parse(JSON.stringify(bron.tears)) : [], keuzes: bron ? Object.assign({}, bron.keuzes) : {}, analyse: null };
    m.scenarios.push(s);
    m.invoerversie++;
    return s;
  }
  function hernoem(m, id, naam) { const s = vindScenario(m, id); if (!s) return; s.naam = (naam || '').trim() || s.naam; m.invoerversie++; }
  function verwijderScenario(m, id) { m.scenarios = (m.scenarios || []).filter(s => s.id !== id); m.invoerversie++; }

  /* Mag deze relatie getear'd worden? Geeft een melding (bron, melding, herstel) of null. */
  function magTearen(m, van, naar) {
    const r = M.vindRelatie(m, van, naar);
    if (!r) return { bron: 'Tear ' + van + ' → ' + naar, melding: 'Er is geen relatie ' + van + ' → ' + naar + '.', herstel: 'Kies een gekleurde cel boven de diagonaal.' };
    if (r.soort === 'H') return { bron: 'Tear ' + van + ' → ' + naar, melding: 'Een harde voorwaarde kan niet worden doorbroken: de ontvanger kan pas beginnen als de leverancier klaar is.', herstel: 'Controleer of dit echt een harde voorwaarde is. Is beginnen met een aanname wel mogelijk, wijzig de soort dan op het tabblad Relaties.' };
    return null;
  }

  function zetTear(m, sid, gegevens) {
    const s = vindScenario(m, sid); if (!s) return { bron: 'Scenario', melding: 'Scenario niet gevonden.', herstel: 'Kies een scenario in de lijst.' };
    const f = magTearen(m, gegevens.van, gegevens.naar); if (f) return f;
    if (!(gegevens.aanname || '').trim()) return { bron: 'Tear ' + gegevens.van + ' → ' + gegevens.naar, melding: 'Beschrijf de aanname waarmee de ontvanger werkt.', herstel: 'Vul het veld "Aanname" in.' };
    const t = vindTear(s, gegevens.van, gegevens.naar);
    const velden = ['aanname', 'verantwoordelijke', 'controleNa', 'gevolgen', 'afgestemdMet'];
    const nieuw = { van: gegevens.van, naar: gegevens.naar, afgestemd: !!gegevens.afgestemd };
    velden.forEach(v => { nieuw[v] = (gegevens[v] || '').trim(); });
    if (t) Object.assign(t, nieuw); else s.tears.push(nieuw);
    m.invoerversie++;
    return null;
  }
  function wisTear(m, sid, van, naar) {
    const s = vindScenario(m, sid); if (!s) return;
    s.tears = s.tears.filter(t => !(t.van === van && t.naar === naar));
    m.invoerversie++;
  }

  /* Beoordeel elke tear tegen het huidige basismodel. */
  function zetKeuze(m, sid, beslisser, kop) {
    const s = vindScenario(m, sid); if (!s) return;
    if (kop) s.keuzes[beslisser] = kop; else delete s.keuzes[beslisser];
    m.invoerversie++;
  }
  const wegDoorKeuze = (m, s) => DSM.keuze ? DSM.keuze.uitgesloten(m, s.keuzes) : new Set();

  function beoordeel(m, s) {
    const weg = wegDoorKeuze(m, s);
    return s.tears.map(t => {
      const r = M.vindRelatie(m, t.van, t.naar);
      const uit = { tear: t, soort: r ? r.soort : null, geldig: true, fouten: [], letop: [] };
      const bron = s.id + ', tear ' + t.van + ' → ' + t.naar;
      if (!M.vind(m, t.van) || !M.vind(m, t.naar)) { uit.geldig = false; uit.fouten.push({ bron, melding: 'Een van de activiteiten bestaat niet meer.', herstel: 'Verwijder deze tear.' }); return uit; }
      if (!r) { uit.geldig = false; uit.fouten.push({ bron, melding: 'De relatie ' + t.van + ' → ' + t.naar + ' bestaat niet meer in het basismodel.', herstel: 'Verwijder deze tear, of leg de relatie opnieuw vast op het tabblad Relaties.' }); return uit; }
      if (weg.has(t.van) || weg.has(t.naar)) { uit.geldig = false; uit.letop.push({ code: 'weg', tekst: 'Vervalt: hoort bij een optie die in dit scenario niet is gekozen' }); return uit; }
      if (r.soort === 'H') { uit.geldig = false; uit.fouten.push({ bron, melding: 'De relatie is inmiddels een harde voorwaarde; die kan niet worden doorbroken. De tear telt niet mee.', herstel: 'Verwijder deze tear, of wijzig de soort op het tabblad Relaties.' }); return uit; }
      if (r.soort === 'B' && !t.afgestemd) uit.letop.push({ code: 'b-open', tekst: 'B-tear niet afgestemd' + (t.afgestemdMet ? ' met ' + t.afgestemdMet : '') });
      if (r.soort === 'I') uit.letop.push({ code: 'i', tekst: 'Kans op rework' });
      if (t.controleNa && !M.vind(m, t.controleNa)) uit.letop.push({ code: 'controle', tekst: 'Controlemoment verwijst naar een verwijderde activiteit' });
      if (!t.controleNa) uit.letop.push({ code: 'controle', tekst: 'Geen controlemoment' });
      return uit;
    });
  }

  /* Model van het scenario: basis zonder de geldige getearde relaties. */
  function scenarioModel(m, s) {
    const weg = new Set(beoordeel(m, s).filter(b => b.geldig).map(b => b.tear.van + '>' + b.tear.naar));
    const uitKeuze = wegDoorKeuze(m, s);
    const k = JSON.parse(JSON.stringify(Object.assign({}, m, { scenarios: [], analyse: null })));
    k.activiteiten = k.activiteiten.filter(a => !uitKeuze.has(a.id));
    k.relaties = k.relaties.filter(r => !weg.has(r.van + '>' + r.naar) && !uitKeuze.has(r.van) && !uitKeuze.has(r.naar));
    return k;
  }
  const tearsSleutel = s => JSON.stringify([s.tears.map(t => [t.van, t.naar, t.afgestemd]).sort(), Object.keys(s.keuzes || {}).sort().map(k => k + '>' + s.keuzes[k])]);

  function bereken(m, s) {
    const a = AN.analyseer(scenarioModel(m, s));
    a.tearsSleutel = tearsSleutel(s);
    s.analyse = a;
    return a;
  }
  function berekenAlle(m) { zorgVoor(m); m.scenarios.forEach(s => bereken(m, s)); }

  function status(m, s) {
    if (!s.analyse) return { status: 'geen', tekst: 'Nog niet berekend' };
    const redenen = [];
    if (s.analyse.structuurversie !== m.structuurversie) redenen.push('basismodel gewijzigd');
    if (s.analyse.instellingenversie !== m.instellingenversie) redenen.push('instellingen gewijzigd');
    if (s.analyse.tearsSleutel !== tearsSleutel(s)) redenen.push('tears of keuzes gewijzigd');
    if (redenen.length) return { status: 'verouderd', tekst: 'Scenario verouderd — ' + redenen.join(' en ') };
    return { status: 'actueel', tekst: 'Scenario actueel' };
  }

  /* Samenvatting voor de vergelijking met de basis. */
  function samenvatting(m, s) {
    const a = s.analyse; if (!a) return null;
    const b = beoordeel(m, s);
    const groot = a.blokken.filter(x => x.leden.length > 1);
    return {
      tears: b.filter(x => x.geldig).length,
      ongeldig: b.filter(x => !x.geldig && !x.letop.some(l => l.code === 'weg')).length,
      vervallenTears: b.filter(x => x.letop.some(l => l.code === 'weg')).length,
      keuzes: Object.keys(s.keuzes || {}).length,
      weggevallen: wegDoorKeuze(m, s).size,
      terugkoppelingen: a.matenVoorgesteld.terugkoppelingen,
      metWissel: a.matenVoorgesteld.metWissel,
      totaleAfstand: a.matenVoorgesteld.totaleAfstand,
      blokken: groot.length,
      grootsteBlok: a.grootsteBlok,
      blokTekst: groot.map(x => x.leden.join(', ')),
      bOpen: b.filter(x => x.letop.some(l => l.code === 'b-open')).length,
      controles: b.filter(x => x.geldig && x.tear.controleNa).length,
      volgorde: a.volgorde
    };
  }

  DSM.scenario = { zetKeuze, zorgVoor, vindScenario, vindTear, nieuwScenario, hernoem, verwijderScenario, magTearen, zetTear, wisTear, beoordeel, scenarioModel, bereken, berekenAlle, status, samenvatting };
})(typeof window !== 'undefined' ? window : globalThis);
