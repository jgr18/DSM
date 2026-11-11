/* DSM-werkbank — gegevensmodel: activiteiten, relaties, ID's, validatie en opslag. */
(function (root) {
  'use strict';
  const DSM = root.DSM = root.DSM || {};

  const SOORTEN = {
    I: { naam: 'Informatieafhankelijkheid', kort: 'Informatie' },
    H: { naam: 'Harde uitvoeringsvoorwaarde', kort: 'Harde voorwaarde' },
    B: { naam: 'Bescherming', kort: 'Bescherming' },
    A: { naam: 'Voorlopige aanname toegestaan', kort: 'Aanname toegestaan' }
  };
  const OPSLAGSLEUTEL = 'dsm-werkbank:model';

  function leegModel() {
    return {
      formaat: 'dsm-werkbank',
      formaatversie: 1,
      naam: 'Nieuw model',
      invoerversie: 0,
      structuurversie: 0,
      volgendeNummer: 1,
      vervallenIds: [],
      activiteiten: [],
      relaties: [],
      zelfiteraties: [],
      instellingen: { wisselingVoorkeur: true, maxExact: 8, tijdlimietMs: 3000 },
      instellingenversie: 1,
      analyse: null
    };
  }

  function maakId(nummer) { return 'A' + String(nummer).padStart(3, '0'); }
  function idNummer(id) { const m = /^A(\d+)$/.exec(id); return m ? parseInt(m[1], 10) : null; }

  function gewijzigd(m, structureel) {
    m.invoerversie++;
    if (structureel) m.structuurversie++;
  }

  function vind(m, id) { return m.activiteiten.find(a => a.id === id) || null; }
  function vindRelatie(m, van, naar) { return m.relaties.find(r => r.van === van && r.naar === naar) || null; }

  /* Regels plakken: "naam", "naam<TAB>verantwoordelijke" of "ID<TAB>naam<TAB>verantwoordelijke".
     Puntkomma werkt ook als scheidingsteken. Geeft toegevoegde ID's en fouten per regel terug. */
  function plakActiviteiten(m, tekst) {
    const regels = tekst.split(/\r?\n/);
    const toegevoegd = [];
    const fouten = [];
    regels.forEach((ruw, i) => {
      const regel = ruw.trim();
      if (!regel) return;
      const delen = regel.split(/\t|;/).map(s => s.trim());
      let id = null, naam, eigenaar = '';
      if (/^A\d+$/i.test(delen[0]) && delen.length >= 2) {
        id = delen[0].toUpperCase(); naam = delen[1]; eigenaar = delen[2] || '';
      } else { naam = delen[0]; eigenaar = delen[1] || ''; }
      const bron = 'Plakveld, regel ' + (i + 1);
      const fout = f => fouten.push(Object.assign(f, { regel: i }));
      if (!naam) { fout({ bron, melding: 'Geen activiteitnaam gevonden.', herstel: 'Zet de naam in de eerste kolom (of in de tweede als de eerste een ID is).' }); return; }
      if (id) {
        const nr = idNummer(id);
        id = maakId(nr);
        const bestaand = vind(m, id);
        if (bestaand) { fout({ bron, melding: 'ID ' + id + ' bestaat al (' + bestaand.naam + ').', herstel: 'Laat de ID weg om een nieuwe activiteit te maken, of wijzig ' + id + ' in de tabel.' }); return; }
        if (m.vervallenIds.includes(id)) { fout({ bron, melding: 'ID ' + id + ' is eerder gebruikt en verwijderd; ID\'s worden niet hergebruikt.', herstel: 'Laat de ID weg; je krijgt automatisch een nieuwe.' }); return; }
        if (nr >= m.volgendeNummer) m.volgendeNummer = nr + 1;
      } else {
        id = maakId(m.volgendeNummer++);
      }
      m.activiteiten.push({ id, naam, eigenaar });
      toegevoegd.push(id);
    });
    if (toegevoegd.length) gewijzigd(m, true);
    return { toegevoegd, fouten };
  }

  function wijzigActiviteit(m, id, veld, waarde) {
    const a = vind(m, id); if (!a) return;
    waarde = (waarde || '').trim();
    if (veld === 'naam' && !waarde) return { bron: 'Activiteiten, ' + id, melding: 'Een activiteit moet een naam hebben.', herstel: 'Vul een naam in of verwijder de activiteit.' };
    if (a[veld] === waarde) return;
    a[veld] = waarde;
    gewijzigd(m, veld === 'eigenaar');
  }

  function relatiesVan(m, id) { return m.relaties.filter(r => r.van === id || r.naar === id); }

  function verwijderActiviteit(m, id) {
    const i = m.activiteiten.findIndex(a => a.id === id); if (i < 0) return;
    m.activiteiten.splice(i, 1);
    m.relaties = m.relaties.filter(r => r.van !== id && r.naar !== id);
    m.zelfiteraties = m.zelfiteraties.filter(z => z !== id);
    if (!m.vervallenIds.includes(id)) m.vervallenIds.push(id);
    gewijzigd(m, true);
  }

  function verplaatsActiviteit(m, id, richting) {
    const i = m.activiteiten.findIndex(a => a.id === id);
    const j = i + richting;
    if (i < 0 || j < 0 || j >= m.activiteiten.length) return;
    const t = m.activiteiten[i]; m.activiteiten[i] = m.activiteiten[j]; m.activiteiten[j] = t;
    gewijzigd(m, true);
  }

  function zetRelatie(m, van, naar, soort) {
    if (van === naar) return { bron: 'Relaties, cel ' + naar + '/' + van, melding: 'Een activiteit kan geen informatie van zichzelf ontvangen.', herstel: 'Markeer een zelfiteratie door op de diagonaal te klikken.' };
    if (!vind(m, van) || !vind(m, naar)) return { bron: 'Relaties', melding: 'Onbekende activiteit in relatie ' + van + ' → ' + naar + '.', herstel: 'Kies leverancier en ontvanger uit de bestaande activiteiten.' };
    if (!SOORTEN[soort]) return { bron: 'Relaties', melding: 'Onbekende soort "' + soort + '".', herstel: 'Gebruik I, H, B of A.' };
    const r = vindRelatie(m, van, naar);
    if (r) { if (r.soort === soort) return; r.soort = soort; }
    else m.relaties.push({ van, naar, soort, info: '', zekerheid: '', frequentie: '', bron: '' });
    gewijzigd(m, true);
  }

  function wisRelatie(m, van, naar) {
    const n = m.relaties.length;
    m.relaties = m.relaties.filter(r => !(r.van === van && r.naar === naar));
    if (m.relaties.length !== n) gewijzigd(m, true);
  }

  function wijzigKenmerk(m, van, naar, veld, waarde) {
    const r = vindRelatie(m, van, naar); if (!r || r[veld] === waarde) return;
    r[veld] = waarde;
    gewijzigd(m, false);
  }

  function wisselZelfiteratie(m, id) {
    const i = m.zelfiteraties.indexOf(id);
    if (i >= 0) m.zelfiteraties.splice(i, 1); else m.zelfiteraties.push(id);
    gewijzigd(m, true);
  }

  function zetInstelling(m, sleutel, waarde) {
    if (m.instellingen[sleutel] === waarde) return;
    m.instellingen[sleutel] = waarde;
    m.instellingenversie++;
    m.invoerversie++;
  }

  /* Status van de opgeslagen analyse t.o.v. de huidige invoer. */
  function analyseStatus(m) {
    if (!m.analyse) return { status: 'geen', tekst: 'Nog niet geanalyseerd' };
    const redenen = [];
    if (m.analyse.structuurversie !== m.structuurversie) redenen.push('activiteiten of relaties gewijzigd');
    if (m.analyse.instellingenversie !== m.instellingenversie) redenen.push('instellingen gewijzigd');
    if (redenen.length) return { status: 'verouderd', tekst: 'Analyse verouderd — ' + redenen.join(' en ') };
    return { status: 'actueel', tekst: 'Analyse actueel' };
  }

  /* Controle van een geopend modelbestand. Fouten noemen bron, veld/regel en herstel. */
  function valideer(data) {
    const fouten = [];
    const bron = 'Modelbestand';
    if (!data || data.formaat !== 'dsm-werkbank') {
      fouten.push({ bron, melding: 'Dit is geen DSM-werkbank-modelbestand.', herstel: 'Open een .json-bestand dat met "Opslaan" uit deze tool is gemaakt.' });
      return fouten;
    }
    const ids = new Set();
    (data.activiteiten || []).forEach((a, i) => {
      const plek = bron + ', activiteiten[' + (i + 1) + ']';
      if (!a || !/^A\d{3,}$/.test(a.id || '')) fouten.push({ bron: plek, melding: 'Ongeldige ID "' + (a && a.id) + '".', herstel: 'Gebruik ID\'s in de vorm A001.' });
      else if (ids.has(a.id)) fouten.push({ bron: plek, melding: 'ID ' + a.id + ' komt dubbel voor.', herstel: 'Geef elke activiteit een eigen ID.' });
      else ids.add(a.id);
      if (a && !a.naam) fouten.push({ bron: plek, melding: 'Activiteit ' + a.id + ' heeft geen naam.', herstel: 'Vul een naam in.' });
    });
    (data.relaties || []).forEach((r, i) => {
      const plek = bron + ', relaties[' + (i + 1) + ']';
      if (!ids.has(r.van) || !ids.has(r.naar)) fouten.push({ bron: plek, melding: 'Relatie ' + r.van + ' → ' + r.naar + ' verwijst naar een onbekende activiteit.', herstel: 'Verwijder de relatie of voeg de activiteit toe.' });
      if (r.van === r.naar) fouten.push({ bron: plek, melding: 'Relatie ' + r.van + ' → ' + r.naar + ' verwijst naar zichzelf.', herstel: 'Zet de activiteit in "zelfiteraties" in plaats van als relatie.' });
      if (!SOORTEN[r.soort]) fouten.push({ bron: plek, melding: 'Onbekende soort "' + r.soort + '".', herstel: 'Gebruik I, H, B of A.' });
    });
    return fouten;
  }

  function normaliseer(data) {
    const m = Object.assign(leegModel(), data);
    m.instellingen = Object.assign(leegModel().instellingen, data.instellingen || {});
    m.relaties = (m.relaties || []).map(r => Object.assign({ info: '', zekerheid: '', frequentie: '', bron: '' }, r));
    const max = m.activiteiten.reduce((x, a) => Math.max(x, idNummer(a.id) || 0), 0);
    const maxV = (m.vervallenIds || []).reduce((x, id) => Math.max(x, idNummer(id) || 0), 0);
    m.volgendeNummer = Math.max(m.volgendeNummer || 1, max + 1, maxV + 1);
    return m;
  }

  function bewaarLokaal(m) {
    try { root.localStorage.setItem(OPSLAGSLEUTEL, JSON.stringify(m)); return true; } catch (e) { return false; }
  }
  function laadLokaal() {
    try {
      const t = root.localStorage.getItem(OPSLAGSLEUTEL);
      if (!t) return null;
      const d = JSON.parse(t);
      return valideer(d).length ? null : normaliseer(d);
    } catch (e) { return null; }
  }

  DSM.SOORTEN = SOORTEN;
  DSM.model = {
    leegModel, maakId, vind, vindRelatie, plakActiviteiten, wijzigActiviteit, relatiesVan,
    verwijderActiviteit, verplaatsActiviteit, zetRelatie, wisRelatie, wijzigKenmerk,
    wisselZelfiteratie, zetInstelling, analyseStatus, valideer, normaliseer, bewaarLokaal, laadLokaal
  };
})(typeof window !== 'undefined' ? window : globalThis);
